import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  const { attendance } = useRonda();
  const [range, setRange] = useState<Range>("malam");
  const real = attendance.filter((a) => !a.test);
  const duty = ROSTER[win.weekday] ?? [];

  const filtered = useMemo(() => {
    if (range === "malam" || range === "tanggal") return real.filter((a) => a.shiftDate === win.shiftDate);
    if (range === "minggu") {
      const from = addDaysIso(win.shiftDate, -6);
      return real.filter((a) => a.shiftDate >= from && a.shiftDate <= win.shiftDate);
    }
    const month = win.shiftDate.slice(0, 7);
    return real.filter((a) => a.shiftDate.startsWith(month));
  }, [range, real, win.shiftDate]);

  const chart = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of real) map.set(a.name, (map.get(a.name) ?? 0) + a.poin);
    return [...map.entries()]
      .map(([name, poin]) => ({ name, poin }))
      .sort((a, b) => b.poin - a.poin)
      .slice(0, 12);
  }, [real]);

  function excel() {
    downloadCsv(`ronda-siaga-${win.shiftDate}.csv`, [
      ["Nama", "Hari", "Tanggal", "Jam Masuk", "Jam Selesai", "Poin", "Status"],
      ...filtered.map((a) => [
        a.name,
        a.hari,
        a.shiftDate,
        a.masuk ?? "",
        a.selesai ?? "",
        String(a.poin),
        a.selesai ? "Selesai" : "Masuk",
      ]),
    ]);
  }

  async function copy() {
    const text = filtered
      .map((a) => `${a.name}\t${a.hari}\t${a.shiftDate}\t${a.masuk ?? "-"}\t${a.selesai ?? "-"}\t${a.poin}`)
      .join("\n");
    await navigator.clipboard.writeText(text || "(kosong)");
    alert("Data disalin.");
  }

  const p = getWibParts(testNow);
  const title =
    range === "bulan" ? `${BULAN[p.month - 1]} ${p.year}` : range === "minggu" ? "7 hari terakhir" : `Malam ${win.hari}`;

  return (
    <>
      <p className="text-sm tracking-[0.14em] text-muted-foreground">BUKU RONDA</p>
      <h1 className="mt-1 font-clock text-[2.4rem] leading-none">Laporan absensi</h1>
      <p className="mt-2 text-muted-foreground">Siapa sudah absen, ringkasan hadir, dan unduh Excel bulanan.</p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
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
            className={`rounded-full px-4 py-2 text-sm ${range === id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" className="h-12 flex-1 rounded-2xl bg-primary font-medium text-primary-foreground" onClick={excel}>
          Unduh Excel
        </button>
        <button type="button" className="h-12 flex-1 rounded-2xl bg-card" onClick={() => void copy()}>
          Salin data
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Rekap {title}. Data uji coba tidak ikut unduh dan tidak masuk grafik poin.
      </p>

      {chart.length ? (
        <div className="mt-5 h-56 rounded-[28px] bg-card p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#8b9388", fontSize: 10 }} interval={0} angle={-25} height={48} />
              <YAxis tick={{ fill: "#8b9388", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#171c19", border: "1px solid #2a332e", borderRadius: 12 }}
                labelStyle={{ color: "#ece8df" }}
              />
              <Bar dataKey="poin" fill="#9bb896" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      <ul className="mt-5 flex flex-col gap-2">
        {(range === "malam" ? duty.map((d) => d.name) : [...new Set(filtered.map((a) => a.name))]).map((name) => {
          const row = filtered.find((a) => a.name === name);
          return (
            <li key={name} className="rounded-3xl bg-card p-4">
              <p className="text-lg font-medium">{name}</p>
              <p className="text-sm text-muted-foreground">
                {row ? `Masuk ${row.masuk ?? "—"} · Selesai ${row.selesai ?? "—"} · ${row.poin} poin` : "Belum absen"}
              </p>
            </li>
          );
        })}
      </ul>
      <button type="button" className="mt-6 text-primary" onClick={() => onPage("beranda")}>
        Kembali ke beranda
      </button>
    </>
  );
}
