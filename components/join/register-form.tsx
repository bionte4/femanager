"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MapPicker } from "@/components/map/map-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BANKS } from "@/lib/wallet-constants";
import { SERVICE_CATEGORY_SEED } from "@/lib/service-categories";
import { formatRupiah } from "@/lib/utils/rupiah";

const SKILL_OPTIONS = SERVICE_CATEGORY_SEED.map((c) => ({
  code: c.code,
  label: c.name,
  feeHint: formatRupiah(Math.max(c.base_fee_tier1, c.base_fee_tier3)),
}));
const ADVANCED_CERTS = [
  { id: "Mikrotik", label: "Mikrotik" },
  { id: "Fortigate", label: "Fortigate" },
  { id: "Cisco", label: "Cisco" },
] as const;
const EDUCATIONS = [
  "SMK_TKJ",
  "SMK_Lain",
  "D3_TI",
  "S1_TI",
  "SMA",
  "Lainnya",
] as const;

type FormState = {
  full_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  nik: string;
  address: string;
  province: string;
  city: string;
  district: string;
  lat: number | null;
  lng: number | null;
  education: string;
  school_name: string;
  has_motorcycle: boolean;
  has_toolkit: boolean;
  has_laptop: boolean;
  has_car: boolean;
  has_ladder: boolean;
  has_drill: boolean;
  skills: string[];
  experience_years: number;
  previous_vendor: string;
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
  id_card_photo_url: string;
  selfie_photo_url: string;
};

const INITIAL: FormState = {
  full_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  nik: "",
  address: "",
  province: "",
  city: "",
  district: "",
  lat: null,
  lng: null,
  education: "SMK_TKJ",
  school_name: "",
  has_motorcycle: false,
  has_toolkit: false,
  has_laptop: false,
  has_car: false,
  has_ladder: false,
  has_drill: false,
  skills: [],
  experience_years: 0,
  previous_vendor: "",
  bank_name: "",
  bank_account_no: "",
  bank_account_name: "",
  id_card_photo_url: "",
  selfie_photo_url: "",
};

export function JoinRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refId = searchParams.get("ref");

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [previewUrls, setPreviewUrls] = useState<{
    ktp?: string;
    selfie?: string;
  }>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const progress = useMemo(() => (step / 5) * 100, [step]);

  function patch(p: Partial<FormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function toggleSkill(s: string) {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(s)
        ? f.skills.filter((x) => x !== s)
        : [...f.skills, s],
    }));
  }

  async function uploadDoc(file: File, label: "ktp" | "selfie") {
    setUploading(label);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("label", label);
      const res = await fetch("/api/candidates/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Upload gagal");
      if (label === "ktp") {
        patch({ id_card_photo_url: json.url });
        setPreviewUrls((p) => ({
          ...p,
          ktp: (json.preview_url as string) || (json.url as string),
        }));
      } else {
        patch({ selfie_photo_url: json.url });
        setPreviewUrls((p) => ({
          ...p,
          selfie: (json.preview_url as string) || (json.url as string),
        }));
      }
      toast.success("Upload berhasil");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setUploading(null);
    }
  }

  function validateStep(): boolean {
    if (step === 1) {
      if (form.full_name.trim().length < 3) {
        toast.error("Nama minimal 3 karakter");
        return false;
      }
      if (form.phone.length < 10 || form.whatsapp.length < 10) {
        toast.error("HP / WA wajib diisi");
        return false;
      }
      if (!form.address || !form.province || !form.city || !form.district) {
        toast.error("Alamat lengkap wajib");
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!form.education) {
        toast.error("Pilih pendidikan");
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (form.skills.length === 0) {
        toast.error("Pilih minimal 1 skill");
        return false;
      }
      return true;
    }
    if (step === 4) {
      if (!form.id_card_photo_url || !form.selfie_photo_url) {
        toast.error("Upload KTP dan selfie+KTP wajib");
        return false;
      }
      return true;
    }
    return true;
  }

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch("/api/candidates/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          assigned_coordinator_id: refId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Gagal daftar");
      }
      router.push(`/join/success?id=${json.data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal daftar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6">
        <Link href="/join" className="text-sm text-emerald-700 hover:underline">
          ← Kembali
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Daftar FE Freelance</h1>
        <p className="text-sm text-muted-foreground">
          Step {step} dari 5
          {refId ? " · Referral koordinator aktif" : ""}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-emerald-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
        {step === 1 && (
          <>
            <div className="space-y-2">
              <Label>Nama lengkap</Label>
              <Input
                value={form.full_name}
                onChange={(e) => patch({ full_name: e.target.value })}
                placeholder="Budi Santoso"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>No. HP</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  placeholder="0812..."
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={form.whatsapp}
                  onChange={(e) => patch({ whatsapp: e.target.value })}
                  placeholder="0812..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email (opsional)</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>NIK / KTP (opsional)</Label>
              <Input
                value={form.nik}
                onChange={(e) => patch({ nik: e.target.value })}
                maxLength={16}
              />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input
                value={form.address}
                onChange={(e) => patch({ address: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Provinsi</Label>
                <Input
                  value={form.province}
                  onChange={(e) => patch({ province: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Kota</Label>
                <Input
                  value={form.city}
                  onChange={(e) => patch({ city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Kecamatan</Label>
                <Input
                  value={form.district}
                  onChange={(e) => patch({ district: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pin lokasi rumah</Label>
              <MapPicker
                lat={form.lat}
                lng={form.lng}
                onChange={({ lat, lng }) => patch({ lat, lng })}
                onAddressResolved={(r) =>
                  patch({
                    province: r.province || form.province,
                    city: r.city || form.city,
                    district: r.district || form.district,
                    address: r.address || form.address,
                  })
                }
                height="220px"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-2">
              <Label>Pendidikan</Label>
              <Select
                value={form.education}
                onValueChange={(v) => patch({ education: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATIONS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nama sekolah / kampus</Label>
              <Input
                value={form.school_name}
                onChange={(e) => patch({ school_name: e.target.value })}
                placeholder="SMK N 1 Jakarta"
              />
            </div>
            <label className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox
                checked={form.has_motorcycle}
                onCheckedChange={(c) => patch({ has_motorcycle: !!c })}
              />
              <span className="text-sm">Punya motor (wajib untuk lapangan)</span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox
                checked={form.has_toolkit}
                onCheckedChange={(c) => patch({ has_toolkit: !!c })}
              />
              <span className="text-sm">Punya toolkit dasar</span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox
                checked={form.has_laptop}
                onCheckedChange={(c) => patch({ has_laptop: !!c })}
              />
              <span className="text-sm">Punya laptop</span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox
                checked={form.has_car}
                onCheckedChange={(c) => patch({ has_car: !!c })}
              />
              <span className="text-sm">
                Punya kendaraan roda 4? (untuk bawa tangga CCTV)
              </span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox
                checked={form.has_ladder}
                onCheckedChange={(c) => patch({ has_ladder: !!c })}
              />
              <span className="text-sm">Punya tangga?</span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox
                checked={form.has_drill}
                onCheckedChange={(c) => patch({ has_drill: !!c })}
              />
              <span className="text-sm">Punya bor?</span>
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <Label>Skill kategori (centang yang dikuasai)</Label>
            <div className="space-y-2">
              {SKILL_OPTIONS.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => toggleSkill(s.code)}
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
                    form.skills.includes(s.code)
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "hover:border-emerald-400"
                  }`}
                >
                  <span>{s.label}</span>
                  <span
                    className={
                      form.skills.includes(s.code)
                        ? "text-emerald-100 text-xs"
                        : "text-muted-foreground text-xs"
                    }
                  >
                    Fee up to {s.feeHint}/job
                  </span>
                </button>
              ))}
            </div>
            <div className="pt-2">
              <Label className="text-violet-700">Sertifikasi tambahan</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {ADVANCED_CERTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSkill(s.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      form.skills.includes(s.id)
                        ? "border-violet-600 bg-violet-600 text-white"
                        : "border-violet-200 text-violet-800 hover:border-violet-400"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pengalaman (tahun)</Label>
              <Input
                type="number"
                min={0}
                max={40}
                value={form.experience_years}
                onChange={(e) =>
                  patch({ experience_years: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Vendor sebelumnya (opsional)</Label>
              <Input
                value={form.previous_vendor}
                onChange={(e) => patch({ previous_vendor: e.target.value })}
                placeholder="SSI, Mitracomm, ..."
              />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="space-y-2">
              <Label>Bank</Label>
              <Select
                value={form.bank_name || undefined}
                onValueChange={(v) => patch({ bank_name: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bank" />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>No. rekening</Label>
              <Input
                value={form.bank_account_no}
                onChange={(e) => patch({ bank_account_no: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama di rekening</Label>
              <Input
                value={form.bank_account_name}
                onChange={(e) => patch({ bank_account_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Foto KTP</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png"
                disabled={!!uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadDoc(f, "ktp");
                }}
              />
              {previewUrls.ktp && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrls.ktp}
                  alt="KTP"
                  className="mt-2 h-28 rounded-lg object-cover"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Selfie + KTP</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png"
                disabled={!!uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadDoc(f, "selfie");
                }}
              />
              {previewUrls.selfie && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrls.selfie}
                  alt="Selfie"
                  className="mt-2 h-28 rounded-lg object-cover"
                />
              )}
            </div>
          </>
        )}

        {step === 5 && (
          <div className="space-y-3 text-sm">
            <h2 className="text-base font-semibold">Review data</h2>
            <p>
              <strong>{form.full_name}</strong> · {form.phone}
            </p>
            <p>
              {form.address}, {form.district}, {form.city}, {form.province}
            </p>
            <p>
              Pendidikan: {form.education}
              {form.school_name ? ` · ${form.school_name}` : ""}
            </p>
            <p>
              Skill: {form.skills.join(", ")} · Exp {form.experience_years} th
            </p>
            <p>
              Motor: {form.has_motorcycle ? "Ya" : "Tidak"} · Toolkit:{" "}
              {form.has_toolkit ? "Ya" : "Tidak"} · Laptop:{" "}
              {form.has_laptop ? "Ya" : "Tidak"} · Mobil:{" "}
              {form.has_car ? "Ya" : "Tidak"} · Tangga:{" "}
              {form.has_ladder ? "Ya" : "Tidak"} · Bor:{" "}
              {form.has_drill ? "Ya" : "Tidak"}
            </p>
            <p>
              Bank: {form.bank_name || "—"} {form.bank_account_no}
            </p>
            <div className="flex gap-2">
              {previewUrls.ktp && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrls.ktp} alt="" className="h-20 rounded" />
              )}
              {previewUrls.selfie && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrls.selfie} alt="" className="h-20 rounded" />
              )}
            </div>
            <p className="text-muted-foreground">
              Dengan submit, data kamu akan ditinjau admin dalam 1×24 jam.
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep((s) => s - 1)}
              disabled={busy}
            >
              Kembali
            </Button>
          )}
          {step < 5 ? (
            <Button
              type="button"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                if (validateStep()) setStep((s) => s + 1);
              }}
            >
              Lanjut
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={busy}
              onClick={() => void submit()}
            >
              {busy ? "Mengirim…" : "Kirim Pendaftaran"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
