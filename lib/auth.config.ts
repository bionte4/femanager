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
