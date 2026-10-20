import api from "./api.js";

export const getAuthorities = async () => {
  const res = await api.get("/admin/authorities");
  return res.data;
};

export const createAuthority = async (data) => {
  const res = await api.post("/admin/authorities", data);
  return res.data;
};

export const updateAuthority = async (id, data) => {
  const res = await api.put(`/admin/authorities/${id}`, data);
  return res.data;
};

export const deactivateAuthority = async (id) => {
  const res = await api.patch(`/admin/authorities/${id}/deactivate`);
  return res.data;
};

export const getEscalations = async () => {
  const res = await api.get("/admin/escalations");
  return res.data;
};

export const getWardComplaints = async () => {
  const res = await api.get("/admin/complaints");
  return res.data;
};
