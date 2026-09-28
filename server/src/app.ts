import express from 'express';
import cors from 'cors';
import { routesRouter } from './routes/routesRouter';
import { floodsRouter } from './routes/floodsRouter';
import { reportsRouter } from './routes/reportsRouter';
import { adminRouter } from './routes/adminRouter';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'SafeRoute Backend' });
  });

  app.use('/api/routes', routesRouter);
  app.use('/api/floods', floodsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/admin', adminRouter);

  return app;
}
