/**
 * Format rupiah Indonesia: Rp 75.000
 */
export function formatRupiah(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("id-ID");
  if (amount < 0) return `-Rp ${formatted}`;
  return `Rp ${formatted}`;
}
