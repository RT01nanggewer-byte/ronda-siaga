import { useMemo } from "react";
import { ROSTER } from "../lib/ronda/roster";
import { getShiftWindow, HARI } from "../lib/ronda/time";

export function Jadwal({ testNow }: { testNow: Date }) {
  const win = useMemo(() => getShiftWindow(testNow), [testNow]);
  return (
    <>
      <p className="text-sm tracking-[0.14em] text-muted-foreground">MINGGU BERJALAN</p>
      <h1 className="mt-1 font-clock text-[2.4rem] leading-none">Jadwal ronda</h1>
      <p className="mt-2 text-muted-foreground">
        Nama hijau sedang dinas. Satu dinas dari pukul 18.00 sampai 18.00 esok hari. Tidak ganti jam 00.00.
      </p>
      <p className="mt-2 text-sm text-primary">{win.rangeLabel}. {win.nextChangeLabel}.</p>
      <div className="mt-5 flex flex-col gap-4">
        {HARI.map((hari, i) => (
          <section
            key={hari}
            className={`rounded-[28px] bg-card p-4 ${win.weekday === i ? "shadow-[0_0_0_2px_#9bb896]" : ""}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-clock text-[1.85rem]">{hari}</h2>
              <span className="text-sm text-muted-foreground">
                {win.weekday === i ? "Dinas sekarang" : `${(ROSTER[i] ?? []).length} orang`}
              </span>
            </div>
            <ul className="mt-3 flex flex-col gap-1">
              {(ROSTER[i] ?? []).map((m) => (
                <li key={m.name} className={win.weekday === i ? "font-medium text-primary" : ""}>
                  {m.name}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
