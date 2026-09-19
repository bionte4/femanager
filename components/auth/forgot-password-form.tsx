"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Phone, Lock, KeyRound, ArrowLeft } from "lucide-react";
import {
  requestPasswordOtpAction,
  resetPasswordWithOtpAction,
} from "@/app/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "phone" | "reset";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugCode, setDebugCode] = useState<string | null>(null);

  async function onRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDebugCode(null);
    setLoading(true);
    try {
      const res = await requestPasswordOtpAction({ phone: phone.trim() });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setMessage(res.message ?? "OTP dikirim.");
      if (res.debug_code) setDebugCode(res.debug_code);
      setStep("reset");
    } finally {
      setLoading(false);
    }
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await resetPasswordWithOtpAction({
        phone: phone.trim(),
        code: code.trim(),
        new_password: password,
        confirm_password: confirm,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setMessage(res.message ?? "Berhasil.");
      setTimeout(() => router.replace("/login"), 1200);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {step === "phone" ? (
        <form onSubmit={onRequestOtp} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="phone">Nomor HP terdaftar</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="08xxxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Kode OTP dikirim via WhatsApp ke nomor akun.
            </p>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Mengirim...
              </>
            ) : (
              "Kirim OTP WhatsApp"
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={onReset} className="space-y-5">
          <p className="text-sm text-muted-foreground">
            OTP dikirim ke <span className="font-medium text-foreground">{phone}</span>
          </p>

          <div className="space-y-2">
            <Label htmlFor="code">Kode OTP</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="code"
                inputMode="numeric"
                placeholder="6 digit"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="pl-10 tracking-widest"
                maxLength={6}
                required
              />
            </div>
            {debugCode && (
              <p className="text-xs text-amber-600">Debug OTP: {debugCode}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password baru</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Ulangi password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800">
              {message}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan password baru"
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={loading}
            onClick={() => {
              setStep("phone");
              setCode("");
              setPassword("");
              setConfirm("");
              setError(null);
              setMessage(null);
            }}
          >
            Kirim ulang OTP
          </Button>
        </form>
      )}

      <Button asChild variant="link" className="w-full text-muted-foreground">
        <Link href="/login">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Kembali ke login
        </Link>
      </Button>
    </div>
  );
}
