import api from "./api";

// Authority dashboard data
export const fetchAuthorityDashboard = async () => {
  const res = await api.get("/authority/dashboard");
  return res.data;
};
// services/ward.service.js

/**
 * Fetch wards for a given city
 * @param {string} city
 */
export const fetchWards = (city) => {
  return api.get("/wards", {
    params: { city },
  });
};

export const fetchCities = () => {
  return api.get("/wards/cities");
};

export const lookupWard = async (lat, lng) => {
  const res = await api.get("/wards/lookup", { params: { lat, lng } });
  return res.data;
};
