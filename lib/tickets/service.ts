import {
  Prisma,
  TicketStatus,
  type Priority,
  type TicketType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateTicketNo } from "@/lib/utils/ticket-generator";
import { calculateSlaDueAt } from "@/lib/utils/sla";
import type { CreateTicketInput } from "@/lib/validations/tickets";
import {
  findDuplicateOpenTicket,
  mergeAlertIntoTicket,
} from "@/lib/tickets/dedupe";

export const ticketListInclude = {
  tenant: { select: { id: true, name: true, code: true, city: true, sla_tier: true } },
  device: {
    select: {
      id: true,
      type: true,
      serial_number: true,
      status: true,
      service_category_id: true,
    },
  },
  service_category: {
    select: { id: true, code: true, name: true, icon: true, estimated_duration_minutes: true },
  },
  service_package: {
    select: { id: true, name: true, fee_engineer: true, price_customer: true },
  },
  assigned_engineer: {
    select: { id: true, full_name: true, phone: true, status: true },
  },
} satisfies Prisma.TicketInclude;

export const ticketDetailInclude = {
  ...ticketListInclude,
  tenant: true,
  device: { include: { service_category: true } },
  service_category: true,
  service_package: true,
  rating: true,
  fraud_logs: { orderBy: { created_at: "desc" as const } },
  logs: {
    orderBy: { created_at: "asc" as const },
    include: {
      changer: { select: { id: true, full_name: true, role: true } },
    },
  },
} satisfies Prisma.TicketInclude;

type CreateTicketParams = {
  tenant_id: string;
  device_id?: string | null;
  service_category_id?: string | null;
  service_package_id?: string | null;
  type?: TicketType;
  priority?: Priority;
  description: string;
  reported_by?: string | null;
  changed_by?: string | null;
  source?: string | null;
  required_engineers?: number;
  /** Skip dedupe — admin paksa ticket baru */
  force_new?: boolean;
};

/** Buat ticket + log OPEN + hitung SLA. Alert duplikat → merge. */
export async function createTicketRecord(params: CreateTicketParams) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenant_id },
  });
  if (!tenant) {
    throw new Error("Tenant tidak ditemukan");
  }

  let serviceCategoryId = params.service_category_id || null;
  const servicePackageId = params.service_package_id || null;
  let requiredEngineers = params.required_engineers ?? 1;
  let description = params.description;

  if (params.device_id) {
    const device = await prisma.device.findFirst({
      where: { id: params.device_id, tenant_id: params.tenant_id },
    });
    if (!device) {
      throw new Error("Device tidak ditemukan / bukan milik tenant ini");
    }
    if (!serviceCategoryId && device.service_category_id) {
      serviceCategoryId = device.service_category_id;
    }
  }

  if (servicePackageId) {
    const pkg = await prisma.servicePackage.findUnique({
      where: { id: servicePackageId },
    });
    if (pkg) {
      serviceCategoryId = pkg.service_category_id;
      requiredEngineers = pkg.required_engineers;
      if (!description || description.length < 10) {
        description = pkg.description || pkg.name;
      }
    }
  }

  // Duplicate merge sebelum create
  if (!params.force_new) {
    const dup = await findDuplicateOpenTicket({
      tenant_id: params.tenant_id,
      device_id: params.device_id,
    });
    if (dup) {
      const merged = await mergeAlertIntoTicket({
        existing: dup,
        description,
        priority: params.priority,
        reported_by: params.reported_by,
        source: params.source,
        changed_by: params.changed_by,
      });
      return Object.assign(merged, { merged: true as const });
    }
  }

  const now = new Date();
  const ticket_no = await generateTicketNo(now);
  const sla_due_at = await calculateSlaDueAt(tenant.sla_tier, now);

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.ticket.create({
      data: {
        ticket_no,
        tenant_id: params.tenant_id,
        device_id: params.device_id || null,
        service_category_id: serviceCategoryId,
        service_package_id: servicePackageId,
        type: params.type ?? "INCIDENT",
        priority: params.priority ?? "MEDIUM",
        description,
        reported_by: params.reported_by || null,
        status: TicketStatus.OPEN,
        sla_due_at,
        source: params.source || "ADMIN",
        required_engineers: requiredEngineers,
      },
      include: ticketListInclude,
    });

    await tx.ticketLog.create({
      data: {
        ticket_id: created.id,
        status_from: null,
        status_to: TicketStatus.OPEN,
        changed_by: params.changed_by || null,
        notes: "Ticket dibuat",
        photo_url: [],
      },
    });

    return created;
  });

  // Auto dispatch ke engineer terdekat (non-blocking terhadap create)
  try {
    const { autoDispatchTicket } = await import("@/lib/dispatch");
    await autoDispatchTicket(ticket.id);
  } catch (e) {
    console.error("[createTicket] autoDispatch gagal:", e);
  }

  // Bell notifikasi ke L0 / NOC
  void import("@/lib/notifications").then(({ notifyNewTicket }) =>
    notifyNewTicket({
      id: ticket.id,
      ticket_no: ticket.ticket_no,
      description: ticket.description,
    })
  );

  // Ambil ulang supaya status/engineer terbaru ikut ke response
  const refreshed = await prisma.ticket.findUnique({
    where: { id: ticket.id },
    include: ticketListInclude,
  });

  return Object.assign(refreshed ?? ticket, { merged: false as const });
}

/** Resolve tenant/device dari body API (manual atau webhook) */
export async function resolveCreateTicketInput(input: CreateTicketInput) {
  let tenantId = input.tenant_id ?? "";
  let deviceId = input.device_id ?? null;

  if (input.tenant_code) {
    const tenant = await prisma.tenant.findUnique({
      where: { code: input.tenant_code },
    });
    if (!tenant) {
      throw new Error(`Tenant code tidak ditemukan: ${input.tenant_code}`);
    }
    tenantId = tenant.id;
  }

  if (!tenantId) {
    throw new Error("tenant_id atau tenant_code wajib");
  }

  if (input.device_serial) {
    const device = await prisma.device.findUnique({
      where: { serial_number: input.device_serial },
    });
    if (!device) {
      throw new Error(`Device serial tidak ditemukan: ${input.device_serial}`);
    }
    if (device.tenant_id !== tenantId) {
      throw new Error("Device tidak milik tenant yang dipilih");
    }
    deviceId = device.id;
  }

  return {
    tenant_id: tenantId,
    device_id: deviceId,
    service_category_id: input.service_category_id ?? null,
    service_package_id: input.service_package_id ?? null,
    type: input.type,
    priority: input.priority,
    description: input.description,
    reported_by: input.reported_by ?? null,
    source: input.source ?? "ADMIN",
    required_engineers: input.required_engineers,
  };
}
