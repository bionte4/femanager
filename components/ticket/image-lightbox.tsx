"use client";

import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageLightboxProps = {
  images: string[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
};

export function ImageLightbox({
  images,
  index,
  open,
  onClose,
  onIndexChange,
}: ImageLightboxProps) {
  const current = images[index];

  const go = useCallback(
    (next: number) => {
      if (images.length === 0) return;
      const i = (next + images.length) % images.length;
      onIndexChange?.(i);
    },
    [images.length, onIndexChange]
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, go, onClose]);

  if (!open || !current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        onClick={onClose}
        aria-label="Tutup"
      >
        <X className="h-6 w-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              go(index - 1);
            }}
            aria-label="Sebelumnya"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              go(index + 1);
            }}
            aria-label="Berikutnya"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt={`Foto ${index + 1}`}
        className={cn("max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl")}
        onClick={(e) => e.stopPropagation()}
      />
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
        {index + 1} / {images.length}
      </p>
    </div>
  );
}

export function useLightbox(images: string[]) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  function openAt(i: number) {
    setIndex(i);
    setOpen(true);
  }

  return {
    open,
    index,
    openAt,
    close: () => setOpen(false),
    setIndex,
    lightboxProps: {
      images,
      index,
      open,
      onClose: () => setOpen(false),
      onIndexChange: setIndex,
    },
  };
}
