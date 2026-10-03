import cron from 'node-cron';
import { crawlLatestFloodNews } from './newsCrawler';

export function initScheduledCrawler() {
  // Run hourly at minute 0 and pre-rush hours (05:30, 11:30, 15:30)
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ [CRON] Starting scheduled hourly flood news crawl from VnExpress, Tuổi Trẻ, Thanh Niên...');
    try {
      const result = await crawlLatestFloodNews();
      console.log(`✅ [CRON] Completed scheduled crawl: ${result.newArticlesCount} new articles found, ${result.newlyDetectedFloods} new flood hotspots extracted.`);
    } catch (err: any) {
      console.error('❌ [CRON] Scheduled crawl failed:', err.message);
    }
  });

  cron.schedule('30 5,11,15 * * *', async () => {
    console.log('⏰ [CRON] Starting pre-rush hour flood weather & news sync...');
    try {
      const result = await crawlLatestFloodNews();
      console.log(`✅ [CRON] Pre-rush hour crawl complete: ${result.newlyDetectedFloods} active flood hotspots.`);
    } catch (err: any) {
      console.error('❌ [CRON] Pre-rush hour crawl failed:', err.message);
    }
  });

  console.log('🕒 Automated news crawler scheduled (hourly + pre-rush hours at 05:30, 11:30, 15:30).');
}
