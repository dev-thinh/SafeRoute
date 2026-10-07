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
    <div className="absolute top-4 right-4 z-[1000] select-none">
      {/* Unified Floating Island Capsule - Consistent with Left Panel */}
      <div className="bg-white/92 backdrop-blur-xl border border-sky-100/90 rounded-2xl shadow-xl p-1.5 flex items-center gap-1">
        {/* 1. Quick Weather Pill */}
        <button
          type="button"
          onClick={onOpenWeather}
          className="group flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-slate-100/70 transition-all duration-200 active:scale-95 cursor-pointer min-h-[38px]"
          title="Xem chi tiết khí tượng & triều cường TP.HCM"
          aria-label="Xem khí tượng và triều cường TP.HCM"
        >
          <div className="w-5 h-5 rounded-lg bg-pastel-sky-100 text-pastel-sky-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <CloudRain className="w-3.5 h-3.5" />
          </div>
          <span className="hidden sm:inline font-bold">
            {weatherSummary?.text || 'Khí tượng & Triều'}
          </span>
          <span className="sm:hidden font-bold">Khí tượng</span>
        </button>

        {/* 2. Fit Route Button (Enabled only when routes exist) */}
        {hasRoute && onFitRoute && (
          <>
            <div className="h-4 w-px bg-slate-200/80" />
            <button
              type="button"
              onClick={onFitRoute}
              className="group flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-slate-100/70 transition-all duration-200 active:scale-95 cursor-pointer animate-in fade-in min-h-[38px]"
              title="Thu nhỏ để xem toàn cảnh lộ trình"
              aria-label="Xem toàn cảnh lộ trình"
            >
              <div className="w-5 h-5 rounded-lg bg-pastel-mint-100 text-pastel-mint-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Compass className="w-3.5 h-3.5" />
              </div>
              <span className="hidden sm:inline font-bold">Toàn cảnh tuyến</span>
            </button>
          </>
        )}

        <div className="h-4 w-px bg-slate-200/80" />

        {/* 3. Admin Moderation Button */}
        <button
          type="button"
          onClick={onOpenAdmin}
          className="group flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-slate-100/70 transition-all duration-200 active:scale-95 cursor-pointer min-h-[38px]"
          title="Mở trung tâm quản trị & kiểm duyệt ngập lụt"
          aria-label="Mở trung tâm quản trị & kiểm duyệt"
        >
          <div className="w-5 h-5 rounded-lg bg-pastel-sky-100 text-pastel-sky-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold">Quản trị</span>
          {pendingAdminCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white font-mono animate-pulse shadow-xs">
              {pendingAdminCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
};

export default TopUtilityBar;
