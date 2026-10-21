import api from "./api";

/**
 * COMPLAINT SERVICE
 * Handles all communication with /api/complaint and /api/vote endpoints.
 */
export const complaintService = {
  /**
   * Sends a new complaint (image + description + coordinates)
   * Method: POST /api/complaint/
   */
  createComplaint: async (formData) => {
    const response = await api.post("/complaint", formData);
    return response.data;
  },

  /**
   * Fetches complaints for discovery or map.
   * Method: GET /api/complaint/allComplaints
   */
  getAllComplaints: async (params = {}) => {
    const response = await api.get("/complaint/allComplaints", { params });
    return response.data;
  },

  /**
   * Fetches community complaints with scope filtering.
   * scopes: nearby, trending, ward, city
   * Method: GET /api/complaint/allComplaints?scope=...
   */
  getCommunityComplaints: async ({ scope, lat, lng, wardId, city } = {}) => {
    const params = { scope };
    if (lat) params.lat = lat;
    if (lng) params.lng = lng;
    if (wardId) params.wardId = wardId;
    if (city) params.city = city;
    const response = await api.get("/complaint/allComplaints", { params });
    return response.data;
  },

  /**
   * Fetches the logged-in citizen's reports for their Dashboard.
   * Method: GET /api/complaint/my-reports
   */
  getMyComplaints: async () => {
    const response = await api.get("/complaint/my-reports");
    return response.data;
  },

  /**
   * UPVOTE LOGIC (FIXED)
   * Sends a vote for a specific complaint.
   * Method: POST /api/vote/complaints/:id/vote
   */
  upvoteComplaint: async (complaintId) => {
    const response = await api.post(`/vote/complaints/${complaintId}/vote`);
    return response.data;
  },

  /**
   * REMOVE UPVOTE (FIXED)
   * Method: DELETE /api/vote/complaints/:id/vote
   */
  removeUpvote: async (complaintId) => {
    const response = await api.delete(`/vote/complaints/${complaintId}/vote`);
    return response.data;
  },

  /**
   * Fetches complaints for the Authority's assigned Ward.
   * Method: GET /api/complaint/ward
   */
  getWardComplaints: async () => {
    const response = await api.get("/complaint/ward");
    return response.data;
  },

  /**
   * Updates complaint status (Used by Authority/Officer)
   * Method: PUT /api/complaint/:id
   */
  updateComplaintStatus: async (complaintId, statusData) => {
    const response = await api.put(`/complaint/${complaintId}`, statusData);
    return response.data;
  },

  /**
   * Updates complaint details (Used by Citizen to Edit)
   * Method: PATCH /api/complaint/:id
   */
  updateComplaint: async (complaintId, updateData) => {
    const response = await api.patch(`/complaint/${complaintId}`, updateData);
    return response.data;
  },

  /**
   * Deletes a complaint
   * Method: DELETE /api/complaint/:id
   */
  deleteComplaint: async (complaintId) => {
    const response = await api.delete(`/complaint/${complaintId}`);
    return response.data;
  },

  /**
   * Fetches a single complaint by ID for the Detail View.
   * Method: GET /api/complaint/:id
   */
  getComplaintById: async (complaintId) => {
    const response = await api.get(`/complaint/${complaintId}`);
    return response.data;
  },
};
