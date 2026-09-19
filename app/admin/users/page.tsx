import { redirect } from "next/navigation";
import {
  listAdminUserAudits,
  listAdminUsers,
} from "@/app/actions/admin-users";
import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { auth } from "@/lib/auth";
import { hasRole, USERS_ADMIN_ROLES } from "@/lib/rbac-constants";

type PageProps = {
  searchParams:
    | Promise<{ q?: string; role?: string }>
    | { q?: string; role?: string };
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.role, USERS_ADMIN_ROLES)) {
    redirect("/admin/dashboard");
  }

  const params = await Promise.resolve(searchParams);
  const [{ items }, audits] = await Promise.all([
    listAdminUsers({ q: params.q, role: params.role }),
    listAdminUserAudits(25),
  ]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Users</h1>
        <p className="text-xs text-muted-foreground">
          Kelola akun internal (RBAC). Hanya SUPER_ADMIN. Field engineer dikelola
          di menu Engineers.
        </p>
      </div>
      <AdminUsersClient
        currentUserId={session.user.id}
        items={items.map((u) => ({
          ...u,
          created_at: u.created_at.toISOString(),
        }))}
        audits={audits}
      />
    </div>
  );
}
