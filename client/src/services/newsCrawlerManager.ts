import { useState, useEffect } from 'react';
import { ScrapedArticle } from '../types';
import { getNewsArticles, triggerCrawlNow } from './api';

export interface CrawlState {
  isCrawling: boolean;
  progress: number;
  stageMessage: string;
  lastMessage: string | null;
  error: string | null;
  articles: ScrapedArticle[];
  hasLoaded: boolean;
}

type Listener = (state: CrawlState) => void;

let state: CrawlState = {
  isCrawling: false,
  progress: 0,
  stageMessage: '',
  lastMessage: null,
  error: null,
  articles: [],
  hasLoaded: false,
};

const listeners = new Set<Listener>();

function notify() {
  const snapshot = { ...state };
  listeners.forEach((listener) => listener(snapshot));
}

export function subscribeNewsCrawl(listener: Listener) {
  listeners.add(listener);
  listener({ ...state });
  return () => {
    listeners.delete(listener);
  };
}

export function getNewsCrawlState(): CrawlState {
  return { ...state };
}

export async function fetchNewsArticles(force = false): Promise<ScrapedArticle[]> {
  if (state.articles.length > 0 && !force && state.hasLoaded) {
    return state.articles;
  }
  try {
    const data = await getNewsArticles();
    state.articles = data.articles || [];
    state.hasLoaded = true;
    notify();
    return state.articles;
  } catch (err: any) {
    console.warn('Failed to load news articles:', err);
    return state.articles;
  }
}

let crawlTimer: ReturnType<typeof setInterval> | null = null;

export async function triggerBackgroundCrawl(onSuccessCallback?: () => void): Promise<void> {
  if (state.isCrawling) return;

  state.isCrawling = true;
  state.progress = 15;
  state.stageMessage = 'Đang kết nối RSS các đầu báo (VnExpress, Tuổi Trẻ, Thanh Niên)...';
  state.lastMessage = null;
  state.error = null;
  notify();

  // Smooth realistic progress animation across crawl & AI extraction phases
  if (crawlTimer) clearInterval(crawlTimer);
  const startTime = Date.now();
  crawlTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    if (elapsed < 2000) {
      state.progress = Math.min(28, 15 + Math.floor(elapsed / 150));
      state.stageMessage = 'Đang kết nối RSS các đầu báo (VnExpress, Tuổi Trẻ, Thanh Niên)...';
    } else if (elapsed < 5000) {
      state.progress = Math.min(60, 28 + Math.floor((elapsed - 2000) / 100));
      state.stageMessage = 'Đang cào & phân loại bài viết về ngập lụt TP.HCM...';
    } else if (elapsed < 10000) {
      state.progress = Math.min(88, 60 + Math.floor((elapsed - 5000) / 180));
      state.stageMessage = 'Gemini AI trích xuất tọa độ & độ sâu ngập các tuyến đường...';
    } else {
      state.progress = Math.min(94, 88 + Math.floor((elapsed - 10000) / 500));
      state.stageMessage = 'Đang đồng bộ hóa dữ liệu ngập lên hệ thống bản đồ...';
    }
    notify();
  }, 250);

  try {
    const res = await triggerCrawlNow();
    if (crawlTimer) clearInterval(crawlTimer);

    state.progress = 100;
    state.stageMessage = 'Hoàn tất đồng bộ dữ liệu!';
    state.articles = res.articles || [];
    state.hasLoaded = true;
    state.lastMessage =
      res.new_articles_count > 0
        ? `Đã cập nhật thêm ${res.new_articles_count} bài báo mới và trích xuất ${res.newly_detected_floods} điểm ngập vào bản đồ.`
        : 'Dữ liệu tin tức hôm nay đã được đồng bộ đầy đủ mới nhất.';
    state.error = null;
    notify();

    if (onSuccessCallback) {
      onSuccessCallback();
    }
  } catch (err: any) {
    if (crawlTimer) clearInterval(crawlTimer);
    state.progress = 0;
    state.stageMessage = '';
    state.error =
      err?.response?.data?.error || err.message || 'Không thể cào tin tức lúc này. Vui lòng thử lại sau.';
    notify();
  } finally {
    state.isCrawling = false;
    notify();
  }
}

/**
 * Custom React hook for subscribing to news crawler state and triggering crawls
 */
export function useNewsCrawl() {
  const [crawlState, setCrawlState] = useState<CrawlState>(getNewsCrawlState());

  useEffect(() => {
    const unsubscribe = subscribeNewsCrawl((latest) => {
      setCrawlState(latest);
    });
    return unsubscribe;
  }, []);

  const startCrawl = async (cb?: () => void) => {
    return triggerBackgroundCrawl(cb);
  };

  const reloadArticles = async (force = false) => {
    return fetchNewsArticles(force);
  };

  return {
    ...crawlState,
    startCrawl,
    reloadArticles,
  };
}
