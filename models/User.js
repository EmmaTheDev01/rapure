import mongoose from "mongoose";
import validator from "validator"; // To validate email and phone formats

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    
    // Email is optional to allow phone-only registration flows.
    email: { 
      type: String, 
      unique: true, 
      sparse: true, 
      required: false, 
      validate: [validator.isEmail, "Invalid email format"]
    },
    
    // Phone is optional but unique when present.
    phone: { 
      type: String, 
      unique: true, 
      sparse: true, 
      required: false, 
      validate: [validator.isMobilePhone, "Invalid phone number format"]
    },
    
    password: { 
      type: String, 
      required: true, 
      select: false 
    },
    
    avatar: { 
      type: String 
    },
    
    bio: { 
      type: String 
    },
    
    profileComplete: { 
      type: Boolean, 
      default: false 
    },
  },
  { timestamps: true }
);

// Compound index for email and phone to speed up login queries
userSchema.index({ email: 1, phone: 1 });

export default mongoose.model("User", userSchema);
