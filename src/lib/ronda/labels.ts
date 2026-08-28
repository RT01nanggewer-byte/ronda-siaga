import type { AbsenMode } from "./store";

export function modeTabLabel(mode: AbsenMode) {
  if (mode === "kampung") return "Foto kampung";
  if (mode === "kejadian") return "Foto/video";
  if (mode === "selesai") return "Pulang";
  return "Masuk";
}

export function mediaTitle(mode: AbsenMode, kind?: "foto" | "video") {
  if (mode === "kampung") return "Foto kampung";
  if (mode === "kejadian") return kind === "video" ? "Video kejadian" : "Foto kejadian";
  if (mode === "selesai") return "Absen pulang";
  return "Absen masuk";
}

export function actionLabel(mode: AbsenMode) {
  if (mode === "selesai") return "Pulang";
  if (mode === "kampung") return "Foto kampung";
  if (mode === "kejadian") return "Foto kejadian";
  return "Masuk";
}
