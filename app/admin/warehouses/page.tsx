import { auth, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listWarehouses } from "@/app/actions/warehouses";
import { WarehousesTable } from "@/components/admin/warehouses-table";
import Link from "next/link";

export default async function AdminWarehousesPage() {
  const session = await auth();
  if (
    !session?.user ||
    !(ADMIN_ROLES as readonly string[]).includes(session.user.role)
  ) {
    redirect("/login");
  }

  const items = await listWarehouses();

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Gudang</h1>
        <p className="text-xs text-muted-foreground">
          Master multi-gudang per kota/area. Assign sparepart ke gudang di{" "}
          <Link href="/admin/spareparts" className="text-sky-700 underline">
            Spareparts
          </Link>
          .
        </p>
      </div>
      <WarehousesTable items={items} />
    </div>
  );
}
