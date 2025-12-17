import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { generateToken } from "../utils/jwt.js";
import validator from 'validator';

// Normalize phone numbers to a consistent storage/search format.
// Strategy (Rwanda-focused, but safe for similar formats):
// - Remove all non-digit characters
// - If number starts with '0' and has 10 digits (e.g. 0781234567), replace leading 0 with '250'
// - If number has 9 digits and starts with '7' (e.g. 781234567), prefix with '250'
// - If number already starts with '250', keep as-is
// - Return null for obviously invalid numbers (too short/long)
const normalizePhone = (raw) => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Already in international w/o + (e.g. 250781234567)
  if (digits.startsWith('250') && digits.length === 12) return digits;

  // Leading +250 (remove +)
  if (raw.trim().startsWith('+') && digits.startsWith('250') && digits.length === 12) return digits;

  // Local formats
  if (digits.length === 10 && digits.startsWith('0')) {
    return '250' + digits.slice(1);
  }

  if (digits.length === 9 && digits.startsWith('7')) {
    return '250' + digits;
  }

  // Fallback: if it's a plausible international number (11-15 digits), return digits
  if (digits.length >= 8 && digits.length <= 15) return digits;

  return null;
};

export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    // Basic validation: require name and password, and at least one identifier
    if (!name || !password) {
      return res.status(400).json({ message: "Name and password are required" });
    }

    if (!email && !phone) {
      return res.status(400).json({ message: "Provide email or phone to register" });
    }

    // If both email and phone are provided, reject the request
    if (email && phone) {
      return res.status(400).json({ message: "Please provide either email or phone, not both" });
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Email validation
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Phone normalization + validation
    let normalizedPhone = null;
    if (phone) {
      normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }
    }

    // Check if email exists
    if (email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(409).json({ message: "Email already exists" });
      }
    }

    // Check if phone exists (use normalized form)
    if (normalizedPhone) {
      const phoneExists = await User.findOne({ phone: normalizedPhone });
      if (phoneExists) {
        return res.status(409).json({ message: "Phone number already exists" });
      }
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 12);

    // Construct the new user data based on provided fields
    const newUserData = { name, password: hashedPassword };
    if (email) newUserData.email = email.toLowerCase();  // Normalize email
    if (phone) newUserData.phone = normalizedPhone;  // Use normalized phone

    // Create new user
    const user = await User.create(newUserData);

    // Return response with a token and user info
    return res.status(201).json({
      token: generateToken(user._id),
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return next(error);
  }
};




export const login = async (req, res, next) => {
  try {
    const { identifier, email, phone, password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    let query = {};

    // Prefer identifier if provided
    if (identifier) {
      if (validator.isEmail(identifier)) {
        query.email = identifier.toLowerCase();
      } else {
        // Try to normalize phone first
        const np = normalizePhone(identifier);
        if (np) query.phone = np;
        else if (validator.isMobilePhone(identifier)) query.phone = identifier.trim();
        else return res.status(400).json({ message: "Invalid email or phone" });
      }
    } 
    // Fallbacks
    else if (email) {
      if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      query.email = email.toLowerCase();
    } 
    else if (phone) {
      const np = normalizePhone(phone);
      if (!np) return res.status(400).json({ message: "Invalid phone format" });
      query.phone = np;
    } 
    else {
      return res.status(400).json({ message: "Email or phone is required" });
    }

    const user = await User.findOne(query).select("+password");

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
    // protect middleware should attach the user document to req.user
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
    if (!identifier) return res.status(400).json({ message: 'Identifier query required' });

    if (validator.isEmail(identifier)) {
      const found = await User.findOne({ email: identifier.toLowerCase() });
      return res.json({ exists: !!found, field: 'email' });
    }

    // Try normalization-first for phone identifiers
    const normalized = normalizePhone(identifier);
    if (normalized) {
      const found = await User.findOne({ phone: normalized });
      return res.json({ exists: !!found, field: 'phone' });
    }

    // Fallback: if validator considers it a mobile phone, try raw trimmed search
    if (validator.isMobilePhone(identifier)) {
      const found = await User.findOne({ phone: identifier.trim() });
      return res.json({ exists: !!found, field: 'phone' });
    }

    return res.status(400).json({ message: 'Invalid identifier' });
  } catch (error) {
    console.error('checkIdentifier error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
