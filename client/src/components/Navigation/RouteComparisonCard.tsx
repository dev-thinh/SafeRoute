import React from 'react';
import { ShieldCheck, Zap } from 'lucide-react';

interface RouteCardProps {
  type: 'safe' | 'fastest';
  distanceMeters: number;
  durationSeconds: number;
  isFlooded: boolean;
  maxFloodDepthCm?: number;
  floodedDistanceMeters: number;
  isSelected: boolean;
  onSelect: () => void;
}

export const RouteComparisonCard: React.FC<RouteCardProps> = ({
  type,
  distanceMeters,
  durationSeconds,
  isFlooded,
  maxFloodDepthCm,
  floodedDistanceMeters,
  isSelected,
  onSelect,
}) => {
  const km = (distanceMeters / 1000).toFixed(1);
  const minutes = Math.round(durationSeconds / 60);

  return (
    <div
      onClick={onSelect}
      className={`p-3.5 rounded-xl border-2 cursor-pointer transition ${
        isSelected
          ? type === 'safe'
            ? 'border-sky-500 bg-sky-50/70 shadow-md ring-1 ring-sky-400'
            : 'border-purple-500 bg-purple-50/70 shadow-md ring-1 ring-purple-400'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {type === 'safe' ? (
            <span className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </span>
          ) : (
            <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
              <Zap className="w-5 h-5" />
            </span>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full inline-block ${
                  type === 'safe' ? 'bg-sky-500' : 'bg-purple-600'
                }`}
              />
              <h4 className="text-xs font-bold text-gray-900">
                {type === 'safe' ? 'Tuyến Né Ngập (Xanh Da Trời)' : 'Tuyến Nhanh Nhất (Tím Neon)'}
              </h4>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">{km} km • {minutes} phút</p>
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs">
        {type === 'safe' ? (
          <span className="text-sky-700 font-semibold">✓ Khô ráo, né toàn bộ điểm ngập</span>
        ) : isFlooded ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-red-700 font-bold">
              ⚠️ Cắt qua đoạn ngập: {maxFloodDepthCm ? `${maxFloodDepthCm}cm` : ''} (~{floodedDistanceMeters}m)
            </span>
            <span className="text-[10px] text-gray-500 italic">
              Đoạn ngập được tô màu Vàng ➔ Đỏ tương ứng mức độ trên bản đồ
            </span>
          </div>
        ) : (
          <span className="text-gray-600 font-medium">Đường khô ráo</span>
        )}
      </div>
    </div>
  );
};
