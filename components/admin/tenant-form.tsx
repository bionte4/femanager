"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  tenantSchema,
  type TenantInput,
} from "@/lib/validations/master";
import { createTenant, updateTenant } from "@/app/actions/tenants";
import { MapPicker } from "@/components/map/map-picker";
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
import { Checkbox } from "@/components/ui/checkbox";

const SLA_TIERS = [
  { value: "TIER1_JABODETABEK", label: "Tier 1 — Jabodetabek" },
  { value: "TIER2_PROVINCE", label: "Tier 2 — Provinsi" },
  { value: "TIER3_KABUPATEN", label: "Tier 3 — Kabupaten" },
] as const;

type TenantFormProps = {
  initial?: Partial<TenantInput> & { id?: string };
  onSuccess: () => void;
};

export function TenantForm({ initial, onSuccess }: TenantFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!initial?.id;

  const form = useForm<TenantInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(tenantSchema) as any,
    defaultValues: {
      name: initial?.name ?? "",
      code: initial?.code ?? "",
      address: initial?.address ?? "",
      province: initial?.province ?? "DKI Jakarta",
      city: initial?.city ?? "Jakarta Pusat",
      district: initial?.district ?? "",
      sub_district: initial?.sub_district ?? "",
      lat: initial?.lat ?? -6.2088,
      lng: initial?.lng ?? 106.8456,
      pic_name: initial?.pic_name ?? "",
      pic_phone: initial?.pic_phone ?? "",
      sla_tier: initial?.sla_tier ?? "TIER1_JABODETABEK",
      is_active: initial?.is_active ?? true,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const lat = watch("lat");
  const lng = watch("lng");

  async function onSubmit(values: TenantInput) {
    setServerError(null);
    const result = isEdit
      ? await updateTenant(initial!.id!, values)
      : await createTenant(values);

    if (!result.success) {
      setServerError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nama Tenant</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code">Kode</Label>
          <Input
            id="code"
            placeholder="BRI-JKT-001"
            className="font-mono uppercase"
            {...register("code", {
              setValueAs: (v: string) => v?.toUpperCase?.() ?? v,
            })}
          />
          <p className="text-[11px] text-muted-foreground">
            Format: CLIENT-CITY-### · contoh BRI-JKT-001
          </p>
          {errors.code && (
            <p className="text-xs text-destructive">{errors.code.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Lokasi di Peta</Label>
        <MapPicker
          lat={lat}
          lng={lng}
          onChange={({ lat: nextLat, lng: nextLng }) => {
            setValue("lat", nextLat, { shouldValidate: true });
            setValue("lng", nextLng, { shouldValidate: true });
          }}
          onAddressResolved={(addr) => {
            setValue("province", addr.province);
            setValue("city", addr.city);
            setValue("district", addr.district);
            setValue("sub_district", addr.sub_district);
            if (!watch("address")) setValue("address", addr.address);
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Alamat</Label>
        <Input id="address" {...register("address")} />
        {errors.address && (
          <p className="text-xs text-destructive">{errors.address.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="province">Provinsi</Label>
          <Input id="province" {...register("province")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">Kota</Label>
          <Input id="city" {...register("city")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="district">Kecamatan</Label>
          <Input id="district" {...register("district")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sub_district">Kelurahan</Label>
          <Input id="sub_district" {...register("sub_district")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pic_name">PIC Nama</Label>
          <Input id="pic_name" {...register("pic_name")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pic_phone">PIC Phone</Label>
          <Input id="pic_phone" {...register("pic_phone")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>SLA Tier</Label>
          <Controller
            control={control}
            name="sla_tier"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLA_TIERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex items-end gap-2 pb-2">
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <>
                <Checkbox
                  id="is_active"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                <Label htmlFor="is_active">Aktif</Label>
              </>
            )}
          />
        </div>
      </div>

      {serverError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        {isEdit ? "Simpan Perubahan" : "Tambah Tenant"}
      </Button>
    </form>
  );
}
