import { useEffect, useRef, useState } from "react";
import { DESA } from "../lib/ronda/config";
import type { AbsenMode } from "../lib/ronda/store";

const MODE_LABEL: Record<AbsenMode, string> = {
  masuk: "MASUK",
  selesai: "SELESAI",
  kampung: "KAMPUNG",
  kejadian: "KEJADIAN",
};

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
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    async function start() {
      setErr(null);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (dead) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setErr("Kamera tidak bisa dibuka. Izinkan kamera di pengaturan HP.");
      }
    }
    void start();
    return () => {
      dead = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  function shoot() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    if (facing === "user") ctx.setTransform(1, 0, 0, 1, 0, 0);
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
    onCapture(canvas.toDataURL("image/jpeg", 0.82));
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <video ref={videoRef} playsInline muted className="min-h-0 flex-1 bg-black object-cover" />
      {err ? <p className="px-5 py-3 text-center text-[#c97870]">{err}</p> : null}
      <div className="flex items-center justify-between gap-3 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button type="button" className="rounded-xl px-4 py-3 text-white/80" onClick={onCancel}>
          Batal
        </button>
        <button
          type="button"
          aria-label="Ambil foto"
          className="h-16 w-16 rounded-full border-4 border-white bg-white/20"
          onClick={shoot}
        />
        <button
          type="button"
          className="rounded-xl px-4 py-3 text-white/80"
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
        >
          Balik
        </button>
      </div>
      <p className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
        Kamera HP · {officer}
      </p>
    </div>
  );
}
