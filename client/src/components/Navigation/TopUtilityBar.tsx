import React from 'react';
import { CloudRain, ShieldCheck, Compass } from 'lucide-react';

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
        className="group flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] bg-white/95 hover:bg-white text-gray-700 hover:text-pastel-sky-900 text-xs font-bold rounded-2xl border border-white/80 shadow-glass-md hover:shadow-glass-lg backdrop-blur-xl transition-all duration-200 active:scale-95 cursor-pointer"
        title="Xem chi tiết khí tượng & triều cường TP.HCM"
        aria-label="Xem khí tượng và triều cường TP.HCM"
      >
        <div className="w-6 h-6 rounded-xl bg-pastel-sky-100 text-pastel-sky-700 flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
          <CloudRain className="w-3.5 h-3.5" />
        </div>
        <span className="hidden sm:inline font-bold">
          {weatherSummary?.text || 'Khí tượng & Triều'}
        </span>
        <span className="sm:hidden font-bold">Khí tượng</span>
      </button>

      {/* 2. Fit Route Button (Enabled only when routes exist) */}
      {hasRoute && onFitRoute && (
        <button
          type="button"
          onClick={onFitRoute}
          className="group flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] bg-white/95 hover:bg-white text-gray-700 hover:text-pastel-mint-900 text-xs font-bold rounded-2xl border border-white/80 shadow-glass-md hover:shadow-glass-lg backdrop-blur-xl transition-all duration-200 active:scale-95 cursor-pointer animate-in fade-in"
          title="Thu nhỏ để xem toàn cảnh lộ trình"
          aria-label="Xem toàn cảnh lộ trình"
        >
          <div className="w-6 h-6 rounded-xl bg-pastel-mint-100 text-pastel-mint-700 flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <span className="hidden sm:inline font-bold">Toàn cảnh tuyến</span>
        </button>
      )}

      {/* 3. Admin Moderation Button */}
      <button
        type="button"
        onClick={onOpenAdmin}
        className="group flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] bg-white/95 hover:bg-white text-gray-800 hover:text-pastel-sky-900 text-xs font-bold rounded-2xl border border-white/80 shadow-glass-md hover:shadow-glass-lg backdrop-blur-xl transition-all duration-200 active:scale-95 cursor-pointer"
        title="Mở trung tâm quản trị & kiểm duyệt ngập lụt"
        aria-label="Mở trung tâm quản trị & kiểm duyệt"
      >
        <div className="w-6 h-6 rounded-xl bg-pastel-sky-100 text-pastel-sky-700 flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
          <ShieldCheck className="w-3.5 h-3.5" />
        </div>
        <span className="font-bold">Quản trị</span>
        {pendingAdminCount > 0 ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-pastel-amber-500 text-white font-mono animate-pulse shadow-xs">
            {pendingAdminCount}
          </span>
        ) : null}
      </button>
    </div>
  );
};

export default TopUtilityBar;
