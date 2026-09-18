import { customAlphabet } from "nanoid";
import bcrypt from "bcryptjs";

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const nanoid32 = customAlphabet(alphabet, 32);

/** Generate API key 32 karakter */
export function generateApiKey(): string {
  return nanoid32();
}

export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10);
}

export async function validateApiKey(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Tampilkan hanya 4 karakter terakhir untuk UI */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 4) return "****";
  return `••••••••${apiKey.slice(-4)}`;
}
