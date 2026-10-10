import { pool } from './pool';
import { isDbConnected } from './initDb';
import { ScrapedArticle } from '../services/newsCrawler';

export function selectArticlesNeedingGeminiReanalysis(
  articles: ScrapedArticle[],
  limit: number = 10
): ScrapedArticle[] {
  return articles
    .filter(
      (article) =>
        article.needsGeminiReanalysis === true &&
        article.extractionProvider !== 'gemini' &&
        (article.geminiReanalysisAttempts || 0) < 3
    )
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);
}

/**
 * Saves a scraped article to PostgreSQL (or in-memory fallback).
 */
export async function saveArticle(article: ScrapedArticle): Promise<void> {
  if (isDbConnected) {
    try {
      await pool.query(
        `INSERT INTO news_articles 
          (id, url, title, content, published_at, is_parsed, raw_ai_response, created_at)
         VALUES 
          (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (url) DO UPDATE 
         SET title = EXCLUDED.title, content = EXCLUDED.content, is_parsed = EXCLUDED.is_parsed, raw_ai_response = EXCLUDED.raw_ai_response`,
        [
          article.url,
          article.title,
          article.contentSnippet,
          new Date(article.publishedAt),
          true,
          JSON.stringify({
            summary: article.summary,
            cause: article.cause,
            source: article.source,
            extractedLocations: article.extractedLocations,
            extractionProvider: article.extractionProvider,
            extractionModel: article.extractionModel,
            extractionQuality: article.extractionQuality,
            needsGeminiReanalysis: article.needsGeminiReanalysis,
            geminiReanalysisAttempts: article.geminiReanalysisAttempts || 0,
          }),
          new Date(article.crawledAt),
        ]
      );
    } catch (err: any) {
      console.warn('Failed to insert news article into PostgreSQL:', err.message);
    }
  }
}

/**
 * Fetches all news articles from PostgreSQL (or in-memory fallback).
 */
export async function getArticles(fallbackArticles: ScrapedArticle[]): Promise<ScrapedArticle[]> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT id, url, title, content, published_at as "publishedAt", raw_ai_response as "rawAiResponse", created_at as "createdAt"
         FROM news_articles 
         ORDER BY published_at DESC 
         LIMIT 50`
      );
      if (res.rows.length > 0) {
        return res.rows.map((r: any) => {
          const ai = r.rawAiResponse || {};
          return {
            id: r.id,
            source: ai.source || 'Tin tức',
            title: r.title,
            url: r.url,
            publishedAt: new Date(r.publishedAt).toISOString(),
            crawledAt: new Date(r.createdAt).toISOString(),
            summary: ai.summary || r.content,
            cause: ai.cause || 'combined',
            extractedLocations: ai.extractedLocations || [],
            contentSnippet: r.content,
            extractionProvider: ai.extractionProvider,
            extractionModel: ai.extractionModel,
            extractionQuality: ai.extractionQuality,
            needsGeminiReanalysis: Boolean(ai.needsGeminiReanalysis),
            geminiReanalysisAttempts: ai.geminiReanalysisAttempts || 0,
          };
        });
      }
    } catch (err: any) {
      console.warn('Failed to read news articles from PostgreSQL:', err.message);
    }
  }

  return fallbackArticles;
}
