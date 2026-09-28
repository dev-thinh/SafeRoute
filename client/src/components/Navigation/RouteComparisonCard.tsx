import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface RouteCardProps {
  type: 'safe' | 'fastest';
  distanceMeters: number;
  durationSeconds: number;
  isFlooded: boolean;
  floodedDistanceMeters: number;
  isSelected: boolean;
  onSelect: () => void;
}

export const RouteComparisonCard: React.FC<RouteCardProps> = ({
  type,
  distanceMeters,
  durationSeconds,
  isFlooded,
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
            ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
            : 'border-amber-500 bg-amber-50/50 shadow-sm'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {type === 'safe' ? (
            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </span>
          ) : (
            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </span>
          )}
          <div>
            <h4 className="text-xs font-bold text-gray-900">
              {type === 'safe' ? 'Tuyến Né Ngập (Khuyên dùng)' : 'Tuyến Nhanh Nhất'}
            </h4>
            <p className="text-[11px] text-gray-500">{km} km • {minutes} phút</p>
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs">
        {type === 'safe' ? (
          <span className="text-emerald-700 font-semibold">✓ An toàn, không ngập nước</span>
        ) : isFlooded ? (
          <span className="text-amber-700 font-semibold">
            ⚠️ Đoạn ngập dài ~{floodedDistanceMeters}m
          </span>
        ) : (
          <span className="text-gray-600">Đường khô ráo</span>
        )}
      </div>
    </div>
  );
};
