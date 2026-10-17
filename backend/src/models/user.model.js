import mongoose, { Schema } from "mongoose";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// Per-device refresh session (hashed token)
const refreshSessionSchema = new Schema({
  tokenHash: { type: String, required: true }, // hashed refresh token
  device: { type: String, default: null },
  ip: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },

    role: {
      type: String,
      enum: ["citizen", "authority", "admin"],
      default: "citizen",
    },

    wardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ward",
      default: null,
    },

    phone: {
      type: String,
      default: null,
    },

    avatar: {
      type: String,
      default: null,
    },

    otp: {
      code: String,
      expiresAt: Date,
    },
    
    // Prevent fake accounts
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Admin can disable authority accounts
    isActive: {
      type: Boolean,
      default: true,
    },

    // MULTI-DEVICE refresh token storage
    refreshSessions: {
      type: [refreshSessionSchema],
      default: [],
    },
    googleId: {
  type: String,
  default: null,
},

providers: {
  type: [String],
  enum: ["local", "google"],
  default: ["local"],
},

  },
  { timestamps: true }
);

// Hashing password before save
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password on login
userSchema.methods.isPasswordCorrect = function (password) {
  return bcrypt.compare(password, this.password);
};

// Generate access token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      role: this.role,
      wardId: this.wardId,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.addRefreshSession = async function (expiresAt, device, ip) {
  const sessionId = new mongoose.Types.ObjectId();
  const rawSecret = crypto.randomBytes(40).toString("hex");
  const tokenHash = await bcrypt.hash(rawSecret, 10);

  this.refreshSessions.push({
    _id: sessionId,
    tokenHash,
    expiresAt,
    device,
    ip,
  });

  await this.save();

  // The client receives "<sessionId>.<secret>" so it can be looked up in O(1).
  return `${sessionId.toString()}.${rawSecret}`;
};

export const User = mongoose.model("User", userSchema);
