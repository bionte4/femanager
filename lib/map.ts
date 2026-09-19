/** Style OpenFreeMap — gratis, tanpa API key */
export const OPENFREEMAP_STYLE = {
  liberty: "https://tiles.openfreemap.org/styles/liberty",
  positron: "https://tiles.openfreemap.org/styles/positron",
} as const;

export type OpenFreeMapStyle = keyof typeof OPENFREEMAP_STYLE;

/** Default center Jabodetabek (lng, lat) */
export const DEFAULT_MAP_CENTER: [number, number] = [106.8456, -6.2088];
