import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Auth gate (login/role) di Edge.
 * Partnership SIGNED dicek di layout engineer via DB — bukan JWT di sini
 * (JWT stale bikin loop /agreement kosong + sync lama).
 */
export default auth((req) => {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  matcher: ["/admin/:path*", "/engineer/:path*", "/coordinator/:path*", "/login"],
};
