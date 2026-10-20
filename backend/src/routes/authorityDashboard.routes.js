import express from "express";
import auth from "../middleware/auth.middleware.js";
import { getAuthorityDashboard } from "../controllers/authorityDashboard.controller.js";

const router = express.Router();

// READ-ONLY dashboard
router.get("/authority/dashboard", auth, getAuthorityDashboard);

export default router;