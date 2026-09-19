"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { tenantSchema, type TenantInput } from "@/lib/validations/master";
import {
  EXCEL_IMPORT_MAX_ROWS,
  normalizeExcelHeaders,
  parseBoolCell,
} from "@/lib/excel";
import {
  tenantExcelRowSchema,
  type TenantPreviewRow,
} from "@/lib/validations/tenant-excel";
import { requireAppAdmin, requireMasterAdmin } from "@/lib/rbac";

async function requireAdmin() {
  return requireAppAdmin();
}

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function getTenants(params: {
  q?: string;
  city?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireMasterAdmin();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params.pageSize ?? 10));
  const q = params.q?.trim();
  const city = params.city?.trim();

  const where: Prisma.TenantWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      city ? { city: { equals: city, mode: "insensitive" } } : {},
    ],
  };

  const [total, items, cities] = await Promise.all([
    prisma.tenant.count({ where }),
    prisma.tenant.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { devices: true } } },
    }),
    prisma.tenant.findMany({
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    cities: cities.map((c) => c.city),
  };
}

export async function createTenant(input: TenantInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireMasterAdmin();
    const data = tenantSchema.parse(input);

    const existing = await prisma.tenant.findUnique({ where: { code: data.code } });
    if (existing) {
      return { success: false, error: "Kode tenant sudah dipakai" };
    }

    const tenant = await prisma.tenant.create({
      data: {
        ...data,
        sub_district: data.sub_district || null,
        pic_name: data.pic_name || null,
        pic_phone: data.pic_phone || null,
      },
    });

    revalidatePath("/admin/tenants");
    return { success: true, data: { id: tenant.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal membuat tenant" };
  }
}

export async function updateTenant(
  id: string,
  input: TenantInput
): Promise<ActionResult> {
  try {
    await requireMasterAdmin();
    const data = tenantSchema.parse(input);

    const conflict = await prisma.tenant.findFirst({
      where: { code: data.code, NOT: { id } },
    });
    if (conflict) {
      return { success: false, error: "Kode tenant sudah dipakai" };
    }

    await prisma.tenant.update({
      where: { id },
      data: {
        ...data,
        sub_district: data.sub_district || null,
        pic_name: data.pic_name || null,
        pic_phone: data.pic_phone || null,
      },
    });

    revalidatePath("/admin/tenants");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal update tenant" };
  }
}

export async function deleteTenant(id: string): Promise<ActionResult> {
  try {
    await requireMasterAdmin();
    await prisma.tenant.delete({ where: { id } });
    revalidatePath("/admin/tenants");
    revalidatePath("/admin/devices");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal hapus tenant" };
  }
}

export async function getTenantOptions() {
  // sengaja requireAppAdmin: DISPATCHER/NOC butuh list id/name untuk form ticket
  await requireAdmin();
  return prisma.tenant.findMany({
    where: { is_active: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

export async function getTenantsForExport() {
  await requireMasterAdmin();
  const rows = await prisma.tenant.findMany({
    orderBy: { code: "asc" },
    take: 5000,
  });
  return rows.map((t) => ({
    code: t.code,
    name: t.name,
    address: t.address,
    province: t.province,
    city: t.city,
    district: t.district,
    sub_district: t.sub_district ?? "",
    lat: t.lat,
    lng: t.lng,
    pic_name: t.pic_name ?? "",
    pic_phone: t.pic_phone ?? "",
    sla_tier: t.sla_tier,
    is_active: t.is_active,
  }));
}

export async function previewTenantsImport(
  rawRows: Record<string, unknown>[]
): Promise<
  ActionResult<{ rows: TenantPreviewRow[]; okCount: number; errorCount: number }>
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

    const codes = rawRows
      .map((r) => {
        const n = normalizeExcelHeaders(r);
        return String(n.code ?? "")
          .trim()
          .toUpperCase();
      })
      .filter(Boolean);

    const existing = await prisma.tenant.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    });
    const byCode = new Map(existing.map((e) => [e.code.toUpperCase(), e]));

    const seen = new Set<string>();
    const rows: TenantPreviewRow[] = [];

    rawRows.forEach((raw, idx) => {
      const n = normalizeExcelHeaders(raw);
      const parsed = tenantExcelRowSchema.safeParse({
        code: n.code,
        name: n.name,
        address: n.address,
        province: n.province,
        city: n.city,
        district: n.district,
        sub_district: n.sub_district ? String(n.sub_district) : null,
        lat: n.lat,
        lng: n.lng,
        pic_name: n.pic_name ? String(n.pic_name) : null,
        pic_phone: n.pic_phone ? String(n.pic_phone) : null,
        sla_tier: n.sla_tier,
        is_active: parseBoolCell(n.is_active, true),
      });

      const errors: string[] = [];
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errors.push(`${issue.path.join(".")}: ${issue.message}`);
        }
      }

      const data = parsed.success ? parsed.data : null;
      const codeKey = (data?.code ?? String(n.code ?? "")).toUpperCase();
      if (codeKey && seen.has(codeKey)) errors.push("code duplikat di file");
      if (codeKey) seen.add(codeKey);

      const exist = codeKey ? byCode.get(codeKey) : undefined;
      const action: TenantPreviewRow["action"] =
        errors.length > 0 ? "error" : exist ? "update" : "create";

      rows.push({
        row: idx + 2,
        code: data?.code ?? String(n.code ?? ""),
        name: data?.name ?? String(n.name ?? ""),
        city: data?.city ?? String(n.city ?? ""),
        sla_tier: data?.sla_tier ?? String(n.sla_tier ?? ""),
        action,
        existing_id: exist?.id,
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

export async function commitTenantsImport(
  previewRows: TenantPreviewRow[]
): Promise<ActionResult<{ created: number; updated: number }>> {
  try {
    await requireMasterAdmin();
    const valid = previewRows.filter(
      (r) => (r.action === "create" || r.action === "update") && r.payload
    );
    if (valid.length === 0) {
      return { success: false, error: "Tidak ada baris valid" };
    }

    const recheck = await previewTenantsImport(
      valid.map((r) => ({ ...r.payload! }))
    );
    if (!recheck.success || !recheck.data) {
      return { success: false, error: recheck.success === false ? recheck.error : "Revalidasi gagal" };
    }
    if (recheck.data.errorCount > 0) {
      return { success: false, error: "Data berubah / invalid — preview ulang" };
    }

    let created = 0;
    let updated = 0;
    for (const r of recheck.data.rows) {
      if (!r.payload) continue;
      const p = r.payload;
      if (r.action === "update" && r.existing_id) {
        await prisma.tenant.update({
          where: { id: r.existing_id },
          data: {
            name: p.name,
            address: p.address,
            province: p.province,
            city: p.city,
            district: p.district,
            sub_district: p.sub_district || null,
            lat: p.lat,
            lng: p.lng,
            pic_name: p.pic_name || null,
            pic_phone: p.pic_phone || null,
            sla_tier: p.sla_tier,
            is_active: p.is_active,
          },
        });
        updated += 1;
      } else {
        await prisma.tenant.create({
          data: {
            code: p.code,
            name: p.name,
            address: p.address,
            province: p.province,
            city: p.city,
            district: p.district,
            sub_district: p.sub_district || null,
            lat: p.lat,
            lng: p.lng,
            pic_name: p.pic_name || null,
            pic_phone: p.pic_phone || null,
            sla_tier: p.sla_tier,
            is_active: p.is_active,
          },
        });
        created += 1;
      }
    }

    revalidatePath("/admin/tenants");
    return { success: true, data: { created, updated } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal import",
    };
  }
}
