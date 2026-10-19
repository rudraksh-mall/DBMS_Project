import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Transient runtime state that must NOT survive a reload (stale location / GPS
// / report data was being restored and shown for a new session).
const TRANSIENT_STATE_KEYS = [
  "reportFile",
  "reportImage",
  "editingIssue",
  "selectedIssue",
  "selectedLocation",
  "currentAddress",
  "currentCity",
  "currentWard",
  "gpsLocation",
  "gpsAccuracy",
  "gpsAvailable",
  "gpsError",
  "gpsLoading",
];

export const useAppStore = create(
  persist(
    (set) => ({
      currentScreen: "landing",
      selectedIssue: null,
      selectedLocation: null,
      reportImage: null,
      reportFile: null,
      currentAddress: "Select a location",

      /* GPS State */
      gpsLocation: null,
      gpsAccuracy: null,
      gpsAvailable: null,
      gpsError: null,
      gpsLoading: false,
      currentCity: null,
      currentWard: null,

      navigate: (screen, data = null) =>
        set((state) => ({
          currentScreen: screen,
          selectedLocation: data !== null ? data : state.selectedLocation,
        })),

      setCurrentAddress: (address) =>
        set({ currentAddress: address }),

      viewIssue: (issue) =>
        set({ selectedIssue: issue, currentScreen: "issue-detail" }),

      clearSelectedIssue: () => set({ selectedIssue: null }),

      setSelectedLocation: (location) =>
        set({ selectedLocation: location }),

      clearSelectedLocation: () => set({ selectedLocation: null }),

      clearLocationContext: () =>
        set({
          selectedLocation: null,
          currentAddress: "Select a location",
          currentCity: null,
          currentWard: null,
        }),

      setReportImage: (image) => set({ reportImage: image }),
      clearReportImage: () => set({ reportImage: null }),
      setReportFile: (file) => set({ reportFile: file }),
      clearReportFile: () => set({ reportFile: null }),

      setGpsState: (partial) =>
        set((state) => ({ ...state, ...partial })),

      setEditingIssue: (issue) => set({ editingIssue: issue }),

      clearReportContext: () =>
        set({
          selectedLocation: null,
          reportImage: null,
          reportFile: null,
          editingIssue: null,
          currentAddress: "Select a location",
          currentCity: null,
          currentWard: null,
        }),
    }),
    {
      name: "civicfix-app-storage",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") return {};
        const clean = { ...persisted };
        for (const key of TRANSIENT_STATE_KEYS) delete clean[key];
        return clean;
      },
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(
            ([key]) => !TRANSIENT_STATE_KEYS.includes(key)
          )
        ),
    }
  )
);