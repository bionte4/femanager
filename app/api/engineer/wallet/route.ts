import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { getMyWallet } from "@/app/actions/wallet";

/**
 * GET /api/engineer/wallet — balance & transactions (Mitra only full; PKWT restricted)
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.FIELD_ENGINEER) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const data = await getMyWallet();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
