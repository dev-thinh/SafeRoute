import { createApp } from './app';
import { ENV } from './config/env';
import { initScheduledCrawler } from './services/cronService';
import { seedInitialFloodEvents } from './services/newsCrawler';

const app = createApp();

app.listen(ENV.PORT, () => {
  console.log(`🌊 SafeRoute backend running at http://localhost:${ENV.PORT}`);
  // Seed initial flood events from news archive into memory
  seedInitialFloodEvents();
  // Initialize daily automated flood news crawler (06:00 and 16:00)
  initScheduledCrawler();
});
