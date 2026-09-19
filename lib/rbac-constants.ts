/** Konstanta RBAC — aman diimpor client & server (tanpa auth/prisma). */

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

export const APP_ADMIN_ROLES = [
  "SUPER_ADMIN",
  "ADMIN_NOC",
  "DISPATCHER",
  "NOC_L0",
  "NOC_L1",
] as const;

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
