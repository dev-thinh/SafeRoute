import { createApp } from './app';
import { ENV } from './config/env';

const app = createApp();

app.listen(ENV.PORT, () => {
  console.log(`🌊 SafeRoute backend running at http://localhost:${ENV.PORT}`);
});
