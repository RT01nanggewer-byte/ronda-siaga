import { POS_LAT, POS_LNG, POS_RADIUS_M } from "../lib/ronda/config";
import { bearingDegrees, formatDistance, haversineMeters, isInsidePos } from "../lib/ronda/geo";

export function GpsRadar({
  geo,
}: {
  geo: { lat: number; lng: number } | null;
}) {
  const dist = geo ? haversineMeters(geo.lat, geo.lng) : null;
  const inside = geo ? isInsidePos(geo.lat, geo.lng) : false;
  const bearing = geo ? bearingDegrees(POS_LAT, POS_LNG, geo.lat, geo.lng) : 45;

  const maxDrawM = POS_RADIUS_M * 10;
  const outerPct = 42;
  const midPct = 30;
  const innerPct = 18;
  const userPct =
    dist == null ? 0 : Math.min(outerPct, Math.max(3, (dist / maxDrawM) * outerPct));
  const rad = ((bearing - 90) * Math.PI) / 180;
  const userX = 50 + Math.cos(rad) * userPct;
  const userY = 50 + Math.sin(rad) * userPct;

  const badge = !geo
    ? { text: "Mencari GPS", cls: "bg-[#2a2418] text-[#d7b56a]" }
    : inside
      ? { text: `Di dalam \u00b7 ${formatDistance(dist ?? 0)}`, cls: "bg-[#1d3a2c] text-[#9dccb0]" }
      : { text: `Di luar \u00b7 ${formatDistance(dist ?? 0)}`, cls: "bg-[#3a2220] text-[#e0a39c]" };

  const hint = !geo
    ? "Menunggu lokasi"
    : inside
      ? `Sudah di poskamling \u00b7 ${formatDistance(dist ?? 0)}`
      : `Datang ke poskamling \u00b7 ${formatDistance(Math.max(0, (dist ?? 0) - POS_RADIUS_M))}`;

  return (
    <section className="mt-6 rounded-[28px] bg-[#121a16] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-[#8b958c]">
            Radius poskamling
          </p>
          <p className="mt-1 font-clock text-[2.15rem] leading-[0.95] text-[#f3eee4]">10 meter</p>
        </div>
        <span className={`mt-1 shrink-0 rounded-full px-3 py-1.5 text-[0.92rem] font-medium ${badge.cls}`}>
          {badge.text}
        </span>
      </div>

      <div className="relative mx-auto mt-2 h-[290px] w-[290px]">
        <span className="absolute rounded-full border border-[#2a3330]" style={{ inset: `${50 - outerPct}%` }} />
        <span className="absolute rounded-full border border-[#2f3b36]" style={{ inset: `${50 - midPct}%` }} />
        <span
          className="absolute rounded-full border-[2.5px] border-[#7fa88f] bg-[#1a2a22]"
          style={{ inset: `${50 - innerPct}%` }}
        />
        <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9dccb0]" />
        {geo ? (
          <span
            className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e08b84]"
            style={{ left: `${userX}%`, top: `${userY}%` }}
          />
        ) : null}
      </div>

      <p className="mt-1 text-center text-[1.08rem] text-[#9aa39b]">{hint}</p>
      <p className="mt-4 text-[0.98rem] leading-snug text-[#8b958c]">
        Absen masuk dan selesai hanya dalam {POS_RADIUS_M} meter dari pos {POS_LAT}, {POS_LNG}.
      </p>
    </section>
  );
}
