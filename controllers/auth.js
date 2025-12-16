import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { generateToken } from "../utils/jwt.js";

export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    // Basic validation: require name and password and at least one identifier
    if (!name || !password) return res.status(400).json({ message: "Name and password are required" });
    if (!email && !phone) return res.status(400).json({ message: "Provide email or phone to register" });

    // Check uniqueness for email or phone if provided
    if (email) {
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ message: "Email already exists" });
    }
    if (phone) {
      const existsPhone = await User.findOne({ phone });
      if (existsPhone) return res.status(400).json({ message: "Phone already exists" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, phone, password: hashed });

    return res.json({
      token: generateToken(user._id),
      user,
    });
  } catch (error) {
    // Forward to global error handler to ensure consistent responses and CORS headers
    return next(error);
  }
};

export const login = async (req, res, next) => {
  // Accept either `identifier` (email or phone) or `email`/`phone` explicitly
  try {
    const { identifier, email, phone, password } = req.body;

    let query = {};
    if (identifier) {
      if (identifier.includes("@")) query.email = identifier;
      else query.phone = identifier;
    } else if (email) query.email = email;
    else if (phone) query.phone = phone;

    if (!Object.keys(query).length) return res.status(400).json({ message: "Missing login identifier" });

    const user = await User.findOne(query).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    return res.json({
      token: generateToken(user._id),
      user,
    });
  } catch (error) {
    return next(error);
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
