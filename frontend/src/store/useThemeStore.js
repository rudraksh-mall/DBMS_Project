import { create } from "zustand";

export const useThemeStore = create((set) => {
  // 1. Calculate initial state
  const getInitialTheme = () => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  };

  const initialTheme = getInitialTheme();

  // 2. Apply the class IMMEDIATELY on store creation
  if (initialTheme) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  return {
    isDarkMode: initialTheme,

    toggleDarkMode: () =>
      set((state) => {
        const next = !state.isDarkMode;

        if (next) {
          document.documentElement.classList.add("dark");
          localStorage.setItem("darkMode", "true");
        } else {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("darkMode", "false");
        }

        return { isDarkMode: next };
      }),
  };
});