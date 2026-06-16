import "server-only";

export type GeocodeResult = { lat: number; lng: number; formatted: string };

/**
 * Direcciones → lat/lng usando la Geocoding API de Google (server-side).
 * Usa GOOGLE_MAPS_SERVER_KEY. Devuelve null si no hay key o no hay match.
 * Se usa como fallback cuando el cliente no capturó coordenadas.
 */
export async function geocodeAddress(
  address: string,
): Promise<GeocodeResult | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key || !address.trim()) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("region", "ar");
  url.searchParams.set("language", "es");
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: string;
      results: {
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }[];
    };
    const first = data.results[0];
    if (data.status !== "OK" || !first) return null;
    return {
      lat: first.geometry.location.lat,
      lng: first.geometry.location.lng,
      formatted: first.formatted_address,
    };
  } catch {
    return null;
  }
}
