import express from 'express';
import {
  getGalleryVideos,
  createGalleryVideo,
  deleteGalleryVideo,
} from '../controllers/galleryVideoController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getGalleryVideos);
router.post('/', protect, admin, createGalleryVideo);
router.delete('/:id', protect, admin, deleteGalleryVideo);

export default router;
