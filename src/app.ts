import express from 'express';
import registry from './metrics/registry.js';
import feeRoutes from './routes/feeRoutes.js';
import { bootstrapTrain, getModel } from './services/trainingService.js';
import { PORT } from './config/index.js';

const app = express();
app.use(express.json());

// Health
app.get('/health', (_req, res) => {
  res.json({ ok: true, modelReady: Boolean(getModel()) });
});

// Metrics
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

// API routes
app.use('/', feeRoutes);

// Bootstrap training, then start server
(async () => {
  try {
    const info = await bootstrapTrain();
    console.log(`Bootstrapped model with samples=${info.samples}, mse=${info.mse}`);
  } catch (e) {
    console.error('Bootstrap failed:', e);
  }

  app.listen(PORT, () => {
    console.log(`Server on :${PORT}`);
  });
})();
