import express from 'express';
import {
  registerUser,
  verifySignupOtp,
  resendOtp,
  authUser,
  adminRegister,
  verifyAdminSignupOtp,
  resendAdminSignupOtp,
  adminLoginSendOtp,
  adminLoginVerifyOtp,
  adminResendLoginOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  refreshAccessToken,
  logoutUser,
} from '../controllers/authController.js';

const router = express.Router();

// Customer auth (OTP-based signup)
router.post('/register', registerUser);
router.post('/verify-signup-otp', verifySignupOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', authUser);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logoutUser);

// Admin auth
router.post('/admin/register', adminRegister);
router.post('/admin/verify-signup-otp', verifyAdminSignupOtp);
router.post('/admin/resend-signup-otp', resendAdminSignupOtp);
router.post('/admin/login', adminLoginSendOtp);         // Step 1: verify creds → send OTP
router.post('/admin/verify-otp', adminLoginVerifyOtp);  // Step 2: verify OTP → get token
router.post('/admin/resend-otp', adminResendLoginOtp);  // Resend login OTP


// Password reset (shared)
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

export default router;

