import React, { useState, useEffect } from 'react';
import { Newspaper, RefreshCw, ExternalLink, MapPin, AlertCircle, Clock } from 'lucide-react';
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
    setCrawling(true);
    setCrawlMessage(null);
    try {
      const res = await triggerCrawlNow();
      setArticles(res.articles || []);
      setCrawlMessage(
        res.new_articles_count > 0
          ? `✅ Hoàn tất! Đã cào thêm ${res.new_articles_count} bài báo mới và trích xuất ${res.newly_detected_floods} điểm ngập vào bản đồ.`
          : `✅ Đã quét các đầu báo mới nhất. Cơ sở dữ liệu hiện đã cập nhật đầy đủ tin tức ngập lụt hôm nay.`
      );
      if (onRefreshFloods) {
        onRefreshFloods();
      }
    } catch (err: any) {
      setCrawlMessage(`❌ Lỗi khi cào tin tức: ${err.message}`);
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
      {/* Top Banner & Manual Crawl Trigger */}
      <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/80 border border-indigo-100 rounded-2xl p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
              <Newspaper className="w-4 h-4 text-indigo-600" />
              <span>Tin Tức Ngập Lụt Đã Cào Tự Động</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
              Tự động cào định kỳ mỗi ngày lúc <strong>06:00</strong> & <strong>16:00</strong> từ VnExpress, Tuổi Trẻ, Thanh Niên...
            </p>
          </div>

          <button
            type="button"
            onClick={handleManualCrawl}
            disabled={crawling}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
            title="Kích hoạt cào báo và trích xuất AI ngay bây giờ"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${crawling ? 'animate-spin' : ''}`} />
            <span>{crawling ? 'Đang cào...' : 'Cào tin mới'}</span>
          </button>
        </div>

        {/* Crawl Result Notification */}
        {crawlMessage && (
          <div className="mt-2.5 p-2 bg-white/95 rounded-xl border border-indigo-100 text-[11px] text-gray-800 flex items-start gap-1.5 shadow-sm">
            <span className="text-sm">🔔</span>
            <div className="leading-tight">{crawlMessage}</div>
          </div>
        )}
      </div>

      {/* Articles Count info */}
      <div className="flex items-center justify-between text-[11px] text-gray-500 px-1 font-medium">
        <span>Tổng cộng: <strong className="text-gray-800">{articles.length} bài báo</strong> ngập lụt</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-400" />
          Cập nhật liên tục
        </span>
      </div>

      {/* Articles Feed */}
      <div className="space-y-2.5 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
        {loading && articles.length === 0 && (
          <div className="py-8 text-center text-xs text-gray-500">
            Đang tải dữ liệu bài báo...
          </div>
        )}

        {articles.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-gray-200/90 p-3 shadow-sm hover:shadow-md transition space-y-2"
          >
            {/* Header: Source & Time */}
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSourceBadge(item.source)}`}>
                {item.source}
              </span>
              <span className="text-[10px] text-gray-400">
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
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1">
                <span>{item.title}</span>
                <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
              </a>
            </h4>

            {/* AI Summary */}
            <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">
              {item.summary}
            </p>

            {/* AI Extracted Flood Hotspots */}
            {item.extractedLocations && item.extractedLocations.length > 0 && (
              <div className="pt-2 border-t border-gray-100 space-y-1.5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  <span>Điểm ngập được trích xuất bằng AI:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.extractedLocations.map((loc, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50/80 border border-amber-200/80 rounded-lg text-[10px] text-amber-900 font-medium"
                    >
                      <MapPin className="w-3 h-3 text-amber-600 flex-shrink-0" />
                      <span>
                        <strong>{loc.streetName}</strong> ({loc.district}) • <span className="text-red-700 font-bold">{loc.depthCm}cm</span>
                      </span>
                      {loc.lat && loc.lng && onSelectLocation && (
                        <button
                          type="button"
                          onClick={() => onSelectLocation(loc.lat!, loc.lng!)}
                          className="ml-1 text-[9px] text-blue-600 hover:text-blue-800 underline font-semibold"
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
