import crypto from 'crypto';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, isAdmin } = req.body;

    const normalizedEmail = email ? email.toLowerCase().trim() : '';
    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      name,
      email,
      password,
      isAdmin: isAdmin || false,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email ? email.toLowerCase().trim() : '';
    const user = await User.findOne({ email: normalizedEmail });

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

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email, isAdmin } = req.body;

    if (!email) {
      res.status(400);
      throw new Error('Please provide an email address');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const targetIsAdmin = isAdmin === true || isAdmin === 'true';
    const query = {
      email: normalizedEmail,
      isAdmin: targetIsAdmin ? true : { $ne: true }
    };

    const user = await User.findOne(query);

    if (!user) {
      res.status(404);
      if (targetIsAdmin) {
        throw new Error('No admin account found with that email address');
      } else {
        throw new Error('No user account found with that email address');
      }
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set expiry (1 hour)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    // Create reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = targetIsAdmin
      ? `${frontendUrl}/admin/reset-password?token=${resetToken}`
      : `${frontendUrl}/reset-password/${resetToken}`;

    const message = `
      You are receiving this email because you (or someone else) have requested the reset of a password.
      Please click on the following link, or paste this into your browser to complete the process:

      ${resetUrl}

      If you did not request this, please ignore this email and your password will remain unchanged.
    `;

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dcd4cb; border-radius: 8px;">
        <h2 style="color: #2b2622; font-family: serif; border-bottom: 1px solid #dcd4cb; padding-bottom: 10px;">Password Reset Request</h2>
        <p style="color: #6f6a65; font-size: 14px; line-height: 1.6;">
          You are receiving this email because a password reset request was made for your RakaRituals ${targetIsAdmin ? 'Admin' : 'Customer'} account.
        </p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetUrl}" style="background-color: #b89b5e; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #6f6a65; font-size: 12px; line-height: 1.6;">
          If the button above does not work, copy and paste the following URL into your web browser:
        </p>
        <p style="color: #b89b5e; font-size: 12px; word-break: break-all;">
          ${resetUrl}
        </p>
        <p style="color: #6f6a65; font-size: 12px; border-top: 1px solid #dcd4cb; padding-top: 15px; margin-top: 20px; font-style: italic;">
          If you did not request this reset, please ignore this email. The link will expire in 1 hour.
        </p>
      </div>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: 'RakaRituals Admin - Password Reset Request',
        text: message,
        html: htmlMessage,
      });

      res.status(200).json({ success: true, message: 'Password reset link sent to email' });
    } catch (err) {
      console.error('Error sending reset email:', err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.status(500);
      throw new Error('Email could not be sent');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400);
      throw new Error('Please provide token and new password');
    }

    if (password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters long');
    }

    // Hash the incoming token to compare with DB hashed token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400);
      throw new Error('Invalid or expired password reset token');
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

export { registerUser, authUser, forgotPassword, resetPassword };
