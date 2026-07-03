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
import attributeRoutes from './routes/attributeRoutes.js';

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

connectDB();

nextApp.prepare().then(() => {
  const app = express();
  const server = http.createServer(app);

  // Initialize Socket.io
  initSocket(server);

  // CORS: allow the configured frontend origin(s). Set CORS_ORIGIN in the backend
  // .env to a comma-separated list of allowed origins, e.g.
  //   CORS_ORIGIN=https://rangethnics.com,https://www.rangethnics.com
  // If CORS_ORIGIN is not set, all origins are reflected (useful in development).
  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const corsOptions = {
    origin(origin, callback) {
      // Allow non-browser requests (curl, server-to-server) that have no Origin.
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  app.use(cors(corsOptions));
  // Ensure preflight (OPTIONS) requests are answered with the CORS headers.
  app.options('*', cors(corsOptions));

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
  app.use('/api/attributes', attributeRoutes);

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

