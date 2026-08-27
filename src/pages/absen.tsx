import { MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { CameraCapture } from "../components/camera-capture";
import { POS_LAT, POS_LNG, POS_RADIUS_M } from "../lib/ronda/config";
import { formatDistance, haversineMeters, isInsidePos } from "../lib/ronda/geo";
import { ROSTER } from "../lib/ronda/roster";
import { type AbsenMode, useRonda } from "../lib/ronda/store";
import { getShiftWindow, pad2 } from "../lib/ronda/time";
import type { Page } from "../app";

const MODES: { id: AbsenMode; label: string }[] = [
  { id: "masuk", label: "Masuk" },
  { id: "selesai", label: "Selesai" },
  { id: "kampung", label: "Kampung" },
  { id: "kejadian", label: "Kejadian" },
];

export function Absen({
  testNow,
  geo,
  onPage,
}: {
  testNow: Date;
  geo: { lat: number; lng: number } | null;
  onPage: (p: Page) => void;
}) {
  const win = useMemo(() => getShiftWindow(testNow), [testNow]);
  const duty = ROSTER[win.weekday] ?? [];
  const { settings, attendance, upsertAttendance, addPhoto, setTestMode } = useRonda();
  const [mode, setMode] = useState<AbsenMode>("masuk");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [picked, setPicked] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [cam, setCam] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const officer = duty.find((d) => d.name === picked);
  const stamp = `${pad2(win.parts.hour)}.${pad2(win.parts.minute)} WIB`;
  const inside = settings.testMode || (geo ? isInsidePos(geo.lat, geo.lng) : false);
  const dist = geo ? haversineMeters(geo.lat, geo.lng) : null;

  function pickName(name: string) {
    setPicked(name);
    setPin("");
    setPhoto(null);
    setMsg(null);
    setStep(2);
  }

  function checkPin() {
    if (!officer) return setMsg("Pilih nama yang jaga malam ini.");
    if (officer.pin !== pin) return setMsg("PIN salah. Coba lagi.");
    setMsg(null);
    setStep(3);
    setCam(true);
  }

  function afterPhoto(dataUrl: string) {
    setPhoto(dataUrl);
    setCam(false);
    setStep(4);
  }

  function submit() {
    if (!officer || !photo) return;
    if (mode === "masuk" && !settings.testMode && !win.canCheckIn) {
      return setMsg("Absen masuk hanya 22.00–24.00 WIB. Aktifkan mode uji di Menu jika mencoba siang hari.");
    }
    if (mode === "selesai" && !settings.testMode && !win.canCheckOut) {
      return setMsg("Absen selesai hanya 22.01–05.00 WIB.");
    }
    if ((mode === "masuk" || mode === "selesai") && !inside) {
      return setMsg(`Harus dalam ${POS_RADIUS_M} m dari poskamling.`);
    }
    const existing = attendance.find((a) => a.name === officer.name && a.shiftDate === win.shiftDate);
    if (mode === "masuk" && existing?.masuk && !existing.test) {
      return setMsg("Sudah absen masuk malam ini.");
    }
    const id = `${officer.name}-${win.shiftDate}`;
    if (mode === "masuk" || mode === "selesai") {
      upsertAttendance({
        id,
        name: officer.name,
        shiftDate: win.shiftDate,
        hari: win.hari,
        masuk: mode === "masuk" ? stamp : existing?.masuk,
        selesai: mode === "selesai" ? stamp : existing?.selesai,
        photoMasuk: mode === "masuk" ? photo : existing?.photoMasuk,
        photoSelesai: mode === "selesai" ? photo : existing?.photoSelesai,
        test: settings.testMode,
        poin: 1,
      });
    }
    addPhoto({
      id: `${id}-${mode}-${Date.now()}`,
      name: officer.name,
      mode,
      src: photo,
      at: stamp,
      shiftDate: win.shiftDate,
      test: settings.testMode,
    });
    setMsg(null);
    if (settings.testMode) setTestMode(false);
    onPage("beranda");
  }

  const gpsLabel = settings.testMode
    ? "Mode uji · lokasi dianggap di pos"
    : !geo
      ? "Menunggu GPS"
      : inside
        ? "Sudah di dalam radius pos"
        : "Di luar radius pos";
  const gpsTone = settings.testMode || inside ? "bg-primary/15 text-primary" : !geo ? "bg-[#2a2418] text-amber" : "bg-[#3a2220] text-[#e8a39c]";

  return (
    <>
      <p className="text-sm tracking-[0.14em] text-muted-foreground">IKUTI 4 LANGKAH</p>
      <h1 className="mt-1 font-clock text-[2.4rem] leading-none">Absen {mode}</h1>
      <p className="mt-2 text-muted-foreground">
        {win.hari} · giliran malam ini (berganti pukul 18.00)
      </p>

      <ol className="mt-5 grid grid-cols-4 gap-2 text-center text-sm">
        {["Nama", "PIN", "Foto", "Lokasi"].map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3 | 4;
          const active = step === n;
          const done = step > n;
          return (
            <li
              key={label}
              className={`rounded-2xl px-1 py-2 ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/15 text-primary" : "bg-card text-muted-foreground"}`}
            >
              <span className="block text-xs opacity-70">{n}</span>
              {label}
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMode(m.id);
              setMsg(null);
            }}
            className={`rounded-full px-4 py-2 text-sm ${mode === m.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="mt-6 text-lg font-medium">1. Pilih nama Anda</p>
      <p className="text-muted-foreground">Nama hijau jaga malam {win.hari}. Hanya mereka yang boleh absen.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {duty.map((m) => (
          <button
            key={m.name}
            type="button"
            onClick={() => pickName(m.name)}
            className={`min-h-16 rounded-2xl px-3 py-3 text-left font-medium ${
              picked === m.name ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
            }`}
          >
            {m.name}
            <span className="mt-0.5 block text-sm opacity-80">Jaga malam ini</span>
          </button>
        ))}
      </div>

      {picked ? (
        <>
          <p className="mt-6 text-lg font-medium">2. Ketik PIN {picked}</p>
          <p className="mb-3 text-center tracking-[0.45em] text-muted-foreground">{pin.replace(/./g, "\u2022") || "\u2014"}</p>
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "hapus"].map((k) =>
              k === "" ? (
                <span key="e" />
              ) : (
                <button
                  key={k}
                  type="button"
                  className="min-h-16 rounded-2xl bg-card text-2xl"
                  onClick={() => {
                    setPin((p) => (k === "hapus" ? p.slice(0, -1) : p.length < 4 ? p + k : p));
                    setMsg(null);
                  }}
                >
                  {k === "hapus" ? "Hapus" : k}
                </button>
              ),
            )}
          </div>
          <button
            type="button"
            className="mt-4 h-14 w-full rounded-2xl bg-primary text-lg font-medium text-primary-foreground"
            onClick={checkPin}
          >
            Lanjut ke foto
          </button>
        </>
      ) : null}

      {photo ? (
        <section className="mt-6">
          <p className="text-lg font-medium">3. Foto tersimpan</p>
          <img src={photo} alt="" className="mt-2 h-40 w-full rounded-2xl object-cover" />
          <button type="button" className="mt-2 text-primary" onClick={() => setCam(true)}>
            Ambil ulang
          </button>
        </section>
      ) : null}

      {step >= 4 ? (
        <section className="mt-6 rounded-2xl bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
              <MapPin size={20} />
            </span>
            <div>
              <p className="text-lg font-medium">4. Lokasi GPS</p>
              <p className="text-sm text-muted-foreground">Radius pos {POS_RADIUS_M} meter</p>
            </div>
          </div>
          <p className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${gpsTone}`}>{gpsLabel}</p>
          <p className="mt-3 text-foreground/90">
            {settings.testMode
              ? "Mode uji aktif. Pengecekan jarak dilewati."
              : geo
                ? `Jarak ke pos ${formatDistance(dist ?? 0)}. Titik pos ${POS_LAT}, ${POS_LNG}.`
                : "Aktifkan izin lokasi HP untuk menghitung jarak ke pos."}
          </p>
          {geo ? (
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              Posisi Anda {geo.lat.toFixed(6)}, {geo.lng.toFixed(6)}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-4 h-16 w-full rounded-2xl bg-primary text-lg font-semibold text-primary-foreground"
            onClick={submit}
          >
            Kirim absen {mode}
          </button>
        </section>
      ) : null}

      {msg ? <p className="mt-3 text-base text-[#c97870]">{msg}</p> : null}
      <button type="button" className="mt-6 text-primary" onClick={() => onPage("laporan")}>
        Lihat siapa yang sudah absen
      </button>

      {cam && officer ? (
        <CameraCapture
          officer={officer.name}
          mode={mode}
          stamp={`${win.hari} ${stamp}`}
          onCapture={afterPhoto}
          onCancel={() => setCam(false)}
        />
      ) : null}
    </>
  );
}
