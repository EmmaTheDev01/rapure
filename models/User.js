import mongoose from "mongoose";
import validator from "validator"; // To validate phone formats

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    
    // Phone is now required and unique
    phone: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return validator.isMobilePhone(String(v), 'any'); // Use 'any' for international support
        },
        message: 'Invalid phone number format',
      },
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

// Create an index on phone to enforce uniqueness at the database level
userSchema.index({ phone: 1 }, { unique: true });

export default mongoose.model("User", userSchema);
