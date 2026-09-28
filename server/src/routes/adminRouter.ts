import { Router } from 'express';
import { extractFloodEventsWithGemini } from '../services/geminiExtractor';
import { fetchArticleContent } from '../services/newsCrawler';
import { geocodeStreet } from '../services/geocodingService';
import { inMemoryFloodEvents } from './routesRouter';

export const adminRouter = Router();

adminRouter.post('/articles/parse', async (req, res) => {
  try {
    const { url, raw_text } = req.body;
    let contentToAnalyze = raw_text || '';

    if (url && !contentToAnalyze) {
      const fetched = await fetchArticleContent(url);
      contentToAnalyze = `${fetched.title}\n${fetched.content}`;
    }

    if (!contentToAnalyze) {
      return res.status(400).json({ error: 'Either url or raw_text is required' });
    }

    const aiResult = await extractFloodEventsWithGemini(contentToAnalyze);

    // Geocode locations and add to active flood events
    for (const loc of aiResult.locations) {
      const coord = await geocodeStreet(loc.street_name, loc.district);
      if (coord) {
        inMemoryFloodEvents.unshift({
          id: `news-${Date.now()}-${Math.random()}`,
          title: aiResult.summary,
          sourceType: 'admin_manual',
          cause: aiResult.cause,
          streetName: loc.street_name,
          district: loc.district,
          city: loc.city,
          startTime: new Date(loc.start_time),
          peakTime: new Date(loc.peak_time),
          endTime: new Date(loc.end_time),
          estimatedDepthCm: loc.estimated_depth_cm,
          confidenceScore: loc.confidence,
          geometry: { type: 'Point', coordinates: [coord.lng, coord.lat] },
        });
      }
    }

    return res.json({ success: true, extracted: aiResult });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
