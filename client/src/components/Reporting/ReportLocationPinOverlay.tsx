import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, Check, Navigation, Loader2, Plus, Minus, Search } from 'lucide-react';
import { searchLocation } from '../../services/api';

interface ReportLocationPinOverlayProps {
  isPinning: boolean;
  isMoving: boolean;
  coord: { lat: number; lng: number };
  address: string;
  isLoadingAddress: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onLocateMe: () => void;
  onSelectLocation?: (lat: number, lng: number, label: string) => void;
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
  onSelectLocation,
  onZoomIn,
  onZoomOut,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync input text with map center address when not actively focused / typing
  useEffect(() => {
    if (!isFocused) {
      setSearchQuery(address || '');
    }
  }, [address, isFocused]);

  // Debounced autocomplete search
  useEffect(() => {
    if (!isFocused) return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchLocation(searchQuery);
      setSuggestions(results);
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, isFocused]);

  if (!isPinning) return null;

  return (
    <>
      {/* 1. Center Crosshair and Pin Marker (Fixed to screen/map center) */}
      <div className="pointer-events-none absolute inset-0 z-[1100] flex items-center justify-center">
        <div className="relative">
          {/* Spreading Concentric Radar Ring ("spread lan lan ra") */}
          <div className="absolute -top-10 -left-10 w-20 h-20 rounded-full border-2 border-blue-500/40 bg-blue-500/10 animate-radar pointer-events-none" />

          {/* Center Circle */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-blue-600 ring-2 ring-white shadow-md z-10" />

          {/* Floating Location Pin Shape with Pointy Bottom Tip */}
          <div
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-200 origin-bottom ${
              isMoving ? '-translate-y-5 scale-105' : 'translate-y-0 scale-100'
            }`}
          >
            {/* Tooltip badge */}
            <div className="mb-1.5 px-3 py-1 bg-slate-900/90 text-white text-[11px] font-semibold rounded-full shadow-lg border border-slate-700 whitespace-nowrap flex items-center gap-1.5 backdrop-blur-md">
              <span
                className={`w-2 h-2 rounded-full ${
                  isMoving ? 'bg-amber-400 animate-ping' : 'bg-pastel-sky-500'
                }`}
              />
              <span>{isMoving ? 'Đang chọn vị trí...' : 'Vị trí tâm điểm ngập'}</span>
            </div>

            {/* Seamless Location Pin SVG with Pointy Tip */}
            <div className="relative flex flex-col items-center -mb-0.5">
              <svg
                width="38"
                height="50"
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
                <path
                  d="M18 1C8.611 1 1 8.611 1 18c0 12.5 15.6 27.5 16.3 28.2a1 1 0 0 0 1.4 0C19.4 45.5 35 30.5 35 18 35 8.611 27.389 1 18 1z"
                  fill="url(#reportPinGrad)"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M18 9c-3.2 4.2-6.5 7.2-6.5 10a6.5 6.5 0 0 0 13 0c0-2.8-3.3-5.8-6.5-10z"
                  fill="white"
                />
              </svg>
            </div>
          </div>

          {/* Ground contact shadow */}
          <div
            className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-2 bg-slate-950/40 rounded-full blur-[1px] transition-all duration-200 ${
              isMoving ? 'scale-75 opacity-25' : 'scale-100 opacity-70'
            }`}
          />
        </div>
      </div>

      {/* 2. Top Address Card with Interactive Input & Autocomplete */}
      <div className="pointer-events-auto absolute top-5 left-1/2 -translate-x-1/2 z-[1200] w-[92%] max-w-lg bg-white/92 backdrop-blur-xl p-3.5 px-4 rounded-3xl shadow-2xl border border-sky-100/90 transition-all duration-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center overflow-hidden p-0.5 flex-shrink-0 shadow-xs">
              <img src="/logo.png" alt="SafeRoute" className="w-full h-full object-contain" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                Chọn điểm báo ngập trên bản đồ
              </h4>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                Kéo bản đồ hoặc gõ địa chỉ để căn chỉnh tâm ngập
              </p>
            </div>
          </div>
          {isLoadingAddress && !isSearching && (
            <span className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang định vị...</span>
            </span>
          )}
        </div>

        {/* Interactive Location Input Box */}
        <div className="relative">
          <div className="bg-slate-50/90 rounded-2xl p-2.5 border border-slate-200/80 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white transition-all flex items-center gap-2">
            <MapPin className="w-4 h-4 text-pastel-coral-600 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => {
                setIsFocused(true);
              }}
              onBlur={() => {
                setTimeout(() => {
                  setIsFocused(false);
                }, 250);
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập tên đường, địa chỉ hoặc địa danh..."
              className="text-xs bg-transparent w-full outline-none font-semibold text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5 active:scale-90 transition cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Current coordinates preview under input */}
          <div className="px-1 mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Tọa độ tâm: {coord.lat.toFixed(5)}, {coord.lng.toFixed(5)}</span>
            {isMoving && <span className="text-amber-500 font-sans font-bold animate-pulse">Đang di chuyển bản đồ...</span>}
          </div>

          {/* Dropdown Suggestions */}
          {isFocused && (
            <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl mt-1.5 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in">
              <div className="p-2 bg-slate-50/95 backdrop-blur-sm text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10">
                <span className="flex items-center gap-1">
                  <Search className="w-3 h-3 text-blue-600" />
                  Gợi ý địa chỉ
                </span>
              </div>

              {isSearching ? (
                <div className="py-7 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="text-xs font-semibold text-slate-700">Đang tìm kiếm địa chỉ...</span>
                  <span className="text-[10px] text-slate-400">Vui lòng chờ trong giây lát</span>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 text-center flex flex-col items-center justify-center gap-1">
                  <span className="font-semibold text-slate-700">Không tìm thấy địa chỉ</span>
                  <span className="text-[11px] text-slate-400">Thử nhập tên đường hoặc địa danh phổ biến</span>
                </div>
              ) : (
                suggestions.map((item, idx) => (
                    <div
                    key={idx}
                    onMouseDown={() => {
                      setSearchQuery(item.label);
                      setIsFocused(false);
                      onSelectLocation?.(item.lat, item.lng, item.label);
                    }}
                    title={`${item.label} (${item.lat.toFixed(4)}, ${item.lng.toFixed(4)})`}
                    className="p-2.5 text-xs text-slate-800 hover:bg-pastel-sky-50 hover:text-blue-900 cursor-pointer transition flex items-start gap-2 active:bg-pastel-sky-100"
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 leading-snug">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Action Bar */}
      <div className="pointer-events-auto absolute bottom-7 left-1/2 -translate-x-1/2 z-[1200] flex items-center gap-2 w-[92%] max-w-md select-none">
        {/* Cancel Button */}
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-3 min-h-[48px] bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-2xl border border-slate-300 shadow-lg hover:text-slate-950 active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <X className="w-4 h-4 text-slate-600" />
          <span>Hủy</span>
        </button>

        {/* Locate Me (GPS) Button */}
        <button
          type="button"
          onClick={onLocateMe}
          title="Di chuyển đến vị trí hiện tại của tôi"
          className="shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-3 min-h-[48px] bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-2xl border border-blue-200 shadow-lg active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Navigation className="w-4 h-4 text-blue-600" />
          <span className="hidden sm:inline">Vị trí của tôi</span>
          <span className="sm:hidden">GPS</span>
        </button>

        {/* Confirm Location Button */}
        <button
          type="button"
          onClick={onConfirm}
          disabled={isMoving}
          className="flex-1 min-w-0 flex items-center justify-center gap-2 py-3 px-4 min-h-[48px] bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
        >
          <Check className="w-4 h-4" />
          <span>Xác nhận vị trí</span>
        </button>
      </div>

      {/* 4. Floating Zoom Controls (+ / -) for easy zooming directly at center pin */}
      {(onZoomIn || onZoomOut) && (
        <div className="pointer-events-auto absolute right-5 top-1/2 -translate-y-1/2 z-[1200] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-sky-100/90 bg-white/95 backdrop-blur-xl select-none">
          {onZoomIn && (
            <button
              type="button"
              onClick={onZoomIn}
              title="Phóng to tâm bản đồ (+)"
              className="w-11 h-11 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-pastel-sky-50 transition font-bold active:scale-90 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
          {onZoomIn && onZoomOut && <div className="h-px bg-slate-100" />}
          {onZoomOut && (
            <button
              type="button"
              onClick={onZoomOut}
              title="Thu nhỏ tâm bản đồ (-)"
              className="w-11 h-11 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-pastel-sky-50 transition font-bold active:scale-90 cursor-pointer"
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
