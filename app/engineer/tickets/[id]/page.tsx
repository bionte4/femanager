import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Clock, MapPinned } from "lucide-react";
import { getMyTicketById } from "@/app/actions/engineer-tickets";
import { listAvailableSpareparts } from "@/app/actions/spareparts";
import { listKnowledgeBase } from "@/app/actions/sdwan";
import { EngineerTicketActions } from "@/components/engineer/ticket-actions";
import { JobAcceptReject } from "@/components/engineer/job-accept-reject";
import { SdwanChecklistPanel } from "@/components/engineer/sdwan-checklist-panel";
import { CategoryChecklistPanel } from "@/components/engineer/category-checklist-panel";
import { OfflineBadge } from "@/components/engineer/offline-badge";
import { SLACountdown } from "@/components/sla-countdown/sla-countdown";
import { PriorityBadge, TicketStatusBadge } from "@/components/ticket/status-badge";
import { TicketTimeline } from "@/components/ticket/ticket-timeline";
import { PhotoGallery } from "@/components/ticket/photo-gallery";
import { collectLogPhotos } from "@/lib/tickets/photos";
import {
  isSdwanDevice,
  resolveChecklistKey,
  type ChecklistAnswers,
} from "@/lib/checklists";
import { CATEGORY_COLORS } from "@/lib/service-categories";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return [];
}

export default async function EngineerTicketDetailPage({ params }: PageProps) {
  const { id } = await Promise.resolve(params);
  const ticket = await getMyTicketById(id);

  if (!ticket) {
    notFound();
  }

  const { auth } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const { isPkwtEngagement } = await import("@/lib/eligibility");
  const session = await auth();
  const me = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { engagement_type: true },
      })
    : null;
  const allowReject = !(me && isPkwtEngagement(me.engagement_type));

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${ticket.tenant.lat},${ticket.tenant.lng}`;
  const photos = collectLogPhotos(ticket.logs);
  const spareparts = await listAvailableSpareparts();

  const category =
    ticket.service_category ?? ticket.device?.service_category ?? null;
  const categoryCode = category?.code ?? null;

  const sdwan =
    categoryCode === "SDWAN" ||
    isSdwanDevice(ticket.device?.device_category, ticket.device?.type);

  const checklistKey = resolveChecklistKey({
    device_category: ticket.device?.device_category,
    device_type: ticket.device?.type,
    ticket_type: ticket.type,
    description: ticket.description,
  });
  const checklistData = ticket.sdwan_checklist as
    | { answers?: ChecklistAnswers }
    | null;
  const showChecklist =
    ticket.status === "IN_PROGRESS" ||
    ticket.status === "ON_SITE" ||
    ticket.status === "PENDING_SPAREPART";

  const packageChecklist = asStringArray(
    ticket.service_package?.checklist_template
  );
  const categoryChecklist = asStringArray(category?.checklist_template);
  const dynamicItems =
    packageChecklist.length > 0 ? packageChecklist : categoryChecklist;

  const durationMinutes =
    ticket.service_package?.estimated_duration ??
    category?.estimated_duration_minutes ??
    null;

  const photoKeywords =
    categoryCode === "CCTV"
      ? ["rekaman", "pemasangan", "cctv", "sn"]
      : categoryCode === "WIFI"
        ? ["speedtest", "pemasangan"]
        : [];

  const sopArticles = sdwan
    ? await listKnowledgeBase("SDWAN")
    : await listKnowledgeBase("EDC");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/engineer/my-tickets">
            <ArrowLeft className="h-5 w-5" />
            Kembali
          </Link>
        </Button>
        <OfflineBadge />
      </div>

      <div className="space-y-2">
        <p className="font-mono text-base font-bold text-primary">
          {ticket.ticket_no}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <SLACountdown
            dueAt={ticket.sla_due_at}
            pausedAt={ticket.sla_paused_at}
            pausedTotalMs={ticket.sla_paused_total_ms}
          />
          {categoryCode && (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-semibold",
                CATEGORY_COLORS[categoryCode] ?? "bg-muted"
              )}
            >
              {category?.name ?? categoryCode}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold leading-tight">{ticket.tenant.name}</h1>
        <p className="text-lg text-muted-foreground">{ticket.tenant.address}</p>
        <p className="text-base text-muted-foreground">{ticket.tenant.city}</p>
        {durationMinutes != null && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Estimasi pengerjaan ~{durationMinutes} menit
          </p>
        )}
        {ticket.service_package && (
          <p className="text-sm font-medium text-primary">
            Paket: {ticket.service_package.name}
          </p>
        )}
      </div>

      <Button asChild variant="outline" size="lg" className="h-14 w-full text-base">
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
          <MapPinned className="h-5 w-5" />
          Buka di Google Maps
        </a>
      </Button>

      {sdwan && sopArticles[0] && (
        <Button asChild variant="secondary" size="lg" className="h-12 w-full">
          <Link href={`/engineer/kb/${sopArticles[0].id}`}>
            <BookOpen className="h-5 w-5" />
            Lihat SOP SDWAN
          </Link>
        </Button>
      )}

      {ticket.device && (
        <div className="rounded-xl bg-muted px-4 py-3 text-base">
          <p className="font-bold">
            {ticket.device.type}
            {ticket.device.device_category
              ? ` · ${ticket.device.device_category}`
              : ""}
          </p>
          <p className="font-mono text-sm">{ticket.device.serial_number}</p>
          <p className="text-sm">Status device: {ticket.device.status}</p>
        </div>
      )}

      <div className="rounded-xl border px-4 py-3">
        <p className="text-sm font-medium text-muted-foreground">Deskripsi</p>
        <p className="text-lg">{ticket.description}</p>
      </div>

      {ticket.status === "ASSIGNED" && (
        <JobAcceptReject
          ticketId={ticket.id}
          acceptedAt={ticket.accepted_at?.toISOString() ?? null}
          allowReject={allowReject}
        />
      )}

      {showChecklist && sdwan && (
        <SdwanChecklistPanel
          ticketId={ticket.id}
          checklistKey={checklistKey}
          initialAnswers={checklistData?.answers ?? null}
          editable={
            ticket.status === "IN_PROGRESS" ||
            ticket.status === "ON_SITE" ||
            ticket.status === "PENDING_SPAREPART"
          }
        />
      )}

      {showChecklist && !sdwan && categoryCode && dynamicItems.length > 0 && (
        <CategoryChecklistPanel
          ticketId={ticket.id}
          categoryCode={categoryCode}
          items={dynamicItems}
          initialAnswers={checklistData?.answers ?? null}
          requirePhotoKeywords={photoKeywords}
          editable={
            ticket.status === "IN_PROGRESS" ||
            ticket.status === "ON_SITE" ||
            ticket.status === "PENDING_SPAREPART"
          }
        />
      )}

      <EngineerTicketActions
        ticketId={ticket.id}
        status={ticket.status}
        deviceType={ticket.device?.type ?? null}
        spareparts={spareparts}
        acceptedAt={ticket.accepted_at?.toISOString() ?? null}
      />

      <div className="rounded-xl border p-4">
        <PhotoGallery photos={photos} />
      </div>

      <div className="rounded-xl border p-4">
        <p className="mb-3 text-lg font-bold">Timeline</p>
        <TicketTimeline logs={ticket.logs} />
      </div>
    </div>
  );
}
