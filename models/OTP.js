import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // Expires in 10 minutes (600 seconds)
    },
  },
  {
    timestamps: true,
  }
);

// Add index on email for quick lookups
otpSchema.index({ email: 1 });

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
