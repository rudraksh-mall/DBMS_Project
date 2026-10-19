import * as votesRepo from "../repositories/votes.repo.js";
import * as complaintsRepo from "../repositories/complaints.repo.js";
import { withTransaction } from "../db/mysql.js";
import { isDuplicateKeyError } from "../db/errors.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { calculatePriority } from "../services/priority.service.js";

const priorityInput = (row, upvoteCount) => ({
  aiSeverity: row.ai_severity,
  upvoteCount,
  createdAt: row.created_at,
  status: row.status,
});

/**
 * UPVOTE A COMPLAINT
 */
export const upvoteComplaint = asyncHandler(async (req, res) => {
  const user = req.user;
  const { complaintId } = req.params;

  if (user.role !== "citizen") {
    throw new ApiError(403, "Only citizens can upvote complaints");
  }

  const complaint = await complaintsRepo.getById(complaintId);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  const count = await withTransaction(async (conn) => {
    // Lock the complaint row first. Every concurrent voter contends on this
    // single row in a consistent order, which serializes the transactions and
    // avoids the insert/update lock-order deadlock.
    const updatedCount = await complaintsRepo.incrementUpvote(complaintId, conn);

    try {
      await votesRepo.create({ complaintId, userId: user._id }, conn);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ApiError(400, "You have already upvoted this complaint");
      }
      throw err;
    }

    const score = calculatePriority(priorityInput(complaint, updatedCount));
    await complaintsRepo.updatePriority(complaintId, score, conn);
    return updatedCount;
  });

  return res.json(
    new ApiResponse(
      200,
      { upvoted: true, count },
      "Complaint upvoted successfully"
    )
  );
});

/**
 * REMOVE UPVOTE
 */
export const removeUpvote = asyncHandler(async (req, res) => {
  const user = req.user;
  const { complaintId } = req.params;

  if (user.role !== "citizen") {
    throw new ApiError(403, "Only citizens can remove upvotes");
  }

  const count = await withTransaction(async (conn) => {
    const complaint = await complaintsRepo.getById(complaintId, conn);
    if (!complaint) {
      throw new ApiError(404, "Complaint not found");
    }

    // Lock order matches upvote (complaint row first) to stay deadlock-free.
    const updatedCount = await complaintsRepo.decrementUpvote(complaintId, conn);

    const removed = await votesRepo.remove(
      { complaintId, userId: user._id },
      conn
    );
    if (!removed) {
      throw new ApiError(400, "You have not upvoted this complaint");
    }

    const score = calculatePriority(priorityInput(complaint, updatedCount));
    await complaintsRepo.updatePriority(complaintId, score, conn);
    return updatedCount;
  });

  return res.json(
    new ApiResponse(
      200,
      { upvoted: false, count },
      "Upvote removed successfully"
    )
  );
});