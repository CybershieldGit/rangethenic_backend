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
    purpose: {
      type: String,
      enum: ['signup', 'reset'],
      required: true,
    },
    name: {
      type: String,
      default: '',
    },
    password: {
      type: String,
      default: '',
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

otpSchema.index({ email: 1, purpose: 1 });
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
