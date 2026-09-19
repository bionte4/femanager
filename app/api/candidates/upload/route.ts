import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { withUploadSignature, writeUploadFile } from "@/lib/storage";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/jpg"]);
const MAX = 5 * 1024 * 1024;

/**
 * Public upload dokumen kandidat (KTP / selfie) — rate limited.
 * File disimpan privat; URL diberi signature TTL 24 jam untuk preview form.
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
    const label =
      String(form.get("label") ?? "doc")
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

    const filename = `${label}-${Date.now()}.jpg`;
    const { url: baseUrl } = await writeUploadFile("candidates", filename, compressed);
    // DB simpan path tanpa query; preview form pakai signed
    const signed = withUploadSignature(baseUrl);

    return NextResponse.json({
      success: true,
      url: baseUrl,
      preview_url: signed,
      path: baseUrl,
    });
  } catch (e) {
    console.error("[candidates/upload]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Upload gagal" },
      { status: 500 }
    );
  }
}
