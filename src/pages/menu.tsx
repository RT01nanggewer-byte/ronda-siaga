import { APP_NAME, APP_VERSION, DESA, POS_LAT, POS_LNG, POS_RADIUS_M } from "../lib/ronda/config";
import { allOfficers } from "../lib/ronda/roster";
import { useRonda } from "../lib/ronda/store";
import type { Page } from "../app";

export function Menu({ onPage }: { onPage: (p: Page) => void }) {
  const { settings, setTestMode, clearAbsen, attendance, photos } = useRonda();
  const members = allOfficers();

  return (
    <>
      <p className="text-sm tracking-[0.14em] text-muted-foreground">PENGURUS</p>
      <h1 className="mt-1 font-clock text-[2.4rem] leading-none">Menu</h1>
      <p className="mt-2 text-muted-foreground">
        Atur anggota, PIN, lokasi pos, dan jam absen. Perubahan tersimpan di HP ini.
      </p>

      <section className="mt-6 rounded-[28px] bg-card p-5">
        <h2 className="text-xl font-medium">Daftar anggota ronda</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {members.length} orang terdaftar. Jadwal harian ada di halaman Jadwal.
        </p>
        <ul className="mt-3 max-h-64 space-y-1 overflow-auto text-[0.98rem]">
          {members.map((m) => (
            <li key={m.name} className="flex justify-between gap-3 border-b border-border/50 py-2">
              <span>{m.name}</span>
              <span className="font-mono tracking-widest text-muted-foreground">{m.pin}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-[28px] bg-card p-5">
        <h2 className="text-xl font-medium">PIN bawaan</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Setiap petugas punya PIN 4 angka. Pola PIN awal: Minggu 10xx, Senin 20xx, Selasa 30xx, Rabu 40xx, Kamis
          50xx, Jum&apos;at 60xx, Sabtu 70xx.
        </p>
      </section>

      <section className="mt-4 rounded-[28px] bg-card p-5">
        <h2 className="text-xl font-medium">Lokasi poskamling</h2>
        <p className="mt-1 text-sm text-muted-foreground">Absen hanya sah dalam radius dari titik ini.</p>
        <p className="mt-2 font-mono text-primary">
          {POS_LAT}, {POS_LNG}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Radius {POS_RADIUS_M} meter</p>
      </section>

      <section className="mt-4 rounded-[28px] bg-card p-5">
        <h2 className="text-xl font-medium">Jam buka absen</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Absen masuk dari 22.00 sampai 24.00 WIB. Absen selesai sampai 05.00. Jadwal petugas berganti pukul 18.00.
        </p>
      </section>

      <section className="mt-4 rounded-[28px] bg-card p-5">
        <h2 className="text-xl font-medium">Mode uji coba</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Untuk mencoba absen di siang hari. Jam dianggap malam ronda dan lokasi di pos. Data uji tidak masuk grafik
          prestasi dan tidak ikut unduh Excel.
        </p>
        <button
          type="button"
          className={`mt-4 h-14 w-full rounded-2xl text-base font-medium ${settings.testMode ? "bg-amber text-primary-foreground" : "bg-primary text-primary-foreground"}`}
          onClick={() => setTestMode(!settings.testMode)}
        >
          {settings.testMode ? "Matikan malam uji" : "Aktifkan malam uji"}
        </button>
      </section>

      <section className="mt-4 rounded-[28px] bg-card p-5">
        <h2 className="text-xl font-medium">Hapus semua data absen</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Menghapus riwayat masuk, selesai, foto, dan poin. Daftar anggota dan jadwal tidak ikut terhapus.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tersimpan {attendance.length} absen · {photos.length} foto
        </p>
        <button
          type="button"
          className="mt-4 h-12 w-full rounded-2xl border border-[#c97870]/40 text-[#c97870]"
          onClick={() => {
            if (confirm("Hapus semua data absen dan foto?")) clearAbsen();
          }}
        >
          Hapus semua data absen
        </button>
      </section>

      <section className="mt-4 rounded-[28px] bg-card p-5">
        <h2 className="text-xl font-medium">Laporan & spreadsheet</h2>
        <p className="mt-2 text-sm text-muted-foreground">Unduh Excel, salin data, dan lihat grafik di Laporan.</p>
        <button type="button" className="mt-3 text-primary" onClick={() => onPage("laporan")}>
          Buka laporan absensi
        </button>
      </section>

      <section className="mt-4 rounded-[28px] bg-card p-5">
        <h2 className="text-xl font-medium">Versi aplikasi</h2>
        <p className="mt-1 text-lg">
          {APP_NAME} {APP_VERSION}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {DESA}. Absensi poskamling dengan GPS, foto bukti, jadwal ronda, dan rekap spreadsheet.
        </p>
      </section>
    </>
  );
}
