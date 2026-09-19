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
  /** true jika jawaban dipoles oleh LLM */
  ai_enhanced?: boolean;
};

export type KbChatError = { success: false; error: string };

/**
 * Tanya SOP ke Knowledge Base.
 * Default: search lokal. Jika AI enabled di Settings → ringkas jawaban dari hit KB.
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

    const normalizedHits: KbSearchHit[] =
      audience === "admin"
        ? hits.map((h) => ({ ...h, href: `/admin/kb?highlight=${h.id}` }))
        : hits;

    let { answer, lowConfidence } = buildKbReply(normalizedHits, question);
    let aiEnhanced = false;

    const { getAiSettings } = await import("@/lib/app-settings");
    const aiCfg = await getAiSettings();
    if (aiCfg.enabled && aiCfg.api_key && normalizedHits.length > 0) {
      const context = normalizedHits
        .map(
          (h, i) =>
            `[${i + 1}] ${h.title} (${h.category})\n${h.excerpt}`
        )
        .join("\n\n");
      const { chatCompletion } = await import("@/lib/ai");
      const ai = await chatCompletion({
        messages: [
          {
            role: "system",
            content:
              "Anda asisten SOP FE-Track. Jawab singkat dalam Bahasa Indonesia hanya berdasarkan konteks KB. Jika tidak cukup, bilang data KB kurang. Jangan mengarang prosedur berbahaya.",
          },
          {
            role: "user",
            content: `Pertanyaan: ${question}\n\nKonteks KB:\n${context}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
      });
      if (ai.ok) {
        answer = ai.content;
        lowConfidence = false;
        aiEnhanced = true;
      }
    }

    return {
      success: true,
      answer,
      lowConfidence,
      hits: normalizedHits,
      categoryUsed: input.category?.trim() || null,
      ai_enhanced: aiEnhanced,
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
