import { Router } from 'express';
import { crawledArticlesStore, crawlLatestFloodNews } from '../services/newsCrawler';
import { getArticles } from '../db/newsRepo';

export const newsRouter = Router();

/**
 * GET /api/news
 * Returns all scraped news articles with extracted flood locations & AI summaries.
 */
newsRouter.get('/', async (_req, res) => {
  try {
    const articles = await getArticles(crawledArticlesStore);
    return res.json({
      total: articles.length,
      articles,
    });
  } catch (err: any) {
    return res.json({
      total: crawledArticlesStore.length,
      articles: crawledArticlesStore,
    });
  }
});

/**
 * POST /api/news/crawl-now
 * Triggers an immediate manual crawl from RSS feeds (VnExpress, Tuổi Trẻ, Thanh Niên)
 * and runs AI extraction on newly found articles.
 */
newsRouter.post('/crawl-now', async (_req, res) => {
  try {
    const result = await crawlLatestFloodNews();
    return res.json({
      success: true,
      message: `Đã hoàn tất cào tin tức ngập lụt. Tìm thấy ${result.newArticlesCount} bài báo mới, trích xuất ${result.newlyDetectedFloods} điểm ngập.`,
      new_articles_count: result.newArticlesCount,
      total_articles_count: result.totalArticlesCount,
      newly_detected_floods: result.newlyDetectedFloods,
      articles: result.articles,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
