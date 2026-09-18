import { redirect } from "next/navigation";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { getWarRoomSnapshot } from "@/lib/war-room";
import { WarRoomClient } from "@/components/admin/war-room-client";

export default async function WarRoomPage() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const initial = await getWarRoomSnapshot();
  return <WarRoomClient initial={initial} />;
}
