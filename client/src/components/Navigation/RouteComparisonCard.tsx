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
      title={isSafe ? 'Chọn lộ trình né ngập an toàn (ưu tiên đường cao ráo, ít ngập)' : 'Chọn lộ trình nhanh nhất (tối ưu thời gian)'}
      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 active:scale-[0.99] select-none ${
        isSelected
          ? isSafe
            ? 'border-pastel-mint-600 bg-pastel-mint-50/80 shadow-md shadow-pastel-mint-500/10 ring-2 ring-pastel-mint-200'
            : 'border-blue-600 bg-pastel-sky-50/80 shadow-md shadow-blue-500/10 ring-2 ring-pastel-sky-200'
          : 'border-slate-200/80 hover:border-slate-300 bg-white hover:shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Card Icon */}
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
              isSafe
                ? 'bg-pastel-mint-100 text-pastel-mint-700'
                : 'bg-pastel-sky-100 text-blue-700'
            }`}
          >
            {isSafe ? (
              <ShieldCheck className="w-5 h-5 text-pastel-mint-700" />
            ) : (
              <Zap className="w-5 h-5 text-blue-600" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full inline-block ${
                  isSafe ? 'bg-pastel-mint-600 shadow-xs' : 'bg-blue-600 shadow-xs'
                }`}
              />
              <h4 className="text-xs font-bold text-slate-900">
                {isSafe ? 'Lộ trình né ngập an toàn' : 'Lộ trình nhanh nhất'}
              </h4>
            </div>
            <p
              className="text-[11px] font-semibold text-slate-500 mt-0.5 font-mono"
              title={`Tổng quãng đường: ${km} km, thời gian dự kiến: ~${minutes} phút`}
            >
              {km} km • ~{minutes} phút di chuyển
            </p>
          </div>
        </div>

        {/* Selection indicator pill */}
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected
              ? isSafe
                ? 'border-pastel-mint-600 bg-pastel-mint-600'
                : 'border-blue-600 bg-blue-600'
              : 'border-slate-300 bg-white'
          }`}
        >
          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>

      {/* Flood Status indicator banner */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs">
        {isSafe ? (
          isFlooded ? (
            <div
              title={`Đoạn ngập dài ${floodedDistanceMeters} m, sâu tối đa ${maxFloodDepthCm || 0} cm`}
              className="flex items-center gap-1.5 text-pastel-coral-900 font-semibold text-[11px] bg-pastel-coral-50 p-2 rounded-xl border border-pastel-coral-200"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-pastel-coral-600 flex-shrink-0" />
              <span>
                Vẫn có đoạn ngập: {maxFloodDepthCm ? `${maxFloodDepthCm} cm • ` : ''}
                {floodedDistanceMeters} m
              </span>
            </div>
          ) : hasAvoidedFlood ? (
            <div
              title="Thuật toán an toàn đã phân tích và tránh 100% các đoạn đường ngập nước"
              className="flex items-center gap-1.5 text-pastel-mint-900 font-bold text-[11px] bg-pastel-mint-100/80 p-2 rounded-xl border border-pastel-mint-200"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-pastel-mint-700 flex-shrink-0" />
              <span>Đã né 100% điểm ngập nước</span>
            </div>
          ) : (
            <div
              title="Không có điểm ngập nào trên tuyến đường này"
              className="flex items-center gap-1.5 text-pastel-mint-800 font-semibold text-[11px] bg-pastel-mint-50/70 p-2 rounded-xl border border-pastel-mint-100"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-pastel-mint-600 flex-shrink-0" />
              <span>Tuyến đường khô ráo, hoàn toàn an toàn</span>
            </div>
          )
        ) : isFlooded ? (
          <div
            title={`Đoạn ngập dài ${floodedDistanceMeters} m, sâu tối đa ${maxFloodDepthCm || 0} cm`}
            className="flex items-center gap-1.5 text-pastel-coral-900 font-semibold text-[11px] bg-pastel-coral-50 p-2 rounded-xl border border-pastel-coral-200"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-pastel-coral-600 flex-shrink-0" />
            <span>
              Cắt qua đoạn ngập: {maxFloodDepthCm ? `${maxFloodDepthCm} cm • ` : ''}
              {floodedDistanceMeters} m
            </span>
          </div>
        ) : (
          <div
            title="Lộ trình nhanh nhất hiện tại không bị ngập"
            className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span>Tuyến đường thông thoáng, khô ráo</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteComparisonCard;
