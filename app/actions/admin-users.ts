"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  APP_ADMIN_ROLES,
  isAssignableAdminRole,
  requireSuperAdmin,
  type AppAdminRole,
} from "@/lib/rbac";

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

const adminUserSchema = z.object({
  full_name: z.string().min(2).max(120),
  phone: z
    .string()
    .min(10)
    .max(15)
    .regex(/^08\d+$/, "Gunakan format 08xxxxxxxxxx"),
  role: z.enum([
    "SUPER_ADMIN",
    "ADMIN_NOC",
    "DISPATCHER",
    "NOC_L0",
    "NOC_L1",
  ]),
  password: z.string().min(8).optional(),
  is_suspended: z.boolean().optional(),
});

async function writeAudit(input: {
  actor_id: string;
  action: string;
  target_user_id?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.adminAuditLog.create({
    data: {
      actor_id: input.actor_id,
      action: input.action,
      target_user_id: input.target_user_id ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}

export async function listAdminUsers(params?: {
  q?: string;
  role?: string;
}) {
  await requireSuperAdmin();
  const q = params?.q?.trim();
  const role = params?.role?.trim();

  const where: Prisma.UserWhereInput = {
    role: { in: [...APP_ADMIN_ROLES] as Role[] },
    AND: [
      role && isAssignableAdminRole(role) ? { role: role as Role } : {},
      q
        ? {
            OR: [
              { full_name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : {},
    ],
  };

  const items = await prisma.user.findMany({
    where,
    orderBy: [{ role: "asc" }, { full_name: "asc" }],
    select: {
      id: true,
      full_name: true,
      phone: true,
      role: true,
      is_suspended: true,
      created_at: true,
      updated_at: true,
    },
  });

  return { items };
}

export async function createAdminUser(
  input: z.infer<typeof adminUserSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireSuperAdmin();
    const data = adminUserSchema.parse(input);
    if (!data.password) {
      return { success: false, error: "Password wajib (min 8 karakter)" };
    }

    const existing = await prisma.user.findUnique({
      where: { phone: data.phone },
    });
    if (existing) {
      return { success: false, error: "Nomor HP sudah terdaftar" };
    }

    const password = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        full_name: data.full_name,
        phone: data.phone,
        password,
        role: data.role as Role,
        status: "OFFLINE",
        skills: [],
        is_suspended: data.is_suspended ?? false,
      },
    });

    await writeAudit({
      actor_id: session.user.id,
      action: "USER_CREATE",
      target_user_id: user.id,
      metadata: { role: user.role, phone: user.phone },
    });

    revalidatePath("/admin/users");
    return { success: true, data: { id: user.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal membuat user",
    };
  }
}

export async function updateAdminUser(
  id: string,
  input: z.infer<typeof adminUserSchema>
): Promise<ActionResult> {
  try {
    const session = await requireSuperAdmin();
    const data = adminUserSchema.parse(input);

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || !isAssignableAdminRole(target.role)) {
      return { success: false, error: "User admin tidak ditemukan" };
    }

    // Lindungi SUPER_ADMIN terakhir
    if (
      target.role === "SUPER_ADMIN" &&
      data.role !== "SUPER_ADMIN" &&
      !target.is_suspended
    ) {
      const otherSuper = await prisma.user.count({
        where: {
          role: "SUPER_ADMIN",
          is_suspended: false,
          NOT: { id },
        },
      });
      if (otherSuper === 0) {
        return {
          success: false,
          error: "Tidak boleh demote SUPER_ADMIN terakhir yang aktif",
        };
      }
    }

    if (data.is_suspended && target.role === "SUPER_ADMIN") {
      const otherSuper = await prisma.user.count({
        where: {
          role: "SUPER_ADMIN",
          is_suspended: false,
          NOT: { id },
        },
      });
      if (otherSuper === 0) {
        return {
          success: false,
          error: "Tidak boleh suspend SUPER_ADMIN terakhir yang aktif",
        };
      }
    }

    // Tidak boleh self-suspend
    if (id === session.user.id && data.is_suspended) {
      return { success: false, error: "Tidak boleh suspend akun sendiri" };
    }

    const conflict = await prisma.user.findFirst({
      where: { phone: data.phone, NOT: { id } },
    });
    if (conflict) {
      return { success: false, error: "Nomor HP sudah terdaftar" };
    }

    const updateData: Prisma.UserUpdateInput = {
      full_name: data.full_name,
      phone: data.phone,
      role: data.role as Role,
      is_suspended: data.is_suspended ?? false,
    };
    if (data.password && data.password.length >= 8) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    await prisma.user.update({ where: { id }, data: updateData });

    await writeAudit({
      actor_id: session.user.id,
      action: "USER_UPDATE",
      target_user_id: id,
      metadata: {
        role: data.role,
        phone: data.phone,
        is_suspended: data.is_suspended ?? false,
        password_reset: !!(data.password && data.password.length >= 8),
        prev_role: target.role,
      },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal update user",
    };
  }
}

export async function deleteAdminUser(id: string): Promise<ActionResult> {
  try {
    const session = await requireSuperAdmin();
    if (id === session.user.id) {
      return { success: false, error: "Tidak boleh hapus akun sendiri" };
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || !isAssignableAdminRole(target.role)) {
      return { success: false, error: "User admin tidak ditemukan" };
    }

    if (target.role === "SUPER_ADMIN") {
      const otherSuper = await prisma.user.count({
        where: {
          role: "SUPER_ADMIN",
          is_suspended: false,
          NOT: { id },
        },
      });
      if (otherSuper === 0) {
        return {
          success: false,
          error: "Tidak boleh hapus SUPER_ADMIN terakhir yang aktif",
        };
      }
    }

    await prisma.user.delete({ where: { id } });
    await writeAudit({
      actor_id: session.user.id,
      action: "USER_DELETE",
      target_user_id: id,
      metadata: { role: target.role, phone: target.phone },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal hapus user",
    };
  }
}

export async function listAdminUserAudits(limit = 30) {
  await requireSuperAdmin();
  const logs = await prisma.adminAuditLog.findMany({
    where: {
      action: { in: ["USER_CREATE", "USER_UPDATE", "USER_DELETE"] },
    },
    orderBy: { created_at: "desc" },
    take: Math.min(100, Math.max(10, limit)),
    include: {
      actor: { select: { full_name: true, phone: true } },
    },
  });
  return logs.map((l) => ({
    id: l.id,
    action: l.action,
    target_user_id: l.target_user_id,
    metadata: l.metadata,
    created_at: l.created_at.toISOString(),
    actor_name: l.actor.full_name,
    actor_phone: l.actor.phone,
  }));
}

export type { AppAdminRole };
