import { Copy, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { PhotoViewer } from "../components/photo-viewer";
import { ROSTER } from "../lib/ronda/roster";
import { useRonda } from "../lib/ronda/store";
import { addDaysIso, BULAN, getShiftWindow, getWibParts } from "../lib/ronda/time";
import type { Page } from "../app";

type Range = "malam" | "tanggal" | "minggu" | "bulan";

function downloadCsv(name: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

export function Laporan({ testNow, onPage }: { testNow: Date; onPage: (p: Page) => void }) {
  const win = useMemo(() => getShiftWindow(testNow), [testNow]);
  const { attendance, photos } = useRonda();
  const [range, setRange] = useState<Range>("malam");
  const [showTest, setShowTest] = useState(false);
  const [pickedDate, setPickedDate] = useState(win.shiftDate);
  const [viewer, setViewer] = useState<{ src: string; caption: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const source = showTest ? attendance : attendance.filter((a) => !a.test);
  const duty = ROSTER[win.weekday] ?? [];
  const focusDate = range === "tanggal" ? pickedDate : win.shiftDate;

  const filtered = useMemo(() => {
    if (range === "malam" || range === "tanggal") return source.filter((a) => a.shiftDate === focusDate);
    if (range === "minggu") {
      const from = addDaysIso(win.shiftDate, -6);
      return source.filter((a) => a.shiftDate >= from && a.shiftDate <= win.shiftDate);
    }
    const month = win.shiftDate.slice(0, 7);
    return source.filter((a) => a.shiftDate.startsWith(month));
  }, [range, source, focusDate, win.shiftDate]);

  const names =
    range === "malam"
      ? duty.map((d) => d.name)
      : [...new Set([...filtered.map((a) => a.name), ...(range === "tanggal" ? (ROSTER[win.weekday] ?? []).map((d) => d.name) : [])])];

  const hadir = range === "malam" ? duty.filter((d) => filtered.some((a) => a.name === d.name)).length : filtered.length;
  const total = range === "malam" ? duty.length : Math.max(filtered.length, 1);

  function excel() {
    const rows =
      range === "malam"
        ? duty.map((d) => {
            const a = filtered.find((x) => x.name === d.name);
            return [d.name, win.hari, win.shiftDate, a?.masuk ?? "", a?.selesai ?? "", a ? String(a.poin) : "0", a ? "Hadir" : "Belum"];
          })
        : filtered.map((a) => [a.name, a.hari, a.shiftDate, a.masuk ?? "", a.selesai ?? "", String(a.poin), a.selesai ? "Selesai" : "Masuk"]);
    downloadCsv(`ronda-siaga-${win.shiftDate}.csv`, [["Nama", "Hari", "Tanggal", "Jam Masuk", "Jam Selesai", "Poin", "Status"], ...rows]);
  }

  async function copy() {
    const text =
      range === "malam"
        ? duty.map((d) => {
            const a = filtered.find((x) => x.name === d.name);
            return `${d.name}\t${a?.masuk ?? "Belum absen"}\t${a?.selesai ?? "-"}`;
          }).join("\n")
        : filtered.map((a) => `${a.name}\t${a.hari}\t${a.shiftDate}\t${a.masuk ?? "-"}\t${a.selesai ?? "-"}`).join("\n");
    await navigator.clipboard.writeText(text || "(kosong)");
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const p = getWibParts(testNow);
  const title =
    range === "bulan" ? `${BULAN[p.month - 1]} ${p.year}` : range === "minggu" ? "7 hari terakhir" : `Malam ${win.hari}`;

  return (
    <>
      <p className="text-[0.72rem] font-medium tracking-[0.16em] text-muted-foreground">BUKU RONDA</p>
      <h1 className="mt-1 font-clock text-[2.35rem] leading-none">Laporan absensi</h1>
      <p className="mt-2 text-[1.02rem] leading-snug text-muted-foreground">
        Siapa sudah absen, ringkasan hadir, dan unduh Excel bulanan.
      </p>

      <div className="mt-5 flex rounded-full bg-[#141c18] p-1">
        {(
          [
            ["malam", "Malam ini"],
            ["tanggal", "Tanggal"],
            ["minggu", "Minggu"],
            ["bulan", "Bulan"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setRange(id)}
            className={`flex-1 rounded-full px-2 py-2 text-[0.9rem] ${range === id ? "bg-[#9bb896] text-[#122016]" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {range === "tanggal" ? (
        <input
          type="date"
          value={pickedDate}
          onChange={(e) => setPickedDate(e.target.value)}
          className="mt-3 w-full rounded-2xl bg-[#141c18] px-4 py-3 text-foreground"
        />
      ) : null}

      <p className="mt-4 text-[1.02rem]">{title}</p>

      <section className="mt-3 rounded-[24px] bg-[#141c18] p-5">
        <p className="text-sm text-muted-foreground">Ringkasan</p>
        <p className="mt-1 font-clock text-[2.6rem] leading-none">
          {range === "malam" ? `${hadir} / ${duty.length}` : String(filtered.length)}
        </p>
        <p className="mt-2 max-w-xs text-[1.02rem] leading-snug text-muted-foreground">
          {range === "malam"
            ? "petugas sudah absen dari yang terjadwal."
            : "catatan absen pada filter ini."}
        </p>
      </section>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1b2420] text-[0.98rem] font-medium"
          onClick={excel}
        >
          <Download size={16} /> Unduh Excel
        </button>
        <button
          type="button"
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1b2420] text-[0.98rem] font-medium"
          onClick={() => void copy()}
        >
          <Copy size={16} /> {copied ? "Tersalin" : "Salin data"}
        </button>
      </div>
      <p className="mt-3 text-sm leading-snug text-muted-foreground">
        Rekap bulanan format Excel. Bisa dibuka di Excel atau Google Sheets. Data uji coba tidak ikut unduh dan tidak masuk grafik poin.
      </p>

      <h2 className="mt-6 text-[1.25rem] font-medium">Daftar petugas</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {(range === "malam" ? duty.map((d) => d.name) : names).map((name) => {
          const row = filtered.find((a) => a.name === name);
          const thumb =
            row?.photoMasuk ||
            photos.find((p) => p.name === name && p.shiftDate === (row?.shiftDate ?? focusDate) && p.mode === "masuk")?.src;
          return (
            <li key={name} className="flex items-center gap-3 rounded-[22px] bg-[#141c18] p-3">
              {thumb ? (
                <button
                  type="button"
                  className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#1b2420]"
                  onClick={() => setViewer({ src: thumb, caption: `${name} · ${row?.masuk ?? ""}` })}
                >
                  <img src={thumb} alt="" className="h-full w-full object-cover" />
                </button>
              ) : (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#1b2420] text-sm text-muted-foreground">
                  Foto
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[1.12rem] font-medium">{name}</span>
                <span className="text-sm text-muted-foreground">
                  {row ? `Masuk ${row.masuk ?? "—"}${row.selesai ? ` · Selesai ${row.selesai}` : ""}` : "Belum absen"}
                </span>
              </span>
              <span className="text-muted-foreground">{row ? "Hadir" : "—"}</span>
            </li>
          );
        })}
      </ul>

      <label className="mt-5 flex items-center gap-3 text-[1.02rem]">
        <input
          type="checkbox"
          checked={showTest}
          onChange={(e) => setShowTest(e.target.checked)}
          className="h-4 w-4 accent-[#9bb896]"
        />
        Tampilkan data uji coba
      </label>

      <button type="button" className="mt-6 mb-4 w-full text-center text-primary" onClick={() => onPage("beranda")}>
        Kembali ke beranda
      </button>

      {viewer ? <PhotoViewer src={viewer.src} caption={viewer.caption} onClose={() => setViewer(null)} /> : null}
    </>
  );
}
