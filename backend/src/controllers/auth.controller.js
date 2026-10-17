import crypto from "crypto";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";

import * as usersRepo from "../repositories/users.repo.js";
import * as tokensRepo from "../repositories/tokens.repo.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateOTP } from "../utils/generateOtp.js";
import { sendEmail } from "../utils/sendEmail.js";
import { mapUserRow } from "../repositories/mappers.js";
import {
  issueRefreshToken,
  parseRefreshToken,
  secretsMatch,
  signAccessToken,
  hashSecret,
  refreshExpiry,
} from "../services/authToken.service.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authUser = (row) => ({
  _id: String(row.id),
  id: String(row.id),
  name: row.name,
  email: row.email,
  role: row.role,
  wardId: row.ward_id === null || row.ward_id === undefined ? null : String(row.ward_id),
});

export const googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    throw new ApiError(400, "Google credential missing");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { email, name, picture, sub: googleId, email_verified } = payload;

  if (!email_verified) {
    throw new ApiError(400, "Google email not verified");
  }

  let user = await usersRepo.findByEmail(email);
  let isNewUser = false;

  if (user && !user.is_active) {
    throw new ApiError(403, "Account has been deactivated. Contact administrator.");
  }

  if (user && user.role === "admin") {
    throw new ApiError(403, "Admin accounts must sign in using email and password.");
  }

  if (user) {
    const providers = Array.isArray(user.providers)
      ? user.providers
      : JSON.parse(user.providers || '["local"]');

    if (!providers.includes("google")) {
      const merged = [...providers, "google"];
      await usersRepo.linkGoogle(user.id, {
        googleId,
        avatar: user.avatar || picture,
        providers: merged,
      });
      user = await usersRepo.findById(user.id);
    }
  } else {
    const id = await usersRepo.create({
      name,
      email,
      avatar: picture,
      googleId,
      role: "citizen",
      wardId: null,
      isVerified: true,
      providers: ["google"],
      password: await bcrypt.hash(crypto.randomBytes(20).toString("hex"), 10),
    });
    user = await usersRepo.findById(id);
    isNewUser = true;
  }

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id, {
    device: req.headers["user-agent"],
    ip: req.ip,
  });

  return res.json(
    new ApiResponse(
      200,
      {
        user: authUser(user),
        accessToken,
        refreshToken,
        isNewUser,
      },
      isNewUser ? "Account created successfully" : "Welcome back"
    )
  );
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password)
    throw new ApiError(400, "Name, email & password are required");

  if (role === "authority") {
    throw new ApiError(
      403,
      "Authority accounts are created by administrators. Please contact your municipal corporation."
    );
  }

  if (role !== "citizen") {
    throw new ApiError(400, "Invalid role");
  }

  let user = await usersRepo.findByEmail(email);

  if (user && user.is_verified) throw new ApiError(400, "Email already registered");

  const otp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  if (!user) {
    await usersRepo.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: "citizen",
      wardId: null,
      isVerified: false,
      providers: ["local"],
      otpCode: otp,
      otpExpiresAt,
    });
  } else {
    await usersRepo.updateOtp(user.id, otp, otpExpiresAt);
  }

  await sendEmail(
    email,
    "Civicfix – Email Verification OTP",
    `<h2>Your OTP is: <b>${otp}</b></h2>`
  );

  return res.json(
    new ApiResponse(200, { email, role: "citizen" }, "OTP sent to email")
  );
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await usersRepo.findByEmail(email);
  if (!user) throw new ApiError(404, "User not found");

  if (!user.otp_code) throw new ApiError(400, "No OTP generated");
  if (user.otp_expires_at && new Date(user.otp_expires_at) < new Date())
    throw new ApiError(400, "OTP expired");
  if (user.otp_code !== otp) throw new ApiError(400, "Invalid OTP");

  await usersRepo.markVerified(user.id);

  return res.json(
    new ApiResponse(
      200,
      { user: { id: String(user.id), email: user.email, role: user.role } },
      "Email verified successfully"
    )
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) throw new ApiError(400, "Email & password required");

  const user = await usersRepo.findByEmail(email);
  if (!user) throw new ApiError(400, "Invalid credentials");
  if (!user.is_verified) throw new ApiError(401, "Please verify your email first");
  if (!user.is_active)
    throw new ApiError(403, "Account has been deactivated. Contact administrator.");

  const providers = Array.isArray(user.providers)
    ? user.providers
    : JSON.parse(user.providers || '["local"]');
  if (!providers.includes("local"))
    throw new ApiError(400, "This account uses Google login. Please sign in with Google.");

  const isMatch = await secretsMatch(password, user.password);
  if (!isMatch) throw new ApiError(400, "Invalid credentials");

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id, {
    device: req.headers["user-agent"],
    ip: req.ip,
  });

  return res.json(
    new ApiResponse(
      200,
      { user: authUser(user), accessToken, refreshToken },
      "Logged in successfully"
    )
  );
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await usersRepo.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  return res.json(
    new ApiResponse(200, mapUserRow(user), "User fetched successfully")
  );
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) throw new ApiError(401, "Refresh token required");

  const parsed = parseRefreshToken(refreshToken);
  if (!parsed) throw new ApiError(401, "Invalid refresh token");

  const session = await tokensRepo.findById(parsed.sessionId);
  if (!session) throw new ApiError(401, "Invalid refresh token");

  const user = await usersRepo.findById(session.user_id);
  if (!user) throw new ApiError(401, "Invalid refresh token");

  if (!user.is_active)
    throw new ApiError(403, "Account has been deactivated. Contact administrator.");

  const match = await secretsMatch(parsed.secret, session.token_hash);
  if (!match) throw new ApiError(401, "Invalid refresh token");

  if (new Date(session.expires_at) < new Date()) {
    await tokensRepo.remove(session.id);
    throw new ApiError(401, "Refresh token expired");
  }

  const newSecret = crypto.randomBytes(40).toString("hex");
  await tokensRepo.rotate(session.id, {
    tokenHash: await hashSecret(newSecret),
    expiresAt: refreshExpiry(),
  });

  const accessToken = signAccessToken(user);
  const newRefreshToken = `${session.id}.${newSecret}`;

  return res.json(
    new ApiResponse(
      200,
      { accessToken, refreshToken: newRefreshToken },
      "Access token refreshed"
    )
  );
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) throw new ApiError(400, "Refresh token required");

  const parsed = parseRefreshToken(refreshToken);

  if (parsed) {
    const session = await tokensRepo.findById(parsed.sessionId);
    if (
      session &&
      Number(session.user_id) === Number(req.user._id) &&
      (await secretsMatch(parsed.secret, session.token_hash))
    ) {
      await tokensRepo.remove(session.id);
    }
  }

  return res.json(new ApiResponse(200, null, "Logged out successfully"));
});
