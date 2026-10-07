import React, { useState, useEffect } from 'react';
import { Newspaper, RefreshCw, ExternalLink, MapPin, AlertCircle, Clock, Loader2, Bell, Sparkles } from 'lucide-react';
import { ScrapedArticle } from '../../types';
import { getNewsArticles, triggerCrawlNow } from '../../services/api';

interface NewsFeedTabProps {
  onSelectLocation?: (lat: number, lng: number) => void;
  onRefreshFloods?: () => void;
}

export const NewsFeedTab: React.FC<NewsFeedTabProps> = ({ onSelectLocation, onRefreshFloods }) => {
  const [articles, setArticles] = useState<ScrapedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [crawlMessage, setCrawlMessage] = useState<string | null>(null);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const data = await getNewsArticles();
      setArticles(data.articles || []);
    } catch (err) {
      console.error('Failed to load articles', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const handleManualCrawl = async () => {
    if (crawling) return;
    setCrawling(true);
    setCrawlMessage(null);
    try {
      const res = await triggerCrawlNow();
      setArticles(res.articles || []);
      setCrawlMessage(
        res.new_articles_count > 0
          ? `Đã cập nhật thêm ${res.new_articles_count} bài báo mới và ${res.newly_detected_floods} điểm ngập vào bản đồ.`
          : 'Dữ liệu tin tức hôm nay đã được đồng bộ đầy đủ mới nhất.'
      );
      if (onRefreshFloods) {
        onRefreshFloods();
      }
    } catch (err: any) {
      setCrawlMessage(
        err?.response?.data?.error || err.message || 'Không thể cào tin tức lúc này. Vui lòng thử lại sau.'
      );
    } finally {
      setCrawling(false);
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'VnExpress':
        return 'bg-pastel-coral-50 text-pastel-coral-900 border-pastel-coral-200';
      case 'Tuổi Trẻ':
        return 'bg-pastel-sky-50 text-pastel-sky-900 border-pastel-sky-200';
      case 'Thanh Niên':
        return 'bg-pastel-lavender-50 text-pastel-lavender-900 border-pastel-lavender-200';
      case 'Dân Trí':
      default:
        return 'bg-pastel-amber-50 text-amber-900 border-pastel-amber-200';
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. Header Banner & Manual Crawl Button */}
      <div className="bg-gradient-to-br from-pastel-sky-50/70 via-white/80 to-pastel-lavender-50/60 border border-pastel-sky-200/70 rounded-2xl p-3.5 shadow-glass-sm backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
              <span className="p-1 rounded-lg bg-pastel-sky-100 text-pastel-sky-800">
                <Newspaper className="w-3.5 h-3.5" />
              </span>
              <span>Tin tức ngập lụt tự động</span>
            </div>
            <p className="text-[11px] text-gray-600 leading-snug">
              Cào định kỳ 06:00 & 16:00 từ VnExpress, Tuổi Trẻ, Thanh Niên...
            </p>
          </div>

          <button
            type="button"
            onClick={handleManualCrawl}
            disabled={crawling}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-pastel-sky-600 hover:bg-pastel-sky-700 active:bg-pastel-sky-800 text-white text-xs font-bold rounded-xl shadow-glass-sm hover:shadow-glass-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            title="Quét tin tức mới nhất từ các đầu báo"
          >
            {crawling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>{crawling ? 'Đang cào...' : 'Cập nhật tin'}</span>
          </button>
        </div>

        {/* Crawl Result Notification */}
        {crawlMessage && (
          <div className="mt-3 p-2.5 bg-white/95 rounded-xl border border-pastel-sky-200 text-xs text-gray-800 flex items-start gap-2 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
            <Bell className="w-4 h-4 text-pastel-sky-700 flex-shrink-0 mt-0.5" />
            <div className="leading-snug flex-1">{crawlMessage}</div>
          </div>
        )}
      </div>

      {/* 2. Total Articles Info Bar */}
      <div className="flex items-center justify-between text-[11px] text-gray-600 px-1 font-medium">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-pastel-sky-600" />
          <span>
            Tổng số: <strong className="text-gray-900 font-bold">{articles.length} bài báo</strong>
          </span>
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <Clock className="w-3 h-3" />
          <span>Cập nhật liên tục</span>
        </span>
      </div>

      {/* 3. Articles Feed */}
      <div className="space-y-2.5 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
        {/* Skeleton loading state */}
        {loading && articles.length === 0 && (
          <div className="space-y-2.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/80 p-3.5 shadow-glass-sm space-y-2.5 animate-pulse"
              >
                <div className="flex justify-between items-center">
                  <div className="h-4 w-20 bg-gray-200 rounded-full" />
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                </div>
                <div className="h-4 w-3/4 bg-gray-200 rounded-lg" />
                <div className="h-3 w-full bg-gray-100 rounded" />
                <div className="h-3 w-2/3 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && articles.length === 0 && (
          <div className="py-10 px-4 text-center bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/80 shadow-glass-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pastel-sky-50 text-pastel-sky-700 mx-auto flex items-center justify-center border border-pastel-sky-200/60 shadow-glass-xs">
              <Newspaper className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-800 font-bold">Chưa có bài báo ngập lụt nào</p>
              <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                Bấm nút "Cập nhật tin" ở trên để cào dữ liệu mới nhất từ các trang tin uy tín.
              </p>
            </div>
          </div>
        )}

        {/* Article cards */}
        {articles.map((item) => (
          <div
            key={item.id}
            className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/80 hover:border-pastel-sky-300 p-3.5 shadow-glass-sm hover:shadow-glass-md transition-all duration-200 space-y-2.5"
          >
            {/* Header: Source & Time */}
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSourceBadge(
                  item.source
                )}`}
              >
                {item.source}
              </span>
              <span className="text-[10px] text-gray-500 font-medium">
                {new Date(item.publishedAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Article Title */}
            <h4 className="text-xs font-bold text-gray-900 leading-snug hover:text-pastel-sky-700 transition">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start justify-between gap-1.5 group"
              >
                <span className="group-hover:text-pastel-sky-700 transition">{item.title}</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-pastel-sky-600 flex-shrink-0 mt-0.5 transition" />
              </a>
            </h4>

            {/* Summary */}
            <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">
              {item.summary}
            </p>

            {/* AI Extracted Flood Hotspots */}
            {item.extractedLocations && item.extractedLocations.length > 0 && (
              <div className="pt-2.5 border-t border-gray-100 space-y-1.5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 text-pastel-amber-600" />
                  <span>Điểm ngập được trích xuất:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.extractedLocations.map((loc, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-pastel-amber-50/80 border border-pastel-amber-200 rounded-xl text-[11px] text-amber-950 font-medium shadow-xs"
                    >
                      <MapPin className="w-3 h-3 text-pastel-amber-700 flex-shrink-0" />
                      <span>
                        <strong>{loc.streetName}</strong> ({loc.district}) •{' '}
                        <span className="text-pastel-coral-800 font-bold">{loc.depthCm}cm</span>
                      </span>
                      {loc.lat && loc.lng && onSelectLocation && (
                        <button
                          type="button"
                          onClick={() => onSelectLocation(loc.lat!, loc.lng!)}
                          className="ml-1 text-[10px] px-1.5 py-0.5 bg-pastel-sky-100 hover:bg-pastel-sky-200 text-pastel-sky-900 font-bold rounded-md transition cursor-pointer active:scale-95"
                          title="Xem vị trí ngập trên bản đồ"
                        >
                          Ghim
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsFeedTab;
