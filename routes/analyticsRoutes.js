import express from 'express';
import {
  getDashboardAnalytics,
  getProductAnalytics,
  logAdminAction,
  getAdminLogs,
} from '../controllers/analyticsController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard', protect, admin, getDashboardAnalytics);
router.get('/products', protect, admin, getProductAnalytics);
router.post('/activity', protect, admin, logAdminAction);
router.get('/activity', protect, admin, getAdminLogs);

export default router;
