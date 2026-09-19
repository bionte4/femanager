/** Alasan reject job Mitra (bukan "use server" — boleh diimpor client) */
export const REJECT_REASONS = [
  "Jauh dari lokasi",
  "Ada kerjaan lain",
  "Sakit / tidak fit",
  "Cuaca buruk",
  "Alat tidak lengkap",
  "Lainnya",
] as const;

export type RejectReason = (typeof REJECT_REASONS)[number];
