import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { generateToken } from "../utils/jwt.js";
import validator from 'validator';

// Normalize phone numbers to a consistent storage/search format.
const normalizePhone = (raw) => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, ''); // Remove non-digit characters
  if (!digits) return null;

  // If it starts with '250' and has 12 digits, keep as-is
  if (digits.startsWith('250') && digits.length === 12) return digits;

  // If the phone starts with '+250', remove '+'
  if (raw.trim().startsWith('+') && digits.startsWith('250') && digits.length === 12) return digits;

  // Local formats: convert '0781234567' to '250781234567'
  if (digits.length === 10 && digits.startsWith('0')) {
    return '250' + digits.slice(1);
  }

  // Convert '781234567' to '250781234567' (for numbers starting with '7')
  if (digits.length === 9 && digits.startsWith('7')) {
    return '250' + digits;
  }

  // Return the raw number if it’s a plausible international number (8-15 digits)
  if (digits.length >= 8 && digits.length <= 15) return digits;

  return null; // Return null if it's an invalid number format
};

export const register = async (req, res, next) => {
  try {
    const { name, phone, password } = req.body;

    // Basic validation: require name, password, and phone
    if (!name || !password || !phone) {
      return res.status(400).json({ message: "Name, phone, and password are required" });
    }

    // Normalize and validate phone number
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    // Check if the phone number already exists
    const phoneExists = await User.findOne({ phone: normalizedPhone });
    if (phoneExists) {
      return res.status(409).json({ message: "Phone number already exists" });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the new user object
    const newUserData = { name, phone: normalizedPhone, password: hashedPassword };

    // Create new user
    const user = await User.create(newUserData);

    // Return response with a token and user info
    return res.status(201).json({
      token: generateToken(user._id),
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle Mongo duplicate key error (E11000) for phone
    if (error && (error.code === 11000 || (error.message && error.message.includes('E11000')))) {
      const friendlyMessage = "Phone number already exists";
      return res.status(409).json({ message: friendlyMessage });
    }

    return next(error);
  }
};




export const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password are required" });
    }

    // Normalize and validate phone number
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    // Find the user by phone number
    const user = await User.findOne({ phone: normalizedPhone }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Remove password before sending response
    user.password = undefined;

    return res.status(200).json({
      token: generateToken(user._id),
      user,
    });
  } catch (error) {
    next(error);
  }
};


export const getMe = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    res.json(req.user);
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ message: 'Failed to get user' });
  }
};

// Check if an identifier (email or phone) already exists
export const checkIdentifier = async (req, res) => {
  try {
    const { identifier } = req.query;
    if (!identifier) return res.status(400).json({ message: 'Phone number is required' });

    // Normalize and validate phone number
    const normalized = normalizePhone(identifier);
    if (!normalized) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Check if the phone number already exists
    const found = await User.findOne({ phone: normalized });
    return res.json({ exists: !!found, field: 'phone' });
  } catch (error) {
    console.error('checkIdentifier error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

