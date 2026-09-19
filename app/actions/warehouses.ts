"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMasterAdmin } from "@/lib/rbac";
import {
  warehouseSchema,
  type WarehouseInput,
} from "@/lib/validations/warehouses";

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function listWarehouses(params?: {
  q?: string;
  activeOnly?: boolean;
}) {
  await requireMasterAdmin();
  const q = params?.q?.trim();
  const where: Prisma.WarehouseWhereInput = {
    AND: [
      params?.activeOnly ? { is_active: true } : {},
      q
        ? {
            OR: [
              { code: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  return prisma.warehouse.findMany({
    where,
    orderBy: [{ is_active: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { spareparts: true } },
    },
  });
}

/** Opsi dropdown aktif saja */
export async function listActiveWarehouses() {
  await requireMasterAdmin();
  return prisma.warehouse.findMany({
    where: { is_active: true },
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true, city: true },
  });
}

export async function createWarehouse(
  input: WarehouseInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireMasterAdmin();
    const data = warehouseSchema.parse(input);

    const exists = await prisma.warehouse.findUnique({
      where: { code: data.code },
    });
    if (exists) return { success: false, error: "Kode gudang sudah dipakai" };

    const wh = await prisma.warehouse.create({
      data: {
        code: data.code,
        name: data.name,
        city: data.city,
        address: data.address,
        is_active: data.is_active,
      },
    });

    revalidatePath("/admin/warehouses");
    revalidatePath("/admin/spareparts");
    return { success: true, data: { id: wh.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal simpan gudang",
    };
  }
}

export async function updateWarehouse(
  id: string,
  input: WarehouseInput
): Promise<ActionResult> {
  try {
    await requireMasterAdmin();
    const data = warehouseSchema.parse(input);

    const conflict = await prisma.warehouse.findFirst({
      where: { code: data.code, NOT: { id } },
    });
    if (conflict) return { success: false, error: "Kode gudang sudah dipakai" };

    await prisma.warehouse.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        city: data.city,
        address: data.address,
        is_active: data.is_active,
      },
    });

    revalidatePath("/admin/warehouses");
    revalidatePath("/admin/spareparts");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal update gudang",
    };
  }
}

export async function deleteWarehouse(id: string): Promise<ActionResult> {
  try {
    await requireMasterAdmin();
    const count = await prisma.sparepart.count({
      where: { warehouse_id: id },
    });
    if (count > 0) {
      return {
        success: false,
        error: `Masih ada ${count} sparepart di gudang ini. Pindahkan dulu atau nonaktifkan gudang.`,
      };
    }
    await prisma.warehouse.delete({ where: { id } });
    revalidatePath("/admin/warehouses");
    revalidatePath("/admin/spareparts");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal hapus gudang",
    };
  }
}
