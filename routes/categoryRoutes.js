import express from 'express';
import {
  getCategories,
  createCategory,
  addSubcategory,
  deleteSubcategory,
  deleteCategory,
  updateCategory,
  shiftCategoryProducts,
} from '../controllers/categoryController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getCategories);
router.post('/', protect, admin, createCategory);
router.put('/:id', protect, admin, updateCategory);
router.post('/shift', protect, admin, shiftCategoryProducts);
router.post('/:id/subcategories', protect, admin, addSubcategory);
router.delete('/:id/subcategories', protect, admin, deleteSubcategory);
router.delete('/:id', protect, admin, deleteCategory);

export default router;
