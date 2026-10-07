import React, { useState } from 'react';
import {
  Waves,
  ChevronDown,
  ChevronUp,
  Footprints,
  Bike,
  AlertTriangle,
  ShieldAlert,
  Layers,
} from 'lucide-react';

export const FloodDepthLegend: React.FC = () => {
  const [collapsed, setCollapsed] = useState(true);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="group flex items-center gap-2.5 p-2.5 px-3.5 bg-white/92 hover:bg-white text-slate-800 text-xs font-bold rounded-2xl border border-sky-100/90 shadow-xl backdrop-blur-xl transition-all duration-200 active:scale-95 cursor-pointer min-h-[44px]"
        title="Mở bảng chú giải 4 mức cảnh báo ngập"
        aria-label="Mở bảng chú giải 4 mức cảnh báo ngập"
      >
        <div className="w-6 h-6 rounded-xl bg-pastel-sky-100 text-pastel-sky-700 flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
          <Waves className="w-3.5 h-3.5" />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-800">Mức ngập</span>
          {/* 4 Mini colored beads preview */}
          <div className="flex items-center gap-1 ml-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-1 ring-white" title="Mắt cá chân dưới 20 cm" />
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 ring-1 ring-white" title="Nửa bánh xe 20 - 40 cm" />
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-1 ring-white" title="Đầu gối 40 - 60 cm" />
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 ring-1 ring-white" title="Ngập sâu trên 60 cm" />
          </div>
        </div>

        <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition" />
      </button>
    );
  }

  return (
    <div className="w-72 sm:w-80 bg-white/92 backdrop-blur-xl border border-sky-100/90 rounded-3xl shadow-2xl transition-all duration-200 select-none animate-in fade-in zoom-in-95 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        className="w-full flex items-center justify-between p-3.5 text-left hover:bg-gray-50/70 transition cursor-pointer select-none border-b border-gray-100"
        aria-label="Thu gọn bảng chú giải mức ngập"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-pastel-sky-100 text-pastel-sky-700 flex items-center justify-center flex-shrink-0 shadow-xs">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-900 block leading-tight">
              Mức độ cảnh báo ngập
            </span>
            <span className="text-xs text-gray-500 font-medium">
              Chuẩn 4 cấp an toàn giao thông
            </span>
          </div>
        </div>
        <div className="w-7 h-7 rounded-xl bg-gray-100/70 text-gray-400 hover:text-gray-700 flex items-center justify-center transition">
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>

      {/* Content */}
      <div className="p-3.5 space-y-3">
        {/* Spectrum Gradient Bar */}
        <div>
          <div className="h-2 w-full rounded-full bg-gradient-to-r from-amber-300 via-orange-400 via-rose-400 to-red-600 shadow-inner" />
          <div className="flex justify-between items-center text-xs font-semibold text-gray-500 mt-1">
            <span>&lt; 20cm</span>
            <span>20 - 40cm</span>
            <span>40 - 60cm</span>
            <span className="text-rose-600 font-bold">&gt; 60cm</span>
          </div>
        </div>

        {/* 4 Standardized Levels with Purpose-fit Icons */}
        <div className="space-y-1.5">
          {/* Level 1: Ankle */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-pastel-amber-50/80 border border-pastel-amber-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-800 flex items-center justify-center flex-shrink-0">
                <Footprints className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-amber-950 block leading-tight">
                  Mắt cá chân
                </span>
                <span className="text-xs text-amber-800 leading-tight block">
                  Xe qua tốt, chú ý quan sát
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-900 px-2 py-0.5 rounded-full bg-white/70 border border-amber-200 flex-shrink-0">
              &lt; 20 cm
            </span>
          </div>

          {/* Level 2: Wheel */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-orange-50/80 border border-orange-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-orange-400/20 text-orange-800 flex items-center justify-center flex-shrink-0">
                <Bike className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-orange-950 block leading-tight">
                  Nửa bánh xe
                </span>
                <span className="text-xs text-orange-800 leading-tight block">
                  Cần cẩn thận, giảm tốc
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-orange-900 px-2 py-0.5 rounded-full bg-white/70 border border-orange-200 flex-shrink-0">
              20 - 40 cm
            </span>
          </div>

          {/* Level 3: Knee / Exhaust */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-pastel-coral-50/80 border border-pastel-coral-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-rose-400/20 text-rose-800 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-rose-950 block leading-tight">
                  Đầu gối / Ngập pô
                </span>
                <span className="text-xs text-rose-800 leading-tight block">
                  Nguy hiểm cho xe máy
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-rose-900 px-2 py-0.5 rounded-full bg-white/70 border border-rose-200 flex-shrink-0">
              40 - 60 cm
            </span>
          </div>

          {/* Level 4: Deep Flood */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-red-50 border border-red-200 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-red-600/15 text-red-700 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-extrabold text-red-950 block leading-tight">
                  Ngập sâu nguy hiểm
                </span>
                <span className="text-xs text-red-700 leading-tight block font-semibold">
                  Tuyệt đối không đi vào
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-red-700 px-2 py-0.5 rounded-full bg-white/90 border border-red-300 flex-shrink-0">
              &gt; 60 cm
            </span>
          </div>
        </div>

        {/* Legend Hint */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-1 border-t border-gray-100">
          <Layers className="w-3.5 h-3.5 text-pastel-sky-600 flex-shrink-0" />
          <span>Màu tuyến đường và điểm ngập tương ứng với mức trên</span>
        </div>
      </div>
    </div>
  );
};

export default FloodDepthLegend;
