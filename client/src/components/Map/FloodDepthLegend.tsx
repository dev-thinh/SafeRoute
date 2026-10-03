import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Layers } from 'lucide-react';

export const FloodDepthLegend: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-[999] w-64 bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-2xl shadow-xl transition-all">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50/60 rounded-2xl transition cursor-pointer select-none"
        aria-label={collapsed ? 'Mở rộng bảng chú giải mức ngập' : 'Thu gọn bảng chú giải mức ngập'}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-xs font-bold text-gray-900">Mức độ cảnh báo ngập</span>
        </div>
        <div className="text-gray-400 hover:text-gray-700 transition">
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </button>

      {!collapsed && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-gray-100 space-y-2.5">
          {/* Gradient Spectrum Bar */}
          <div>
            <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-yellow-400 via-amber-500 via-orange-500 to-red-600 shadow-inner border border-black/10" />
            <div className="flex justify-between items-center text-[10px] font-semibold text-gray-500 mt-1">
              <span>&lt; 20cm</span>
              <span>20 - 40cm</span>
              <span>40 - 60cm</span>
              <span className="text-red-600 font-bold">&gt; 60cm</span>
            </div>
          </div>

          {/* Standardized 4-tier Levels */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-yellow-50/70 border border-yellow-200/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm" />
                <span className="text-[11px] font-semibold text-yellow-900">Mắt cá chân</span>
              </div>
              <span className="text-[10px] font-mono font-medium text-yellow-800">&lt; 20 cm</span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50/70 border border-amber-200/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
                <span className="text-[11px] font-semibold text-amber-900">Nửa bánh xe</span>
              </div>
              <span className="text-[10px] font-mono font-medium text-amber-800">20 - 40 cm</span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-orange-50/70 border border-orange-200/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm" />
                <span className="text-[11px] font-semibold text-orange-900">Đầu gối / Ngập pô</span>
              </div>
              <span className="text-[10px] font-mono font-medium text-orange-800">40 - 60 cm</span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-red-50/70 border border-red-200/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-sm" />
                <span className="text-[11px] font-bold text-red-900">Ngập sâu (Nguy hiểm)</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-red-700">&gt; 60 cm</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 pt-1">
            <Layers className="w-3 h-3 text-blue-500 flex-shrink-0" />
            <span>Viền đoạn đường hiển thị theo màu tương ứng</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloodDepthLegend;
