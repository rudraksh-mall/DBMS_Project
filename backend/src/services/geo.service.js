import * as complaintsRepo from "../repositories/complaints.repo.js";

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export async function findNearbyComplaints({
  lat,
  lng,
  radiusKm = 5,
  category = null,
  limit = 20,
} = {}) {
  const rows = category
    ? await complaintsRepo.activeByCategory(category)
    : await complaintsRepo.allWithCoordinates();

  return rows
    .map((row) => ({
      ...row,
      distanceKm: haversineDistanceKm(
        lat,
        lng,
        Number(row.lat),
        Number(row.lng)
      ),
    }))
    .filter((row) => row.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export async function isDuplicateComplaint({
  lat,
  lng,
  category,
  radiusKm = 0.1,
} = {}) {
  const nearby = await findNearbyComplaints({
    lat,
    lng,
    radiusKm,
    category,
    limit: 1,
  });
  return nearby.length > 0;
}
