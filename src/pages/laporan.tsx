import { Copy, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PhotoViewer } from "../components/photo-viewer";
import { ROSTER, allOfficers } from "../lib/ronda/roster";
import { attendanceToSheetRow } from "../lib/ronda/sheet";
import { useRonda } from "../lib/ronda/store";
import { addDaysIso, BULAN, getShiftWindow, getWibParts } from "../lib/ronda/time";
import type { Page } from "../app";

type Range = "malam" | "tanggal" | "minggu" | "bulan" | "tahun";

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
  const { attendance, photos, settings, syncAllToSheet } = useRonda();
  const [range, setRange] = useState<Range>("malam");
  const [showTest, setShowTest] = useState(false);
  const [pickedDate, setPickedDate] = useState(win.shiftDate);
  const [viewer, setViewer] = useState<{ src: string; caption: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const source = showTest ? attendance : attendance.filter((a) => !a.test);
  const duty = ROSTER[win.weekday] ?? [];
  const focusDate = range === "tanggal" ? pickedDate : win.shiftDate;
  const year = win.shiftDate.slice(0, 4);
  const month = win.shiftDate.slice(0, 7);

  const filtered = useMemo(() => {
    if (range === "malam" || range === "tanggal") return source.filter((a) => a.shiftDate === focusDate);
    if (range === "minggu") {
      const from = addDaysIso(win.shiftDate, -6);
      return source.filter((a) => a.shiftDate >= from && a.shiftDate <= win.shiftDate);
    }
    if (range === "tahun") return source.filter((a) => a.shiftDate.startsWith(year));
    return source.filter((a) => a.shiftDate.startsWith(month));
  }, [range, source, focusDate, win.shiftDate, year, month]);

  const chart = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of filtered) map.set(a.name, (map.get(a.name) ?? 0) + (a.poin || 0));
    if (range === "malam") {
      for (const d of duty) if (!map.has(d.name)) map.set(d.name, 0);
    }
    return [...map.entries()]
      .map(([name, poin]) => ({ name, poin }))
      .sort((a, b) => b.poin - a.poin);
  }, [filtered, range, duty]);

  const names =
    range === "malam"
      ? duty.map((d) => d.name)
      : chart.length
        ? chart.map((c) => c.name)
        : [...new Set(filtered.map((a) => a.name))];

  const hadir = range === "malam" ? duty.filter((d) => filtered.some((a) => a.name === d.name)).length : filtered.length;

  function excel() {
    const header = [
      "Tanggal",
      "Hari",
      "Bulan",
      "Tahun",
      "Nama",
      "Jam Masuk",
      "Jam Selesai",
      "Poin",
      "Foto Masuk",
      "Foto Selesai",
      "Foto Kampung",
      "Foto Kejadian",
    ];
    const list =
      range === "malam"
        ? duty.map((d) => {
            const a = filtered.find((x) => x.name === d.name);
            return a
              ? attendanceToSheetRow(a, photos)
              : {
                  tanggal: win.shiftDate,
                  hari: win.hari,
                  bulan: BULAN[Number(win.shiftDate.slice(5, 7)) - 1],
                  tahun: win.shiftDate.slice(0, 4),
                  nama: d.name,
                  jamMasuk: "",
                  jamSelesai: "",
                  poin: 0,
                  jenis: "Belum",
                  adaFotoMasuk: "Tidak",
                  adaFotoSelesai: "Tidak",
                  adaFotoKampung: "Tidak",
                  adaFotoKejadian: "Tidak",
                };
          })
        : filtered.map((a) => attendanceToSheetRow(a, photos));
    downloadCsv(`ronda-siaga-${range}-${win.shiftDate}.csv`, [
      header,
      ...list.map((r) => [
        r.tanggal,
        r.hari,
        r.bulan,
        r.tahun,
        r.nama,
        r.jamMasuk,
        r.jamSelesai,
        String(r.poin),
        r.adaFotoMasuk,
        r.adaFotoSelesai,
        r.adaFotoKampung,
        r.adaFotoKejadian,
      ]),
    ]);
  }

  async function copy() {
    const text = filtered
      .map((a) => {
        const r = attendanceToSheetRow(a, photos);
        return `${r.tanggal}\t${r.hari}\t${r.bulan}\t${r.tahun}\t${r.nama}\t${r.jamMasuk || "-"}\t${r.jamSelesai || "-"}\t${r.poin}`;
      })
      .join("\n");
    await navigator.clipboard.writeText(text || "(kosong)");
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function syncSheet() {
    if (!settings.sheetUrl) {
      setSyncMsg("Isi tautan Google Sheet dulu di Menu.");
      return;
    }
    const ok = await syncAllToSheet();
    setSyncMsg(ok ? "Data dikirim ke Spreadsheet. Buka Google Sheet untuk cek." : "Gagal mengirim. Cek tautan di Menu.");
  }

  const p = getWibParts(testNow);
  const title =
    range === "tahun"
      ? `Tahun ${year}`
      : range === "bulan"
        ? `${BULAN[p.month - 1]} ${p.year}`
        : range === "minggu"
          ? "7 hari terakhir"
          : `Malam ${win.hari}`;

  return (
    <>
      <p className="text-[0.72rem] font-medium tracking-[0.16em] text-muted-foreground">BUKU RONDA</p>
      <h1 className="mt-1 font-clock text-[2.35rem] leading-none">Laporan absensi</h1>
      <p className="mt-2 text-[1.02rem] leading-snug text-muted-foreground">
        Rekap nama, tanggal, jam masuk-selesai, foto, Excel, dan grafik petugas paling aktif.
      </p>

      <div className="mt-5 grid grid-cols-5 gap-1 rounded-full bg-[#141c18] p-1">
        {(
          [
            ["malam", "Malam"],
            ["tanggal", "Tgl"],
            ["minggu", "Minggu"],
            ["bulan", "Bulan"],
            ["tahun", "Tahun"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setRange(id)}
            className={`rounded-full px-1 py-2 text-[0.82rem] ${range === id ? "bg-[#9bb896] text-[#122016]" : "text-muted-foreground"}`}
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
            : range === "tahun"
              ? "catatan absen sepanjang tahun ini."
              : range === "bulan"
                ? "catatan absen sepanjang bulan ini."
                : "catatan absen pada filter ini."}
        </p>
      </section>

      {chart.some((c) => c.poin > 0) ? (
        <section className="mt-4 rounded-[24px] bg-[#141c18] p-4">
          <p className="text-sm text-muted-foreground">Grafik poin · petugas paling aktif</p>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart.slice(0, 10)} margin={{ left: -22, right: 8, top: 8, bottom: 28 }}>
                <XAxis dataKey="name" tick={{ fill: "#8b9388", fontSize: 10 }} interval={0} angle={-28} height={48} />
                <YAxis tick={{ fill: "#8b9388", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#171c19", border: "1px solid #2a332e", borderRadius: 12 }}
                  labelStyle={{ color: "#ece8df" }}
                />
                <Bar dataKey="poin" fill="#9bb896" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ol className="mt-2 space-y-1 text-sm">
            {chart.slice(0, 5).map((c, i) => (
              <li key={c.name} className="flex justify-between text-muted-foreground">
                <span>
                  {i + 1}. {c.name}
                </span>
                <span className="text-primary">{c.poin} poin</span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">Masuk 1 poin. Masuk + selesai 2 poin. Bolos tidak mengurangi.</p>
        </section>
      ) : null}

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
      <button
        type="button"
        className="mt-2 h-12 w-full rounded-2xl bg-primary/15 text-primary"
        onClick={() => void syncSheet()}
      >
        Kirim ke Google Spreadsheet
      </button>
      {syncMsg ? <p className="mt-2 text-sm text-muted-foreground">{syncMsg}</p> : null}
      <p className="mt-3 text-sm leading-snug text-muted-foreground">
        File Excel berisi tanggal, hari, bulan, tahun, nama, jam masuk, jam selesai, poin, dan status foto. Buka di Excel atau Google Sheets. Foto aslinya tetap di aplikasi (tekan foto untuk melihat). Data uji coba tidak ikut unduh kecuali dicentang.
      </p>

      <h2 className="mt-6 text-[1.25rem] font-medium">Daftar petugas</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {names.map((name) => {
          const row = filtered.find((a) => a.name === name);
          const thumb =
            row?.photoMasuk ||
            photos.find((p) => p.name === name && p.shiftDate === (row?.shiftDate ?? focusDate) && p.mode === "masuk")?.src;
          const poin = chart.find((c) => c.name === name)?.poin ?? row?.poin ?? 0;
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
                  {row
                    ? `Masuk ${row.masuk ?? "—"}${row.selesai ? ` · Selesai ${row.selesai}` : ""}`
                    : "Belum absen"}
                </span>
              </span>
              <span className="text-right text-sm text-muted-foreground">
                {row ? `${poin} poin` : "—"}
              </span>
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

      <p className="mt-4 text-xs text-muted-foreground">{allOfficers().length} petugas terdaftar di jadwal.</p>

      <button type="button" className="mt-6 mb-4 w-full text-center text-primary" onClick={() => onPage("beranda")}>
        Kembali ke beranda
      </button>

      {viewer ? <PhotoViewer src={viewer.src} caption={viewer.caption} onClose={() => setViewer(null)} /> : null}
    </>
  );
}
