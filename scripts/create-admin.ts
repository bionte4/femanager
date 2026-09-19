/**
 * Buat / update Super Admin production (tanpa full seed).
 *
 * Usage:
 *   ADMIN_PHONE=081234567890 ADMIN_PASS='rahasia-kuat' ADMIN_NAME='Admin' \
 *     npx tsx scripts/create-admin.ts
 */
import { PrismaClient, Role, EngineerStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

async function main() {
  const phone = (process.env.ADMIN_PHONE || "").trim();
  const pass = process.env.ADMIN_PASS || "";
  const name = (process.env.ADMIN_NAME || "Admin Produksi").trim();

  if (!phone || phone.length < 10) {
    throw new Error("Set ADMIN_PHONE (min 10 digit), contoh 081234567890");
  }
  if (!pass || pass.length < 8) {
    throw new Error("Set ADMIN_PASS (min 8 karakter)");
  }

  const prisma = new PrismaClient();
  try {
    const hash = await bcrypt.hash(pass, 10);
    const u = await prisma.user.upsert({
      where: { phone },
      update: {
        password: hash,
        role: Role.SUPER_ADMIN,
        full_name: name,
        is_suspended: false,
      },
      create: {
        full_name: name,
        phone,
        password: hash,
        role: Role.SUPER_ADMIN,
        status: EngineerStatus.OFFLINE,
        skills: [],
      },
    });
    console.log("OK admin:", u.phone, u.role, u.id);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
