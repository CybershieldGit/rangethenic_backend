import express from 'express';
import {
  getAttributes,
  createAttribute,
  deleteAttribute,
} from '../controllers/attributeController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAttributes);
router.post('/', protect, admin, createAttribute);
router.delete('/:id', protect, admin, deleteAttribute);

export default router;
