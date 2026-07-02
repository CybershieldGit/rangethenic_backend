export const DELIVERY_STATUSES = ['Placed', 'Dispatched', 'Delivered', 'Cancelled'];

export const getDeliveryStatusLabel = (deliveryStatus) => deliveryStatus || 'Placed';

export const isShippingStatusRedundant = (shippingStatus, deliveryStatus) => {
  if (!shippingStatus) return true;

  const shipping = String(shippingStatus).toLowerCase();
  const delivery = deliveryStatus || 'Placed';

  if (delivery === 'Delivered' && shipping.includes('deliver')) return true;
  if (delivery === 'Cancelled' && shipping.includes('cancel')) return true;
  if (delivery === 'Placed' && shipping.includes('placed')) return true;

  return false;
};

export const getOrderStatusBadgeStyles = (deliveryStatus) => {
  switch (deliveryStatus) {
    case 'Delivered':
      return {
        badge: 'bg-green-50 text-green-700 border-green-200/50',
        dot: 'bg-green-500',
      };
    case 'Cancelled':
      return {
        badge: 'bg-red-50 text-red-700 border-red-200/50',
        dot: 'bg-red-500',
      };
    case 'Dispatched':
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-200/50',
        dot: 'bg-amber-500',
      };
    default:
      return {
        badge: 'bg-[#2b2622]/5 text-[#2b2622] border-[#2b2622]/10',
        dot: 'bg-[#2b2622]/40',
      };
  }
};

export const getOrderStatusDisplay = (order = {}) => {
  const deliveryLabel = getDeliveryStatusLabel(order.deliveryStatus);
  const shippingLabel = isShippingStatusRedundant(order.shippingStatus, order.deliveryStatus)
    ? null
    : order.shippingStatus;

  return {
    deliveryLabel,
    shippingLabel,
    styles: getOrderStatusBadgeStyles(order.deliveryStatus),
  };
};

export const formatOrderStatusUpdate = (order = {}) => {
  const { deliveryLabel, shippingLabel } = getOrderStatusDisplay(order);
  return shippingLabel ? `${deliveryLabel} · ${shippingLabel}` : deliveryLabel;
};
