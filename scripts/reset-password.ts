/**
 * Reset password user by phone (ops VPS / support).
 *
 *   RESET_PHONE='081234567890' RESET_PASS='PasswordBaru123' \
 *     npx tsx scripts/reset-password.ts
 */
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const phone = (process.env.RESET_PHONE || "").trim();
  const pass = process.env.RESET_PASS || "";

  if (!phone || phone.length < 10) {
    throw new Error("Set RESET_PHONE (min 10 digit)");
  }
  if (!pass || pass.length < 8) {
    throw new Error("Set RESET_PASS (min 8 karakter)");
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    throw new Error(`User tidak ditemukan: ${phone}`);
  }

  const hash = await bcrypt.hash(pass, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash, is_suspended: false },
  });

  console.log("OK reset password:", user.phone, user.role, user.full_name);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
