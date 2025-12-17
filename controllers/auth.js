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
    const { name, email, phone, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: "Name and password are required" });
    }

    if (!email && !phone) {
      return res.status(400).json({ message: "Provide email or phone to register" });
    }

    // Ensure that both email and phone are not provided at the same time
    if (email && phone) {
      return res.status(400).json({ message: "Please provide either email or phone, not both" });
    }

    // Normalize phone number if provided
    let normalizedPhone = null;
    if (phone) {
      normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }
    }

    // Check for email existence if email is provided
    if (email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(409).json({ message: "Email already exists" });
      }
    }

    // Check for phone existence if phone is provided
    if (normalizedPhone) {
      const phoneExists = await User.findOne({ phone: normalizedPhone });
      if (phoneExists) {
        return res.status(409).json({ message: "Phone number already exists" });
      }
    }

    // Proceed with creating the user if no conflicts
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUserData = { name, password: hashedPassword };
    if (email) newUserData.email = email.toLowerCase(); // Only set email if provided
    if (normalizedPhone) newUserData.phone = normalizedPhone; // Use normalized phone number

    const user = await User.create(newUserData);

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

    // Prefer identifier if provided (email or phone)
    if (identifier) {
      if (validator.isEmail(identifier)) {
        query.email = identifier.toLowerCase();
      } else {
        const normalizedPhone = normalizePhone(identifier);
        if (normalizedPhone) {
          query.phone = normalizedPhone;
        } else if (validator.isMobilePhone(identifier)) {
          query.phone = identifier.trim();
        } else {
          return res.status(400).json({ message: "Invalid email or phone" });
        }
      }
    } else if (email) {
      if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      query.email = email.toLowerCase();
    } else if (phone) {
      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) return res.status(400).json({ message: "Invalid phone format" });
      query.phone = normalizedPhone;
    } else {
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

    // Normalize the phone number first for checking
    const normalized = normalizePhone(identifier);
    if (normalized) {
      const found = await User.findOne({ phone: normalized });
      return res.json({ exists: !!found, field: 'phone' });
    }

    // Fallback: if the validator considers it a mobile phone, try raw trimmed search
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
