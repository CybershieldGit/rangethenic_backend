import express from 'express';
import {
  getUserCart,
  addToCart,
  updateCartItem,
  removeFromCart,
} from '../controllers/cartController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getUserCart).post(protect, addToCart);
router.route('/:productId').put(protect, updateCartItem).delete(protect, removeFromCart);

export default router;
