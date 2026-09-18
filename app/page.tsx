import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth, ADMIN_ROLES } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if ((ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/admin/dashboard");
  }

  if (session.user.role === Role.FIELD_ENGINEER) {
    redirect("/engineer/my-tickets");
  }

  redirect("/login");
}
