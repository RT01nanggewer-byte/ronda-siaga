import { POS_LAT, POS_LNG, POS_RADIUS_M } from "../lib/ronda/config";
import { bearingDegrees, formatDistance, haversineMeters, isInsidePos } from "../lib/ronda/geo";

export function GpsRadar({
  geo,
}: {
  geo: { lat: number; lng: number } | null;
}) {
  const dist = geo ? haversineMeters(geo.lat, geo.lng) : null;
  const inside = geo ? isInsidePos(geo.lat, geo.lng) : false;
  const bearing = geo ? bearingDegrees(geo.lat, geo.lng) : 0;

  const viewRadius = Math.max(POS_RADIUS_M * 4, dist ? dist * 1.15 : POS_RADIUS_M * 4);
  const ring10 = (POS_RADIUS_M / viewRadius) * 46;
  const ringMid = Math.min(42, ring10 * 2.1);
  const ringOut = 46;

  const userR = dist == null ? 0 : Math.min(44, (dist / viewRadius) * 46);
  const rad = ((bearing - 90) * Math.PI) / 180;
  const userX = 50 + Math.cos(rad) * userR;
  const userY = 50 + Math.sin(rad) * userR;

  const badge = !geo
    ? { text: "Menunggu GPS", cls: "bg-[#2a2418] text-amber" }
    : inside
      ? { text: `Di dalam · ${formatDistance(dist ?? 0)}`, cls: "bg-primary/20 text-primary" }
      : { text: `Di luar · ${formatDistance(dist ?? 0)}`, cls: "bg-[#3a2220] text-[#e8a39c]" };

  const hint = !geo
    ? "Aktifkan izin lokasi HP"
    : inside
      ? `Sudah di poskamling · ${formatDistance(dist ?? 0)}`
      : `Datang ke poskamling · ${formatDistance(Math.max(0, (dist ?? 0) - POS_RADIUS_M))}`;

  return (
    <section className="mt-6 overflow-hidden rounded-[28px] bg-[#141c18] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.72rem] font-medium tracking-[0.18em] text-muted-foreground">RADIUS POSKAMLING</p>
          <p className="mt-1 font-clock text-[2.05rem] leading-none">{POS_RADIUS_M} meter</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${badge.cls}`}>{badge.text}</span>
      </div>

      <div className="relative mx-auto mt-3 aspect-square w-full max-w-[340px]">
        <div
          className="absolute rounded-full border border-white/8"
          style={{ inset: `${50 - ringOut}%` }}
        />
        <div
          className="absolute rounded-full border border-white/10"
          style={{ inset: `${50 - ringMid}%` }}
        />
        <div
          className="absolute rounded-full border-2 border-primary/55 bg-primary/10"
          style={{ inset: `${50 - ring10}%` }}
        />
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
        {geo ? (
          <span
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e08b84] shadow-[0_0_0_6px_rgba(224,139,132,0.18)]"
            style={{ left: `${userX}%`, top: `${userY}%` }}
          />
        ) : null}
      </div>

      <p className="mt-1 text-center text-[1.05rem] text-muted-foreground">{hint}</p>
      <p className="mt-4 text-sm leading-snug text-muted-foreground">
        Absen masuk dan selesai hanya dalam {POS_RADIUS_M} meter dari pos {POS_LAT}, {POS_LNG}.
      </p>
    </section>
  );
}
