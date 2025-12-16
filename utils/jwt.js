import jwt from "jsonwebtoken";

export const generateToken = (id) => {
  // If JWT_EXPIRES_IN is set to the string 'never', create a token without expiration.
  // Otherwise, pass the expiresIn option if provided.
  const options = {};
  if (process.env.JWT_EXPIRES_IN && process.env.JWT_EXPIRES_IN !== 'never') {
    options.expiresIn = process.env.JWT_EXPIRES_IN;
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, Object.keys(options).length ? options : undefined);
};
