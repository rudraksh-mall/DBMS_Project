import api from "./api.js";

// register
export const registerUser = async(data) => {
    const res = await api.post("/auth/register",data);
    return res.data;
};

// Verify OTP
export const verifyOtp = async (data) => {
  const res = await api.post("/auth/verify-otp", data);
  return res.data;
};

// Login
export const loginUser = async (data) => {
  const res = await api.post("/auth/login", data);
  return res.data;
};

export const googleLogin = async (data) => {
  const res = await api.post("/auth/google", data);
  return res.data;
};

// Get logged-in user
export const getMe = async () => {
  const res = await api.get("/auth/me");
  return res.data;
};

// logout user
export const logoutUser = async (refreshToken) => {
  const res = await api.post("/auth/logout", { refreshToken });
  return res.data;
};
