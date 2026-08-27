import { create } from "zustand";
import { persist } from "zustand/middleware";
import { POS_LAT, POS_LNG, POS_RADIUS_M } from "./config";

export type AbsenMode = "masuk" | "selesai" | "kampung" | "kejadian";

export type Photo = {
  id: string;
  name: string;
  mode: AbsenMode;
  src: string;
  at: string;
  shiftDate: string;
  test?: boolean;
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
};

type State = {
  settings: Settings;
  attendance: Attendance[];
  photos: Photo[];
  setTestMode: (v: boolean) => void;
  dismissNotice: (shiftDate: string) => void;
  markNotified: (shiftDate: string) => void;
  setNotifyEnabled: (v: boolean) => void;
  upsertAttendance: (row: Attendance) => void;
  addPhoto: (photo: Photo) => void;
  clearAbsen: () => void;
};

export const useRonda = create<State>()(
  persist(
    (set) => ({
      settings: {
        lat: POS_LAT,
        lng: POS_LNG,
        radius: POS_RADIUS_M,
        testMode: false,
        dismissedShiftDate: null,
        notifiedShiftDate: null,
        notifyEnabled: false,
      },
      attendance: [],
      photos: [],
      setTestMode: (v) => set((s) => ({ settings: { ...s.settings, testMode: v } })),
      dismissNotice: (shiftDate) =>
        set((s) => ({ settings: { ...s.settings, dismissedShiftDate: shiftDate } })),
      markNotified: (shiftDate) =>
        set((s) => ({ settings: { ...s.settings, notifiedShiftDate: shiftDate } })),
      setNotifyEnabled: (v) => set((s) => ({ settings: { ...s.settings, notifyEnabled: v } })),
      upsertAttendance: (row) =>
        set((s) => {
          const i = s.attendance.findIndex((a) => a.name === row.name && a.shiftDate === row.shiftDate);
          if (i >= 0) {
            const next = [...s.attendance];
            next[i] = { ...next[i], ...row, poin: row.selesai || next[i].selesai ? 2 : 1 };
            return { attendance: next };
          }
          return { attendance: [...s.attendance, { ...row, poin: row.selesai ? 2 : 1 }] };
        }),
      addPhoto: (photo) =>
        set((s) => ({ photos: [photo, ...s.photos].slice(0, 80) })),
      clearAbsen: () => set({ attendance: [], photos: [] }),
    }),
    { name: "ronda-siaga-v16" },
  ),
);
