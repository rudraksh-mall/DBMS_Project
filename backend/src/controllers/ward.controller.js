import * as wardsRepo from "../repositories/wards.repo.js";
import { mapWardRow } from "../repositories/mappers.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const lookupWard = asyncHandler(async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new ApiError(400, "Valid lat and lng query parameters are required");
  }

  const ward = await wardsRepo.findByPoint(lat, lng);

  if (!ward) {
    throw new ApiError(404, "No ward found for the given location");
  }

  return res.json(
    new ApiResponse(200, mapWardRow(ward), "Ward fetched successfully")
  );
});

export const getWards = asyncHandler(async (req, res) => {
  const city = req.query.city ? String(req.query.city).trim() : null;
  const rows = await wardsRepo.listByCity(city);

  return res.json(
    new ApiResponse(200, rows.map(mapWardRow), "Wards fetched successfully")
  );
});

export const getCities = asyncHandler(async (req, res) => {
  const cities = await wardsRepo.listCities();

  return res.json(new ApiResponse(200, cities, "Cities fetched successfully"));
});
