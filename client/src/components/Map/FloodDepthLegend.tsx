import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Layers } from 'lucide-react';

export const FloodDepthLegend: React.FC = () => {
  const [collapsed, setCollapsed] = useState(true);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="flex items-center gap-2 p-2.5 px-3.5 bg-white/90 hover:bg-white text-slate-800 text-xs font-bold rounded-2xl border border-sky-100/90 shadow-glass backdrop-blur-xl transition-all duration-200 active:scale-95 cursor-pointer min-h-[44px]"
        title="Mở bảng chú giải 4 mức cảnh báo ngập"
        aria-label="Mở bảng chú giải 4 mức cảnh báo ngập"
      >
        <div className="w-5 h-5 rounded-lg bg-pastel-amber-100 text-pastel-amber-700 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5" />
        </div>
        <span className="font-semibold text-slate-700">Chú giải mức ngập</span>
        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
      </button>
    );
  }

  return (
    <div className="w-64 sm:w-72 bg-white/95 backdrop-blur-xl border border-sky-100/90 rounded-2xl shadow-2xl transition-all duration-200 select-none animate-in fade-in zoom-in-95">
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50/70 rounded-2xl transition cursor-pointer select-none"
        aria-label="Thu gọn bảng chú giải mức ngập"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-xl bg-pastel-amber-100 text-pastel-amber-700 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-900">Mức độ cảnh báo ngập</span>
        </div>
        <div className="text-slate-400 hover:text-slate-700 transition">
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>

      <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 space-y-2.5">
        {/* Pastel Spectrum Bar */}
        <div>
          <div className="h-2 w-full rounded-full bg-gradient-to-r from-yellow-300 via-orange-400 via-rose-400 to-red-600 shadow-inner" />
          <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 mt-1">
            <span>&lt; 20cm</span>
            <span>20 - 40cm</span>
            <span>40 - 60cm</span>
            <span className="text-red-600 font-bold">&gt; 60cm</span>
          </div>
        </div>

        {/* Standardized 4-tier Levels in Pastel */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between p-1.5 px-2 rounded-xl bg-pastel-amber-50/90 border border-pastel-amber-200/70">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-xs" />
              <span className="text-[11px] font-bold text-amber-900">Mắt cá chân</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-800">&lt; 20 cm</span>
          </div>

          <div className="flex items-center justify-between p-1.5 px-2 rounded-xl bg-pastel-coral-50/60 border border-orange-200/70">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-xs" />
              <span className="text-[11px] font-bold text-orange-950">Nửa bánh xe</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-orange-800">20 - 40 cm</span>
          </div>

          <div className="flex items-center justify-between p-1.5 px-2 rounded-xl bg-pastel-coral-50/90 border border-pastel-coral-200/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" />
              <span className="text-[11px] font-bold text-rose-950">Đầu gối / Ngập pô</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-rose-800">40 - 60 cm</span>
          </div>

          <div className="flex items-center justify-between p-1.5 px-2 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-xs" />
              <span className="text-[11px] font-extrabold text-red-950">Ngập sâu (Nguy hiểm)</span>
            </div>
            <span className="text-[10px] font-mono font-black text-red-700">&gt; 60 cm</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
          <Layers className="w-3 h-3 text-blue-500 flex-shrink-0" />
          <span>Đoạn đường trên bản đồ đổi màu tương ứng</span>
        </div>
      </div>
    </div>
  );
};

export default FloodDepthLegend;
