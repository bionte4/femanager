import {
  ADMIN_ROLES,
  CONTRACT_ADMIN_ROLES,
  ADMIN_PATH_ROLE_RULES,
  rolesForAdminPath,
  MASTER_ROLES,
  SYSTEM_ROLES,
  USERS_ADMIN_ROLES,
  hasRole,
} from "@/lib/rbac-constants";
import { requireActiveSession } from "@/lib/session-guard";

export * from "@/lib/rbac-constants";

export function isAppAdminRole(role: string | undefined | null): boolean {
  return hasRole(role, ADMIN_ROLES);
}

/**
 * Gate server action / page — throw jika role tidak diizinkan.
 * Juga reject akun suspended & sync role dari DB.
 */
export async function requireRoles(allowed: readonly string[]) {
  const session = await requireActiveSession();
  if (!hasRole(session.user.role, allowed)) {
    throw new Error("Forbidden — role tidak diizinkan");
  }
  return session;
}

/** Semua role admin app (SUPER_ADMIN … NOC_L1) + session aktif */
export async function requireAppAdmin() {
  return requireRoles(ADMIN_ROLES);
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

export { ADMIN_ROLES, CONTRACT_ADMIN_ROLES, ADMIN_PATH_ROLE_RULES, rolesForAdminPath };
