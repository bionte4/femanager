/**
 * Seed demo terbatas untuk showcase (bukan full 100 toko / 30 FE).
 *
 * Isi:
 * - SLA + service categories/packages + commission rules inti
 * - Partnership agreement aktif
 * - 2 Mitra (signed) + 1 PKWT Outtask + kontrak
 * - 5 tenant + device EDC
 * - Beberapa ticket (OPEN / ASSIGNED / RESOLVED)
 * - Knowledge Base SOP
 * - Wallet Mitra contoh
 *
 * Usage:
 *   SEED_PASSWORD='DemoShow2026!' npx tsx scripts/seed-demo-ops.ts
 */
import {
  PrismaClient,
  Role,
  EngineerStatus,
  PartnershipStatus,
  AgreementStatus,
  EngagementType,
  EmploymentStatus,
  SlaTier,
  DeviceType,
  DeviceStatus,
  TicketType,
  TicketStatus,
  Priority,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";
import {
  AGREEMENT_TITLE,
  AGREEMENT_VERSION,
  PARTNERSHIP_AGREEMENT_V1_HTML,
  PARTNERSHIP_CONSENT_TEXT,
} from "../lib/legal/agreement-template";
import {
  SERVICE_CATEGORY_SEED,
  SERVICE_PACKAGE_SEED,
} from "../lib/service-categories";
import { KNOWLEDGE_BASE_SEED } from "../prisma/seed-knowledge-base";

const prisma = new PrismaClient();
const PASSWORD = process.env.SEED_PASSWORD || "DemoShow2026!";

const MITRA = [
  {
    phone: "081222222001",
    full_name: "Budi Mitra Jakarta",
    city: "Jakarta Selatan",
    district: "Kebayoran Baru",
    lat: -6.2435,
    lng: 106.7998,
    skills: ["EDC", "LAN"],
    /// Hari ini (WIB) — agar cron birthday bisa diuji segera
    birth_today: true as const,
  },
  {
    phone: "081222222002",
    full_name: "Siti Mitra Bekasi",
    city: "Bekasi",
    district: "Bekasi Barat",
    lat: -6.2383,
    lng: 106.9756,
    skills: ["EDC", "WAN", "WIFI"],
    birth_md: "03-15" as const,
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
  client_label: "Bank Demo Outtask",
  placement_cities: ["Jakarta Pusat", "Jakarta Selatan"],
  birth_md: "07-20" as const,
} as const;

/** YYYY-MM-DD noon UTC; birth_today = bulan-hari WIB hari ini, year-28. */
function demoBirthDate(opts: {
  birth_today?: boolean;
  birth_md?: string;
}): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = opts.birth_today
    ? parts.find((p) => p.type === "month")?.value
    : opts.birth_md?.slice(0, 2);
  const d = opts.birth_today
    ? parts.find((p) => p.type === "day")?.value
    : opts.birth_md?.slice(3, 5);
  return new Date(`${y - 28}-${m}-${d}T12:00:00.000Z`);
}

const TENANTS = [
  {
    code: "DEMO-JKTS01",
    name: "Toko Demo Menteng",
    address: "Jl. Menteng Raya No. 1",
    province: "DKI Jakarta",
    city: "Jakarta Pusat",
    district: "Menteng",
    lat: -6.1944,
    lng: 106.8229,
    sla_tier: SlaTier.TIER1_JABODETABEK,
  },
  {
    code: "DEMO-JKTS02",
    name: "Toko Demo Kebayoran",
    address: "Jl. Melawai No. 10",
    province: "DKI Jakarta",
    city: "Jakarta Selatan",
    district: "Kebayoran Baru",
    lat: -6.2435,
    lng: 106.7998,
    sla_tier: SlaTier.TIER1_JABODETABEK,
  },
  {
    code: "DEMO-BKS01",
    name: "Toko Demo Bekasi Barat",
    address: "Jl. Ahmad Yani No. 5",
    province: "Jawa Barat",
    city: "Bekasi",
    district: "Bekasi Barat",
    lat: -6.2383,
    lng: 106.9756,
    sla_tier: SlaTier.TIER1_JABODETABEK,
  },
  {
    code: "DEMO-DPK01",
    name: "Toko Demo Depok",
    address: "Jl. Margonda Raya No. 20",
    province: "Jawa Barat",
    city: "Depok",
    district: "Beji",
    lat: -6.3722,
    lng: 106.8314,
    sla_tier: SlaTier.TIER1_JABODETABEK,
  },
  {
    code: "DEMO-TNG01",
    name: "Toko Demo Tangerang",
    address: "Jl. MH Thamrin No. 8",
    province: "Banten",
    city: "Tangerang",
    district: "Cipondoh",
    lat: -6.1783,
    lng: 106.6319,
    sla_tier: SlaTier.TIER1_JABODETABEK,
  },
] as const;

async function seedSla() {
  await prisma.slaConfig.createMany({
    data: [
      {
        tier_name: SlaTier.TIER1_JABODETABEK,
        response_time_minutes: 60,
        resolution_time_minutes: 240,
      },
      {
        tier_name: SlaTier.TIER2_PROVINCE,
        response_time_minutes: 120,
        resolution_time_minutes: 480,
      },
      {
        tier_name: SlaTier.TIER3_KABUPATEN,
        response_time_minutes: 240,
        resolution_time_minutes: 720,
      },
    ],
    skipDuplicates: true,
  });
}

async function seedCategories() {
  const categoryIdByCode = new Map<string, string>();
  for (const cat of SERVICE_CATEGORY_SEED) {
    const row = await prisma.serviceCategory.upsert({
      where: { code: cat.code },
      update: {
        name: cat.name,
        icon: cat.icon,
        base_fee_tier1: cat.base_fee_tier1,
        base_fee_tier2: cat.base_fee_tier2,
        base_fee_tier3: cat.base_fee_tier3,
        estimated_duration_minutes: cat.estimated_duration_minutes,
        requires_certification: cat.requires_certification,
        checklist_template: [...cat.checklist_template],
        is_active: true,
      },
      create: {
        code: cat.code,
        name: cat.name,
        icon: cat.icon,
        base_fee_tier1: cat.base_fee_tier1,
        base_fee_tier2: cat.base_fee_tier2,
        base_fee_tier3: cat.base_fee_tier3,
        estimated_duration_minutes: cat.estimated_duration_minutes,
        requires_certification: cat.requires_certification,
        checklist_template: [...cat.checklist_template],
        is_active: true,
      },
    });
    categoryIdByCode.set(cat.code, row.id);
  }

  for (const pkg of SERVICE_PACKAGE_SEED) {
    const catId = categoryIdByCode.get(pkg.category_code);
    if (!catId) continue;
    const existing = await prisma.servicePackage.findFirst({
      where: { name: pkg.name, service_category_id: catId },
    });
    if (existing) {
      await prisma.servicePackage.update({
        where: { id: existing.id },
        data: {
          description: pkg.description,
          price_customer: pkg.price_customer,
          fee_engineer: pkg.fee_engineer,
          estimated_duration: pkg.estimated_duration,
          required_engineers: pkg.required_engineers ?? 1,
          is_active: true,
        },
      });
    } else {
      await prisma.servicePackage.create({
        data: {
          service_category_id: catId,
          name: pkg.name,
          description: pkg.description,
          price_customer: pkg.price_customer,
          fee_engineer: pkg.fee_engineer,
          estimated_duration: pkg.estimated_duration,
          required_engineers: pkg.required_engineers ?? 1,
          is_active: true,
        },
      });
    }
  }
  return categoryIdByCode;
}

async function seedCommissions() {
  const rules = [
    {
      name: "DEMO EDC TIER1 INCIDENT",
      device_type: DeviceType.EDC_BCA,
      sla_tier: SlaTier.TIER1_JABODETABEK,
      ticket_type: TicketType.INCIDENT,
      base_fee: 75000,
      bonus_ontime_fee: 15000,
      penalty_breach_fee: -25000,
    },
    {
      name: "DEMO EDC BRI TIER1 INCIDENT",
      device_type: DeviceType.EDC_BRI,
      sla_tier: SlaTier.TIER1_JABODETABEK,
      ticket_type: TicketType.INCIDENT,
      base_fee: 75000,
      bonus_ontime_fee: 15000,
      penalty_breach_fee: -25000,
    },
    {
      name: "DEMO PM TIER1",
      device_type: null,
      sla_tier: SlaTier.TIER1_JABODETABEK,
      ticket_type: TicketType.PM,
      base_fee: 50000,
      bonus_ontime_fee: 10000,
      penalty_breach_fee: -15000,
    },
    {
      name: "DEMO INCIDENT TIER1 General",
      device_type: null,
      sla_tier: SlaTier.TIER1_JABODETABEK,
      ticket_type: TicketType.INCIDENT,
      base_fee: 75000,
      bonus_ontime_fee: 15000,
      penalty_breach_fee: -25000,
    },
  ];

  for (const rule of rules) {
    const existing = await prisma.commissionRule.findFirst({
      where: { name: rule.name },
    });
    if (existing) {
      await prisma.commissionRule.update({
        where: { id: existing.id },
        data: { ...rule, is_active: true },
      });
    } else {
      await prisma.commissionRule.create({
        data: { ...rule, is_active: true },
      });
    }
  }
}

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
      birth_date: demoBirthDate({
        birth_today: "birth_today" in eng ? eng.birth_today : undefined,
        birth_md: "birth_md" in eng ? eng.birth_md : undefined,
      }),
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
      birth_date: demoBirthDate({
        birth_today: "birth_today" in eng ? eng.birth_today : undefined,
        birth_md: "birth_md" in eng ? eng.birth_md : undefined,
      }),
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

  await prisma.engineerWallet.upsert({
    where: { engineer_id: u.id },
    update: {},
    create: { engineer_id: u.id, balance: 150000 },
  });

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
      birth_date: demoBirthDate({ birth_md: PKWT.birth_md }),
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
      birth_date: demoBirthDate({ birth_md: PKWT.birth_md }),
    },
  });

  const existing = await prisma.engineerContract.findFirst({
    where: { user_id: u.id, status: "ACTIVE", type: "PKWT_OUTTASK" },
  });
  const start = new Date();
  // 14 hari lagi → muncul di inbox "Kontrak hampir expired" (window 30 hari)
  const end = new Date();
  end.setDate(end.getDate() + 14);

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
        notes: "Seed demo — kontrak ACTIVE, expire ~14 hari (untuk inbox HR)",
        created_by: "seed-demo-ops",
      },
    });
    await prisma.engagementChangeLog.create({
      data: {
        user_id: u.id,
        from_type: EngagementType.MITRA,
        to_type: EngagementType.PKWT_OUTTASK,
        reason: "seed-demo-ops",
        changed_by: "seed-demo-ops",
      },
    });
  } else {
    await prisma.engineerContract.update({
      where: { id: existing.id },
      data: {
        end_at: end,
        client_label: PKWT.client_label,
        placement_cities: [...PKWT.placement_cities],
        notes: "Seed demo — kontrak ACTIVE, expire ~14 hari (untuk inbox HR)",
      },
    });
  }
  return u;
}

async function seedTenantsAndDevices(edcCategoryId: string | undefined) {
  const tenants = [];
  for (const t of TENANTS) {
    const tenant = await prisma.tenant.upsert({
      where: { code: t.code },
      update: {
        name: t.name,
        address: t.address,
        city: t.city,
        district: t.district,
        lat: t.lat,
        lng: t.lng,
        sla_tier: t.sla_tier,
        is_active: true,
      },
      create: {
        name: t.name,
        code: t.code,
        address: t.address,
        province: t.province,
        city: t.city,
        district: t.district,
        lat: t.lat,
        lng: t.lng,
        sla_tier: t.sla_tier,
        pic_name: "PIC Demo",
        pic_phone: "081300000001",
        is_active: true,
      },
    });
    tenants.push(tenant);

    const sn = `SN-${t.code}-EDC`;
    const existingDev = await prisma.device.findFirst({
      where: { serial_number: sn },
    });
    if (!existingDev) {
      await prisma.device.create({
        data: {
          tenant_id: tenant.id,
          type: DeviceType.EDC_BCA,
          brand: "Ingenico",
          serial_number: sn,
          ip_address: null,
          status: DeviceStatus.UP,
          service_category_id: edcCategoryId ?? null,
        },
      });
    } else {
      await prisma.device.update({
        where: { id: existingDev.id },
        data: {
          tenant_id: tenant.id,
          status: DeviceStatus.UP,
          service_category_id: edcCategoryId ?? existingDev.service_category_id,
        },
      });
    }
  }
  return tenants;
}

async function nextTicketNo() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const prefix = `FE-${y}${m}${day}-`;
  const latest = await prisma.ticket.findFirst({
    where: { ticket_no: { startsWith: prefix } },
    orderBy: { ticket_no: "desc" },
    select: { ticket_no: true },
  });
  const n = latest?.ticket_no
    ? Number(latest.ticket_no.slice(-4)) + 1
    : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

async function seedTickets(
  tenants: { id: string; code: string }[],
  mitraIds: string[],
  adminId: string | null
) {
  if (tenants.length < 3 || mitraIds.length < 1) return;

  const existingDemo = await prisma.ticket.findFirst({
    where: { description: { contains: "[DEMO-OPS]" } },
  });
  if (existingDemo) {
    console.log("  tickets: already seeded (skip)");
    return;
  }

  const now = new Date();
  const slaDue = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const reporter = adminId ?? mitraIds[0];

  const openTenant = tenants[0];
  const openDevice = await prisma.device.findFirst({
    where: { tenant_id: openTenant.id },
  });
  const tOpen = await prisma.ticket.create({
    data: {
      ticket_no: await nextTicketNo(),
      tenant_id: openTenant.id,
      device_id: openDevice?.id,
      type: TicketType.INCIDENT,
      priority: Priority.HIGH,
      status: TicketStatus.OPEN,
      reported_by: reporter,
      description: "[DEMO-OPS] EDC tidak bisa transaksi — menunggu dispatch",
      sla_due_at: slaDue,
    },
  });
  await prisma.ticketLog.create({
    data: {
      ticket_id: tOpen.id,
      status_from: null,
      status_to: TicketStatus.OPEN,
      changed_by: reporter,
      notes: "Seed demo OPEN",
      photo_url: [],
    },
  });

  const assignedTenant = tenants[1];
  const assignedDevice = await prisma.device.findFirst({
    where: { tenant_id: assignedTenant.id },
  });
  const tAssigned = await prisma.ticket.create({
    data: {
      ticket_no: await nextTicketNo(),
      tenant_id: assignedTenant.id,
      device_id: assignedDevice?.id,
      type: TicketType.INCIDENT,
      priority: Priority.MEDIUM,
      status: TicketStatus.ASSIGNED,
      reported_by: reporter,
      description: "[DEMO-OPS] Printer EDC macet — assigned ke Mitra",
      assigned_engineer_id: mitraIds[0],
      last_assigned_at: now,
      sla_due_at: slaDue,
    },
  });
  await prisma.ticketLog.create({
    data: {
      ticket_id: tAssigned.id,
      status_from: TicketStatus.OPEN,
      status_to: TicketStatus.ASSIGNED,
      changed_by: reporter,
      notes: "Seed demo ASSIGNED",
      photo_url: [],
    },
  });
  await prisma.user.update({
    where: { id: mitraIds[0] },
    data: { status: EngineerStatus.BUSY },
  });

  const resolvedTenant = tenants[2];
  const resolvedDevice = await prisma.device.findFirst({
    where: { tenant_id: resolvedTenant.id },
  });
  const resolvedAt = new Date(now.getTime() - 60 * 60 * 1000);
  const tResolved = await prisma.ticket.create({
    data: {
      ticket_no: await nextTicketNo(),
      tenant_id: resolvedTenant.id,
      device_id: resolvedDevice?.id,
      type: TicketType.INCIDENT,
      priority: Priority.LOW,
      status: TicketStatus.RESOLVED,
      reported_by: reporter,
      description: "[DEMO-OPS] Ganti kertas thermal — selesai (contoh histori)",
      assigned_engineer_id: mitraIds[1] ?? mitraIds[0],
      accepted_at: new Date(resolvedAt.getTime() - 90 * 60 * 1000),
      response_at: new Date(resolvedAt.getTime() - 90 * 60 * 1000),
      resolved_at: resolvedAt,
      sla_due_at: slaDue,
    },
  });
  await prisma.ticketLog.create({
    data: {
      ticket_id: tResolved.id,
      status_from: TicketStatus.IN_PROGRESS,
      status_to: TicketStatus.RESOLVED,
      changed_by: mitraIds[1] ?? mitraIds[0],
      notes: "Seed demo RESOLVED",
      photo_url: [],
    },
  });

  console.log("  tickets:", tOpen.ticket_no, tAssigned.ticket_no, tResolved.ticket_no);
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
  console.log("→ Seed DEMO terbatas (showcase)...");
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await seedSla();
  console.log("  sla: ok");
  const cats = await seedCategories();
  console.log("  categories:", cats.size);
  await seedCommissions();
  console.log("  commissions: ok");

  const agreement = await ensureAgreement();
  console.log("  agreement:", agreement.version);

  const mitraIds: string[] = [];
  for (const m of MITRA) {
    const u = await upsertMitra(m, passwordHash, agreement.id);
    mitraIds.push(u.id);
    console.log("  mitra:", u.phone);
  }
  const pkwt = await upsertPkwt(passwordHash);
  console.log("  pkwt:", pkwt.phone);

  const tenants = await seedTenantsAndDevices(cats.get("EDC"));
  console.log("  tenants:", tenants.length);

  const admin = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN },
    select: { id: true, phone: true },
  });
  await seedTickets(
    tenants.map((t) => ({ id: t.id, code: t.code })),
    mitraIds,
    admin?.id ?? null
  );

  const kb = await seedKb();
  console.log("  kb:", kb);
  if (kb.total < 30) {
    console.warn("  WARNING: KB catalog lebih kecil dari expected — cek seed-knowledge-base.ts");
  }

  console.log("\n========== DEMO LOGIN ==========");
  if (admin) console.log(`  Admin:   ${admin.phone} (password yang sudah dibuat)`);
  console.log(`  Mitra 1: ${MITRA[0].phone} / ${PASSWORD}`);
  console.log(`  Mitra 2: ${MITRA[1].phone} / ${PASSWORD}`);
  console.log(`  PKWT:    ${PKWT.phone} / ${PASSWORD}`);
  console.log("  Birthday: Mitra 1 = hari ini (uji cron /api/cron/birthday-greetings)");
  console.log("  Reset password: Edit Engineer di admin, atau scripts/reset-password.ts");
  console.log("================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
