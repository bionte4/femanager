import { NextRequest, NextResponse } from "next/server";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { runAntiFraudCheck } from "@/lib/antifraud";

type Ctx = { params: Promise<{ ticketId: string }> | { ticketId: string } };

/**
 * POST /api/fraud/check/:ticketId — trigger manual anti-fraud (admin only)
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await auth();
    if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { ticketId } = await Promise.resolve(ctx.params);
    if (!ticketId) {
      return NextResponse.json({ success: false, error: "ticketId wajib" }, { status: 400 });
    }

    const result = await runAntiFraudCheck(ticketId);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Check gagal" },
      { status: 500 }
    );
  }
}
