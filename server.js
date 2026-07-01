import './config/env.js';
import express from 'express';
import cors from 'cors';
import http from 'http';
import next from 'next';
import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { initSocket } from './utils/socket.js';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import userRoutes from './routes/userRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import shippingRoutes from './routes/shippingRoutes.js';

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

connectDB();

nextApp.prepare().then(() => {
  const app = express();
  const server = http.createServer(app);

  // Initialize Socket.io
  initSocket(server);

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/shipping', shippingRoutes);

  // Let Next.js handle all other requests
  app.all('*', (req, res) => {
    return handle(req, res);
  });

  // Express error handler
  app.use(errorHandler);

  const PORT = process.env.PORT || 5005;

  server.listen(
    PORT,
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
  );
}).catch((err) => {
  console.error('Error preparing Next.js app:', err);
  process.exit(1);
});

