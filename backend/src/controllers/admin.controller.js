import crypto from "crypto";
import bcrypt from "bcrypt";

import * as complaintsRepo from "../repositories/complaints.repo.js";
import * as usersRepo from "../repositories/users.repo.js";
import * as wardsRepo from "../repositories/wards.repo.js";
import * as historyRepo from "../repositories/history.repo.js";
import { withTransaction } from "../db/mysql.js";
import { mapComplaintRow, mapAuthorityWithWard } from "../repositories/mappers.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { calculatePriority } from "../services/priority.service.js";

/**
 * =====================================
 * GET WARD COMPLAINTS (Authority/Admin)
 * =====================================
 */
export const getWardComplaints = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "authority" && user.role !== "admin") {
    throw new ApiError(403, "Access denied");
  }

  const { status, category } = req.query;

  const rows = await complaintsRepo.adminListByWard({
    wardId: user.wardId,
    status: status || null,
    category: category || null,
  });

  res.json(
    new ApiResponse(200, rows.map((row) => mapComplaintRow(row)), "Ward complaints fetched successfully")
  );
});

/**
 * =====================================
 * UPDATE COMPLAINT STATUS (Authority)
 * =====================================
 */
export const updateComplaintStatus = asyncHandler(async (req, res) => {
  const user = req.user;
  const { complaintId } = req.params;
  const { status, remarks } = req.body;

  if (user.role !== "authority") {
    throw new ApiError(403, "Only authority can update complaint status");
  }

  if (!status) throw new ApiError(400, "Status is required");

  const complaint = await complaintsRepo.getById(complaintId);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (user.wardId === null || Number(complaint.ward_id) !== Number(user.wardId)) {
    throw new ApiError(403, "Not authorized for this ward");
  }

  const nextRemarks = remarks || complaint.authority_remarks;
  const resolvedAt = status === "resolved" ? new Date() : complaint.resolved_at;
  const score = calculatePriority({
    aiSeverity: complaint.ai_severity,
    upvoteCount: complaint.upvote_count,
    createdAt: complaint.created_at,
    status,
  });

  await withTransaction(async (conn) => {
    await complaintsRepo.updateStatusFields(
      complaint.id,
      {
        status,
        authorityRemarks: nextRemarks,
        afterFixImageUrl: complaint.after_fix_image_url,
        resolvedAt,
        priorityScore: score,
      },
      conn
    );

    await historyRepo.create(
      {
        complaintId: complaint.id,
        status,
        changedBy: user._id,
        remarks: nextRemarks || null,
      },
      conn
    );
  });

  const updated = await complaintsRepo.getById(complaint.id);

  res.json(
    new ApiResponse(200, mapComplaintRow(updated), "Complaint status updated successfully")
  );
});

/**
 * =====================================
 * GET ESCALATED COMPLAINTS (Admin)
 * =====================================
 */
export const getEscalations = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "admin") {
    throw new ApiError(403, "Admin access only");
  }

  const days = Number(req.query.days || 3);
  const thresholdDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await complaintsRepo.escalations(thresholdDate);

  res.json(
    new ApiResponse(
      200,
      rows.map((row) => mapComplaintRow(row)),
      "Escalated complaints fetched successfully"
    )
  );
});

/**
 * =====================================
 * AUTHORITY MANAGEMENT (Admin)
 * =====================================
 */
export const getAuthorities = asyncHandler(async (req, res) => {
  const rows = await usersRepo.listAuthoritiesWithWard();

  res.json(
    new ApiResponse(200, rows.map(mapAuthorityWithWard), "Authorities fetched successfully")
  );
});

export const createAuthority = asyncHandler(async (req, res) => {
  const { name, email, wardId } = req.body;

  if (!name || !email || !wardId) {
    throw new ApiError(400, "Name, email, and ward are required");
  }

  const existing = await usersRepo.findByEmail(email);
  if (existing) {
    throw new ApiError(400, "A user with this email already exists");
  }

  const ward = await wardsRepo.findById(wardId);
  if (!ward) {
    throw new ApiError(404, "Ward not found");
  }

  const tempPassword = crypto.randomBytes(12).toString("hex");

  const id = await usersRepo.create({
    name,
    email,
    password: await bcrypt.hash(tempPassword, 10),
    role: "authority",
    wardId: ward.id,
    isVerified: true,
    isActive: true,
    providers: ["local"],
  });

  res.json(
    new ApiResponse(
      201,
      {
        id: String(id),
        name,
        email,
        wardId: String(ward.id),
        wardName: ward.name,
        city: ward.city,
        role: "authority",
        isActive: true,
        tempPassword,
      },
      "Authority account created successfully"
    )
  );
});

export const updateAuthority = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, wardId, isActive } = req.body;

  const user = await usersRepo.findById(id);
  if (!user || user.role !== "authority") {
    throw new ApiError(404, "Authority not found");
  }

  if (wardId !== undefined && wardId !== null && wardId !== "") {
    const ward = await wardsRepo.findById(wardId);
    if (!ward) throw new ApiError(404, "Ward not found");
  }

  await usersRepo.updateAuthority(user.id, {
    name,
    wardId: wardId === undefined ? undefined : wardId || null,
    isActive,
  });

  const updated = await usersRepo.findById(user.id);

  res.json(
    new ApiResponse(
      200,
      {
        id: String(updated.id),
        name: updated.name,
        email: updated.email,
        wardId:
          updated.ward_id === null || updated.ward_id === undefined
            ? null
            : String(updated.ward_id),
        isActive: !!updated.is_active,
      },
      "Authority updated successfully"
    )
  );
});

export const deactivateAuthority = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await usersRepo.findById(id);
  if (!user || user.role !== "authority") {
    throw new ApiError(404, "Authority not found");
  }

  await usersRepo.setActive(user.id, false);

  res.json(new ApiResponse(200, null, "Authority deactivated successfully"));
});
