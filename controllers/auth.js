import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { generateToken } from "../utils/jwt.js";
import validator from 'validator';

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

    // Password strength validation (you can customize this)
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Email validation
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Phone validation (simple check, can be expanded for international formats)
    if (phone && !validator.isMobilePhone(phone)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    // Check if email or phone already exists, but only if provided
    if (email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });  // Normalize email to lowercase
      if (emailExists) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    if (phone) {
      const phoneExists = await User.findOne({ phone: phone.trim() });  // Normalize phone (e.g., trim spaces)
      if (phoneExists) {
        return res.status(400).json({ message: "Phone number already exists" });
      }
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 12);

    // Construct the new user data based on provided fields
    const newUserData = { name, password: hashedPassword };
    if (email) newUserData.email = email.toLowerCase();  // Normalize email
    if (phone) newUserData.phone = phone.trim();  // Normalize phone

    // Create new user
    const user = await User.create(newUserData);

    // Return response with a token and user info
    return res.status(201).json({
      token: generateToken(user._id),
      user,
    });
  } catch (error) {
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
      } else if (validator.isMobilePhone(identifier)) {
        query.phone = identifier.trim();
      } else {
        return res.status(400).json({ message: "Invalid email or phone" });
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
      if (!validator.isMobilePhone(phone)) {
        return res.status(400).json({ message: "Invalid phone format" });
      }
      query.phone = phone.trim();
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
