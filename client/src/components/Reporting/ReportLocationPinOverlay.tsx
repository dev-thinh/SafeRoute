import React from 'react';
import { Droplet, MapPin, X, Check, Navigation, Loader2 } from 'lucide-react';

interface ReportLocationPinOverlayProps {
  isPinning: boolean;
  isMoving: boolean;
  coord: { lat: number; lng: number };
  address: string;
  isLoadingAddress: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onLocateMe: () => void;
}

export const ReportLocationPinOverlay: React.FC<ReportLocationPinOverlayProps> = ({
  isPinning,
  isMoving,
  coord,
  address,
  isLoadingAddress,
  onConfirm,
  onCancel,
  onLocateMe,
}) => {
  if (!isPinning) return null;

  return (
    <>
      {/* 1. Center Crosshair and Pin Marker (Fixed to screen/map center) */}
      <div className="pointer-events-none absolute inset-0 z-[1100] flex items-center justify-center">
        <div className="relative">
          {/* Target crosshair rings at exact center (0, 0) */}
          <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full border-2 border-dashed border-blue-500/60 animate-pulse flex items-center justify-center">
            {/* Center crosshair dot */}
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full shadow" />
          </div>

          {/* Floating Pin right above center tip */}
          <div
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-200 origin-bottom ${
              isMoving ? '-translate-y-4 scale-105' : 'translate-y-0 scale-100'
            }`}
          >
            {/* Tooltip badge */}
            <div className="mb-1.5 px-3 py-1 bg-gray-900/90 text-white text-[11px] font-semibold rounded-full shadow-lg border border-gray-700 whitespace-nowrap flex items-center gap-1.5 backdrop-blur-sm">
              <span className={`w-2 h-2 rounded-full ${isMoving ? 'bg-amber-400 animate-ping' : 'bg-blue-400'}`} />
              <span>{isMoving ? 'Thả để chọn điểm này' : 'Điểm ngập cần báo'}</span>
            </div>

            {/* Pin Graphic */}
            <div className="relative flex flex-col items-center">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-full flex items-center justify-center text-white shadow-2xl border-2 border-white ring-4 ring-blue-500/25">
                <Droplet className="w-5 h-5 fill-current" />
              </div>
              {/* Pointer triangle needle pointing directly at center */}
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-cyan-500 -mt-0.5" />
            </div>
          </div>

          {/* Ground contact shadow */}
          <div
            className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-black/40 rounded-full blur-[1px] transition-all duration-200 ${
              isMoving ? 'scale-75 opacity-25' : 'scale-100 opacity-70'
            }`}
          />
        </div>
      </div>

      {/* 2. Top Instructions and Address Preview Card */}
      <div className="pointer-events-auto absolute top-5 left-1/2 -translate-x-1/2 z-[1200] w-[92%] max-w-lg bg-white/95 backdrop-blur-md p-3.5 px-4 rounded-2xl shadow-2xl border border-gray-200/80 transition-all duration-200">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Droplet className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 leading-tight">
              Kéo bản đồ để đặt tâm vào điểm ngập
            </h4>
            <p className="text-[11px] text-gray-500 leading-tight">
              Di chuyển hoặc phóng to thu nhỏ bản đồ để chấm đúng vị trí trên đường
            </p>
          </div>
        </div>

        {/* Selected Street Address preview */}
        <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-200/70 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {isLoadingAddress ? (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>Đang xác định địa chỉ...</span>
              </div>
            ) : (
              <p className="text-xs font-semibold text-gray-800 truncate" title={address}>
                {address || `Tọa độ: ${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`}
              </p>
            )}
            <p className="text-[10px] text-gray-400 font-mono">
              Tọa độ: {coord.lat.toFixed(5)}, {coord.lng.toFixed(5)}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Bottom Action Bar */}
      <div className="pointer-events-auto absolute bottom-7 left-1/2 -translate-x-1/2 z-[1200] flex items-center gap-2.5 w-[92%] max-w-md">
        {/* Cancel Button */}
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center gap-1.5 px-4 py-3 bg-white/95 hover:bg-white text-gray-700 text-xs font-bold rounded-xl border border-gray-200 shadow-xl transition backdrop-blur-sm hover:text-gray-900"
        >
          <X className="w-4 h-4" />
          <span>Hủy</span>
        </button>

        {/* Locate Me (GPS) Button */}
        <button
          type="button"
          onClick={onLocateMe}
          title="Di chuyển đến vị trí hiện tại của tôi"
          className="flex items-center justify-center gap-1.5 px-3.5 py-3 bg-white/95 hover:bg-white text-blue-600 text-xs font-bold rounded-xl border border-gray-200 shadow-xl transition backdrop-blur-sm hover:bg-blue-50"
        >
          <Navigation className="w-4 h-4" />
          <span className="hidden sm:inline">Vị trí của tôi</span>
        </button>

        {/* Confirm Location Button */}
        <button
          type="button"
          onClick={onConfirm}
          disabled={isMoving}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Check className="w-4 h-4" />
          <span>Xác nhận vị trí này</span>
        </button>
      </div>
    </>
  );
};
