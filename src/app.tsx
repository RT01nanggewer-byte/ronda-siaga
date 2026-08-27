import { useEffect, useMemo, useState } from "react";
import { POS_LAT, POS_LNG, POS_RADIUS_M } from "./lib/ronda/config";
import { formatDistance, haversineMeters, isInsidePos } from "./lib/ronda/geo";
import { ROSTER } from "./lib/ronda/roster";
import { getShiftWindow, getWibParts, HARI } from "./lib/ronda/time";

type Page = "beranda" | "absen" | "jadwal" | "laporan";
type Row = { name: string; at: string; photo?: string };

export function App() {
  const [now, setNow] = useState(() => new Date());
  const [page, setPage] = useState<Page>("beranda");
  const [present, setPresent] = useState<Row[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState(true);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(
      (p) => setGeo({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setGeo(null),
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, []);

  const window = useMemo(() => getShiftWindow(now), [now]);
  const wib = useMemo(() => getWibParts(now), [now]);
  const duty = ROSTER[window.weekday] ?? [];
  const inside = geo ? isInsidePos(geo.lat, geo.lng) : false;
  const dist = geo ? haversineMeters(geo.lat, geo.lng) : null;

  function submitAbsen() {
    const officer = duty.find((d) => d.name === picked);
    if (!officer) return setMsg("Pilih nama yang jaga malam ini.");
    if (officer.pin !== pin) return setMsg("PIN salah. Coba lagi.");
    if (window.locked) return setMsg(`Absen masuk baru buka pukul 22.00 WIB.`);
    if (!window.canCheckIn) return setMsg("Absen masuk hanya 22.00–24.00 WIB.");
    if (!inside) return setMsg(`Harus dalam ${POS_RADIUS_M} m dari poskamling.`);
    if (present.some((r) => r.name === officer.name)) return setMsg("Sudah absen malam ini.");
    const stamp = `${String(wib.hour).padStart(2, "0")}.${String(wib.minute).padStart(2, "0")} WIB`;
    setPresent((rows) => [...rows, { name: officer.name, at: stamp }]);
    setMsg(null);
    setPin("");
    setPage("beranda");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-background px-4 pb-28 pt-5">
      {page === "beranda" && (
        <>
          {notice ? (
            <section className="mb-5 rounded-3xl bg-primary/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-medium">Jadwal Ronda Berganti</p>
                  <p className="mt-1 text-base">
                    Sekarang giliran petugas {window.hari}. Silakan cek daftar yang bertugas malam ini.
                  </p>
                </div>
                <button type="button" className="rounded-lg px-3 py-2" onClick={() => setNotice(false)}>
                  ×
                </button>
              </div>
            </section>
          ) : null}
          <h1 className="text-3xl font-semibold tracking-tight">
            Ronda Siaga
            <span className="mt-1 block text-xl font-medium text-primary">RT 01 RW 02 Desa Mulyasari</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Absen ronda malam. Pilih nama, ketik PIN, ambil foto.</p>
          <p className="mt-4 text-lg">
            {window.hari}, {wib.day} · {String(wib.hour).padStart(2, "0")}.{String(wib.minute).padStart(2, "0")} WIB
          </p>
          <p className="text-sm text-muted-foreground">
            {window.locked ? "Terkunci sampai 22.00" : window.canCheckIn ? "Pos buka · absen masuk 22.00–24.00" : "Jam selesai · sampai 05.00"}
          </p>
          <section className="mt-5 rounded-3xl bg-card p-4">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Yang jaga malam ini</p>
            <p className="mt-1 text-lg font-medium">{window.hari}</p>
            <p className="text-sm text-muted-foreground">Berganti otomatis pukul 18.00 WIB.</p>
            <ul className="mt-3 flex flex-col gap-2">
              {duty.map((m) => (
                <li key={m.name} className="rounded-2xl bg-primary/10 px-4 py-3 text-lg font-medium text-primary">
                  {m.name}
                </li>
              ))}
            </ul>
          </section>
          <button type="button" className="mt-5 h-16 w-full rounded-xl bg-primary text-lg font-medium text-primary-foreground" onClick={() => setPage("absen")}>
            Absen masuk
          </button>
          <p className="mt-4 text-sm text-muted-foreground">
            GPS {geo ? (inside ? `sudah di pos · ${formatDistance(dist ?? 0)}` : `masih ${formatDistance(dist ?? 0)} dari pos`) : "menunggu lokasi"}.
            Absen hanya dalam {POS_RADIUS_M} m dari {POS_LAT}, {POS_LNG}.
          </p>
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Sudah absen malam ini?</h2>
            <p className="mt-1 text-muted-foreground">
              {present.length} dari {duty.length} petugas terjadwal sudah absen.
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {duty.map((m) => {
                const row = present.find((r) => r.name === m.name);
                return (
                  <li key={m.name} className="flex items-center justify-between rounded-2xl bg-card p-3">
                    <span>
                      <span className="block text-lg font-medium">{m.name}</span>
                      <span className="text-sm text-muted-foreground">{row ? `Masuk ${row.at}` : "Belum absen"}</span>
                    </span>
                    <span className="text-sm">{row ? "Hadir" : "Belum"}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      {page === "absen" && (
        <>
          <h1 className="text-3xl font-semibold">Absen masuk</h1>
          <p className="mt-2 text-muted-foreground">
            {window.hari} · giliran malam ini (berganti pukul 18.00)
          </p>
          <p className="mt-5 text-lg font-medium">1. Pilih nama Anda</p>
          <p className="text-muted-foreground">Nama hijau jaga malam {window.hari}. Hanya mereka yang boleh absen.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {duty.map((m) => (
              <button
                key={m.name}
                type="button"
                onClick={() => { setPicked(m.name); setPin(""); setMsg(null); }}
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
              <p className="mb-3 text-center text-muted-foreground tracking-[0.4em]">{pin.replace(/./g, "•") || "—"}</p>
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9","","0","hapus"].map((k) =>
                  k === "" ? <span key="e" /> : (
                    <button
                      key={k}
                      type="button"
                      className="min-h-16 rounded-2xl bg-card text-2xl"
                      onClick={() => setPin((p) => (k === "hapus" ? p.slice(0, -1) : p.length < 4 ? p + k : p))}
                    >
                      {k === "hapus" ? "Hapus" : k}
                    </button>
                  ),
                )}
              </div>
              <button type="button" className="mt-6 h-16 w-full rounded-xl bg-primary text-lg font-medium text-primary-foreground" onClick={submitAbsen}>
                Kirim absen masuk
              </button>
            </>
          ) : null}
          {msg ? <p className="mt-3 text-base text-[#c97870]">{msg}</p> : null}
        </>
      )}

      {page === "jadwal" && (
        <>
          <h1 className="text-3xl font-semibold">Jadwal ronda</h1>
          <p className="mt-2 text-muted-foreground">
            Nama hijau bertugas malam ini. Jadwal berganti otomatis setiap hari pukul 18.00.
          </p>
          <div className="mt-5 flex flex-col gap-4">
            {HARI.map((hari, i) => (
              <section key={hari} className={`rounded-3xl bg-card p-4 ${window.weekday === i ? "shadow-[0_0_0_2px_#9bb896]" : ""}`}>
                <div className="flex justify-between">
                  <h2 className="text-2xl">{hari}</h2>
                  <span className="text-sm text-muted-foreground">{window.weekday === i ? "Malam ini" : `${(ROSTER[i] ?? []).length} orang`}</span>
                </div>
                <ul className="mt-3 flex flex-col gap-1">
                  {(ROSTER[i] ?? []).map((m) => (
                    <li key={m.name} className={window.weekday === i ? "text-primary font-medium" : ""}>{m.name}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      {page === "laporan" && (
        <>
          <h1 className="text-3xl font-semibold">Laporan absensi</h1>
          <p className="mt-2 text-muted-foreground">Malam {window.hari} · {present.length}/{duty.length} sudah absen.</p>
          <ul className="mt-5 flex flex-col gap-2">
            {duty.map((m) => {
              const row = present.find((r) => r.name === m.name);
              return (
                <li key={m.name} className="rounded-3xl bg-card p-4">
                  <p className="text-lg font-medium">{m.name}</p>
                  <p className="text-sm text-muted-foreground">{row ? `Masuk ${row.at}` : "Belum absen"}</p>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95">
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {(
            [
              ["beranda", "Beranda"],
              ["absen", "Absen"],
              ["jadwal", "Jadwal"],
              ["laporan", "Laporan"],
            ] as const
          ).map(([key, label]) => (
            <li key={key}>
              <button
                type="button"
                className={`flex h-16 w-full items-center justify-center ${page === key ? "text-primary" : "text-muted-foreground"}`}
                onClick={() => setPage(key)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
