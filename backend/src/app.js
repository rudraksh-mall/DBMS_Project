import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// Route Imports
import authRoutes from "./routes/auth.routes.js";
import complaintRoutes from "./routes/complaint.routes.js";
import wardRoutes from "./routes/ward.routes.js";
import voteRoutes from "./routes/vote.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import authorityDashboardRoutes from "./routes/authorityDashboard.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";

// Utility Import
import { ApiError } from "./utils/ApiError.js";

/* =====================
   CREATE APP FIRST
   ===================== */
const app = express();

// 1. GLOBAL MIDDLEWARES
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use("/api", analyticsRoutes);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// 2. ROUTES DECLARATION
app.use("/api/auth", authRoutes);
app.use("/api/complaint", complaintRoutes);
app.use("/api/wards", wardRoutes);
app.use("/api/vote", voteRoutes);
app.use("/api/admin", adminRoutes);

// ✅ THIS MUST BE AFTER app is created
app.use("/api", authorityDashboardRoutes);

/* =====================
   TEST ROUTE
   ===================== */
app.get("/", (req, res) => {
  res.send({
    status: "Online",
    message: "Lucknow Municipal Backend is running!",
    timestamp: new Date().toISOString(),
  });
});

// 4. ERROR HANDLING MIDDLEWARE
// This catches all those 'throw new ApiError' calls from your controllers
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error(`[ERROR] ${req.method} ${req.url}: ${message}`);

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || [],
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export { app };