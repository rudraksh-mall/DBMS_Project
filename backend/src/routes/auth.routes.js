import express from "express";
import {
  register,
  verifyOtp,
   login,
  getMe,
  refreshAccessToken,
  logout,
} from "../controllers/auth.controller.js";

import auth from "../middleware/auth.middleware.js";
import { googleAuth } from "../controllers/auth.controller.js";

const router = express.Router();

// Auth + OTP
router.post("/register", register); // step 1: send OTP
router.post("/verify-otp", verifyOtp); // step 2: confirm OTP

// Auth session
router.post("/login", login);
router.post("/google", googleAuth);

router.post("/refresh", refreshAccessToken);
router.post("/logout", auth, logout);

// Protected user info
router.get("/me", auth, getMe);

export default router;
