"use client";

import { useMemo, useRef, useState, useEffect } from "react";

const MenuButton = ({ label, onClick, disabled, variant = "default" }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`w-full text-left px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all disabled:opacity-50 ${
      variant === "danger"
        ? "text-red-700 hover:bg-red-50"
        : variant === "primary"
          ? "text-[#b89b5e] hover:bg-[#b89b5e]/10"
          : "text-[#2b2622] hover:bg-[#f2eee9]"
    }`}
  >
    {label}
  </button>
);

export default function AdminOrderActionsMenu({
  order,
  isOpen,
  onToggle,
  onClose,
  onSyncToShiprocket,
  onCreateShipment,
  onDownloadInvoice,
  onDownloadManifest,
  onRefreshTracking,
  onCancelOrder,
  onCancelInShiprocket,
  syncingOrderId,
  shippingOrderId,
  downloadingInvoiceId,
  downloadingManifestId,
  trackingOrderId,
  cancellingShiprocketId,
}) {
  const orderId = order._id;
  const buttonRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 148;
      const left = Math.min(
        Math.max(8, rect.right - menuWidth),
        window.innerWidth - menuWidth - 8
      );
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < 160 && rect.top > 160;

      setMenuPosition({
        top: openUpward ? rect.top - 4 : rect.bottom + 4,
        left,
        transform: openUpward ? "translateY(-100%)" : "none",
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const actions = useMemo(() => {
    const items = [];
    const isActive =
      order.deliveryStatus !== "Cancelled" && order.deliveryStatus !== "Delivered";

    if (isActive) {
      if (!order.shiprocketOrderId) {
        items.push({
          id: "sync",
          label: syncingOrderId === orderId ? "Syncing..." : "Sync to Shiprocket",
          onClick: () => onSyncToShiprocket(orderId),
          disabled: syncingOrderId === orderId,
          variant: "primary",
        });
      }
      if (order.shiprocketOrderId && !order.awbCode) {
        items.push({
          id: "ship",
          label: shippingOrderId === orderId ? "Creating..." : "Ship via Shiprocket",
          onClick: () => onCreateShipment(orderId),
          disabled: shippingOrderId === orderId,
          variant: "primary",
        });
      }
      if (order.shiprocketOrderId) {
        items.push({
          id: "invoice",
          label: downloadingInvoiceId === orderId ? "Loading..." : "Download Invoice",
          onClick: () => onDownloadInvoice(orderId),
          disabled: downloadingInvoiceId === orderId,
        });
      }
      if (order.awbCode) {
        items.push({
          id: "manifest",
          label: downloadingManifestId === orderId ? "Loading..." : "Download Manifest",
          onClick: () => onDownloadManifest(orderId),
          disabled: downloadingManifestId === orderId,
        });
        items.push({
          id: "tracking",
          label: trackingOrderId === orderId ? "Syncing..." : "Sync Tracking",
          onClick: () => onRefreshTracking(orderId),
          disabled: trackingOrderId === orderId,
        });
      }
      items.push({
        id: "cancel",
        label: "Cancel Order",
        onClick: () => onCancelOrder(orderId),
        variant: "danger",
      });
    }

    if (
      order.deliveryStatus === "Cancelled" &&
      order.shiprocketOrderId &&
      !order.shiprocketCancelledAt
    ) {
      items.push({
        id: "cancel-sr",
        label: cancellingShiprocketId === orderId ? "Cancelling..." : "Cancel in Shiprocket",
        onClick: () => onCancelInShiprocket(orderId),
        disabled: cancellingShiprocketId === orderId,
        variant: "danger",
      });
    }

    if (order.deliveryStatus === "Delivered" && order.shiprocketOrderId) {
      items.push({
        id: "invoice-delivered",
        label: downloadingInvoiceId === orderId ? "Loading..." : "Download Invoice",
        onClick: () => onDownloadInvoice(orderId),
        disabled: downloadingInvoiceId === orderId,
      });
    }

    return items;
  }, [
    order,
    orderId,
    syncingOrderId,
    shippingOrderId,
    downloadingInvoiceId,
    downloadingManifestId,
    trackingOrderId,
    cancellingShiprocketId,
    onSyncToShiprocket,
    onCreateShipment,
    onDownloadInvoice,
    onDownloadManifest,
    onRefreshTracking,
    onCancelOrder,
    onCancelInShiprocket,
  ]);

  if (!actions.length) {
    return <span className="text-[#6f6a65]/35 italic text-[9px]">—</span>;
  }

  const handleAction = (action) => {
    action.onClick();
    onClose();
  };

  return (
    <div className="relative admin-order-actions-menu">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-label="Order actions"
        aria-expanded={isOpen}
        className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all ${
          isOpen
            ? "bg-[#2b2622] border-[#2b2622] text-white"
            : "bg-white border-[#dcd4cb]/50 text-[#6f6a65] hover:border-[#b89b5e] hover:text-[#b89b5e]"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>

      {isOpen && menuPosition && (
        <div
          className="fixed z-[200] min-w-[148px] bg-white border border-[#e8e4de] rounded-xl p-1 shadow-[0_8px_24px_rgba(43,38,34,0.12)] flex flex-col gap-0.5"
          style={menuPosition}
        >
          {actions.map((action) => (
            <MenuButton
              key={action.id}
              label={action.label}
              onClick={() => handleAction(action)}
              disabled={action.disabled}
              variant={action.variant}
            />
          ))}
        </div>
      )}
    </div>
  );
}
