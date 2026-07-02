import express from 'express';
import {
  registerUser,
  verifySignupOtp,
  resendOtp,
  authUser,
  adminRegister,
  adminLogin,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from '../controllers/authController.js';

const router = express.Router();

// Customer auth (OTP-based signup)
router.post('/register', registerUser);
router.post('/verify-signup-otp', verifySignupOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', authUser);

// Admin auth (direct, no OTP)
router.post('/admin/register', adminRegister);
router.post('/admin/login', adminLogin);

// Password reset (shared)
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

export default router;
