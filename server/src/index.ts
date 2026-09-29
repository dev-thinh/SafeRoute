import { createApp } from './app';
import { ENV } from './config/env';
import { initScheduledCrawler } from './services/cronService';

const app = createApp();

app.listen(ENV.PORT, () => {
  console.log(`🌊 SafeRoute backend running at http://localhost:${ENV.PORT}`);
  // Initialize daily automated flood news crawler (06:00 and 16:00)
  initScheduledCrawler();
});
