export type ReverseGeocodeResult = {
  province: string;
  city: string;
  district: string;
  sub_district: string;
  address: string;
};

type MapboxFeature = {
  place_name?: string;
  text?: string;
  context?: Array<{ id: string; text: string }>;
  properties?: { address?: string };
};

/** Reverse geocode Mapbox → struktur wilayah Indonesia */
export async function reverseGeocode(
  lat: number,
  lng: number,
  token: string
): Promise<ReverseGeocodeResult | null> {
  if (!token) return null;

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=id&types=address,place,locality,neighborhood,district,region`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const json = (await res.json()) as { features?: MapboxFeature[] };
  const feature = json.features?.[0];
  if (!feature) return null;

  const ctx = feature.context ?? [];
  const find = (prefix: string) =>
    ctx.find((c) => c.id.startsWith(prefix))?.text ?? "";

  return {
    province: find("region") || "DKI Jakarta",
    city: find("place") || find("district") || "Jakarta",
    district: find("locality") || find("district") || find("neighborhood") || "-",
    sub_district: find("neighborhood") || feature.text || "",
    address: feature.place_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  };
}
