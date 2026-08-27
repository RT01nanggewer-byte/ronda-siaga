import { CHECK_IN_START, DUTY_ROLLOVER } from "./config";

const WIB = 7 * 60 * 60 * 1000;
export const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"] as const;

export function getWibParts(date = new Date()) {
  const v = new Date(date.getTime() + WIB);
  const year = v.getUTCFullYear();
  const month = v.getUTCMonth() + 1;
  const day = v.getUTCDate();
  const hour = v.getUTCHours();
  const minute = v.getUTCMinutes();
  const weekday = v.getUTCDay();
  const dateIso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { year, month, day, hour, minute, weekday, dateIso, hari: HARI[weekday] };
}

function addDaysIso(dateIso: string, days: number) {
  const [y, m, d] = dateIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function weekdayFromIso(dateIso: string) {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Selasa 18.00–Rabu 17.59 = jadwal Selasa. Absen masuk tetap 22.00. */
export function getShiftWindow(now = new Date()) {
  const p = getWibParts(now);
  const minutes = p.hour * 60 + p.minute;
  const afterRollover = minutes >= DUTY_ROLLOVER.hour * 60;
  const start = CHECK_IN_START.hour * 60 + CHECK_IN_START.minute;
  const shiftDate = afterRollover ? p.dateIso : addDaysIso(p.dateIso, -1);
  const weekday = weekdayFromIso(shiftDate);
  const canCheckIn = minutes >= start;
  const canCheckOut = minutes >= start + 1 || minutes <= 5 * 60;
  return {
    shiftDate,
    weekday,
    hari: HARI[weekday],
    canCheckIn,
    canCheckOut,
    locked: !canCheckIn && !canCheckOut,
    dutyLabel: "18.00",
  };
}
