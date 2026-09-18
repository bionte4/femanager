"use client";

import { ImageIcon } from "lucide-react";
import { ImageLightbox, useLightbox } from "@/components/ticket/image-lightbox";
import { cn } from "@/lib/utils";

type PhotoGalleryProps = {
  before?: string | null;
  after?: string | null;
  photos?: string[];
  className?: string;
  title?: string;
};

/**
 * Gallery Before / After — klik thumbnail untuk zoom
 */
export function PhotoGallery({
  before,
  after,
  photos = [],
  className,
  title = "Dokumentasi Foto",
}: PhotoGalleryProps) {
  const beforeUrl =
    before ?? photos.find((p) => /before/i.test(p)) ?? null;
  const afterUrl =
    after ?? photos.find((p) => /after/i.test(p)) ?? null;

  const extras = photos.filter(
    (p) => p !== beforeUrl && p !== afterUrl
  );

  const all = [beforeUrl, afterUrl, ...extras].filter(
    (u): u is string => !!u
  );

  const { openAt, lightboxProps } = useLightbox(all);

  if (all.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-10 text-center",
          className
        )}
      >
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Belum ada foto</p>
      </div>
    );
  }

  function indexOf(url: string) {
    return all.indexOf(url);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-base font-semibold">{title}</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <PhotoSlot
          label="Before"
          url={beforeUrl}
          onClick={() => beforeUrl && openAt(indexOf(beforeUrl))}
        />
        <PhotoSlot
          label="After"
          url={afterUrl}
          onClick={() => afterUrl && openAt(indexOf(afterUrl))}
        />
      </div>

      {extras.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {extras.map((url) => (
            <button
              key={url}
              type="button"
              className="group relative aspect-square overflow-hidden rounded-lg border"
              onClick={() => openAt(indexOf(url))}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Foto tambahan"
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}

      <ImageLightbox {...lightboxProps} />
    </div>
  );
}

function PhotoSlot({
  label,
  url,
  onClick,
}: {
  label: string;
  url: string | null;
  onClick: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {url ? (
        <button
          type="button"
          onClick={onClick}
          className="group relative block w-full overflow-hidden rounded-xl border bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.02]"
          />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2 text-left text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
            Klik untuk perbesar
          </span>
        </button>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed bg-muted/40 text-sm text-muted-foreground">
          Belum ada
        </div>
      )}
    </div>
  );
}

// collectLogPhotos dipindah ke @/lib/tickets/photos (server-safe)
