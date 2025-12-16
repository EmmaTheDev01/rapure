import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // Email is optional to allow phone-only registration flows.
    email: { type: String, unique: true, required: false },
    // Phone is optional but unique when present.
    phone: { type: String, unique: true, sparse: true },
    password: { type: String, required: true, select: false },
    avatar: { type: String },
    bio: { type: String },
    profileComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
