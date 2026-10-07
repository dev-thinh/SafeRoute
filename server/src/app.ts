import express from 'express';
import cors from 'cors';
import { routesRouter } from './routes/routesRouter';
import { floodsRouter } from './routes/floodsRouter';
import { reportsRouter } from './routes/reportsRouter';
import { geocodingRouter } from './routes/geocodingRouter';
import { newsRouter } from './routes/newsRouter';
import { weatherRouter } from './routes/weatherRouter';
import { adminRouter } from './routes/adminRouter';
import { authRouter } from './routes/authRouter';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get(['/api/health', '/health'], (req, res) => {
    res.json({ status: 'ok', service: 'SafeRoute Backend' });
  });

  app.use(['/api/auth', '/auth'], authRouter);
  app.use(['/api/routes', '/routes'], routesRouter);
  app.use(['/api/floods', '/floods'], floodsRouter);
  app.use(['/api/reports', '/reports'], reportsRouter);
  app.use(['/api/geocoding', '/geocoding'], geocodingRouter);
  app.use(['/api/news', '/news'], newsRouter);
  app.use(['/api/weather', '/weather'], weatherRouter);
  app.use(['/api/admin', '/admin'], adminRouter);

  return app;
}
