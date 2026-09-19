"use server";

import { revalidatePath } from "next/cache";
import { LocationType, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sparepartSchema, type SparepartInput } from "@/lib/validations/spareparts";
import {
  normalizeExcelHeaders,
  sparepartExcelRowSchema,
  type SparepartPreviewRow,
} from "@/lib/validations/sparepart-excel";
import { requireMasterAdmin } from "@/lib/rbac";

async function requireAdmin() {
  return requireMasterAdmin();
}

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

function resolveLocationIds(data: SparepartInput) {
  const warehouse_id =
    data.location_type === "WAREHOUSE" ? data.warehouse_id || null : null;
  const holder_id =
    data.location_type === "ENGINEER" ? data.holder_id || null : null;
  return { warehouse_id, holder_id };
}

async function findSkuConflict(opts: {
  sku: string;
  location_type: LocationType;
  warehouse_id: string | null;
  holder_id: string | null;
  excludeId?: string;
}) {
  if (opts.location_type === "WAREHOUSE" && opts.warehouse_id) {
    return prisma.sparepart.findFirst({
      where: {
        sku: opts.sku,
        location_type: "WAREHOUSE",
        warehouse_id: opts.warehouse_id,
        ...(opts.excludeId ? { NOT: { id: opts.excludeId } } : {}),
      },
    });
  }
  if (opts.location_type === "ENGINEER" && opts.holder_id) {
    return prisma.sparepart.findFirst({
      where: {
        sku: opts.sku,
        location_type: "ENGINEER",
        holder_id: opts.holder_id,
        ...(opts.excludeId ? { NOT: { id: opts.excludeId } } : {}),
      },
    });
  }
  return null;
}

export async function getSpareparts(params: {
  q?: string;
  location_type?: string;
  warehouse_id?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params.pageSize ?? 15));
  const q = params.q?.trim();
  const locationType = params.location_type?.trim();
  const warehouseId = params.warehouse_id?.trim();

  const where: Prisma.SparepartWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      locationType &&
      (locationType === "WAREHOUSE" || locationType === "ENGINEER")
        ? { location_type: locationType as LocationType }
        : {},
      warehouseId ? { warehouse_id: warehouseId } : {},
    ],
  };

  const [total, items] = await Promise.all([
    prisma.sparepart.count({ where }),
    prisma.sparepart.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        holder: { select: { id: true, full_name: true, phone: true } },
        warehouse: {
          select: { id: true, code: true, name: true, city: true },
        },
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

export async function listAvailableSpareparts() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.sparepart.findMany({
    where: { stock_qty: { gt: 0 } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      stock_qty: true,
      location_type: true,
      warehouse: { select: { code: true, name: true } },
    },
    take: 100,
  });
}

export async function createSparepart(
  input: SparepartInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdmin();
    const data = sparepartSchema.parse(input);
    const { warehouse_id, holder_id } = resolveLocationIds(data);

    if (data.location_type === "WAREHOUSE" && warehouse_id) {
      const wh = await prisma.warehouse.findFirst({
        where: { id: warehouse_id, is_active: true },
      });
      if (!wh) return { success: false, error: "Gudang tidak ditemukan / nonaktif" };
    }

    const conflict = await findSkuConflict({
      sku: data.sku,
      location_type: data.location_type,
      warehouse_id,
      holder_id,
    });
    if (conflict) {
      return {
        success: false,
        error:
          data.location_type === "WAREHOUSE"
            ? "SKU sudah ada di gudang ini"
            : "SKU sudah ada pada engineer ini",
      };
    }

    const created = await prisma.sparepart.create({
      data: {
        name: data.name,
        sku: data.sku,
        stock_qty: data.stock_qty,
        location_type: data.location_type,
        warehouse_id,
        holder_id,
      },
    });

    if (data.stock_qty > 0) {
      await prisma.sparepartMutation.create({
        data: {
          sparepart_id: created.id,
          user_id: session.user.id,
          type: "IN",
          qty: data.stock_qty,
          stock_before: 0,
          stock_after: data.stock_qty,
          notes: "Initial stock on create",
        },
      });
    }

    revalidatePath("/admin/spareparts");
    return { success: true, data: { id: created.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal simpan" };
  }
}

export async function updateSparepart(
  id: string,
  input: SparepartInput
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const data = sparepartSchema.parse(input);
    const { warehouse_id, holder_id } = resolveLocationIds(data);

    if (data.location_type === "WAREHOUSE" && warehouse_id) {
      const wh = await prisma.warehouse.findFirst({
        where: { id: warehouse_id, is_active: true },
      });
      if (!wh) return { success: false, error: "Gudang tidak ditemukan / nonaktif" };
    }

    const existing = await prisma.sparepart.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Sparepart tidak ditemukan" };

    const conflict = await findSkuConflict({
      sku: data.sku,
      location_type: data.location_type,
      warehouse_id,
      holder_id,
      excludeId: id,
    });
    if (conflict) {
      return {
        success: false,
        error:
          data.location_type === "WAREHOUSE"
            ? "SKU sudah ada di gudang ini"
            : "SKU sudah ada pada engineer ini",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.sparepart.update({
        where: { id },
        data: {
          name: data.name,
          sku: data.sku,
          stock_qty: data.stock_qty,
          location_type: data.location_type,
          warehouse_id,
          holder_id,
        },
      });

      if (data.stock_qty !== existing.stock_qty) {
        const delta = data.stock_qty - existing.stock_qty;
        await tx.sparepartMutation.create({
          data: {
            sparepart_id: id,
            user_id: session.user.id,
            type: "ADJUST",
            qty: Math.abs(delta),
            stock_before: existing.stock_qty,
            stock_after: data.stock_qty,
            notes: `Manual adjust (${delta >= 0 ? "+" : ""}${delta})`,
          },
        });
      }
    });

    revalidatePath("/admin/spareparts");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal update" };
  }
}

export async function deleteSparepart(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.sparepart.delete({ where: { id } });
    revalidatePath("/admin/spareparts");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal hapus" };
  }
}

/** Kurangi stok saat escalate butuh sparepart — catat ledger OUT */
export async function consumeSparepart(
  sparepartId: string,
  qty = 1,
  opts?: { ticket_id?: string | null; notes?: string | null }
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const amount = Math.max(1, Math.floor(qty));

    await prisma.$transaction(async (tx) => {
      const item = await tx.sparepart.findUnique({ where: { id: sparepartId } });
      if (!item) throw new Error("Sparepart tidak ditemukan");
      if (item.stock_qty < amount) throw new Error("Stok tidak cukup");

      const stock_after = item.stock_qty - amount;
      await tx.sparepart.update({
        where: { id: sparepartId },
        data: { stock_qty: stock_after },
      });
      await tx.sparepartMutation.create({
        data: {
          sparepart_id: sparepartId,
          ticket_id: opts?.ticket_id ?? null,
          user_id: session.user.id,
          type: "OUT",
          qty: amount,
          stock_before: item.stock_qty,
          stock_after,
          notes: opts?.notes?.trim() || "Consume for ticket",
        },
      });
    });

    revalidatePath("/admin/spareparts");
    if (opts?.ticket_id) {
      revalidatePath(`/admin/tickets/${opts.ticket_id}`);
      revalidatePath(`/engineer/tickets/${opts.ticket_id}`);
    }
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal kurangi stok",
    };
  }
}

export async function getSparepartMutations(sparepartId: string, limit = 50) {
  await requireAdmin();
  return prisma.sparepartMutation.findMany({
    where: { sparepart_id: sparepartId },
    orderBy: { created_at: "desc" },
    take: Math.min(100, Math.max(5, limit)),
    include: {
      user: { select: { id: true, full_name: true } },
      ticket: { select: { id: true, ticket_no: true } },
    },
  });
}

/** Export semua sparepart untuk Excel (client compose XLSX) */
export async function getSparepartsForExport() {
  await requireAdmin();
  const items = await prisma.sparepart.findMany({
    orderBy: { sku: "asc" },
    include: {
      holder: { select: { phone: true, full_name: true } },
      warehouse: { select: { code: true } },
    },
  });

  return items.map((s) => ({
    sku: s.sku,
    name: s.name,
    stock_qty: s.stock_qty,
    location_type: s.location_type,
    warehouse_code: s.warehouse?.code ?? "",
    holder_phone: s.holder?.phone ?? "",
    holder_name: s.holder?.full_name ?? "",
  }));
}

/**
 * Preview import Excel — validasi tanpa commit.
 */
export async function previewSparepartsImport(
  rawRows: Record<string, unknown>[]
): Promise<
  ActionResult<{ rows: SparepartPreviewRow[]; okCount: number; errorCount: number }>
> {
  try {
    await requireAdmin();
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return { success: false, error: "File kosong / tidak ada baris data" };
    }
    if (rawRows.length > 500) {
      return { success: false, error: "Maksimal 500 baris per import" };
    }

    const warehouses = await prisma.warehouse.findMany({
      where: { is_active: true },
      select: { id: true, code: true },
    });
    const codeToWh = new Map(
      warehouses.map((w) => [w.code.toUpperCase(), w])
    );

    const phones = rawRows
      .map((r) => {
        const n = normalizeExcelHeaders(r);
        return String(n.holder_phone ?? "").trim();
      })
      .filter(Boolean);

    const engineers = phones.length
      ? await prisma.user.findMany({
          where: { role: Role.FIELD_ENGINEER, phone: { in: phones } },
          select: { id: true, phone: true },
        })
      : [];
    const phoneSet = new Set(engineers.map((e) => e.phone));
    const phoneToId = new Map(engineers.map((e) => [e.phone, e.id]));

    // Ambil existing untuk match sku+lokasi
    const existingAll = await prisma.sparepart.findMany({
      select: {
        id: true,
        sku: true,
        location_type: true,
        warehouse_id: true,
        holder_id: true,
      },
    });

    const seenKey = new Set<string>();
    const rows: SparepartPreviewRow[] = [];

    rawRows.forEach((raw, idx) => {
      const n = normalizeExcelHeaders(raw);
      const parsed = sparepartExcelRowSchema.safeParse({
        sku: n.sku,
        name: n.name,
        stock_qty: n.stock_qty,
        location_type: n.location_type,
        warehouse_code: n.warehouse_code ? String(n.warehouse_code) : null,
        holder_phone: n.holder_phone ? String(n.holder_phone) : null,
      });

      const errors: string[] = [];
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errors.push(`${issue.path.join(".")}: ${issue.message}`);
        }
      }

      const data = parsed.success ? parsed.data : null;
      let warehouseId: string | null = null;
      let holderId: string | null = null;

      if (data?.location_type === "WAREHOUSE") {
        const code = (data.warehouse_code ?? "").trim().toUpperCase();
        if (!code) {
          errors.push("warehouse_code wajib jika location_type=WAREHOUSE");
        } else {
          const wh = codeToWh.get(code);
          if (!wh) errors.push(`Kode gudang tidak ditemukan: ${code}`);
          else warehouseId = wh.id;
        }
      }

      if (data?.location_type === "ENGINEER") {
        const phone = data.holder_phone?.trim();
        if (!phone) {
          errors.push("holder_phone wajib jika location_type=ENGINEER");
        } else if (!phoneSet.has(phone)) {
          errors.push(`Engineer phone tidak ditemukan: ${phone}`);
        } else {
          holderId = phoneToId.get(phone) ?? null;
        }
      }

      const locKey =
        data?.location_type === "WAREHOUSE"
          ? `W:${warehouseId ?? "?"}`
          : `E:${holderId ?? data?.holder_phone ?? "?"}`;
      const dupKey = `${(data?.sku ?? "").toLowerCase()}|${locKey}`;
      if (data?.sku && seenKey.has(dupKey)) {
        errors.push("SKU+lokasi duplikat di file");
      }
      if (data?.sku) seenKey.add(dupKey);

      const exist = data
        ? existingAll.find((e) => {
            if (e.sku.toLowerCase() !== data.sku.toLowerCase()) return false;
            if (e.location_type !== data.location_type) return false;
            if (data.location_type === "WAREHOUSE") {
              return e.warehouse_id === warehouseId;
            }
            return e.holder_id === holderId;
          })
        : undefined;

      const action: SparepartPreviewRow["action"] =
        errors.length > 0 ? "error" : exist ? "update" : "create";

      rows.push({
        row: idx + 2,
        sku: data?.sku ?? String(n.sku ?? ""),
        name: data?.name ?? String(n.name ?? ""),
        stock_qty: data?.stock_qty ?? (Number(n.stock_qty) || 0),
        location_type: (data?.location_type as LocationType) ?? "WAREHOUSE",
        warehouse_code: data?.warehouse_code?.trim().toUpperCase() || null,
        holder_phone: data?.holder_phone?.trim() || null,
        action,
        existing_id: exist?.id,
        errors,
      });
    });

    const okCount = rows.filter((r) => r.action !== "error").length;
    const errorCount = rows.length - okCount;

    return { success: true, data: { rows, okCount, errorCount } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal preview",
    };
  }
}

/** Commit baris yang lolos preview (re-validate di server) */
export async function commitSparepartsImport(
  previewRows: SparepartPreviewRow[]
): Promise<ActionResult<{ created: number; updated: number }>> {
  try {
    await requireAdmin();
    const valid = previewRows.filter(
      (r) => r.action === "create" || r.action === "update"
    );
    if (valid.length === 0) {
      return { success: false, error: "Tidak ada baris valid untuk di-import" };
    }

    const recheck = await previewSparepartsImport(
      valid.map((r) => ({
        sku: r.sku,
        name: r.name,
        stock_qty: r.stock_qty,
        location_type: r.location_type,
        warehouse_code: r.warehouse_code,
        holder_phone: r.holder_phone,
      }))
    );
    if (!recheck.success || !recheck.data) {
      return {
        success: false,
        error: recheck.success === false ? recheck.error : "Validasi gagal",
      };
    }
    if (recheck.data.errorCount > 0) {
      return {
        success: false,
        error: `${recheck.data.errorCount} baris error — perbaiki dulu`,
      };
    }

    const warehouses = await prisma.warehouse.findMany({
      where: { is_active: true },
      select: { id: true, code: true },
    });
    const codeToId = new Map(
      warehouses.map((w) => [w.code.toUpperCase(), w.id])
    );

    const phones = recheck.data.rows
      .map((r) => r.holder_phone)
      .filter((p): p is string => !!p);
    const engineers = phones.length
      ? await prisma.user.findMany({
          where: { role: Role.FIELD_ENGINEER, phone: { in: phones } },
          select: { id: true, phone: true },
        })
      : [];
    const phoneToId = new Map(engineers.map((e) => [e.phone, e.id]));

    let created = 0;
    let updated = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of recheck.data!.rows) {
        const warehouse_id =
          row.location_type === "WAREHOUSE" && row.warehouse_code
            ? codeToId.get(row.warehouse_code.toUpperCase()) ?? null
            : null;
        const holder_id =
          row.location_type === "ENGINEER" && row.holder_phone
            ? phoneToId.get(row.holder_phone) ?? null
            : null;

        if (row.action === "update" && row.existing_id) {
          await tx.sparepart.update({
            where: { id: row.existing_id },
            data: {
              name: row.name,
              stock_qty: row.stock_qty,
              location_type: row.location_type,
              warehouse_id,
              holder_id,
            },
          });
          updated += 1;
        } else {
          await tx.sparepart.create({
            data: {
              sku: row.sku,
              name: row.name,
              stock_qty: row.stock_qty,
              location_type: row.location_type,
              warehouse_id,
              holder_id,
            },
          });
          created += 1;
        }
      }
    });

    revalidatePath("/admin/spareparts");
    return { success: true, data: { created, updated } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal import",
    };
  }
}
