"use server";

import { revalidatePath } from "next/cache";
import { Prisma, Role, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import {
  assignEngineerSchema,
  createTicketSchema,
  updateTicketStatusSchema,
  type AssignEngineerInput,
  type CreateTicketInput,
  type UpdateTicketStatusInput,
} from "@/lib/validations/tickets";
import {
  createTicketRecord,
  resolveCreateTicketInput,
  ticketDetailInclude,
  ticketListInclude,
} from "@/lib/tickets/service";

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

async function requireAdmin() {
  const session = await requireSession();
  if (!(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getTickets(params: {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params.pageSize ?? 15));
  const q = params.q?.trim();

  const where: Prisma.TicketWhereInput = {
    AND: [
      params.status ? { status: params.status as TicketStatus } : {},
      q
        ? {
            OR: [
              { ticket_no: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { tenant: { name: { contains: q, mode: "insensitive" } } },
              { tenant: { code: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };

  const [total, items] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      include: ticketListInclude,
      orderBy: [{ created_at: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
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

export async function getTicketById(id: string) {
  await requireAdmin();
  return prisma.ticket.findUnique({
    where: { id },
    include: ticketDetailInclude,
  });
}

export async function getAssignableEngineers() {
  await requireAdmin();
  return prisma.user.findMany({
    where: { role: Role.FIELD_ENGINEER },
    select: {
      id: true,
      full_name: true,
      phone: true,
      status: true,
      city: true,
      skills: true,
    },
    orderBy: [{ status: "asc" }, { full_name: "asc" }],
  });
}

export async function createTicketAction(
  input: CreateTicketInput
): Promise<ActionResult<{ id: string; ticket_no: string }>> {
  try {
    const session = await requireAdmin();
    const parsed = createTicketSchema.parse(input);
    const resolved = await resolveCreateTicketInput(parsed);
    const ticket = await createTicketRecord({
      ...resolved,
      changed_by: session.user.id,
    });

    revalidatePath("/admin/tickets");
    return {
      success: true,
      data: { id: ticket.id, ticket_no: ticket.ticket_no },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal membuat ticket",
    };
  }
}

export async function updateTicketStatusAction(
  input: UpdateTicketStatusInput
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const parsed = updateTicketStatusSchema.parse(input);

    const ticket = await prisma.ticket.findUnique({
      where: { id: parsed.ticket_id },
      include: { device: true },
    });
    if (!ticket) {
      return { success: false, error: "Ticket tidak ditemukan" };
    }

    // Conflict resolve untuk offline sync
    if (
      parsed.expected_from_status &&
      ticket.status !== parsed.expected_from_status
    ) {
      const ORDER: TicketStatus[] = [
        TicketStatus.OPEN,
        TicketStatus.ASSIGNED,
        TicketStatus.ON_THE_WAY,
        TicketStatus.ON_SITE,
        TicketStatus.IN_PROGRESS,
        TicketStatus.PENDING_SPAREPART,
        TicketStatus.PENDING_L1,
        TicketStatus.ESCALATED,
        TicketStatus.PENDING_REVIEW,
        TicketStatus.RESOLVED,
        TicketStatus.CLOSED,
      ];
      const curIdx = ORDER.indexOf(ticket.status);
      const targetIdx = ORDER.indexOf(parsed.status);
      // Server sudah lebih maju dari target → conflict (drop offline action)
      if (
        ticket.status === TicketStatus.RESOLVED ||
        ticket.status === TicketStatus.CLOSED ||
        (curIdx >= 0 && targetIdx >= 0 && curIdx >= targetIdx)
      ) {
        return {
          success: false,
          error: `CONFLICT: status sudah ${ticket.status}, aksi offline ${parsed.expected_from_status}→${parsed.status} dibatalkan`,
        };
      }
    }

    const isAdmin = (ADMIN_ROLES as readonly string[]).includes(session.user.role);
    const isOwner =
      session.user.role === Role.FIELD_ENGINEER &&
      ticket.assigned_engineer_id === session.user.id;

    if (!isAdmin && !isOwner) {
      return { success: false, error: "Tidak berhak update ticket ini" };
    }

    if (session.user.role === Role.FIELD_ENGINEER) {
      const { eligibleForWork, eligibilityMessage } = await import(
        "@/lib/eligibility"
      );
      const elig = await eligibleForWork(session.user.id);
      if (!elig.ok) {
        return {
          success: false,
          error: eligibilityMessage(elig.reason),
        };
      }
    }

    // Wajib checklist lengkap sebelum RESOLVED (khusus SDWAN & EDC dinamis)
    if (
      parsed.status === TicketStatus.RESOLVED &&
      session.user.role === Role.FIELD_ENGINEER
    ) {
      const {
        resolveChecklistKey,
        isChecklistComplete,
        isSdwanDevice,
      } = await import("@/lib/checklists");
      const key = resolveChecklistKey({
        device_category: ticket.device?.device_category,
        device_type: ticket.device?.type,
        ticket_type: ticket.type,
        description: ticket.description,
      });
      const raw = ticket.sdwan_checklist as
        | { answers?: Record<string, { checked?: boolean; value?: string; photo_url?: string }> }
        | null;
      // SDWAN selalu wajib; EDC checklist juga jika ada device
      if (isSdwanDevice(ticket.device?.device_category, ticket.device?.type) || ticket.device) {
        const check = isChecklistComplete(key, raw?.answers);
        if (!check.ok) {
          return {
            success: false,
            error: `Checklist belum lengkap: ${check.missing.slice(0, 3).join(", ")}${check.missing.length > 3 ? "…" : ""}`,
          };
        }
      }
    }

    const now = new Date();
    const data: Prisma.TicketUpdateInput = {
      status: parsed.status,
    };

    if (parsed.status === TicketStatus.ASSIGNED && !ticket.response_at) {
      data.response_at = now;
    }

    // Engineer accept = keluar dari ASSIGNED (ON_THE_WAY dst) → stop re-dispatch cron
    const acceptStatuses: TicketStatus[] = [
      TicketStatus.ON_THE_WAY,
      TicketStatus.ON_SITE,
      TicketStatus.IN_PROGRESS,
      TicketStatus.PENDING_SPAREPART,
      TicketStatus.RESOLVED,
      TicketStatus.CLOSED,
    ];
    if (
      ticket.status === TicketStatus.ASSIGNED &&
      acceptStatuses.includes(parsed.status) &&
      !ticket.accepted_at
    ) {
      data.accepted_at = now;
    }

    if (
      (parsed.status === TicketStatus.RESOLVED ||
        parsed.status === TicketStatus.CLOSED) &&
      !ticket.resolved_at
    ) {
      data.resolved_at = now;
    }

    // Engineer suspended tidak boleh resolve
    if (
      session.user.role === Role.FIELD_ENGINEER &&
      (parsed.status === TicketStatus.RESOLVED ||
        parsed.status === TicketStatus.CLOSED)
    ) {
      const eng = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { is_suspended: true },
      });
      if (eng?.is_suspended) {
        return { success: false, error: "Akun kamu sedang di-suspend" };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data,
      });

      await tx.ticketLog.create({
        data: {
          ticket_id: ticket.id,
          status_from: ticket.status,
          status_to: parsed.status,
          changed_by: session.user.id,
          notes:
            parsed.notes ||
            (data.accepted_at ? "Engineer accept ticket" : null),
          lat: parsed.lat ?? null,
          lng: parsed.lng ?? null,
          photo_url: parsed.photo_url ?? [],
          photo_hash: parsed.photo_hash ?? null,
          exif_lat: parsed.exif_lat ?? null,
          exif_lng: parsed.exif_lng ?? null,
          exif_timestamp: parsed.exif_timestamp
            ? new Date(parsed.exif_timestamp)
            : null,
        },
      });
    });

    // Push status ke customer ITSM jika ticket dari Open API
    void import("@/lib/webhook").then(({ triggerExternalWebhook }) =>
      triggerExternalWebhook(ticket.id, parsed.status)
    );

    // Anti-fraud + komisi saat RESOLVED/CLOSED
    if (
      parsed.status === TicketStatus.RESOLVED ||
      parsed.status === TicketStatus.CLOSED
    ) {
      void (async () => {
        try {
          const { runAntiFraudCheck } = await import("@/lib/antifraud");
          const fraud = await runAntiFraudCheck(ticket.id);

          const engPay = ticket.assigned_engineer_id
            ? await prisma.user.findUnique({
                where: { id: ticket.assigned_engineer_id },
                select: { engagement_type: true },
              })
            : null;
          const isMitraPay = engPay?.engagement_type === "MITRA";

          if (fraud.hold_commission) {
            if (isMitraPay) {
              // Mitra: tahan komisi wallet via PENDING_REVIEW
              await prisma.ticket.update({
                where: { id: ticket.id },
                data: { status: TicketStatus.PENDING_REVIEW },
              });
              await prisma.ticketLog.create({
                data: {
                  ticket_id: ticket.id,
                  status_from: TicketStatus.RESOLVED,
                  status_to: TicketStatus.PENDING_REVIEW,
                  notes: `Anti-fraud hold: flags=${fraud.flags.join(",") || "-"} score=${fraud.score}. Komisi ditahan.`,
                  photo_url: [],
                },
              });
              console.warn(
                `[antifraud] Ticket ${ticket.ticket_no} → PENDING_REVIEW (hold commission)`
              );
              return;
            }

            // PKWT: flag di ticket log saja (bukan hold wallet / PENDING_REVIEW)
            await prisma.ticketLog.create({
              data: {
                ticket_id: ticket.id,
                status_from: parsed.status,
                status_to: parsed.status,
                notes: `Anti-fraud flag (PKWT/HR): flags=${fraud.flags.join(",") || "-"} score=${fraud.score}. Tidak ada hold komisi wallet.`,
                photo_url: [],
              },
            });
          }

          const { processCommissionForTicket } = await import("@/lib/commission");
          await processCommissionForTicket(ticket.id);

          if (isMitraPay) {
            const { recalculateLeaderboard } = await import("@/lib/leaderboard");
            void recalculateLeaderboard("month");
            void recalculateLeaderboard("all_time");
          }
        } catch (e) {
          console.error("[resolve antifraud/commission]", e);
        }
      })();
    }

    revalidatePath("/admin/tickets");
    revalidatePath(`/admin/tickets/${ticket.id}`);
    revalidatePath("/engineer/my-tickets");
    revalidatePath(`/engineer/tickets/${ticket.id}`);
    revalidatePath("/engineer/history");
    revalidatePath("/engineer/wallet");
    revalidatePath("/admin/payroll");
    revalidatePath("/admin/fraud-center");
    revalidatePath("/admin/leaderboard");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal update status",
    };
  }
}

export async function pauseSlaClockAction(input: {
  ticket_id: string;
  reason: string;
}): Promise<ActionResult<{ pending_approval?: boolean }>> {
  try {
    const session = await requireAdmin();
    const reason = input.reason?.trim();
    if (!reason || reason.length < 5) {
      return { success: false, error: "Alasan stop clock minimal 5 karakter" };
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: input.ticket_id },
    });
    if (!ticket) return { success: false, error: "Ticket tidak ditemukan" };
    if (!ticket.sla_due_at) {
      return { success: false, error: "Ticket tidak punya SLA due" };
    }
    if (ticket.sla_paused_at) {
      return { success: false, error: "SLA sudah di-pause" };
    }
    if (ticket.stop_clock_approval_status === "PENDING") {
      return { success: false, error: "Menunggu approve L1 untuk stop clock" };
    }
    if (
      ticket.status === TicketStatus.RESOLVED ||
      ticket.status === TicketStatus.CLOSED
    ) {
      return { success: false, error: "Ticket sudah selesai" };
    }

    const {
      needsStopClockApproval,
      canApproveStopClock,
    } = await import("@/lib/stop-clock");
    const now = new Date();

    // Pause bank sudah ≥ threshold → non-L1 harus minta approve dulu
    if (needsStopClockApproval(session.user.role, ticket.sla_paused_total_ms)) {
      await prisma.$transaction(async (tx) => {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            stop_clock_reason: reason,
            stop_clock_approval_status: "PENDING",
            stop_clock_requested_at: now,
            stop_clock_requested_by: session.user.id,
            stop_clock_approved_by: null,
            stop_clock_approved_at: null,
          },
        });
        await tx.ticketLog.create({
          data: {
            ticket_id: ticket.id,
            status_from: ticket.status,
            status_to: ticket.status,
            changed_by: session.user.id,
            notes: `STOP CLOCK REQUEST (butuh L1): ${reason}`,
            photo_url: [],
          },
        });
      });

      void import("@/lib/notifications").then(({ notifyStopClockApprovalRequest }) =>
        notifyStopClockApprovalRequest({
          id: ticket.id,
          ticket_no: ticket.ticket_no,
          reason,
        })
      );

      revalidatePath("/admin/tickets");
      revalidatePath(`/admin/tickets/${ticket.id}`);
      revalidatePath("/admin/routing");
      return { success: true, data: { pending_approval: true } };
    }

    const approvedByApprover = canApproveStopClock(session.user.role);

    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          sla_paused_at: now,
          stop_clock_reason: reason,
          stop_clock_approval_status: approvedByApprover ? "APPROVED" : null,
          stop_clock_requested_at: null,
          stop_clock_requested_by: null,
          stop_clock_approved_by: approvedByApprover ? session.user.id : null,
          stop_clock_approved_at: approvedByApprover ? now : null,
        },
      });
      await tx.ticketLog.create({
        data: {
          ticket_id: ticket.id,
          status_from: ticket.status,
          status_to: ticket.status,
          changed_by: session.user.id,
          notes: `STOP CLOCK: ${reason}`,
          photo_url: [],
        },
      });
    });

    void import("@/lib/notifications").then(({ notifyStopClock }) =>
      notifyStopClock({
        id: ticket.id,
        ticket_no: ticket.ticket_no,
        paused: true,
        reason,
        engineerId: ticket.assigned_engineer_id,
      })
    );

    revalidatePath("/admin/tickets");
    revalidatePath(`/admin/tickets/${ticket.id}`);
    revalidatePath("/admin/routing");
    return { success: true, data: { pending_approval: false } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal stop clock",
    };
  }
}

export async function approveStopClockAction(input: {
  ticket_id: string;
  notes?: string | null;
}): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const { canApproveStopClock } = await import("@/lib/stop-clock");
    if (!canApproveStopClock(session.user.role)) {
      return { success: false, error: "Hanya L1 / Admin yang boleh approve" };
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: input.ticket_id },
    });
    if (!ticket) return { success: false, error: "Ticket tidak ditemukan" };
    if (ticket.stop_clock_approval_status !== "PENDING") {
      return { success: false, error: "Tidak ada request stop clock pending" };
    }
    if (ticket.sla_paused_at) {
      return { success: false, error: "SLA sudah di-pause" };
    }
    if (!ticket.sla_due_at) {
      return { success: false, error: "Ticket tidak punya SLA due" };
    }

    const reason = ticket.stop_clock_reason ?? "Approved by L1";
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          sla_paused_at: now,
          stop_clock_approval_status: "APPROVED",
          stop_clock_approved_by: session.user.id,
          stop_clock_approved_at: now,
        },
      });
      await tx.ticketLog.create({
        data: {
          ticket_id: ticket.id,
          status_from: ticket.status,
          status_to: ticket.status,
          changed_by: session.user.id,
          notes:
            input.notes?.trim() ||
            `STOP CLOCK APPROVED: ${reason}`,
          photo_url: [],
        },
      });
    });

    void import("@/lib/notifications").then(({ notifyStopClock }) =>
      notifyStopClock({
        id: ticket.id,
        ticket_no: ticket.ticket_no,
        paused: true,
        reason,
        engineerId: ticket.assigned_engineer_id,
      })
    );

    revalidatePath("/admin/tickets");
    revalidatePath(`/admin/tickets/${ticket.id}`);
    revalidatePath("/admin/routing");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal approve stop clock",
    };
  }
}

export async function rejectStopClockAction(input: {
  ticket_id: string;
  notes?: string | null;
}): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const { canApproveStopClock } = await import("@/lib/stop-clock");
    if (!canApproveStopClock(session.user.role)) {
      return { success: false, error: "Hanya L1 / Admin yang boleh reject" };
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: input.ticket_id },
    });
    if (!ticket) return { success: false, error: "Ticket tidak ditemukan" };
    if (ticket.stop_clock_approval_status !== "PENDING") {
      return { success: false, error: "Tidak ada request stop clock pending" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          stop_clock_approval_status: "REJECTED",
          stop_clock_reason: null,
          stop_clock_approved_by: session.user.id,
          stop_clock_approved_at: new Date(),
        },
      });
      await tx.ticketLog.create({
        data: {
          ticket_id: ticket.id,
          status_from: ticket.status,
          status_to: ticket.status,
          changed_by: session.user.id,
          notes:
            input.notes?.trim() ||
            "STOP CLOCK REJECTED oleh L1",
          photo_url: [],
        },
      });
    });

    revalidatePath("/admin/tickets");
    revalidatePath(`/admin/tickets/${ticket.id}`);
    revalidatePath("/admin/routing");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal reject stop clock",
    };
  }
}

export async function resumeSlaClockAction(input: {
  ticket_id: string;
  notes?: string | null;
}): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const ticket = await prisma.ticket.findUnique({
      where: { id: input.ticket_id },
    });
    if (!ticket) return { success: false, error: "Ticket tidak ditemukan" };
    if (!ticket.sla_paused_at || !ticket.sla_due_at) {
      return { success: false, error: "Ticket tidak sedang di-pause" };
    }

    const { computeResumeSlaDueAt } = await import("@/lib/stop-clock");
    const now = new Date();
    const resumed = computeResumeSlaDueAt(ticket, now);
    const pauseMin = Math.round(resumed.pause_ms / 60_000);

    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          sla_due_at: resumed.sla_due_at,
          sla_paused_at: null,
          sla_paused_total_ms: resumed.sla_paused_total_ms,
          stop_clock_reason: null,
          stop_clock_approval_status: null,
          stop_clock_requested_at: null,
          stop_clock_requested_by: null,
        },
      });
      await tx.ticketLog.create({
        data: {
          ticket_id: ticket.id,
          status_from: ticket.status,
          status_to: ticket.status,
          changed_by: session.user.id,
          notes:
            input.notes?.trim() ||
            `RESUME CLOCK: pause ${pauseMin} mnt, due digeser`,
          photo_url: [],
        },
      });
    });

    void import("@/lib/notifications").then(({ notifyStopClock }) =>
      notifyStopClock({
        id: ticket.id,
        ticket_no: ticket.ticket_no,
        paused: false,
        engineerId: ticket.assigned_engineer_id,
      })
    );

    revalidatePath("/admin/tickets");
    revalidatePath(`/admin/tickets/${ticket.id}`);
    revalidatePath("/admin/routing");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal resume clock",
    };
  }
}

export async function assignEngineerAction(
  input: AssignEngineerInput
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = assignEngineerSchema.parse(input);

    const [ticket, engineer] = await Promise.all([
      prisma.ticket.findUnique({
        where: { id: parsed.ticket_id },
        include: {
          service_category: true,
          device: { include: { service_category: true } },
        },
      }),
      prisma.user.findFirst({
        where: { id: parsed.engineer_id, role: Role.FIELD_ENGINEER },
      }),
    ]);

    if (!ticket) return { success: false, error: "Ticket tidak ditemukan" };
    if (!engineer) return { success: false, error: "Engineer tidak ditemukan" };

    const {
      eligibleForWork,
      eligibilityMessage,
      isPkwtEngagement,
    } = await import("@/lib/eligibility");
    const workElig = await eligibleForWork(engineer.id);
    if (!workElig.ok) {
      return {
        success: false,
        error: eligibilityMessage(workElig.reason),
      };
    }

    // PKWT: manual assign wajib sama ketat dengan auto-dispatch (placement)
    if (isPkwtEngagement(engineer.engagement_type)) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: ticket.tenant_id },
        select: { id: true, city: true, name: true },
      });
      if (!tenant) {
        return { success: false, error: "Tenant ticket tidak ditemukan" };
      }

      const nowPlacement = new Date();
      const activeContracts = await prisma.engineerContract.findMany({
        where: {
          user_id: engineer.id,
          status: "ACTIVE",
          start_at: { lte: nowPlacement },
          end_at: { gte: nowPlacement },
        },
        select: {
          placement_cities: true,
          placement_tenant_ids: true,
          client_label: true,
        },
      });
      const { matchesPlacement } = await import("@/lib/contracts");
      const inPlacement = activeContracts.some((c) =>
        matchesPlacement(c, tenant)
      );
      if (!inPlacement) {
        return {
          success: false,
          error:
            "Engineer PKWT di luar placement kontrak (kota/tenant) untuk ticket ini",
        };
      }
    }

    const { resolveTicketCategory, assertEngineerEligibleForTicket } =
      await import("@/lib/skill-match");
    const { categoryCode, requiresCertification } = await resolveTicketCategory({
      service_category: ticket.service_category
        ? {
            code: ticket.service_category.code,
            requires_certification: ticket.service_category.requires_certification,
          }
        : null,
      device: ticket.device
        ? {
            type: ticket.device.type,
            service_category: ticket.device.service_category
              ? {
                  code: ticket.device.service_category.code,
                  requires_certification:
                    ticket.device.service_category.requires_certification,
                }
              : null,
          }
        : null,
    });

    // Jika service_category belum di-include penuh, fetch category
    let catCode = categoryCode;
    let reqCert = requiresCertification;
    if (!catCode && ticket.service_category_id) {
      const cat = await prisma.serviceCategory.findUnique({
        where: { id: ticket.service_category_id },
      });
      if (cat) {
        catCode = cat.code;
        reqCert = cat.requires_certification || cat.code === "SDWAN";
      }
    }

    const eligibility = await assertEngineerEligibleForTicket({
      engineerId: engineer.id,
      skills: engineer.skills,
      categoryCode: catCode,
      requiresCertification: reqCert,
      trustScore: engineer.trust_score,
    });
    if (!eligibility.ok) {
      return { success: false, error: eligibility.error };
    }

    const now = new Date();
    const tried = Array.from(
      new Set([...ticket.tried_engineer_ids, engineer.id])
    );

    await prisma.$transaction(async (tx) => {
      if (
        ticket.assigned_engineer_id &&
        ticket.assigned_engineer_id !== engineer.id
      ) {
        await tx.user.update({
          where: { id: ticket.assigned_engineer_id },
          data: { status: "AVAILABLE" },
        });
      }

      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          assigned_engineer_id: engineer.id,
          status: TicketStatus.ASSIGNED,
          response_at: ticket.response_at ?? now,
          last_assigned_at: now,
          accepted_at: null,
          dispatch_attempts: ticket.dispatch_attempts + 1,
          tried_engineer_ids: tried,
        },
      });

      await tx.user.update({
        where: { id: engineer.id },
        data: { status: "BUSY" },
      });

      await tx.ticketLog.create({
        data: {
          ticket_id: ticket.id,
          status_from: ticket.status,
          status_to: TicketStatus.ASSIGNED,
          changed_by: session.user.id,
          notes:
            parsed.notes ||
            `Manual assign ke ${engineer.full_name} (${engineer.phone})`,
          photo_url: [],
        },
      });
    });

    // Notifikasi WA ke engineer
    try {
      const { sendWhatsApp, buildDispatchMessage } = await import("@/lib/whatsapp");
      const full = await prisma.ticket.findUnique({
        where: { id: ticket.id },
        include: { tenant: true },
      });
      if (full) {
        await sendWhatsApp({
          phone: engineer.phone,
          message: buildDispatchMessage(full.ticket_no, full.tenant.name),
        });
        void import("@/lib/notifications").then(({ notifyAssigned }) =>
          notifyAssigned(engineer.id, {
            id: full.id,
            ticket_no: full.ticket_no,
            tenantName: full.tenant.name,
          })
        );
      }
    } catch (e) {
      console.error("[assign] WA gagal:", e);
    }

    void import("@/lib/webhook").then(({ triggerExternalWebhook }) =>
      triggerExternalWebhook(ticket.id, TicketStatus.ASSIGNED)
    );

    revalidatePath("/admin/tickets");
    revalidatePath(`/admin/tickets/${ticket.id}`);
    revalidatePath("/admin/engineers");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal assign engineer",
    };
  }
}
