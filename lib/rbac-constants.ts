/** Konstanta RBAC — aman diimpor client, server, & Edge (tanpa auth/prisma). */

export const USERS_ADMIN_ROLES = ["SUPER_ADMIN"] as const;

export const MASTER_ROLES = ["SUPER_ADMIN", "ADMIN_NOC"] as const;

export const PAYROLL_ROLES = ["SUPER_ADMIN", "ADMIN_NOC"] as const;

export const HR_ROLES = ["SUPER_ADMIN", "ADMIN_NOC"] as const;

export const SYSTEM_ROLES = ["SUPER_ADMIN", "ADMIN_NOC"] as const;

export const ENGINEERS_WRITE_ROLES = ["SUPER_ADMIN", "ADMIN_NOC"] as const;

export const ENGINEERS_READ_ROLES = [
  "SUPER_ADMIN",
  "ADMIN_NOC",
  "DISPATCHER",
  "NOC_L1",
] as const;

export const COMPLIANCE_WRITE_ROLES = ["SUPER_ADMIN", "ADMIN_NOC"] as const;

/** Semua role admin app (mirror auth) */
export const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "ADMIN_NOC",
  "DISPATCHER",
  "NOC_L0",
  "NOC_L1",
] as const;

export const APP_ADMIN_ROLES = ADMIN_ROLES;

export const CONTRACT_ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN_NOC"] as const;

export type AppAdminRole = (typeof APP_ADMIN_ROLES)[number];

export const APP_ADMIN_ROLE_OPTIONS: {
  value: AppAdminRole;
  label: string;
}[] = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN_NOC", label: "Admin NOC" },
  { value: "DISPATCHER", label: "Dispatcher" },
  { value: "NOC_L0", label: "NOC L0" },
  { value: "NOC_L1", label: "NOC L1" },
];

export function hasRole(
  role: string | undefined | null,
  allowed: readonly string[]
): boolean {
  return !!role && (allowed as readonly string[]).includes(role);
}

export function isAssignableAdminRole(role: string): role is AppAdminRole {
  return (APP_ADMIN_ROLES as readonly string[]).includes(role);
}

/** Single source of truth — dipakai middleware Edge + lib/rbac server */
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
  { prefix: "/admin/fraud-center", roles: MASTER_ROLES },
  {
    prefix: "/admin/legal",
    roles: [...COMPLIANCE_WRITE_ROLES, "DISPATCHER"],
  },
  {
    prefix: "/admin/recruitment",
    roles: [...COMPLIANCE_WRITE_ROLES, "DISPATCHER"],
  },
  { prefix: "/admin/engineers", roles: ENGINEERS_READ_ROLES },
  { prefix: "/admin/kb", roles: ADMIN_ROLES },
  { prefix: "/admin/reports", roles: ADMIN_ROLES },
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
