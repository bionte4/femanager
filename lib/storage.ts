import { createHmac, timingSafeEqual } from "crypto";
import { access, mkdir, writeFile } from "fs/promises";
import path from "path";

/** Root privat — tidak dilayani static Next */
export function storageUploadsRoot(): string {
  return path.join(process.cwd(), "storage", "uploads");
}

/** Legacy public path (migrasi baca saja) */
export function legacyPublicUploadsRoot(): string {
  return path.join(process.cwd(), "public", "uploads");
}

/**
 * Relatif aman: tickets/xxx/a.jpg | candidates/a.jpg | demo/a.jpg
 * Tolak path traversal.
 */
export function sanitizeUploadRelative(parts: string[]): string | null {
  if (parts.length === 0 || parts.length > 6) return null;
  const cleaned = parts.map((p) => p.replace(/[^a-zA-Z0-9._-]/g, "")).filter(Boolean);
  if (cleaned.length !== parts.length) return null;
  if (cleaned.some((p) => p === "." || p === "..")) return null;
  return cleaned.join("/");
}

/** URL publik (rewrite → /api/files) — kompatibel DB lama /uploads/... */
export function uploadPublicUrl(relative: string): string {
  return `/uploads/${relative.replace(/^\/+/, "")}`;
}

export async function ensureUploadDir(subdir: string): Promise<string> {
  const dir = path.join(storageUploadsRoot(), subdir);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeUploadFile(
  relativeDir: string,
  filename: string,
  data: Buffer
): Promise<{ relative: string; url: string }> {
  const dir = await ensureUploadDir(relativeDir);
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  await writeFile(path.join(dir, safeName), data);
  const relative = `${relativeDir}/${safeName}`;
  return { relative, url: uploadPublicUrl(relative) };
}

/** Resolve file di storage baru, fallback public/uploads lama */
export async function resolveUploadFileAbsolute(
  relative: string
): Promise<string | null> {
  const rel = relative.replace(/^\/+/, "").replace(/^uploads\//, "");
  const candidates = [
    path.join(storageUploadsRoot(), rel),
    path.join(legacyPublicUploadsRoot(), rel),
  ];
  for (const abs of candidates) {
    try {
      await access(abs);
      // pastikan masih di dalam root
      const rootA = storageUploadsRoot();
      const rootB = legacyPublicUploadsRoot();
      const norm = path.normalize(abs);
      if (
        norm.startsWith(rootA + path.sep) ||
        norm === rootA ||
        norm.startsWith(rootB + path.sep) ||
        norm === rootB
      ) {
        return norm;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

function fileSignSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

/** Signed query untuk akses tanpa session (preview kandidat, TTL detik) */
export function signUploadAccess(
  relative: string,
  ttlSeconds = 60 * 60 * 24
): { exp: number; sig: string } | null {
  const secret = fileSignSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${relative}:${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return { exp, sig };
}

export function verifyUploadAccess(
  relative: string,
  expRaw: string | null,
  sigRaw: string | null
): boolean {
  const secret = fileSignSecret();
  if (!secret || !expRaw || !sigRaw) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const payload = `${relative}:${exp}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(sigRaw);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function withUploadSignature(url: string): string {
  const relative = url.replace(/^\/uploads\//, "").replace(/^\//, "");
  const signed = signUploadAccess(relative);
  if (!signed) return url;
  const q = new URLSearchParams({
    exp: String(signed.exp),
    sig: signed.sig,
  });
  return `${uploadPublicUrl(relative)}?${q.toString()}`;
}
