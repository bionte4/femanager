"use client";

import type { TicketStatus } from "@prisma/client";
import {
  CircleDot,
  UserCheck,
  Navigation,
  MapPin,
  Wrench,
  Package,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ExternalLink,
} from "lucide-react";
import { ImageLightbox, useLightbox } from "@/components/ticket/image-lightbox";
import { cn } from "@/lib/utils";

type LogItem = {
  id: string;
  status_from: TicketStatus | null;
  status_to: TicketStatus;
  notes: string | null;
  lat: number | null;
  lng: number | null;
  photo_url: string[];
  created_at: string | Date;
  changer: { id: string; full_name: string; role: string } | null;
};

const STATUS_META: Record<
  TicketStatus,
  { label: string; color: string; Icon: typeof CircleDot }
> = {
  OPEN: { label: "Open", color: "bg-slate-500", Icon: CircleDot },
  ASSIGNED: { label: "Assigned", color: "bg-teal-600", Icon: UserCheck },
  ON_THE_WAY: { label: "On the way", color: "bg-sky-600", Icon: Navigation },
  ON_SITE: { label: "On site", color: "bg-amber-600", Icon: MapPin },
  IN_PROGRESS: { label: "In progress", color: "bg-violet-600", Icon: Wrench },
  PENDING_SPAREPART: {
    label: "Pending sparepart",
    color: "bg-orange-500",
    Icon: Package,
  },
  ESCALATED: { label: "Escalated", color: "bg-red-600", Icon: AlertTriangle },
  PENDING_L1: {
    label: "Pending L1",
    color: "bg-amber-700",
    Icon: ExternalLink,
  },
  PENDING_REVIEW: {
    label: "Pending review",
    color: "bg-rose-700",
    Icon: AlertTriangle,
  },
  RESOLVED: { label: "Resolved", color: "bg-emerald-600", Icon: CheckCircle2 },
  CLOSED: { label: "Closed", color: "bg-slate-700", Icon: Lock },
};

function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const delta = 0.008;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  const maps = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="overflow-hidden rounded-lg border bg-muted">
      <iframe
        title={`Lokasi ${lat},${lng}`}
        src={embed}
        className="h-28 w-full border-0"
        loading="lazy"
      />
      <a
        href={maps}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-2 border-t px-2 py-1.5 text-[11px] text-muted-foreground hover:text-primary"
      >
        <span>
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
        <span className="inline-flex items-center gap-1 font-medium">
          Buka Maps <ExternalLink className="h-3 w-3" />
        </span>
      </a>
    </div>
  );
}

/**
 * Timeline TicketLog ala tracking paket
 */
export function TicketTimeline({ logs }: { logs: LogItem[] }) {
  const allPhotos = logs.flatMap((l) => l.photo_url ?? []);
  const { openAt, lightboxProps } = useLightbox(allPhotos);

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada log</p>;
  }

  // Photo global index for lightbox
  let photoCursor = 0;

  return (
    <>
      <ol className="relative ml-1 space-y-0 border-l-2 border-border pl-0">
        {logs.map((log, idx) => {
          const meta = STATUS_META[log.status_to];
          const Icon = meta.Icon;
          const isLatest = idx === logs.length - 1;
          const startPhotoIndex = photoCursor;
          photoCursor += log.photo_url.length;

          return (
            <li key={log.id} className="relative pb-8 pl-8 last:pb-0">
              {/* Node icon */}
              <span
                className={cn(
                  "absolute -left-[13px] flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm ring-4 ring-background",
                  meta.color,
                  isLatest && "ring-primary/20"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>

              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-bold tracking-tight">
                    {meta.label}
                  </span>
                  {log.status_from && (
                    <span className="text-xs text-muted-foreground">
                      dari {STATUS_META[log.status_from].label}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <time dateTime={new Date(log.created_at).toISOString()}>
                    {new Date(log.created_at).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  {log.changer && (
                    <>
                      <span>·</span>
                      <span>
                        {log.changer.full_name}
                        <span className="ml-1 opacity-60">
                          ({log.changer.role.replaceAll("_", " ")})
                        </span>
                      </span>
                    </>
                  )}
                </div>

                {log.notes && (
                  <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm leading-relaxed">
                    {log.notes}
                  </p>
                )}

                {/* Foto thumbnails */}
                {log.photo_url.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {log.photo_url.map((url, i) => (
                      <button
                        key={url}
                        type="button"
                        className="group relative h-16 w-16 overflow-hidden rounded-md border"
                        onClick={() => openAt(startPhotoIndex + i)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Foto log ${i + 1}`}
                          className="h-full w-full object-cover transition group-hover:scale-110"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Mini map GPS */}
                {log.lat != null && log.lng != null && (
                  <MiniMap lat={log.lat} lng={log.lng} />
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <ImageLightbox {...lightboxProps} />
    </>
  );
}
