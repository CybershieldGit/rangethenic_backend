import mongoose from 'mongoose';

const couponUsageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    couponCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
  },
  { timestamps: true }
);

// One first-order coupon redemption per user (atomic guard against double-apply / race conditions)
couponUsageSchema.index({ user: 1, couponCode: 1 }, { unique: true });

const CouponUsage = mongoose.model('CouponUsage', couponUsageSchema);

export default CouponUsage;
