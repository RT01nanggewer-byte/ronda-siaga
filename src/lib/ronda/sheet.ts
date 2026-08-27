import { BULAN, HARI, weekdayFromIso } from "./time";
import type { Attendance, Photo } from "./store";

export type SheetRow = {
  tanggal: string;
  hari: string;
  bulan: string;
  tahun: string;
  nama: string;
  jamMasuk: string;
  jamSelesai: string;
  poin: number;
  jenis: string;
  adaFotoMasuk: string;
  adaFotoSelesai: string;
  adaFotoKampung: string;
  adaFotoKejadian: string;
};

export function splitShiftDate(shiftDate: string) {
  const [y, m, d] = shiftDate.split("-").map(Number);
  return {
    tahun: String(y),
    bulanNomor: String(m).padStart(2, "0"),
    bulanNama: BULAN[m - 1] ?? "",
    tanggal: String(d).padStart(2, "0"),
    hari: HARI[weekdayFromIso(shiftDate)] ?? "",
  };
}

export function attendanceToSheetRow(a: Attendance, photos: Photo[]): SheetRow {
  const p = splitShiftDate(a.shiftDate);
  const related = photos.filter((x) => x.name === a.name && x.shiftDate === a.shiftDate && !x.test);
  return {
    tanggal: a.shiftDate,
    hari: a.hari || p.hari,
    bulan: p.bulanNama,
    tahun: p.tahun,
    nama: a.name,
    jamMasuk: a.masuk ?? "",
    jamSelesai: a.selesai ?? "",
    poin: a.poin ?? 0,
    jenis: a.selesai ? "Masuk+Selesai" : a.masuk ? "Masuk" : "Foto",
    adaFotoMasuk: a.photoMasuk || related.some((x) => x.mode === "masuk") ? "Ya" : "Tidak",
    adaFotoSelesai: a.photoSelesai || related.some((x) => x.mode === "selesai") ? "Ya" : "Tidak",
    adaFotoKampung: related.some((x) => x.mode === "kampung") ? "Ya" : "Tidak",
    adaFotoKejadian: related.some((x) => x.mode === "kejadian") ? "Ya" : "Tidak",
  };
}

export async function pushRowsToSheet(url: string, rows: SheetRow[]) {
  const endpoint = url.trim();
  if (!endpoint || rows.length === 0) return false;
  try {
    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ rows }),
    });
    return true;
  } catch {
    return false;
  }
}
