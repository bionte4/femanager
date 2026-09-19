import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { Role } from "@prisma/client";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  resolveUploadFileAbsolute,
  sanitizeUploadRelative,
  verifyUploadAccess,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

/**
 * GET /api/files/... — auth-gated (session / signed query).
 * Rewrite /uploads/* → ke sini (lihat next.config).
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  try {
    const { path: parts } = await Promise.resolve(ctx.params);
    const relative = sanitizeUploadRelative(parts ?? []);
    if (!relative) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const exp = req.nextUrl.searchParams.get("exp");
    const sig = req.nextUrl.searchParams.get("sig");
    const signedOk = verifyUploadAccess(relative, exp, sig);

    const session = await auth();
    let allowed = signedOk;

    if (!allowed && session?.user) {
      const isAdmin = (ADMIN_ROLES as readonly string[]).includes(
        session.user.role
      );
      if (isAdmin) {
        allowed = true;
      } else if (
        session.user.role === Role.FIELD_ENGINEER &&
        relative.startsWith("tickets/")
      ) {
        const ticketId = relative.split("/")[1];
        if (ticketId) {
          const ticket = await prisma.ticket.findFirst({
            where: {
              id: ticketId,
              assigned_engineer_id: session.user.id,
            },
            select: { id: true },
          });
          allowed = !!ticket;
        }
      }
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const abs = await resolveUploadFileAbsolute(relative);
    if (!abs) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buf = await readFile(abs);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(abs),
        "Cache-Control": signedOk
          ? "private, max-age=300"
          : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("[api/files]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
