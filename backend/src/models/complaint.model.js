import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
      // FIX: Provides a default placeholder if an image fails to upload
      default:
        "https://via.placeholder.com/800x450?text=Evidence+Image+Pending",
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    wardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ward",
      required: true,
    },

    /* AI Analysis Fields */
    aiCategory: {
      type: String,
      enum: ["garbage", "road", "drainage", "lighting", "water", "traffic", "infrastructure", "obstruction", "other"],
      default: "other",
    },

    aiSeverity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    aiKeywords: [String],

    aiConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },

    aiRejectionReason: {
      type: String,
      default: null,
    },

    aiStatus: {
        type: String,
        enum: ["ai","fallback"],
        default: "ai",
    },

    /* for prioity */

    /* Priority & Community Engagement */
    priorityScore: {
      type: Number,
      default: 0,
      index: true, // Optimized for sorting the discovery feed
    },

    upvoteCount: {
      type: Number,
      default: 0,
    },

    /* Workflow Status */
    status: {
      type: String,
      enum: ["submitted", "acknowledged", "in_progress", "resolved"],
      default: "submitted",
    },

    authorityRemarks: {
      type: String,
      trim: true,
    },

    afterFixImageUrl: {
      type: String,
    },

    resolvedAt: {
      type: Date,
    },
  },
  {
    // FIX: Automatically handles createdAt and updatedAt to prevent RangeErrors
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Virtual field to help the frontend track if the user has upvoted.
 * This is populated dynamically by the controller.
 */
complaintSchema.virtual("hasUpvoted").get(function () {
  return this._hasUpvoted || false;
});

complaintSchema.virtual("hasUpvoted").set(function (val) {
  this._hasUpvoted = val;
});

export default mongoose.model("Complaint", complaintSchema);