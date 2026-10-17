/**
 * Row → API object mappers.
 *
 * These reproduce the JSON shapes the MongoDB/Mongoose API produced:
 *  - `_id` is a string (numeric primary key serialized safely)
 *  - timestamps are ISO-8601 UTC strings
 *  - populated references become `{ _id, name, ... }` objects
 *  - unpopulated references remain plain id strings
 */

export function toIso(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function wardIdValue(row) {
  if (row.ward_id === null || row.ward_id === undefined) return null;
  return String(row.ward_id);
}

export function mapUserRow(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    wardId: wardIdValue(row),
    phone: row.phone,
    avatar: row.avatar,
    isVerified: !!row.is_verified,
    isActive: !!row.is_active,
    googleId: row.google_id,
    providers: parseJson(row.providers, ["local"]),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

/**
 * Admin authority listing shape: includes the joined ward object.
 */
export function mapAuthorityWithWard(row) {
  if (!row) return null;
  const hasWard = row.ward_join_id !== null && row.ward_join_id !== undefined;
  return {
    _id: String(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    wardId: hasWard
      ? {
          _id: String(row.ward_join_id),
          name: row.ward_join_name,
          city: row.ward_join_city,
        }
      : null,
    isActive: !!row.is_active,
    createdAt: toIso(row.created_at),
  };
}

export function mapWardRow(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    name: row.name,
    city: row.city,
  };
}

function hasWardJoin(row) {
  return row.ward_join_id !== null && row.ward_join_id !== undefined;
}

function hasReporterJoin(row) {
  return row.reporter_id !== null && row.reporter_id !== undefined;
}

/**
 * Complaint mapper. `wardJoin`/`reporterJoin` are inferred from the aliased
 * columns produced by the repository JOINs.
 */
export function mapComplaintRow(row, { hasUpvoted } = {}) {
  if (!row) return null;

  const complaint = {
    _id: String(row.id),
    reportedBy: hasReporterJoin(row)
      ? {
          _id: String(row.reporter_id),
          name: row.reporter_name,
          email: row.reporter_email,
        }
      : String(row.reported_by),
    description: row.description,
    imageUrl: row.image_url,
    location: {
      lat: row.lat,
      lng: row.lng,
    },
    wardId: hasWardJoin(row)
      ? {
          _id: String(row.ward_join_id),
          name: row.ward_join_name,
          city: row.ward_join_city,
        }
      : wardIdValue(row),
    aiCategory: row.ai_category,
    aiSeverity: row.ai_severity,
    aiKeywords: parseJson(row.ai_keywords, []),
    aiConfidence: row.ai_confidence,
    aiRejectionReason: row.ai_rejection_reason,
    aiStatus: row.ai_status,
    priorityScore: row.priority_score,
    upvoteCount: row.upvote_count,
    status: row.status,
    authorityRemarks: row.authority_remarks,
    afterFixImageUrl: row.after_fix_image_url,
    resolvedAt: toIso(row.resolved_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };

  if (hasUpvoted !== undefined) {
    complaint.hasUpvoted = !!hasUpvoted;
  }

  return complaint;
}

export function mapStatusHistoryRow(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    complaintId: String(row.complaint_id),
    status: row.status,
    changedBy: row.changed_by === null ? null : String(row.changed_by),
    remarks: row.remarks,
    createdAt: toIso(row.created_at),
  };
}