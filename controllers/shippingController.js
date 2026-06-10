import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import {
  isShiprocketConfigured,
  getShippingRate,
  createFullShipment,
  trackByAWB,
  trackByShipmentId,
  trackByChannelOrderId,
  fetchLiveTracking,
  generateAWBForOrder,
  getFreeShippingThreshold,
  getShiprocketConfig,
  getShiprocketConfigStatus,
  isFreeShippingEligible,
  syncOrderToShiprocket,
  cancelOrderOnShiprocket,
  fetchOrderInvoice,
  fetchOrderManifest,
} from '../utils/shiprocket.js';
import {
  buildCustomerTrackingUrl,
  getTrackingPageUrl,
  normalizeChannelOrderId,
  resolveOrderFromChannelId,
  getChannelOrderId,
  buildBrandedTrackingUrl,
} from '../utils/tracking.js';
import {
  applyShiprocketTrackingToOrder,
  emitOrderUpdated,
} from '../utils/orderStatus.js';

const getProductsMap = async (orderItems) => {
  const productIds = orderItems.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });
  return Object.fromEntries(products.map((p) => [p._id.toString(), p]));
};

// @desc    Get public shipping config from env
// @route   GET /api/shipping/config
// @access  Public
export const getShippingConfig = async (req, res) => {
  const config = getShiprocketConfig();
  const status = getShiprocketConfigStatus();
  res.json({
    freeShippingThreshold: config.freeShippingThreshold,
    shiprocketEnabled: status.configured,
    configured: status.configured,
    missingCredentials: status.missing,
    apiEmail: config.email ? `${config.email.slice(0, 3)}***` : null,
    pickupLocation: config.pickupLocation,
    pickupPincode: config.pickupPincode,
    trackingPageUrl: config.trackingPageUrl || getTrackingPageUrl(),
  });
};

// @desc    Manually sync an existing order to Shiprocket (admin retry)
// @route   POST /api/shipping/orders/:id/sync
// @access  Private/Admin
export const syncOrderToShiprocketHandler = async (req, res) => {
  try {
    if (!isShiprocketConfigured()) {
      return res.status(503).json({ message: 'Shiprocket is not configured' });
    }

    const order = await Order.findById(req.params.id).populate('orderItems.product');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const user = await User.findById(order.user);
    const productsById = await getProductsMap(order.orderItems);
    const result = await syncOrderToShiprocket(order, user?.email, productsById);

    if (result.shiprocketOrderId) {
      order.shiprocketOrderId = result.shiprocketOrderId;
      if (result.shipmentId) order.shiprocketShipmentId = result.shipmentId;
      if (result.channelOrderId) order.shiprocketChannelOrderId = result.channelOrderId;
      order.shippingStatus = 'Created in Shiprocket';
      order.shiprocketSyncedAt = new Date();
      order.shipmentError = undefined;
      order.trackingUrl = buildCustomerTrackingUrl(order);
      await order.save();
      await emitOrderUpdated(order._id);
    }

    const populated = await Order.findById(order._id).populate('user', 'id name email').populate('orderItems.product');
    res.json({ message: 'Order synced to Shiprocket', result, order: populated });
  } catch (error) {
    console.error('Error syncing order to Shiprocket:', error);
    try {
      const order = await Order.findById(req.params.id);
      if (order) {
        order.shipmentError = error.message;
        if (error.shiprocketOrderId) order.shiprocketOrderId = String(error.shiprocketOrderId);
        await order.save();
      }
    } catch (_) { /* ignore */ }
    res.status(500).json({ message: error.message || 'Failed to sync order to Shiprocket' });
  }
};

// @desc    Cancel an order in Shiprocket (admin retry or manual)
// @route   POST /api/shipping/orders/:id/cancel
// @access  Private/Admin
export const cancelShiprocketOrderHandler = async (req, res) => {
  try {
    if (!isShiprocketConfigured()) {
      return res.status(503).json({ message: 'Shiprocket is not configured' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!order.shiprocketOrderId) {
      return res.status(400).json({ message: 'Order was never synced to Shiprocket' });
    }

    if (order.shiprocketCancelledAt) {
      return res.status(400).json({ message: 'Order already cancelled in Shiprocket', order });
    }

    const result = await cancelOrderOnShiprocket(order);

    if (result.cancelled) {
      order.shippingStatus = 'Cancelled in Shiprocket';
      order.shiprocketCancelledAt = new Date();
      order.shipmentError = undefined;
      await order.save();
      await emitOrderUpdated(order._id);
    }

    const populated = await Order.findById(order._id).populate('user', 'id name email').populate('orderItems.product');
    res.json({ message: result.message || 'Order cancelled in Shiprocket', result, order: populated });
  } catch (error) {
    console.error('Error cancelling order in Shiprocket:', error);
    try {
      const order = await Order.findById(req.params.id);
      if (order) {
        order.shipmentError = error.message;
        await order.save();
      }
    } catch (_) { /* ignore */ }
    res.status(500).json({ message: error.message || 'Failed to cancel order in Shiprocket' });
  }
};

// @desc    Get shipping rates for checkout
// @route   POST /api/shipping/rates
// @access  Private
export const getShippingRates = async (req, res) => {
  try {
    const { postalCode, paymentMethod = 'Online' } = req.body;

    if (!postalCode) {
      return res.status(400).json({ message: 'Delivery pincode is required' });
    }

    const Cart = (await import('../models/Cart.js')).default;
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const orderItems = cart.items
      .filter((item) => item.product)
      .map((item) => ({
        product: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      }));

    const itemsPrice = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const productsById = Object.fromEntries(
      cart.items.filter((i) => i.product).map((i) => [i.product._id.toString(), i.product])
    );

    const freeShippingThreshold = getFreeShippingThreshold();
    const isFree = isFreeShippingEligible(itemsPrice, freeShippingThreshold);

    if (!isShiprocketConfigured()) {
      const status = getShiprocketConfigStatus();
      return res.json({
        itemsPrice,
        shippingPrice: 0,
        isShippingFree: isFree,
        freeShippingThreshold,
        totalPrice: itemsPrice,
        shiprocketEnabled: false,
        missingCredentials: status.missing,
        message: isFree
          ? `Complimentary shipping on orders over ₹${freeShippingThreshold}`
          : 'Shipping calculated at checkout',
      });
    }

    const rates = await getShippingRate({
      deliveryPincode: postalCode,
      itemsPrice,
      paymentMethod,
      orderItems,
      productsById,
    });

    res.json({
      ...rates,
      totalPrice: itemsPrice + rates.shippingPrice,
      shiprocketEnabled: true,
    });
  } catch (error) {
    console.error('Error in getShippingRates:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch shipping rates' });
  }
};

// @desc    Create Shiprocket shipment for an order (full flow)
// @route   POST /api/shipping/orders/:id/ship
// @access  Private/Admin
export const createShipment = async (req, res) => {
  try {
    if (!isShiprocketConfigured()) {
      const status = getShiprocketConfigStatus();
      return res.status(503).json({
        message: `Shiprocket API credentials missing: ${status.missing.join(', ')}. Add them to your backend .env and restart the server.`,
        missing: status.missing,
      });
    }

    const order = await Order.findById(req.params.id).populate('orderItems.product');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.deliveryStatus === 'Cancelled') {
      return res.status(400).json({ message: 'Cannot ship a cancelled order' });
    }

    if (order.awbCode) {
      return res.status(400).json({ message: 'Shipment already created for this order', order });
    }

    const user = await User.findById(order.user);
    const productsById = await getProductsMap(order.orderItems);

    const shipment = await createFullShipment(order, user?.email, productsById);

    order.shiprocketOrderId = String(shipment.shiprocketOrderId);
    order.shiprocketShipmentId = String(shipment.shipmentId);
    order.awbCode = shipment.awbCode;
    order.courierName = shipment.courierName;
    order.courierId = shipment.courierId;
    order.trackingUrl = buildCustomerTrackingUrl({
      ...order.toObject(),
      awbCode: shipment.awbCode,
      shiprocketShipmentId: shipment.shipmentId,
      shiprocketOrderId: shipment.shiprocketOrderId,
    });
    order.labelUrl = shipment.labelUrl;
    order.manifestUrl = shipment.manifestUrl;
    order.invoiceUrl = shipment.invoiceUrl;
    order.shipmentCreatedAt = new Date();
    order.pickupScheduledAt = new Date();
    order.shipmentError = undefined;
    order.shippingStatus = 'Pickup Scheduled';
    order.deliveryStatus = 'Dispatched';
    order.dispatchedAt = order.dispatchedAt || new Date();

    await order.save();
    await emitOrderUpdated(order._id);

    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'id name email')
      .populate('orderItems.product');

    res.json({
      message: 'Shipment created successfully via Shiprocket',
      shipment,
      order: populatedOrder,
    });
  } catch (error) {
    console.error('Error in createShipment:', error);

    try {
      const order = await Order.findById(req.params.id);
      if (order) {
        order.shipmentError = error.message;
        if (error.shiprocketOrderId && !order.shiprocketOrderId) {
          order.shiprocketOrderId = error.shiprocketOrderId;
        }
        await order.save();
      }
    } catch (saveErr) {
      console.error('Failed to save shipment error:', saveErr);
    }

    res.status(500).json({ message: error.message || 'Failed to create shipment' });
  }
};

// @desc    Assign AWB only (Shiprocket: POST /courier/assign/awb)
// @route   POST /api/shipping/generate-awb  body: { orderId }
// @route   POST /api/shipping/orders/:id/generate-awb
// @access  Private/Admin
export const generateAWBHandler = async (req, res) => {
  try {
    if (!isShiprocketConfigured()) {
      return res.status(503).json({ message: 'Shiprocket is not configured' });
    }

    const orderId = req.params.id || req.body.orderId;
    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }

    const order = await Order.findById(orderId).populate('orderItems.product');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.deliveryStatus === 'Cancelled') {
      return res.status(400).json({ message: 'Cannot generate AWB for a cancelled order' });
    }

    const productsById = await getProductsMap(order.orderItems);
    const awb = await generateAWBForOrder(order, productsById);

    order.awbCode = awb.awbCode;
    order.courierName = awb.courierName;
    order.courierId = awb.courierId;
    order.trackingUrl = buildCustomerTrackingUrl(order);
    order.shiprocketShipmentId = awb.shipmentId;
    order.shipmentError = undefined;
    order.shippingStatus = order.shippingStatus || 'AWB Assigned';

    await order.save();
    await emitOrderUpdated(order._id);

    const populated = await Order.findById(order._id).populate('user', 'id name email').populate('orderItems.product');
    res.json({
      message: 'AWB generated successfully',
      awb,
      order: populated,
    });
  } catch (error) {
    console.error('Error in generateAWBHandler:', error);
    res.status(500).json({ message: error.message || 'Failed to generate AWB' });
  }
};

// @desc    Track by Shiprocket shipment ID (Shiprocket: GET /courier/track/shipment/{id})
// @route   GET /api/shipping/track/:shipmentId
// @access  Private
export const trackShipmentHandler = async (req, res) => {
  try {
    if (!isShiprocketConfigured()) {
      return res.status(503).json({ message: 'Shiprocket is not configured' });
    }

    const { shipmentId } = req.params;
    if (!shipmentId) {
      return res.status(400).json({ message: 'shipmentId is required' });
    }

    const trackingData = await trackByShipmentId(shipmentId);
    const parsed = parseTrackingResponse(trackingData);

    res.json({
      shipmentId,
      tracking: {
        currentStatus: parsed.currentStatus,
        trackingUrl: parsed.trackingUrl,
        history: parsed.history,
        raw: trackingData,
      },
    });
  } catch (error) {
    console.error('Error in trackShipmentHandler:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch shipment tracking' });
  }
};

const buildPublicTrackingPayload = (parsed, extras = {}) => ({
  currentStatus: parsed.currentStatus || null,
  awbCode: extras.awbCode || null,
  courierName: extras.courierName || null,
  channelOrderId: extras.channelOrderId || null,
  deliveryStatus: extras.deliveryStatus || null,
  trackedVia: extras.trackedVia || null,
  brandedTrackingUrl: extras.brandedTrackingUrl || null,
  history: parsed.history || [],
});

// @desc    Public tracking lookup by RAKA order ID or AWB (no login required)
// @route   GET /api/shipping/track-public?order_id=RAKA-xxx&awb=xxx
// @access  Public
export const publicTrackHandler = async (req, res) => {
  try {
    const orderIdInput = req.query.order_id || req.query.orderId;
    const awbInput = req.query.awb;

    if (!orderIdInput && !awbInput) {
      return res.status(400).json({ message: 'Provide order_id or awb to track your shipment.' });
    }

    if (!isShiprocketConfigured()) {
      return res.status(503).json({ message: 'Tracking is temporarily unavailable. Please try again later.' });
    }

    if (awbInput?.trim()) {
      const awb = awbInput.trim();
      const data = await trackByAWB(awb);
      const parsed = parseTrackingResponse(data);
      return res.json({
        searchBy: 'awb',
        ...buildPublicTrackingPayload(parsed, {
          awbCode: awb,
          trackedVia: 'courier/track/awb',
          brandedTrackingUrl: buildBrandedTrackingUrl({ awb }),
        }),
      });
    }

    const channelId = normalizeChannelOrderId(orderIdInput);
    if (!channelId) {
      return res.status(400).json({ message: 'Invalid order ID format.' });
    }

    const brandedTrackingUrl = buildBrandedTrackingUrl({ orderId: channelId });
    const order = await resolveOrderFromChannelId(channelId);

    if (order?.deliveryStatus === 'Cancelled') {
      return res.status(400).json({ message: 'This order has been cancelled.' });
    }

    let live = null;

    if (order) {
      if (!order.awbCode && !order.shiprocketShipmentId && !order.shiprocketOrderId) {
        return res.status(404).json({
          message: 'Your order is confirmed but not shipped yet. Tracking will be available once dispatched.',
          brandedTrackingUrl,
        });
      }
      live = await fetchLiveTracking(order);
    }

    if (!live) {
      try {
        const data = await trackByChannelOrderId(channelId);
        live = { source: 'channel_order', data };
      } catch (apiErr) {
        if (!order) {
          return res.status(404).json({
            message: 'Order not found. Please check your order ID.',
            brandedTrackingUrl,
          });
        }
        throw apiErr;
      }
    }

    const parsed = parseTrackingResponse(live.data);
    return res.json({
      searchBy: 'order_id',
      ...buildPublicTrackingPayload(parsed, {
        awbCode: order?.awbCode || null,
        courierName: order?.courierName || null,
        channelOrderId: channelId,
        deliveryStatus: order?.deliveryStatus || null,
        trackedVia: live.source,
        brandedTrackingUrl,
      }),
    });
  } catch (error) {
    console.error('Error in publicTrackHandler:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch tracking' });
  }
};

// @desc    Get live tracking for a Raka order (uses AWB, or shipment ID as fallback)
// @route   GET /api/shipping/orders/:id/track
// @access  Private
export const getOrderTracking = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('orderItems.product');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!order.awbCode && !order.shiprocketShipmentId && !order.shiprocketOrderId) {
      return res.json({
        order,
        tracking: null,
        trackingPageUrl: getTrackingPageUrl(),
        message: 'Order not synced to Shiprocket yet. Admin must sync the order first.',
      });
    }

    if (!isShiprocketConfigured()) {
      return res.json({
        order,
        tracking: {
          awbCode: order.awbCode,
          shipmentId: order.shiprocketShipmentId,
          courierName: order.courierName,
          trackingUrl: order.trackingUrl || buildCustomerTrackingUrl(order),
          history: order.trackingHistory || [],
        },
        trackingPageUrl: getTrackingPageUrl(),
      });
    }

    const live = await fetchLiveTracking(order);
    if (!live) {
      return res.json({
        order,
        tracking: null,
        message: 'No tracking reference found on this order.',
      });
    }

    const { currentStatus, history, trackingUrl } = await applyShiprocketTrackingToOrder(order, live.data);

    res.json({
      order,
      tracking: {
        awbCode: order.awbCode,
        shipmentId: order.shiprocketShipmentId,
        courierName: order.courierName,
        trackingUrl: order.trackingUrl || buildCustomerTrackingUrl(order) || trackingUrl,
        currentStatus: order.shippingStatus || currentStatus,
        trackedVia: live.source,
        history: order.trackingHistory || history,
        raw: live.data,
      },
      trackingPageUrl: getTrackingPageUrl(),
    });
  } catch (error) {
    console.error('Error in getOrderTracking:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch tracking' });
  }
};

const authorizeOrderAccess = (order, user) => {
  if (!order || !user) return false;
  if (user.isAdmin) return true;
  const orderUserId = order.user?._id?.toString() || order.user?.toString();
  return orderUserId === user._id.toString();
};

// @desc    Get or generate Shiprocket invoice PDF URL (Shiprocket: POST /orders/print/invoice)
// @route   GET /api/shipping/orders/:id/invoice
// @access  Private (order owner or admin)
export const getOrderInvoiceHandler = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'id name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!authorizeOrderAccess(order, req.user)) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!isShiprocketConfigured()) {
      return res.status(503).json({ message: 'Shiprocket is not configured' });
    }

    if (!order.shiprocketOrderId) {
      return res.status(400).json({
        message: 'Invoice not available yet. Order must be synced to Shiprocket first.',
      });
    }

    let invoiceUrl = order.invoiceUrl;
    if (!invoiceUrl) {
      const result = await fetchOrderInvoice(order);
      invoiceUrl = result.invoiceUrl;
      order.invoiceUrl = invoiceUrl;
      await order.save();
      await emitOrderUpdated(order._id);
    }

    const populated = await Order.findById(order._id)
      .populate('user', 'id name email')
      .populate('orderItems.product');

    res.json({
      message: 'Invoice ready',
      invoiceUrl,
      order: populated,
    });
  } catch (error) {
    console.error('Error in getOrderInvoiceHandler:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch invoice' });
  }
};

// @desc    Get or generate Shiprocket manifest PDF URL (admin only)
// @route   GET /api/shipping/orders/:id/manifest
// @access  Private/Admin
export const getOrderManifestHandler = async (req, res) => {
  try {
    if (!isShiprocketConfigured()) {
      return res.status(503).json({ message: 'Shiprocket is not configured' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!order.shiprocketOrderId) {
      return res.status(400).json({ message: 'Order is not synced to Shiprocket yet.' });
    }

    let manifestUrl = order.manifestUrl;
    if (!manifestUrl) {
      const result = await fetchOrderManifest(order);
      manifestUrl = result.manifestUrl;
      order.manifestUrl = manifestUrl;
      await order.save();
      await emitOrderUpdated(order._id);
    }

    res.json({ message: 'Manifest ready', manifestUrl, order });
  } catch (error) {
    console.error('Error in getOrderManifestHandler:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch manifest' });
  }
};
