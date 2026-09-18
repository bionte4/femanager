import { Suspense } from "react";
import { getTenants } from "@/app/actions/tenants";
import { TenantsWorkspace } from "@/components/admin/tenants-workspace";
import { PageHeader } from "@/components/admin/page-header";

type PageProps = {
  searchParams: Promise<{ q?: string; city?: string; page?: string }> | {
    q?: string;
    city?: string;
    page?: string;
  };
};

export default async function TenantsPage({ searchParams }: PageProps) {
  const params = await Promise.resolve(searchParams);
  const page = Number(params.page ?? "1") || 1;
  const data = await getTenants({
    q: params.q,
    city: params.city,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-3">
      <PageHeader
        title="Tenants"
        description="Kelola toko / tenant se-Indonesia dengan koordinat GPS."
      />
      <Suspense fallback={null}>
        <TenantsWorkspace
          items={data.items}
          cities={data.cities}
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
        />
      </Suspense>
    </div>
  );
}
