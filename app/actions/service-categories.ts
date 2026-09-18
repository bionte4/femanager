"use server";

import { revalidatePath } from "next/cache";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
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
