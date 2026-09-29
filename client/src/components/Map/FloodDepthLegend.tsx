import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Info } from 'lucide-react';

export const FloodDepthLegend: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-[999] max-w-[280px] bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl shadow-xl transition-all">
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-gray-50/50 rounded-2xl"
      >
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Thang cảnh báo ngập lụt</span>
        </div>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 transition"
          aria-label={collapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-2.5">
          {/* Continuous Gradient Bar */}
          <div>
            <div className="h-3 w-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 via-red-500 to-red-900 shadow-inner border border-black/10" />
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 mt-1">
              <span>Vàng (Nhẹ)</span>
              <span>Cam</span>
              <span>Đỏ</span>
              <span className="text-red-700">Đỏ sẫm (Cấm)</span>
            </div>
          </div>

          {/* Level Details */}
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-400 flex-shrink-0 border border-yellow-600/30 shadow-sm" />
              <div className="flex justify-between w-full">
                <span className="font-semibold text-yellow-900">Ngập nhẹ:</span>
                <span className="text-gray-600">≤ 15cm (Đi chậm)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0 border border-orange-600/30 shadow-sm" />
              <div className="flex justify-between w-full">
                <span className="font-semibold text-orange-900">Cảnh báo:</span>
                <span className="text-gray-600">16 - 25cm (Xe máy cẩn trọng)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0 border border-red-600/30 shadow-sm" />
              <div className="flex justify-between w-full">
                <span className="font-semibold text-red-900">Ngập sâu:</span>
                <span className="text-gray-600">26 - 35cm (Nguy cơ chết máy)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-900 flex-shrink-0 border border-black/40 shadow-sm" />
              <div className="flex justify-between w-full">
                <span className="font-bold text-red-950">Mức cấm:</span>
                <span className="text-red-700 font-bold">&gt; 35cm (Không lưu thông)</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 italic bg-gray-50 p-1.5 rounded-lg flex items-center gap-1 border border-gray-100">
            <Info className="w-3 h-3 text-blue-500 flex-shrink-0" />
            <span>Đoạn ngập trên lộ trình được tô viền màu tương ứng để nhận biết.</span>
          </div>
        </div>
      )}
    </div>
  );
};
