import Order from '../models/Order.js';
import { getIO } from './socket.js';
import {
  parseTrackingResponse,
  fetchLiveTracking,
  isShiprocketConfigured,
} from './shiprocket.js';
import { buildCustomerTrackingUrl } from './tracking.js';

export const mapShiprocketStatusToDelivery = (status = '') => {
  const normalized = String(status).toLowerCase();
  if (normalized.includes('cancel') || normalized.includes('rto')) return 'Cancelled';
  if (normalized.includes('deliver')) return 'Delivered';
  if (
    normalized.includes('dispatch') ||
    normalized.includes('transit') ||
    normalized.includes('pickup') ||
    normalized.includes('shipped') ||
    normalized.includes('out for') ||
    normalized.includes('picked') ||
    normalized.includes('manifest') ||
    normalized.includes('awb')
  ) {
    return 'Dispatched';
  }
  return null;
};

const snapshotOrder = (order) => ({
  deliveryStatus: order.deliveryStatus,
  shippingStatus: order.shippingStatus,
  isPaid: order.isPaid,
});

const orderStatusChanged = (before, order) =>
  before.deliveryStatus !== order.deliveryStatus ||
  before.shippingStatus !== order.shippingStatus ||
  before.isPaid !== order.isPaid;

export const emitOrderUpdated = async (orderId) => {
  try {
    const io = getIO();
    if (!io) return;

    const populatedOrder = await Order.findById(orderId)
      .populate('user', 'id name email')
      .populate('orderItems.product');

    if (populatedOrder) {
      io.emit('orderUpdated', populatedOrder);
    }
  } catch (error) {
    console.error('Error emitting orderUpdated:', error);
  }
};

export const shouldRefreshOrderTracking = (order) => {
  if (!order) return false;
  if (['Cancelled', 'Delivered'].includes(order.deliveryStatus)) return false;
  return Boolean(order.awbCode || order.shiprocketShipmentId || order.shiprocketOrderId);
};

export const applyShiprocketTrackingToOrder = async (
  order,
  trackingData,
  { save = true, emit = true } = {}
) => {
  const before = snapshotOrder(order);
  const { currentStatus, history, trackingUrl } = parseTrackingResponse(trackingData);

  if (currentStatus) {
    order.shippingStatus = currentStatus;
  }

  if (history?.length) {
    order.trackingHistory = history;
  }

  order.trackingUrl = buildCustomerTrackingUrl(order) || trackingUrl || order.trackingUrl;

  const mappedStatus = mapShiprocketStatusToDelivery(currentStatus);
  if (mappedStatus === 'Cancelled' && order.deliveryStatus !== 'Cancelled') {
    order.deliveryStatus = 'Cancelled';
    order.cancelledAt = order.cancelledAt || new Date();
  } else if (mappedStatus === 'Delivered' && order.deliveryStatus !== 'Delivered') {
    order.deliveryStatus = 'Delivered';
    order.deliveredAt = new Date();
    if (!order.dispatchedAt) order.dispatchedAt = new Date();
    if (order.paymentMethod === 'COD') {
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentStatus = 'Success';
    }
  } else if (mappedStatus === 'Dispatched' && order.deliveryStatus === 'Placed') {
    order.deliveryStatus = 'Dispatched';
    order.dispatchedAt = new Date();
  }

  if (save) {
    await order.save();
  }

  if (emit && orderStatusChanged(before, order)) {
    await emitOrderUpdated(order._id);
  }

  return { currentStatus, history, trackingUrl };
};

export const refreshOrderTrackingFromShiprocket = async (order, { emit = false } = {}) => {
  if (!isShiprocketConfigured() || !shouldRefreshOrderTracking(order)) {
    return order;
  }

  try {
    const live = await fetchLiveTracking(order);
    if (!live?.data) return order;
    await applyShiprocketTrackingToOrder(order, live.data, { save: true, emit });
  } catch (error) {
    console.warn(`Tracking refresh skipped for order ${order._id}:`, error.message);
  }

  return order;
};

export const refreshOrdersTrackingBatch = async (orders, { emit = true } = {}) => {
  if (!isShiprocketConfigured() || !Array.isArray(orders) || !orders.length) {
    return orders;
  }

  const eligible = orders.filter(shouldRefreshOrderTracking);
  await Promise.allSettled(
    eligible.map((order) => refreshOrderTrackingFromShiprocket(order, { emit }))
  );

  return orders;
};
