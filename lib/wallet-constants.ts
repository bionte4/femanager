export const BANKS = ["BCA", "BRI", "Mandiri", "BNI", "DANA", "OVO", "GoPay"] as const;
export type BankName = (typeof BANKS)[number];

export const MIN_WITHDRAWAL = 50_000;
