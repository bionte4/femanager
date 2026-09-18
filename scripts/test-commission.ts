import { PrismaClient } from "@prisma/client";
import { processCommissionForTicket } from "../lib/commission";

const prisma = new PrismaClient();

async function main() {
  let ticket = await prisma.ticket.findFirst({
    where: { status: "RESOLVED", commission_calculated: false },
    orderBy: { created_at: "desc" },
  });

  if (!ticket) {
    const assigned = await prisma.ticket.findFirst({
      where: { assigned_engineer_id: { not: null } },
      orderBy: { created_at: "desc" },
    });
    if (!assigned) {
      console.log("No ticket to process");
      return;
    }
    ticket = await prisma.ticket.update({
      where: { id: assigned.id },
      data: {
        status: "RESOLVED",
        resolved_at: new Date(),
        commission_calculated: false,
      },
    });
  }

  const result = await processCommissionForTicket(ticket.id);
  console.log(ticket.ticket_no, result);

  const wallet = await prisma.engineerWallet.findFirst({
    where: { engineer_id: ticket.assigned_engineer_id! },
    include: { engineer: true, transactions: true },
  });
  console.log({
    engineer: wallet?.engineer.full_name,
    balance: wallet?.balance,
    txs: wallet?.transactions.map((t) => `${t.type}:${t.amount}`),
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
