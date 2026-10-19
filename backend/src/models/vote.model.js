import mongoose from "mongoose";

const voteSchema = new mongoose.Schema({
    complaintId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Complaint",
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// One vote per person
voteSchema.index({complaintId:1, userId:1},{unique: true});

export default mongoose.model("Vote",voteSchema);