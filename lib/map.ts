import type { StyleSpecification } from "maplibre-gl";

/**
 * Raster Esri World Street Map — gratis tanpa API key.
 * Catatan: template Esri memakai {z}/{y}/{x} (bukan x/y).
 */
export const ESRI_STREET_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        "Tiles &copy; <a href=\"https://www.esri.com/\">Esri</a> &mdash; Source: Esri, OpenStreetMap",
    },
  },
  layers: [
    {
      id: "esri",
      type: "raster",
      source: "esri",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

/** Light gray Esri — tampilan mirip dashboard */
export const ESRI_LIGHT_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        "Tiles &copy; <a href=\"https://www.esri.com/\">Esri</a>",
    },
    "esri-ref": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
    },
  },
  layers: [
    { id: "esri-base", type: "raster", source: "esri", minzoom: 0, maxzoom: 16 },
    {
      id: "esri-labels",
      type: "raster",
      source: "esri-ref",
      minzoom: 0,
      maxzoom: 16,
    },
  ],
};

/** OpenFreeMap vector — gratis, no key (cadangan) */
export const OPENFREEMAP_STYLE = {
  liberty: "https://tiles.openfreemap.org/styles/liberty",
  positron: "https://tiles.openfreemap.org/styles/positron",
} as const;

export type OpenFreeMapStyle = keyof typeof OPENFREEMAP_STYLE;

/** Default basemap production — Esri street, tanpa API key */
export const DEFAULT_MAP_STYLE = ESRI_STREET_STYLE;

/** Default center Jabodetabek (lng, lat) */
export const DEFAULT_MAP_CENTER: [number, number] = [106.8456, -6.2088];
