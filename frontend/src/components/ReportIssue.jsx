import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Camera,
  MapPin,
  CheckCircle,
  RefreshCw,
  Loader2,
  Navigation,
  Map as MapIcon,
  X,
  Target,
  TriangleAlert,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  LayersControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "./Button";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { useAppStore } from "../store/useAppStore";
import { complaintService } from "../services/complaint.service";
import { lookupWard } from "../services/ward.service";

import toast from "react-hot-toast";

const STEPS = [
  { num: 1, label: "Upload Image" },
  { num: 2, label: "Select Location" },
  { num: 3, label: "Describe Issue" },
  { num: 4, label: "Review & Submit" },
];

const createPickerIcon = () =>
  new L.DivIcon({
    className: "custom-picker-marker",
    html: `<div style="width: 28px; height: 28px; border-radius: 50%; background: #3b82f6; border: 4px solid white; box-shadow: 0 0 20px rgba(59,130,246,0.6); display: flex; align-items: center; justify-content: center;"><div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function ReportIssue() {
  const navigate = useAppStore((state) => state.navigate);
  const selectedLocation = useAppStore((state) => state.selectedLocation);
  const editingIssue = useAppStore((state) => state.editingIssue);
  const currentAddress = useAppStore((state) => state.currentAddress);
  const currentCity = useAppStore((state) => state.currentCity);
  const storeWard = useAppStore((state) => state.currentWard);
  const setSelectedLocation = useAppStore((state) => state.setSelectedLocation);
  const setCurrentAddress = useAppStore((state) => state.setCurrentAddress);
  const setGpsState = useAppStore((state) => state.setGpsState);
  const clearLocationContext = useAppStore(
    (state) => state.clearLocationContext,
  );

  const image = useAppStore((state) => state.reportImage);
  const setImage = useAppStore((state) => state.setReportImage);
  const reportFile = useAppStore((state) => state.reportFile);
  const setReportFile = useAppStore((state) => state.setReportFile);
  const clearReportContext = useAppStore((state) => state.clearReportContext);

  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasNewImage, setHasNewImage] = useState(false);
  const [wardInfo, setWardInfo] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [locationAttempted, setLocationAttempted] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [modalPickLocation, setModalPickLocation] = useState(null);
  const [modalGeocoding, setModalGeocoding] = useState(false);

  const displayLat = selectedLocation?.lat ?? editingIssue?.location?.lat;
  const displayLng = selectedLocation?.lng ?? editingIssue?.location?.lng;

  useEffect(() => {
    if (editingIssue) {
      setDescription(editingIssue.description);
      setImage(editingIssue.imageUrl);
      setHasNewImage(false);
      setLocationAttempted(true);
      setStep(4);
    }
  }, [editingIssue, setImage]);

  useEffect(() => {
    if (displayLat && displayLng && locationAttempted) {
      lookupWard(displayLat, displayLng)
        .then((res) => {
          if (res.success && res.data) {
            setWardInfo(res.data);
          } else {
            setWardInfo(null);
          }
        })
        .catch(() => setWardInfo(null));
    }
  }, [displayLat, displayLng, locationAttempted]);

  const handleImageUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be under 5MB");
      return;
    }
    if (file) {
      setReportFile(file);
      setImage(URL.createObjectURL(file));
      setHasNewImage(true);
      setStep(2);
    }
  };

  const reverseGeocode = useCallback(
    async (lat, lng) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          { headers: { "User-Agent": "CivicFix-AI-Project/1.0" } },
        );
        const data = await res.json();
        const area =
          data.address.suburb ||
          data.address.neighbourhood ||
          data.address.road ||
          data.address.hamlet ||
          `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        const city =
          data.address.city ||
          data.address.town ||
          data.address.village ||
          data.address.municipality ||
          data.address.state_district ||
          data.address.county ||
          data.address.district ||
          null;
        setCurrentAddress(area);
        setGpsState({ currentCity: city, currentAddress: area });
      } catch {
        setCurrentAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setGpsState({ currentCity: null });
      }
    },
    [setCurrentAddress, setGpsState],
  );

  const handleUseMyLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("GPS not available in this browser");
      return;
    }

    // Always request a fresh, high-accuracy fix. Reusing the cached gpsLocation
    // caused a stale location from a previous session/area to be shown.
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        clearLocationContext();
        setGpsState({
          gpsLocation: { lat: latitude, lng: longitude },
          gpsAccuracy: accuracy,
          gpsAvailable: true,
          gpsError: null,
        });
        setSelectedLocation({ lat: latitude, lng: longitude });
        setLocationAttempted(true);
        await reverseGeocode(latitude, longitude);
        setLocationLoading(false);
      },
      () => {
        // Fall back to the last known fix only if a fresh one is unavailable.
        const cached = useAppStore.getState().gpsLocation;
        if (cached) {
          clearLocationContext();
          setSelectedLocation(cached);
          setLocationAttempted(true);
          reverseGeocode(cached.lat, cached.lng);
        } else {
          toast.error("Could not get GPS position. Try the map selector.");
        }
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const openMapModal = () => {
    const gpsLoc = useAppStore.getState().gpsLocation;
    if (gpsLoc) {
      setModalPickLocation(gpsLoc);
    } else if (selectedLocation) {
      setModalPickLocation(selectedLocation);
    } else {
      setModalPickLocation(null);
    }
    setShowMapModal(true);
  };

  const handleModalMapClick = useCallback((lat, lng) => {
    setModalPickLocation({ lat, lng });
  }, []);

  const handleModalLocateUser = () => {
    if (!("geolocation" in navigator)) return;
    setModalGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setModalPickLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setModalGeocoding(false);
      },
      () => setModalGeocoding(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleModalConfirm = async () => {
    if (!modalPickLocation) return;

    const { lat, lng } = modalPickLocation;
    clearLocationContext();
    setSelectedLocation({ lat, lng });
    setLocationAttempted(true);
    await reverseGeocode(lat, lng);

    setShowMapModal(false);
    setModalPickLocation(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("description", description);

      if (displayLat && displayLng) {
        formData.append("location[lat]", displayLat);
        formData.append("location[lng]", displayLng);
      }

      if (reportFile) {
        formData.append("image", reportFile);
      }

      if (editingIssue) {
        const res = await complaintService.updateComplaint(
          editingIssue._id,
          formData,
        );
        if (res.success) {
          setSubmitted(true);
          clearReportContext();
          setTimeout(() => navigate("citizen-dashboard"), 2000);
        }
      } else {
        const res = await complaintService.createComplaint(formData);
        if (res.success) {
          toast.success("Report submitted successfully");
          setAiResult(res.data);
          setSubmitted(true);
          clearReportContext();
        }
      }
    } catch (error) {
      console.error("Submission error:", error.message);
      const message =
        error.response?.data?.message || "Failed to process report";
      if (message.includes("description") || message.includes("image")) {
        setValidationError(message);
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-8 text-center shadow-2xl">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">
            {editingIssue ? "Report Updated!" : "Report Submitted!"}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Your report has been sent to the municipal corporation.
          </p>

          {aiResult && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 text-left space-y-3 mb-6">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                AI Vision Analysis
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Category
                  </p>
                  <p className="text-lg font-black text-slate-900 dark:text-white capitalize">
                    {aiResult.aiCategory || "Other"}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Confidence
                  </p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">
                    {aiResult.aiConfidence
                      ? `${(aiResult.aiConfidence * 100).toFixed(0)}%`
                      : "\u2014"}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Severity
                  </p>
                  <p className="text-lg font-black text-slate-900 dark:text-white capitalize">
                    {aiResult.aiSeverity || "Medium"}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Source
                  </p>
                  <p className="text-lg font-black text-slate-900 dark:text-white capitalize">
                    {aiResult.aiStatus === "ai" ? "AI" : "Fallback"}
                  </p>
                </div>
              </div>
              {aiResult.aiKeywords?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {aiResult.aiKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 text-[10px] font-bold rounded-full border border-slate-200 dark:border-slate-700"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => navigate("citizen-dashboard")}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b sticky top-0 z-50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => {
              clearReportContext();
              navigate("citizen-dashboard");
            }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {editingIssue ? "Edit Report" : "Report New Issue"}
          </h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto w-full px-6 pt-6">
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-black transition-colors ${
                  step === s.num
                    ? "bg-blue-600 text-white"
                    : step > s.num
                      ? "bg-green-500 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                }`}
              >
                {step > s.num ? <CheckCircle size={14} /> : s.num}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-widest hidden sm:block ${
                  step === s.num
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 ${
                    step > s.num
                      ? "bg-green-500"
                      : "bg-slate-200 dark:bg-slate-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-4 w-full flex-1">
        {/* STEP 1: IMAGE SELECTION */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <Card className="p-16 text-center border-dashed border-2 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
              <Camera className="w-10 h-10 text-blue-600 dark:text-blue-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                Evidence Upload
              </h2>
              <p className="text-sm text-slate-500 mb-8">
                Upload a photo of the civic issue you want to report.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <Button
                size="lg"
                onClick={() => fileInputRef.current.click()}
                className="px-10 py-6 rounded-2xl shadow-lg bg-gradient-to-r from-cyan-500 to-purple-500 hover:scale-105 transition-transform"
              >
                Choose Photo
              </Button>
            </Card>
          </div>
        )}

        {/* STEP 2: SELECT LOCATION */}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-2 relative group overflow-hidden rounded-3xl min-h-[240px] flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                <img
                  src={image}
                  className="w-full h-full object-cover rounded-2xl"
                  alt="Preview"
                />
                <button
                  onClick={() => setStep(1)}
                  className="absolute bottom-4 right-4 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl text-blue-600 dark:text-blue-400 flex items-center gap-2 text-xs font-bold hover:scale-105 transition-transform"
                >
                  <RefreshCw size={14} /> Change Photo
                </button>
              </Card>

              <Card className="p-7 space-y-5 dark:border-slate-800 flex flex-col">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Location
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    Where is this issue located?
                  </p>
                </div>

                {!locationAttempted ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
                    <MapPin className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-bold text-slate-400">
                      Location not selected
                    </p>

                    <Button
                      onClick={handleUseMyLocation}
                      disabled={locationLoading}
                      className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-bold"
                    >
                      {locationLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Navigation size={16} />
                      )}
                      {locationLoading ? "Detecting..." : "Use My Location"}
                    </Button>

                    <Button
                      onClick={openMapModal}
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-bold border-2"
                    >
                      <MapIcon size={16} />
                      Open Map Selector
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1 space-y-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                      <MapPin size={12} className="inline mr-1" />
                      Location:{" "}
                      {currentAddress !== "Select a location"
                        ? currentAddress
                        : `${displayLat?.toFixed(4)}, ${displayLng?.toFixed(4)}`}
                    </div>

                    {currentCity && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                        City: {currentCity}
                      </div>
                    )}

                    {wardInfo || storeWard ? (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-xs font-bold text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800">
                        Ward: {(wardInfo || storeWard).wardName}
                      </div>
                    ) : null}

                    <Button
                      onClick={openMapModal}
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-bold border-2"
                    >
                      <MapIcon size={14} />
                      Change Location on Map
                    </Button>
                  </div>
                )}

                {locationAttempted && (
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!displayLat && !displayLng}
                    className="w-full h-12 font-bold rounded-xl shadow-lg mt-auto"
                  >
                    Continue
                  </Button>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* STEP 3: DESCRIPTION */}
        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-2 relative group overflow-hidden rounded-3xl min-h-[240px] flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                <img
                  src={image}
                  className="w-full h-full object-cover rounded-2xl"
                  alt="Preview"
                />
              </Card>

              <Card className="p-7 space-y-4 dark:border-slate-800 flex flex-col">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Issue Description
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    Describe the problem in detail.
                  </p>
                </div>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex-1 w-full bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-sm min-h-[200px] outline-none focus:ring-2 focus:ring-blue-500 border border-slate-100 dark:border-slate-800 dark:text-white transition-all resize-none"
                  placeholder="Describe the issue... (e.g., Large pothole on the main road near the traffic signal)"
                />

                <div className="flex gap-3 mt-auto">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1 h-12 rounded-xl border-2 font-bold"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    disabled={
                      !description.trim() || description.trim().length < 5
                    }
                    className="flex-[2] h-12 rounded-xl shadow-lg font-bold"
                  >
                    Continue
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & SUBMIT */}
        {step === 4 && (
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
            <Card className="p-8 rounded-[2.5rem] shadow-2xl dark:border-slate-800">
              <h2 className="font-black text-2xl dark:text-white mb-6 tracking-tighter italic">
                Submission Audit
              </h2>
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <img
                  src={image}
                  className="w-32 h-32 object-cover rounded-2xl shadow-lg border-2 border-white dark:border-slate-800"
                  alt="Review"
                />
                <div className="flex-1 space-y-3">
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    "{description}"
                  </p>
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <div>
                      <span className="font-bold">Location:</span>{" "}
                      {currentAddress !== "Select a location"
                        ? currentAddress
                        : `${displayLat?.toFixed(4)}, ${displayLng?.toFixed(4)}`}
                    </div>
                    <div>
                      <span className="font-bold">Ward:</span>{" "}
                      {wardInfo
                        ? wardInfo.wardName
                        : storeWard
                          ? storeWard.wardName
                          : "Not available"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {hasNewImage ? "New Image Attached" : "Original Image"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {selectedLocation ? "New Location" : "Existing Location"}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            {validationError && (
              <Card className="p-5 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 rounded-2xl">
                <div className="flex gap-3">
                  <TriangleAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">
                      Image Validation Failed
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-300 leading-relaxed">
                      {validationError}
                    </p>
                    <p className="text-xs text-red-500 dark:text-red-400 mt-2 font-medium">
                      Please update the description or upload the correct image.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(3);
                  setValidationError(null);
                }}
                className="flex-1 h-14 rounded-2xl border-2"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] h-14 text-xl font-black rounded-2xl shadow-2xl shadow-blue-600/20"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : editingIssue ? (
                  "Save Changes"
                ) : (
                  "Confirm & Submit"
                )}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* MAP SELECTOR MODAL */}
      {showMapModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Select Location on Map
              </h3>
              <button
                onClick={() => {
                  setShowMapModal(false);
                  setModalPickLocation(null);
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 relative">
              <MapContainer
                center={
                  modalPickLocation
                    ? [modalPickLocation.lat, modalPickLocation.lng]
                    : [26.8467, 80.9462]
                }
                zoom={13}
                zoomControl={true}
                style={{ height: "100%", width: "100%" }}
              >
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="Street View">
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="&copy; OpenStreetMap"
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Satellite View">
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution="Esri"
                    />
                  </LayersControl.BaseLayer>
                </LayersControl>

                <MapClickHandler onLocationSelect={handleModalMapClick} />

                {modalPickLocation && (
                  <Marker
                    position={[modalPickLocation.lat, modalPickLocation.lng]}
                    icon={createPickerIcon()}
                  />
                )}
              </MapContainer>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex gap-3">
                <Button
                  onClick={handleModalLocateUser}
                  disabled={modalGeocoding}
                  variant="outline"
                  className="bg-white dark:bg-slate-800 shadow-xl border-2 h-12 px-5 rounded-xl font-bold text-xs"
                >
                  {modalGeocoding ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Target className="w-4 h-4 mr-2" />
                  )}
                  My Location
                </Button>
                <Button
                  onClick={handleModalConfirm}
                  disabled={!modalPickLocation}
                  className="shadow-xl h-12 px-8 rounded-xl font-bold"
                >
                  Confirm Location
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
