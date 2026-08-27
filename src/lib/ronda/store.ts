import { create } from "zustand";
import { persist } from "zustand/middleware";
import { POS_LAT, POS_LNG, POS_RADIUS_M } from "./config";
import { loadMediaUrl } from "./media-db";
import { attendanceToSheetRow, pushRowsToSheet } from "./sheet";

export type AbsenMode = "masuk" | "selesai" | "kampung" | "kejadian";

export type Photo = {
  id: string;
  name: string;
  mode: AbsenMode;
  src: string;
  at: string;
  shiftDate: string;
  test?: boolean;
  kind?: "foto" | "video";
  mediaId?: string;
};

export type Attendance = {
  id: string;
  name: string;
  shiftDate: string;
  hari: string;
  masuk?: string;
  selesai?: string;
  photoMasuk?: string;
  photoSelesai?: string;
  test?: boolean;
  poin: number;
};

type Settings = {
  lat: number;
  lng: number;
  radius: number;
  testMode: boolean;
  dismissedShiftDate: string | null;
  notifiedShiftDate: string | null;
  notifyEnabled: boolean;
  sheetUrl: string;
};

type State = {
  settings: Settings;
  attendance: Attendance[];
  photos: Photo[];
  setTestMode: (v: boolean) => void;
  dismissNotice: (shiftDate: string) => void;
  markNotified: (shiftDate: string) => void;
  setNotifyEnabled: (v: boolean) => void;
  setSheetUrl: (v: string) => void;
  upsertAttendance: (row: Attendance) => void;
  addPhoto: (photo: Photo) => void;
  hydrateVideos: () => Promise<void>;
  syncAllToSheet: () => Promise<boolean>;
  clearAbsen: () => void;
};

export const useRonda = create<State>()(
  persist(
    (set, get) => ({
      settings: {
        lat: POS_LAT,
        lng: POS_LNG,
        radius: POS_RADIUS_M,
        testMode: false,
        dismissedShiftDate: null,
        notifiedShiftDate: null,
        notifyEnabled: false,
        sheetUrl: "",
      },
      attendance: [],
      photos: [],
      setTestMode: (v) => set((s) => ({ settings: { ...s.settings, testMode: v } })),
      dismissNotice: (shiftDate) =>
        set((s) => ({ settings: { ...s.settings, dismissedShiftDate: shiftDate } })),
      markNotified: (shiftDate) =>
        set((s) => ({ settings: { ...s.settings, notifiedShiftDate: shiftDate } })),
      setNotifyEnabled: (v) => set((s) => ({ settings: { ...s.settings, notifyEnabled: v } })),
      setSheetUrl: (v) => set((s) => ({ settings: { ...s.settings, sheetUrl: v.trim() } })),
      upsertAttendance: (row) => {
        set((s) => {
          const clean = { ...row, photoMasuk: undefined, photoSelesai: undefined };
          const i = s.attendance.findIndex((a) => a.name === row.name && a.shiftDate === row.shiftDate);
          if (i >= 0) {
            const next = [...s.attendance];
            next[i] = { ...next[i], ...clean, poin: clean.selesai || next[i].selesai ? 2 : 1 };
            return { attendance: next };
          }
          return { attendance: [...s.attendance, { ...clean, poin: clean.selesai ? 2 : 1 }] };
        });
        const s = get();
        if (row.test || !s.settings.sheetUrl) return;
        const saved = s.attendance.find((a) => a.name === row.name && a.shiftDate === row.shiftDate);
        if (saved) void pushRowsToSheet(s.settings.sheetUrl, [attendanceToSheetRow(saved, s.photos)]);
      },
      addPhoto: (photo) => set((s) => ({ photos: [photo, ...s.photos].slice(0, 200) })),
      hydrateVideos: async () => {
        const photos = get().photos;
        const next = await Promise.all(
          photos.map(async (p) => {
            if (p.mediaId && !p.src.startsWith("blob:") && !p.src.startsWith("data:")) {
              const url = await loadMediaUrl(p.mediaId);
              return url ? { ...p, src: url } : p;
            }
            if (p.kind === "video" && p.mediaId && !p.src) {
              const url = await loadMediaUrl(p.mediaId);
              return url ? { ...p, src: url } : p;
            }
            return p;
          }),
        );
        set({ photos: next });
      },
      syncAllToSheet: async () => {
        const s = get();
        if (!s.settings.sheetUrl) return false;
        const rows = s.attendance.filter((a) => !a.test).map((a) => attendanceToSheetRow(a, s.photos));
        return pushRowsToSheet(s.settings.sheetUrl, rows);
      },
      clearAbsen: () => set({ attendance: [], photos: [] }),
    }),
    {
      name: "ronda-siaga-v17",
      partialize: (s) => ({
        settings: s.settings,
        attendance: s.attendance.map((a) => ({ ...a, photoMasuk: undefined, photoSelesai: undefined })),
        photos: s.photos.map((p) => ({ ...p, src: p.mediaId ? "" : p.src.slice(0, 0) })),
      }),
    },
  ),
);
