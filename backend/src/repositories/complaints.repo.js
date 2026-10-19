import { exec } from "../db/mysql.js";

const COMPLAINT_COLUMNS = `c.id, c.reported_by, c.description, c.image_url, c.lat, c.lng,
  c.ward_id, c.ai_category, c.ai_severity, c.ai_keywords, c.ai_confidence,
  c.ai_rejection_reason, c.ai_status, c.priority_score, c.upvote_count, c.status,
  c.authority_remarks, c.after_fix_image_url, c.resolved_at, c.created_at, c.updated_at`;

const WARD_JOIN = `w.id AS ward_join_id, w.name AS ward_join_name, w.city AS ward_join_city`;
const REPORTER_JOIN = `u.id AS reporter_id, u.name AS reporter_name, u.email AS reporter_email`;

export async function insert(data, conn) {
  const {
    reportedBy,
    description,
    imageUrl,
    lat,
    lng,
    wardId,
    aiCategory,
    aiSeverity,
    aiKeywords = [],
    aiConfidence = null,
    aiStatus = "ai",
  } = data;

  const result = await exec(
    conn,
    `INSERT INTO complaints
       (reported_by, description, image_url, lat, lng, ward_id,
        ai_category, ai_severity, ai_keywords, ai_confidence, ai_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reportedBy,
      description,
      imageUrl,
      lat,
      lng,
      wardId,
      aiCategory,
      aiSeverity,
      JSON.stringify(aiKeywords),
      aiConfidence,
      aiStatus,
    ]
  );
  return result.insertId;
}

export async function getById(id, conn) {
  const rows = await exec(
    conn,
    `SELECT ${COMPLAINT_COLUMNS} FROM complaints c WHERE c.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function getByIdWithWard(id, conn) {
  const rows = await exec(
    conn,
    `SELECT ${COMPLAINT_COLUMNS}, ${WARD_JOIN}
       FROM complaints c
       LEFT JOIN wards w ON w.id = c.ward_id
      WHERE c.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Community discovery feed. `scope` selects a fixed, allow-listed ORDER BY.
 * `userId` drives the `hasUpvoted` flag via a single LEFT JOIN (no N+1).
 */
export async function listFeed({ userId = null, wardId = null, city = null, scope } = {}, conn) {
  const where = [];
  const params = [userId];

  if (wardId !== null && wardId !== undefined) {
    where.push("c.ward_id = ?");
    params.push(wardId);
  }
  if (city) {
    where.push("w.city = ?");
    params.push(city);
  }

  const orderBy =
    scope === "trending"
      ? "c.upvote_count DESC, c.created_at DESC"
      : "c.created_at DESC";

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  return exec(
    conn,
    `SELECT ${COMPLAINT_COLUMNS}, ${WARD_JOIN}, v.id AS user_vote_id
       FROM complaints c
       JOIN wards w ON w.id = c.ward_id
       LEFT JOIN votes v ON v.complaint_id = c.id AND v.user_id = ?
       ${whereSql}
      ORDER BY ${orderBy}`,
    params
  );
}

export async function listByWard(wardId, conn) {
  return exec(
    conn,
    `SELECT ${COMPLAINT_COLUMNS}, ${WARD_JOIN}
       FROM complaints c
       JOIN wards w ON w.id = c.ward_id
      WHERE c.ward_id = ?
      ORDER BY c.priority_score DESC, c.created_at DESC`,
    [wardId]
  );
}

export async function listByReporter(userId, conn) {
  return exec(
    conn,
    `SELECT ${COMPLAINT_COLUMNS}, ${WARD_JOIN}, v.id AS user_vote_id
       FROM complaints c
       JOIN wards w ON w.id = c.ward_id
       LEFT JOIN votes v ON v.complaint_id = c.id AND v.user_id = ?
      WHERE c.reported_by = ?
      ORDER BY c.created_at DESC`,
    [userId, userId]
  );
}

export async function adminListByWard({ wardId, status = null, category = null }, conn) {
  const where = ["c.ward_id = ?"];
  const params = [wardId];
  if (status) {
    where.push("c.status = ?");
    params.push(status);
  }
  if (category) {
    where.push("c.ai_category = ?");
    params.push(category);
  }
  return exec(
    conn,
    `SELECT ${COMPLAINT_COLUMNS}, ${REPORTER_JOIN}
       FROM complaints c
       JOIN users u ON u.id = c.reported_by
      WHERE ${where.join(" AND ")}
      ORDER BY c.priority_score DESC`,
    params
  );
}

export async function dashboardCounts(wardId, localMidnight, conn) {
  const rows = await exec(
    conn,
    `SELECT
        COUNT(*) AS total,
        COALESCE(SUM(c.priority_score >= 65 AND c.status <> 'resolved'), 0) AS high_priority,
        COALESCE(SUM(c.status = 'in_progress'), 0) AS in_progress,
        COALESCE(SUM(c.status = 'resolved' AND c.resolved_at >= ?), 0) AS resolved_today
       FROM complaints c
      WHERE c.ward_id = ?`,
    [localMidnight, wardId]
  );
  return rows[0];
}

export async function highPriorityList(wardId, limit, conn) {
  return exec(
    conn,
    `SELECT ${COMPLAINT_COLUMNS}, ${WARD_JOIN}
       FROM complaints c
       JOIN wards w ON w.id = c.ward_id
      WHERE c.ward_id = ? AND c.priority_score >= 65 AND c.status <> 'resolved'
      ORDER BY c.priority_score DESC
      LIMIT ?`,
    [wardId, limit]
  );
}

export async function recentList(wardId, limit, conn) {
  return exec(
    conn,
    `SELECT ${COMPLAINT_COLUMNS}, ${WARD_JOIN}
       FROM complaints c
       JOIN wards w ON w.id = c.ward_id
      WHERE c.ward_id = ?
      ORDER BY c.created_at DESC
      LIMIT ?`,
    [wardId, limit]
  );
}

export async function escalations(thresholdDate, conn) {
  return exec(
    conn,
    `SELECT ${COMPLAINT_COLUMNS}
       FROM complaints c
      WHERE c.status <> 'resolved'
        AND c.priority_score >= 80
        AND c.created_at <= ?
      ORDER BY c.priority_score DESC`,
    [thresholdDate]
  );
}

export async function updateStatusFields(
  id,
  { status, authorityRemarks, afterFixImageUrl, resolvedAt, priorityScore },
  conn
) {
  await exec(
    conn,
    `UPDATE complaints
        SET status = ?,
            authority_remarks = ?,
            after_fix_image_url = ?,
            resolved_at = ?,
            priority_score = ?
      WHERE id = ?`,
    [status, authorityRemarks, afterFixImageUrl, resolvedAt, priorityScore, id]
  );
}

export async function updateCitizenEdit(
  id,
  {
    description,
    imageUrl,
    lat,
    lng,
    wardId,
    aiCategory,
    aiSeverity,
    aiKeywords,
    aiConfidence,
    aiStatus,
    priorityScore,
  },
  conn
) {
  await exec(
    conn,
    `UPDATE complaints
        SET description = ?,
            image_url = ?,
            lat = ?,
            lng = ?,
            ward_id = ?,
            ai_category = ?,
            ai_severity = ?,
            ai_keywords = ?,
            ai_confidence = ?,
            ai_status = ?,
            priority_score = ?
      WHERE id = ?`,
    [
      description,
      imageUrl,
      lat,
      lng,
      wardId,
      aiCategory,
      aiSeverity,
      JSON.stringify(aiKeywords || []),
      aiConfidence,
      aiStatus,
      priorityScore,
      id,
    ]
  );
}

export async function updatePriority(id, priorityScore, conn) {
  await exec(conn, "UPDATE complaints SET priority_score = ? WHERE id = ?", [
    priorityScore,
    id,
  ]);
}

export async function incrementUpvote(id, conn) {
  await exec(
    conn,
    "UPDATE complaints SET upvote_count = upvote_count + 1 WHERE id = ?",
    [id]
  );
  const rows = await exec(
    conn,
    "SELECT upvote_count FROM complaints WHERE id = ?",
    [id]
  );
  return rows[0]?.upvote_count ?? 0;
}

export async function decrementUpvote(id, conn) {
  // CAST to SIGNED avoids an underflow error when decrementing an UNSIGNED
  // column that is already 0 (e.g. a concurrent/duplicate removal).
  await exec(
    conn,
    "UPDATE complaints SET upvote_count = GREATEST(CAST(upvote_count AS SIGNED) - 1, 0) WHERE id = ?",
    [id]
  );
  const rows = await exec(
    conn,
    "SELECT upvote_count FROM complaints WHERE id = ?",
    [id]
  );
  return rows[0]?.upvote_count ?? 0;
}

export async function deleteById(id, conn) {
  const result = await exec(conn, "DELETE FROM complaints WHERE id = ?", [id]);
  return result.affectedRows;
}

/* ----------------------------- Analytics ----------------------------- */

export async function categoryCounts(wardId, conn) {
  return exec(
    conn,
    `SELECT ai_category AS category, COUNT(*) AS count
       FROM complaints WHERE ward_id = ?
      GROUP BY ai_category`,
    [wardId]
  );
}

export async function priorityCounts(wardId, conn) {
  const rows = await exec(
    conn,
    `SELECT
        COALESCE(SUM(priority_score >= 65), 0) AS high,
        COALESCE(SUM(priority_score >= 40 AND priority_score < 65), 0) AS medium,
        COALESCE(SUM(priority_score < 40), 0) AS low
       FROM complaints WHERE ward_id = ?`,
    [wardId]
  );
  return rows[0];
}

export async function statusCounts(wardId, conn) {
  return exec(
    conn,
    `SELECT status, COUNT(*) AS count
       FROM complaints WHERE ward_id = ?
      GROUP BY status`,
    [wardId]
  );
}

export async function averageResolutionSeconds(wardId, conn) {
  const rows = await exec(
    conn,
    `SELECT AVG(TIMESTAMPDIFF(SECOND, created_at, updated_at)) AS avg_seconds
       FROM complaints
      WHERE ward_id = ? AND status = 'resolved'`,
    [wardId]
  );
  return rows[0]?.avg_seconds ?? null;
}

export async function trendWindow(wardId, start, end, conn) {
  const rows = await exec(
    conn,
    `SELECT
        COUNT(*) AS reported,
        COALESCE(SUM(status = 'resolved'), 0) AS resolved
       FROM complaints
      WHERE ward_id = ? AND created_at >= ? AND created_at < ?`,
    [wardId, start, end]
  );
  return rows[0];
}

/* -------------------- Non-user-facing helpers (services) -------------------- */

export async function allWithCoordinates(conn) {
  return exec(
    conn,
    "SELECT id, lat, lng FROM complaints WHERE lat IS NOT NULL AND lng IS NOT NULL"
  );
}

export async function activeByCategory(category, conn) {
  return exec(
    conn,
    "SELECT id, lat, lng FROM complaints WHERE ai_category = ? AND status <> 'resolved'",
    [category]
  );
}

export async function listUnresolved(conn) {
  return exec(
    conn,
    `SELECT id, ai_severity, upvote_count, created_at, status
       FROM complaints WHERE status <> 'resolved'`
  );
}