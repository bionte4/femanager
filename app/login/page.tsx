import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Login | FE-Track",
  description:
    "Platform penugasan field engineer untuk pemenuhan SLA se-Indonesia",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    if ((ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
      redirect("/admin/dashboard");
    }
    if (session.user.role === Role.FIELD_ENGINEER) {
      redirect("/engineer/my-tickets");
    }
  }

  return (
    <div className="relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#0b1f1a]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% -10%, rgba(45, 212, 160, 0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(14, 116, 144, 0.35), transparent), linear-gradient(165deg, #0b1f1a 0%, #122a24 45%, #0a1628 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center px-5 py-4 sm:px-8 sm:py-6">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-4 animate-in fade-in slide-in-from-bottom-3 duration-500 sm:mb-5">
            <p className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-white sm:text-5xl">
              FE-Track
            </p>
            <p className="mt-1.5 max-w-sm text-sm leading-snug text-emerald-100/70 sm:text-[15px]">
              Platform penugasan field engineer untuk pemenuhan SLA se-Indonesia.
            </p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-white/10 bg-white/95 p-4 shadow-2xl shadow-black/30 duration-500 sm:p-6">
            <div className="mb-4">
              <h1 className="text-lg font-semibold text-foreground">Masuk</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Pakai nomor HP & password akun kamu
              </p>
            </div>

            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
