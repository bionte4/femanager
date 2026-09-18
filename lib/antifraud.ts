import {
  FraudSeverity,
  FraudType,
  TicketStatus,
  TicketType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { haversineDistanceMeters } from "@/lib/haversine";
import {
  hashPhotoFromPublicUrl,
  readExifGpsFromPublicUrl,
} from "@/lib/exif";

export type AntiFraudResult = {
  is_fraud: boolean;
  score: number;
  flags: string[];
  hold_commission: boolean;
};

type CreatedFraud = {
  type: FraudType;
  severity: FraudSeverity;
  description: string;
  metadata?: Record<string, unknown>;
};

/**
 * Deteksi mismatch EXIF GPS foto vs lat/lng check-in
 */
export async function checkFakeGPS(params: {
  engineerId: string;
  ticketId: string;
  lat: number | null;
  lng: number | null;
  photoUrls: string[];
}): Promise<CreatedFraud[]> {
  const flags: CreatedFraud[] = [];
  const { lat, lng, photoUrls } = params;

  if ((lat === 0 && lng === 0) || (lat == null && lng == null)) {
    // skip — handled elsewhere if needed
  }

  for (const url of photoUrls) {
    const exif = await readExifGpsFromPublicUrl(url);
    if (exif.lat == null || exif.lng == null) {
      flags.push({
        type: FraudType.FAKE_GPS,
        severity: FraudSeverity.LOW,
        description: `Foto ${url.split("/").pop()} tanpa EXIF GPS (GPS HP mungkin off)`,
        metadata: { photo_url: url, claimed_lat: lat, claimed_lng: lng },
      });
      continue;
    }

    if (lat != null && lng != null) {
      const dist = haversineDistanceMeters(lat, lng, exif.lat, exif.lng);
      if (dist > 500) {
        flags.push({
          type: FraudType.PHOTO_GPS_MISMATCH,
          severity: FraudSeverity.HIGH,
          description: `EXIF foto beda ${Math.round(dist)}m dari lokasi check-in`,
          metadata: {
            photo_url: url,
            claimed_lat: lat,
            claimed_lng: lng,
            exif_lat: exif.lat,
            exif_lng: exif.lng,
            distance_meter: Math.round(dist),
          },
        });
      }
    }
  }

  return flags;
}

/**
 * Deteksi foto yang pernah dipakai engineer di ticket lain (30 hari)
 */
export async function checkPhotoDuplicate(params: {
  engineerId: string;
  ticketId: string;
  photoUrls: string[];
}): Promise<CreatedFraud[]> {
  const flags: CreatedFraud[] = [];

  for (const url of params.photoUrls) {
    const hash = await hashPhotoFromPublicUrl(url);
    if (!hash) continue;

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dup = await prisma.ticketLog.findFirst({
      where: {
        photo_hash: hash,
        ticket_id: { not: params.ticketId },
        created_at: { gte: since },
        ticket: { assigned_engineer_id: params.engineerId },
      },
      include: { ticket: { select: { ticket_no: true } } },
    });

    if (dup) {
      flags.push({
        type: FraudType.PHOTO_DUPLICATE,
        severity: FraudSeverity.HIGH,
        description: `Foto sama pernah dipakai di ticket ${dup.ticket.ticket_no}`,
        metadata: {
          photo_url: url,
          photo_hash: hash,
          previous_ticket_no: dup.ticket.ticket_no,
          previous_ticket_id: dup.ticket_id,
        },
      });
    }
  }

  return flags;
}

/**
 * Deteksi resolve terlalu cepat / anomali waktu perjalanan
 */
export async function checkFastCheckin(ticketId: string): Promise<CreatedFraud[]> {
  const flags: CreatedFraud[] = [];
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      tenant: true,
      device: true,
      logs: { orderBy: { created_at: "asc" } },
    },
  });
  if (!ticket) return flags;

  const onSite = ticket.logs.find((l) => l.status_to === TicketStatus.ON_SITE);
  const onWay = ticket.logs.find((l) => l.status_to === TicketStatus.ON_THE_WAY);
  const resolved =
    ticket.logs.find((l) => l.status_to === TicketStatus.RESOLVED) ||
    ticket.logs[ticket.logs.length - 1];

  if (onSite && ticket.resolved_at) {
    const durMin =
      (ticket.resolved_at.getTime() - onSite.created_at.getTime()) / 60_000;
    const isEdc =
      ticket.type === TicketType.INCIDENT &&
      !!ticket.device?.type.startsWith("EDC");
    if (isEdc && durMin < 5) {
      flags.push({
        type: FraudType.FAST_CHECKIN,
        severity: FraudSeverity.MEDIUM,
        description: `INCIDENT EDC resolved ${durMin.toFixed(1)} menit setelah ON_SITE (<5 mnt)`,
        metadata: { duration_minutes: durMin },
      });
    }

    // SDWAN install/troubleshoot < 20 menit di site → HIGH
    const isSdwan =
      ticket.device?.device_category === "ROUTER_SDWAN" ||
      ticket.device?.type === "ROUTER_SDWAN";
    if (isSdwan && durMin < 20) {
      flags.push({
        type: FraudType.FAST_CHECKIN,
        severity: FraudSeverity.HIGH,
        description: `Ticket SDWAN resolved ${durMin.toFixed(1)} menit setelah ON_SITE (<20 mnt — tidak wajar)`,
        metadata: { duration_minutes: durMin, device_category: "ROUTER_SDWAN" },
      });
    }
  }

  // SDWAN wajib foto speedtest & tunnel status di checklist
  {
    const isSdwan =
      ticket.device?.device_category === "ROUTER_SDWAN" ||
      ticket.device?.type === "ROUTER_SDWAN";
    if (isSdwan) {
      const raw = ticket.sdwan_checklist as
        | { answers?: Record<string, { photo_url?: string }> }
        | null;
      const answers = raw?.answers ?? {};
      const needPhotos = ["foto_speedtest", "foto_tunnel", "foto_tunnel_id", "foto_error"];
      const hasEvidence = needPhotos.some((id) => !!answers[id]?.photo_url);
      if (!hasEvidence) {
        flags.push({
          type: FraudType.FAKE_GPS,
          severity: FraudSeverity.HIGH,
          description:
            "Ticket SDWAN tanpa foto speedtest/tunnel status — komisi ditahan",
          metadata: { missing_sdwan_photos: true },
        });
      }
    }
  }

  if (onWay && onSite && onWay.lat != null && onWay.lng != null) {
    const dist = haversineDistanceMeters(
      onWay.lat,
      onWay.lng,
      ticket.tenant.lat,
      ticket.tenant.lng
    );
    const travelMin =
      (onSite.created_at.getTime() - onWay.created_at.getTime()) / 60_000;
    if (dist > 20_000 && travelMin < 5) {
      flags.push({
        type: FraudType.TIME_ANOMALY,
        severity: FraudSeverity.HIGH,
        description: `Jarak ${Math.round(dist / 1000)}km tapi ON_THE_WAY→ON_SITE hanya ${travelMin.toFixed(1)} menit`,
        metadata: {
          distance_meter: Math.round(dist),
          travel_minutes: travelMin,
        },
      });
    }
  }

  // LOCATION_JUMP: check-in 0,0 atau sama persis dengan log ticket lain dalam 5 menit
  const checkinLog = onSite;
  if (checkinLog?.lat != null && checkinLog.lng != null) {
    if (checkinLog.lat === 0 && checkinLog.lng === 0) {
      flags.push({
        type: FraudType.LOCATION_JUMP,
        severity: FraudSeverity.HIGH,
        description: "Check-in di koordinat 0,0 (invalid GPS)",
        metadata: { claimed_lat: 0, claimed_lng: 0 },
      });
    } else if (ticket.assigned_engineer_id) {
      const windowStart = new Date(checkinLog.created_at.getTime() - 5 * 60_000);
      const windowEnd = new Date(checkinLog.created_at.getTime() + 5 * 60_000);
      const other = await prisma.ticketLog.findFirst({
        where: {
          ticket_id: { not: ticketId },
          changed_by: ticket.assigned_engineer_id,
          status_to: TicketStatus.ON_SITE,
          created_at: { gte: windowStart, lte: windowEnd },
          lat: checkinLog.lat,
          lng: checkinLog.lng,
        },
        include: {
          ticket: { include: { tenant: { select: { lat: true, lng: true, name: true } } } },
        },
      });
      if (other) {
        const tenantDist = haversineDistanceMeters(
          ticket.tenant.lat,
          ticket.tenant.lng,
          other.ticket.tenant.lat,
          other.ticket.tenant.lng
        );
        if (tenantDist > 5000) {
          flags.push({
            type: FraudType.LOCATION_JUMP,
            severity: FraudSeverity.HIGH,
            description: `GPS check-in sama persis dengan ticket lain dalam 5 menit, tenant berjarak ${Math.round(tenantDist / 1000)}km`,
            metadata: {
              claimed_lat: checkinLog.lat,
              claimed_lng: checkinLog.lng,
              other_ticket_id: other.ticket_id,
              tenant_distance_m: Math.round(tenantDist),
            },
          });
        }
      }
    }
  }

  return flags;
}

export function calculateSystemScore(
  ticket: {
    sla_due_at: Date | null;
    resolved_at: Date | null;
    created_at: Date;
    description?: string;
  },
  fraudFlags: CreatedFraud[],
  notesLength: number,
  photoCount: number
): number {
  let score = 100;
  for (const f of fraudFlags) {
    if (f.severity === FraudSeverity.HIGH) score -= 20;
    else if (f.severity === FraudSeverity.MEDIUM) score -= 10;
    else score -= 5;
  }

  const breached =
    ticket.sla_due_at != null &&
    ticket.resolved_at != null &&
    ticket.resolved_at.getTime() > ticket.sla_due_at.getTime();
  if (breached) score -= 15;

  if (photoCount >= 2 && notesLength > 20) score += 10;

  if (
    ticket.sla_due_at &&
    ticket.resolved_at &&
    ticket.resolved_at.getTime() <= ticket.sla_due_at.getTime()
  ) {
    const slaMs = ticket.sla_due_at.getTime() - ticket.created_at.getTime();
    const dur = ticket.resolved_at.getTime() - ticket.created_at.getTime();
    if (slaMs > 0 && dur <= slaMs * 0.5) score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Jalankan semua check anti-fraud saat ticket akan/baru RESOLVED.
 */
export async function runAntiFraudCheck(ticketId: string): Promise<AntiFraudResult> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      logs: { orderBy: { created_at: "asc" } },
      device: true,
    },
  });

  if (!ticket || !ticket.assigned_engineer_id) {
    return { is_fraud: false, score: 100, flags: [], hold_commission: false };
  }

  const engineerId = ticket.assigned_engineer_id;
  const photoUrls = ticket.logs.flatMap((l) => l.photo_url);
  const lastWithGps = [...ticket.logs].reverse().find((l) => l.lat != null && l.lng != null);
  const notes = ticket.logs.map((l) => l.notes ?? "").join(" ");

  const allFlags: CreatedFraud[] = [
    ...(await checkFakeGPS({
      engineerId,
      ticketId,
      lat: lastWithGps?.lat ?? null,
      lng: lastWithGps?.lng ?? null,
      photoUrls,
    })),
    ...(await checkPhotoDuplicate({ engineerId, ticketId, photoUrls })),
    ...(await checkFastCheckin(ticketId)),
  ];

  // Persist FraudLog
  for (const f of allFlags) {
    await prisma.fraudLog.create({
      data: {
        engineer_id: engineerId,
        ticket_id: ticketId,
        type: f.type,
        severity: f.severity,
        description: f.description,
        metadata: (f.metadata as object | undefined) ?? undefined,
      },
    });
  }

  const score = calculateSystemScore(
    ticket,
    allFlags,
    notes.length,
    photoUrls.length
  );
  const flagNames = Array.from(new Set(allFlags.map((f) => f.type)));
  const highCount = allFlags.filter((f) => f.severity === FraudSeverity.HIGH).length;
  const isFraud = highCount > 0 || score < 50;
  const holdCommission = highCount > 0;

  await prisma.engineerRating.upsert({
    where: { ticket_id: ticketId },
    create: {
      engineer_id: engineerId,
      ticket_id: ticketId,
      system_score: score,
      fraud_flags: flagNames,
      is_fraud: isFraud,
    },
    update: {
      system_score: score,
      fraud_flags: flagNames,
      is_fraud: isFraud,
    },
  });

  // Update trust_score = avg 10 ticket terakhir
  const recent = await prisma.engineerRating.findMany({
    where: { engineer_id: engineerId },
    orderBy: { created_at: "desc" },
    take: 10,
  });
  const trust =
    recent.length === 0
      ? 100
      : recent.reduce((s, r) => s + r.system_score, 0) / recent.length;

  await prisma.user.update({
    where: { id: engineerId },
    data: { trust_score: Math.round(trust * 10) / 10 },
  });

  // Auto suspend: >=2 HIGH fraud dalam 7 hari
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const highWeek = await prisma.fraudLog.count({
    where: {
      engineer_id: engineerId,
      severity: FraudSeverity.HIGH,
      created_at: { gte: weekAgo },
    },
  });

  if (highWeek >= 2) {
    await prisma.user.update({
      where: { id: engineerId },
      data: {
        is_suspended: true,
        suspended_reason: `Auto-suspend: ${highWeek} fraud HIGH dalam 7 hari`,
        status: "OFFLINE",
      },
    });
    console.warn(
      `[antifraud] Engineer ${engineerId} auto-suspended (${highWeek} HIGH/7d)`
    );
  }

  return {
    is_fraud: isFraud,
    score,
    flags: flagNames,
    hold_commission: holdCommission,
  };
}
