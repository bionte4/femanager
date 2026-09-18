"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Laptop,
  Monitor,
  Printer,
  Router,
  Video,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { submitPublicOrderAction } from "@/app/actions/public-order";
import { CATEGORY_COLORS } from "@/lib/service-categories";
import { formatRupiah } from "@/lib/utils/rupiah";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  CreditCard,
  Laptop,
  Monitor,
  Printer,
  Router,
  Video,
  Wifi,
};

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  price_customer: number;
  fee_engineer: number;
};
type Cat = {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  packages: Pkg[];
};

export function PublicOrderForm({ categories }: { categories: Cat[] }) {
  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ticketNo, setTicketNo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const category = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId]
  );

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("label", "public-order");
      const res = await fetch("/api/candidates/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Upload gagal");
      setPhotoUrl(json.url);
      toast.success("Foto terupload");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    startTransition(async () => {
      const res = await submitPublicOrderAction({
        service_category_id: categoryId,
        service_package_id: packageId || null,
        customer_name: name,
        customer_phone: phone,
        address,
        city,
        description,
        photo_url: photoUrl,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setTicketNo(res.ticket_no ?? null);
      toast.success("Order berhasil dikirim");
    });
  }

  if (ticketNo) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
        <p className="text-lg font-semibold text-emerald-700">Order diterima!</p>
        <p className="mt-2 font-mono text-2xl font-bold">{ticketNo}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Admin akan approve &amp; dispatch teknisi. Kami hubungi via WA{" "}
          {phone}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
      <p className="text-xs text-muted-foreground">Step {step} / 3</p>

      {step === 1 && (
        <div className="space-y-3">
          <Label>Pilih kategori</Label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((c) => {
              const Icon = (c.icon && ICON_MAP[c.icon]) || Monitor;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(c.id);
                    setPackageId("");
                  }}
                  className={cn(
                    "rounded-lg border p-3 text-left",
                    categoryId === c.id && "border-primary ring-1 ring-primary"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-1.5 text-[10px] font-semibold",
                      CATEGORY_COLORS[c.code]
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {c.code}
                  </span>
                  <p className="mt-1 text-sm font-medium">{c.name}</p>
                </button>
              );
            })}
          </div>
          {category && category.packages.length > 0 && (
            <div className="space-y-1.5">
              <Label>Paket (opsional)</Label>
              <Select
                value={packageId || "none"}
                onValueChange={(v) => {
                  const id = v === "none" ? "" : v;
                  setPackageId(id);
                  const pkg = category.packages.find((p) => p.id === id);
                  if (pkg) setDescription(pkg.description || pkg.name);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih paket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Custom —</SelectItem>
                  {category.packages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {formatRupiah(p.price_customer)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            className="w-full"
            disabled={!categoryId}
            onClick={() => setStep(2)}
          >
            Lanjut
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nama</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>WhatsApp</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
            />
          </div>
          <div className="space-y-1">
            <Label>Alamat lengkap</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Kota</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              Kembali
            </Button>
            <Button
              className="flex-1"
              disabled={!name || phone.length < 10 || !address}
              onClick={() => setStep(3)}
            >
              Lanjut
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Deskripsi keluhan</Label>
            <textarea
              className="min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Foto kerusakan (opsional)</Label>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadPhoto(f);
              }}
            />
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className="mt-2 h-24 rounded border object-cover"
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep(2)}
            >
              Kembali
            </Button>
            <Button
              className="flex-1"
              disabled={pending || description.length < 10}
              onClick={submit}
            >
              Kirim Order
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
