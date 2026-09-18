import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import exifr from "exifr";

export type ExifGps = {
  lat: number | null;
  lng: number | null;
  timestamp: Date | null;
};

/**
 * Baca EXIF GPS dari buffer gambar (sebelum compress/strip).
 */
export async function readExifGpsFromBuffer(buffer: Buffer): Promise<ExifGps> {
  try {
    const data = await exifr.parse(buffer, {
      gps: true,
      pick: ["latitude", "longitude", "DateTimeOriginal", "CreateDate"],
    });
    if (!data) return { lat: null, lng: null, timestamp: null };

    const lat = typeof data.latitude === "number" ? data.latitude : null;
    const lng = typeof data.longitude === "number" ? data.longitude : null;
    let timestamp: Date | null = null;
    const rawTs = data.DateTimeOriginal ?? data.CreateDate;
    if (rawTs instanceof Date) timestamp = rawTs;
    else if (typeof rawTs === "string" || typeof rawTs === "number") {
      const d = new Date(rawTs);
      if (!Number.isNaN(d.getTime())) timestamp = d;
    }

    return { lat, lng, timestamp };
  } catch {
    return { lat: null, lng: null, timestamp: null };
  }
}

export async function readExifGpsFromPublicUrl(url: string): Promise<ExifGps> {
  try {
    if (!url.startsWith("/uploads/")) return { lat: null, lng: null, timestamp: null };
    const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    const buffer = await readFile(filePath);
    return readExifGpsFromBuffer(buffer);
  } catch {
    return { lat: null, lng: null, timestamp: null };
  }
}

/** SHA256 hash foto untuk deteksi duplicate */
export function hashPhotoBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function hashPhotoFromPublicUrl(url: string): Promise<string | null> {
  try {
    if (!url.startsWith("/uploads/")) return null;
    const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    const buffer = await readFile(filePath);
    return hashPhotoBuffer(buffer);
  } catch {
    return null;
  }
}
