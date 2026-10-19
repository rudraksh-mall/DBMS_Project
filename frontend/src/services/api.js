import axios from "axios";

// Base configuration for the TechSprint backend
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  withCredentials: false, // Set to true only if using Cookies instead of LocalStorage
});

/**
 * Request Interceptor:
 * Automatically attaches the JWT 'accessToken' from localStorage to every outgoing
 * request to identify the user (Citizen or Authority).
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Optimization: If sending FormData (images), Axios handles the boundary automatically
    if (config.data instanceof FormData) {
      config.headers["Content-Type"] = "multipart/form-data";
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor:
 * Centralized error handling. If the token expires (401), we can trigger
 * a logout or a refresh token flow.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error("Session expired. Logging out...");
      // You could trigger authStore.logout() here if needed
    }
    return Promise.reject(error);
  }
);

export default api;