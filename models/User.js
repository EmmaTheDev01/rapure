import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { 
    type: String, 
    unique: true, 
    sparse: true, 
    lowercase: true,
    trim: true 
  },
  phone: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  password: { type: String, required: true, select: false },
  profileComplete: { type: Boolean, default: false },
  username: { type: String, unique: true, sparse: true },
  bio: String,
  avatar: String
}, { timestamps: true });

export default mongoose.model('User', userSchema);