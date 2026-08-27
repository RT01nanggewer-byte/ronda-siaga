import { useMemo, useState } from "react";
import { PhotoViewer } from "../components/photo-viewer";
import { useRonda, type AbsenMode } from "../lib/ronda/store";
import { getShiftWindow } from "../lib/ronda/time";

const FILTERS: { id: "semua" | AbsenMode; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "masuk", label: "Masuk" },
  { id: "selesai", label: "Selesai" },
  { id: "kampung", label: "Kampung" },
  { id: "kejadian", label: "Kejadian" },
];

export function Foto({ testNow }: { testNow: Date }) {
  const win = useMemo(() => getShiftWindow(testNow), [testNow]);
  const photos = useRonda((s) => s.photos);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("semua");
  const [open, setOpen] = useState<string | null>(null);
  const list = photos.filter((p) => (filter === "semua" ? true : p.mode === filter));
  const current = list.find((p) => p.id === open);

  return (
    <>
      <p className="text-sm tracking-[0.14em] text-muted-foreground">GALERI POSKAMLING</p>
      <h1 className="mt-1 font-clock text-[2.4rem] leading-none">Foto</h1>
      <p className="mt-2 text-muted-foreground">
        Bukti absen, keliling kampung, dan kejadian. Tekan foto untuk memperbesar.
      </p>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-4 py-2 text-sm ${filter === f.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <section className="mt-8 rounded-[28px] bg-card p-5 text-muted-foreground">
          Belum ada foto {filter === "semua" ? "" : filter}. Ambil dari halaman Absen, pilih jenis Masuk / Selesai /
          Kampung / Kejadian.
          <p className="mt-2 text-sm">Malam {win.hari} · jadwal berganti pukul 18.00 WIB.</p>
        </section>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3">
          {list.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full overflow-hidden rounded-2xl bg-card text-left"
                onClick={() => setOpen(p.id)}
              >
                <img src={p.src} alt="" className="h-36 w-full object-cover" />
                <span className="block px-3 py-2">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="text-sm capitalize text-muted-foreground">
                    {p.mode} · {p.at}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {current ? (
        <PhotoViewer
          src={current.src}
          caption={`${current.name} · ${current.mode} · ${current.at}`}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}
