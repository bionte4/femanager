import { prisma } from "@/lib/prisma";

/**
 * Generate ticket_no format FE-YYYYMMDD-XXXX (sequential per hari)
 */
export async function generateTicketNo(date = new Date()): Promise<string> {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const prefix = `FE-${yyyy}${mm}${dd}-`;

  const latest = await prisma.ticket.findFirst({
    where: { ticket_no: { startsWith: prefix } },
    orderBy: { ticket_no: "desc" },
    select: { ticket_no: true },
  });

  let seq = 1;
  if (latest?.ticket_no) {
    const last = Number(latest.ticket_no.slice(-4));
    if (Number.isFinite(last)) seq = last + 1;
  }

  return `${prefix}${String(seq).padStart(4, "0")}`;
}
