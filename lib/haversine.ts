/**
 * Haversine distance (meter) — fallback jika PostGIS gagal
 */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // earth radius meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function sortByHaversineDistance<
  T extends { lat: number | null; lng: number | null },
>(items: T[], originLat: number, originLng: number): Array<T & { distance_meters: number }> {
  return items
    .filter((i): i is T & { lat: number; lng: number } => i.lat != null && i.lng != null)
    .map((i) => ({
      ...i,
      distance_meters: haversineDistanceMeters(originLat, originLng, i.lat, i.lng),
    }))
    .sort((a, b) => a.distance_meters - b.distance_meters);
}
