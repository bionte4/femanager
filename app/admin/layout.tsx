import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { NotificationBell } from "@/components/admin/notification-bell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <AdminSidebar
        userName={session.user.name ?? "Admin"}
        userRole={session.user.role}
      />
      <div className="lg:pl-[220px]">
        <header className="sticky top-0 z-30 hidden h-12 items-center justify-end border-b border-border/60 bg-background/90 px-6 backdrop-blur lg:flex">
          <NotificationBell />
        </header>
        <main className="min-h-screen px-4 pb-6 pt-14 lg:px-6 lg:pt-4">
          {children}
        </main>
      </div>
    </div>
  );
}
