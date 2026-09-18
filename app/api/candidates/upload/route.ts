import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/jpg"]);
const MAX = 5 * 1024 * 1024;

/**
 * Public upload untuk dokumen kandidat (KTP / selfie) — rate limited
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rl = checkRateLimit(`cand-upload:${ip}`, 20, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { success: false, error: "Terlalu banyak upload. Coba lagi nanti." },
        { status: 429 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const label = String(form.get("label") ?? "doc")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 32) || "doc";

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "File wajib" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ success: false, error: "Hanya jpeg/png" }, { status: 400 });
    }
    if (file.size > MAX) {
      return NextResponse.json({ success: false, error: "Max 5MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const compressed = await sharp(buffer)
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer();

    const dir = path.join(process.cwd(), "public", "uploads", "candidates");
    await mkdir(dir, { recursive: true });
    const filename = `${label}-${Date.now()}.jpg`;
    await writeFile(path.join(dir, filename), compressed);

    return NextResponse.json({
      success: true,
      url: `/uploads/candidates/${filename}`,
      path: `/uploads/candidates/${filename}`,
    });
  } catch (e) {
    console.error("[candidates/upload]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Upload gagal" },
      { status: 500 }
    );
  }
}
