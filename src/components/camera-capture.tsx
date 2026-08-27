import { useRef, useState } from "react";
import { DESA } from "../lib/ronda/config";
import { saveMediaBlob } from "../lib/ronda/media-db";
import type { AbsenMode } from "../lib/ronda/store";

const MODE_LABEL: Record<AbsenMode, string> = {
  masuk: "MASUK",
  selesai: "SELESAI",
  kampung: "KAMPUNG",
  kejadian: "KEJADIAN",
};

export type CaptureResult = {
  src: string;
  kind: "foto" | "video";
  mediaId?: string;
};

async function stampPhoto(file: File, officer: string, mode: AbsenMode, stamp: string) {
  const raw = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = raw.width;
  canvas.height = raw.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return URL.createObjectURL(file);
  ctx.drawImage(raw, 0, 0);
  const h = Math.max(90, canvas.height * 0.16);
  const g = ctx.createLinearGradient(0, canvas.height - h, 0, canvas.height);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.35, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = g;
  ctx.fillRect(0, canvas.height - h, canvas.width, h);
  ctx.fillStyle = "#ece8df";
  ctx.font = `600 ${Math.round(canvas.width * 0.045)}px sans-serif`;
  ctx.fillText(officer, 24, canvas.height - h + 38);
  ctx.font = `500 ${Math.round(canvas.width * 0.032)}px sans-serif`;
  ctx.fillText(`${MODE_LABEL[mode]}  ·  ${stamp}`, 24, canvas.height - h + 68);
  ctx.fillText(DESA, 24, canvas.height - h + 96);
  return canvas.toDataURL("image/jpeg", 0.82);
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
  const allowVideo = mode === "kejadian" || mode === "kampung";

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
        {MODE_LABEL[mode]} · {stamp}. HP akan membuka kamera aslinya, termasuk ganti kamera depan/belakang.
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
          Ambil foto kamera HP
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
