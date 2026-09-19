"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { engineerSchema, type EngineerInput } from "@/lib/validations/master";
import {
  ENGINEERS_READ_ROLES,
  ENGINEERS_WRITE_ROLES,
  requireRoles,
} from "@/lib/rbac";

/** Parse YYYY-MM-DD → Date noon UTC (hindari geser hari karena TZ). */
function parseBirthDate(ymd: string | null | undefined): Date | null {
  if (!ymd) return null;
  const d = new Date(`${ymd}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function requireEngineerRead() {
  return requireRoles(ENGINEERS_READ_ROLES);
}

async function requireEngineerWrite() {
  return requireRoles(ENGINEERS_WRITE_ROLES);
}

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function getEngineers(params: {
  q?: string;
  status?: string;
  engagement?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireEngineerRead();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params.pageSize ?? 10));
  const q = params.q?.trim();
  const engagement = params.engagement?.trim();

  const where: Prisma.UserWhereInput = {
    role: Role.FIELD_ENGINEER,
    AND: [
      params.status
        ? { status: params.status as Prisma.EnumEngineerStatusFilter["equals"] }
        : {},
      engagement
        ? {
            engagement_type:
              engagement as Prisma.EnumEngagementTypeFilter["equals"],
          }
        : {},
      q
        ? {
            OR: [
              { full_name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { city: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { full_name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        full_name: true,
        phone: true,
        city: true,
        district: true,
        lat: true,
        lng: true,
        skills: true,
        status: true,
        rating: true,
        engagement_type: true,
        employment_status: true,
        partnership_status: true,
        telegram_chat_id: true,
        email: true,
        birth_date: true,
        created_at: true,
      },
    }),
  ]);

  return {
    items: items.map((i) => ({
      ...i,
      birth_date: i.birth_date
        ? i.birth_date.toISOString().slice(0, 10)
        : null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function createEngineer(
  input: EngineerInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireEngineerWrite();
    const data = engineerSchema.parse(input);

    if (!data.password) {
      return { success: false, error: "Password wajib untuk engineer baru" };
    }

    const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (existing) {
      return { success: false, error: "Nomor HP sudah terdaftar" };
    }

    const password = await bcrypt.hash(data.password, 10);
    const engineer = await prisma.user.create({
      data: {
        full_name: data.full_name,
        phone: data.phone,
        password,
        role: Role.FIELD_ENGINEER,
        city: data.city || null,
        district: data.district || null,
        lat: data.lat,
        lng: data.lng,
        skills: data.skills,
        status: data.status,
        telegram_chat_id: data.telegram_chat_id ?? null,
        email: data.email ?? null,
        birth_date: parseBirthDate(data.birth_date),
      },
    });

    revalidatePath("/admin/engineers");
    return { success: true, data: { id: engineer.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal membuat engineer" };
  }
}

export async function updateEngineer(
  id: string,
  input: EngineerInput
): Promise<ActionResult> {
  try {
    await requireEngineerWrite();
    const data = engineerSchema.parse(input);

    const conflict = await prisma.user.findFirst({
      where: { phone: data.phone, NOT: { id } },
    });
    if (conflict) {
      return { success: false, error: "Nomor HP sudah terdaftar" };
    }

    const updateData: Prisma.UserUpdateInput = {
      full_name: data.full_name,
      phone: data.phone,
      city: data.city || null,
      district: data.district || null,
      lat: data.lat,
      lng: data.lng,
      skills: data.skills,
      status: data.status,
      telegram_chat_id: data.telegram_chat_id ?? null,
      email: data.email ?? null,
      birth_date: parseBirthDate(data.birth_date),
    };

    if (data.password && data.password.length >= 6) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    await prisma.user.update({ where: { id }, data: updateData });
    revalidatePath("/admin/engineers");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal update engineer" };
  }
}

export async function deleteEngineer(id: string): Promise<ActionResult> {
  try {
    await requireEngineerWrite();
    await prisma.user.delete({ where: { id } });
    revalidatePath("/admin/engineers");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal hapus engineer" };
  }
}
