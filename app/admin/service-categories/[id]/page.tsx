import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { getServiceCategory } from "@/app/actions/service-categories";
import { ServiceCategoryDetailClient } from "@/components/admin/service-categories-client";
import { CATEGORY_COLORS } from "@/lib/service-categories";
import { formatRupiah } from "@/lib/utils/rupiah";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function ServiceCategoryDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const { id } = await Promise.resolve(params);
  const category = await getServiceCategory(id);
  if (!category) notFound();

  const checklist = Array.isArray(category.checklist_template)
    ? (category.checklist_template as string[])
    : [];

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/admin/service-categories">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
      </Button>

      <div className="space-y-2">
        <span
          className={cn(
            "inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold",
            CATEGORY_COLORS[category.code] ?? "bg-muted"
          )}
        >
          {category.code}
        </span>
        <h1 className="text-xl font-semibold tracking-tight">{category.name}</h1>
        <p className="text-sm text-muted-foreground">
          Fee {formatRupiah(category.base_fee_tier1)} /{" "}
          {formatRupiah(category.base_fee_tier2)} /{" "}
          {formatRupiah(category.base_fee_tier3)} · ~
          {category.estimated_duration_minutes} menit · Ticket:{" "}
          {category._count.tickets}
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-2 font-semibold">Checklist Template</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Service Packages</h2>
        <ServiceCategoryDetailClient
          categoryId={category.id}
          packages={category.packages}
        />
      </div>
    </div>
  );
}
