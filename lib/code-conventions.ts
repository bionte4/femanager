/**
 * Standard kode FE-Track — single source of truth untuk validasi form & Excel.
 *
 * | Entity   | Pattern              | Contoh            |
 * |----------|----------------------|-------------------|
 * | Gudang   | SITE (2–4 + ops digit) | HQ, JKT, BDG, JKT2 |
 * | Tenant   | CLIENT-CITY-SEQ      | BRI-JKT-001        |
 * | SKU      | CAT-BRAND-MODEL      | EDC-BCA-ICT250     |
 * | Ticket   | FE-YYYYMMDD-XXXX     | (auto)            |
 */

export const WAREHOUSE_CODE_REGEX = /^[A-Z]{2,4}\d{0,2}$/;
export const WAREHOUSE_CODE_HINT =
  "Format: 2–4 huruf (+opsional angka). Contoh: HQ, JKT, BDG, SBY, JKT2";
export const WAREHOUSE_CODE_ERROR =
  "Kode gudang: 2–4 huruf besar, boleh diakhiri 1–2 digit (HQ, JKT, BDG, JKT2)";

export const TENANT_CODE_REGEX = /^[A-Z]{2,4}-[A-Z]{2,4}-\d{3}$/;
export const TENANT_CODE_HINT =
  "Format: CLIENT-CITY-### . Contoh: BRI-JKT-001, ALF-BDG-012";
export const TENANT_CODE_ERROR =
  "Kode tenant: CLIENT-CITY-### (huruf 2–4, huruf 2–4, 3 digit). Contoh: BRI-JKT-001";

/** Kategori sparepart yang disarankan (tidak wajib keras di regex) */
export const SKU_CATEGORY_PREFIXES = [
  "EDC",
  "RTR",
  "SW",
  "CBL",
  "PWR",
  "SIM",
  "ANT",
  "OTH",
] as const;

export const SKU_REGEX = /^[A-Z]{2,4}-[A-Z0-9]{2,12}-[A-Z0-9-]{2,32}$/;
export const SKU_HINT =
  "Format: CAT-BRAND-MODEL . Contoh: EDC-BCA-ICT250, RTR-CISCO-4321, CBL-LAN-CAT6-5M";
export const SKU_ERROR =
  "SKU: CAT-BRAND-MODEL (huruf/angka, dipisah -). Contoh: EDC-BCA-ICT250";

export const SERVICE_CATEGORY_CODES = [
  "EDC",
  "SDWAN",
  "DESKTOP",
  "LAPTOP",
  "WIFI",
  "CCTV",
  "PRINTER",
] as const;

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}
