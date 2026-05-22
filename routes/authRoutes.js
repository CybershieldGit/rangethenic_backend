import express from 'express';
import { registerUser, authUser, forgotPassword, resetPassword, sendOTP } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/send-otp', sendOTP);

export default router;
