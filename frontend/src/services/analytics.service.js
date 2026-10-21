import api from "./api";

export const fetchAuthorityAnalytics = async () => {
  const res = await api.get("/authority/analytics");
  return res.data;
};