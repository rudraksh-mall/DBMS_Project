import * as complaintsRepo from "../repositories/complaints.repo.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getAuthorityAnalytics = asyncHandler(async (req, res) => {
  if (req.user.role !== "authority" && req.user.role !== "admin") {
    throw new ApiError(403, "Access denied");
  }

  const wardId = req.user.wardId;

  // 1. Category counts
  const categoryRows = await complaintsRepo.categoryCounts(wardId);
  const categoryMap = {};
  for (const row of categoryRows) {
    if (row.category) categoryMap[row.category] = Number(row.count);
  }

  // 2. Priority distribution
  const priorityRow = await complaintsRepo.priorityCounts(wardId);
  const priority = {
    high: Number(priorityRow.high || 0),
    medium: Number(priorityRow.medium || 0),
    low: Number(priorityRow.low || 0),
  };

  // 3. Status breakdown (standardized keys for the frontend)
  const status = {
    submitted: 0,
    acknowledged: 0,
    in_progress: 0,
    resolved: 0,
  };
  const statusRows = await complaintsRepo.statusCounts(wardId);
  for (const row of statusRows) {
    const key = row.status === "in-progress" ? "in_progress" : row.status;
    if (Object.prototype.hasOwnProperty.call(status, key)) {
      status[key] = Number(row.count);
    }
  }

  // 4. Average resolution time (days)
  const avgSeconds = await complaintsRepo.averageResolutionSeconds(wardId);
  const avgResolutionTime = (Number(avgSeconds || 0) / 86400).toFixed(1);

  // 5. Weekly trend (last 4 weeks)
  const trend = [];
  for (let i = 3; i >= 0; i--) {
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    const start = new Date();
    start.setDate(start.getDate() - (i + 1) * 7);

    const window = await complaintsRepo.trendWindow(wardId, start, end);

    trend.push({
      label: `Week ${4 - i}`,
      reported: Number(window.reported || 0),
      resolved: Number(window.resolved || 0),
    });
  }

  res.json({
    categoryMap,
    priority,
    status,
    avgResolutionTime,
    trend,
  });
});