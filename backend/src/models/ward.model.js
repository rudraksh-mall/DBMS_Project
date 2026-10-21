import mongoose from "mongoose";

const wardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    boundary: { type: mongoose.Schema.Types.Mixed, default: null },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

wardSchema.index({ boundary: "2dsphere" });

export default mongoose.model("Ward", wardSchema);
