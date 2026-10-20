import cron from "node-cron";
import * as complaintsRepo from "../repositories/complaints.repo.js";
import { calculatePriority } from "./priority.service.js";

/**
 * Daily priority recalculation.
 *
 * NOTE: this scheduler is not wired into server startup (unchanged from the
 * previous implementation) and `node-cron` is not declared as a dependency.
 * The database access has been ported to MySQL so it no longer depends on
 * Mongoose if it is ever enabled.
 */
export const startSchedulers = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("Running daily priority recalculation...");

    const complaints = await complaintsRepo.listUnresolved();

    for (const complaint of complaints) {
      const score = calculatePriority({
        aiSeverity: complaint.ai_severity,
        upvoteCount: complaint.upvote_count,
        createdAt: complaint.created_at,
        status: complaint.status,
      });
      await complaintsRepo.updatePriority(complaint.id, score);
    }
  });

  console.log("Scheduler started");
};