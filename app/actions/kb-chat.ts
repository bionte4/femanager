"use server";

import { Role } from "@prisma/client";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildKbReply,
  searchKnowledgeBase,
  type KbSearchHit,
} from "@/lib/kb-search";

export type KbChatResult = {
  success: true;
  answer: string;
  lowConfidence: boolean;
  hits: KbSearchHit[];
  categoryUsed: string | null;
};

export type KbChatError = { success: false; error: string };

/**
 * Tanya SOP ke Knowledge Base (search lokal, tanpa LLM).
 */
export async function askKnowledgeBaseAction(input: {
  question: string;
  category?: string | null;
  audience?: "engineer" | "admin";
}): Promise<KbChatResult | KbChatError> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const question = input.question?.trim() ?? "";
    if (question.length < 2) {
      return { success: false, error: "Pertanyaan terlalu pendek" };
    }
    if (question.length > 400) {
      return { success: false, error: "Pertanyaan maksimal 400 karakter" };
    }

    const docs = await prisma.knowledgeBase.findMany({
      where: { is_active: true },
      select: { id: true, title: true, category: true, content: true },
      take: 200,
    });

    const audience = input.audience ?? "engineer";
    const hits = searchKnowledgeBase(docs, question, {
      category: input.category,
      limit: 3,
      hrefBase: "/engineer/kb",
    });

    // Admin tidak pakai route engineer — citation tetap id; UI admin buka dialog list
    const normalizedHits: KbSearchHit[] =
      audience === "admin"
        ? hits.map((h) => ({ ...h, href: `/admin/kb?highlight=${h.id}` }))
        : hits;

    const { answer, lowConfidence } = buildKbReply(normalizedHits, question);

    return {
      success: true,
      answer,
      lowConfidence,
      hits: normalizedHits,
      categoryUsed: input.category?.trim() || null,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal cari SOP",
    };
  }
}

/** Ambil kategori KB dari ticket FE (konteks chatbot di detail ticket) */
export async function getTicketKbCategoryAction(
  ticketId: string
): Promise<{ category: string | null }> {
  const session = await auth();
  if (!session?.user) return { category: null };

  const isAdmin = (ADMIN_ROLES as readonly string[]).includes(session.user.role);
  const isFe = session.user.role === Role.FIELD_ENGINEER;

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      ...(isFe && !isAdmin
        ? { assigned_engineer_id: session.user.id }
        : {}),
    },
    select: {
      service_category: { select: { code: true } },
      device: {
        select: {
          device_category: true,
          type: true,
          service_category: { select: { code: true } },
        },
      },
    },
  });

  if (!ticket) return { category: null };

  const code =
    ticket.service_category?.code ??
    ticket.device?.service_category?.code ??
    null;

  if (code) return { category: code };

  const dc = String(ticket.device?.device_category ?? "");
  const type = String(ticket.device?.type ?? "");
  if (dc.includes("SDWAN") || type.includes("SDWAN")) return { category: "SDWAN" };
  if (dc.includes("EDC") || type.includes("EDC")) return { category: "EDC" };
  if (dc.includes("WIFI") || type.includes("WIFI")) return { category: "WIFI" };
  if (dc.includes("CCTV")) return { category: "CCTV" };

  return { category: null };
}
