import { getOrderStatusDisplay } from '@/utils/orderStatusClient';

export default function OrderStatusBadge({
  order,
  variant = 'pill',
  showShipping = true,
  showDot = true,
  className = '',
}) {
  const { deliveryLabel, shippingLabel, styles } = getOrderStatusDisplay(order);

  if (variant === 'bordered') {
    return (
      <div className={`space-y-1 ${className}`}>
        <span
          className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${styles.badge} ${
            order.deliveryStatus === 'Cancelled' ? 'animate-pulse' : ''
          }`}
        >
          {deliveryLabel}
        </span>
        {showShipping && shippingLabel && (
          <p className="text-[9px] text-[#b89b5e] font-medium">{shippingLabel}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-0.5 ${className}`}>
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${styles.badge}`}
      >
        {showDot && <span className={`w-1 h-1 rounded-full ${styles.dot}`} />}
        {deliveryLabel}
      </div>
      {showShipping && shippingLabel && (
        <p className="text-[9px] text-[#b89b5e] font-medium pl-0.5">{shippingLabel}</p>
      )}
    </div>
  );
}
