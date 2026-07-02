"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAllOrders,
  syncOrderToShiprocket,
  cancelShiprocketOrder,
  createShipment,
  downloadOrderInvoice,
  downloadOrderManifest,
  getOrderTracking,
  cancelOrderAPI,
  updateOrderPaymentStatus,
} from "@/utils/api";
import { useSocket } from "@/context/SocketContext";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import AdminOrderActionsMenu from "@/components/AdminOrderActionsMenu";
import { formatAddressLine } from "@/utils/address";
import { formatOrderStatusUpdate } from "@/utils/orderStatusClient";

const LoadingSpinner = ({ size = "w-4 h-4", color = "border-white" }) => (
  <div className={`${size} border-2 ${color} border-t-transparent rounded-full animate-spin`} />
);

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // "all", "today", "yesterday", "7", "30"
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // Actions menu state
  const [openActionsMenuId, setOpenActionsMenuId] = useState(null);

  // Row-level action loading states
  const [syncingOrderId, setSyncingOrderId] = useState(null);
  const [shippingOrderId, setShippingOrderId] = useState(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [downloadingManifestId, setDownloadingManifestId] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [cancellingShiprocketId, setCancellingShiprocketId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Cancellation Modal states
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelComments, setCancelComments] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const ADMIN_CANCEL_REASONS = [
    "Customer requested cancellation",
    "Product out of stock",
    "Pricing error",
    "Fraudulent order suspected",
    "Unable to ship",
    "Other",
  ];

  useEffect(() => {
    fetchOrders();
  }, []);

  // Handle global click to close dropdowns when clicking outside
  useEffect(() => {
    const handleGlobalClick = (event) => {
      if (!event.target.closest(".order-date-filter-container")) {
        setIsDateDropdownOpen(false);
      }
      if (!event.target.closest(".admin-order-actions-menu")) {
        setOpenActionsMenuId(null);
      }
    };
    document.addEventListener("click", handleGlobalClick);
    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await getAllOrders();
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching admin orders:", error);
      showNotification("error", error.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleOrderCreated = (newOrder) => {
      setOrders((prevOrders) => {
        if (prevOrders.some((o) => o._id === newOrder._id)) return prevOrders;
        return [newOrder, ...prevOrders];
      });
      showNotification("success", `New Order Placed: #${newOrder._id?.slice(-8).toUpperCase()} by ${newOrder.user?.name || "Guest"}`);
    };

    const handleOrderUpdated = (updatedOrder) => {
      setOrders((prevOrders) =>
        prevOrders.map((ord) => (ord._id === updatedOrder._id ? updatedOrder : ord))
      );
      showNotification("success", `Order #${updatedOrder._id?.slice(-8).toUpperCase()} updated: ${formatOrderStatusUpdate(updatedOrder)}`);
    };

    socket.on("orderCreated", handleOrderCreated);
    socket.on("orderUpdated", handleOrderUpdated);

    return () => {
      socket.off("orderCreated", handleOrderCreated);
      socket.off("orderUpdated", handleOrderUpdated);
    };
  }, [socket]);

  const handleSyncToShiprocket = async (orderId) => {
    try {
      setSyncingOrderId(orderId);
      const result = await syncOrderToShiprocket(orderId);
      setOrders((prev) =>
        prev.map((ord) => (ord._id === orderId ? { ...ord, ...result.order } : ord))
      );
      showNotification("success", "Order synced to Shiprocket dashboard!");
    } catch (error) {
      console.error("Error syncing to Shiprocket:", error);
      showNotification("error", error.message || "Failed to sync order to Shiprocket");
    } finally {
      setSyncingOrderId(null);
    }
  };

  const handleCancelOrder = (orderId) => {
    setCancellingOrderId(orderId);
    setCancelReason("");
    setCancelComments("");
  };

  const submitCancelOrder = async () => {
    if (!cancelReason) {
      showNotification("error", "Please select a cancellation reason.");
      return;
    }

    try {
      setIsSubmittingCancel(true);
      const result = await cancelOrderAPI(cancellingOrderId, {
        cancelReason,
        cancelComments,
      });

      if (result.order) {
        setOrders((prev) =>
          prev.map((ord) => (ord._id === cancellingOrderId ? result.order : ord))
        );
      }

      showNotification("success", `Order #${cancellingOrderId?.slice(-8).toUpperCase()} cancelled successfully`);
      setCancellingOrderId(null);
    } catch (error) {
      console.error("Error cancelling order:", error);
      showNotification("error", error.message || "Failed to cancel order");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleCancelInShiprocket = async (orderId) => {
    try {
      setCancellingShiprocketId(orderId);
      const result = await cancelShiprocketOrder(orderId);
      setOrders((prev) =>
        prev.map((ord) => (ord._id === orderId ? { ...ord, ...result.order } : ord))
      );
      showNotification("success", "Order cancelled in Shiprocket");
    } catch (error) {
      console.error("Error cancelling in Shiprocket:", error);
      showNotification("error", error.message || "Failed to cancel order in Shiprocket");
    } finally {
      setCancellingShiprocketId(null);
    }
  };

  const handleCreateShipment = async (orderId) => {
    try {
      setShippingOrderId(orderId);
      const result = await createShipment(orderId);
      setOrders((prev) =>
        prev.map((ord) => (ord._id === orderId ? { ...ord, ...result.order } : ord))
      );
      showNotification("success", `Shipment created! AWB: ${result.shipment?.awbCode || "assigned"}`);
    } catch (error) {
      console.error("Error creating shipment:", error);
      showNotification("error", error.message || "Failed to create Shiprocket shipment");
    } finally {
      setShippingOrderId(null);
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    try {
      setDownloadingInvoiceId(orderId);
      const result = await downloadOrderInvoice(orderId);
      if (result.invoiceUrl) {
        window.open(result.invoiceUrl, "_blank", "noopener,noreferrer");
        if (result.order) {
          setOrders((prev) => prev.map((ord) => (ord._id === orderId ? { ...ord, ...result.order } : ord)));
        }
        showNotification("success", "Invoice opened in a new tab");
      }
    } catch (error) {
      console.error("Error downloading invoice:", error);
      showNotification("error", error.message || "Failed to download invoice");
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handleDownloadManifest = async (orderId) => {
    try {
      setDownloadingManifestId(orderId);
      const result = await downloadOrderManifest(orderId);
      if (result.manifestUrl) {
        window.open(result.manifestUrl, "_blank", "noopener,noreferrer");
        if (result.order) {
          setOrders((prev) => prev.map((ord) => (ord._id === orderId ? { ...ord, ...result.order } : ord)));
        }
        showNotification("success", "Manifest opened in a new tab");
      }
    } catch (error) {
      console.error("Error downloading manifest:", error);
      showNotification("error", error.message || "Failed to download manifest");
    } finally {
      setDownloadingManifestId(null);
    }
  };

  const handleRefreshTracking = async (orderId) => {
    try {
      setTrackingOrderId(orderId);
      const data = await getOrderTracking(orderId);
      if (data.order) {
        setOrders((prev) =>
          prev.map((ord) => (ord._id === orderId ? data.order : ord))
        );
      }
      showNotification("success", data.order ? `Tracking synced: ${formatOrderStatusUpdate(data.order)}` : "Tracking synced from Shiprocket");
    } catch (error) {
      console.error("Error refreshing tracking:", error);
      showNotification("error", error.message || "Failed to sync tracking");
    } finally {
      setTrackingOrderId(null);
    }
  };

  const handleTogglePaid = async (orderId, currentPaidStatus) => {
    try {
      setUpdatingId(orderId);
      const updatedOrder = await updateOrderPaymentStatus(orderId, !currentPaidStatus);

      // Update local state
      setOrders((prevOrders) =>
        prevOrders.map((ord) => (ord._id === orderId ? { ...ord, ...updatedOrder } : ord))
      );

      showNotification("success", `Order payment status marked as ${!currentPaidStatus ? 'Paid' : 'Unpaid'} successfully!`);
    } catch (error) {
      console.error("Error updating order payment status:", error);
      showNotification("error", error.message || "Failed to update payment status");
    } finally {
      setUpdatingId(null);
    }
  };

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3000);
  };

  // Stats calculation
  const stats = orders.reduce(
    (acc, ord) => {
      acc.total += 1;
      acc.revenue += ord.isPaid ? ord.totalPrice : 0;
      if (ord.deliveryStatus === "Placed") acc.placed += 1;
      else if (ord.deliveryStatus === "Dispatched") acc.dispatched += 1;
      else if (ord.deliveryStatus === "Delivered") acc.delivered += 1;
      else if (ord.deliveryStatus === "Cancelled") acc.cancelled += 1;
      return acc;
    },
    { total: 0, revenue: 0, placed: 0, dispatched: 0, delivered: 0, cancelled: 0 }
  );

  // Dynamic search and date filtering engine
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Search Query Match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const clientName = (order.user?.name || "Guest Customer").toLowerCase();
        const clientEmail = (order.user?.email || "N/A").toLowerCase();
        const orderId = (order._id || "").toLowerCase();
        const addressName = (order.shippingAddress?.fullName || "").toLowerCase();
        const itemsMatch = (order.orderItems || order.items || []).some((item) =>
          (item.name || item.product?.name || "").toLowerCase().includes(query)
        );

        if (
          !clientName.includes(query) &&
          !clientEmail.includes(query) &&
          !orderId.includes(query) &&
          !addressName.includes(query) &&
          !itemsMatch
        ) {
          return false;
        }
      }

      // 2. Date Filter Match
      if (dateFilter !== "all") {
        const orderDate = new Date(order.createdAt);
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        if (dateFilter === "today") {
          if (orderDate < todayStart) return false;
        } else if (dateFilter === "yesterday") {
          const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
          if (orderDate < yesterdayStart || orderDate >= todayStart) return false;
        } else if (dateFilter === "7") {
          const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (orderDate < sevenDaysAgo) return false;
        } else if (dateFilter === "30") {
          const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (orderDate < thirtyDaysAgo) return false;
        }
      }

      return true;
    });
  }, [orders, searchQuery, dateFilter]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <LoadingSpinner size="w-12 h-12" color="border-[#b89b5e]" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2b2622]/40 animate-pulse">
          Summoning Admin Records...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-xl border text-xs font-bold uppercase tracking-widest flex items-center gap-3 transition-all ${notification.type === "success"
                ? "bg-[#2b2622] text-white border-[#b89b5e]"
                : "bg-red-600 text-white border-red-700"
              }`}
          >
            {notification.type === "success" ? (
              <span className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
            ) : (
              <span className="w-2 h-2 bg-white rounded-full" />
            )}
            {notification.text}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#dcd4cb] pb-6">
        <div>
          <span className="text-[#b89b5e] font-black tracking-[0.3em] uppercase text-[10px] block mb-2">
            Elite Command Panel
          </span>
          <h1 className="text-4xl font-serif text-[#2b2622] leading-tight">Master Orders List</h1>
          <p className="text-xs text-[#6f6a65] font-light italic mt-1">
            Manage orders, Shiprocket shipments, and live delivery tracking.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="bg-white hover:bg-[#b89b5e]/5 text-[#2b2622] border border-[#dcd4cb] hover:border-[#b89b5e] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all"
        >
          Refresh Orders
        </button>
      </header>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-[#dcd4cb]">
          <p className="text-[#6f6a65] italic font-light">No client orders have been registered yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[20px] border border-[#dcd4cb] overflow-hidden shadow-sm min-h-[350px]">
          {/* High-density Filtering Panel */}
          <div className="p-3 sm:p-4 border-b border-[#f2eee9] flex flex-row items-center justify-between gap-3 bg-[#fcfbf9]/50 w-full">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xs sm:max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6f6a65]/40">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-[34px] bg-white border border-[#dcd4cb] rounded-xl pl-9 pr-7 text-[9px] sm:text-[10px] font-medium text-[#2b2622] placeholder:text-[#6f6a65]/40 outline-none focus:border-[#b89b5e] focus:ring-1 focus:ring-[#b89b5e] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#6f6a65]/40 hover:text-[#2b2622] cursor-pointer"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Date Filter Selection */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Funnel Icon (Desktop/Tablet Only) */}
              <span className="hidden sm:inline-block text-[#b89b5e] shrink-0" title="Filter by Date">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
              </span>

              {/* Date Filter Dropdown */}
              <div className="relative w-[34px] sm:w-36 order-date-filter-container">
                <button
                  type="button"
                  onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                  className="appearance-none bg-white border border-[#dcd4cb] rounded-xl text-[#2b2622] cursor-pointer transition-all duration-300 hover:bg-[#e8e1d9]/30 flex items-center justify-center sm:justify-between w-[34px] h-[34px] sm:w-full sm:h-[34px] sm:pl-3 sm:pr-8 text-[8px] sm:text-[9px] font-black uppercase tracking-wider"
                >
                  {/* Funnel Icon (Mobile Only) */}
                  <span className="sm:hidden text-[#b89b5e] flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                    </svg>
                  </span>

                  {/* Selected Text (Desktop/Tablet Only) */}
                  <span className="hidden sm:block truncate">
                    {dateFilter === "all" ? "All Time" :
                      dateFilter === "today" ? "Today" :
                        dateFilter === "yesterday" ? "Yesterday" :
                          dateFilter === "7" ? "7 Days" : "30 Days"}
                  </span>

                  {/* Arrow Icon (Desktop/Tablet Only) */}
                  <div
                    className="hidden sm:block absolute right-2.5 top-1/2 -translate-y-1/2 text-[#b89b5e] transition-transform duration-300 pointer-events-none"
                    style={{ transform: isDateDropdownOpen ? "translateY(-50%) rotate(180deg)" : "translateY(-50%)" }}
                  >
                    <svg width="6" height="4" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>

                {isDateDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1.5 z-50 bg-[#e8e1d9] border border-[#dcd4cb] rounded-xl p-1 shadow-[0_10px_30px_rgba(43,38,34,0.12)] w-28 sm:w-full backdrop-blur-md flex flex-col gap-0.5 origin-top-right transition-all">
                    {[
                      { label: "All Time", val: "all" },
                      { label: "Today", val: "today" },
                      { label: "Yesterday", val: "yesterday" },
                      { label: "7 Days", val: "7" },
                      { label: "30 Days", val: "30" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          setDateFilter(opt.val);
                          setIsDateDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer ${dateFilter === opt.val
                            ? "bg-[#2b2622] text-white shadow-sm"
                            : "text-[#6f6a65] hover:text-[#2b2622] hover:bg-white/40"
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-20 bg-white">
                <p className="text-[#6f6a65] italic font-light">No orders match your search query or selected date filter.</p>
              </div>
            ) : (
              <table className="w-full min-w-[1200px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfbf9] border-b border-[#f2eee9] text-[#6f6a65] text-[10px] font-black uppercase tracking-wider">
                    <th className="py-5 px-6">Client / Order ID</th>
                    <th className="py-5 px-6">Delivery Address</th>
                    <th className="py-5 px-6">Ritual Items</th>
                    <th className="py-5 px-6">Total / Payment</th>
                    <th className="py-5 px-6">Coupon</th>
                    <th className="py-5 px-6">Shipping / AWB</th>
                    <th className="py-5 px-6">Delivery Status</th>
                    <th className="py-5 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order._id} className="border-b border-[#f2eee9] hover:bg-[#fcfbf9]/50 transition-colors text-xs text-[#2b2622]">
                      {/* User info */}
                      <td className="py-6 px-6 space-y-1">
                        <p className="font-bold text-[#2b2622]">{order.user?.name || "Guest Customer"}</p>
                        <p className="text-[10px] text-[#6f6a65] font-light">{order.user?.email || "N/A"}</p>
                        <span className="inline-block font-mono text-[9px] text-[#b89b5e] uppercase font-bold tracking-wider">
                          #{order._id?.slice(-8).toUpperCase()}
                        </span>
                      </td>

                      {/* Delivery Address */}
                      <td className="py-6 px-6 space-y-1 max-w-[240px]">
                        {order.shippingAddress ? (
                          <div className="space-y-0.5">
                            <p className="font-bold text-[#2b2622]">{order.shippingAddress.fullName}</p>
                            <p className="text-[10px] text-[#6f6a65] font-medium">{order.shippingAddress.phone}</p>
                            <p className="text-[10px] text-[#6f6a65] leading-relaxed font-light">
                              {formatAddressLine(order.shippingAddress)}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}, {order.shippingAddress.country}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[#6f6a65]/35 italic">No Address Provided</span>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-6 px-6">
                        <div className="space-y-1">
                          {(order.orderItems || order.items || []).map((item, idx) => (
                            <p key={idx} className="font-medium text-[#2b2622]">
                              {item.name || item.product?.name} <span className="text-[#6f6a65]/60 font-light">x{item.quantity}</span>
                            </p>
                          ))}
                        </div>
                      </td>

                      {/* Price and Payment status */}
                      <td className="py-6 px-6 space-y-1.5">
                        <p className="font-bold text-[#2b2622] text-sm">₹{order.totalPrice?.toFixed(2)}</p>
                        {(order.shippingPrice > 0 || order.isShippingFree) && (
                          <p className="text-[9px] text-[#6f6a65] font-light">
                            Items: ₹{(order.itemsPrice ?? order.totalPrice)?.toFixed(2)} · Shipping: {order.isShippingFree ? "Free" : `₹${order.shippingPrice?.toFixed(2)}`}
                          </p>
                        )}
                        {order.paymentMethod === 'COD' && order.deliveryStatus !== 'Cancelled' ? (
                          <button
                            onClick={() => handleTogglePaid(order._id, order.isPaid)}
                            disabled={updatingId === order._id}
                            className="flex items-center gap-1.5 hover:bg-[#b89b5e]/5 px-2 py-1 rounded-xl border border-[#dcd4cb]/20 hover:border-[#b89b5e] transition-all cursor-pointer group animate-none"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${order.isPaid ? 'bg-green-500' : 'bg-amber-500'}`} />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${order.isPaid ? 'text-green-600' : 'text-amber-600'} group-hover:text-[#b89b5e]`}>
                              {order.isPaid ? "Paid" : "Unpaid"}
                            </span>
                            <span className="text-[7px] text-[#6f6a65]/40 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest ml-1 font-bold">Toggle</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${order.isPaid ? 'bg-green-500' : 'bg-amber-500'}`} />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${order.isPaid ? 'text-green-600' : 'text-amber-600'}`}>
                              {order.isPaid ? "Paid" : "Unpaid"}
                            </span>
                          </div>
                        )}
                        <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border whitespace-nowrap ${order.paymentMethod === 'COD'
                            ? 'bg-orange-50 text-orange-600 border-orange-200/50'
                            : 'bg-blue-50 text-blue-600 border-blue-200/50'
                          }`}>
                          {order.paymentMethod === 'COD' ? '💵 COD' : '💳 Online'}
                        </span>
                      </td>

                      {/* Coupon */}
                      <td className="py-6 px-6">
                        {order.couponCode ? (
                          <div className="space-y-0.5">
                            <span className="bg-[#b89b5e]/15 border border-[#b89b5e]/25 text-[#b89b5e] px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                              {order.couponCode}
                            </span>
                            {order.couponDiscount > 0 && (
                              <p className="text-[9px] text-green-600 font-bold">
                                −₹{Number(order.couponDiscount).toFixed(2)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#6f6a65]/35 italic">-</span>
                        )}
                      </td>

                      {/* Shipping / AWB */}
                      <td className="py-6 px-6 space-y-1 min-w-[140px]">
                        {order.awbCode ? (
                          <div className="space-y-1">
                            <p className="font-mono text-[10px] font-bold text-[#2b2622]">{order.awbCode}</p>
                            {order.courierName && (
                              <p className="text-[9px] text-[#6f6a65]">{order.courierName}</p>
                            )}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {order.labelUrl && (
                                <a href={order.labelUrl} target="_blank" rel="noopener noreferrer" className="text-[8px] font-black uppercase tracking-wider text-[#b89b5e] hover:underline">Label</a>
                              )}
                              {order.trackingUrl && (
                                <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-[8px] font-black uppercase tracking-wider text-[#b89b5e] hover:underline">Track</a>
                              )}
                            </div>
                          </div>
                        ) : order.shiprocketOrderId && order.deliveryStatus !== "Cancelled" ? (
                          <p className="text-[9px] text-[#6f6a65]">Synced · awaiting AWB</p>
                        ) : (
                          <span className="text-[#6f6a65]/35 italic text-[9px]">—</span>
                        )}
                        {order.shiprocketCancelledAt && (
                          <p className="text-[8px] text-green-700 font-medium">Cancelled in Shiprocket</p>
                        )}
                        {order.shipmentError && (
                          <p className="text-[8px] text-red-600 max-w-[160px]">{order.shipmentError}</p>
                        )}
                      </td>

                      {/* Delivery status */}
                      <td className="py-6 px-6 space-y-1">
                        <OrderStatusBadge order={order} variant="bordered" />
                        {order.dispatchedAt && (
                          <p className="text-[9px] text-[#6f6a65] font-light">
                            Dispatched: {new Date(order.dispatchedAt).toLocaleDateString()}
                          </p>
                        )}
                        {order.deliveredAt && (
                          <p className="text-[9px] text-[#6f6a65] font-light">
                            Delivered: {new Date(order.deliveredAt).toLocaleDateString()}
                          </p>
                        )}
                        {order.deliveryStatus === "Cancelled" && order.cancelReason && (
                          <div className="text-[9px] text-red-800/80 font-light mt-1.5 pt-1.5 border-t border-red-200/30 max-w-[180px] space-y-0.5">
                            <p className="font-bold">Reason: <span className="font-light italic text-[#2b2622]">"{order.cancelReason}"</span></p>
                            {order.cancelComments && (
                              <p className="font-bold">Notes: <span className="font-light italic text-[#2b2622]">"{order.cancelComments}"</span></p>
                            )}
                            {order.cancelledAt && (
                              <p className="text-[8px] text-red-800/50 pt-0.5">Cancelled: {new Date(order.cancelledAt).toLocaleString()}</p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-6 px-4 w-[52px]">
                        <AdminOrderActionsMenu
                          order={order}
                          isOpen={openActionsMenuId === order._id}
                          onToggle={() =>
                            setOpenActionsMenuId((prev) =>
                              prev === order._id ? null : order._id
                            )
                          }
                          onClose={() => setOpenActionsMenuId(null)}
                          onSyncToShiprocket={handleSyncToShiprocket}
                          onCreateShipment={handleCreateShipment}
                          onDownloadInvoice={handleDownloadInvoice}
                          onDownloadManifest={handleDownloadManifest}
                          onRefreshTracking={handleRefreshTracking}
                          onCancelOrder={handleCancelOrder}
                          onCancelInShiprocket={handleCancelInShiprocket}
                          syncingOrderId={syncingOrderId}
                          shippingOrderId={shippingOrderId}
                          downloadingInvoiceId={downloadingInvoiceId}
                          downloadingManifestId={downloadingManifestId}
                          trackingOrderId={trackingOrderId}
                          cancellingShiprocketId={cancellingShiprocketId}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Admin cancel order modal */}
      <AnimatePresence>
        {cancellingOrderId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmittingCancel && setCancellingOrderId(null)}
              className="fixed inset-0 bg-[#2b2622]/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#fdfaf5] border border-[#e8e4de] rounded-[24px] w-full max-w-md p-5 sm:p-6 shadow-[0_16px_40px_rgba(43,38,34,0.12)] z-50 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
              <div className="space-y-4">
                <div>
                  <span className="text-red-500 font-black tracking-[0.25em] uppercase text-[8.5px] block mb-1.5">
                    Admin Cancellation
                  </span>
                  <h3 className="text-xl font-serif text-[#2b2622]">Cancel this order?</h3>
                  <p className="text-[11px] text-[#6f6a65] font-light mt-0.5">
                    Order #{cancellingOrderId?.slice(-8).toUpperCase()} will be cancelled, stock restored, and Shiprocket will be notified if synced.
                  </p>
                </div>

                <div className="space-y-2">
                  {ADMIN_CANCEL_REASONS.map((reason) => {
                    const isSelected = cancelReason === reason;
                    return (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setCancelReason(reason)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2.5 ${
                          isSelected
                            ? "bg-red-50/50 border-red-200 text-red-700 shadow-sm"
                            : "bg-white border-[#e8e4de] text-[#6f6a65] hover:border-[#b89b5e] hover:text-[#2b2622]"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? "border-red-500" : "border-[#dcd4cb]"
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                        </div>
                        <span>{reason}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-[#6f6a65]/80">
                    Internal Notes (Optional)
                  </label>
                  <textarea
                    value={cancelComments}
                    onChange={(e) => setCancelComments(e.target.value)}
                    placeholder="Add any admin notes about this cancellation..."
                    className="w-full bg-white border border-[#e8e4de] hover:border-[#b89b5e] focus:border-[#b89b5e] rounded-xl p-3 text-xs font-light text-[#2b2622] outline-none min-h-[70px] transition-all placeholder:text-[#6f6a65]/40"
                  />
                </div>

                <div className="flex gap-3 pt-1.5">
                  <button
                    type="button"
                    disabled={isSubmittingCancel}
                    onClick={submitCancelOrder}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 shadow-md flex items-center justify-center gap-2"
                  >
                    {isSubmittingCancel ? (
                      <>
                        <LoadingSpinner size="w-3 h-3" color="border-white" />
                        <span>Cancelling...</span>
                      </>
                    ) : (
                      <span>Confirm Cancel</span>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingCancel}
                    onClick={() => setCancellingOrderId(null)}
                    className="px-6 py-2.5 rounded-xl border border-[#e8e4de] text-[#6f6a65] text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all"
                  >
                    Back
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
