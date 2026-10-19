export const calculatePriority = (complaint) => {
  let score = 0;

  // AI severity weight
  if (complaint.aiSeverity === "high") score += 50;
  else if (complaint.aiSeverity === "medium") score += 30;
  else if (complaint.aiSeverity === "low") score += 10;

  // Community upvotes
  score += Math.min(complaint.upvoteCount * 5, 30);

  // Time-based escalation
  const hoursPending =
    (Date.now() - new Date(complaint.createdAt).getTime()) /
    (1000 * 60 * 60);

  score += Math.min(Math.floor(hoursPending / 12) * 5, 30);

  // Status effect
  if (complaint.status === "in_progress") score -= 20;
  if (complaint.status === "resolved") score = 0;

  return Math.max(score, 0);
};