import { Bell, Lock, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PhotoViewer } from "../components/photo-viewer";
import { APP_NAME, DESA, POS_LAT, POS_LNG, POS_RADIUS_M } from "../lib/ronda/config";
import { formatDistance, haversineMeters, isInsidePos } from "../lib/ronda/geo";
import { ROSTER } from "../lib/ronda/roster";
import { useRonda } from "../lib/ronda/store";
import { countdownToOpen, formatLongDate, getShiftWindow, getWibParts, pad2 } from "../lib/ronda/time";
import type { Page } from "../app";

export function Beranda({
  now,
  testNow,
  geo,
  onPage,
}: {
  now: Date;
  testNow: Date;
  geo: { lat: number; lng: number } | null;
  onPage: (p: Page) => void;
}) {
  const win = useMemo(() => getShiftWindow(testNow), [testNow]);
  const real = useMemo(() => getWibParts(now), [now]);
  const duty = ROSTER[win.weekday] ?? [];
  const { settings, attendance, photos, dismissNotice, setNotifyEnabled, markNotified, setTestMode } = useRonda();
  const showNotice = settings.dismissedShiftDate !== win.shiftDate;
  const [viewer, setViewer] = useState<{ src: string; caption: string } | null>(null);

  const inside = geo ? isInsidePos(geo.lat, geo.lng) : false;
  const dist = geo ? haversineMeters(geo.lat, geo.lng) : null;
  const tonight = attendance.filter((a) => a.shiftDate === win.shiftDate && !a.test);
  const tonightPhotos = photos.filter((p) => p.shiftDate === win.shiftDate);

  useEffect(() => {
    if (!settings.notifyEnabled) return;
    if (settings.notifiedShiftDate === win.shiftDate) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      new Notification("Jadwal Ronda Berganti", {
        body: `Sekarang giliran petugas ${win.hari}. Silakan cek daftar yang bertugas malam ini.`,
      });
    } catch {
      /* ignore */
    }
    markNotified(win.shiftDate);
  }, [settings.notifyEnabled, settings.notifiedShiftDate, win.shiftDate, win.hari, markNotified]);

  async function enableNotify() {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setNotifyEnabled(true);
      markNotified(win.shiftDate);
      try {
        new Notification("Notifikasi aktif", {
          body: "HP akan memberi tahu saat jadwal ronda berganti pukul 18.00 WIB.",
        });
      } catch {
        /* ignore */
      }
    }
  }

  const lockText = win.locked
    ? `Terkunci · ${countdownToOpen(win.openInMin)}`
    : win.canCheckIn
      ? "Pos buka · absen masuk 22.00–24.00"
      : "Jam selesai · sampai 05.00";

  const gpsLabel = !geo ? "Menunggu GPS" : inside ? "Sudah di dalam radius pos" : "Di luar radius pos";
  const gpsTone = !geo ? "bg-[#2a2418] text-amber" : inside ? "bg-primary/15 text-primary" : "bg-[#3a2220] text-[#e8a39c]";

  return (
    <>
      {showNotice ? (
        <section className="mb-6 rounded-[28px] bg-[#141c18] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[1.35rem] font-medium leading-tight">Jadwal Ronda Berganti</p>
              <p className="mt-2 text-[1.05rem] leading-snug text-foreground/90">
                Sekarang giliran petugas {win.hari}. Silakan cek daftar yang bertugas malam ini.
              </p>
              <p className="mt-3 text-[0.98rem] leading-snug text-muted-foreground">
                Daftar petugas berganti setiap hari pukul 18.00 WIB.
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-2xl leading-none text-muted-foreground"
              onClick={() => dismissNotice(win.shiftDate)}
              aria-label="Tutup"
            >
              ×
            </button>
          </div>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#1c2621] px-4 py-3 text-[1.02rem]"
            onClick={() => void enableNotify()}
          >
            <Bell size={18} />
            Aktifkan notifikasi HP
          </button>
        </section>
      ) : null}

      <h1 className="font-clock text-[2.55rem] leading-[0.95] tracking-tight">{APP_NAME}</h1>
      <p className="mt-2 text-[1.35rem] font-medium text-primary">{DESA}</p>
      <p className="mt-3 max-w-sm text-[1.05rem] leading-snug text-muted-foreground">
        Absen ronda malam. Pilih nama, ketik PIN, ambil foto.
      </p>

      <div className="mt-10 text-center">
        <p className="text-[0.78rem] font-medium tracking-[0.22em] text-muted-foreground">
          WAKTU INDONESIA BARAT
        </p>
        <div className="mt-1 flex items-end justify-center gap-2">
          <p className="clock-face text-[5.2rem] leading-none text-[#f3eee4]">
            {pad2(real.hour)}.{pad2(real.minute)}
          </p>
          <p className="mb-2 min-w-[2ch] text-left font-clock text-[1.85rem] leading-none text-[#7d8578]">
            {pad2(real.second)}
          </p>
        </div>
        <p className="mt-3 text-[1.15rem] text-muted-foreground">{formatLongDate(real)}</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#2a2418] px-3.5 py-1.5 text-[0.92rem] text-amber">
          <Lock size={14} />
          {lockText}
        </p>
      </div>

      <section className="mt-8 rounded-[28px] border border-border/70 bg-card/40 p-5">
        <p className="text-[0.78rem] font-medium tracking-[0.16em] text-muted-foreground">
          YANG JAGA MALAM INI
        </p>
        <p className="mt-2 font-clock text-[2rem]">{win.hari}</p>
        <p className="text-sm text-muted-foreground">Berganti otomatis pukul 18.00 WIB.</p>
        <ul className="mt-4 flex flex-col gap-2">
          {duty.map((m) => (
            <li key={m.name} className="rounded-2xl bg-primary/12 px-4 py-3 text-lg font-medium text-primary">
              {m.name}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3 text-primary">
          <button type="button" className="underline-offset-4 hover:underline" onClick={() => onPage("jadwal")}>
            Lihat jadwal lengkap
          </button>
          <button type="button" className="underline-offset-4 hover:underline" onClick={() => onPage("laporan")}>
            Laporan absensi
          </button>
        </div>
      </section>

      <button
        type="button"
        className="mt-5 h-16 w-full rounded-2xl bg-primary text-lg font-semibold text-primary-foreground"
        onClick={() => onPage("absen")}
      >
        Absen masuk
      </button>
      <button
        type="button"
        className="mt-3 w-full rounded-2xl border border-border py-3 text-base text-muted-foreground"
        onClick={() => {
          setTestMode(true);
          onPage("absen");
        }}
      >
        Coba alur absen (uji coba)
      </button>

      <section className="mt-6 rounded-[28px] bg-card p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
            <MapPin size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Status GPS poskamling</p>
            <p className="text-2xl font-medium">Radius {POS_RADIUS_M} meter</p>
          </div>
        </div>
        <p className={`mt-4 inline-flex rounded-full px-3.5 py-1.5 text-sm font-medium ${gpsTone}`}>{gpsLabel}</p>
        <p className="mt-3 text-base text-foreground/90">
          {geo
            ? inside
              ? `Jarak ke pos ${formatDistance(dist ?? 0)} — absen diizinkan.`
              : `Jarak ke pos ${formatDistance(dist ?? 0)} — mendekat sampai ${POS_RADIUS_M} m.`
            : "Aktifkan izin lokasi HP agar jarak ke pos bisa dihitung."}
        </p>
        {geo ? (
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            Posisi Anda {geo.lat.toFixed(6)}, {geo.lng.toFixed(6)}
          </p>
        ) : null}
        <p className="mt-3 text-sm leading-snug text-muted-foreground">
          Titik pos: {POS_LAT}, {POS_LNG}. Absen masuk dan selesai hanya dalam {POS_RADIUS_M} meter.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-clock text-[2rem]">Sudah absen malam ini?</h2>
        <p className="mt-1 text-muted-foreground">
          {tonight.length} dari {duty.length} petugas terjadwal sudah absen.
        </p>
        <p className="text-sm text-muted-foreground">Tekan foto untuk memperbesar.</p>
        <ul className="mt-4 flex flex-col gap-2">
          {duty.map((m) => {
            const row = tonight.find((r) => r.name === m.name);
            const thumb =
              tonightPhotos.find((p) => p.name === m.name && p.mode === "masuk") ??
              tonightPhotos.find((p) => p.name === m.name);
            return (
              <li key={m.name} className="flex items-center gap-3 rounded-2xl bg-card p-3">
                {thumb ? (
                  <button
                    type="button"
                    className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted"
                    onClick={() => setViewer({ src: thumb.src, caption: `${m.name} · ${row?.masuk ?? thumb.at}` })}
                  >
                    <img src={thumb.src} alt="" className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-muted text-sm text-muted-foreground">
                    Foto
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-medium">{m.name}</span>
                  <span className="text-sm text-muted-foreground">{row?.masuk ? `Masuk ${row.masuk}` : "Belum absen"}</span>
                </span>
                <span className={`text-sm ${row ? "text-primary" : "text-muted-foreground"}`}>
                  {row ? "Hadir" : "Belum"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {viewer ? <PhotoViewer src={viewer.src} caption={viewer.caption} onClose={() => setViewer(null)} /> : null}
    </>
  );
}
