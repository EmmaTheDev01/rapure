import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { generateToken } from "../utils/jwt.js";

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

    if (!email && !phone) {
      return res.status(400).json({ message: "Email or Phone is required" });
    }

    // Prepare normalized values once
    const normalizedEmail = email ? email.toLowerCase() : undefined;
    const normalizedPhone = phone ? normalizePhone(phone) : undefined;

    // Build query based on which one was provided
    let query = {};
    if (normalizedEmail) query.email = normalizedEmail;
    else if (normalizedPhone) query.phone = normalizedPhone;
    else return res.status(400).json({ message: "Invalid email or phone format" });

    const exists = await User.findOne(query);
    if (exists) {
      const type = email ? "Email" : "Phone number";
      return res.status(409).json({ message: `${type} already exists` });
    }

    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);

    // Create user with the ALREADY normalized values
    const user = await User.create({
      name,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashed,
    });

    // Verify generateToken exists and works
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileComplete: user.profileComplete || false,
      },
    });
  } catch (error) {
    // This will now show up in your Render Logs with more detail
    console.error("FULL Registration Error Detail:", error);
    res.status(500).json({ 
      message: "Server error during registration",
      error: error.message // Temporarily send this to see the error in the frontend console
    });
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

    // FIX: Check if loginId is email or phone. 
    // If phone, we must normalize it to find the record in DB.
    if (typeof loginId === 'string' && loginId.includes('@')) {
      query.email = loginId.toLowerCase();
    } else {
      const normalized = normalizePhone(loginId);
      if (!normalized) return res.status(400).json({ message: "Invalid phone format" });
      query.phone = normalized;
    }

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
        email: user.email,
        phone: user.phone,
        profileComplete: user.profileComplete || false
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

export const checkIdentifier = async (req, res) => {
  try {
    const { identifier } = req.query;
    if (!identifier) return res.status(400).json({ message: "No identifier provided" });

    const normalized = identifier.includes('@') ? identifier.toLowerCase() : normalizePhone(identifier);
    
    // Using $or ensures if they check an email it looks in email field, 
    // and if they check a phone it looks in phone field.
    const exists = await User.findOne({
      $or: [{ email: normalized }, { phone: normalized }]
    });

    res.json({ exists: !!exists });
  } catch (error) {
    res.status(500).json({ message: "Check failed" });
  }
};

export const getMe = async (req, res) => {
  // If your middleware attaches the user, just return it.
  // Note: Ensure your 'protect' middleware doesn't include the password!
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  res.json(req.user);
};