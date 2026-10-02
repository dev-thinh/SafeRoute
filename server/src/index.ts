import { createApp } from './app';
import { ENV } from './config/env';
import { initScheduledCrawler } from './services/cronService';
import { seedInitialFloodEvents, syncArticlesFromDb } from './services/newsCrawler';
import { initDb } from './db/initDb';

const app = createApp();

app.listen(ENV.PORT, async () => {
  console.log(`🌊 SafeRoute backend running at http://localhost:${ENV.PORT}`);
  // Initialize database connection and PostGIS schema
  await initDb();
  // Synchronize historical articles from PostgreSQL
  await syncArticlesFromDb();
  // Seed initial flood events from news archive
  seedInitialFloodEvents();
  // Initialize daily automated flood news crawler
  initScheduledCrawler();
});
