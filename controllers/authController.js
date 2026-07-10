import User from '../models/User.js';
import OTP from '../models/OTP.js';
import jwt from 'jsonwebtoken';
import RefreshToken from '../models/RefreshToken.js';
import { generateAccessToken, generateRefreshToken, sendRefreshTokenCookie } from '../utils/tokenUtils.js';
import { generateResetToken, verifyResetToken } from '../utils/generateResetToken.js';
import { sendOtpEmail } from '../utils/sendEmail.js';

const sendAuthResponse = async (user, res, statusCode = 200, extraData = {}) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = await generateRefreshToken(user._id);
  sendRefreshTokenCookie(res, refreshToken);

  res.status(statusCode).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    token: accessToken,
    ...extraData,
  });
};
import {
  saveSignupOtp,
  saveResetOtp,
  verifyOtp,
  deleteOtp,
  getResendCooldown,
  getOtpResendTime,
} from '../utils/otpHelper.js';

// @desc    Register - send OTP for email verification
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please provide name, email, and password');
    }

    if (password.length < 8) {
      res.status(400);
      throw new Error('Password must be at least 8 characters');
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error('An account with this email already exists');
    }

    const otp = await saveSignupOtp({ email, name, password });
    await sendOtpEmail({ to: email, otp, purpose: 'signup' });

    res.status(201).json({
      message: 'OTP sent to your email',
      email,
      resendTime: getOtpResendTime(),
    });
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
      return res.json({
        message: error.message,
        cooldown: error.cooldown,
      });
    }
    next(error);
  }
};

// @desc    Verify signup OTP and create account
// @route   POST /api/auth/verify-signup-otp
// @access  Public
const verifySignupOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400);
      throw new Error('Please provide email and OTP');
    }

    const record = await verifyOtp({ email, otp, purpose: 'signup' });

    const userExists = await User.findOne({ email });
    if (userExists) {
      await deleteOtp(record);
      res.status(400);
      throw new Error('An account with this email already exists');
    }

    const user = await User.create({
      name: record.name,
      email: record.email,
      password: record.password,
      isVerified: true,
    });

    await deleteOtp(record);

    await sendAuthResponse(user, res, 201);
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
      return res.json({ message: error.message });
    }
    next(error);
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOtp = async (req, res, next) => {
  try {
    const { email, purpose } = req.body;

    if (!email || !purpose) {
      res.status(400);
      throw new Error('Please provide email and purpose');
    }

    if (!['signup', 'reset'].includes(purpose)) {
      res.status(400);
      throw new Error('Invalid OTP purpose');
    }

    if (purpose === 'signup') {
      const existing = await OTP.findOne({ email, purpose: 'signup' });

      if (!existing) {
        res.status(400);
        throw new Error('No pending signup found for this email');
      }

      const otp = await saveSignupOtp({
        email,
        name: existing.name,
        password: existing.password,
      });
      await sendOtpEmail({ to: email, otp, purpose: 'signup' });
    } else {
      const user = await User.findOne({ email });
      if (!user) {
        res.status(404);
        throw new Error('No account found with this email');
      }

      const otp = await saveResetOtp(email);
      await sendOtpEmail({ to: email, otp, purpose: 'reset' });
    }

    res.json({
      message: 'OTP resent successfully',
      resendTime: getOtpResendTime(),
    });
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
      return res.json({
        message: error.message,
        cooldown: error.cooldown,
      });
    }
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && user.isVerified === false) {
      res.status(401);
      throw new Error('Please verify your email before logging in');
    }

    if (user && (await user.matchPassword(password))) {
      await sendAuthResponse(user, res, 200);
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new admin account (direct, no OTP)
// @route   POST /api/auth/admin/register
// @access  Public (optionally gated by ADMIN_SIGNUP_SECRET)
const adminRegister = async (req, res, next) => {
  try {
    const { name, email, password, secret } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please provide name, email, and password');
    }

    if (password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters');
    }

    // Optional protection: if ADMIN_SIGNUP_SECRET is set, require it.
    const requiredSecret = process.env.ADMIN_SIGNUP_SECRET;
    if (requiredSecret && secret !== requiredSecret) {
      res.status(403);
      throw new Error('Invalid admin signup secret');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('An account with this email already exists');
    }

    const user = await User.create({
      name,
      email,
      password,
      isAdmin: true,
      isVerified: true,
    });

    await sendAuthResponse(user, res, 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Admin login & get token
// @route   POST /api/auth/admin/login
// @access  Public
const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      if (!user.isAdmin) {
        res.status(403);
        throw new Error('This account does not have admin privileges');
      }

      await sendAuthResponse(user, res, 200);
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Send password reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error('Please provide your email');
    }

    const user = await User.findOne({ email });

    if (!user) {
      res.status(404);
      throw new Error('No account found with this email');
    }

    const otp = await saveResetOtp(email);
    await sendOtpEmail({ to: email, otp, purpose: 'reset' });

    res.json({
      message: 'OTP sent to your email',
      email,
      resendTime: getOtpResendTime(),
    });
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
      return res.json({
        message: error.message,
        cooldown: error.cooldown,
      });
    }
    next(error);
  }
};

// @desc    Verify reset OTP and issue reset token
// @route   POST /api/auth/verify-reset-otp
// @access  Public
const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400);
      throw new Error('Please provide email and OTP');
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error('No account found with this email');
    }

    const record = await verifyOtp({ email, otp, purpose: 'reset' });
    const resetToken = generateResetToken(email);
    await deleteOtp(record);

    res.json({
      message: 'OTP verified successfully',
      resetToken,
      email,
    });
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
      return res.json({ message: error.message });
    }
    next(error);
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const resetToken = req.body.resetToken || req.body.token;

    if (!resetToken || !password) {
      res.status(400);
      throw new Error('Please provide reset token and new password');
    }

    if (password.length < 8) {
      res.status(400);
      throw new Error('Password must be at least 8 characters');
    }

    let decoded;
    try {
      decoded = verifyResetToken(resetToken);
    } catch {
      res.status(400);
      throw new Error('Reset token is invalid or has expired');
    }

    if (decoded.purpose !== 'password-reset') {
      res.status(400);
      throw new Error('Invalid reset token');
    }

    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    user.password = password;
    await user.save();

    await sendAuthResponse(user, res, 200, { message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.status(401);
      throw new Error('Not authorized, no refresh token');
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      res.status(401);
      throw new Error('Not authorized, token expired or invalid');
    }

    const tokenExists = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenExists) {
      res.status(401);
      throw new Error('Not authorized, token not recognized');
    }

    const newAccessToken = generateAccessToken(decoded.id);
    res.json({ token: newAccessToken });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user & clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export {
  registerUser,
  verifySignupOtp,
  resendOtp,
  authUser,
  adminRegister,
  adminLogin,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  refreshAccessToken,
  logoutUser,
};
