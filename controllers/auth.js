import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { generateToken } from "../utils/jwt.js";

// Helper to normalize phone numbers (Matches your frontend logic)
const normalizePhone = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) return '250' + digits.slice(1);
  if (digits.length === 9 && digits.startsWith('7')) return '250' + digits;
  return digits;
};

export const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // 1. Normalize identifier
    const normalizedPhone = normalizePhone(phone);

    // 2. Check Uniqueness (Using 409 Conflict as your frontend expects)
    if (email) {
      const exists = await User.findOne({ email });
      if (exists) return res.status(409).json({ message: "Email already exists" });
    }
    
    if (normalizedPhone) {
      const existsPhone = await User.findOne({ phone: normalizedPhone });
      if (existsPhone) return res.status(409).json({ message: "Phone number already registered" });
    }

    // 3. Hash and Create
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);
    
    const user = await User.create({ 
      name, 
      email, 
      phone: normalizedPhone, 
      password: hashed 
    });

    // 4. Response (frontend expects token and user)
    res.status(201).json({
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        profileComplete: user.profileComplete || false
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during registration" });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, email, phone, password } = req.body;

    let query = {};
    const loginId = identifier || email || phone;

    if (!loginId) {
      return res.status(400).json({ message: 'Email or phone is required' });
    }

    // logic to determine if identifier is email or phone
    if (loginId.includes('@')) {
      query.email = loginId.toLowerCase();
    } else {
      query.phone = normalizePhone(loginId);
    }

    // Find user and explicitly include password
    const user = await User.findOne(query).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        profileComplete: user.profileComplete || false
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during login" });
  }
};

export const getMe = async (req, res) => {
  // Assumes your 'protect' middleware finds the user and attaches it to req.user
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  res.json(req.user);
};