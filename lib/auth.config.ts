import type { NextAuthConfig } from "next-auth";

export const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "ADMIN_NOC",
  "DISPATCHER",
  "NOC_L0",
  "NOC_L1",
] as const;

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
      }
      // Refresh partnership dari DB saja — JANGAN percaya payload client
      // (session.update({ partnership_status: "SIGNED" }) tidak boleh bypass gate)
      if (trigger === "update" && token.id) {
        const { prisma } = await import("@/lib/prisma");
        const row = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { partnership_status: true },
        });
        if (row) {
          token.partnership_status = row.partnership_status;
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
      }
      return session;
    },
    async authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role as string | undefined;
      const partnership =
        (auth?.user as { partnership_status?: string } | undefined)
          ?.partnership_status ?? "NOT_SIGNED";

      if (pathname.startsWith("/login")) {
        if (!isLoggedIn) return true;
        if (isAdminRole(role)) {
          return Response.redirect(new URL("/admin/dashboard", request.url));
        }
        if (role === "FIELD_ENGINEER") {
          if (partnership !== "SIGNED") {
            return Response.redirect(
              new URL("/engineer/agreement", request.url)
            );
          }
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
        // Gate kemitraan: semua route engineer kecuali /agreement
        if (
          partnership !== "SIGNED" &&
          !pathname.startsWith("/engineer/agreement")
        ) {
          return Response.redirect(
            new URL("/engineer/agreement", request.url)
          );
        }
        // Signed user boleh akses ?view=1 di agreement
        return true;
      }

      if (pathname.startsWith("/coordinator")) {
        if (!isLoggedIn) {
          return Response.redirect(new URL("/login", request.url));
        }
        return true;
      }

      return true;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
