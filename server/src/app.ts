import express from 'express';
import cors from 'cors';
import { routesRouter } from './routes/routesRouter';
import { floodsRouter } from './routes/floodsRouter';
import { reportsRouter } from './routes/reportsRouter';
import { adminRouter } from './routes/adminRouter';
import { geocodingRouter } from './routes/geocodingRouter';
import { newsRouter } from './routes/newsRouter';
import { weatherRouter } from './routes/weatherRouter';

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
  app.use('/api/geocoding', geocodingRouter);
  app.use('/api/news', newsRouter);
  app.use('/api/weather', weatherRouter);

  return app;
}
