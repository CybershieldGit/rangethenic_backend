import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { getIO } from '../utils/socket.js';
import {
  isShiprocketConfigured,
  getShippingRate,
  createFullShipment,
  trackByAWB,
  trackByShipmentId,
  fetchLiveTracking,
  generateAWBForOrder,
  parseTrackingResponse,
  getFreeShippingThreshold,
  getShiprocketConfig,
  getShiprocketConfigStatus,
  isFreeShippingEligible,
  syncOrderToShiprocket,
  cancelOrderOnShiprocket,
  fetchOrderInvoice,
  fetchOrderManifest,
} from '../utils/shiprocket.js';

const emitOrderUpdate = async (orderId) => {
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
    console.error('Error emitting order update:', error);
  }
};

const getProductsMap = async (orderItems) => {
  const productIds = orderItems.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });
  return Object.fromEntries(products.map((p) => [p._id.toString(), p]));
};

const applyTrackingToOrder = async (order, trackingData) => {
  const { currentStatus, history, trackingUrl } = parseTrackingResponse(trackingData);

  order.shippingStatus = currentStatus || order.shippingStatus;
  order.trackingHistory = history.length ? history : order.trackingHistory;
  if (trackingUrl && !order.trackingUrl) order.trackingUrl = trackingUrl;

  const mappedStatus = mapShiprocketStatusToDelivery(currentStatus);
  if (mappedStatus === 'Delivered' && order.deliveryStatus !== 'Delivered') {
    order.deliveryStatus = 'Delivered';
    order.deliveredAt = new Date();
    if (order.paymentMethod === 'COD') {
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentStatus = 'Success';
    }
  } else if (mappedStatus === 'Dispatched' && order.deliveryStatus === 'Placed') {
    order.deliveryStatus = 'Dispatched';
    order.dispatchedAt = new Date();
  }

  await order.save();
  await emitOrderUpdate(order._id);
  return { currentStatus, history, trackingUrl };
};

const mapShiprocketStatusToDelivery = (status = '') => {
  const normalized = String(status).toLowerCase();
  if (normalized.includes('deliver')) return 'Delivered';
  if (
    normalized.includes('dispatch') ||
    normalized.includes('transit') ||
    normalized.includes('pickup') ||
    normalized.includes('shipped') ||
    normalized.includes('out for')
  ) {
    return 'Dispatched';
  }
  return null;
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
      await order.save();
      await emitOrderUpdate(order._id);
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
      await emitOrderUpdate(order._id);
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
    order.trackingUrl = shipment.trackingUrl;
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
    await emitOrderUpdate(order._id);

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
    order.trackingUrl = awb.trackingUrl;
    order.shiprocketShipmentId = awb.shipmentId;
    order.shipmentError = undefined;
    order.shippingStatus = order.shippingStatus || 'AWB Assigned';

    await order.save();
    await emitOrderUpdate(order._id);

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

    if (!order.awbCode && !order.shiprocketShipmentId) {
      return res.json({
        order,
        tracking: null,
        message: 'Order not synced to Shiprocket yet. Admin must sync and ship the order first.',
      });
    }

    if (!isShiprocketConfigured()) {
      return res.json({
        order,
        tracking: {
          awbCode: order.awbCode,
          shipmentId: order.shiprocketShipmentId,
          courierName: order.courierName,
          trackingUrl: order.trackingUrl,
          history: order.trackingHistory || [],
        },
      });
    }

    const live = await fetchLiveTracking(order);
    const { currentStatus, history, trackingUrl } = await applyTrackingToOrder(order, live.data);

    res.json({
      order,
      tracking: {
        awbCode: order.awbCode,
        shipmentId: order.shiprocketShipmentId,
        courierName: order.courierName,
        trackingUrl: order.trackingUrl || trackingUrl,
        currentStatus: order.shippingStatus || currentStatus,
        trackedVia: live.source,
        history: order.trackingHistory || history,
        raw: live.data,
      },
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
      await emitOrderUpdate(order._id);
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
      await emitOrderUpdate(order._id);
    }

    res.json({ message: 'Manifest ready', manifestUrl, order });
  } catch (error) {
    console.error('Error in getOrderManifestHandler:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch manifest' });
  }
};
