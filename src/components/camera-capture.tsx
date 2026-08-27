import { useRef, useState } from "react";
import { DESA } from "../lib/ronda/config";
import { mediaTitle } from "../lib/ronda/labels";
import { saveMediaBlob } from "../lib/ronda/media-db";
import type { AbsenMode } from "../lib/ronda/store";

export type CaptureResult = {
  src: string;
  kind: "foto" | "video";
  mediaId?: string;
};

function badgeText(mode: AbsenMode) {
  if (mode === "masuk") return "MASUK";
  if (mode === "selesai") return "SELESAI";
  if (mode === "kampung") return "FOTO KAMPUNG";
  return "FOTO KEJADIAN";
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  ctx.fill();
}

async function stampPhoto(file: File, officer: string, mode: AbsenMode, stamp: string) {
  const raw = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = raw.width;
  canvas.height = raw.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return URL.createObjectURL(file);
  ctx.drawImage(raw, 0, 0);

  const w = canvas.width;
  const h = canvas.height;
  const pad = Math.round(w * 0.035);
  const nameSize = Math.max(28, Math.round(w * 0.042));
  const metaSize = Math.max(20, Math.round(w * 0.028));
  const badgeSize = Math.max(18, Math.round(w * 0.026));
  const barH = Math.max(140, Math.round(h * 0.2));

  const g = ctx.createLinearGradient(0, h - barH, 0, h);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.28, "rgba(0,0,0,0.45)");
  g.addColorStop(1, "rgba(0,0,0,0.88)");
  ctx.fillStyle = g;
  ctx.fillRect(0, h - barH, w, barH);

  const nameY = h - barH + Math.round(barH * 0.38);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${nameSize}px sans-serif`;
  ctx.fillText(officer, pad, nameY);

  const label = badgeText(mode);
  ctx.font = `700 ${badgeSize}px sans-serif`;
  const labelW = ctx.measureText(label).width;
  const badgeH = badgeSize + Math.round(w * 0.022);
  const badgeW = labelW + Math.round(w * 0.03);
  const badgeY = nameY + Math.round(w * 0.018);
  const isAbsen = mode === "masuk" || mode === "selesai";
  ctx.fillStyle = isAbsen ? "#c62828" : "#1b3a2c";
  drawRoundRect(ctx, pad, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, pad + Math.round(w * 0.015), badgeY + badgeH * 0.72);

  ctx.font = `500 ${metaSize}px sans-serif`;
  ctx.fillStyle = "#e8efe9";
  ctx.fillText(stamp, pad + badgeW + Math.round(w * 0.02), badgeY + badgeH * 0.7);

  ctx.font = `500 ${Math.max(16, Math.round(w * 0.024))}px sans-serif`;
  ctx.fillStyle = "#c5cdc6";
  ctx.fillText(DESA, pad, h - Math.round(pad * 0.7));

  return canvas.toDataURL("image/jpeg", 0.84);
}

export function CameraCapture({
  officer,
  mode,
  stamp,
  onCapture,
  onCancel,
}: {
  officer: string;
  mode: AbsenMode;
  stamp: string;
  onCapture: (result: CaptureResult) => void;
  onCancel: () => void;
}) {
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const allowVideo = mode === "kejadian";

  async function onPhoto(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const src = await stampPhoto(file, officer, mode, stamp);
      onCapture({ src, kind: "foto" });
    } catch {
      setErr("Foto tidak bisa diproses. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function onVideo(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const mediaId = `vid-${Date.now()}`;
      await saveMediaBlob(mediaId, file);
      const src = URL.createObjectURL(file);
      onCapture({ src, kind: "video", mediaId });
    } catch {
      setErr("Video tidak bisa disimpan. Coba rekam lebih pendek.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#0b0f0d] px-5 pt-8 pb-[max(1.2rem,env(safe-area-inset-bottom))]">
      <p className="text-sm tracking-[0.14em] text-white/50">KAMERA BAWAAN HP</p>
      <h2 className="mt-1 font-clock text-[2.1rem] leading-none text-white">{officer}</h2>
      <p className="mt-2 text-white/70">
        {mode === "kejadian"
          ? "Pilih foto atau video. Hasilnya otomatis bernama foto kejadian atau video kejadian."
          : `${mediaTitle(mode)} · ${stamp}`}
      </p>

      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onPhoto(e.target.files?.[0])}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onVideo(e.target.files?.[0])}
      />

      <div className="mt-auto flex flex-col gap-3">
        {err ? <p className="text-center text-[#e08b84]">{err}</p> : null}
        {busy ? <p className="text-center text-white/70">Menyimpan...</p> : null}
        <button
          type="button"
          className="h-16 w-full rounded-2xl bg-primary text-lg font-semibold text-primary-foreground"
          onClick={() => photoRef.current?.click()}
          disabled={busy}
        >
          {mode === "kampung" ? "Ambil foto kampung" : mode === "kejadian" ? "Ambil foto kejadian" : "Ambil foto kamera HP"}
        </button>
        {allowVideo ? (
          <button
            type="button"
            className="h-16 w-full rounded-2xl bg-[#3a2220] text-lg font-semibold text-[#f3c2bc]"
            onClick={() => videoRef.current?.click()}
            disabled={busy}
          >
            Rekam video kejadian
          </button>
        ) : null}
        <button type="button" className="h-12 w-full text-white/70" onClick={onCancel} disabled={busy}>
          Batal
        </button>
      </div>
    </div>
  );
}
