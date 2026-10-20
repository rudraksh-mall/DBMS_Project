import { exec } from "../db/mysql.js";

export async function create(
  { complaintId, status, changedBy = null, remarks = null },
  conn
) {
  await exec(
    conn,
    `INSERT INTO complaint_status_history (complaint_id, status, changed_by, remarks)
     VALUES (?, ?, ?, ?)`,
    [complaintId, status, changedBy, remarks]
  );
}

export async function listByComplaint(complaintId, conn) {
  return exec(
    conn,
    `SELECT id, complaint_id, status, changed_by, remarks, created_at
       FROM complaint_status_history
      WHERE complaint_id = ?
      ORDER BY created_at ASC, id ASC`,
    [complaintId]
  );
}