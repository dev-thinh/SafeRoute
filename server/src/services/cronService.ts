import cron from 'node-cron';
import { crawlLatestFloodNews, reanalyzeFallbackArticlesWithGemini } from './newsCrawler';

export function initScheduledCrawler() {
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Starting scheduled hourly flood news crawl...');
    try {
      const result = await crawlLatestFloodNews();
      console.log(`[CRON] Scheduled crawl complete: ${result.newArticlesCount} new articles, ${result.newlyDetectedFloods} flood hotspots.`);
    } catch (err: any) {
      console.error('[CRON] Scheduled crawl failed:', err.message);
    }
  });

  cron.schedule('30 5,11,15 * * *', async () => {
    console.log('[CRON] Starting pre-rush hour flood weather & news sync...');
    try {
      const result = await crawlLatestFloodNews();
      console.log(`[CRON] Pre-rush hour crawl complete: ${result.newlyDetectedFloods} active flood hotspots.`);
    } catch (err: any) {
      console.error('[CRON] Pre-rush hour crawl failed:', err.message);
    }
  });

  cron.schedule('*/30 * * * *', async () => {
    console.log('[CRON] Starting Gemini backfill for fallback AI news extractions...');
    try {
      const result = await reanalyzeFallbackArticlesWithGemini(5);
      console.log(`[CRON] Gemini backfill complete: attempted ${result.attempted}, upgraded ${result.upgraded}, skipped ${result.skipped}.`);
    } catch (err: any) {
      console.error('[CRON] Gemini backfill failed:', err.message);
    }
  });

  console.log('[CRON] Automated news crawler scheduled (hourly + pre-rush + Gemini backfill every 30 minutes).');
}
