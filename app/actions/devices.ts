"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { deviceSchema, type DeviceInput } from "@/lib/validations/master";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function getDevices(params: {
  q?: string;
  tenant_id?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();
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
    await requireAdmin();
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
    await requireAdmin();
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
    await requireAdmin();
    await prisma.device.delete({ where: { id } });
    revalidatePath("/admin/devices");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal hapus device" };
  }
}
