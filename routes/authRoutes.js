import express from 'express';
import {
  registerUser,
  verifySignupOtp,
  resendOtp,
  authUser,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify-signup-otp', verifySignupOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', authUser);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

export default router;
