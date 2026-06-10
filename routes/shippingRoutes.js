import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  getShippingConfig,
  getShippingRates,
  createShipment,
  getOrderTracking,
  generateAWBHandler,
  trackShipmentHandler,
  getOrderInvoiceHandler,
  getOrderManifestHandler,
  syncOrderToShiprocketHandler,
  cancelShiprocketOrderHandler,
  publicTrackHandler,
} from '../controllers/shippingController.js';

const router = express.Router();

router.get('/config', getShippingConfig);
router.get('/track-public', publicTrackHandler);
router.post('/rates', protect, getShippingRates);
router.post('/orders/:id/sync', protect, admin, syncOrderToShiprocketHandler);
router.post('/orders/:id/cancel', protect, admin, cancelShiprocketOrderHandler);
router.post('/generate-awb', protect, admin, generateAWBHandler);
router.post('/orders/:id/generate-awb', protect, admin, generateAWBHandler);
router.post('/orders/:id/ship', protect, admin, createShipment);
router.get('/track/:shipmentId', protect, trackShipmentHandler);
router.get('/orders/:id/track', protect, getOrderTracking);
router.get('/orders/:id/invoice', protect, getOrderInvoiceHandler);
router.get('/orders/:id/manifest', protect, admin, getOrderManifestHandler);

export default router;
