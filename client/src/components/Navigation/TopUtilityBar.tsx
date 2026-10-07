import React from 'react';
import { CloudRain, Route, ShieldCheck } from 'lucide-react';

interface TopUtilityBarProps {
  onOpenAdmin: () => void;
  onOpenWeather: () => void;
  pendingAdminCount: number;
  onFitRoute?: () => void;
  hasRoute: boolean;
  weatherSummary?: {
    text: string;
    isRaining?: boolean;
  };
}

export const TopUtilityBar: React.FC<TopUtilityBarProps> = ({
  onOpenAdmin,
  onOpenWeather,
  pendingAdminCount,
  onFitRoute,
  hasRoute,
  weatherSummary,
}) => {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2 select-none">
      {/* 1. Quick Weather Pill */}
      <button
        type="button"
        onClick={onOpenWeather}
        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-white/90 hover:bg-white text-slate-700 hover:text-blue-700 text-xs font-bold rounded-2xl border border-sky-100/90 shadow-glass backdrop-blur-xl transition-all duration-200 active:scale-95 cursor-pointer"
        title="Xem chi tiết khí tượng & triều cường TP.HCM"
        aria-label="Xem khí tượng và triều cường TP.HCM"
      >
        <div className="w-6 h-6 rounded-xl bg-pastel-sky-100 text-pastel-sky-600 flex items-center justify-center flex-shrink-0">
          <CloudRain className="w-3.5 h-3.5" />
        </div>
        <span className="hidden sm:inline font-semibold">
          {weatherSummary?.text || 'Khí tượng & Triều'}
        </span>
        <span className="sm:hidden font-semibold">Khí tượng</span>
      </button>

      {/* 2. Fit Route Button (Enabled only when routes exist) */}
      {hasRoute && onFitRoute && (
        <button
          type="button"
          onClick={onFitRoute}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-white/90 hover:bg-white text-slate-700 hover:text-blue-700 text-xs font-bold rounded-2xl border border-sky-100/90 shadow-glass backdrop-blur-xl transition-all duration-200 active:scale-95 cursor-pointer animate-in fade-in"
          title="Thu nhỏ để xem toàn cảnh lộ trình"
          aria-label="Xem toàn cảnh lộ trình"
        >
          <div className="w-6 h-6 rounded-xl bg-pastel-mint-100 text-pastel-mint-700 flex items-center justify-center flex-shrink-0">
            <Route className="w-3.5 h-3.5" />
          </div>
          <span className="hidden sm:inline font-semibold">Toàn cảnh lộ trình</span>
        </button>
      )}

      {/* 3. Admin Moderation Button */}
      <button
        type="button"
        onClick={onOpenAdmin}
        className="flex items-center gap-2 px-3.5 py-2 min-h-[44px] bg-white/90 hover:bg-white text-slate-800 hover:text-blue-700 text-xs font-bold rounded-2xl border border-sky-100/90 shadow-glass backdrop-blur-xl transition-all duration-200 active:scale-95 cursor-pointer"
        title="Mở trung tâm quản trị & kiểm duyệt ngập lụt"
        aria-label="Mở trung tâm quản trị & kiểm duyệt"
      >
        <div className="w-6 h-6 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <span className="font-semibold">Quản trị</span>
        {pendingAdminCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white font-mono animate-pulse shadow-sm">
            {pendingAdminCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default TopUtilityBar;
