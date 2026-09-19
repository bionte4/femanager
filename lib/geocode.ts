export type ReverseGeocodeResult = {
  province: string;
  city: string;
  district: string;
  sub_district: string;
  address: string;
};

type NominatimAddress = {
  state?: string;
  region?: string;
  city?: string;
  town?: string;
  municipality?: string;
  county?: string;
  city_district?: string;
  district?: string;
  suburb?: string;
  neighbourhood?: string;
  neighborhood?: string;
  village?: string;
  hamlet?: string;
  road?: string;
  house_number?: string;
};

type NominatimReverseResponse = {
  display_name?: string;
  address?: NominatimAddress;
};

/**
 * Reverse geocode via Nominatim (OpenStreetMap) — gratis, tanpa API key.
 * Patuhi usage policy: max ~1 req/detik + User-Agent aplikasi.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "id");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      // Nominatim mewajibkan User-Agent yang mengidentifikasi aplikasi
      "User-Agent": "FE-Track/1.0 (field-engineer-dispatch)",
    },
  });
  if (!res.ok) return null;

  const json = (await res.json()) as NominatimReverseResponse;
  const addr = json.address;
  if (!addr && !json.display_name) return null;

  const province = addr?.state || addr?.region || "DKI Jakarta";
  const city =
    addr?.city || addr?.town || addr?.municipality || addr?.county || "Jakarta";
  const district =
    addr?.city_district || addr?.district || addr?.suburb || "-";
  const sub_district =
    addr?.neighbourhood ||
    addr?.neighborhood ||
    addr?.village ||
    addr?.hamlet ||
    "";

  const roadParts = [addr?.road, addr?.house_number].filter(Boolean).join(" ");
  const address =
    json.display_name ||
    roadParts ||
    `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  return { province, city, district, sub_district, address };
}
