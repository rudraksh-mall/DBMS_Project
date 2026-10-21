import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../store/useAppStore";
import { lookupWard } from "../services/ward.service";

const GPS_STORAGE_KEY = "civicfix-gps-location";

// A cached fix older than this is considered stale and ignored, otherwise the
// app shows a location from a previous session/area (e.g. the wrong ward/city).
const GPS_MAX_AGE_MS = 5 * 60 * 1000;

// Fixes this imprecise (in metres) are unusable for street-level reporting and
// are virtually always a coarse network/IP estimate or a browser location
// override, not real GPS. Trusting them shows the wrong city/ward (e.g. a fix
// 200 km away), so we reject them and ask the user to pick a location instead.
const GPS_MAX_ACCURATE_METERS = 2000;

function loadPersistedGps() {
  try {
    const raw = localStorage.getItem(GPS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.lat !== "number" ||
      typeof parsed.lng !== "number"
    ) {
      return null;
    }
    if (parsed.timestamp && Date.now() - parsed.timestamp > GPS_MAX_AGE_MS) {
      localStorage.removeItem(GPS_STORAGE_KEY);
      return null;
    }
    // Drop previously stored coarse fixes (they may be hundreds of km off).
    if (
      typeof parsed.accuracy === "number" &&
      parsed.accuracy > GPS_MAX_ACCURATE_METERS
    ) {
      localStorage.removeItem(GPS_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    /* ignore malformed storage */
  }
  return null;
}

function persistGps(lat, lng, accuracy) {
  try {
    localStorage.setItem(
      GPS_STORAGE_KEY,
      JSON.stringify({ lat, lng, accuracy, timestamp: Date.now() }),
    );
  } catch {
    /* storage unavailable */
  }
}

async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
    { headers: { "User-Agent": "CivicFix-AI-Project/1.0" } },
  );
  if (!res.ok) throw new Error("Nominatim API error");
  const data = await res.json();
  const city =
    data.address.city ||
    data.address.town ||
    data.address.village ||
    data.address.municipality ||
    data.address.state_district ||
    data.address.county ||
    data.address.district ||
    null;
  const locality =
    data.address.suburb ||
    data.address.neighbourhood ||
    data.address.road ||
    data.address.hamlet ||
    null;
  return { city, locality, displayName: data.display_name };
}

export function useGeolocation() {
  const watchIdRef = useRef(null);
  const mountedRef = useRef(true);

  const setGpsState = useAppStore((state) => state.setGpsState);

  const refresh = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGpsState({
        gpsAvailable: false,
        gpsError: "GPS not supported in this browser.",
      });
      return;
    }

    setGpsState({ gpsLoading: true });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (!mountedRef.current) return;

        const { latitude, longitude, accuracy } = position.coords;

        console.log("[GPS] latitude:", latitude);
        console.log("[GPS] longitude:", longitude);
        console.log("[GPS] accuracy (meters):", accuracy);

        if (!Number.isFinite(accuracy) || accuracy > GPS_MAX_ACCURATE_METERS) {
          console.warn("[GPS] Imprecise fix rejected:", accuracy, "m");
          setGpsState({
            gpsAvailable: false,
            gpsLoading: false,
            gpsAccuracy: accuracy,
            currentCity: null,
            currentWard: null,
            gpsError:
              "Your device returned an imprecise location (about " +
              Math.round((accuracy || 0) / 1000) +
              " km off). Enable precise location / turn off any VPN, or pick your location on the map.",
          });
          return;
        }

        persistGps(latitude, longitude, accuracy);

        setGpsState({
          gpsLocation: { lat: latitude, lng: longitude },
          gpsAccuracy: accuracy,
          gpsAvailable: true,
          gpsError: null,
          gpsLoading: false,
          selectedLocation: { lat: latitude, lng: longitude },
        });

        let city = null;
        let wardData = null;

        try {
          const geo = await reverseGeocode(latitude, longitude);
          city = geo.city;
          console.log("[GPS] city matched:", city);

          if (city) {
            setGpsState({
              currentCity: city,
              currentAddress: geo.locality || city,
            });
          } else {
            setGpsState({
              currentAddress: geo.locality || "Location unavailable",
            });
          }
        } catch (err) {
          console.warn("[GPS] Reverse geocoding failed:", err.message);
        }

        try {
          const wardRes = await lookupWard(latitude, longitude);
          if (wardRes.success && wardRes.data) {
            wardData = wardRes.data;
            console.log(
              "[GPS] ward matched:",
              wardData.wardName,
              "| city:",
              wardData.city,
            );
            setGpsState({
              currentWard: wardData,
              currentCity: wardData.city || city,
            });
          } else {
            console.log("[GPS] ward matched: none");
            setGpsState({ currentWard: null });
          }
        } catch (err) {
          console.warn("[GPS] Ward lookup failed:", err.message);
          setGpsState({ currentWard: null });
        }
      },
      (err) => {
        if (!mountedRef.current) return;
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Location access denied. Enable GPS in your browser settings."
            : err.code === err.TIMEOUT
              ? "GPS timed out. Try again."
              : "GPS unavailable.";
        console.warn("[GPS] Error:", message);
        setGpsState({
          gpsAvailable: false,
          gpsError: message,
          gpsLoading: false,
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [setGpsState]);

  useEffect(() => {
    mountedRef.current = true;

    const persisted = loadPersistedGps();
    if (persisted) {
      setGpsState({
        gpsLocation: { lat: persisted.lat, lng: persisted.lng },
        gpsAccuracy: persisted.accuracy,
      });
    }

    refresh();

    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          if (!mountedRef.current) return;
          const { latitude, longitude, accuracy } = position.coords;
          // Ignore coarse updates so a streaming wrong fix cannot override a
          // previously accepted accurate one.
          if (
            !Number.isFinite(accuracy) ||
            accuracy > GPS_MAX_ACCURATE_METERS
          ) {
            return;
          }
          persistGps(latitude, longitude, accuracy);
          setGpsState({
            gpsLocation: { lat: latitude, lng: longitude },
            gpsAccuracy: accuracy,
            gpsAvailable: true,
            gpsError: null,
          });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0 },
      );
    }

    return () => {
      mountedRef.current = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [refresh, setGpsState]);

  return { refresh };
}
