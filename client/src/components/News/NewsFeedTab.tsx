import React, { useState, useEffect } from 'react';
import { Newspaper, RefreshCw, ExternalLink, MapPin, AlertCircle, Clock, Loader2 } from 'lucide-react';
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
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Tuổi Trẻ':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Thanh Niên':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Dân Trí':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. Header Banner & Manual Crawl Button */}
      <div className="bg-gradient-to-br from-indigo-50/90 to-blue-50/80 border border-indigo-100/90 rounded-2xl p-3 shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
              <Newspaper className="w-4 h-4 text-indigo-600" />
              <span>Tin tức ngập lụt tự động</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
              Cào định kỳ 06:00 & 16:00 từ VnExpress, Tuổi Trẻ, Thanh Niên...
            </p>
          </div>

          <button
            type="button"
            onClick={handleManualCrawl}
            disabled={crawling}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
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
          <div className="mt-2.5 p-2 bg-white/95 rounded-xl border border-indigo-100 text-[11px] text-gray-800 flex items-start gap-1.5 shadow-xs">
            <span className="text-xs">🔔</span>
            <div className="leading-tight flex-1">{crawlMessage}</div>
          </div>
        )}
      </div>

      {/* 2. Total Articles Info Bar */}
      <div className="flex items-center justify-between text-[11px] text-gray-500 px-1 font-medium">
        <span>
          Tổng số: <strong className="text-gray-900">{articles.length} bài báo</strong>
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
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
                className="bg-white rounded-2xl border border-gray-200/80 p-3 shadow-xs space-y-2 animate-pulse"
              >
                <div className="flex justify-between">
                  <div className="h-4 w-20 bg-gray-200 rounded-full" />
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                </div>
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
                <div className="h-3 w-full bg-gray-100 rounded" />
                <div className="h-3 w-2/3 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && articles.length === 0 && (
          <div className="py-8 px-4 text-center bg-gray-50 rounded-2xl border border-gray-200/80 space-y-2">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center">
              <Newspaper className="w-5 h-5" />
            </div>
            <p className="text-xs text-gray-700 font-semibold">Chưa có bài báo ngập lụt nào</p>
            <p className="text-[11px] text-gray-500">
              Bấm nút "Cập nhật tin" ở trên để cào dữ liệu mới từ các trang báo.
            </p>
          </div>
        )}

        {/* Article cards */}
        {articles.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-gray-200/90 p-3 shadow-xs hover:shadow-md transition space-y-2"
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
              <span className="text-[10px] text-gray-400 font-medium">
                {new Date(item.publishedAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Article Title */}
            <h4 className="text-xs font-bold text-gray-900 leading-snug hover:text-blue-600 transition">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start justify-between gap-1 group"
              >
                <span className="group-hover:text-blue-600 transition">{item.title}</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 flex-shrink-0 mt-0.5 transition" />
              </a>
            </h4>

            {/* Summary */}
            <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">
              {item.summary}
            </p>

            {/* AI Extracted Flood Hotspots */}
            {item.extractedLocations && item.extractedLocations.length > 0 && (
              <div className="pt-2 border-t border-gray-100 space-y-1.5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  <span>Điểm ngập được trích xuất:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.extractedLocations.map((loc, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50/80 border border-amber-200/80 rounded-lg text-[10px] text-amber-900 font-medium"
                    >
                      <MapPin className="w-3 h-3 text-amber-600 flex-shrink-0" />
                      <span>
                        <strong>{loc.streetName}</strong> ({loc.district}) •{' '}
                        <span className="text-red-700 font-bold">{loc.depthCm}cm</span>
                      </span>
                      {loc.lat && loc.lng && onSelectLocation && (
                        <button
                          type="button"
                          onClick={() => onSelectLocation(loc.lat!, loc.lng!)}
                          className="ml-1 text-[9px] text-blue-600 hover:text-blue-800 underline font-bold cursor-pointer"
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
