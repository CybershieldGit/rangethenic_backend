import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'Product',
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    itemsPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    isShippingFree: {
      type: Boolean,
      default: false,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    shiprocketOrderId: { type: String },
    shiprocketShipmentId: { type: String },
    awbCode: { type: String },
    courierName: { type: String },
    courierId: { type: Number },
    trackingUrl: { type: String },
    shippingStatus: { type: String },
    trackingHistory: [
      {
        date: { type: String },
        activity: { type: String },
        location: { type: String },
      },
    ],
    labelUrl: { type: String },
    manifestUrl: { type: String },
    invoiceUrl: { type: String },
    shipmentCreatedAt: { type: Date },
    pickupScheduledAt: { type: Date },
    shipmentError: { type: String },
    shiprocketChannelOrderId: { type: String },
    shiprocketSyncedAt: { type: Date },
    shiprocketCancelledAt: { type: Date },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      required: true,
      default: 'Online',
      enum: ['Online', 'COD'],
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    paymentStatus: {
      type: String,
      required: true,
      default: 'Pending',
    },
    referralCode: {
      type: String,
    },
    referral: {
      type: String,
    },
    couponCode: {
      type: String,
    },
    couponDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isBuyNow: {
      type: Boolean,
      default: false,
    },
    deliveryStatus: {
      type: String,
      required: true,
      enum: ['Placed', 'Dispatched', 'Delivered', 'Cancelled'],
      default: 'Placed',
    },
    dispatchedAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancelReason: {
      type: String,
    },
    cancelComments: {
      type: String,
    },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      houseFlatNo: { type: String, default: '' },
      streetArea: { type: String, default: '' },
      landmark: { type: String, default: '' },
      addressLine: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
