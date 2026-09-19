"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { engineerSchema, type EngineerInput } from "@/lib/validations/master";
import { createEngineer, updateEngineer } from "@/app/actions/engineers";
import { MapPicker } from "@/components/map/map-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SKILLS = [
  "EDC",
  "SDWAN",
  "DESKTOP",
  "LAPTOP",
  "WIFI",
  "CCTV",
  "PRINTER",
] as const;
const STATUSES = [
  { value: "AVAILABLE", label: "Available" },
  { value: "BUSY", label: "Busy" },
  { value: "OFFLINE", label: "Offline" },
] as const;

const createSchema = engineerSchema.extend({
  password: z.string().min(6, "Password minimal 6 karakter"),
});

const editSchema = engineerSchema.extend({
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 6, "Password minimal 6 karakter"),
});

type EngineerFormProps = {
  initial?: Partial<EngineerInput> & { id?: string };
  onSuccess: () => void;
};

export function EngineerForm({ initial, onSuccess }: EngineerFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!initial?.id;

  const form = useForm<EngineerInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(isEdit ? editSchema : createSchema) as any,
    defaultValues: {
      full_name: initial?.full_name ?? "",
      phone: initial?.phone ?? "",
      password: "",
      city: initial?.city ?? "",
      district: initial?.district ?? "",
      lat: initial?.lat ?? -6.2088,
      lng: initial?.lng ?? 106.8456,
      skills: initial?.skills ?? ["EDC"],
      status: initial?.status ?? "AVAILABLE",
      telegram_chat_id: initial?.telegram_chat_id ?? "",
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
  const skills = watch("skills");

  async function onSubmit(values: EngineerInput) {
    setServerError(null);
    const payload = { ...values };
    if (isEdit && !payload.password) {
      delete payload.password;
    }

    const result = isEdit
      ? await updateEngineer(initial!.id!, payload)
      : await createEngineer(payload);

    if (!result.success) {
      setServerError(result.error);
      return;
    }
    onSuccess();
  }

  function toggleSkill(skill: (typeof SKILLS)[number], checked: boolean) {
    const next = checked
      ? Array.from(new Set([...skills, skill]))
      : skills.filter((s) => s !== skill);
    setValue("skills", next as EngineerInput["skills"], { shouldValidate: true });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Nama Lengkap</Label>
          <Input id="full_name" {...register("full_name")} />
          {errors.full_name && (
            <p className="text-xs text-destructive">{errors.full_name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Nomor HP</Label>
          <Input id="phone" placeholder="08xxxxxxxxxx" {...register("phone")} />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">
          {isEdit ? "Reset password" : "Password"}{" "}
          {isEdit && (
            <span className="font-normal text-muted-foreground">
              (isi untuk ganti; kosongkan = tidak diubah)
            </span>
          )}
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder={isEdit ? "Password baru (opsional)" : "Minimal 6 karakter"}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Home Base (peta)</Label>
        <MapPicker
          lat={lat}
          lng={lng}
          onChange={({ lat: nextLat, lng: nextLng }) => {
            setValue("lat", nextLat, { shouldValidate: true });
            setValue("lng", nextLng, { shouldValidate: true });
          }}
          onAddressResolved={(addr) => {
            setValue("city", addr.city);
            setValue("district", addr.district);
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="city">Kota</Label>
          <Input id="city" {...register("city")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="district">Kecamatan</Label>
          <Input id="district" {...register("district")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Skills</Label>
        <div className="flex flex-wrap gap-4">
          {SKILLS.map((skill) => (
            <label key={skill} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={skills.includes(skill)}
                onCheckedChange={(v) => toggleSkill(skill, v === true)}
              />
              {skill}
            </label>
          ))}
        </div>
        {errors.skills && (
          <p className="text-xs text-destructive">{errors.skills.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="telegram_chat_id">Telegram Chat ID (opsional)</Label>
        <Input
          id="telegram_chat_id"
          placeholder="123456789 — untuk notifikasi/OTP gratis"
          {...register("telegram_chat_id")}
        />
        <p className="text-[11px] text-muted-foreground">
          Engineer chat bot FE-Track, lalu isi chat_id dari getUpdates.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Status</Label>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {serverError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        {isEdit ? "Simpan Perubahan" : "Tambah Engineer"}
      </Button>
    </form>
  );
}
