import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Login | FE-Track",
  description: "Masuk ke FE-Track Field Engineer Dispatch",
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0b1f1a]">
      {/* Atmosphere */}
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

      <div className="relative z-10 flex flex-1 flex-col justify-center px-5 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-md">
          {/* Brand hero */}
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-3 duration-700">
            <p className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight text-white sm:text-6xl">
              FE-Track
            </p>
            <p className="mt-3 max-w-sm text-base leading-relaxed text-emerald-100/70">
              Dispatch field engineer. Jaga SLA toko se-Indonesia tetap meet.
            </p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-white/10 bg-white/95 p-6 shadow-2xl shadow-black/30 duration-700 delay-100 sm:p-8">
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-foreground">Masuk</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Pakai nomor HP & password akun kamu
              </p>
            </div>

            <LoginForm />

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Demo admin: 081111111111 · Engineer: 081222222221 · pass:
              password123
            </p>
          </div>
        </div>
      </div>

      <footer className="relative z-10 pb-6 text-center text-xs text-emerald-100/40">
        Field Engineer Dispatch & SLA Platform
      </footer>
    </div>
  );
}
