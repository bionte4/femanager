import type { StyleSpecification } from "maplibre-gl";

/**
 * Raster CARTO — stabil untuk production (tanpa vector TileJSON OpenFreeMap).
 * Attribution otomatis via MapLibre.
 */
export const CARTO_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto",
      type: "raster",
      source: "carto",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

/** OpenFreeMap vector — cadangan (bisa blank jika /planet gagal) */
export const OPENFREEMAP_STYLE = {
  liberty: "https://tiles.openfreemap.org/styles/liberty",
  positron: "https://tiles.openfreemap.org/styles/positron",
} as const;

export type OpenFreeMapStyle = keyof typeof OPENFREEMAP_STYLE;

/** Default basemap — raster CARTO */
export const DEFAULT_MAP_STYLE = CARTO_RASTER_STYLE;

/** Default center Jabodetabek (lng, lat) */
export const DEFAULT_MAP_CENTER: [number, number] = [106.8456, -6.2088];
