import jwt from 'jsonwebtoken';
import RefreshToken from '../models/RefreshToken.js';

export const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '15m', // Short lifespan: 15 minutes
  });
};

export const generateRefreshToken = async (id) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d', // Long lifespan: 7 days
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Save the refresh token to the database
  await RefreshToken.create({
    user: id,
    token,
    expiresAt,
  });

  return token;
};

export const sendRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true, // Prevent client-side JS from accessing it
    secure: process.env.NODE_ENV === 'production', // Send only over HTTPS in production
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });
};
