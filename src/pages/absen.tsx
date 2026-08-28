import { useEffect, useMemo, useState } from "react";
import { CameraCapture, type CaptureResult } from "../components/camera-capture";
import { GpsRadar } from "../components/gps-radar";
import { POS_RADIUS_M } from "../lib/ronda/config";
import { isInsidePos } from "../lib/ronda/geo";
import { actionLabel } from "../lib/ronda/labels";
import { ROSTER, allOfficers } from "../lib/ronda/roster";
import { type AbsenMode, useRonda } from "../lib/ronda/store";
import { getShiftWindow, pad2 } from "../lib/ronda/time";
import type { Page } from "../app";

const MODES: { id: AbsenMode; label: string }[] = [
  { id: "masuk", label: "Masuk" },
  { id: "selesai", label: "Pulang" },
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
  const { settings, attendance, upsertAttendance, addPhoto, absenStart, setAbsenStart } = useRonda();
  const [mode, setMode] = useState<AbsenMode>(absenStart?.mode ?? "masuk");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [picked, setPicked] = useState<string | null>(absenStart?.name ?? null);
  const [pin, setPin] = useState("");
  const [media, setMedia] = useState<CaptureResult | null>(null);
  const [cam, setCam] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function hasMasukTonight(name: string | null) {
    if (!name) return false;
    return attendance.some((a) => a.name === name && a.shiftDate === win.shiftDate && Boolean(a.masuk));
  }

  function skipPinFor(nextMode: AbsenMode, name: string | null) {
    return (nextMode === "kampung" || nextMode === "kejadian") && hasMasukTonight(name);
  }

  useEffect(() => {
    if (!absenStart) return;
    setMode(absenStart.mode);
    if (absenStart.name) {
      setPicked(absenStart.name);
      if (absenStart.skipPin || skipPinFor(absenStart.mode, absenStart.name)) {
        setStep(3);
        setCam(true);
      } else {
        setStep(2);
      }
    } else {
      setStep(1);
    }
    setAbsenStart(null);
  }, [absenStart, setAbsenStart]);

  const officer = duty.find((d) => d.name === picked) ?? allOfficers().find((d) => d.name === picked);
  const stamp = `${pad2(win.parts.hour)}.${pad2(win.parts.minute)} WIB`;
  const inside = settings.testMode || (geo ? isInsidePos(geo.lat, geo.lng) : false);
  const nextLabel = actionLabel(mode);

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
    if (skipPinFor(mode, name)) {
      setStep(3);
      setCam(true);
    } else {
      setStep(2);
    }
  }

  function chooseMode(next: AbsenMode) {
    setMode(next);
    setMsg(null);
    setMedia(null);
    if (skipPinFor(next, picked)) {
      setStep(3);
      setCam(true);
    }
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
    setMsg(null);
  }

  function submit() {
    try {
      if (!picked) return setMsg("Pilih nama petugas dulu.");
      if (!officer) return setMsg("Nama petugas tidak ditemukan. Pilih ulang.");
      if (!media) return setMsg("Ambil foto atau video dulu.");
      if (mode === "masuk" && !settings.testMode && !win.canCheckIn) {
        return setMsg("Absen masuk hanya 22.00–24.00 WIB.");
      }
      if (mode === "selesai" && !settings.testMode && !win.canCheckOut) {
        return setMsg("Absen pulang hanya 22.01–05.00 WIB.");
      }
      if ((mode === "masuk" || mode === "selesai") && !inside) {
        return setMsg(`Harus dalam ${POS_RADIUS_M} m dari poskamling.`);
      }
      const existing = attendance.find((a) => a.name === officer.name && a.shiftDate === win.shiftDate);
      const id = `${officer.name}-${win.shiftDate}`;
      if (mode === "masuk" || mode === "selesai") {
        upsertAttendance({
          id,
          name: officer.name,
          shiftDate: win.shiftDate,
          hari: win.hari,
          masuk: mode === "masuk" ? stamp : existing?.masuk,
          selesai: mode === "selesai" ? stamp : existing?.selesai,
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
      setMsg("Terkirim.");
      onPage(mode === "kampung" || mode === "kejadian" || media.kind === "video" ? "foto" : "beranda");
    } catch {
      setMsg("Gagal menyimpan. Hapus data lama di Menu, lalu kirim lagi.");
    }
  }

  const sendLabel =
    mode === "kampung"
      ? "Kirim foto kampung"
      : mode === "kejadian"
        ? media?.kind === "video"
          ? "Kirim video kejadian"
          : "Kirim foto kejadian"
        : mode === "selesai"
          ? "Kirim absen pulang"
          : "Kirim absen masuk";

  return (
    <div className="pb-28">
      <p className="text-[0.78rem] font-medium tracking-[0.16em] text-primary/80">IKUTI 4 LANGKAH</p>
      <h1 className="mt-1 font-clock text-[2.45rem] leading-none">Absen {mode === "selesai" ? "pulang" : mode}</h1>
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
                    if (skipPinFor(mode, picked)) {
                      setStep(3);
                      setCam(true);
                    } else {
                      setStep(2);
                      setCam(false);
                    }
                  } else if (n === 3 && picked) {
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
            onClick={() => chooseMode(m.id)}
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
            Nama hijau jaga malam {win.hari}.
            {mode === "kampung" || mode === "kejadian"
              ? " Yang sudah absen masuk tidak perlu PIN lagi."
              : ""}
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
                <span className="mt-0.5 block text-sm opacity-80">
                  {hasMasukTonight(m.name) && (mode === "kampung" || mode === "kejadian")
                    ? "Langsung kamera"
                    : "Jaga malam ini"}
                </span>
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
          <button type="button" className="mt-4 h-14 w-full rounded-2xl bg-primary text-lg font-medium text-primary-foreground" onClick={checkPin}>
            {nextLabel}
          </button>
          <button type="button" className="mt-3 w-full text-muted-foreground" onClick={() => resetFlow()}>
            Ganti nama
          </button>
        </section>
      ) : null}

      {step === 3 && picked ? (
        <section className="mt-5 rounded-[28px] bg-[#141c18] p-5">
          <p className="text-lg font-medium">3. {nextLabel} {picked}</p>
          {media?.kind === "video" ? (
            <video src={media.src} className="mt-3 h-44 w-full rounded-2xl object-cover" controls playsInline />
          ) : media ? (
            <img src={media.src} alt="" className="mt-3 h-44 w-full rounded-2xl object-cover" />
          ) : null}
          <button type="button" className="mt-4 h-14 w-full rounded-2xl bg-primary text-lg font-medium text-primary-foreground" onClick={() => setCam(true)}>
            {media ? "Ambil ulang" : nextLabel}
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
            className="relative z-30 mt-4 mb-2 h-16 w-full rounded-2xl bg-primary text-lg font-semibold text-primary-foreground"
            onClick={() => submit()}
          >
            {sendLabel}
          </button>
        </section>
      ) : null}

      {msg ? <p className="mt-3 text-base text-[#c97870]">{msg}</p> : null}
      <button type="button" className="mt-6 w-full text-center text-primary" onClick={() => onPage("laporan")}>
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
            setStep(3);
          }}
        />
      ) : null}
    </div>
  );
}
