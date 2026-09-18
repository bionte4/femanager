import { auth, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listServiceCategories } from "@/app/actions/service-categories";
import { ServiceCategoriesClient } from "@/components/admin/service-categories-client";

export default async function AdminServiceCategoriesPage() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const items = await listServiceCategories(false);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Kategori Service
        </h1>
        <p className="text-xs text-muted-foreground">
          Kelola multi-kategori: EDC, SDWAN, Desktop, Laptop, WiFi, CCTV, Printer.
        </p>
      </div>
      <ServiceCategoriesClient items={items} />
    </div>
  );
}
