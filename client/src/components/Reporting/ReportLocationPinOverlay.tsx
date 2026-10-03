import React from 'react';
import { Droplet, MapPin, X, Check, Navigation, Loader2, Plus, Minus } from 'lucide-react';

interface ReportLocationPinOverlayProps {
  isPinning: boolean;
  isMoving: boolean;
  coord: { lat: number; lng: number };
  address: string;
  isLoadingAddress: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onLocateMe: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
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
  onZoomIn,
  onZoomOut,
}) => {
  if (!isPinning) return null;

  return (
    <>
      {/* 1. Center Crosshair and Pin Marker (Fixed to screen/map center) */}
      <div className="pointer-events-none absolute inset-0 z-[1100] flex items-center justify-center">
        <div className="relative">
          {/* Spreading Ripple Effect emanating from center ("spread lan lan ra") */}
          <div className="absolute -top-7 -left-7 w-14 h-14 rounded-full border-2 border-blue-500/50 bg-blue-500/15 animate-ping pointer-events-none" />

          {/* 1 Tiny Center Circle ("vòng tròn nhỏ xíu ở giữa") */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-blue-600 ring-2 ring-white shadow-md z-10" />

          {/* Floating Location Pin Shape with Pointy Bottom Tip */}
          <div
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-200 origin-bottom ${
              isMoving ? '-translate-y-5 scale-105' : 'translate-y-0 scale-100'
            }`}
          >
            {/* Tooltip badge */}
            <div className="mb-1.5 px-3 py-1 bg-gray-900/90 text-white text-[11px] font-semibold rounded-full shadow-lg border border-gray-700 whitespace-nowrap flex items-center gap-1.5 backdrop-blur-sm">
              <span
                className={`w-2 h-2 rounded-full ${
                  isMoving ? 'bg-amber-400 animate-ping' : 'bg-blue-400'
                }`}
              />
              <span>{isMoving ? 'Đang chọn vị trí...' : 'Vị trí báo ngập'}</span>
            </div>

            {/* Seamless Location Pin SVG with Pointy Tip */}
            <div className="relative flex flex-col items-center -mb-0.5">
              <svg
                width="36"
                height="48"
                viewBox="0 0 36 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-xl"
              >
                <defs>
                  <linearGradient id="reportPinGrad" x1="18" y1="1" x2="18" y2="47" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#1D4ED8" />
                  </linearGradient>
                </defs>
                {/* Location Pin Shape with pointy tip at bottom (18, 47) */}
                <path
                  d="M18 1C8.611 1 1 8.611 1 18c0 12.5 15.6 27.5 16.3 28.2a1 1 0 0 0 1.4 0C19.4 45.5 35 30.5 35 18 35 8.611 27.389 1 18 1z"
                  fill="url(#reportPinGrad)"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                {/* Water droplet icon inside */}
                <path
                  d="M18 9c-3.2 4.2-6.5 7.2-6.5 10a6.5 6.5 0 0 0 13 0c0-2.8-3.3-5.8-6.5-10z"
                  fill="white"
                />
              </svg>
            </div>
          </div>

          {/* Ground contact shadow */}
          <div
            className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-2 bg-blue-950/40 rounded-full blur-[1px] transition-all duration-200 ${
              isMoving ? 'scale-75 opacity-25' : 'scale-100 opacity-70'
            }`}
          />
        </div>
      </div>

      {/* 2. Top Address Card */}
      <div className="pointer-events-auto absolute top-5 left-1/2 -translate-x-1/2 z-[1200] w-[92%] max-w-lg bg-white/95 backdrop-blur-md p-3.5 px-4 rounded-2xl shadow-2xl border border-gray-200/80 transition-all duration-200">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Droplet className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 leading-tight">
              Điểm báo ngập trên bản đồ
            </h4>
            <p className="text-[11px] text-gray-500 leading-tight">
              Tọa độ được tự động đồng bộ theo tâm màn hình
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
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
              {coord.lat.toFixed(5)}, {coord.lng.toFixed(5)}
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
          className="flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] bg-white/95 hover:bg-white text-gray-700 text-xs font-bold rounded-xl border border-gray-200 shadow-xl transition-all backdrop-blur-sm hover:text-gray-900 active:scale-95 cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>Hủy</span>
        </button>

        {/* Locate Me (GPS) Button */}
        <button
          type="button"
          onClick={onLocateMe}
          title="Di chuyển đến vị trí hiện tại của tôi"
          className="flex items-center justify-center gap-1.5 px-3.5 py-3 min-h-[44px] bg-white/95 hover:bg-white text-blue-600 text-xs font-bold rounded-xl border border-gray-200 shadow-xl transition-all backdrop-blur-sm hover:bg-blue-50 active:scale-95 cursor-pointer"
        >
          <Navigation className="w-4 h-4" />
          <span className="hidden sm:inline">Vị trí của tôi</span>
        </button>

        {/* Confirm Location Button */}
        <button
          type="button"
          onClick={onConfirm}
          disabled={isMoving || isLoadingAddress}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 min-h-[44px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>Xác nhận vị trí</span>
        </button>
      </div>

      {/* 4. Floating Zoom Controls (+ / -) for easy zooming directly at center pin */}
      {(onZoomIn || onZoomOut) && (
        <div className="pointer-events-auto absolute right-5 top-1/2 -translate-y-1/2 z-[1200] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-gray-200/90 bg-white/95 backdrop-blur-md">
          {onZoomIn && (
            <button
              type="button"
              onClick={onZoomIn}
              title="Phóng to tâm bản đồ (+)"
              className="w-11 h-11 flex items-center justify-center text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition font-bold active:scale-90 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
          {onZoomIn && onZoomOut && <div className="h-px bg-gray-200" />}
          {onZoomOut && (
            <button
              type="button"
              onClick={onZoomOut}
              title="Thu nhỏ tâm bản đồ (-)"
              className="w-11 h-11 flex items-center justify-center text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition font-bold active:scale-90 cursor-pointer"
            >
              <Minus className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default ReportLocationPinOverlay;
