import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * AUTH STORE
 * Manages user session, role-based access, and geographic context.
 * Updated with Persist middleware for seamless session rehydration.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      // --- Auth State ---
      userRole: null,
      isAuthenticated: false,
      user: null, // Includes city, wardId, name, etc.

      // --- Geographic Context ---
      currentLocation: null, // Real-time GPS: { lat: number, lng: number }

      /**
       * Login: Updates store with user data and role.
       * Note: persist middleware handles localStorage.setItem("user", ...) automatically.
       */
      login: (role, userData) => {
        set({
          userRole: role,
          user: userData,
          isAuthenticated: true,
        });
      },

      /**
       * Logout: Clears all session data and geographic context.
       */
      logout: () => {
        // Clear manual tokens not managed by this persist store
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");

        set({
          userRole: null,
          user: null,
          isAuthenticated: false,
          currentLocation: null,
        });
      },

      /**
       * Set Location: Updates current GPS coordinates.
       */
      setLocation: (lat, lng) => {
        set({ currentLocation: { lat, lng } });
      },

      /**
       * FIX: setUserCity
       * Dynamically updates the user's city in the profile (e.g., from Lucknow to Prayagraj)
       * after reverse geocoding completes in App.jsx.
       */
      setUserCity: (city) => {
        set((state) => ({
          user: state.user ? { ...state.user, city } : { city },
        }));
      },

      /**
       * Check Auth: Manually re-sync state if needed.
       */
      checkAuth: () => {
        const token = localStorage.getItem("accessToken");
        set((state) => ({
          isAuthenticated: !!token && !!state.userRole,
        }));
      },
    }),
    {
      name: "civicfix-auth-storage", // Unique key for localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);
