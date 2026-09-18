"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { tenantSchema, type TenantInput } from "@/lib/validations/master";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
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
  await requireAdmin();
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
    await requireAdmin();
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
    await requireAdmin();
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
    await requireAdmin();
    await prisma.tenant.delete({ where: { id } });
    revalidatePath("/admin/tenants");
    revalidatePath("/admin/devices");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal hapus tenant" };
  }
}

export async function getTenantOptions() {
  await requireAdmin();
  return prisma.tenant.findMany({
    where: { is_active: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}
