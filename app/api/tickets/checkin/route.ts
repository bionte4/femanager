import { NextRequest, NextResponse } from "next/server";
import { Role, TicketStatus } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { haversineDistanceMeters } from "@/lib/haversine";

const bodySchema = z.object({
  ticket_id: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const CHECKIN_RADIUS_M = 100;

/**
 * POST /api/tickets/checkin
 * Validasi GPS engineer dalam radius 100m dari tenant → set ON_SITE
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.FIELD_ENGINEER) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid body" },
        { status: 400 }
      );
    }

    const { ticket_id, lat, lng } = parsed.data;

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticket_id,
        assigned_engineer_id: session.user.id,
      },
      include: { tenant: true },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Ticket tidak ditemukan" },
        { status: 404 }
      );
    }

    if (
      ticket.status !== TicketStatus.ON_THE_WAY &&
      ticket.status !== TicketStatus.ASSIGNED
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Status ${ticket.status} tidak bisa check-in. Harus ON_THE_WAY dulu.`,
        },
        { status: 400 }
      );
    }

    const distance = Math.round(
      haversineDistanceMeters(lat, lng, ticket.tenant.lat, ticket.tenant.lng)
    );

    if (distance > CHECKIN_RADIUS_M) {
      return NextResponse.json(
        {
          success: false,
          error: `Kamu belum di lokasi, jarak ${distance} meter`,
          distance_meters: distance,
          max_meters: CHECKIN_RADIUS_M,
        },
        { status: 400 }
      );
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.ON_SITE,
          accepted_at: ticket.accepted_at ?? now,
        },
      });

      await tx.user.update({
        where: { id: session.user.id },
        data: { lat, lng },
      });

      await tx.ticketLog.create({
        data: {
          ticket_id: ticket.id,
          status_from: ticket.status,
          status_to: TicketStatus.ON_SITE,
          changed_by: session.user.id,
          notes: `Check-in OK · jarak ${distance}m dari tenant`,
          lat,
          lng,
          photo_url: [],
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        distance_meters: distance,
        status: TicketStatus.ON_SITE,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
