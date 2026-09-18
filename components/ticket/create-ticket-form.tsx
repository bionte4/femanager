"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CreditCard,
  Laptop,
  Loader2,
  Monitor,
  Printer,
  Router,
  Video,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { createTicketAction } from "@/app/actions/tickets";
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

const formSchema = z.object({
  tenant_id: z.string().min(1, "Tenant wajib"),
  service_category_id: z.string().min(1, "Kategori wajib"),
  service_package_id: z.string().optional().nullable(),
  device_id: z.string().optional().nullable(),
  type: z.enum(["INCIDENT", "PM", "CM"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string().min(5, "Deskripsi minimal 5 karakter"),
  reported_by: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

type TenantOption = { id: string; name: string; code: string };
type DeviceOption = {
  id: string;
  tenant_id: string;
  type: string;
  serial_number: string;
  service_category_id?: string | null;
};
type PackageOption = {
  id: string;
  name: string;
  description: string | null;
  price_customer: number;
  fee_engineer: number;
  estimated_duration: number;
  required_engineers: number;
};
type CategoryOption = {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  estimated_duration_minutes: number;
  packages: PackageOption[];
};

const ICON_MAP: Record<string, LucideIcon> = {
  CreditCard,
  Laptop,
  Monitor,
  Printer,
  Router,
  Video,
  Wifi,
};

type CreateTicketFormProps = {
  tenants: TenantOption[];
  devices: DeviceOption[];
  categories: CategoryOption[];
  onSuccess: (ticketId: string) => void;
};

export function CreateTicketForm({
  tenants,
  devices,
  categories,
  onSuccess,
}: CreateTicketFormProps) {
  const [step, setStep] = useState(1);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      tenant_id: "",
      service_category_id: "",
      service_package_id: "",
      device_id: "",
      type: "INCIDENT",
      priority: "MEDIUM",
      description: "",
      reported_by: "",
    },
  });

  const tenantId = watch("tenant_id");
  const categoryId = watch("service_category_id");
  const packageId = watch("service_package_id");

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId]
  );

  const filteredDevices = devices.filter(
    (d) =>
      d.tenant_id === tenantId &&
      (!categoryId || !d.service_category_id || d.service_category_id === categoryId)
  );

  const selectedPackage = selectedCategory?.packages.find(
    (p) => p.id === packageId
  );

  async function nextStep() {
    if (step === 1) {
      const ok = await trigger("tenant_id");
      if (ok) setStep(2);
      return;
    }
    if (step === 2) {
      const ok = await trigger("service_category_id");
      if (ok) setStep(3);
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    if (step === 4) {
      setStep(5);
    }
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await createTicketAction({
      ...values,
      device_id: values.device_id || null,
      service_package_id: values.service_package_id || null,
      reported_by: values.reported_by || null,
      source: "ADMIN",
      required_engineers: selectedPackage?.required_engineers,
    });
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    onSuccess(result.data!.id);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex gap-1 text-xs text-muted-foreground">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={cn(
              "rounded-full px-2 py-0.5",
              step === n && "bg-primary text-primary-foreground",
              step > n && "bg-muted"
            )}
          >
            {n}
          </span>
        ))}
        <span className="ml-auto">
          {step === 1 && "Tenant"}
          {step === 2 && "Kategori"}
          {step === 3 && "Paket"}
          {step === 4 && "Device"}
          {step === 5 && "Deskripsi"}
        </span>
      </div>

      {step === 1 && (
        <div className="space-y-1.5">
          <Label>Tenant</Label>
          <Controller
            control={control}
            name="tenant_id"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  setValue("device_id", "");
                }}
              >
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
      )}

      {step === 2 && (
        <div className="space-y-2">
          <Label>Service Category</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.map((cat) => {
              const Icon = (cat.icon && ICON_MAP[cat.icon]) || Monitor;
              const active = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setValue("service_category_id", cat.id, {
                      shouldValidate: true,
                    });
                    setValue("service_package_id", "");
                    setValue("device_id", "");
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:border-primary/40"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                      CATEGORY_COLORS[cat.code] ?? "bg-muted"
                    )}
                  >
                    <Icon className="mr-1 h-3 w-3" />
                    {cat.code}
                  </span>
                  <span className="text-sm font-medium leading-tight">
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ~{cat.estimated_duration_minutes} menit
                  </span>
                </button>
              );
            })}
          </div>
          {errors.service_category_id && (
            <p className="text-xs text-destructive">
              {errors.service_category_id.message}
            </p>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-2">
          <Label>Service Package (opsional)</Label>
          <Controller
            control={control}
            name="service_package_id"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(v) => {
                  const id = v === "none" ? "" : v;
                  field.onChange(id);
                  const pkg = selectedCategory?.packages.find((p) => p.id === id);
                  if (pkg) {
                    setValue(
                      "description",
                      pkg.description || pkg.name,
                      { shouldValidate: true }
                    );
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih paket atau lewati" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tanpa paket (custom) —</SelectItem>
                  {(selectedCategory?.packages ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {formatRupiah(p.fee_engineer)} FE
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {selectedPackage && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Customer {formatRupiah(selectedPackage.price_customer)} · FE fee{" "}
              {formatRupiah(selectedPackage.fee_engineer)} · ~
              {selectedPackage.estimated_duration} mnt
              {selectedPackage.required_engineers > 1
                ? ` · ${selectedPackage.required_engineers} engineer`
                : ""}
            </p>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-1.5">
          <Label>Device (opsional, filter kategori)</Label>
          <Controller
            control={control}
            name="device_id"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                disabled={!tenantId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tanpa device —</SelectItem>
                  {filteredDevices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.type} · {d.serial_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      {step === 5 && (
        <>
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
                      <SelectItem value="INCIDENT">Incident</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                      <SelectItem value="CM">CM</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Deskripsi keluhan</Label>
            <textarea
              id="description"
              className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reported_by">Reported by</Label>
            <Input id="reported_by" {...register("reported_by")} />
          </div>
        </>
      )}

      {serverError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="flex gap-2">
        {step > 1 && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => setStep((s) => s - 1)}
          >
            Kembali
          </Button>
        )}
        {step < 5 ? (
          <Button type="button" className="flex-1" onClick={nextStep}>
            Lanjut
          </Button>
        ) : (
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            Buat Ticket
          </Button>
        )}
      </div>
    </form>
  );
}
