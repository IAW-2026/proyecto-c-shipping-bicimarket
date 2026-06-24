import { geocodePostalCode } from "./ar-postal-codes";

/**
 * Distancia en km entre dos coordenadas usando la fórmula de Haversine.
 * Devuelve un entero redondeado — para el cotizador no necesitamos más
 * precisión que el km.
 */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371; // radio medio de la Tierra en km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c)));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calcula la distancia entre dos CPs argentinos. Si alguno no está en el
 * dataset, devuelve null — el caller decide qué hacer (típicamente tirar
 * 422 POSTAL_CODE_UNKNOWN, según decisión del proyecto).
 *
 * No usa fallback a "default 100km" — la decisión deliberada es que si no
 * tenemos cobertura conocida, no cotizamos.
 */
export function distanceBetweenPostalCodes(
  cpA: string,
  cpB: string,
): number | null {
  const a = geocodePostalCode(cpA);
  const b = geocodePostalCode(cpB);
  if (!a || !b) return null;
  return haversineKm({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
}
