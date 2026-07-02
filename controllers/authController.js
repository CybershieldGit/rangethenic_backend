import User from '../models/User.js';
import OTP from '../models/OTP.js';
import generateToken from '../utils/generateToken.js';
import { generateResetToken, verifyResetToken } from '../utils/generateResetToken.js';
import { sendOtpEmail } from '../utils/sendEmail.js';
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

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
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
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken(user._id),
      });
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
    const { resetToken, password } = req.body;

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

    res.json({
      message: 'Password reset successfully',
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

export {
  registerUser,
  verifySignupOtp,
  resendOtp,
  authUser,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};
