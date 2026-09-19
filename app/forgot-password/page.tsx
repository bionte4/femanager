import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = {
  title: "Lupa Password | FE-Track",
  description: "Reset password via OTP WhatsApp atau Telegram",
};

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0b1f1a]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% -10%, rgba(45, 212, 160, 0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(14, 116, 144, 0.35), transparent), linear-gradient(165deg, #0b1f1a 0%, #122a24 45%, #0a1628 100%)",
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col justify-center px-5 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <p className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-white">
              FE-Track
            </p>
            <p className="mt-2 text-sm text-emerald-100/70">
              Reset password dengan kode OTP WhatsApp atau Telegram
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/95 p-6 shadow-2xl shadow-black/30 sm:p-8">
            <h1 className="mb-1 text-xl font-semibold text-foreground">
              Lupa password
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Masukkan nomor HP akun, lalu pilih kirim OTP via WhatsApp atau
              Telegram.
            </p>
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
