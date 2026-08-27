import { CalendarDays, Camera, House, Menu as MenuIcon, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { POS_LAT, POS_LNG, TEST_CLOCK } from "./lib/ronda/config";
import { useRonda } from "./lib/ronda/store";
import { getWibParts } from "./lib/ronda/time";
import { Absen } from "./pages/absen";
import { Beranda } from "./pages/beranda";
import { Foto } from "./pages/foto";
import { Jadwal } from "./pages/jadwal";
import { Laporan } from "./pages/laporan";
import { Menu } from "./pages/menu";

export type Page = "beranda" | "absen" | "foto" | "jadwal" | "menu" | "laporan";

const NAV: { id: Page; label: string; icon: typeof House }[] = [
  { id: "beranda", label: "Beranda", icon: House },
  { id: "absen", label: "Absen", icon: Shield },
  { id: "foto", label: "Foto", icon: Camera },
  { id: "jadwal", label: "Jadwal", icon: CalendarDays },
  { id: "menu", label: "Menu", icon: MenuIcon },
];

function parsePage(): Page {
  const raw = (location.hash.replace("#", "") || location.pathname.replace(/^\//, "") || "beranda").split("?")[0];
  if (raw === "" || raw === "index.html") return "beranda";
  if (["beranda", "absen", "foto", "jadwal", "menu", "laporan"].includes(raw)) return raw as Page;
  return "beranda";
}

export function App() {
  const [now, setNow] = useState(() => new Date());
  const [page, setPage] = useState<Page>(parsePage);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const testMode = useRonda((s) => s.settings.testMode);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onHash = () => setPage(parsePage());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(
      (p) => setGeo({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setGeo(null),
      { enableHighAccuracy: true, maximumAge: 8_000, timeout: 12_000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, []);

  const testNow = useMemo(() => {
    if (!testMode) return now;
    const p = getWibParts(now);
    const utc = Date.UTC(p.year, p.month - 1, p.day, TEST_CLOCK.hour - 7, TEST_CLOCK.minute, p.second);
    return new Date(utc);
  }, [now, testMode]);

  const effectiveGeo = testMode ? { lat: POS_LAT, lng: POS_LNG } : geo;

  function go(next: Page) {
    setPage(next);
    const hash = next === "beranda" ? "" : next;
    if (location.hash.replace("#", "") !== hash) history.replaceState(null, "", hash ? `#${hash}` : "#");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-background px-4 pt-5 safe-bottom">
      {testMode ? (
        <p className="mb-3 rounded-2xl bg-[#2a2418] px-3 py-2 text-center text-sm text-amber">
          Mode uji coba aktif · jam 22.15 · GPS di pos
        </p>
      ) : null}

      {page === "beranda" && <Beranda now={now} testNow={testNow} geo={effectiveGeo} onPage={go} />}
      {page === "absen" && <Absen testNow={testNow} geo={effectiveGeo} onPage={go} />}
      {page === "foto" && <Foto testNow={testNow} />}
      {page === "jadwal" && <Jadwal testNow={testNow} />}
      {page === "menu" && <Menu onPage={go} />}
      {page === "laporan" && <Laporan testNow={testNow} onPage={go} />}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-[#0e1210]/96 backdrop-blur-md">
        <ul className="mx-auto grid max-w-lg grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = page === id || (id === "menu" && page === "laporan");
            return (
              <li key={id}>
                <button
                  type="button"
                  className={`flex h-[4.15rem] w-full flex-col items-center justify-center gap-1 text-[0.78rem] ${active ? "text-primary" : "text-muted-foreground"}`}
                  onClick={() => go(id)}
                >
                  <Icon size={22} strokeWidth={active ? 2.2 : 1.7} />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
