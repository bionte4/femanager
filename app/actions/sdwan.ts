"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { requireAppAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  return requireAppAdmin();
}

export async function getEngineerCertifications(engineerId: string) {
  await requireAdmin();
  return prisma.skillCertification.findMany({
    where: { engineer_id: engineerId },
    orderBy: { certified_at: "desc" },
  });
}

export async function addCertificationAction(input: {
  engineer_id: string;
  skill: string;
  level: string;
  certificate_url?: string;
  expiry_at?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAdmin();
    const eng = await prisma.user.findFirst({
      where: { id: input.engineer_id, role: Role.FIELD_ENGINEER },
    });
    if (!eng) return { success: false, error: "Engineer tidak ditemukan" };

    await prisma.skillCertification.create({
      data: {
        engineer_id: input.engineer_id,
        skill: input.skill.toUpperCase(),
        level: input.level.toUpperCase(),
        certificate_url: input.certificate_url || null,
        expiry_at: input.expiry_at ? new Date(input.expiry_at) : null,
        certified_by: session.user.id,
        is_active: true,
      },
    });

    revalidatePath(`/admin/engineers/${input.engineer_id}`);
    revalidatePath(`/admin/engineers/${input.engineer_id}/certifications`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}

export async function toggleCertificationAction(
  id: string,
  is_active: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const cert = await prisma.skillCertification.update({
      where: { id },
      data: { is_active },
    });
    revalidatePath(`/admin/engineers/${cert.engineer_id}/certifications`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}

export async function listKnowledgeBase(category?: string) {
  return prisma.knowledgeBase.findMany({
    where: {
      is_active: true,
      ...(category ? { category } : {}),
    },
    orderBy: { updated_at: "desc" },
  });
}

export async function listAllKnowledgeBaseAdmin() {
  await requireAdmin();
  return prisma.knowledgeBase.findMany({ orderBy: { updated_at: "desc" } });
}

export async function upsertKnowledgeBaseAction(input: {
  id?: string;
  title: string;
  category: string;
  content: string;
  video_url?: string;
  file_url?: string;
  is_active?: boolean;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    await requireAdmin();
    if (input.id) {
      await prisma.knowledgeBase.update({
        where: { id: input.id },
        data: {
          title: input.title,
          category: input.category,
          content: input.content,
          video_url: input.video_url || null,
          file_url: input.file_url || null,
          is_active: input.is_active ?? true,
        },
      });
      revalidatePath("/admin/kb");
      revalidatePath("/engineer/kb");
      return { success: true, id: input.id };
    }
    const row = await prisma.knowledgeBase.create({
      data: {
        title: input.title,
        category: input.category,
        content: input.content,
        video_url: input.video_url || null,
        file_url: input.file_url || null,
        is_active: input.is_active ?? true,
      },
    });
    revalidatePath("/admin/kb");
    revalidatePath("/engineer/kb");
    return { success: true, id: row.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}

export async function deleteKnowledgeBaseAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await prisma.knowledgeBase.delete({ where: { id } });
    revalidatePath("/admin/kb");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}

export async function saveSdwanChecklistAction(input: {
  ticket_id: string;
  checklist: Record<string, { checked?: boolean; value?: string; photo_url?: string }>;
  checklist_key: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const ticket = await prisma.ticket.findUnique({ where: { id: input.ticket_id } });
    if (!ticket) return { success: false, error: "Ticket tidak ditemukan" };

    const isAdmin = (ADMIN_ROLES as readonly string[]).includes(session.user.role);
    if (
      !isAdmin &&
      ticket.assigned_engineer_id !== session.user.id
    ) {
      return { success: false, error: "Bukan ticket kamu" };
    }

    await prisma.ticket.update({
      where: { id: input.ticket_id },
      data: {
        sdwan_checklist: {
          key: input.checklist_key,
          answers: input.checklist,
          updated_at: new Date().toISOString(),
          updated_by: session.user.id,
        },
      },
    });

    revalidatePath(`/engineer/tickets/${input.ticket_id}`);
    revalidatePath(`/admin/tickets/${input.ticket_id}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal simpan checklist" };
  }
}
