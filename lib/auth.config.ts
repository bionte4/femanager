import type { NextAuthConfig } from "next-auth";

export const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "ADMIN_NOC",
  "DISPATCHER",
  "NOC_L0",
  "NOC_L1",
] as const;

/** Manage kontrak PKWT / klasifikasi kerja — bukan L0/Dispatcher */
export const CONTRACT_ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN_NOC"] as const;

/** Role yang boleh escalate L0 → L1 */
export const NOC_L0_ROLES = [
  "SUPER_ADMIN",
  "ADMIN_NOC",
  "DISPATCHER",
  "NOC_L0",
] as const;

/** Role yang handle antrian L1 (cek device + assign FE) */
export const NOC_L1_ROLES = [
  "SUPER_ADMIN",
  "ADMIN_NOC",
  "NOC_L1",
] as const;

function isAdminRole(role: string | undefined): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}

function rolesAllowedForAdminPath(pathname: string): readonly string[] {
  // Inline mirror of lib/rbac ADMIN_PATH_ROLE_RULES — Edge bundle tidak import Prisma/rbac server
  const USERS = ["SUPER_ADMIN"] as const;
  const MASTER = ["SUPER_ADMIN", "ADMIN_NOC"] as const;
  const SYSTEM = ["SUPER_ADMIN", "ADMIN_NOC"] as const;
  const ENGINEERS = [
    "SUPER_ADMIN",
    "ADMIN_NOC",
    "DISPATCHER",
    "NOC_L1",
  ] as const;
  const LEGAL = ["SUPER_ADMIN", "ADMIN_NOC", "DISPATCHER"] as const;

  const rules: { prefix: string; roles: readonly string[] }[] = [
    { prefix: "/admin/users", roles: USERS },
    { prefix: "/admin/tenants", roles: MASTER },
    { prefix: "/admin/devices", roles: MASTER },
    { prefix: "/admin/service-categories", roles: MASTER },
    { prefix: "/admin/spareparts", roles: MASTER },
    { prefix: "/admin/hr", roles: MASTER },
    { prefix: "/admin/payroll", roles: MASTER },
    { prefix: "/admin/integrations", roles: SYSTEM },
    { prefix: "/admin/settings", roles: SYSTEM },
    { prefix: "/admin/legal", roles: LEGAL },
    { prefix: "/admin/recruitment", roles: LEGAL },
    { prefix: "/admin/engineers", roles: ENGINEERS },
  ];

  for (const rule of rules) {
    if (pathname === rule.prefix || pathname.startsWith(rule.prefix + "/")) {
      return rule.roles;
    }
  }
  return ADMIN_ROLES;
}

/** Prefix API publik / non-session (punya auth sendiri) */
function isPublicApiPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/v1/external") ||
    pathname.startsWith("/api/candidates")
  );
}

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12,
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.phone = user.phone;
        token.partnership_status =
          (user as { partnership_status?: string }).partnership_status ??
          "NOT_SIGNED";
        token.engagement_type =
          (user as { engagement_type?: string }).engagement_type ?? "MITRA";
      }

      // Sync partnership dari DB saat login / session.update().
      // Jangan query Prisma di setiap request (middleware Edge tidak support Prisma).
      // Stale JWT (NOT_SIGNED) ditangani SyncPartnershipRedirect di /engineer/agreement.
      if ((trigger === "update" || trigger === "signIn") && token.id) {
        try {
          const { prisma } = await import("@/lib/prisma");
          const row = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              partnership_status: true,
              engagement_type: true,
              role: true,
            },
          });
          if (row) {
            token.partnership_status = row.partnership_status;
            token.engagement_type = row.engagement_type;
            token.role = row.role;
          }
        } catch {
          // biarkan token lama
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as import("@prisma/client").Role;
        session.user.phone = token.phone as string;
        session.user.partnership_status = (token.partnership_status as string) ??
          "NOT_SIGNED";
        session.user.engagement_type =
          (token.engagement_type as string) ?? "MITRA";
      }
      return session;
    },
    async authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role as string | undefined;

      if (pathname.startsWith("/login")) {
        if (!isLoggedIn) return true;
        if (isAdminRole(role)) {
          return Response.redirect(new URL("/admin/dashboard", request.url));
        }
        if (role === "FIELD_ENGINEER") {
          // Prefer tickets; layout DB akan kirim ke agreement jika belum signed
          return Response.redirect(
            new URL("/engineer/my-tickets", request.url)
          );
        }
        return true;
      }

      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) {
          return Response.redirect(new URL("/login", request.url));
        }
        if (!isAdminRole(role)) {
          return Response.redirect(
            new URL("/engineer/my-tickets", request.url)
          );
        }
        const allowed = rolesAllowedForAdminPath(pathname);
        if (!role || !(allowed as readonly string[]).includes(role)) {
          return Response.redirect(new URL("/admin/dashboard", request.url));
        }
        return true;
      }

      if (pathname.startsWith("/engineer")) {
        if (!isLoggedIn) {
          return Response.redirect(new URL("/login", request.url));
        }
        if (role !== "FIELD_ENGINEER") {
          return Response.redirect(new URL("/admin/dashboard", request.url));
        }
        // Partnership gate → app/engineer/layout.tsx (DB), bukan JWT di Edge
        return true;
      }

      if (pathname.startsWith("/coordinator")) {
        if (!isLoggedIn) {
          return Response.redirect(new URL("/login", request.url));
        }
        // Hanya FE koordinator (flag dicek di layout/page via DB)
        if (role !== "FIELD_ENGINEER") {
          return Response.redirect(new URL("/admin/dashboard", request.url));
        }
        return true;
      }

      // API: wajib session kecuali route publik / cron / webhook / external
      if (pathname.startsWith("/api")) {
        if (isPublicApiPath(pathname)) return true;
        return isLoggedIn;
      }

      return true;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
