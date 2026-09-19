"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deviceSchema, type DeviceInput } from "@/lib/validations/master";
import {
  EXCEL_IMPORT_MAX_ROWS,
  normalizeExcelHeaders,
} from "@/lib/excel";
import {
  deviceExcelRowSchema,
  type DevicePreviewRow,
} from "@/lib/validations/device-excel";
import { requireMasterAdmin } from "@/lib/rbac";

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function getDevices(params: {
  q?: string;
  tenant_id?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireMasterAdmin();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params.pageSize ?? 10));
  const q = params.q?.trim();

  const where: Prisma.DeviceWhereInput = {
    AND: [
      params.tenant_id ? { tenant_id: params.tenant_id } : {},
      q
        ? {
            OR: [
              { serial_number: { contains: q, mode: "insensitive" } },
              { brand: { contains: q, mode: "insensitive" } },
              { ip_address: { contains: q, mode: "insensitive" } },
              { tenant: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };

  const [total, items] = await Promise.all([
    prisma.device.count({ where }),
    prisma.device.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        tenant: { select: { id: true, name: true, code: true } },
      },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function createDevice(input: DeviceInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireMasterAdmin();
    const data = deviceSchema.parse(input);

    const existing = await prisma.device.findUnique({
      where: { serial_number: data.serial_number },
    });
    if (existing) {
      return { success: false, error: "Serial number sudah terdaftar" };
    }

    const categoryFromType =
      data.device_category ??
      (data.type === "ROUTER_SDWAN"
        ? "ROUTER_SDWAN"
        : data.type === "SWITCH"
          ? "SWITCH"
          : data.type === "ROUTER"
            ? "ACCESS_POINT"
            : "EDC");

    const device = await prisma.device.create({
      data: {
        tenant_id: data.tenant_id,
        type: data.type,
        device_category: categoryFromType,
        brand: data.brand || null,
        serial_number: data.serial_number,
        ip_address: data.ip_address || null,
        status: data.status,
        last_check_at: new Date(),
      },
    });

    revalidatePath("/admin/devices");
    return { success: true, data: { id: device.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal membuat device" };
  }
}

export async function updateDevice(id: string, input: DeviceInput): Promise<ActionResult> {
  try {
    await requireMasterAdmin();
    const data = deviceSchema.parse(input);

    const conflict = await prisma.device.findFirst({
      where: { serial_number: data.serial_number, NOT: { id } },
    });
    if (conflict) {
      return { success: false, error: "Serial number sudah terdaftar" };
    }

    await prisma.device.update({
      where: { id },
      data: {
        tenant_id: data.tenant_id,
        type: data.type,
        device_category:
          data.device_category ??
          (data.type === "ROUTER_SDWAN"
            ? "ROUTER_SDWAN"
            : data.type === "SWITCH"
              ? "SWITCH"
              : data.type === "ROUTER"
                ? "ACCESS_POINT"
                : "EDC"),
        brand: data.brand || null,
        serial_number: data.serial_number,
        ip_address: data.ip_address || null,
        status: data.status,
      },
    });

    revalidatePath("/admin/devices");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal update device" };
  }
}

export async function deleteDevice(id: string): Promise<ActionResult> {
  try {
    await requireMasterAdmin();
    await prisma.device.delete({ where: { id } });
    revalidatePath("/admin/devices");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal hapus device" };
  }
}

function categoryFromType(type: string): "EDC" | "ROUTER_SDWAN" | "SWITCH" | "ACCESS_POINT" | "SERVER" {
  if (type === "ROUTER_SDWAN") return "ROUTER_SDWAN";
  if (type === "SWITCH") return "SWITCH";
  if (type === "ROUTER") return "ACCESS_POINT";
  return "EDC";
}

export async function getDevicesForExport() {
  await requireMasterAdmin();
  const rows = await prisma.device.findMany({
    orderBy: { serial_number: "asc" },
    take: 5000,
    include: {
      tenant: { select: { code: true } },
      service_category: { select: { code: true } },
    },
  });
  return rows.map((d) => ({
    serial_number: d.serial_number,
    tenant_code: d.tenant.code,
    type: d.type,
    device_category: d.device_category,
    brand: d.brand ?? "",
    model: d.model ?? "",
    ip_address: d.ip_address ?? "",
    status: d.status,
    service_category_code: d.service_category?.code ?? "",
  }));
}

export async function previewDevicesImport(
  rawRows: Record<string, unknown>[]
): Promise<
  ActionResult<{ rows: DevicePreviewRow[]; okCount: number; errorCount: number }>
> {
  try {
    await requireMasterAdmin();
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return { success: false, error: "File kosong / tidak ada baris data" };
    }
    if (rawRows.length > EXCEL_IMPORT_MAX_ROWS) {
      return {
        success: false,
        error: `Maksimal ${EXCEL_IMPORT_MAX_ROWS} baris per import`,
      };
    }

    const serials = rawRows
      .map((r) => {
        const n = normalizeExcelHeaders(r);
        return String(n.serial_number ?? "").trim();
      })
      .filter(Boolean);
    const tenantCodes = [
      ...new Set(
        rawRows
          .map((r) => {
            const n = normalizeExcelHeaders(r);
            return String(n.tenant_code ?? "")
              .trim()
              .toUpperCase();
          })
          .filter(Boolean)
      ),
    ];
    const catCodes = [
      ...new Set(
        rawRows
          .map((r) => {
            const n = normalizeExcelHeaders(r);
            return String(n.service_category_code ?? "")
              .trim()
              .toUpperCase();
          })
          .filter(Boolean)
      ),
    ];

    const [existing, tenants, categories] = await Promise.all([
      prisma.device.findMany({
        where: { serial_number: { in: serials } },
        select: { id: true, serial_number: true },
      }),
      prisma.tenant.findMany({
        where: { code: { in: tenantCodes } },
        select: { id: true, code: true },
      }),
      catCodes.length
        ? prisma.serviceCategory.findMany({
            where: { code: { in: catCodes } },
            select: { id: true, code: true },
          })
        : Promise.resolve([]),
    ]);

    const bySerial = new Map(
      existing.map((e) => [e.serial_number.toLowerCase(), e])
    );
    const byTenantCode = new Map(tenants.map((t) => [t.code.toUpperCase(), t]));
    const byCatCode = new Map(categories.map((c) => [c.code.toUpperCase(), c]));

    const seen = new Set<string>();
    const rows: DevicePreviewRow[] = [];

    rawRows.forEach((raw, idx) => {
      const n = normalizeExcelHeaders(raw);
      const parsed = deviceExcelRowSchema.safeParse({
        serial_number: n.serial_number,
        tenant_code: n.tenant_code,
        type: n.type,
        device_category: n.device_category || null,
        brand: n.brand ? String(n.brand) : null,
        model: n.model ? String(n.model) : null,
        ip_address: n.ip_address ? String(n.ip_address) : null,
        status: n.status || "UP",
        service_category_code: n.service_category_code
          ? String(n.service_category_code)
          : null,
      });

      const errors: string[] = [];
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errors.push(`${issue.path.join(".")}: ${issue.message}`);
        }
      }

      const data = parsed.success ? parsed.data : null;
      const snKey = (data?.serial_number ?? String(n.serial_number ?? "")).toLowerCase();
      if (snKey && seen.has(snKey)) errors.push("serial_number duplikat di file");
      if (snKey) seen.add(snKey);

      let tenantId: string | undefined;
      if (data) {
        const t = byTenantCode.get(data.tenant_code);
        if (!t) errors.push(`tenant_code tidak ditemukan: ${data.tenant_code}`);
        else tenantId = t.id;
      }

      let serviceCategoryId: string | null = null;
      if (data?.service_category_code) {
        const c = byCatCode.get(data.service_category_code);
        if (!c) {
          errors.push(
            `service_category_code tidak ditemukan: ${data.service_category_code}`
          );
        } else {
          serviceCategoryId = c.id;
        }
      }

      const exist = snKey ? bySerial.get(snKey) : undefined;
      const action: DevicePreviewRow["action"] =
        errors.length > 0 ? "error" : exist ? "update" : "create";

      rows.push({
        row: idx + 2,
        serial_number: data?.serial_number ?? String(n.serial_number ?? ""),
        tenant_code: data?.tenant_code ?? String(n.tenant_code ?? ""),
        type: data?.type ?? String(n.type ?? ""),
        status: data?.status ?? String(n.status ?? ""),
        action,
        existing_id: exist?.id,
        tenant_id: tenantId,
        service_category_id: serviceCategoryId,
        payload: data ?? undefined,
        errors,
      });
    });

    const okCount = rows.filter((r) => r.action !== "error").length;
    return {
      success: true,
      data: { rows, okCount, errorCount: rows.length - okCount },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal preview",
    };
  }
}

export async function commitDevicesImport(
  previewRows: DevicePreviewRow[]
): Promise<ActionResult<{ created: number; updated: number }>> {
  try {
    await requireMasterAdmin();
    const valid = previewRows.filter(
      (r) =>
        (r.action === "create" || r.action === "update") &&
        r.payload &&
        r.tenant_id
    );
    if (valid.length === 0) {
      return { success: false, error: "Tidak ada baris valid" };
    }

    const recheck = await previewDevicesImport(
      valid.map((r) => ({ ...r.payload! }))
    );
    if (!recheck.success || !recheck.data) {
      return {
        success: false,
        error: recheck.success === false ? recheck.error : "Revalidasi gagal",
      };
    }
    if (recheck.data.errorCount > 0) {
      return { success: false, error: "Data berubah / invalid — preview ulang" };
    }

    let created = 0;
    let updated = 0;
    for (const r of recheck.data.rows) {
      if (!r.payload || !r.tenant_id) continue;
      const p = r.payload;
      const deviceCategory =
        p.device_category ?? categoryFromType(p.type);
      const data = {
        tenant_id: r.tenant_id,
        type: p.type,
        device_category: deviceCategory,
        brand: p.brand || null,
        model: p.model || null,
        serial_number: p.serial_number,
        ip_address: p.ip_address || null,
        status: p.status,
        service_category_id: r.service_category_id ?? null,
      };
      if (r.action === "update" && r.existing_id) {
        await prisma.device.update({ where: { id: r.existing_id }, data });
        updated += 1;
      } else {
        await prisma.device.create({
          data: { ...data, last_check_at: new Date() },
        });
        created += 1;
      }
    }

    revalidatePath("/admin/devices");
    return { success: true, data: { created, updated } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal import",
    };
  }
}
