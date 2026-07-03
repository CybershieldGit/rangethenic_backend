import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import CouponUsage from '../models/CouponUsage.js';
import Cart from '../models/Cart.js';

export const userHasAnyActiveOrder = async (userId) => {
  const count = await Order.countDocuments({
    user: userId,
    deliveryStatus: { $ne: 'Cancelled' },
  });
  return count > 0;
};

export const userHasConfirmedOrder = async (userId) => {
  const count = await Order.countDocuments({
    user: userId,
    deliveryStatus: { $ne: 'Cancelled' },
    $or: [
      { paymentMethod: 'COD' },
      { paymentMethod: 'Online', isPaid: true },
    ],
  });
  return count > 0;
};

export const userAlreadyUsedCoupon = async (userId, couponCode) => {
  if (!userId || !couponCode) return false;

  const [orderCount, usageCount] = await Promise.all([
    Order.countDocuments({
      user: userId,
      couponCode,
      deliveryStatus: { $ne: 'Cancelled' },
    }),
    CouponUsage.countDocuments({
      user: userId,
      couponCode,
    }),
  ]);

  return orderCount > 0 || usageCount > 0;
};

export const assertCouponNotAlreadyUsed = async (userId, couponCode) => {
  if (!userId || !couponCode) return;

  if (await userAlreadyUsedCoupon(userId, couponCode)) {
    throw new Error('You have already used this coupon');
  }
};

export const assertFirstOrderCouponEligible = async (userId, coupon) => {
  if (!coupon?.firstOrderOnly || !userId) return;

  if (await userHasAnyActiveOrder(userId)) {
    throw new Error('This coupon is valid for your first order only');
  }
};

export const reserveCouponForUser = async ({ userId, coupon, orderId }) => {
  if (!userId || !coupon?.code) return null;

  try {
    return await CouponUsage.create({
      user: userId,
      couponCode: coupon.code,
      order: orderId || undefined,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('You have already used this coupon');
    }
    throw error;
  }
};

export const releaseCouponReservation = async (usageRecord) => {
  if (!usageRecord?._id) return;
  await CouponUsage.deleteOne({ _id: usageRecord._id });
};

export const linkCouponUsageToOrder = async (usageRecord, orderId) => {
  if (!usageRecord?._id || !orderId) return;
  usageRecord.order = orderId;
  await usageRecord.save();
};

export const calculateCouponDiscount = (coupon, eligiblePrice) => {
  const subtotal = Math.max(0, Number(eligiblePrice) || 0);
  if (!coupon || subtotal <= 0) return 0;

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = subtotal * (coupon.discountValue / 100);
  } else {
    discount = coupon.discountValue;
  }

  return Math.min(Math.round(discount * 100) / 100, subtotal);
};

/**
 * Given a coupon and a list of cart items, returns only items eligible
 * for the discount based on applicableProducts / excludedProducts.
 * Each item must have: { product: ObjectId|string, price: Number, quantity: Number }
 */
export const getEligibleItems = (coupon, cartItems) => {
  if (!cartItems || cartItems.length === 0) return [];

  const hasWhitelist = coupon.applicableProducts && coupon.applicableProducts.length > 0;
  const hasBlacklist = coupon.excludedProducts && coupon.excludedProducts.length > 0;

  if (!hasWhitelist && !hasBlacklist) return cartItems; // no restriction

  return cartItems.filter((item) => {
    const pid = (item.product?._id || item.product)?.toString();

    if (hasWhitelist) {
      return coupon.applicableProducts.some((ap) => ap.toString() === pid);
    }
    if (hasBlacklist) {
      return !coupon.excludedProducts.some((ep) => ep.toString() === pid);
    }
    return true;
  });
};

export const validateCouponForUser = async ({ code, userId, itemsPrice, cartItems }) => {
  if (!code?.trim()) {
    throw new Error('Coupon code is required');
  }

  const normalizedCode = code.trim().toUpperCase();
  const coupon = await Coupon.findOne({ code: normalizedCode });

  if (!coupon) {
    throw new Error('Invalid coupon code');
  }

  if (!coupon.isActive) {
    throw new Error('This coupon is no longer active');
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    throw new Error('This coupon has expired');
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new Error('This coupon has reached its usage limit');
  }

  // ── Product-level restriction check ──────────────────────────────────────
  const hasProductRestriction =
    (coupon.applicableProducts && coupon.applicableProducts.length > 0) ||
    (coupon.excludedProducts && coupon.excludedProducts.length > 0);

  let eligibleItemsPrice = Math.max(0, Number(itemsPrice) || 0);

  if (hasProductRestriction) {
    // Prefer caller-supplied items; fall back to fetching the user's cart
    let items = cartItems;
    if (!items && userId) {
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (cart && cart.items.length > 0) {
        items = cart.items.map((ci) => ({
          product: ci.product._id,
          price: ci.product.price,
          quantity: ci.quantity,
        }));
      }
    }

    if (items && items.length > 0) {
      const eligibleItems = getEligibleItems(coupon, items);
      if (eligibleItems.length === 0) {
        throw new Error('This coupon is not applicable to the products in your cart');
      }
      eligibleItemsPrice = eligibleItems.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
    }
  }

  const fullSubtotal = Math.max(0, Number(itemsPrice) || eligibleItemsPrice);

  if (eligibleItemsPrice < (coupon.minPurchase || 0)) {
    throw new Error(`Minimum purchase of ₹${coupon.minPurchase} is required for this coupon`);
  }

  await assertCouponNotAlreadyUsed(userId, coupon.code);
  await assertFirstOrderCouponEligible(userId, coupon);

  // Discount is computed on the eligible subtotal; total deduction is from fullSubtotal
  const discount = calculateCouponDiscount(coupon, eligibleItemsPrice);

  return {
    coupon,
    discount,
    itemsPrice: fullSubtotal,
    eligibleItemsPrice,
    totalAfterDiscount: Math.max(0, fullSubtotal - discount),
  };
};

export const incrementCouponUsage = async (couponCode) => {
  if (!couponCode) return;
  await Coupon.updateOne({ code: couponCode }, { $inc: { usedCount: 1 } });
};

export const decrementCouponUsage = async (couponCode) => {
  if (!couponCode) return;
  await Coupon.updateOne(
    { code: couponCode, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } }
  );
};
