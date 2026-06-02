import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { getIO } from '../utils/socket.js';

// Initialize Razorpay
const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_API_KEY || !process.env.RAZORPAY_API_SECRET) {
    console.error('Razorpay API keys are missing in environment variables!');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_API_KEY || '',
    key_secret: process.env.RAZORPAY_API_SECRET || '',
  });
};

// Emit WebSocket event with populated order data
const emitOrderUpdate = async (orderId, eventName) => {
  try {
    const io = getIO();
    if (!io) {
      console.warn("Socket.io instance is not initialized yet.");
      return;
    }

    const populatedOrder = await Order.findById(orderId)
      .populate('user', 'id name email')
      .populate('orderItems.product');

    if (populatedOrder) {
      io.emit(eventName, populatedOrder);
      console.log(`WebSocket event emitted: ${eventName} for order ${orderId}`);
    }
  } catch (error) {
    console.error(`Error emitting WebSocket event ${eventName}:`, error);
  }
};

// Emit real-time stock updates for the product items
const emitProductStockUpdates = async (orderItems) => {
  try {
    const io = getIO();
    if (!io) return;

    for (const item of orderItems) {
      const updatedProduct = await Product.findById(item.product);
      if (updatedProduct) {
        io.emit('productUpdated', updatedProduct);
        console.log(`WebSocket: Emitted productUpdated for stock change of product ${updatedProduct._id}`);
      }
    }
  } catch (error) {
    console.error("Error emitting stock update socket events:", error);
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    // 1. Fetch cart of user
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

    if (cart) {
      cart.items = cart.items.filter(item => item.product !== null);
    }

    // 2. Ensure cart is not empty
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // 3. Ensure shipping address is provided
    const { shippingAddress, referralCode, referral, paymentMethod } = req.body;
    if (!shippingAddress) {
      return res.status(400).json({ message: "Shipping address is required" });
    }

    // 4. Validate stock and COD eligibility for all items BEFORE creating order
    for (const item of cart.items) {
      const product = item.product;
      if (product.countInStock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Available: ${product.countInStock}, Requested: ${item.quantity}`,
        });
      }
      if (paymentMethod === 'COD' && product.isCODAllowed === false) {
        return res.status(400).json({
          message: `Cash on Delivery is not allowed for product "${product.name}".`,
        });
      }
    }

    // 5. Convert cart items -> orderItems & calculate totalPrice server-side
    let totalPrice = 0;
    const orderItems = cart.items.map((item) => {
      const itemPrice = item.product.price;
      const itemTotal = itemPrice * item.quantity;
      totalPrice += itemTotal;

      return {
        product: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        price: itemPrice,
      };
    });

    // 6. Save order in MongoDB
    const order = await Order.create({
      user: req.user._id,
      orderItems,
      totalPrice,
      shippingAddress,
      referralCode,
      referral,
      paymentMethod: paymentMethod || 'Online',
      paymentStatus: paymentMethod === 'COD' ? 'COD' : 'Pending',
    });

    // 7. If Cash on Delivery, reduce stock immediately and complete
    if (paymentMethod === 'COD') {
      // Reduce stock for each ordered item
      for (const item of orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { countInStock: -item.quantity },
        });
      }

      // Emit real-time stock updates for the ordered products
      await emitProductStockUpdates(orderItems);

      cart.items = [];
      await cart.save();
 
      // Emit websocket event for new COD order
      await emitOrderUpdate(order._id, 'orderCreated');

      return res.status(201).json({
        message: 'Order created successfully via Cash on Delivery!',
        order,
      });
    }

    // 7. Create Razorpay order
    const razorpayInstance = getRazorpayInstance();
    const options = {
      amount: Math.round(totalPrice * 100), // amount in paise
      currency: 'INR',
      receipt: order._id.toString(),
    };

    let razorpayOrder;
    try {
      razorpayOrder = await razorpayInstance.orders.create(options);
      // Save Razorpay Order ID to the database order
      order.razorpayOrderId = razorpayOrder.id;
      await order.save();
    } catch (razorpayErr) {
      console.error('Razorpay Order Creation Failed:', razorpayErr);
      return res.status(500).json({
        message: 'Failed to create order on payment gateway',
        error: razorpayErr.message,
      });
    }

    // 8. Response with both local order and Razorpay order info
    res.status(201).json({
      message: 'Order created successfully',
      order,
      razorpayOrder,
      razorpayKey: process.env.RAZORPAY_API_KEY,
    });
  } catch (error) {
    console.error('Error in createOrder:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders
// @access  Private
const getUserOrders = async (req, res) => {
  try {
    // Only show confirmed orders: COD orders OR paid online orders
    const orders = await Order.find({
      user: req.user._id,
      $or: [
        { paymentMethod: 'COD' },
        { paymentMethod: 'Online', isPaid: true },
      ]
    })
      .populate('orderItems.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error in getUserOrders:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('orderItems.product');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order belongs to the logged-in user or if the user is an admin
    if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error in getOrderById:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify Razorpay payment signature & update order to paid
// @route   POST /api/orders/:id/pay
// @access  Private
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Payment credentials are required for verification' });
    }

    const order = await Order.findById(req.params.id).populate('orderItems.product');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify payment signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_API_SECRET || '')
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      order.paymentStatus = 'Failed';
      await order.save();
      return res.status(400).json({ message: 'Invalid payment signature. Verification failed.' });
    }

    // Payment is successful
    order.isPaid = true;
    order.paidAt = Date.now();
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.paymentStatus = 'Success';

    // Reduce stock for each ordered item after successful payment
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { countInStock: -item.quantity },
      });
    }

    // Emit real-time stock updates for the ordered products
    await emitProductStockUpdates(order.orderItems);

    // Clear user cart
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    const updatedOrder = await order.save();

    // Emit websocket event for new online order (payment success means order is now confirmed)
    await emitOrderUpdate(updatedOrder._id, 'orderCreated');

    res.json({
      message: 'Payment verified and captured successfully!',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error in verifyPayment:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders (Admin only)
// @route   GET /api/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    // Only show confirmed orders: COD orders OR paid online orders
    const orders = await Order.find({
      $or: [
        { paymentMethod: 'COD' },
        { paymentMethod: 'Online', isPaid: true },
      ]
    }).populate('user', 'id name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error in getAllOrders:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order delivery status and/or payment status (Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderDeliveryStatus = async (req, res) => {
  try {
    const { deliveryStatus, isPaid } = req.body;

    if (deliveryStatus && !['Placed', 'Dispatched', 'Delivered', 'Cancelled'].includes(deliveryStatus)) {
      return res.status(400).json({ message: 'Invalid delivery status value' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (deliveryStatus) {
      order.deliveryStatus = deliveryStatus;
      if (deliveryStatus === 'Dispatched') {
        order.dispatchedAt = Date.now();
      } else if (deliveryStatus === 'Delivered') {
        if (!order.dispatchedAt) {
          order.dispatchedAt = Date.now(); // fallback
        }
        order.deliveredAt = Date.now();
        
        // If it is Cash on Delivery, mark as paid automatically when delivered
        if (order.paymentMethod === 'COD') {
          order.isPaid = true;
          order.paidAt = Date.now();
          order.paymentStatus = 'Success';
        }
      } else if (deliveryStatus === 'Cancelled') {
        order.cancelledAt = Date.now();

        // Restore stock for each item when admin cancels the order
        for (const item of order.orderItems) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { countInStock: item.quantity },
          });
        }

        // Emit real-time stock updates for the restored products
        await emitProductStockUpdates(order.orderItems);
      }
    }

    // Explicitly toggle isPaid (useful for manually marking COD as paid/unpaid)
    if (isPaid !== undefined) {
      order.isPaid = isPaid;
      if (isPaid) {
        order.paidAt = Date.now();
        order.paymentStatus = 'Success';
      } else {
        order.paidAt = undefined;
        order.paymentStatus = order.paymentMethod === 'COD' ? 'COD' : 'Pending';
      }
    }

    const updatedOrder = await order.save();
    // Emit websocket event for order status change
    await emitOrderUpdate(updatedOrder._id, 'orderUpdated');
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error in updateOrderDeliveryStatus:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel an order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const { cancelReason, cancelComments } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify order belongs to logged-in user or user is an admin
    if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(401).json({ message: 'Not authorized to cancel this order' });
    }

    // Can only cancel if order status is 'Placed'
    if (order.deliveryStatus !== 'Placed') {
      return res.status(400).json({ message: `Cannot cancel order in '${order.deliveryStatus}' status` });
    }

    order.deliveryStatus = 'Cancelled';
    order.cancelReason = cancelReason || 'Not Specified';
    order.cancelComments = cancelComments || '';
    order.cancelledAt = Date.now();

    // Restore stock for each item in the cancelled order
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { countInStock: item.quantity },
      });
    }

    // Emit real-time stock updates for the restored products
    await emitProductStockUpdates(order.orderItems);

    const updatedOrder = await order.save();

    // Emit websocket event for order cancellation
    await emitOrderUpdate(updatedOrder._id, 'orderUpdated');

    res.json({ message: 'Order cancelled successfully', order: updatedOrder });
  } catch (error) {
    console.error('Error in cancelOrder:', error);
    res.status(500).json({ message: error.message });
  }
};

export { createOrder, getUserOrders, getOrderById, verifyPayment, getAllOrders, updateOrderDeliveryStatus, cancelOrder };
