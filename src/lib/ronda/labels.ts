import type { AbsenMode } from "./store";

export function modeTabLabel(mode: AbsenMode) {
  if (mode === "kampung") return "Foto kampung";
  if (mode === "kejadian") return "Foto/video";
  if (mode === "selesai") return "Selesai";
  return "Masuk";
}

export function mediaTitle(mode: AbsenMode, kind?: "foto" | "video") {
  if (mode === "kampung") return "Foto kampung";
  if (mode === "kejadian") return kind === "video" ? "Video kejadian" : "Foto kejadian";
  if (mode === "selesai") return "Absen selesai";
  return "Absen masuk";
}
