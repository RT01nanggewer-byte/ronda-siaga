# Ronda Siaga

Absensi ronda malam poskamling **RT 01 RW 02 Desa Mulyasari**.

Aplikasi PWA: pilih nama → PIN 4 angka → foto kamera HP → GPS 10 m dari pos. Jadwal berganti otomatis pukul **18.00 WIB**.

Tidak ada halaman login. Setiap petugas memakai PIN masing-masing.

## Stack

| Bagian | Teknologi |
|---|---|
| Framework | **TanStack Start** (Vite 8 + React 19) — *bukan* Next.js |
| UI | Tailwind CSS v4 |
| Data | Postgres (Neon di produksi) |
| Branch utama | `main` |

## Menjalankan lokal

Butuh **Node.js 22+**.

```bash
git clone https://github.com/RT01nanggewer-byte/ronda-siaga.git
cd ronda-siaga
cp .env.example .env
npm install
npm run dev
```

Buka http://localhost:8080

## Deploy Vercel

1. Buat database Neon, isi `DATABASE_URL`
2. Import repo ini di Vercel
3. Framework Other, Node 22
4. Env: `DATABASE_URL` dan `VITE_AUTH_ENABLED=false`
