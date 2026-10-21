import express from "express";

import {
  createComplaint,
  getAllComplaints,
  getMyComplaints,
  getWardComplaints,
  getComplaintById,
  updateComplaint,
  updateComplaintStatus,
  deleteComplaint,
} from "../controllers/complaint.controller.js";

import auth from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/", auth, upload.any(), createComplaint);

router.get("/my-reports", auth, getMyComplaints);
router.get("/allComplaints", auth, getAllComplaints);
router.get("/ward", auth, getWardComplaints);

router.patch("/:complaintId", auth, upload.any(), updateComplaint);
router.put("/:complaintId", auth, upload.any(), updateComplaintStatus);

router.get("/:complaintId", auth, getComplaintById);
router.delete("/:complaintId", auth, deleteComplaint);

export default router;
