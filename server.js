import './config/env.js';
import http from 'http';
import next from 'next';
import app, { ensureDbConnection } from './app.js';
import { initSocket } from './utils/socket.js';
import { killOrphanedDevWorkers } from './config/devCleanup.js';

// -----------------------------------------------------------------------------
// This file is used for LOCAL development and any traditional (long-running)
// Node host. It wraps the shared Express `app` with the Next.js request handler
// and Socket.io, then listens on a port.
//
// On Vercel this file is NOT executed; the Express `app` is served through the
// serverless bridge at `pages/api/[[...path]].js` instead (Socket.io realtime
// is not available in that serverless environment).
// -----------------------------------------------------------------------------

const dev = process.env.NODE_ENV !== 'production';
const PORT = parseInt(process.env.PORT, 10) || 5005;

// In dev, clear any Next.js dev worker orphaned by a previous nodemon restart
// before preparing a new one (prevents "Another next dev server is already running").
if (dev) {
  killOrphanedDevWorkers(PORT);
}

const nextApp = next({ dev, hostname: 'localhost', port: PORT });
const handle = nextApp.getRequestHandler();

let httpServer;
let shuttingDown = false;

// Gracefully tear down the HTTP server and Next.js app so the dev lock is
// released and the Next dev worker is not left orphaned.
const shutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
    if (typeof nextApp.close === 'function') {
      await nextApp.close();
    }
  } catch {
    // ignore shutdown errors
  } finally {
    process.exit(0);
  }
};

['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'].forEach((signal) => {
  process.on(signal, shutdown);
});

nextApp
  .prepare()
  .then(async () => {
    await ensureDbConnection();

    httpServer = http.createServer(app);

    // Initialize Socket.io on the same HTTP server.
    initSocket(httpServer);

    // Let Next.js handle everything that isn't an Express API route.
    app.all('*', (req, res) => handle(req, res));

    httpServer.listen(PORT, () => {
      console.log(
        `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`,
      );
    });
  })
  .catch((err) => {
    console.error('Error preparing Next.js app:', err);
    process.exit(1);
  });
