import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getUserWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router
  .route('/wishlist')
  .get(protect, getUserWishlist)
  .post(protect, addToWishlist)
  .delete(protect, clearWishlist);

router
  .route('/wishlist/:productId')
  .delete(protect, removeFromWishlist);

export default router;
