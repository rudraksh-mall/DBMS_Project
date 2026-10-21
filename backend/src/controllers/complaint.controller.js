import * as complaintsRepo from "../repositories/complaints.repo.js";
import * as wardsRepo from "../repositories/wards.repo.js";
import * as votesRepo from "../repositories/votes.repo.js";
import * as historyRepo from "../repositories/history.repo.js";

import { withTransaction } from "../db/mysql.js";
import { mapComplaintRow } from "../repositories/mappers.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { validateDescription } from "../utils/validateDescription.js";

import { calculatePriority } from "../services/priority.service.js";
import { fallbackClassify } from "../services/fallbackClassifier.js";
import { analyzeComplaintWithAI } from "../services/ai.service.js";
import { haversineDistanceKm } from "../services/geo.service.js";
import { isCloudinaryConfigured, uploadBuffer } from "../db/cloudinary.js";

const PLACEHOLDER_IMAGE =
  "https://via.placeholder.com/800x450?text=Evidence+Image+Pending";

const VALID_STATUSES = ["submitted", "acknowledged", "in_progress", "resolved"];

const ALLOWED_TRANSITIONS = {
  submitted: ["acknowledged", "in_progress", "resolved"],
  acknowledged: ["in_progress", "resolved"],
  in_progress: ["resolved"],
  resolved: [],
};

function parseCoordinates(lat, lng) {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (
    !Number.isFinite(parsedLat) ||
    !Number.isFinite(parsedLng) ||
    parsedLat < -90 ||
    parsedLat > 90 ||
    parsedLng < -180 ||
    parsedLng > 180
  ) {
    return null;
  }

  return { lat: parsedLat, lng: parsedLng };
}

function findUploadedFile(req, preferredField) {
  const files = Array.isArray(req.files)
    ? req.files
    : req.file
      ? [req.file]
      : [];

  return (
    files.find((file) => file.fieldname === preferredField) || files[0] || null
  );
}

async function storeImage(file, folder) {
  if (!file) return null;

  if (!isCloudinaryConfigured()) {
    console.warn(
      "Cloudinary is not configured; storing a placeholder image URL instead."
    );
    return PLACEHOLDER_IMAGE;
  }

  try {
    return await uploadBuffer(file.buffer, { folder });
  } catch (error) {
    console.error("Cloudinary upload failed:", error.message);
    throw new ApiError(502, "Image upload failed. Please try again.");
  }
}

async function classifyComplaint(description, imageUrl) {
  if (process.env.OPENAI_API_KEY) {
    return analyzeComplaintWithAI({ imageUrl, description });
  }

  const fallback = fallbackClassify(description);
  return {
    isRelevant: true,
    descriptionMatches: true,
    category: fallback.category,
    severity: fallback.severity,
    confidence: fallback.confidence,
    keywords: fallback.keywords,
    source: "fallback",
  };
}

function assertClassification(analysis) {
  if (analysis?.isRelevant === false) {
    throw new ApiError(
      400,
      analysis.rejectionReason ||
        "The uploaded image does not appear to show a civic issue."
    );
  }

  if (analysis?.descriptionMatches === false) {
    throw new ApiError(
      400,
      analysis.mismatchReason ||
        "The uploaded image and description appear to describe different issues."
    );
  }
}

async function resolveWard({ lat, lng, wardId }) {
  const ward = await wardsRepo.findByPoint(lat, lng);
  if (ward) return ward;

  if (wardId !== undefined && wardId !== null && wardId !== "") {
    const explicitWard = await wardsRepo.findById(wardId);
    if (explicitWard) return explicitWard;
  }

  throw new ApiError(400, "The given location is outside all municipal wards");
}

export const createComplaint = asyncHandler(async (req, res) => {
  const user = req.user;
  const body = req.body || {};

  if (user.role !== "citizen") {
    throw new ApiError(403, "Only citizens can report complaints");
  }

  const descriptionCheck = validateDescription(body.description);
  if (!descriptionCheck.valid) {
    throw new ApiError(400, descriptionCheck.message);
  }
  const description = descriptionCheck.value;

  const coordinates = parseCoordinates(
    body.lat ?? body.location?.lat,
    body.lng ?? body.location?.lng
  );
  if (!coordinates) {
    throw new ApiError(400, "Valid lat and lng are required");
  }

  const uploadedFile = findUploadedFile(req, "image");
  const uploadedUrl = await storeImage(uploadedFile, "civicfix/complaints");
  const imageUrl = uploadedUrl || body.imageUrl;

  if (!imageUrl) {
    throw new ApiError(400, "Evidence image is required");
  }

  const ward = await resolveWard({
    lat: coordinates.lat,
    lng: coordinates.lng,
    wardId: body.wardId,
  });

  const analysis = await classifyComplaint(description, imageUrl);
  assertClassification(analysis);

  const createdAt = new Date();
  const aiStatus = analysis.source === "fallback" ? "fallback" : "ai";
  const priorityScore = calculatePriority({
    aiSeverity: analysis.severity,
    upvoteCount: 0,
    createdAt,
    status: "submitted",
  });

  const id = await withTransaction(async (conn) => {
    const complaintId = await complaintsRepo.insert(
      {
        reportedBy: user._id,
        description,
        imageUrl,
        lat: coordinates.lat,
        lng: coordinates.lng,
        wardId: ward.id,
        aiCategory: analysis.category,
        aiSeverity: analysis.severity,
        aiKeywords: analysis.keywords || [],
        aiConfidence: analysis.confidence ?? null,
        aiStatus,
      },
      conn
    );

    await complaintsRepo.updatePriority(complaintId, priorityScore, conn);

    return complaintId;
  });

  const created = await complaintsRepo.getByIdWithWard(id);

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        mapComplaintRow(created),
        "Complaint reported successfully"
      )
    );
});

export const getAllComplaints = asyncHandler(async (req, res) => {
  const scope = req.query.scope === "trending" ? "trending" : "newest";
  const city = req.query.city ? String(req.query.city).trim() : null;
  const wardId =
    req.query.wardId === undefined || req.query.wardId === ""
      ? null
      : req.query.wardId;

  const rows = await complaintsRepo.listFeed({
    userId: req.user._id,
    wardId,
    city,
    scope,
  });

  let complaints = rows.map((row) =>
    mapComplaintRow(row, { hasUpvoted: !!row.user_vote_id })
  );

  const coordinates = parseCoordinates(req.query.lat, req.query.lng);

  if (coordinates) {
    const requestedRadius = Number(req.query.radius);
    const radiusKm =
      Number.isFinite(requestedRadius) && requestedRadius > 0
        ? requestedRadius
        : 5;

    complaints = complaints
      .map((complaint) => ({
        complaint,
        distanceKm: haversineDistanceKm(
          coordinates.lat,
          coordinates.lng,
          complaint.location.lat,
          complaint.location.lng
        ),
      }))
      .filter((entry) => entry.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map((entry) => entry.complaint);
  }

  return res.json(
    new ApiResponse(200, complaints, "Complaints fetched successfully")
  );
});

export const getMyComplaints = asyncHandler(async (req, res) => {
  const rows = await complaintsRepo.listByReporter(req.user._id);

  return res.json(
    new ApiResponse(
      200,
      rows.map((row) =>
        mapComplaintRow(row, { hasUpvoted: !!row.user_vote_id })
      ),
      "Your reports fetched successfully"
    )
  );
});

export const getWardComplaints = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "authority") {
    throw new ApiError(403, "Access denied");
  }

  if (user.wardId === null || user.wardId === undefined) {
    throw new ApiError(403, "No ward assigned to this authority");
  }

  const rows = await complaintsRepo.listByWard(user.wardId);

  return res.json(
    new ApiResponse(
      200,
      rows.map((row) => mapComplaintRow(row)),
      "Ward complaints fetched successfully"
    )
  );
});

export const getComplaintById = asyncHandler(async (req, res) => {
  const { complaintId } = req.params;

  const complaint = await complaintsRepo.getByIdWithWard(complaintId);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  const hasUpvoted = await votesRepo.exists({
    complaintId,
    userId: req.user._id,
  });

  return res.json(
    new ApiResponse(
      200,
      mapComplaintRow(complaint, { hasUpvoted }),
      "Complaint fetched successfully"
    )
  );
});

export const updateComplaintStatus = asyncHandler(async (req, res) => {
  const user = req.user;
  const { complaintId } = req.params;
  const body = req.body || {};

  if (user.role !== "authority") {
    throw new ApiError(403, "Only authority can update complaint status");
  }

  const status = body.status;
  if (!VALID_STATUSES.includes(status)) {
    throw new ApiError(400, "Invalid complaint status");
  }

  const complaint = await complaintsRepo.getById(complaintId);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (
    user.wardId === null ||
    user.wardId === undefined ||
    Number(complaint.ward_id) !== Number(user.wardId)
  ) {
    throw new ApiError(403, "Not authorized for this ward");
  }

  if (
    status !== complaint.status &&
    !ALLOWED_TRANSITIONS[complaint.status]?.includes(status)
  ) {
    throw new ApiError(
      400,
      `Cannot change status from ${complaint.status} to ${status}`
    );
  }

  const uploadedFile =
    findUploadedFile(req, "afterFixImage") || findUploadedFile(req, "image");
  const uploadedUrl = await storeImage(uploadedFile, "civicfix/after-fix");

  const afterFixImageUrl =
    uploadedUrl ||
    body.afterFixImageUrl ||
    body.afterFixImage ||
    complaint.after_fix_image_url ||
    null;

  if (status === "resolved" && !afterFixImageUrl) {
    throw new ApiError(
      400,
      "An after-fix image is required to resolve a complaint"
    );
  }

  const remarks =
    body.remarks !== undefined ? body.remarks : complaint.authority_remarks;
  const resolvedAt =
    status === "resolved" ? complaint.resolved_at || new Date() : null;

  await withTransaction(async (conn) => {
    await complaintsRepo.updateStatusFields(
      complaint.id,
      {
        status,
        authorityRemarks: remarks,
        afterFixImageUrl,
        resolvedAt,
        priorityScore: complaint.priority_score,
      },
      conn
    );

    await historyRepo.create(
      {
        complaintId: complaint.id,
        status,
        changedBy: user._id,
        remarks: remarks ?? null,
      },
      conn
    );
  });

  const updated = await complaintsRepo.getByIdWithWard(complaint.id);

  return res.json(
    new ApiResponse(
      200,
      mapComplaintRow(updated),
      "Complaint status updated successfully"
    )
  );
});

export const updateComplaint = asyncHandler(async (req, res) => {
  const user = req.user;
  const { complaintId } = req.params;
  const body = req.body || {};

  if (user.role !== "citizen") {
    throw new ApiError(403, "Only citizens can edit their complaints");
  }

  const complaint = await complaintsRepo.getById(complaintId);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (Number(complaint.reported_by) !== Number(user._id)) {
    throw new ApiError(403, "You can only edit your own complaints");
  }

  if (complaint.status !== "submitted") {
    throw new ApiError(
      400,
      "Only complaints that are still submitted can be edited"
    );
  }

  const descriptionCheck = validateDescription(
    body.description !== undefined ? body.description : complaint.description
  );
  if (!descriptionCheck.valid) {
    throw new ApiError(400, descriptionCheck.message);
  }
  const description = descriptionCheck.value;

  const coordinates = parseCoordinates(
    body.lat ?? body.location?.lat ?? complaint.lat,
    body.lng ?? body.location?.lng ?? complaint.lng
  );
  if (!coordinates) {
    throw new ApiError(400, "Valid lat and lng are required");
  }

  const uploadedFile = findUploadedFile(req, "image");
  const uploadedUrl = await storeImage(uploadedFile, "civicfix/complaints");
  const imageUrl = uploadedUrl || body.imageUrl || complaint.image_url;

  const latitudeChanged = Number(coordinates.lat) !== Number(complaint.lat);
  const longitudeChanged = Number(coordinates.lng) !== Number(complaint.lng);

  const ward =
    latitudeChanged || longitudeChanged
      ? await resolveWard({
          lat: coordinates.lat,
          lng: coordinates.lng,
          wardId: body.wardId,
        })
      : body.wardId
        ? await resolveWard({
            lat: coordinates.lat,
            lng: coordinates.lng,
            wardId: body.wardId,
          })
        : { id: complaint.ward_id };

  const contentChanged =
    description !== complaint.description ||
    imageUrl !== complaint.image_url ||
    latitudeChanged ||
    longitudeChanged;

  let analysis = {
    category: complaint.ai_category,
    severity: complaint.ai_severity,
    keywords: JSON.parse(
      typeof complaint.ai_keywords === "string"
        ? complaint.ai_keywords
        : JSON.stringify(complaint.ai_keywords || [])
    ),
    confidence: complaint.ai_confidence,
    source: complaint.ai_status,
  };

  if (contentChanged) {
    analysis = await classifyComplaint(description, imageUrl);
    assertClassification(analysis);
  }

  const aiStatus = analysis.source === "fallback" ? "fallback" : "ai";
  const priorityScore = calculatePriority({
    aiSeverity: analysis.severity,
    upvoteCount: complaint.upvote_count,
    createdAt: complaint.created_at,
    status: complaint.status,
  });

  await complaintsRepo.updateCitizenEdit(complaint.id, {
    description,
    imageUrl,
    lat: coordinates.lat,
    lng: coordinates.lng,
    wardId: ward.id,
    aiCategory: analysis.category,
    aiSeverity: analysis.severity,
    aiKeywords: analysis.keywords || [],
    aiConfidence: analysis.confidence ?? null,
    aiStatus,
    priorityScore,
  });

  const updated = await complaintsRepo.getByIdWithWard(complaint.id);

  return res.json(
    new ApiResponse(
      200,
      mapComplaintRow(updated),
      "Complaint updated successfully"
    )
  );
});

export const deleteComplaint = asyncHandler(async (req, res) => {
  const user = req.user;
  const { complaintId } = req.params;

  const complaint = await complaintsRepo.getById(complaintId);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (Number(complaint.reported_by) !== Number(user._id)) {
    throw new ApiError(403, "You can only delete your own complaints");
  }

  if (complaint.status !== "submitted") {
    throw new ApiError(
      400,
      "Only complaints that are still submitted can be deleted"
    );
  }

  await complaintsRepo.deleteById(complaint.id);

  return res.json(new ApiResponse(200, null, "Complaint deleted successfully"));
});
