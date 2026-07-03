import Order from '../models/Order.js';

const getTrackingPageBase = () => {
  const url =
    process.env.SHIPROCKET_TRACKING_PAGE_URL ||
    process.env.SHIP_ROCKET_TRACKING_PAGE_URL ||
    'https://rangethenics.shiprocket.co/tracking';
  return url.replace(/\/$/, '');
};

export const getTrackingPageUrl = () => getTrackingPageBase();

export const CHANNEL_ORDER_PREFIX = 'RANGA';

export const getChannelOrderId = (order) => {
  if (order?.shiprocketChannelOrderId) return order.shiprocketChannelOrderId;
  if (order?._id) {
    return `${CHANNEL_ORDER_PREFIX}-${order._id.toString().slice(-12).toUpperCase()}`;
  }
  return null;
};

export const normalizeChannelOrderId = (input) => {
  const trimmed = String(input || '').trim().toUpperCase();
  if (!trimmed) return null;
  if (trimmed.startsWith('RANGA-') || trimmed.startsWith('RANG-')) return trimmed;
  if (/^[A-F0-9]{8,24}$/.test(trimmed)) {
    return `${CHANNEL_ORDER_PREFIX}-${trimmed.slice(-12)}`;
  }
  return trimmed;
};

export const resolveOrderFromChannelId = async (input) => {
  const channelId = normalizeChannelOrderId(input);
  if (!channelId) return null;

  const byChannel = await Order.findOne({ shiprocketChannelOrderId: channelId });
  if (byChannel) return byChannel;

  const suffix = channelId.replace(/^RANGA?-/i, '').toUpperCase();
  if (!/^[A-F0-9]{12}$/.test(suffix)) return null;

  return Order.findOne({
    $expr: {
      $eq: [
        { $toUpper: { $substr: [{ $toString: '$_id' }, 12, 12] } },
        suffix,
      ],
    },
  });
};

/** Branded Shiprocket page — https://rangethenics.shiprocket.co/tracking?order_id=RANGA-xxx */
export const buildBrandedTrackingUrl = ({ orderId, awb } = {}, order = null) => {
  const base = getTrackingPageBase();

  if (awb?.trim()) {
    return `${base}?awb=${encodeURIComponent(awb.trim())}`;
  }

  const channelId = orderId
    ? normalizeChannelOrderId(orderId)
    : order
      ? getChannelOrderId(order)
      : null;

  if (channelId) {
    return `${base}?order_id=${encodeURIComponent(channelId)}`;
  }

  return base;
};

export const buildCustomerTrackingUrl = (order) => {
  if (!order) return null;

  if (order.awbCode) {
    return buildBrandedTrackingUrl({ awb: order.awbCode });
  }

  const channelId = getChannelOrderId(order);
  if (channelId && (order.shiprocketOrderId || order.shiprocketShipmentId)) {
    return buildBrandedTrackingUrl({ orderId: channelId });
  }

  if (order.trackingUrl) return order.trackingUrl;
  return getTrackingPageUrl();
};

export const buildTrackingSearchUrl = ({ orderId, awb } = {}) =>
  buildBrandedTrackingUrl({ orderId, awb });
