"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reverseGeocode, type ReverseGeocodeResult } from "@/lib/geocode";
import { DEFAULT_MAP_CENTER, OPENFREEMAP_STYLE } from "@/lib/map";
import { cn } from "@/lib/utils";

type MapPickerProps = {
  lat?: number | null;
  lng?: number | null;
  onChange: (coords: { lat: number; lng: number }) => void;
  onAddressResolved?: (result: ReverseGeocodeResult) => void;
  className?: string;
  height?: string;
};

export function MapPicker({
  lat,
  lng,
  onChange,
  onAddressResolved,
  className,
  height = "280px",
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const onAddressResolvedRef = useRef(onAddressResolved);
  const [geocoding, setGeocoding] = useState(false);

  onChangeRef.current = onChange;
  onAddressResolvedRef.current = onAddressResolved;

  const currentLat = lat ?? DEFAULT_MAP_CENTER[1];
  const currentLng = lng ?? DEFAULT_MAP_CENTER[0];

  async function resolveAddress(nextLat: number, nextLng: number) {
    if (!onAddressResolvedRef.current) return;
    setGeocoding(true);
    try {
      const result = await reverseGeocode(nextLat, nextLng);
      if (result) onAddressResolvedRef.current(result);
    } finally {
      setGeocoding(false);
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE.liberty,
      center: lng && lat ? [lng, lat] : DEFAULT_MAP_CENTER,
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const marker = new maplibregl.Marker({ color: "#047857", draggable: true })
      .setLngLat(lng && lat ? [lng, lat] : DEFAULT_MAP_CENTER)
      .addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLngLat();
      onChangeRef.current({ lat: pos.lat, lng: pos.lng });
      void resolveAddress(pos.lat, pos.lng);
    });

    map.on("click", (e: maplibregl.MapMouseEvent) => {
      marker.setLngLat(e.lngLat);
      onChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
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
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || lat == null || lng == null) return;
    markerRef.current.setLngLat([lng, lat]);
    mapRef.current.easeTo({ center: [lng, lat], duration: 400 });
  }, [lat, lng]);

  return (
    <div className={cn("space-y-3", className)}>
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
