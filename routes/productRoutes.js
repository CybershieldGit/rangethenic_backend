import express from 'express';
import {
  getProducts,
  getProductById,
  getBestProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminProducts,
} from '../controllers/productController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/best', getBestProducts);
router.get('/admin', protect, admin, getAdminProducts);
router.get('/:id', getProductById);

// Admin Routes
router.post('/', protect, admin, createProduct);
router.put('/:id', protect, admin, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

export default router;
