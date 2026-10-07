import React, { useState, useEffect, useRef } from 'react';
import {
  Newspaper,
  RefreshCw,
  ExternalLink,
  MapPin,
  AlertCircle,
  Clock,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useNewsCrawl } from '../../services/newsCrawlerManager';

interface NewsFeedTabProps {
  onSelectLocation?: (lat: number, lng: number) => void;
  onRefreshFloods?: () => void;
}

const PAGE_SIZE = 5;

export const NewsFeedTab: React.FC<NewsFeedTabProps> = ({ onSelectLocation, onRefreshFloods }) => {
  const {
    isCrawling,
    progress,
    stageMessage,
    lastMessage,
    error,
    articles,
    hasLoaded,
    startCrawl,
    reloadArticles,
  } = useNewsCrawl();

  const [currentPage, setCurrentPage] = useState(1);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initial load if not loaded yet
  useEffect(() => {
    if (!hasLoaded) {
      setLoadingInitial(true);
      reloadArticles().finally(() => setLoadingInitial(false));
    }
  }, [hasLoaded, reloadArticles]);

  // Adjust page if article list size changes
  const totalPages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [articles.length, totalPages, currentPage]);

  const handleManualCrawl = async () => {
    if (isCrawling) return;
    await startCrawl(onRefreshFloods);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, articles.length);
  const displayedArticles = articles.slice(startIndex, endIndex);

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
    <div className="space-y-3.5 select-none font-sans" ref={scrollContainerRef}>
      {/* 1. Header Banner & Action Control */}
      <div className="bg-gradient-to-br from-pastel-sky-50/70 via-white/80 to-pastel-lavender-50/60 border border-pastel-sky-200/70 rounded-2xl p-3.5 sm:p-4 shadow-glass-sm backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
              <span className="p-1.5 rounded-xl bg-blue-100 text-blue-700 shadow-xs">
                <Newspaper className="w-4 h-4" />
              </span>
              <span>Tin tức báo chí & Trích xuất điểm ngập AI</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Tự động thu thập từ VnExpress, Tuổi Trẻ, Thanh Niên & trích xuất tọa độ qua Gemini AI
            </p>
          </div>

          <button
            type="button"
            onClick={handleManualCrawl}
            disabled={isCrawling}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 whitespace-nowrap min-h-[40px]"
            title="Quét tin tức mới nhất từ các đầu báo trực tuyến"
          >
            {isCrawling ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <RefreshCw className="w-4 h-4 text-white" />
            )}
            <span>{isCrawling ? `Đang cào (${progress}%)` : 'Cập nhật tin'}</span>
          </button>
        </div>

        {/* 2. Real-time Animated Progress Bar when Crawling */}
        {isCrawling && (
          <div className="mt-3.5 p-3 sm:p-3.5 bg-white/95 rounded-2xl border border-blue-200/90 shadow-sm space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-blue-900">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                <span className="line-clamp-1">{stageMessage}</span>
              </div>
              <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 shadow-xs shrink-0 ml-2">
                {progress}%
              </span>
            </div>

            {/* Progress track */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 rounded-full transition-all duration-300 ease-out shadow-xs"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
              <span>Đang thu thập RSS & xử lý Gemini AI</span>
              <span className="text-emerald-700 font-bold">Vẫn tiếp tục chạy nền khi chuyển tab</span>
            </div>
          </div>
        )}

        {/* 3. Crawl Notification Message */}
        {lastMessage && !isCrawling && (
          <div className="mt-3 p-3 bg-pastel-mint-50/90 rounded-xl border border-pastel-mint-200/90 text-xs text-emerald-950 flex items-start gap-2 shadow-xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="leading-snug flex-1 font-medium">{lastMessage}</div>
          </div>
        )}

        {/* 4. Error Message */}
        {error && !isCrawling && (
          <div className="mt-3 p-3 bg-pastel-coral-50/90 rounded-xl border border-pastel-coral-200/90 text-xs text-rose-950 flex items-start gap-2 shadow-xs animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="leading-snug flex-1 font-medium">{error}</div>
          </div>
        )}
      </div>

      {/* 5. Summary Info Bar */}
      <div className="flex items-center justify-between text-[11px] text-slate-600 px-1 font-medium">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>
            Tổng số: <strong className="text-slate-900 font-bold font-mono">{articles.length} bài báo</strong>
          </span>
        </span>
        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
          <Clock className="w-3 h-3" />
          <span>Trang {currentPage}/{totalPages}</span>
        </span>
      </div>

      {/* 6. Articles Feed */}
      <div className="space-y-3">
        {/* Skeleton loading state */}
        {loadingInitial && articles.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/80 p-4 shadow-glass-sm space-y-2.5 animate-pulse"
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
        {!loadingInitial && articles.length === 0 && (
          <div className="py-12 px-4 text-center bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/80 shadow-glass-sm space-y-3">
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

        {/* Render paginated article cards */}
        {displayedArticles.map((item) => (
          <div
            key={item.id}
            className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 hover:border-blue-300 p-4 shadow-sm hover:shadow-md transition-all duration-200 space-y-2.5"
          >
            {/* Header: Source & Time */}
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getSourceBadge(
                  item.source
                )}`}
              >
                {item.source}
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-medium">
                {new Date(item.publishedAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Article Title */}
            <h4 className="text-xs font-bold text-slate-900 leading-snug hover:text-blue-700 transition" title={item.title}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start justify-between gap-2 group"
                title={`Mở bài viết gốc: ${item.title}`}
              >
                <span className="group-hover:text-blue-700 transition">{item.title}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 flex-shrink-0 mt-0.5 transition" />
              </a>
            </h4>

            {/* Summary */}
            <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2" title={item.summary}>
              {item.summary}
            </p>

            {/* AI Extracted Flood Hotspots */}
            {item.extractedLocations && item.extractedLocations.length > 0 && (
              <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>Điểm ngập được Gemini AI trích xuất:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.extractedLocations.map((loc, idx) => (
                    <div
                      key={idx}
                      title={`${loc.streetName} (${loc.district}) • Dự báo ngập ~${loc.depthCm} cm`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-950 font-medium shadow-xs"
                    >
                      <MapPin className="w-3 h-3 text-amber-700 flex-shrink-0" />
                      <span>
                        <strong>{loc.streetName}</strong> ({loc.district}) •{' '}
                        <span className="text-rose-700 font-bold">{loc.depthCm}cm</span>
                      </span>
                      {loc.lat && loc.lng && onSelectLocation && (
                        <button
                          type="button"
                          onClick={() => onSelectLocation(loc.lat!, loc.lng!)}
                          className="ml-1 text-[10px] px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold rounded-lg transition cursor-pointer active:scale-95"
                          title="Định vị điểm ngập này trên bản đồ"
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

      {/* 7. Bottom Pagination Control */}
      {articles.length > PAGE_SIZE && (
        <div className="p-3 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Item count text */}
          <span className="text-[11px] text-slate-500 font-medium text-center sm:text-left">
            Hiển thị <strong className="text-slate-900 font-bold font-mono">{startIndex + 1}-{endIndex}</strong> trên tổng số <strong className="text-slate-900 font-bold font-mono">{articles.length}</strong> bài báo
          </span>

          {/* Page switcher buttons */}
          <div className="flex items-center gap-1.5">
            {/* Prev button */}
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-xs font-bold min-h-[34px]"
              title="Trang trước"
              aria-label="Trang trước"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Trước</span>
            </button>

            {/* Page number pills */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show smart window if many pages
                if (
                  totalPages > 7 &&
                  page !== 1 &&
                  page !== totalPages &&
                  Math.abs(page - currentPage) > 1
                ) {
                  if (page === 2 || page === totalPages - 1) {
                    return (
                      <span key={page} className="px-1 text-slate-400 font-mono text-[11px]">
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                const isActive = page === currentPage;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 rounded-xl font-bold font-mono text-xs transition active:scale-95 cursor-pointer flex items-center justify-center ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                    aria-label={`Chuyển đến trang ${page}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            {/* Next button */}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-xs font-bold min-h-[34px]"
              title="Trang sau"
              aria-label="Trang sau"
            >
              <span className="hidden sm:inline">Sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsFeedTab;
