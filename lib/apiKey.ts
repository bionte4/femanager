import { customAlphabet } from "nanoid";
import bcrypt from "bcryptjs";

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const nanoid32 = customAlphabet(alphabet, 32);

/** Panjang prefix untuk lookup tanpa menyimpan full key */
export const API_KEY_PREFIX_LEN = 12;

/** Generate API key 32 karakter */
export function generateApiKey(): string {
  return nanoid32();
}

export function apiKeyPrefix(key: string): string {
  return key.slice(0, API_KEY_PREFIX_LEN);
}

export function apiKeyLast4(key: string): string {
  return key.slice(-4);
}

export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10);
}

export async function validateApiKey(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Mask dari last4 tersimpan (tanpa plain key) */
export function maskApiKeyLast4(last4: string): string {
  if (!last4) return "••••••••";
  return `••••••••${last4}`;
}

/** @deprecated prefer maskApiKeyLast4 — hanya untuk secret lain (webhook) */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 4) return "****";
  return `••••••••${apiKey.slice(-4)}`;
}
