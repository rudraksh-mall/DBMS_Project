import * as complaintsRepo from "../repositories/complaints.repo.js";
import { mapComplaintRow } from "../repositories/mappers.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getAuthorityDashboard = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "authority") {
    return res.status(403).json({ message: "Access denied" });
  }

  const wardId = user.wardId;
  const localMidnight = new Date(new Date().setHours(0, 0, 0, 0));

  // 1. Statistics for the dashboard
  const counts = await complaintsRepo.dashboardCounts(wardId, localMidnight);

  // 2. High-priority issues for the UI card
  const highPriorityRows = await complaintsRepo.highPriorityList(wardId, 5);

  // 3. Recent complaints for the activity feed
  const recentRows = await complaintsRepo.recentList(wardId, 15);

  res.json(
    new ApiResponse(
      200,
      {
        stats: {
          total: Number(counts.total || 0),
          highPriority: Number(counts.high_priority || 0),
          inProgress: Number(counts.in_progress || 0),
          resolvedToday: Number(counts.resolved_today || 0),
        },
        highPriorityIssues: highPriorityRows.map((row) => mapComplaintRow(row)),
        recent: recentRows.map((row) => mapComplaintRow(row)),
      },
      "Authority dashboard synced successfully"
    )
  );
});