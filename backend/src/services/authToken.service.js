import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import * as tokensRepo from "../repositories/tokens.repo.js";

export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Access token payload matches the previous design but carries the numeric
 * primary key instead of an ObjectId. `wardId` remains part of the token so
 * authorization does not require a database read.
 *
 * Accepts either an API-shaped object (`id`/`wardId`) or a raw MySQL row
 * (`id`/`ward_id`).
 */
export function signAccessToken(user) {
  const id = user.id ?? user._id;
  const rawWardId = user.wardId ?? user.ward_id ?? null;
  return jwt.sign(
    {
      _id: Number(id),
      role: user.role,
      wardId:
        rawWardId === null || rawWardId === undefined ? null : Number(rawWardId),
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Create a hashed, per-device refresh session and return the public
 * "<sessionId>.<secret>" token (identical scheme to the previous version).
 */
export async function issueRefreshToken(userId, { device, ip } = {}, conn) {
  const sessionId = crypto.randomUUID();
  const secret = crypto.randomBytes(40).toString("hex");
  const tokenHash = await bcrypt.hash(secret, 10);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await tokensRepo.create(
    {
      id: sessionId,
      userId,
      tokenHash,
      device: device || null,
      ip: ip || null,
      expiresAt,
    },
    conn
  );

  return `${sessionId}.${secret}`;
}

export function parseRefreshToken(raw) {
  const [sessionId, secret] = String(raw || "").split(".");
  if (!sessionId || !secret) return null;
  return { sessionId, secret };
}

export async function hashSecret(secret) {
  return bcrypt.hash(secret, 10);
}

export async function secretsMatch(secret, tokenHash) {
  return bcrypt.compare(secret, tokenHash);
}

export function refreshExpiry() {
  return new Date(Date.now() + REFRESH_TTL_MS);
}
