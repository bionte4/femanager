import {
  PrismaClient,
  Role,
  EngineerStatus,
  SlaTier,
  DeviceType,
  DeviceStatus,
  LocationType,
  TicketType,
  AgreementStatus,
  PartnershipStatus,
  ComplianceType,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";
import {
  SERVICE_CATEGORY_SEED,
  SERVICE_PACKAGE_SEED,
} from "../lib/service-categories";
import {
  AGREEMENT_TITLE,
  AGREEMENT_VERSION,
  PARTNERSHIP_AGREEMENT_V1_HTML,
  PARTNERSHIP_CONSENT_TEXT,
} from "../lib/legal/agreement-template";

const prisma = new PrismaClient();

type Hub = {
  province: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
  tier: SlaTier;
  brands: string[];
};

/** Hub kota se-Indonesia untuk generate 100 tenant */
const HUBS: Hub[] = [
  { province: "DKI Jakarta", city: "Jakarta Pusat", district: "Menteng", lat: -6.1944, lng: 106.8294, tier: SlaTier.TIER1_JABODETABEK, brands: ["Alfamart", "Indomaret", "Bank BCA", "Bank BRI"] },
  { province: "DKI Jakarta", city: "Jakarta Selatan", district: "Kebayoran Baru", lat: -6.2440, lng: 106.7990, tier: SlaTier.TIER1_JABODETABEK, brands: ["Circle K", "FamilyMart", "Bank Mandiri"] },
  { province: "DKI Jakarta", city: "Jakarta Timur", district: "Pulogadung", lat: -6.1948, lng: 106.8800, tier: SlaTier.TIER1_JABODETABEK, brands: ["Alfamidi", "Bank BNI"] },
  { province: "DKI Jakarta", city: "Jakarta Utara", district: "Kelapa Gading", lat: -6.1574, lng: 106.9075, tier: SlaTier.TIER1_JABODETABEK, brands: ["Alfamart", "Indomaret"] },
  { province: "DKI Jakarta", city: "Jakarta Barat", district: "Taman Sari", lat: -6.1450, lng: 106.8150, tier: SlaTier.TIER1_JABODETABEK, brands: ["Toko Elektronik", "Bank BRI"] },
  { province: "Jawa Barat", city: "Bekasi", district: "Bekasi Barat", lat: -6.2383, lng: 106.9756, tier: SlaTier.TIER1_JABODETABEK, brands: ["Indomaret", "Alfamart"] },
  { province: "Jawa Barat", city: "Depok", district: "Beji", lat: -6.3720, lng: 106.8300, tier: SlaTier.TIER1_JABODETABEK, brands: ["Bank Mandiri", "Alfamart"] },
  { province: "Banten", city: "Tangerang", district: "Karawaci", lat: -6.1783, lng: 106.6319, tier: SlaTier.TIER1_JABODETABEK, brands: ["Indomaret", "Alfamart"] },
  { province: "Banten", city: "Tangerang Selatan", district: "Serpong", lat: -6.3010, lng: 106.6530, tier: SlaTier.TIER1_JABODETABEK, brands: ["Indomaret", "Circle K"] },
  { province: "Jawa Barat", city: "Bogor", district: "Bogor Tengah", lat: -6.5971, lng: 106.7990, tier: SlaTier.TIER1_JABODETABEK, brands: ["Bank BNI", "Alfamart"] },
  { province: "Jawa Barat", city: "Bandung", district: "Coblong", lat: -6.8915, lng: 107.6107, tier: SlaTier.TIER2_PROVINCE, brands: ["Alfamart", "Indomaret", "Bank BCA"] },
  { province: "Jawa Barat", city: "Bandung", district: "Cicendo", lat: -6.9075, lng: 107.5800, tier: SlaTier.TIER2_PROVINCE, brands: ["Circle K", "Bank BRI"] },
  { province: "Jawa Barat", city: "Cimahi", district: "Cimahi Tengah", lat: -6.8720, lng: 107.5420, tier: SlaTier.TIER2_PROVINCE, brands: ["Alfamart", "Indomaret"] },
  { province: "Jawa Tengah", city: "Semarang", district: "Semarang Tengah", lat: -6.9667, lng: 110.4167, tier: SlaTier.TIER2_PROVINCE, brands: ["Alfamart", "Bank Mandiri"] },
  { province: "Jawa Tengah", city: "Solo", district: "Laweyan", lat: -7.5667, lng: 110.8167, tier: SlaTier.TIER2_PROVINCE, brands: ["Indomaret", "Bank BCA"] },
  { province: "DI Yogyakarta", city: "Yogyakarta", district: "Gondokusuman", lat: -7.7828, lng: 110.3671, tier: SlaTier.TIER2_PROVINCE, brands: ["Alfamart", "Circle K", "Bank BRI"] },
  { province: "Jawa Timur", city: "Surabaya", district: "Gubeng", lat: -7.2650, lng: 112.7520, tier: SlaTier.TIER2_PROVINCE, brands: ["Alfamart", "Indomaret", "Bank BCA"] },
  { province: "Jawa Timur", city: "Surabaya", district: "Rungkut", lat: -7.3200, lng: 112.7800, tier: SlaTier.TIER2_PROVINCE, brands: ["Bank BRI", "FamilyMart"] },
  { province: "Jawa Timur", city: "Malang", district: "Klojen", lat: -7.9666, lng: 112.6326, tier: SlaTier.TIER2_PROVINCE, brands: ["Alfamart", "Indomaret"] },
  { province: "Sumatera Utara", city: "Medan", district: "Medan Kota", lat: 3.5952, lng: 98.6722, tier: SlaTier.TIER2_PROVINCE, brands: ["Alfamart", "Indomaret", "Bank Mandiri"] },
  { province: "Sumatera Utara", city: "Medan", district: "Medan Baru", lat: 3.5800, lng: 98.6500, tier: SlaTier.TIER2_PROVINCE, brands: ["Bank BCA", "Circle K"] },
  { province: "Sumatera Barat", city: "Padang", district: "Padang Barat", lat: -0.9471, lng: 100.4172, tier: SlaTier.TIER2_PROVINCE, brands: ["Alfamart", "Bank BRI"] },
  { province: "Sumatera Selatan", city: "Palembang", district: "Ilir Barat I", lat: -2.9761, lng: 104.7754, tier: SlaTier.TIER2_PROVINCE, brands: ["Indomaret", "Bank Mandiri"] },
  { province: "Sulawesi Selatan", city: "Makassar", district: "Panakkukang", lat: -5.1477, lng: 119.4327, tier: SlaTier.TIER2_PROVINCE, brands: ["Alfamart", "Indomaret", "Bank BCA"] },
  { province: "Sulawesi Selatan", city: "Makassar", district: "Ujung Pandang", lat: -5.1350, lng: 119.4120, tier: SlaTier.TIER2_PROVINCE, brands: ["Bank BRI", "Circle K"] },
  { province: "Bali", city: "Denpasar", district: "Denpasar Selatan", lat: -8.6705, lng: 115.2126, tier: SlaTier.TIER2_PROVINCE, brands: ["Alfamart", "Indomaret"] },
  { province: "Kalimantan Timur", city: "Balikpapan", district: "Balikpapan Selatan", lat: -1.2379, lng: 116.8529, tier: SlaTier.TIER2_PROVINCE, brands: ["Alfamart", "Bank Mandiri"] },
  { province: "Jawa Barat", city: "Karawang", district: "Karawang Barat", lat: -6.3220, lng: 107.3370, tier: SlaTier.TIER3_KABUPATEN, brands: ["Indomaret", "Alfamart"] },
  { province: "Jawa Barat", city: "Cirebon", district: "Kesambi", lat: -6.7320, lng: 108.5520, tier: SlaTier.TIER3_KABUPATEN, brands: ["Alfamart", "Bank BRI"] },
  { province: "Jawa Timur", city: "Sidoarjo", district: "Sidoarjo", lat: -7.4478, lng: 112.7183, tier: SlaTier.TIER3_KABUPATEN, brands: ["Indomaret", "Alfamart"] },
  { province: "Jawa Tengah", city: "Purwokerto", district: "Purwokerto Timur", lat: -7.4210, lng: 109.2350, tier: SlaTier.TIER3_KABUPATEN, brands: ["Alfamart", "Bank BNI"] },
  { province: "Jawa Barat", city: "Garut", district: "Garut Kota", lat: -7.2100, lng: 107.9000, tier: SlaTier.TIER3_KABUPATEN, brands: ["Indomaret", "Alfamart"] },
];

const FIRST_NAMES = [
  "Budi", "Andi", "Siti", "Rizki", "Dewi", "Ahmad", "Nina", "Fajar", "Lina", "Doni",
  "Rina", "Yudi", "Putri", "Hendra", "Maya", "Agus", "Sari", "Eko", "Wulan", "Tono",
  "Fitri", "Bayu", "Indah", "Reza", "Ayu", "Dedi", "Nur", "Ilham", "Citra", "Fikri",
];
const LAST_NAMES = [
  "Santoso", "Wijaya", "Rahayu", "Pratama", "Sari", "Nugroho", "Putra", "Lestari",
  "Hidayat", "Kurniawan", "Saputra", "Wulandari", "Setiawan", "Maharani", "Gunawan",
];

function buildTenants(count: number) {
  const tenants: Array<{
    name: string;
    code: string;
    address: string;
    province: string;
    city: string;
    district: string;
    sub_district: string;
    lat: number;
    lng: number;
    sla_tier: SlaTier;
  }> = [];

  for (let i = 0; i < count; i++) {
    const hub = HUBS[i % HUBS.length];
    const brand = hub.brands[i % hub.brands.length];
    const n = Math.floor(i / HUBS.length) + 1;
    const jitterLat = ((i * 17) % 20 - 10) * 0.002;
    const jitterLng = ((i * 29) % 20 - 10) * 0.002;
    const cityCode = hub.city
      .replace(/[^A-Za-z]/g, "")
      .slice(0, 3)
      .toUpperCase();

    tenants.push({
      name: `${brand} ${hub.district} ${n}`,
      code: `${brand.slice(0, 3).toUpperCase()}-${cityCode}-${String(i + 1).padStart(3, "0")}`,
      address: `Jl. ${hub.district} No. ${(i % 90) + 1}`,
      province: hub.province,
      city: hub.city,
      district: hub.district,
      sub_district: `${hub.district} ${((i % 3) + 1)}`,
      lat: hub.lat + jitterLat,
      lng: hub.lng + jitterLng,
      sla_tier: hub.tier,
    });
  }

  return tenants;
}

function buildEngineers(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const hub = HUBS[i % HUBS.length];
    const skillsPool = [
      ["EDC", "DESKTOP"],
      ["EDC", "SDWAN", "WIFI"],
      ["LAPTOP", "DESKTOP", "PRINTER"],
      ["CCTV", "WIFI"],
      ["EDC", "LAN", "WIFI"],
      ["DESKTOP", "LAPTOP", "PRINTER", "WIFI"],
      ["CCTV", "WIFI", "SDWAN"],
      ["EDC"],
    ];
    return {
      full_name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`,
      phone: `08122${String(2222000 + i + 1).slice(-7)}`,
      city: hub.city,
      district: hub.district,
      lat: hub.lat + ((i % 7) - 3) * 0.01,
      lng: hub.lng + ((i % 5) - 2) * 0.01,
      skills: skillsPool[i % skillsPool.length],
      has_motorcycle: true,
      has_toolkit: i % 3 !== 0,
      has_car: i % 5 === 0,
    };
  });
}

async function main() {
  console.log("🌱 Seeding FE-Track database...");

  const passwordHash = await bcrypt.hash("password123", 10);
  const tenants = buildTenants(100);
  const engineers = buildEngineers(30);

  console.log("→ SLA configs...");
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

  console.log("→ Service categories & packages...");
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

  console.log("→ Partnership agreement v1.0...");
  await prisma.partnershipAgreement.updateMany({ data: { is_active: false } });
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

  console.log("→ Admin...");
  const admin = await prisma.user.upsert({
    where: { phone: "081111111111" },
    update: {},
    create: {
      full_name: "Admin NOC",
      phone: "081111111111",
      password: passwordHash,
      role: Role.SUPER_ADMIN,
      city: "Jakarta Pusat",
      district: "Menteng",
      status: EngineerStatus.OFFLINE,
      skills: [],
    },
  });

  console.log("→ NOC L0 / L1...");
  await prisma.user.upsert({
    where: { phone: "081111111112" },
    update: { role: Role.NOC_L0, full_name: "NOC L0 Standby" },
    create: {
      full_name: "NOC L0 Standby",
      phone: "081111111112",
      password: passwordHash,
      role: Role.NOC_L0,
      city: "Jakarta Pusat",
      district: "Menteng",
      status: EngineerStatus.OFFLINE,
      skills: [],
    },
  });
  await prisma.user.upsert({
    where: { phone: "081111111113" },
    update: { role: Role.NOC_L1, full_name: "NOC L1 Device Check" },
    create: {
      full_name: "NOC L1 Device Check",
      phone: "081111111113",
      password: passwordHash,
      role: Role.NOC_L1,
      city: "Jakarta Pusat",
      district: "Menteng",
      status: EngineerStatus.OFFLINE,
      skills: [],
    },
  });

  console.log(`→ Engineers (${engineers.length})...`);
  const engineerIds: string[] = [];
  for (const eng of engineers) {
    const u = await prisma.user.upsert({
      where: { phone: eng.phone },
      update: {
        full_name: eng.full_name,
        city: eng.city,
        district: eng.district,
        lat: eng.lat,
        lng: eng.lng,
        skills: eng.skills,
        status: EngineerStatus.AVAILABLE,
        has_motorcycle: eng.has_motorcycle,
        has_toolkit: eng.has_toolkit,
        has_car: eng.has_car,
        partnership_status: PartnershipStatus.SIGNED,
        tools_owned: [
          eng.has_motorcycle ? "motorcycle" : null,
          eng.has_toolkit ? "toolkit" : null,
          eng.has_car ? "car" : null,
        ].filter(Boolean) as string[],
        can_work_for_others: true,
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
        skills: eng.skills,
        status: EngineerStatus.AVAILABLE,
        rating: 4.2 + Math.random() * 0.8,
        has_motorcycle: eng.has_motorcycle,
        has_toolkit: eng.has_toolkit,
        has_car: eng.has_car,
        partnership_status: PartnershipStatus.SIGNED,
        tools_owned: [
          eng.has_motorcycle ? "motorcycle" : null,
          eng.has_toolkit ? "toolkit" : null,
          eng.has_car ? "car" : null,
        ].filter(Boolean) as string[],
        can_work_for_others: true,
      },
    });
    engineerIds.push(u.id);

    await prisma.engineerAgreement.upsert({
      where: {
        engineer_id_agreement_id: {
          engineer_id: u.id,
          agreement_id: agreement.id,
        },
      },
      update: {
        status: AgreementStatus.SIGNED,
        signed_at: new Date(),
        signature_data:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        consent_text: PARTNERSHIP_CONSENT_TEXT,
        ip_address: "127.0.0.1",
        user_agent: "seed",
      },
      create: {
        engineer_id: u.id,
        agreement_id: agreement.id,
        status: AgreementStatus.SIGNED,
        signed_at: new Date(),
        signature_data:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        consent_text: PARTNERSHIP_CONSENT_TEXT,
        ip_address: "127.0.0.1",
        user_agent: "seed",
      },
    });

    await prisma.complianceLog.create({
      data: {
        engineer_id: u.id,
        type: ComplianceType.AGREEMENT_SIGNED,
        metadata: { version: AGREEMENT_VERSION, seed: true },
      },
    });
  }

  // Koordinator demo (FE pertama)
  if (engineerIds[0]) {
    await prisma.user.update({
      where: { id: engineerIds[0] },
      data: { is_coordinator: true },
    });
  }

  console.log(`→ Tenants & devices (${tenants.length})...`);
  const deviceTypes = [
    DeviceType.EDC_BCA,
    DeviceType.EDC_BRI,
    DeviceType.ROUTER,
    DeviceType.SWITCH,
  ];

  for (let i = 0; i < tenants.length; i++) {
    const t = tenants[i];
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
      },
      create: {
        name: t.name,
        code: t.code,
        address: t.address,
        province: t.province,
        city: t.city,
        district: t.district,
        sub_district: t.sub_district,
        lat: t.lat,
        lng: t.lng,
        pic_name: `PIC ${t.name.split(" ")[0]}`,
        pic_phone: `0813${String(10000000 + i).slice(0, 8)}`,
        sla_tier: t.sla_tier,
        is_active: true,
      },
    });

    const dtype = deviceTypes[i % deviceTypes.length];
    const serial = `SN-${t.code}`;
    const catCode =
      dtype === DeviceType.EDC_BCA || dtype === DeviceType.EDC_BRI
        ? "EDC"
        : dtype === DeviceType.SWITCH
          ? "WIFI"
          : "WIFI";
    const serviceCategoryId = categoryIdByCode.get(catCode) ?? null;
    await prisma.device.upsert({
      where: { serial_number: serial },
      update: {
        service_category_id: serviceCategoryId,
      },
      create: {
        tenant_id: tenant.id,
        type: dtype,
        service_category_id: serviceCategoryId,
        brand: dtype.startsWith("EDC") ? "Ingenico" : "Cisco",
        serial_number: serial,
        ip_address: `10.${Math.floor(i / 250) + 10}.${Math.floor((i % 250) / 10)}.${(i % 10) + 1}`,
        status: i % 11 === 0 ? DeviceStatus.DOWN : DeviceStatus.UP,
        last_check_at: new Date(),
      },
    });
  }

  console.log("→ Spareparts...");
  const spareparts = [
    { name: "EDC BCA Ingenico iCT250", sku: "EDC-BCA-ICT250", stock_qty: 25, location_type: LocationType.WAREHOUSE },
    { name: "EDC BRI Verifone VX520", sku: "EDC-BRI-VX520", stock_qty: 20, location_type: LocationType.WAREHOUSE },
    { name: "Router Cisco ISR 4321", sku: "RTR-CISCO-4321", stock_qty: 12, location_type: LocationType.WAREHOUSE },
    { name: "Switch Cisco SG350", sku: "SW-CISCO-SG350", stock_qty: 15, location_type: LocationType.WAREHOUSE },
    { name: "Kabel LAN Cat6 5m", sku: "CBL-LAN-CAT6-5M", stock_qty: 100, location_type: LocationType.WAREHOUSE },
    { name: "Power Adapter EDC 9V", sku: "PWR-EDC-9V", stock_qty: 40, location_type: LocationType.WAREHOUSE },
    { name: "SIM Card XL IoT", sku: "SIM-XL-IOT", stock_qty: 50, location_type: LocationType.WAREHOUSE },
    { name: "Antenna 4G Outdoor", sku: "ANT-4G-OUT", stock_qty: 18, location_type: LocationType.WAREHOUSE },
  ];

  for (const s of spareparts) {
    await prisma.sparepart.upsert({
      where: { sku: s.sku },
      update: { stock_qty: s.stock_qty, name: s.name },
      create: s,
    });
  }

  // Sample spare di engineer pertama
  if (engineerIds[0]) {
    await prisma.sparepart.upsert({
      where: { sku: "EDC-BCA-FIELD-01" },
      update: {},
      create: {
        name: "EDC BCA Cadangan Field",
        sku: "EDC-BCA-FIELD-01",
        stock_qty: 2,
        location_type: LocationType.ENGINEER,
        holder_id: engineerIds[0],
      },
    });
  }

  // Tenant khusus untuk demo Open API (sesuai curl PROMPT 10)
  console.log("→ Demo tenant BRI-JKT-001 + Integration...");
  const demoTenant = await prisma.tenant.upsert({
    where: { code: "BRI-JKT-001" },
    update: {},
    create: {
      name: "Bank BRI Thamrin Demo",
      code: "BRI-JKT-001",
      address: "Jl. MH Thamrin No. 5",
      province: "DKI Jakarta",
      city: "Jakarta Pusat",
      district: "Menteng",
      sub_district: "Gondangdia",
      lat: -6.1905,
      lng: 106.8225,
      pic_name: "PIC BRI Demo",
      pic_phone: "081399990001",
      sla_tier: SlaTier.TIER1_JABODETABEK,
      is_active: true,
    },
  });
  await prisma.device.upsert({
    where: { serial_number: "SN-BRI-JKT-001" },
    update: {},
    create: {
      tenant_id: demoTenant.id,
      type: DeviceType.EDC_BRI,
      brand: "Ingenico",
      serial_number: "SN-BRI-JKT-001",
      ip_address: "10.20.0.1",
      status: DeviceStatus.DOWN,
      last_check_at: new Date(),
    },
  });

  const demoApiKey = "api_key_customer_demo";
  const demoHash = await bcrypt.hash(demoApiKey, 10);
  const existingDemo = await prisma.integration.findFirst({
    where: {
      OR: [
        { api_key: demoApiKey },
        { api_key_prefix: demoApiKey.slice(0, 12) },
        { customer_name: "Customer Demo" },
      ],
    },
  });
  if (existingDemo) {
    await prisma.integration.update({
      where: { id: existingDemo.id },
      data: {
        customer_name: "Customer Demo",
        api_key: null,
        api_key_prefix: demoApiKey.slice(0, 12),
        api_key_last4: demoApiKey.slice(-4),
        api_key_hash: demoHash,
        webhook_url: "https://webhook.site/replace-me",
        webhook_secret: "demo_webhook_secret",
        is_active: true,
      },
    });
  } else {
    await prisma.integration.create({
      data: {
        customer_name: "Customer Demo",
        api_key: null,
        api_key_prefix: demoApiKey.slice(0, 12),
        api_key_last4: demoApiKey.slice(-4),
        api_key_hash: demoHash,
        webhook_url: "https://webhook.site/replace-me",
        webhook_secret: "demo_webhook_secret",
        is_active: true,
      },
    });
  }

  console.log("→ Commission rules...");
  const commissionRules = [
    // EDC
    { name: "EDC TIER1 INCIDENT", device_type: DeviceType.EDC_BCA, sla_tier: SlaTier.TIER1_JABODETABEK, ticket_type: TicketType.INCIDENT, base_fee: 75000, bonus_ontime_fee: 15000, penalty_breach_fee: -25000 },
    { name: "EDC TIER2 INCIDENT", device_type: DeviceType.EDC_BCA, sla_tier: SlaTier.TIER2_PROVINCE, ticket_type: TicketType.INCIDENT, base_fee: 100000, bonus_ontime_fee: 15000, penalty_breach_fee: -25000 },
    { name: "EDC TIER3 INCIDENT", device_type: DeviceType.EDC_BCA, sla_tier: SlaTier.TIER3_KABUPATEN, ticket_type: TicketType.INCIDENT, base_fee: 150000, bonus_ontime_fee: 25000, penalty_breach_fee: -25000 },
    { name: "EDC BRI TIER1 INCIDENT", device_type: DeviceType.EDC_BRI, sla_tier: SlaTier.TIER1_JABODETABEK, ticket_type: TicketType.INCIDENT, base_fee: 75000, bonus_ontime_fee: 15000, penalty_breach_fee: -25000 },
    { name: "EDC BRI TIER2 INCIDENT", device_type: DeviceType.EDC_BRI, sla_tier: SlaTier.TIER2_PROVINCE, ticket_type: TicketType.INCIDENT, base_fee: 100000, bonus_ontime_fee: 15000, penalty_breach_fee: -25000 },
    { name: "EDC BRI TIER3 INCIDENT", device_type: DeviceType.EDC_BRI, sla_tier: SlaTier.TIER3_KABUPATEN, ticket_type: TicketType.INCIDENT, base_fee: 150000, bonus_ontime_fee: 25000, penalty_breach_fee: -25000 },
    // LAN/WAN (Router/Switch)
    { name: "LAN/WAN TIER1 INCIDENT", device_type: DeviceType.ROUTER, sla_tier: SlaTier.TIER1_JABODETABEK, ticket_type: TicketType.INCIDENT, base_fee: 100000, bonus_ontime_fee: 20000, penalty_breach_fee: -25000 },
    { name: "LAN/WAN TIER2 INCIDENT", device_type: DeviceType.ROUTER, sla_tier: SlaTier.TIER2_PROVINCE, ticket_type: TicketType.INCIDENT, base_fee: 125000, bonus_ontime_fee: 20000, penalty_breach_fee: -25000 },
    { name: "LAN/WAN TIER3 INCIDENT", device_type: DeviceType.ROUTER, sla_tier: SlaTier.TIER3_KABUPATEN, ticket_type: TicketType.INCIDENT, base_fee: 175000, bonus_ontime_fee: 25000, penalty_breach_fee: -25000 },
    { name: "SWITCH TIER1 INCIDENT", device_type: DeviceType.SWITCH, sla_tier: SlaTier.TIER1_JABODETABEK, ticket_type: TicketType.INCIDENT, base_fee: 100000, bonus_ontime_fee: 20000, penalty_breach_fee: -25000 },
    { name: "SWITCH TIER2 INCIDENT", device_type: DeviceType.SWITCH, sla_tier: SlaTier.TIER2_PROVINCE, ticket_type: TicketType.INCIDENT, base_fee: 125000, bonus_ontime_fee: 20000, penalty_breach_fee: -25000 },
    { name: "SWITCH TIER3 INCIDENT", device_type: DeviceType.SWITCH, sla_tier: SlaTier.TIER3_KABUPATEN, ticket_type: TicketType.INCIDENT, base_fee: 175000, bonus_ontime_fee: 25000, penalty_breach_fee: -25000 },
    // PM general all tiers
    { name: "PM TIER1", device_type: null, sla_tier: SlaTier.TIER1_JABODETABEK, ticket_type: TicketType.PM, base_fee: 50000, bonus_ontime_fee: 10000, penalty_breach_fee: -15000 },
    { name: "PM TIER2", device_type: null, sla_tier: SlaTier.TIER2_PROVINCE, ticket_type: TicketType.PM, base_fee: 50000, bonus_ontime_fee: 10000, penalty_breach_fee: -15000 },
    { name: "PM TIER3", device_type: null, sla_tier: SlaTier.TIER3_KABUPATEN, ticket_type: TicketType.PM, base_fee: 50000, bonus_ontime_fee: 10000, penalty_breach_fee: -15000 },
    // CM general
    { name: "CM General", device_type: null, sla_tier: null, ticket_type: TicketType.CM, base_fee: 60000, bonus_ontime_fee: 10000, penalty_breach_fee: -20000 },
    // INCIDENT general (fallback jika ticket tanpa device)
    { name: "INCIDENT TIER1 General", device_type: null, sla_tier: SlaTier.TIER1_JABODETABEK, ticket_type: TicketType.INCIDENT, base_fee: 75000, bonus_ontime_fee: 15000, penalty_breach_fee: -25000 },
    { name: "INCIDENT TIER2 General", device_type: null, sla_tier: SlaTier.TIER2_PROVINCE, ticket_type: TicketType.INCIDENT, base_fee: 100000, bonus_ontime_fee: 15000, penalty_breach_fee: -25000 },
    { name: "INCIDENT TIER3 General", device_type: null, sla_tier: SlaTier.TIER3_KABUPATEN, ticket_type: TicketType.INCIDENT, base_fee: 150000, bonus_ontime_fee: 25000, penalty_breach_fee: -25000 },
    // SDWAN Install
    { name: "SDWAN Install TIER1", device_type: DeviceType.ROUTER_SDWAN, sla_tier: SlaTier.TIER1_JABODETABEK, ticket_type: TicketType.CM, base_fee: 350000, bonus_ontime_fee: 50000, penalty_breach_fee: -75000 },
    { name: "SDWAN Install TIER2", device_type: DeviceType.ROUTER_SDWAN, sla_tier: SlaTier.TIER2_PROVINCE, ticket_type: TicketType.CM, base_fee: 450000, bonus_ontime_fee: 50000, penalty_breach_fee: -75000 },
    { name: "SDWAN Install TIER3", device_type: DeviceType.ROUTER_SDWAN, sla_tier: SlaTier.TIER3_KABUPATEN, ticket_type: TicketType.CM, base_fee: 600000, bonus_ontime_fee: 100000, penalty_breach_fee: -100000 },
    // SDWAN Troubleshoot (INCIDENT) semua tier
    { name: "SDWAN Troubleshoot TIER1", device_type: DeviceType.ROUTER_SDWAN, sla_tier: SlaTier.TIER1_JABODETABEK, ticket_type: TicketType.INCIDENT, base_fee: 250000, bonus_ontime_fee: 30000, penalty_breach_fee: -50000 },
    { name: "SDWAN Troubleshoot TIER2", device_type: DeviceType.ROUTER_SDWAN, sla_tier: SlaTier.TIER2_PROVINCE, ticket_type: TicketType.INCIDENT, base_fee: 250000, bonus_ontime_fee: 30000, penalty_breach_fee: -50000 },
    { name: "SDWAN Troubleshoot TIER3", device_type: DeviceType.ROUTER_SDWAN, sla_tier: SlaTier.TIER3_KABUPATEN, ticket_type: TicketType.INCIDENT, base_fee: 250000, bonus_ontime_fee: 30000, penalty_breach_fee: -50000 },
  ];

  for (const rule of commissionRules) {
    const existing = await prisma.commissionRule.findFirst({
      where: { name: rule.name },
    });
    if (existing) {
      await prisma.commissionRule.update({
        where: { id: existing.id },
        data: {
          device_type: rule.device_type,
          sla_tier: rule.sla_tier,
          ticket_type: rule.ticket_type,
          base_fee: rule.base_fee,
          bonus_ontime_fee: rule.bonus_ontime_fee,
          penalty_breach_fee: rule.penalty_breach_fee,
          is_active: true,
        },
      });
    } else {
      await prisma.commissionRule.create({ data: { ...rule, is_active: true } });
    }
  }

  console.log("→ Sample fraud logs (anti-fraud demo)...");
  const demoEng = await prisma.user.findFirst({
    where: { phone: "081222222001" },
  });
  if (demoEng && demoTenant) {
    let demoTicket = await prisma.ticket.findFirst({
      where: {
        assigned_engineer_id: demoEng.id,
        tenant_id: demoTenant.id,
      },
    });
    if (!demoTicket) {
      const { generateTicketNo } = await import("../lib/utils/ticket-generator");
      demoTicket = await prisma.ticket.create({
        data: {
          ticket_no: await generateTicketNo(),
          tenant_id: demoTenant.id,
          type: TicketType.INCIDENT,
          priority: "MEDIUM",
          status: "RESOLVED",
          description: "Seed ticket untuk demo anti-fraud",
          assigned_engineer_id: demoEng.id,
          resolved_at: new Date(),
        },
      });
    }

    const existingFraud = await prisma.fraudLog.count({
      where: { engineer_id: demoEng.id },
    });
    if (existingFraud === 0) {
      await prisma.fraudLog.createMany({
        data: [
          {
            engineer_id: demoEng.id,
            ticket_id: demoTicket.id,
            type: "FAKE_GPS",
            severity: "LOW",
            description: "Foto tanpa EXIF GPS (GPS HP mungkin off)",
            metadata: {
              claimed_lat: demoTenant.lat,
              claimed_lng: demoTenant.lng,
              photo_url: "/uploads/demo/no-exif.jpg",
            },
            is_resolved: false,
          },
          {
            engineer_id: demoEng.id,
            ticket_id: demoTicket.id,
            type: "PHOTO_DUPLICATE",
            severity: "HIGH",
            description: "Hash foto sama dengan ticket lain dalam 30 hari",
            metadata: {
              photo_hash: "seed_demo_hash_abc123",
              previous_ticket_id: demoTicket.id,
            },
            is_resolved: false,
          },
          {
            engineer_id: demoEng.id,
            ticket_id: demoTicket.id,
            type: "PHOTO_GPS_MISMATCH",
            severity: "HIGH",
            description: "EXIF foto beda 2100m dari lokasi check-in",
            metadata: {
              claimed_lat: demoTenant.lat,
              claimed_lng: demoTenant.lng,
              exif_lat: demoTenant.lat + 0.02,
              exif_lng: demoTenant.lng + 0.01,
              distance_meter: 2100,
            },
            is_resolved: false,
          },
        ],
      });

      await prisma.engineerRating.upsert({
        where: { ticket_id: demoTicket.id },
        create: {
          engineer_id: demoEng.id,
          ticket_id: demoTicket.id,
          system_score: 45,
          fraud_flags: ["FAKE_GPS", "PHOTO_DUPLICATE", "PHOTO_GPS_MISMATCH"],
          is_fraud: true,
        },
        update: {
          system_score: 45,
          fraud_flags: ["FAKE_GPS", "PHOTO_DUPLICATE", "PHOTO_GPS_MISMATCH"],
          is_fraud: true,
        },
      });

      await prisma.user.update({
        where: { id: demoEng.id },
        data: { trust_score: 72.5 },
      });
    }
  }

  console.log("→ Knowledge Base (SOP lapangan)...");
  const { KNOWLEDGE_BASE_SEED } = await import("./seed-knowledge-base");
  const kbItems = KNOWLEDGE_BASE_SEED;
  for (const kb of kbItems) {
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
    } else {
      // Update konten seed agar revisi SOP ikut ter-refresh (idempotent by title)
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
    }
  }

  // Sertifikasi SDWAN demo untuk engineer pertama
  if (engineerIds[0]) {
    const hasCert = await prisma.skillCertification.findFirst({
      where: { engineer_id: engineerIds[0], skill: "SDWAN" },
    });
    if (!hasCert) {
      await prisma.skillCertification.create({
        data: {
          engineer_id: engineerIds[0],
          skill: "SDWAN",
          level: "BASIC",
          is_active: true,
        },
      });
      await prisma.user.update({
        where: { id: engineerIds[0] },
        data: { trust_score: 92 },
      });
    }
  }

  // Satu device SDWAN demo
  const demoSdwanTenant = await prisma.tenant.findFirst({
    where: { code: "BRI-JKT-001" },
  });
  if (demoSdwanTenant) {
    await prisma.device.upsert({
      where: { serial_number: "SN-SDWAN-DEMO-001" },
      update: {
        type: DeviceType.ROUTER_SDWAN,
        device_category: "ROUTER_SDWAN",
        service_category_id: categoryIdByCode.get("SDWAN") ?? null,
      },
      create: {
        tenant_id: demoSdwanTenant.id,
        type: DeviceType.ROUTER_SDWAN,
        device_category: "ROUTER_SDWAN",
        service_category_id: categoryIdByCode.get("SDWAN") ?? null,
        brand: "Fortinet",
        serial_number: "SN-SDWAN-DEMO-001",
        ip_address: "10.90.0.1",
        status: DeviceStatus.UP,
        sdwan_profile: {
          tunnel_id: "TNL-DEMO-001",
          link1_isp: "Telkom",
          link2_isp: "Biznet",
        },
      },
    });
  }

  console.log("✅ Seed selesai!");
  console.log(`   Admin: ${admin.phone} / password123`);
  console.log(`   Engineers: ${engineers.length} (contoh 081222222001 / password123)`);
  console.log(`   Tenants: ${tenants.length + 1} (demo BRI-JKT-001)`);
  console.log(`   Spareparts: ${spareparts.length + 1}`);
  console.log(`   Integration API key: ${demoApiKey}`);
  console.log(`   Commission rules: ${commissionRules.length}`);
  console.log(`   Fraud logs demo: lihat /admin/fraud-center`);
  console.log(`   KB: ${kbItems.length} artikel (EDC/SDWAN/LAN/WAN/WIFI/…)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
