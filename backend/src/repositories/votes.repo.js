import { exec } from "../db/mysql.js";

/**
 * Insert a vote. Relies on the DB unique key `uk_votes_complaint_user` to
 * reject duplicates; the caller translates ER_DUP_ENTRY into a 409/400.
 */
export async function create({ complaintId, userId }, conn) {
  await exec(
    conn,
    "INSERT INTO votes (complaint_id, user_id) VALUES (?, ?)",
    [complaintId, userId]
  );
}

export async function remove({ complaintId, userId }, conn) {
  const result = await exec(
    conn,
    "DELETE FROM votes WHERE complaint_id = ? AND user_id = ?",
    [complaintId, userId]
  );
  return result.affectedRows;
}

export async function exists({ complaintId, userId }, conn) {
  const rows = await exec(
    conn,
    "SELECT id FROM votes WHERE complaint_id = ? AND user_id = ? LIMIT 1",
    [complaintId, userId]
  );
  return !!rows[0];
}