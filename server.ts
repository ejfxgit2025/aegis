import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';

// Aegis Engine Imports
import { startWorker } from './server/agent/worker.ts';
import { apiRouter }  from './server/routes/api.ts';

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// Mount Aegis API Routes
// ─────────────────────────────────────────────────────────────────────────────

app.use('/api', apiRouter);

// ─────────────────────────────────────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────────────────────────────────────

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  return res.status(500).json({ success: false, error: err.message });
});

// ─────────────────────────────────────────────────────────────────────────────
// Vite & Static configuration
// ─────────────────────────────────────────────────────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);

    // Boot the Aegis Execution Engine.
    // The worker idles safely until the user creates at least one active rule —
    // shouldRunEngine() in tick() guards against any payments firing on startup.
    startWorker();

    console.log('[Server] 🛡  Aegis ready — system is idle until a rule is created.');
  });
}

startServer();
