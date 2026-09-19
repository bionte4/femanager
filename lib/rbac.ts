import { auth } from "@/lib/auth";
import {
  ADMIN_ROLES,
  CONTRACT_ADMIN_ROLES,
} from "@/lib/auth.config";
import {
  COMPLIANCE_WRITE_ROLES,
  ENGINEERS_READ_ROLES,
  HR_ROLES,
  MASTER_ROLES,
  PAYROLL_ROLES,
  SYSTEM_ROLES,
  USERS_ADMIN_ROLES,
  hasRole,
} from "@/lib/rbac-constants";

export * from "@/lib/rbac-constants";

export function isAppAdminRole(role: string | undefined | null): boolean {
  return hasRole(role, ADMIN_ROLES);
}

/**
 * Gate server action / page — throw jika role tidak diizinkan.
 */
export async function requireRoles(allowed: readonly string[]) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  if (!hasRole(session.user.role, allowed)) {
    throw new Error("Forbidden — role tidak diizinkan");
  }
  return session;
}

export async function requireSuperAdmin() {
  return requireRoles(USERS_ADMIN_ROLES);
}

export async function requireMasterAdmin() {
  return requireRoles(MASTER_ROLES);
}

export async function requireSystemAdmin() {
  return requireRoles(SYSTEM_ROLES);
}

export { ADMIN_ROLES, CONTRACT_ADMIN_ROLES };

/** Path prefix → role (referensi server). Middleware Edge punya mirror di auth.config. */
export const ADMIN_PATH_ROLE_RULES: {
  prefix: string;
  roles: readonly string[];
}[] = [
  { prefix: "/admin/users", roles: USERS_ADMIN_ROLES },
  { prefix: "/admin/tenants", roles: MASTER_ROLES },
  { prefix: "/admin/devices", roles: MASTER_ROLES },
  { prefix: "/admin/service-categories", roles: MASTER_ROLES },
  { prefix: "/admin/spareparts", roles: MASTER_ROLES },
  { prefix: "/admin/hr", roles: HR_ROLES },
  { prefix: "/admin/payroll", roles: PAYROLL_ROLES },
  { prefix: "/admin/integrations", roles: SYSTEM_ROLES },
  { prefix: "/admin/settings", roles: SYSTEM_ROLES },
  { prefix: "/admin/legal", roles: [...COMPLIANCE_WRITE_ROLES, "DISPATCHER"] },
  {
    prefix: "/admin/recruitment",
    roles: [...COMPLIANCE_WRITE_ROLES, "DISPATCHER"],
  },
  { prefix: "/admin/engineers", roles: ENGINEERS_READ_ROLES },
  { prefix: "/admin/kb", roles: ADMIN_ROLES },
  { prefix: "/admin/reports", roles: ADMIN_ROLES },
  { prefix: "/admin/fraud-center", roles: ADMIN_ROLES },
  { prefix: "/admin/leaderboard", roles: ADMIN_ROLES },
  { prefix: "/admin", roles: ADMIN_ROLES },
];

export function rolesForAdminPath(pathname: string): readonly string[] {
  for (const rule of ADMIN_PATH_ROLE_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(rule.prefix + "/")) {
      return rule.roles;
    }
  }
  return ADMIN_ROLES;
}
