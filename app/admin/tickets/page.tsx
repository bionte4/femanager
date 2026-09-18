import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TicketsRealtimeTable } from "@/components/ticket/tickets-realtime-table";

export default async function AdminTicketsPage() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const [tenants, devices, categories] = await Promise.all([
    prisma.tenant.findMany({
      where: { is_active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.device.findMany({
      select: {
        id: true,
        tenant_id: true,
        type: true,
        serial_number: true,
        service_category_id: true,
      },
      orderBy: { serial_number: "asc" },
    }),
    prisma.serviceCategory.findMany({
      where: { is_active: true },
      select: {
        id: true,
        code: true,
        name: true,
        icon: true,
        estimated_duration_minutes: true,
        packages: {
          where: { is_active: true },
          select: {
            id: true,
            name: true,
            description: true,
            price_customer: true,
            fee_engineer: true,
            estimated_duration: true,
            required_engineers: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tickets</h1>
        <p className="text-xs text-muted-foreground">
          Daftar ticket realtime — polling setiap 15 detik.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat...</p>}>
        <TicketsRealtimeTable
          tenants={tenants}
          devices={devices}
          categories={categories}
        />
      </Suspense>
    </div>
  );
}
