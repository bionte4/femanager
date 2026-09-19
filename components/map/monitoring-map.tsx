"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Loader2, RefreshCw } from "lucide-react";
import { MapKpiCards } from "@/components/map/map-kpi-cards";
import { createTicketAction } from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_MAP_CENTER, OPENFREEMAP_STYLE } from "@/lib/map";
import { cn } from "@/lib/utils";

type TenantMapStatus = "up" | "down" | "alert";

type MapTenant = {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  sla_tier: string;
  map_status: TenantMapStatus;
  devices: Array<{
    id: string;
    type: string;
    serial_number: string;
    status: string;
    brand: string | null;
  }>;
  active_tickets: Array<{
    id: string;
    ticket_no: string;
    status: string;
    priority: string;
  }>;
  device_down_count: number;
  device_total: number;
};

type MapEngineer = {
  id: string;
  full_name: string;
  phone: string;
  status: string;
  city: string | null;
  lat: number;
  lng: number;
  skills: string[];
  rating: number;
};

type MapPayload = {
  tenants: MapTenant[];
  engineers: MapEngineer[];
  filters: { cities: string[] };
  kpi: {
    total_tenant: number;
    total_down: number;
    ticket_overdue: number;
    sla_percent_today: number;
  };
  generated_at: string;
};

const STATUS_COLOR: Record<TenantMapStatus, string> = {
  up: "#16a34a",
  alert: "#ca8a04",
  down: "#dc2626",
};

async function fetchMapData(params: {
  city: string;
  status: string;
  sla_tier: string;
}): Promise<MapPayload> {
  const sp = new URLSearchParams();
  if (params.city !== "all") sp.set("city", params.city);
  if (params.status !== "all") sp.set("status", params.status);
  if (params.sla_tier !== "all") sp.set("sla_tier", params.sla_tier);

  const res = await fetch(`/api/map?${sp.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal load data peta");
  const json = await res.json();
  return json.data as MapPayload;
}

function tenantPopupHtml(t: MapTenant): string {
  const devices = t.devices
    .map(
      (d) =>
        `<li style="font-size:12px;margin:2px 0"><b>${d.type}</b> · ${d.serial_number} · <span style="color:${d.status === "DOWN" ? "#dc2626" : d.status === "UP" ? "#16a34a" : "#ca8a04"}">${d.status}</span></li>`
    )
    .join("");

  const tickets = t.active_tickets
    .map(
      (tk) =>
        `<li style="font-size:12px;margin:2px 0"><a href="/admin/tickets/${tk.id}" style="color:#047857;font-weight:600">${tk.ticket_no}</a> · ${tk.status}</li>`
    )
    .join("");

  return `
    <div style="min-width:220px;max-width:280px;font-family:system-ui,sans-serif">
      <div style="font-weight:700;font-size:14px;margin-bottom:2px">${t.name}</div>
      <div style="font-size:11px;color:#64748b;margin-bottom:8px">${t.code} · ${t.city}</div>
      <div style="font-size:12px;margin-bottom:8px;color:#334155">${t.address}</div>
      <div style="font-size:12px;font-weight:600;margin-bottom:4px">Devices (${t.device_total})</div>
      <ul style="padding-left:16px;margin:0 0 8px">${devices || "<li style='font-size:12px;color:#94a3b8'>Tidak ada device</li>"}</ul>
      ${
        t.active_tickets.length
          ? `<div style="font-size:12px;font-weight:600;margin-bottom:4px">Ticket aktif</div><ul style="padding-left:16px;margin:0 0 10px">${tickets}</ul>`
          : ""
      }
      <button data-create-ticket="${t.id}" style="width:100%;background:#047857;color:#fff;border:0;border-radius:8px;padding:8px 10px;font-size:12px;font-weight:600;cursor:pointer">
        Buat Ticket
      </button>
    </div>
  `;
}

function engineerPopupHtml(e: MapEngineer): string {
  return `
    <div style="min-width:160px;font-family:system-ui,sans-serif">
      <div style="font-weight:700;font-size:13px">${e.full_name}</div>
      <div style="font-size:11px;color:#64748b">${e.phone}</div>
      <div style="margin-top:6px;font-size:12px">Status: <b>${e.status}</b></div>
      <div style="font-size:12px">Skills: ${e.skills.join(", ") || "—"}</div>
      <div style="font-size:12px">Rating: ${e.rating.toFixed(1)}</div>
    </div>
  `;
}

export function MonitoringMap() {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const engineerMarkersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const creatingRef = useRef(false);
  const createTicketRef = useRef<(tenantId: string) => Promise<void>>(async () => {});

  const [city, setCity] = useState("all");
  const [status, setStatus] = useState("all");
  const [slaTier, setSlaTier] = useState("all");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["map-monitoring", city, status, slaTier],
    queryFn: () => fetchMapData({ city, status, sla_tier: slaTier }),
    refetchInterval: 30_000,
  });

  const data = query.data;

  const geojson = useMemo(() => {
    const features =
      data?.tenants.map((t) => ({
        type: "Feature" as const,
        properties: {
          id: t.id,
          name: t.name,
          code: t.code,
          map_status: t.map_status,
          color: STATUS_COLOR[t.map_status],
        },
        geometry: {
          type: "Point" as const,
          coordinates: [t.lng, t.lat] as [number, number],
        },
      })) ?? [];

    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [data?.tenants]);

  const handleCreateTicket = useCallback(
    async (tenantId: string) => {
      if (creatingRef.current) return;
      creatingRef.current = true;
      setCreating(true);
      setToast(null);
      try {
        const tenant = (
          window as unknown as { __mapTenants?: MapTenant[] }
        ).__mapTenants?.find((t) => t.id === tenantId);
        const downDevice = tenant?.devices.find((d) => d.status === "DOWN");
        const result = await createTicketAction({
          tenant_id: tenantId,
          device_id: downDevice?.id ?? tenant?.devices[0]?.id ?? null,
          type: "INCIDENT",
          priority: downDevice ? "HIGH" : "MEDIUM",
          description: downDevice
            ? `Incident dari peta: ${downDevice.type} ${downDevice.serial_number} DOWN`
            : `Incident manual dari peta monitoring — ${tenant?.name ?? tenantId}`,
          reported_by: "map-monitoring",
        });
        if (!result.success) {
          setToast(result.error);
          return;
        }
        setToast(`Ticket ${result.data?.ticket_no} dibuat`);
        popupRef.current?.remove();
        await query.refetch();
        router.push(`/admin/tickets/${result.data!.id}`);
      } finally {
        creatingRef.current = false;
        setCreating(false);
      }
    },
    [query, router]
  );

  createTicketRef.current = handleCreateTicket;

  // Init map sekali — MapLibre + OpenFreeMap (tanpa token)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OPENFREEMAP_STYLE.positron,
      center: DEFAULT_MAP_CENTER,
      zoom: 10,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new maplibregl.FullscreenControl(), "bottom-right");

    map.on("load", () => {
      map.addSource("tenants", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "tenants",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#0f766e",
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 30, 32],
          "circle-opacity": 0.85,
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "tenants",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "tenants",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      map.on("click", "clusters", (e: maplibregl.MapLayerMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        const clusterId = features[0]?.properties?.cluster_id as number | undefined;
        const source = map.getSource("tenants") as maplibregl.GeoJSONSource;
        if (clusterId == null) return;

        void source.getClusterExpansionZoom(clusterId).then((zoom: number) => {
          const geometry = features[0].geometry;
          if (geometry.type !== "Point") return;
          map.easeTo({
            center: geometry.coordinates as [number, number],
            zoom,
          });
        });
      });

      map.on("click", "unclustered-point", (e: maplibregl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const id = feature.properties?.id as string;
        const tenant = (window as unknown as { __mapTenants?: MapTenant[] })
          .__mapTenants?.find((t) => t.id === id);
        if (!tenant) return;

        const coords = feature.geometry.coordinates.slice() as [number, number];
        popupRef.current?.remove();
        const popup = new maplibregl.Popup({ offset: 12, maxWidth: "300px" })
          .setLngLat(coords)
          .setHTML(tenantPopupHtml(tenant))
          .addTo(map);
        popupRef.current = popup;

        requestAnimationFrame(() => {
          const btn = document.querySelector(
            `[data-create-ticket="${tenant.id}"]`
          ) as HTMLButtonElement | null;
          btn?.addEventListener("click", () => {
            void createTicketRef.current(tenant.id);
          });
        });
      });

      map.on("mouseenter", "clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "clusters", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "unclustered-point", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "unclustered-point", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;

    return () => {
      popupRef.current?.remove();
      engineerMarkersRef.current.forEach((m) => m.remove());
      engineerMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update tenant geojson + store for popup
  useEffect(() => {
    (window as unknown as { __mapTenants?: MapTenant[] }).__mapTenants =
      data?.tenants ?? [];
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const source = map.getSource("tenants") as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData(geojson);
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [geojson, data?.tenants]);

  // Engineer markers (biru)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data?.engineers) return;

    engineerMarkersRef.current.forEach((m) => m.remove());
    engineerMarkersRef.current = [];

    data.engineers.forEach((eng) => {
      const el = document.createElement("div");
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "999px";
      el.style.background = "#2563eb";
      el.style.border = "2px solid #fff";
      el.style.boxShadow = "0 1px 4px rgba(0,0,0,.35)";
      el.style.cursor = "pointer";
      if (eng.status === "OFFLINE") el.style.opacity = "0.45";

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([eng.lng, eng.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 10 }).setHTML(engineerPopupHtml(eng))
        )
        .addTo(map);

      engineerMarkersRef.current.push(marker);
    });
  }, [data?.engineers]);

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] flex-col gap-3 lg:h-[calc(100dvh-2rem)]">
      {data?.kpi ? (
        <MapKpiCards kpi={data.kpi} />
      ) : (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="bg-background sm:w-48">
            <SelectValue placeholder="Kota" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kota</SelectItem>
            {(data?.filters.cities ?? []).map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="bg-background sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="up">Hijau — UP</SelectItem>
            <SelectItem value="alert">Kuning — Ada ticket</SelectItem>
            <SelectItem value="down">Merah — Device DOWN</SelectItem>
          </SelectContent>
        </Select>

        <Select value={slaTier} onValueChange={setSlaTier}>
          <SelectTrigger className="bg-background sm:w-52">
            <SelectValue placeholder="SLA Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua SLA Tier</SelectItem>
            <SelectItem value="TIER1_JABODETABEK">Tier 1 Jabodetabek</SelectItem>
            <SelectItem value="TIER2_PROVINCE">Tier 2 Provinsi</SelectItem>
            <SelectItem value="TIER3_KABUPATEN">Tier 3 Kabupaten</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="sm:ml-auto"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw className={cn("h-4 w-4", query.isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Tenant UP
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-600" /> Ada ticket aktif
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Device DOWN
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Engineer
        </span>
        <span className="ml-auto text-[11px]">
          {data
            ? `${data.tenants.length} tenant · ${data.engineers.length} engineer · update ${new Date(data.generated_at).toLocaleTimeString("id-ID")}`
            : "Memuat..."}
        </span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border bg-muted/30">
        <div ref={mapContainerRef} className="h-full w-full" />

        {(query.isLoading || creating) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      {toast && (
        <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg border bg-background px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
