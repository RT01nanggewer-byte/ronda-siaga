# Ronda Siaga

Absensi ronda malam poskamling **RT 01 RW 02 Desa Mulyasari**.

Tampilan mengikuti versi live (tema gelap, jam besar WIB, menu bawah 5 item).

## Fitur

- Beranda: jam besar WIB, banner **Jadwal Ronda Berganti**, tombol **Aktifkan notifikasi HP**
- Menu bawah: **Beranda · Absen · Foto · Jadwal · Menu**
- Absen 4 langkah: Nama → PIN → Foto kamera HP → Lokasi GPS
- Foto: galeri masuk / selesai / kampung / kejadian, tekan untuk memperbesar
- Jadwal berganti otomatis pukul **18.00 WIB**
- GPS 10 m di `-6.8405242, 107.8978413`
- Jam absen masuk 22.00–24.00, selesai 22.01–05.00
- Laporan: malam ini / tanggal / minggu / bulan, unduh Excel, salin data, grafik poin
- Mode uji coba (tidak masuk Excel / grafik)
- Tidak ada halaman login — setiap petugas memakai PIN sendiri

## Stack

| Bagian | Teknologi |
|---|---|
| UI | Vite 8 + React 19 + Tailwind CSS v4 |
| Ikon | lucide-react |
| State | zustand (tersimpan di HP) |
| Branch | `main` |

## Menjalankan lokal

Butuh **Node.js 22+**.

```bash
git clone https://github.com/RT01nanggewer-byte/ronda-siaga.git
cd ronda-siaga
npm install
npm run dev
```

Buka http://localhost:8080

## Deploy Vercel

1. Import repo `RT01nanggewer-byte/ronda-siaga`
2. Framework Preset: **Other** (atau Vite)
3. Build command: `npm run build`
4. Output: `dist`
5. Node 22

Data absen tersimpan di browser warga (localStorage). Tidak wajib database.
