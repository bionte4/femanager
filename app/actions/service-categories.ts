"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  EXCEL_IMPORT_MAX_ROWS,
  normalizeExcelHeaders,
  parseBoolCell,
} from "@/lib/excel";
import {
  categoryExcelRowSchema,
  type CategoryPreviewRow,
} from "@/lib/validations/category-excel";
import { requireMasterAdmin } from "@/lib/rbac";

async function requireAdmin() {
  return requireMasterAdmin();
}

export async function listServiceCategories(activeOnly = false) {
  return prisma.serviceCategory.findMany({
    where: activeOnly ? { is_active: true } : undefined,
    include: {
      _count: { select: { packages: true, tickets: true, devices: true } },
      packages: {
        where: { is_active: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getServiceCategory(id: string) {
  await requireAdmin();
  return prisma.serviceCategory.findUnique({
    where: { id },
    include: {
      packages: { orderBy: { name: "asc" } },
      _count: { select: { tickets: true, devices: true } },
    },
  });
}

export async function upsertServiceCategoryAction(input: {
  id?: string;
  code: string;
  name: string;
  icon?: string;
  base_fee_tier1: number;
  base_fee_tier2: number;
  base_fee_tier3: number;
  estimated_duration_minutes: number;
  requires_certification: boolean;
  checklist_template: string[];
  is_active?: boolean;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    await requireAdmin();
    const data = {
      code: input.code.toUpperCase(),
      name: input.name,
      icon: input.icon || null,
      base_fee_tier1: input.base_fee_tier1,
      base_fee_tier2: input.base_fee_tier2,
      base_fee_tier3: input.base_fee_tier3,
      estimated_duration_minutes: input.estimated_duration_minutes,
      requires_certification: input.requires_certification,
      checklist_template: input.checklist_template as Prisma.InputJsonValue,
      is_active: input.is_active ?? true,
    };
    if (input.id) {
      await prisma.serviceCategory.update({ where: { id: input.id }, data });
      revalidatePath("/admin/service-categories");
      return { success: true, id: input.id };
    }
    const row = await prisma.serviceCategory.create({ data });
    revalidatePath("/admin/service-categories");
    return { success: true, id: row.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}

export async function upsertServicePackageAction(input: {
  id?: string;
  service_category_id: string;
  name: string;
  description?: string;
  price_customer: number;
  fee_engineer: number;
  estimated_duration: number;
  required_engineers?: number;
  is_active?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (input.id) {
      await prisma.servicePackage.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description || null,
          price_customer: input.price_customer,
          fee_engineer: input.fee_engineer,
          estimated_duration: input.estimated_duration,
          required_engineers: input.required_engineers ?? 1,
          is_active: input.is_active ?? true,
        },
      });
    } else {
      await prisma.servicePackage.create({
        data: {
          service_category_id: input.service_category_id,
          name: input.name,
          description: input.description || null,
          price_customer: input.price_customer,
          fee_engineer: input.fee_engineer,
          estimated_duration: input.estimated_duration,
          required_engineers: input.required_engineers ?? 1,
          is_active: input.is_active ?? true,
        },
      });
    }
    revalidatePath("/admin/service-categories");
    revalidatePath(`/admin/service-categories/${input.service_category_id}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}

export async function deleteServicePackageAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await prisma.servicePackage.delete({ where: { id } });
    revalidatePath("/admin/service-categories");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}

type CatActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function getCategoriesForExport() {
  await requireAdmin();
  const rows = await prisma.serviceCategory.findMany({
    orderBy: { code: "asc" },
    take: 500,
  });
  return rows.map((c) => ({
    code: c.code,
    name: c.name,
    icon: c.icon ?? "",
    base_fee_tier1: c.base_fee_tier1,
    base_fee_tier2: c.base_fee_tier2,
    base_fee_tier3: c.base_fee_tier3,
    estimated_duration_minutes: c.estimated_duration_minutes,
    requires_certification: c.requires_certification,
    is_active: c.is_active,
  }));
}

export async function previewCategoriesImport(
  rawRows: Record<string, unknown>[]
): Promise<
  CatActionResult<{
    rows: CategoryPreviewRow[];
    okCount: number;
    errorCount: number;
  }>
> {
  try {
    await requireAdmin();
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

    const existing = await prisma.serviceCategory.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    });
    const byCode = new Map(existing.map((e) => [e.code.toUpperCase(), e]));

    const seen = new Set<string>();
    const rows: CategoryPreviewRow[] = [];

    rawRows.forEach((raw, idx) => {
      const n = normalizeExcelHeaders(raw);
      const parsed = categoryExcelRowSchema.safeParse({
        code: n.code,
        name: n.name,
        icon: n.icon ? String(n.icon) : null,
        base_fee_tier1: n.base_fee_tier1,
        base_fee_tier2: n.base_fee_tier2,
        base_fee_tier3: n.base_fee_tier3,
        estimated_duration_minutes: n.estimated_duration_minutes || 60,
        requires_certification: parseBoolCell(n.requires_certification, false),
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
      const action: CategoryPreviewRow["action"] =
        errors.length > 0 ? "error" : exist ? "update" : "create";

      rows.push({
        row: idx + 2,
        code: data?.code ?? String(n.code ?? ""),
        name: data?.name ?? String(n.name ?? ""),
        base_fee_tier1: data?.base_fee_tier1 ?? (Number(n.base_fee_tier1) || 0),
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

export async function commitCategoriesImport(
  previewRows: CategoryPreviewRow[]
): Promise<CatActionResult<{ created: number; updated: number }>> {
  try {
    await requireAdmin();
    const valid = previewRows.filter(
      (r) => (r.action === "create" || r.action === "update") && r.payload
    );
    if (valid.length === 0) {
      return { success: false, error: "Tidak ada baris valid" };
    }

    const recheck = await previewCategoriesImport(
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
      if (!r.payload) continue;
      const p = r.payload;
      if (r.action === "update" && r.existing_id) {
        await prisma.serviceCategory.update({
          where: { id: r.existing_id },
          data: {
            name: p.name,
            icon: p.icon || null,
            base_fee_tier1: p.base_fee_tier1,
            base_fee_tier2: p.base_fee_tier2,
            base_fee_tier3: p.base_fee_tier3,
            estimated_duration_minutes: p.estimated_duration_minutes,
            requires_certification: p.requires_certification,
            is_active: p.is_active,
          },
        });
        updated += 1;
      } else {
        await prisma.serviceCategory.create({
          data: {
            code: p.code,
            name: p.name,
            icon: p.icon || null,
            base_fee_tier1: p.base_fee_tier1,
            base_fee_tier2: p.base_fee_tier2,
            base_fee_tier3: p.base_fee_tier3,
            estimated_duration_minutes: p.estimated_duration_minutes,
            requires_certification: p.requires_certification,
            is_active: p.is_active,
            checklist_template: [] as Prisma.InputJsonValue,
          },
        });
        created += 1;
      }
    }

    revalidatePath("/admin/service-categories");
    return { success: true, data: { created, updated } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal import",
    };
  }
}
