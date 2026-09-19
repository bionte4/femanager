/**
 * Seed operasional terbatas (bukan full prisma/seed.ts):
 * - 2 FE Mitra (agreement signed)
 * - 1 FE PKWT Outtask + kontrak ACTIVE
 * - Knowledge Base SOP (dari prisma/seed-knowledge-base)
 * - Partnership agreement aktif (jika belum ada)
 *
 * Usage (VPS):
 *   SEED_PASSWORD='GantiPasswordKu4t' npx tsx scripts/seed-demo-ops.ts
 */
import {
  PrismaClient,
  Role,
  EngineerStatus,
  PartnershipStatus,
  AgreementStatus,
  EngagementType,
  EmploymentStatus,
  ComplianceType,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";
import {
  AGREEMENT_TITLE,
  AGREEMENT_VERSION,
  PARTNERSHIP_AGREEMENT_V1_HTML,
  PARTNERSHIP_CONSENT_TEXT,
} from "../lib/legal/agreement-template";
import { KNOWLEDGE_BASE_SEED } from "../prisma/seed-knowledge-base";

const prisma = new PrismaClient();

const PASSWORD = process.env.SEED_PASSWORD || "ChangeMeOps2026!";

const MITRA = [
  {
    phone: "081222222001",
    full_name: "Budi Mitra Jakarta",
    city: "Jakarta Selatan",
    district: "Kebayoran Baru",
    lat: -6.2435,
    lng: 106.7998,
    skills: ["EDC", "LAN"],
  },
  {
    phone: "081222222002",
    full_name: "Siti Mitra Bekasi",
    city: "Bekasi",
    district: "Bekasi Barat",
    lat: -6.2383,
    lng: 106.9756,
    skills: ["EDC", "WAN", "WIFI"],
  },
] as const;

const PKWT = {
  phone: "081222222003",
  full_name: "Andi PKWT Outtask",
  city: "Jakarta Pusat",
  district: "Menteng",
  lat: -6.1944,
  lng: 106.8229,
  skills: ["EDC", "SDWAN", "LAN"],
  client_label: "Client Demo Outtask",
  placement_cities: ["Jakarta Pusat", "Jakarta Selatan"],
} as const;

async function ensureAgreement() {
  let agreement = await prisma.partnershipAgreement.findFirst({
    where: { version: AGREEMENT_VERSION },
  });
  if (agreement) {
    agreement = await prisma.partnershipAgreement.update({
      where: { id: agreement.id },
      data: {
        title: AGREEMENT_TITLE,
        content_html: PARTNERSHIP_AGREEMENT_V1_HTML,
        is_active: true,
      },
    });
  } else {
    agreement = await prisma.partnershipAgreement.create({
      data: {
        version: AGREEMENT_VERSION,
        title: AGREEMENT_TITLE,
        content_html: PARTNERSHIP_AGREEMENT_V1_HTML,
        is_active: true,
      },
    });
  }
  // Nonaktifkan versi lain
  await prisma.partnershipAgreement.updateMany({
    where: { id: { not: agreement.id } },
    data: { is_active: false },
  });
  return agreement;
}

async function upsertMitra(
  eng: (typeof MITRA)[number],
  passwordHash: string,
  agreementId: string
) {
  const u = await prisma.user.upsert({
    where: { phone: eng.phone },
    update: {
      full_name: eng.full_name,
      password: passwordHash,
      role: Role.FIELD_ENGINEER,
      city: eng.city,
      district: eng.district,
      lat: eng.lat,
      lng: eng.lng,
      skills: [...eng.skills],
      status: EngineerStatus.AVAILABLE,
      engagement_type: EngagementType.MITRA,
      employment_status: EmploymentStatus.NONE,
      partnership_status: PartnershipStatus.SIGNED,
      has_motorcycle: true,
      has_toolkit: true,
      is_suspended: false,
    },
    create: {
      full_name: eng.full_name,
      phone: eng.phone,
      password: passwordHash,
      role: Role.FIELD_ENGINEER,
      city: eng.city,
      district: eng.district,
      lat: eng.lat,
      lng: eng.lng,
      skills: [...eng.skills],
      status: EngineerStatus.AVAILABLE,
      engagement_type: EngagementType.MITRA,
      employment_status: EmploymentStatus.NONE,
      partnership_status: PartnershipStatus.SIGNED,
      has_motorcycle: true,
      has_toolkit: true,
    },
  });

  await prisma.engineerAgreement.upsert({
    where: {
      engineer_id_agreement_id: {
        engineer_id: u.id,
        agreement_id: agreementId,
      },
    },
    update: {
      status: AgreementStatus.SIGNED,
      signed_at: new Date(),
      consent_text: PARTNERSHIP_CONSENT_TEXT,
      signature_data: "seed-ops-signature",
      ip_address: "127.0.0.1",
      user_agent: "seed-demo-ops",
    },
    create: {
      engineer_id: u.id,
      agreement_id: agreementId,
      status: AgreementStatus.SIGNED,
      signed_at: new Date(),
      consent_text: PARTNERSHIP_CONSENT_TEXT,
      signature_data: "seed-ops-signature",
      ip_address: "127.0.0.1",
      user_agent: "seed-demo-ops",
    },
  });

  const hasLog = await prisma.complianceLog.findFirst({
    where: {
      engineer_id: u.id,
      type: ComplianceType.AGREEMENT_SIGNED,
    },
  });
  if (!hasLog) {
    await prisma.complianceLog.create({
      data: {
        engineer_id: u.id,
        type: ComplianceType.AGREEMENT_SIGNED,
        metadata: { version: AGREEMENT_VERSION, seed: "ops" },
      },
    });
  }

  return u;
}

async function upsertPkwt(passwordHash: string) {
  const u = await prisma.user.upsert({
    where: { phone: PKWT.phone },
    update: {
      full_name: PKWT.full_name,
      password: passwordHash,
      role: Role.FIELD_ENGINEER,
      city: PKWT.city,
      district: PKWT.district,
      lat: PKWT.lat,
      lng: PKWT.lng,
      skills: [...PKWT.skills],
      status: EngineerStatus.AVAILABLE,
      engagement_type: EngagementType.PKWT_OUTTASK,
      employment_status: EmploymentStatus.ACTIVE,
      partnership_status: PartnershipStatus.NOT_SIGNED,
      has_motorcycle: true,
      has_toolkit: true,
      is_suspended: false,
    },
    create: {
      full_name: PKWT.full_name,
      phone: PKWT.phone,
      password: passwordHash,
      role: Role.FIELD_ENGINEER,
      city: PKWT.city,
      district: PKWT.district,
      lat: PKWT.lat,
      lng: PKWT.lng,
      skills: [...PKWT.skills],
      status: EngineerStatus.AVAILABLE,
      engagement_type: EngagementType.PKWT_OUTTASK,
      employment_status: EmploymentStatus.ACTIVE,
      partnership_status: PartnershipStatus.NOT_SIGNED,
      has_motorcycle: true,
      has_toolkit: true,
    },
  });

  const existing = await prisma.engineerContract.findFirst({
    where: {
      user_id: u.id,
      status: "ACTIVE",
      type: "PKWT_OUTTASK",
    },
  });

  const start = new Date();
  const end = new Date();
  end.setFullYear(end.getFullYear() + 1);

  if (!existing) {
    await prisma.engineerContract.create({
      data: {
        user_id: u.id,
        type: "PKWT_OUTTASK",
        status: "ACTIVE",
        start_at: start,
        end_at: end,
        client_label: PKWT.client_label,
        placement_cities: [...PKWT.placement_cities],
        notes: "Seed ops — kontrak demo 1 tahun",
        created_by: "seed-demo-ops",
      },
    });

    await prisma.engagementChangeLog.create({
      data: {
        user_id: u.id,
        from_type: EngagementType.MITRA,
        to_type: EngagementType.PKWT_OUTTASK,
        reason: "seed-demo-ops bootstrap",
        changed_by: "seed-demo-ops",
      },
    });
  }

  return u;
}

async function seedKb() {
  let created = 0;
  let updated = 0;
  for (const kb of KNOWLEDGE_BASE_SEED) {
    const existing = await prisma.knowledgeBase.findFirst({
      where: { title: kb.title },
    });
    if (!existing) {
      await prisma.knowledgeBase.create({
        data: {
          title: kb.title,
          category: kb.category,
          content: kb.content,
          video_url: kb.video_url ?? null,
          file_url: kb.file_url ?? null,
          is_active: true,
        },
      });
      created += 1;
    } else {
      await prisma.knowledgeBase.update({
        where: { id: existing.id },
        data: {
          category: kb.category,
          content: kb.content,
          video_url: kb.video_url ?? null,
          file_url: kb.file_url ?? existing.file_url,
          is_active: true,
        },
      });
      updated += 1;
    }
  }
  return { created, updated, total: KNOWLEDGE_BASE_SEED.length };
}

async function main() {
  console.log("→ Seed ops: agreement, 2 Mitra, 1 PKWT, KB...");
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const agreement = await ensureAgreement();
  console.log("  agreement:", agreement.version, agreement.id);

  for (const m of MITRA) {
    const u = await upsertMitra(m, passwordHash, agreement.id);
    console.log("  mitra:", u.phone, u.full_name);
  }

  const pkwt = await upsertPkwt(passwordHash);
  console.log("  pkwt:", pkwt.phone, pkwt.full_name);

  const kb = await seedKb();
  console.log("  kb:", kb);

  console.log("\nOK — login engineer:");
  console.log(`  Mitra 1: ${MITRA[0].phone} / ${PASSWORD}`);
  console.log(`  Mitra 2: ${MITRA[1].phone} / ${PASSWORD}`);
  console.log(`  PKWT:    ${PKWT.phone} / ${PASSWORD}`);
  console.log("  Ganti password setelah uji.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
