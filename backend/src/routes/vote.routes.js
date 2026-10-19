import express from "express";
import {
  upvoteComplaint,
  removeUpvote,
} from "../controllers/vote.controller.js";

import auth from "../middleware/auth.middleware.js";

const router = express.Router();

// Upvote a complaint
router.post(
  "/complaints/:complaintId/vote",
  auth,
  upvoteComplaint
);

// Remove upvote
router.delete(
  "/complaints/:complaintId/vote",
  auth,
  removeUpvote
);

export default router;