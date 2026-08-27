import { useMemo, useState } from "react";
import { CameraCapture, type CaptureResult } from "../components/camera-capture";
import { GpsRadar } from "../components/gps-radar";
import { POS_RADIUS_M } from "../lib/ronda/config";
import { isInsidePos } from "../lib/ronda/geo";
import { mediaTitle } from "../lib/ronda/labels";
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
  const [media, setMedia] = useState<CaptureResult | null>(null);
  const [cam, setCam] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const officer = duty.find((d) => d.name === picked);
  const stamp = `${pad2(win.parts.hour)}.${pad2(win.parts.minute)} WIB`;
  const inside = settings.testMode || (geo ? isInsidePos(geo.lat, geo.lng) : false);

  function resetFlow() {
    setPicked(null);
    setPin("");
    setMedia(null);
    setCam(false);
    setMsg(null);
    setStep(1);
  }

  function pickName(name: string) {
    setPicked(name);
    setPin("");
    setMedia(null);
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

  function afterCapture(result: CaptureResult) {
    setMedia(result);
    setCam(false);
    setStep(4);
  }

  function submit() {
    if (!officer || !media) return;
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
        photoMasuk: mode === "masuk" && media.kind === "foto" ? media.src : existing?.photoMasuk,
        photoSelesai: mode === "selesai" && media.kind === "foto" ? media.src : existing?.photoSelesai,
        test: settings.testMode,
        poin: 1,
      });
    }
    addPhoto({
      id: `${id}-${mode}-${Date.now()}`,
      name: officer.name,
      mode,
      src: media.src,
      at: stamp,
      shiftDate: win.shiftDate,
      test: settings.testMode,
      kind: media.kind,
      mediaId: media.mediaId,
    });
    setMsg(null);
    if (settings.testMode) setTestMode(false);
    onPage(media.kind === "video" || mode === "kampung" || mode === "kejadian" ? "foto" : "beranda");
  }

  const sendLabel =
    mode === "kampung"
      ? "Kirim foto kampung"
      : mode === "kejadian"
        ? media?.kind === "video"
          ? "Kirim video kejadian"
          : "Kirim foto kejadian"
        : `Kirim absen ${mode}`;

  return (
    <>
      <p className="text-[0.78rem] font-medium tracking-[0.16em] text-primary/80">IKUTI 4 LANGKAH</p>
      <h1 className="mt-1 font-clock text-[2.45rem] leading-none">Absen {mode}</h1>
      <p className="mt-2 text-[1.05rem] leading-snug text-muted-foreground">
        {win.hari} · giliran malam ini (berganti pukul 18.00)
      </p>

      <ol className="mt-5 grid grid-cols-4 gap-2 text-center text-sm">
        {["Nama", "PIN", "Foto", "Lokasi"].map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3 | 4;
          const active = step === n;
          const done = step > n;
          return (
            <li key={label}>
              <button
                type="button"
                className={`h-full w-full rounded-2xl px-1 py-2 ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/15 text-primary" : "bg-card text-muted-foreground"}`}
                onClick={() => {
                  if (n === 1) resetFlow();
                  else if (n === 2 && picked) {
                    setStep(2);
                    setCam(false);
                  } else if (n === 3 && picked && pin === officer?.pin) {
                    setStep(3);
                    setCam(true);
                  }
                }}
              >
                {n}. {label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMode(m.id);
              setMsg(null);
            }}
            className={`rounded-2xl px-1 py-2.5 text-sm ${mode === m.id ? "bg-primary text-primary-foreground" : "bg-[#141c18] text-muted-foreground"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {step === 1 ? (
        <section className="mt-5 rounded-[28px] bg-[#141c18] p-5">
          <p className="text-lg font-medium">1. Pilih nama Anda</p>
          <p className="mt-1 text-muted-foreground">
            Nama hijau jaga malam {win.hari}. Hanya mereka yang boleh absen.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {duty.map((m) => (
              <button
                key={m.name}
                type="button"
                onClick={() => pickName(m.name)}
                className="min-h-16 rounded-2xl bg-primary/12 px-3 py-3 text-left font-medium text-primary"
              >
                {m.name}
                <span className="mt-0.5 block text-sm opacity-80">Jaga malam ini</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === 2 && picked ? (
        <section className="mt-5 rounded-[28px] bg-[#141c18] p-5">
          <p className="text-lg font-medium">2. Ketik PIN {picked}</p>
          <p className="mt-3 mb-4 text-center font-clock text-3xl tracking-[0.35em] text-foreground">
            {pin.replace(/./g, "•") || "—"}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "hapus"].map((k) =>
              k === "" ? (
                <span key="e" />
              ) : (
                <button
                  key={k}
                  type="button"
                  className="min-h-16 rounded-2xl bg-[#1b2420] text-2xl"
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
            Lanjut ke kamera
          </button>
          <button type="button" className="mt-3 w-full text-muted-foreground" onClick={() => resetFlow()}>
            Ganti nama
          </button>
        </section>
      ) : null}

      {step === 3 && picked ? (
        <section className="mt-5 rounded-[28px] bg-[#141c18] p-5">
          <p className="text-lg font-medium">3. Kamera HP {picked}</p>
          <p className="mt-1 text-muted-foreground">
            {mode === "kejadian"
              ? "Ambil foto atau rekam video. Hasilnya jadi foto kejadian atau video kejadian."
              : mode === "kampung"
                ? "Ambil foto kampung memakai kamera bawaan HP."
                : "Foto memakai kamera bawaan HP. Ganti depan/belakang di aplikasi kamera."}
          </p>
          {media?.kind === "video" ? (
            <video src={media.src} className="mt-3 h-44 w-full rounded-2xl object-cover" controls playsInline />
          ) : media ? (
            <img src={media.src} alt="" className="mt-3 h-44 w-full rounded-2xl object-cover" />
          ) : null}
          <button
            type="button"
            className="mt-4 h-14 w-full rounded-2xl bg-primary text-lg font-medium text-primary-foreground"
            onClick={() => setCam(true)}
          >
            {media ? "Ambil ulang" : "Buka kamera HP"}
          </button>
          {media ? (
            <button type="button" className="mt-3 h-12 w-full rounded-2xl bg-[#1b2420]" onClick={() => setStep(4)}>
              Lanjut ke lokasi
            </button>
          ) : null}
        </section>
      ) : null}

      {step === 4 ? (
        <section className="mt-5">
          <p className="px-1 text-lg font-medium">4. Lokasi {picked}</p>
          <GpsRadar geo={geo} />
          {settings.testMode ? <p className="mt-2 text-sm text-amber">Mode uji · jarak dianggap di pos.</p> : null}
          <button
            type="button"
            className="mt-4 h-16 w-full rounded-2xl bg-primary text-lg font-semibold text-primary-foreground"
            onClick={submit}
          >
            {sendLabel}
          </button>
        </section>
      ) : null}

      {msg ? <p className="mt-3 text-base text-[#c97870]">{msg}</p> : null}
      <button type="button" className="mt-6 mb-3 w-full text-center text-primary" onClick={() => onPage("laporan")}>
        Lihat siapa yang sudah absen
      </button>

      {cam && officer ? (
        <CameraCapture
          officer={officer.name}
          mode={mode}
          stamp={`${win.hari} ${stamp}`}
          onCapture={afterCapture}
          onCancel={() => {
            setCam(false);
            if (!media) setStep(3);
          }}
        />
      ) : null}
    </>
  );
}
