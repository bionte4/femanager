import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { Role } from "@prisma/client";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPhotoBuffer, readExifGpsFromBuffer } from "@/lib/exif";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/jpg"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/upload
 * Baca EXIF GPS + hash SEBELUM compress, lalu simpan jpeg compressed.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const rawTicketId = String(form.get("ticketId") ?? "general");
    const label = String(form.get("label") ?? "photo")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 32) || "photo";

    const ticketId = rawTicketId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "general";

    // IDOR guard: FE hanya boleh upload ke ticket assigned ke dirinya
    const isAdmin = (ADMIN_ROLES as readonly string[]).includes(session.user.role);
    if (!isAdmin && session.user.role === Role.FIELD_ENGINEER) {
      if (ticketId === "general") {
        return NextResponse.json(
          { success: false, error: "ticketId wajib" },
          { status: 400 }
        );
      }
      const ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, assigned_engineer_id: session.user.id },
        select: { id: true },
      });
      if (!ticket) {
        return NextResponse.json(
          { success: false, error: "Forbidden — bukan ticket kamu" },
          { status: 403 }
        );
      }
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "File wajib" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: "Hanya image/jpeg atau image/png (max 5MB)" },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: "Ukuran file max 5MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const meta = await sharp(buffer).metadata();
    if (!meta.format || !["jpeg", "png", "jpg", "webp"].includes(meta.format)) {
      return NextResponse.json(
        { success: false, error: "File bukan gambar valid (jpeg/png)" },
        { status: 400 }
      );
    }

    // EXIF + hash dari original (sebelum strip)
    const exif = await readExifGpsFromBuffer(buffer);
    const photoHash = hashPhotoBuffer(buffer);

    const compressed = await sharp(buffer)
      .rotate()
      .resize({
        width: 800,
        height: 800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer();

    const dir = path.join(process.cwd(), "public", "uploads", "tickets", ticketId);
    await mkdir(dir, { recursive: true });

    const filename = `${label}-${Date.now()}.jpg`;
    await writeFile(path.join(dir, filename), compressed);

    const url = `/uploads/tickets/${ticketId}/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: compressed.length,
      original_size: file.size,
      photo_hash: photoHash,
      exif: {
        lat: exif.lat,
        lng: exif.lng,
        timestamp: exif.timestamp?.toISOString() ?? null,
        has_gps: exif.lat != null && exif.lng != null,
      },
    });
  } catch (e) {
    console.error("[upload]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Upload gagal" },
      { status: 500 }
    );
  }
}
