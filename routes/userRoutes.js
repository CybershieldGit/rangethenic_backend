import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
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
  .route('/addresses')
  .get(protect, getUserAddresses)
  .post(protect, addUserAddress);

router
  .route('/addresses/:addressId')
  .put(protect, updateUserAddress)
  .delete(protect, deleteUserAddress);

router
  .route('/wishlist')
  .get(protect, getUserWishlist)
  .post(protect, addToWishlist)
  .delete(protect, clearWishlist);

router
  .route('/wishlist/:productId')
  .delete(protect, removeFromWishlist);

export default router;
