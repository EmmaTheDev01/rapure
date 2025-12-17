import mongoose from "mongoose";
import validator from "validator"; // To validate email and phone formats

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    
    // Email is required only when phone is not provided.
    email: {
      type: String,
      unique: true,
      sparse: true,
      required: function () {
        // `this` is the mongoose document. Email required if phone is falsy.
        return !this.phone;
      },
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          // Allow empty/null when phone exists; otherwise ensure valid email
          if (!v) return true;
          return validator.isEmail(String(v));
        },
        message: 'Invalid email format',
      },
    },

    // Phone is required only when email is not provided. Unique when present.
    phone: {
      type: String,
      unique: true,
      sparse: true,
      required: function () {
        return !this.email;
      },
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          // Use 'any' locale so numbers like +250... validate; adjust if you want specific locale
          return validator.isMobilePhone(String(v), 'any');
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

// Compound index for email and phone to speed up login queries
userSchema.index({ email: 1, phone: 1 });

export default mongoose.model("User", userSchema);
