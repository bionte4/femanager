"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reverseGeocode, type ReverseGeocodeResult } from "@/lib/mapbox";
import { cn } from "@/lib/utils";

type MapPickerProps = {
  lat?: number | null;
  lng?: number | null;
  onChange: (coords: { lat: number; lng: number }) => void;
  onAddressResolved?: (result: ReverseGeocodeResult) => void;
  className?: string;
  height?: string;
};

const DEFAULT_CENTER: [number, number] = [106.8456, -6.2088]; // Jakarta

export function MapPicker({
  lat,
  lng,
  onChange,
  onAddressResolved,
  className,
  height = "280px",
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  const currentLat = lat ?? -6.2088;
  const currentLng = lng ?? 106.8456;

  async function resolveAddress(nextLat: number, nextLng: number) {
    if (!token || !onAddressResolved) return;
    setGeocoding(true);
    try {
      const result = await reverseGeocode(nextLat, nextLng, token);
      if (result) onAddressResolved(result);
    } finally {
      setGeocoding(false);
    }
  }

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: lng && lat ? [lng, lat] : DEFAULT_CENTER,
      zoom: 12,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    const marker = new mapboxgl.Marker({ color: "#047857", draggable: true })
      .setLngLat(lng && lat ? [lng, lat] : DEFAULT_CENTER)
      .addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLngLat();
      onChange({ lat: pos.lat, lng: pos.lng });
      void resolveAddress(pos.lat, pos.lng);
    });

    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      void resolveAddress(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || lat == null || lng == null) return;
    markerRef.current.setLngLat([lng, lat]);
    mapRef.current.easeTo({ center: [lng, lat], duration: 400 });
  }, [lat, lng]);

  return (
    <div className={cn("space-y-3", className)}>
      {token ? (
        <div className="relative overflow-hidden rounded-lg border">
          <div ref={containerRef} style={{ height, width: "100%" }} />
          {geocoding && (
            <div className="absolute bottom-2 left-2 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow">
              Mengisi alamat otomatis...
            </div>
          )}
          <p className="absolute left-2 top-2 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow">
            Klik peta / drag pin untuk pilih lokasi
          </p>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 px-4 text-center"
          style={{ height }}
        >
          <MapPin className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Mapbox token belum di-set</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Isi <code className="rounded bg-muted px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code> di
            .env untuk map picker. Sementara isi lat/lng manual di bawah.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="map-lat">Latitude</Label>
          <Input
            id="map-lat"
            type="number"
            step="any"
            value={currentLat}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isFinite(next)) return;
              onChange({ lat: next, lng: currentLng });
            }}
            onBlur={() => void resolveAddress(currentLat, currentLng)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="map-lng">Longitude</Label>
          <Input
            id="map-lng"
            type="number"
            step="any"
            value={currentLng}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isFinite(next)) return;
              onChange({ lat: currentLat, lng: next });
            }}
            onBlur={() => void resolveAddress(currentLat, currentLng)}
          />
        </div>
      </div>
    </div>
  );
}
