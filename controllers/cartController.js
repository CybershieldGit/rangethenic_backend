import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { getReservedStock, getReservedStocksForProducts } from '../utils/stockHelper.js';
import { getIO } from '../utils/socket.js';

/**
 * Recalculates and broadcasts the dynamic reservedCount and stock of a product via Socket.io
 * @param {string} productId 
 */
const broadcastProductStock = async (productId) => {
  try {
    const product = await Product.findById(productId);
    if (product) {
      const reservedCount = await getReservedStock(productId);
      const productObj = product.toObject();
      productObj.reservedCount = reservedCount;
      
      const io = getIO();
      if (io) {
        io.emit('productUpdated', productObj);
        console.log(`WebSocket: Broadcasted productUpdated for product ${productId}, reservedCount: ${reservedCount}`);
      }
    }
  } catch (err) {
    console.error(`Failed to broadcast stock for product ${productId}:`, err);
  }
};

const getUserCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (cart) {
      // Check if any product is null (deleted product)
      const hasDeletedProducts = cart.items.some(item => item.product === null);
      if (hasDeletedProducts) {
        const rawCart = await Cart.findOne({ user: req.user._id });
        if (rawCart) {
          const activeItemIds = cart.items
            .filter(item => item.product !== null)
            .map(item => item._id.toString());
          rawCart.items = rawCart.items.filter(item => activeItemIds.includes(item._id.toString()));
          await rawCart.save();
          
          // Return the populated version of clean cart
          const cleanCart = await Cart.findOne({ user: req.user._id }).populate('items.product');
          
          const cleanProductIds = cleanCart.items.filter(item => item.product).map(item => item.product._id);
          const cleanReservedMap = await getReservedStocksForProducts(cleanProductIds);
          const cleanCartObj = cleanCart.toObject();
          cleanCartObj.items.forEach(item => {
            if (item.product) {
              item.product.reservedCount = cleanReservedMap[item.product._id.toString()] || 0;
            }
          });
          return res.json(cleanCartObj);
        }
      }

      const productIds = cart.items.filter(item => item.product).map(item => item.product._id);
      const reservedMap = await getReservedStocksForProducts(productIds);
      const cartObj = cart.toObject();
      cartObj.items.forEach(item => {
        if (item.product) {
          item.product.reservedCount = reservedMap[item.product._id.toString()] || 0;
        }
      });
      res.json(cartObj);
    } else {
      res.json({ user: req.user._id, items: [] });
    }
  } catch (error) {
    console.error('Error in getUserCart:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Dynamic stock validation: calculate reserved quantity excluding user's own current quantity
    const totalReserved = await getReservedStock(productId);
    
    let cart = await Cart.findOne({ user: req.user._id });
    let ownQty = 0;
    if (cart) {
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );
      if (itemIndex > -1) {
        ownQty = cart.items[itemIndex].quantity;
      }
    }

    const availableStockForUser = product.countInStock - (totalReserved - ownQty);

    if (availableStockForUser <= 0) {
      return res.status(400).json({ message: `"${product.name}" is out of stock (reserved in other carts)` });
    }

    if (cart) {
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (itemIndex > -1) {
        const newQty = ownQty + quantity;
        if (newQty > availableStockForUser) {
          return res.status(400).json({ message: `Only ${Math.max(0, availableStockForUser)} available in stock` });
        }
        cart.items[itemIndex].quantity = newQty;
      } else {
        if (quantity > availableStockForUser) {
          return res.status(400).json({ message: `Only ${Math.max(0, availableStockForUser)} available in stock` });
        }
        cart.items.push({ product: productId, quantity });
      }
      cart = await cart.save();
    } else {
      if (quantity > availableStockForUser) {
        return res.status(400).json({ message: `Only ${Math.max(0, availableStockForUser)} available in stock` });
      }
      cart = await Cart.create({
        user: req.user._id,
        items: [{ product: productId, quantity }],
      });
    }

    // Broadcast stock updates dynamically
    await broadcastProductStock(productId);

    res.status(201).json(cart);
  } catch (error) {
    console.error('Error in addToCart:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:productId
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const productId = req.params.productId;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex > -1) {
      const ownQty = cart.items[itemIndex].quantity;
      const totalReserved = await getReservedStock(productId);
      const availableStockForUser = product.countInStock - (totalReserved - ownQty);

      if (quantity > availableStockForUser) {
        return res.status(400).json({ message: `Only ${Math.max(0, availableStockForUser)} available in stock` });
      }

      cart.items[itemIndex].quantity = quantity;
      await cart.save();

      // Broadcast stock updates dynamically
      await broadcastProductStock(productId);

      res.json(cart);
    } else {
      res.status(404).json({ message: 'Item not found in cart' });
    }
  } catch (error) {
    console.error('Error in updateCartItem:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    const productId = req.params.productId;
    const cart = await Cart.findOne({ user: req.user._id });

    if (cart) {
      cart.items = cart.items.filter(
        (item) => item.product.toString() !== productId
      );
      await cart.save();

      // Broadcast stock updates dynamically
      await broadcastProductStock(productId);

      res.json(cart);
    } else {
      res.status(404).json({ message: 'Cart not found' });
    }
  } catch (error) {
    console.error('Error in removeFromCart:', error);
    res.status(500).json({ message: error.message });
  }
};

export { getUserCart, addToCart, updateCartItem, removeFromCart };
