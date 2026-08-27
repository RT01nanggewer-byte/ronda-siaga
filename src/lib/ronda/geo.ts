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

export function bearingDegrees(fromLat: number, fromLng: number, toLat = POS_LAT, toLng = POS_LNG) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const y = Math.sin(toRad(toLng - fromLng)) * Math.cos(toRad(toLat));
  const x =
    Math.cos(toRad(fromLat)) * Math.sin(toRad(toLat)) -
    Math.sin(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.cos(toRad(toLng - fromLng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function isInsidePos(lat: number, lng: number, radius = POS_RADIUS_M) {
  return haversineMeters(lat, lng) <= radius;
}

export function formatDistance(m: number) {
  if (m < 1000) return `${m.toFixed(1)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}
