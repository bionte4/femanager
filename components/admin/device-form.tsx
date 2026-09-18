"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { deviceSchema, type DeviceInput } from "@/lib/validations/master";
import { createDevice, updateDevice } from "@/app/actions/devices";
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

const DEVICE_TYPES = [
  { value: "EDC_BCA", label: "EDC BCA" },
  { value: "EDC_BRI", label: "EDC BRI" },
  { value: "ROUTER", label: "Router" },
  { value: "SWITCH", label: "Switch" },
] as const;

const DEVICE_STATUSES = [
  { value: "UP", label: "UP" },
  { value: "DOWN", label: "DOWN" },
  { value: "MAINTENANCE", label: "Maintenance" },
] as const;

type TenantOption = { id: string; name: string; code: string };

type DeviceFormProps = {
  tenants: TenantOption[];
  initial?: Partial<DeviceInput> & { id?: string };
  onSuccess: () => void;
};

export function DeviceForm({ tenants, initial, onSuccess }: DeviceFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!initial?.id;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DeviceInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(deviceSchema) as any,
    defaultValues: {
      tenant_id: initial?.tenant_id ?? "",
      type: initial?.type ?? "EDC_BCA",
      brand: initial?.brand ?? "",
      serial_number: initial?.serial_number ?? "",
      ip_address: initial?.ip_address ?? "",
      status: initial?.status ?? "UP",
    },
  });

  async function onSubmit(values: DeviceInput) {
    setServerError(null);
    const result = isEdit
      ? await updateDevice(initial!.id!, values)
      : await createDevice(values);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Tenant</Label>
        <Controller
          control={control}
          name="tenant_id"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.code} — {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.tenant_id && (
          <p className="text-xs text-destructive">{errors.tenant_id.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tipe</Label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
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
                  {DEVICE_STATUSES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="serial_number">Serial Number</Label>
        <Input id="serial_number" {...register("serial_number")} />
        {errors.serial_number && (
          <p className="text-xs text-destructive">{errors.serial_number.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" {...register("brand")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ip_address">IP Address</Label>
          <Input id="ip_address" placeholder="10.10.0.1" {...register("ip_address")} />
        </div>
      </div>

      {serverError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        {isEdit ? "Simpan Perubahan" : "Tambah Device"}
      </Button>
    </form>
  );
}
