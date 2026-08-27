import { CHECK_IN_START, CHECK_OUT_END, DUTY_ROLLOVER } from "./config";

export const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"] as const;
export const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

const TZ = "Asia/Jakarta";

export function getWibParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const year = Number(pick("year"));
  const month = Number(pick("month"));
  const day = Number(pick("day"));
  const hour = Number(pick("hour"));
  const minute = Number(pick("minute"));
  const second = Number(pick("second"));
  const dateIso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const weekday = weekdayFromIso(dateIso);
  return { year, month, day, hour, minute, second, weekday, dateIso, hari: HARI[weekday] };
}

export function addDaysIso(dateIso: string, days: number) {
  const [y, m, d] = dateIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function weekdayFromIso(dateIso: string) {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function formatLongDate(p: ReturnType<typeof getWibParts>) {
  return `${p.hari}, ${p.day} ${BULAN[p.month - 1]} ${p.year}`;
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Jadwal ronda TIDAK ganti jam 00.00.
 * Satu dinas = dari jam 18.00 sampai 18.00 berikutnya.
 * Contoh: Kamis 18.00 → Jumat 17.59 = petugas Kamis.
 */
export function getShiftWindow(now = new Date()) {
  const p = getWibParts(now);
  const minutes = p.hour * 60 + p.minute;
  const roll = DUTY_ROLLOVER.hour * 60 + DUTY_ROLLOVER.minute;
  const afterRollover = minutes >= roll;
  const start = CHECK_IN_START.hour * 60 + CHECK_IN_START.minute;
  const endOut = CHECK_OUT_END.hour * 60 + CHECK_OUT_END.minute;
  const shiftDate = afterRollover ? p.dateIso : addDaysIso(p.dateIso, -1);
  const weekday = weekdayFromIso(shiftDate);
  const nextDate = afterRollover ? addDaysIso(p.dateIso, 1) : p.dateIso;
  const nextHari = HARI[weekdayFromIso(nextDate)];
  const canCheckIn = minutes >= start;
  const canCheckOut = minutes >= start + 1 || minutes <= endOut;
  const locked = !canCheckIn && minutes > endOut;
  const openInMin = locked ? start - minutes : 0;
  const minsToNext = afterRollover ? 24 * 60 - minutes + roll : roll - minutes;
  return {
    shiftDate,
    weekday,
    hari: HARI[weekday],
    nextHari,
    nextChangeLabel: `Ganti ke ${nextHari} pukul 18.00 WIB`,
    rangeLabel: `${HARI[weekday]} 18.00 – ${nextHari} 18.00`,
    minsToNext,
    canCheckIn,
    canCheckOut,
    locked,
    openInMin,
    dutyLabel: "18.00",
    parts: p,
  };
}

export function countdownToOpen(openInMin: number) {
  if (openInMin <= 0) return "";
  const h = Math.floor(openInMin / 60);
  const m = openInMin % 60;
  if (h <= 0) return `buka ${m} menit lagi`;
  return `buka ${h} jam ${m} menit lagi`;
}
