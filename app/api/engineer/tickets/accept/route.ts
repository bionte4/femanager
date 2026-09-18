import { NextRequest, NextResponse } from "next/server";
import { acceptJobAction, rejectJobAction } from "@/app/actions/job-response";

/**
 * POST /api/engineer/tickets/accept
 * Body: { ticket_id } — cek partnership_status SIGNED di action
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === "reject") {
      const res = await rejectJobAction({
        ticket_id: body.ticket_id,
        reason: body.reason || "Lainnya",
        notes: body.notes,
      });
      if (!res.success) {
        return NextResponse.json(res, { status: 400 });
      }
      return NextResponse.json(res);
    }

    const res = await acceptJobAction(body.ticket_id);
    if (!res.success) {
      return NextResponse.json(res, {
        status: res.error?.includes("perjanjian") ? 403 : 400,
      });
    }
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
