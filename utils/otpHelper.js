import OTP from '../models/OTP.js';

const getOtpLength = () => parseInt(process.env.OTP_LENGTH, 10) || 6;
const getOtpExpiresIn = () => parseInt(process.env.OTP_EXPIRES_IN, 10) || 300;
const getOtpResendTime = () => parseInt(process.env.OTP_RESEND_TIME, 10) || 60;

const generateOtpCode = () => {
  const length = getOtpLength();
  const max = 10 ** length;
  const min = 10 ** (length - 1);
  return String(Math.floor(min + Math.random() * (max - min)));
};

const canResendOtp = (lastSentAt) => {
  if (!lastSentAt) return true;
  const elapsed = (Date.now() - new Date(lastSentAt).getTime()) / 1000;
  return elapsed >= getOtpResendTime();
};

const getResendCooldown = (lastSentAt) => {
  if (!lastSentAt) return 0;
  const elapsed = (Date.now() - new Date(lastSentAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(getOtpResendTime() - elapsed));
};

const saveSignupOtp = async ({ email, name, password }) => {
  const existing = await OTP.findOne({ email, purpose: 'signup' });

  if (existing && !canResendOtp(existing.lastSentAt)) {
    const error = new Error('Please wait before requesting another OTP');
    error.statusCode = 429;
    error.cooldown = getResendCooldown(existing.lastSentAt);
    throw error;
  }

  const otp = generateOtpCode();

  await OTP.findOneAndUpdate(
    { email, purpose: 'signup' },
    {
      email,
      purpose: 'signup',
      otp,
      name,
      password,
      lastSentAt: new Date(),
      createdAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return otp;
};

const saveResetOtp = async (email) => {
  const existing = await OTP.findOne({ email, purpose: 'reset' });

  if (existing && !canResendOtp(existing.lastSentAt)) {
    const error = new Error('Please wait before requesting another OTP');
    error.statusCode = 429;
    error.cooldown = getResendCooldown(existing.lastSentAt);
    throw error;
  }

  const otp = generateOtpCode();

  await OTP.findOneAndUpdate(
    { email, purpose: 'reset' },
    {
      email,
      purpose: 'reset',
      otp,
      lastSentAt: new Date(),
      createdAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return otp;
};

const verifyOtp = async ({ email, otp, purpose }) => {
  const record = await OTP.findOne({ email, purpose, otp });

  if (!record) {
    const error = new Error('Invalid OTP');
    error.statusCode = 400;
    throw error;
  }

  const expiresAt = new Date(record.createdAt).getTime() + getOtpExpiresIn() * 1000;
  if (Date.now() > expiresAt) {
    await OTP.deleteOne({ _id: record._id });
    const error = new Error('OTP has expired. Please request a new one.');
    error.statusCode = 400;
    throw error;
  }

  return record;
};

const deleteOtp = async (record) => {
  if (record?._id) {
    await OTP.deleteOne({ _id: record._id });
  }
};

export {
  getOtpLength,
  getOtpExpiresIn,
  getOtpResendTime,
  generateOtpCode,
  canResendOtp,
  getResendCooldown,
  saveSignupOtp,
  saveResetOtp,
  verifyOtp,
  deleteOtp,
};
