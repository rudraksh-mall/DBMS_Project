import express from "express";
import auth from "../middleware/auth.middleware.js";
import { getAuthorityAnalytics } from "../controllers/analytics.controller.js";

const router = express.Router();

router.get("/authority/analytics", auth, getAuthorityAnalytics);

export default router;