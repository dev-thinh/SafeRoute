import cron from 'node-cron';
import { crawlLatestFloodNews } from './newsCrawler';

export function initScheduledCrawler() {
  // Run daily at 06:00 and 16:00 (ahead of daily morning & evening tide cycles)
  cron.schedule('0 6,16 * * *', async () => {
    console.log('⏰ [CRON] Starting scheduled daily flood news crawl from VnExpress, Tuổi Trẻ, Thanh Niên...');
    try {
      const result = await crawlLatestFloodNews();
      console.log(`✅ [CRON] Completed scheduled crawl: ${result.newArticlesCount} new articles found, ${result.newlyDetectedFloods} new flood hotspots extracted.`);
    } catch (err: any) {
      console.error('❌ [CRON] Scheduled crawl failed:', err.message);
    }
  });

  console.log('🕒 Automated daily news crawler scheduled (runs at 06:00 and 16:00 daily).');
}
