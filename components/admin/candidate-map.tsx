"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { CandidateStatus } from "@prisma/client";

const STATUS_COLOR: Record<string, string> = {
  NEW: "#3b82f6",
  SCREENING: "#a855f7",
  TRAINING: "#f59e0b",
  TRIAL: "#06b6d4",
  APPROVED: "#10b981",
  REJECTED: "#ef4444",
  BLACKLISTED: "#64748b",
};

type Point = {
  id: string;
  full_name: string;
  city: string;
  status: CandidateStatus;
  lat: number | null;
  lng: number | null;
  skills: string[];
};

export function CandidateMap({ points }: { points: Point[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  useEffect(() => {
    if (!token || !ref.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const valid = points.filter((p) => p.lat != null && p.lng != null);
    const center: [number, number] =
      valid.length > 0
        ? [valid[0].lng!, valid[0].lat!]
        : [106.8456, -6.2088];

    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/light-v11",
      center,
      zoom: 5,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    for (const p of valid) {
      const el = document.createElement("div");
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "50%";
      el.style.background = STATUS_COLOR[p.status] ?? "#64748b";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 1px 4px rgba(0,0,0,.3)";
      new mapboxgl.Marker({ element: el })
        .setLngLat([p.lng!, p.lat!])
        .setPopup(
          new mapboxgl.Popup({ offset: 12 }).setHTML(
            `<strong>${p.full_name}</strong><br/>${p.city}<br/><span style="color:${STATUS_COLOR[p.status]}">${p.status}</span><br/>${p.skills.join(", ")}`
          )
        )
        .addTo(map);
    }

    if (valid.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      valid.forEach((p) => bounds.extend([p.lng!, p.lat!]));
      map.fitBounds(bounds, { padding: 40, maxZoom: 12 });
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border bg-muted/40 text-sm text-muted-foreground">
        Mapbox token belum di-set — peta kandidat tidak tersedia
      </div>
    );
  }

  return <div ref={ref} className="h-[320px] w-full overflow-hidden rounded-xl border" />;
}
