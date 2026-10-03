import React from 'react';
import { ShieldCheck, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface RouteCardProps {
  type: 'safe' | 'fastest';
  distanceMeters: number;
  durationSeconds: number;
  isFlooded: boolean;
  maxFloodDepthCm?: number;
  floodedDistanceMeters: number;
  hasAvoidedFlood?: boolean;
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
  hasAvoidedFlood = false,
  isSelected,
  onSelect,
}) => {
  const km = (distanceMeters / 1000).toFixed(1);
  const minutes = Math.round(durationSeconds / 60);

  const isSafe = type === 'safe';

  return (
    <div
      onClick={onSelect}
      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.99] select-none ${
        isSelected
          ? isSafe
            ? 'border-emerald-500 bg-emerald-50/70 shadow-md ring-1 ring-emerald-400'
            : 'border-blue-500 bg-blue-50/70 shadow-md ring-1 ring-blue-400'
          : 'border-gray-200/90 hover:border-gray-300 bg-white hover:shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Card Icon */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isSafe
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {isSafe ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            ) : (
              <Zap className="w-5 h-5 text-blue-600" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  isSafe ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
              />
              <h4 className="text-xs font-bold text-gray-900">
                {isSafe ? 'Lộ trình an toàn' : 'Lộ trình nhanh nhất'}
              </h4>
            </div>
            <p className="text-[11px] font-medium text-gray-500 mt-0.5">
              {km} km • {minutes} phút
            </p>
          </div>
        </div>

        {/* Selection indicator pill */}
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected
              ? isSafe
                ? 'border-emerald-600 bg-emerald-600'
                : 'border-blue-600 bg-blue-600'
              : 'border-gray-300 bg-white'
          }`}
        >
          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>

      {/* Flood Status indicator banner */}
      <div className="mt-2.5 pt-2 border-t border-gray-100 text-xs">
        {isSafe ? (
          isFlooded ? (
            <div className="flex items-center gap-1.5 text-red-700 font-semibold text-[11px] bg-red-50 p-2 rounded-lg border border-red-100">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
              <span>
                Vẫn có đoạn ngập: {maxFloodDepthCm ? `${maxFloodDepthCm} cm • ` : ''}
                {floodedDistanceMeters} m
              </span>
            </div>
          ) : hasAvoidedFlood ? (
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] bg-emerald-100/70 p-2 rounded-lg border border-emerald-200/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Đã né 100% điểm ngập</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Tuyến đường khô ráo, an toàn</span>
            </div>
          )
        ) : isFlooded ? (
          <div className="flex items-center gap-1.5 text-red-700 font-semibold text-[11px] bg-red-50 p-2 rounded-lg border border-red-100">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
            <span>
              Cắt qua đoạn ngập: {maxFloodDepthCm ? `${maxFloodDepthCm} cm • ` : ''}
              {floodedDistanceMeters} m
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-gray-700 font-medium text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span>Tuyến đường khô ráo</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteComparisonCard;
