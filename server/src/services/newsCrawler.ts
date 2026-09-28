import axios from 'axios';
import * as cheerio from 'cheerio';

export async function fetchArticleContent(url: string): Promise<{ title: string; content: string }> {
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    timeout: 8000,
  });
  const $ = cheerio.load(response.data);
  const title = $('h1').text().trim() || $('title').text().trim();
  const paragraphs: string[] = [];
  $('article p, p.Normal, .content p').each((_, el) => {
    paragraphs.push($(el).text().trim());
  });

  return {
    title,
    content: paragraphs.join('\n'),
  };
}
