import type { SlaTier } from "@prisma/client";

export const SERVICE_CATEGORY_CODES = [
  "EDC",
  "SDWAN",
  "DESKTOP",
  "LAPTOP",
  "WIFI",
  "CCTV",
  "PRINTER",
] as const;

export type ServiceCategoryCode = (typeof SERVICE_CATEGORY_CODES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  EDC: "bg-blue-100 text-blue-800 border-blue-300",
  SDWAN: "bg-violet-100 text-violet-800 border-violet-300",
  DESKTOP: "bg-slate-100 text-slate-800 border-slate-300",
  LAPTOP: "bg-orange-100 text-orange-800 border-orange-300",
  WIFI: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CCTV: "bg-red-100 text-red-800 border-red-300",
  PRINTER: "bg-amber-100 text-amber-900 border-amber-300",
};

export function feeForTier(
  category: { base_fee_tier1: number; base_fee_tier2: number; base_fee_tier3: number },
  tier: SlaTier
): number {
  if (tier === "TIER1_JABODETABEK") return category.base_fee_tier1;
  if (tier === "TIER2_PROVINCE") return category.base_fee_tier2;
  return category.base_fee_tier3;
}

/** Seed blueprint 7 kategori */
export const SERVICE_CATEGORY_SEED = [
  {
    code: "EDC",
    name: "EDC / Payment Terminal",
    icon: "CreditCard",
    base_fee_tier1: 75000,
    base_fee_tier2: 100000,
    base_fee_tier3: 150000,
    estimated_duration_minutes: 30,
    requires_certification: false,
    checklist_template: [
      "Cek kabel power",
      "Cek kertas thermal",
      "Test transaksi",
      "Foto SN EDC",
      "Foto struk test",
    ],
  },
  {
    code: "SDWAN",
    name: "SDWAN / Router Enterprise",
    icon: "Router",
    base_fee_tier1: 350000,
    base_fee_tier2: 450000,
    base_fee_tier3: 600000,
    estimated_duration_minutes: 120,
    requires_certification: true,
    checklist_template: [
      "Foto SN Router SDWAN & dus",
      "Foto rack sebelum & sesudah",
      "Cek Link 1 & Link 2 ISP",
      "Foto tunnel status hijau",
      "Test failover",
      "Speedtest + foto",
      "Foto Tunnel ID",
    ],
  },
  {
    code: "DESKTOP",
    name: "Desktop & PC",
    icon: "Monitor",
    base_fee_tier1: 100000,
    base_fee_tier2: 125000,
    base_fee_tier3: 175000,
    estimated_duration_minutes: 60,
    requires_certification: false,
    checklist_template: [
      "Cek keluhan user",
      "Cek hardware (RAM, HDD)",
      "Install ulang / servis",
      "Test nyala & aplikasi",
      "Foto before/after",
      "Foto SN PC",
    ],
  },
  {
    code: "LAPTOP",
    name: "Laptop",
    icon: "Laptop",
    base_fee_tier1: 125000,
    base_fee_tier2: 150000,
    base_fee_tier3: 200000,
    estimated_duration_minutes: 90,
    requires_certification: false,
    checklist_template: [
      "Cek keluhan",
      "Cek baterai/charger",
      "Bongkar & bersihkan",
      "Install/service",
      "Test semua port & keyboard",
      "Foto SN",
    ],
  },
  {
    code: "WIFI",
    name: "WiFi & Access Point",
    icon: "Wifi",
    base_fee_tier1: 150000,
    base_fee_tier2: 175000,
    base_fee_tier3: 225000,
    estimated_duration_minutes: 60,
    requires_certification: false,
    checklist_template: [
      "Cek coverage sinyal lama",
      "Cek setting router/AP",
      "Pasang/Setting AP baru",
      "Test speedtest di 3 titik",
      "Foto speedtest",
      "Foto pemasangan AP",
    ],
  },
  {
    code: "CCTV",
    name: "CCTV",
    icon: "Video",
    base_fee_tier1: 200000,
    base_fee_tier2: 250000,
    base_fee_tier3: 350000,
    estimated_duration_minutes: 120,
    requires_certification: false,
    checklist_template: [
      "Cek jumlah channel & DVR",
      "Cek kabel & power",
      "Pasang kamera",
      "Setting DVR/NVR & HP client",
      "Test rekaman & playback",
      "Foto hasil CCTV di HP",
      "Foto SN DVR & Kamera",
    ],
  },
  {
    code: "PRINTER",
    name: "Printer",
    icon: "Printer",
    base_fee_tier1: 100000,
    base_fee_tier2: 125000,
    base_fee_tier3: 150000,
    estimated_duration_minutes: 45,
    requires_certification: false,
    checklist_template: [
      "Cek keluhan print",
      "Cek tinta/toner",
      "Cek kabel & driver",
      "Test print",
      "Foto SN printer",
    ],
  },
] as const;

export const SERVICE_PACKAGE_SEED: Array<{
  category_code: string;
  name: string;
  description: string;
  price_customer: number;
  fee_engineer: number;
  estimated_duration: number;
  required_engineers?: number;
}> = [
  { category_code: "EDC", name: "Ganti EDC + Test Transaksi", description: "Replace unit EDC & settlement test", price_customer: 200000, fee_engineer: 75000, estimated_duration: 30 },
  { category_code: "EDC", name: "Install EDC Baru", description: "Pasang EDC baru + setting SIM", price_customer: 250000, fee_engineer: 100000, estimated_duration: 45 },
  { category_code: "EDC", name: "Troubleshoot EDC Offline", description: "Diagnosa EDC tidak online", price_customer: 150000, fee_engineer: 75000, estimated_duration: 30 },
  { category_code: "SDWAN", name: "Install Router SDWAN", description: "Pasang & konfigurasi tunnel dual link", price_customer: 900000, fee_engineer: 350000, estimated_duration: 120 },
  { category_code: "SDWAN", name: "Migrasi Link SDWAN", description: "Migrasi ISP / tunnel", price_customer: 750000, fee_engineer: 300000, estimated_duration: 90 },
  { category_code: "SDWAN", name: "Troubleshoot Tunnel Down", description: "Perbaikan tunnel offline", price_customer: 500000, fee_engineer: 250000, estimated_duration: 60 },
  { category_code: "DESKTOP", name: "Install Ulang Windows 10/11 + Office + Driver", description: "Fresh install OS + Office", price_customer: 250000, fee_engineer: 100000, estimated_duration: 90 },
  { category_code: "DESKTOP", name: "Upgrade RAM / SSD", description: "Upgrade hardware desktop", price_customer: 200000, fee_engineer: 100000, estimated_duration: 60 },
  { category_code: "DESKTOP", name: "Servis PC Hang / Slow", description: "Optimasi & bersihkan malware", price_customer: 175000, fee_engineer: 100000, estimated_duration: 60 },
  { category_code: "LAPTOP", name: "Ganti Pasta + Bersihkan + Install Ulang", description: "Full service laptop", price_customer: 300000, fee_engineer: 125000, estimated_duration: 120 },
  { category_code: "LAPTOP", name: "Ganti Keyboard / LCD", description: "Sparepart + pasang", price_customer: 250000, fee_engineer: 125000, estimated_duration: 90 },
  { category_code: "LAPTOP", name: "Diagnosa Tidak Nyala", description: "Cek power board / charger", price_customer: 200000, fee_engineer: 125000, estimated_duration: 60 },
  { category_code: "WIFI", name: "Pasang WiFi Mesh 2 Unit + Setting", description: "Install mesh AP dual unit", price_customer: 500000, fee_engineer: 150000, estimated_duration: 90 },
  { category_code: "WIFI", name: "Setting Router Kantor + VLAN Guest", description: "Konfigurasi jaringan kantor", price_customer: 400000, fee_engineer: 175000, estimated_duration: 60 },
  { category_code: "WIFI", name: "Survey Coverage & Optimasi", description: "Survey sinyal + tune channel", price_customer: 300000, fee_engineer: 150000, estimated_duration: 60 },
  { category_code: "CCTV", name: "Pasang CCTV 2 Channel Full Set", description: "2 kamera + DVR + setting HP", price_customer: 1500000, fee_engineer: 400000, estimated_duration: 180, required_engineers: 2 },
  { category_code: "CCTV", name: "Pasang CCTV 4 Channel Full Set", description: "4 kamera + NVR", price_customer: 2800000, fee_engineer: 550000, estimated_duration: 240, required_engineers: 2 },
  { category_code: "CCTV", name: "Servis CCTV Offline", description: "Perbaikan DVR/kamera offline", price_customer: 300000, fee_engineer: 150000, estimated_duration: 60 },
  { category_code: "PRINTER", name: "Install Driver + Share Network", description: "Setup printer sharing", price_customer: 175000, fee_engineer: 100000, estimated_duration: 45 },
  { category_code: "PRINTER", name: "Servis Printer Macet / Streak", description: "Bersihkan head & path", price_customer: 150000, fee_engineer: 100000, estimated_duration: 45 },
  { category_code: "PRINTER", name: "Ganti Toner + Kalibrasi", description: "Replace toner & test", price_customer: 125000, fee_engineer: 75000, estimated_duration: 30 },
];
