import { Bell, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GpsRadar } from "../components/gps-radar";
import { PhotoViewer } from "../components/photo-viewer";
import { APP_NAME, DESA } from "../lib/ronda/config";
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
  const { settings, attendance, photos, dismissNotice, setNotifyEnabled, markNotified, setTestMode, setAbsenStart } =
    useRonda();
  const showNotice = settings.dismissedShiftDate !== win.shiftDate;
  const [viewer, setViewer] = useState<{ src: string; caption: string } | null>(null);

  const tonight = attendance.filter((a) => {
    if (a.shiftDate !== win.shiftDate) return false;
    return settings.testMode ? true : !a.test;
  });
  const tonightPhotos = photos.filter((p) => {
    if (p.shiftDate !== win.shiftDate) return false;
    return settings.testMode ? true : !p.test;
  });
  const waitingPulang = tonight.filter((a) => a.masuk && !a.selesai);
  const lastStillHere =
    settings.lastMasukName &&
    settings.lastMasukShift === win.shiftDate &&
    waitingPulang.some((a) => a.name === settings.lastMasukName)
      ? settings.lastMasukName
      : waitingPulang.length === 1
        ? waitingPulang[0].name
        : null;
  const showPulang = waitingPulang.length > 0;

  useEffect(() => {
    if (!settings.notifyEnabled) return;
    if (settings.notifiedShiftDate === win.shiftDate) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      new Notification("Jadwal Ronda Berganti", {
        body: `Sekarang giliran petugas ${win.hari}. Berganti setiap pukul 18.00 WIB, bukan jam 00.00.`,
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

  function goAbsen(mode: "masuk" | "selesai", name: string | null, skipPin = false) {
    setAbsenStart({ mode, name, skipPin });
    onPage("absen");
  }

  const lockText = win.locked
    ? `Terkunci · ${countdownToOpen(win.openInMin)}`
    : win.canCheckIn
      ? "Pos buka · absen masuk 22.00–24.00"
      : "Jam pulang · sampai 05.00";

  return (
    <>
      {showNotice ? (
        <section className="mb-6 rounded-[28px] bg-[#141c18] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[1.35rem] font-medium leading-tight">Jadwal Ronda Berganti</p>
              <p className="mt-2 text-[1.05rem] leading-snug text-foreground/90">
                Sekarang giliran petugas {win.hari}. {win.rangeLabel}.
              </p>
              <p className="mt-3 text-[0.98rem] leading-snug text-muted-foreground">
                Pergantian hanya pukul 18.00 WIB, bukan tengah malam.
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
        <p className="text-sm text-muted-foreground">{win.rangeLabel}</p>
        <p className="mt-1 text-sm text-primary">{win.nextChangeLabel}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {duty.map((m) => {
            const row = tonight.find((r) => r.name === m.name);
            const needPulang = Boolean(row?.masuk && !row.selesai);
            const done = Boolean(row?.masuk && row.selesai);
            return (
              <li key={m.name}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl bg-primary/12 px-4 py-3 text-left"
                  onClick={() => goAbsen(needPulang ? "selesai" : "masuk", m.name, needPulang)}
                >
                  <span className="text-lg font-medium text-primary">{m.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {done ? "Sudah pulang" : needPulang ? "Absen pulang" : "Absen masuk"}
                  </span>
                </button>
              </li>
            );
          })}
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
        onClick={() => goAbsen(showPulang ? "selesai" : "masuk", lastStillHere, Boolean(lastStillHere && showPulang))}
      >
        {showPulang ? (lastStillHere ? `Absen pulang · ${lastStillHere}` : "Absen pulang") : "Absen masuk"}
      </button>
      <button
        type="button"
        className="mt-3 w-full rounded-2xl border border-border py-3 text-base text-muted-foreground"
        onClick={() => {
          setTestMode(true);
          const waiting = attendance.filter((a) => a.shiftDate === win.shiftDate && a.masuk && !a.selesai);
          const name =
            settings.lastMasukName && waiting.some((a) => a.name === settings.lastMasukName)
              ? settings.lastMasukName
              : (waiting[0]?.name ?? null);
          goAbsen(name ? "selesai" : "masuk", name, Boolean(name));
        }}
      >
        Coba alur absen (uji coba)
      </button>

      <GpsRadar geo={geo} />

      <section className="mt-8">
        <h2 className="font-clock text-[2rem]">Sudah absen malam ini?</h2>
        <p className="mt-1 text-muted-foreground">
          {tonight.length} dari {duty.length} petugas {win.hari} sudah absen.
        </p>
        <p className="text-sm text-muted-foreground">Tekan foto untuk memperbesar. Nama yang sudah masuk bisa ketuk untuk absen pulang.</p>
        <ul className="mt-4 flex flex-col gap-2">
          {duty.map((m) => {
            const row = tonight.find((r) => r.name === m.name);
            const thumb =
              tonightPhotos.find((p) => p.name === m.name && p.mode === "masuk") ??
              tonightPhotos.find((p) => p.name === m.name);
            const needPulang = Boolean(row?.masuk && !row.selesai);
            return (
              <li key={m.name} className="flex items-center gap-3 rounded-[22px] bg-[#141c18] p-3">
                {thumb ? (
                  <button
                    type="button"
                    className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#1b2420]"
                    onClick={() => setViewer({ src: thumb.src, caption: `${m.name} · ${row?.masuk ?? thumb.at}` })}
                  >
                    <img src={thumb.src} alt="" className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#1b2420] text-lg text-[#6f776f]">
                    —
                  </span>
                )}
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => goAbsen(needPulang ? "selesai" : "masuk", m.name, needPulang)}
                >
                  <span className="block truncate text-[1.15rem] font-medium">{m.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {row?.selesai
                      ? `Masuk ${row.masuk} · Pulang ${row.selesai}`
                      : row?.masuk
                        ? `Masuk ${row.masuk}`
                        : "Belum absen"}
                  </span>
                </button>
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-sm ${row?.selesai ? "bg-primary/15 text-primary" : row ? "bg-[#2a2418] text-amber" : "bg-[#1b2420] text-muted-foreground"}`}
                  onClick={() => goAbsen(needPulang ? "selesai" : "masuk", m.name, needPulang)}
                >
                  {row?.selesai ? "Pulang" : row ? "Hadir" : "Belum"}
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className="mt-3 h-14 w-full rounded-2xl bg-[#1b2420] text-[1.08rem] font-medium text-[#d7e0d8]"
          onClick={() => onPage("laporan")}
        >
          Buka laporan lengkap
        </button>
      </section>

      {viewer ? <PhotoViewer src={viewer.src} caption={viewer.caption} onClose={() => setViewer(null)} /> : null}
    </>
  );
}
