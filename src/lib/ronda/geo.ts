import { POS_LAT, POS_LNG, POS_RADIUS_M } from "./config";

export function haversineMeters(lat1: number, lng1: number, lat2 = POS_LAT, lng2 = POS_LNG) {
  const R = 6371000;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function isInsidePos(lat: number, lng: number, radius = POS_RADIUS_M) {
  return haversineMeters(lat, lng) <= radius;
}

export function formatDistance(m: number) {
  if (m < 1000) return `${m.toFixed(0)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}
