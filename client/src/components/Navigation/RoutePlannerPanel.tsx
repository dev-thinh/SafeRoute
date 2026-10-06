import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  ArrowUpDown,
  Search,
  X,
  Crosshair,
  Map,
  Target,
  Newspaper,
  CloudRain,
  Loader2,
  PanelLeftClose,
  AlertTriangle,
  Waves,
  AlertOctagon,
  ShieldCheck,
} from 'lucide-react';
import { VehicleSelector } from './VehicleSelector';
import { TimeSelector } from './TimeSelector';
import { RouteComparisonCard } from './RouteComparisonCard';
import { NewsFeedTab } from '../News/NewsFeedTab';
import { WeatherTab } from '../Weather/WeatherTab';
import {
  navigateRoute,
  searchLocation,
  reverseGeocode,
} from '../../services/api';
import { NavigateResponse } from '../../types';

export interface LocationItem {
  label: string;
  lat: number;
  lng: number;
}

interface RoutePlannerPanelProps {
  origin: LocationItem;
  destination: LocationItem;
  onChangeOrigin: (loc: LocationItem) => void;
  onChangeDestination: (loc: LocationItem) => void;
  onRoutesCalculated: (routes: NavigateResponse) => void;
  selectedRouteType: 'safe' | 'fastest';
  onSelectRouteType: (t: 'safe' | 'fastest') => void;
  pickingField: 'origin' | 'dest' | null;
  onStartPickOnMap: (field: 'origin' | 'dest') => void;
  onCancelPickOnMap: () => void;
  onRefreshFloods?: (targetTime?: string) => void;
  onSelectLocation?: (lat: number, lng: number) => void;
  onToggleCollapse?: () => void;
}

export const RoutePlannerPanel: React.FC<RoutePlannerPanelProps> = ({
  origin,
  destination,
  onChangeOrigin,
  onChangeDestination,
  onRoutesCalculated,
  selectedRouteType,
  onSelectRouteType,
  pickingField,
  onStartPickOnMap,
  onCancelPickOnMap,
  onRefreshFloods,
  onSelectLocation,
  onToggleCollapse,
}) => {
  const [mainTab, setMainTab] = useState<'routes' | 'news' | 'weather'>('routes');
  const [vehicle, setVehicle] = useState<'motorbike' | 'car'>('motorbike');
  const [targetTime, setTargetTime] = useState<string>(() => new Date().toISOString());
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState<NavigateResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Search autocomplete state
  const [activeField, setActiveField] = useState<'origin' | 'dest' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationItem[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // GPS geolocation state
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    if (activeField) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      setSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchLocation(searchQuery);
        setSuggestions(results);
        setSearching(false);
      }, 300);
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, activeField]);

  const handleSelectLocation = (loc: LocationItem) => {
    setErrorMsg(null);
    if (activeField === 'origin') {
      onChangeOrigin(loc);
    } else if (activeField === 'dest') {
      onChangeDestination(loc);
    }
    setActiveField(null);
    setSearchQuery('');
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Trình duyệt không hỗ trợ định vị GPS.');
      setTimeout(() => setGpsError(null), 4000);
      return;
    }

    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGpsLoading(false);
        // Optimistically update origin immediately so marker and panel update in 0ms
        onChangeOrigin({
          label: 'Đang xác định địa chỉ GPS...',
          lat: latitude,
          lng: longitude,
        });
        // Resolve street name asynchronously in background
        reverseGeocode(latitude, longitude)
          .then((rev) => {
            onChangeOrigin({
              label: rev.label || 'Vị trí của tôi',
              lat: latitude,
              lng: longitude,
            });
          })
          .catch(() => {
            onChangeOrigin({
              label: `Tọa độ: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
              lat: latitude,
              lng: longitude,
            });
          });
      },
      (err) => {
        console.warn('GPS location error:', err);
        setGpsError('Không thể xác định vị trí GPS. Vui lòng cấp quyền truy cập vị trí trên trình duyệt.');
        setTimeout(() => setGpsError(null), 5000);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSwap = () => {
    if (loading) return;
    setErrorMsg(null);
    const temp = { ...origin };
    onChangeOrigin(destination);
    onChangeDestination(temp);
  };

  const handleSearch = async () => {
    if (loading || !origin.label.trim() || !destination.label.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      let finalOrigin = { ...origin };
      let finalDest = { ...destination };

      if (!finalOrigin.lat) {
        const found = await searchLocation(finalOrigin.label);
        if (found.length > 0) finalOrigin = found[0];
      }
      if (!finalDest.lat) {
        const found = await searchLocation(finalDest.label);
        if (found.length > 0) finalDest = found[0];
      }

      const data = await navigateRoute({
        origin: { lat: finalOrigin.lat, lng: finalOrigin.lng },
        destination: { lat: finalDest.lat, lng: finalDest.lng },
        target_time: targetTime,
        vehicle_type: vehicle,
      });
      setRouteData(data);
      onRoutesCalculated(data);
    } catch (err: any) {
      console.error('Route calculation failed', err);
      const friendlyMsg =
        err?.response?.data?.error ||
        'Không thể tính toán lộ trình né ngập lúc này. Vui lòng kiểm tra lại địa chỉ hoặc thử lại sau.';
      setErrorMsg(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const isFindRouteDisabled =
    loading ||
    !origin.label.trim() ||
    !destination.label.trim() ||
    (origin.lat !== 0 &&
      destination.lat !== 0 &&
      origin.lat === destination.lat &&
      origin.lng === destination.lng);

  return (
    <div className="absolute top-4 left-4 z-[1000] w-[calc(100vw-2rem)] sm:w-96 max-h-[92vh] overflow-y-auto bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gray-200/80 flex flex-col gap-3.5 transition-all">
      {/* Brand Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center shadow-xs">
            <Waves className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-base text-gray-900 tracking-tight leading-tight">
              SafeRoute
            </h2>
            <p className="text-[11px] text-gray-500 font-medium">
              Định tuyến né ngập thông minh TP.HCM
            </p>
          </div>
        </div>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Thu gọn bảng điều khiển"
            aria-label="Thu gọn bảng điều khiển"
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition active:scale-95 cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Tab Bar: Lộ Trình vs Tin Tức vs Thời Tiết */}
      <div className="flex items-center gap-1 p-1 bg-gray-100/90 rounded-xl border border-gray-200/80">
        <button
          type="button"
          onClick={() => setMainTab('routes')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
            mainTab === 'routes'
              ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Lộ trình</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('news')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
            mainTab === 'news'
              ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
          }`}
        >
          <Newspaper className="w-3.5 h-3.5" />
          <span>Tin tức</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('weather')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
            mainTab === 'weather'
              ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
          }`}
        >
          <CloudRain className="w-3.5 h-3.5" />
          <span>Thời tiết</span>
        </button>
      </div>

      {mainTab === 'news' ? (
        <NewsFeedTab
          onSelectLocation={onSelectLocation}
          onRefreshFloods={onRefreshFloods}
        />
      ) : mainTab === 'weather' ? (
        <WeatherTab onSelectLocation={onSelectLocation} />
      ) : (
        <>
          {/* Banner when pick-on-map is active */}
          {pickingField && (
            <div
              className={`p-2.5 rounded-xl flex items-center justify-between text-xs border ${
                pickingField === 'origin'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {pickingField === 'origin' ? (
                  <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Target className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>
                  {pickingField === 'origin'
                    ? 'Chấm chọn Điểm xuất phát'
                    : 'Chấm chọn Điểm đến'}
                </span>
              </div>
              <button
                type="button"
                onClick={onCancelPickOnMap}
                className={`text-xs font-bold hover:underline px-1.5 py-0.5 ${
                  pickingField === 'origin'
                    ? 'text-emerald-700 hover:text-emerald-900'
                    : 'text-rose-700 hover:text-rose-900'
                }`}
              >
                Hủy
              </button>
            </div>
          )}

          {/* Origin & Destination Inputs */}
          <div className="space-y-2">
            {/* Origin Field */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs inline-block" />
                  <span>Điểm xuất phát</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={loading || gpsLoading}
                    onClick={handleGetCurrentLocation}
                    className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md flex items-center gap-1 transition active:scale-95 disabled:opacity-50"
                    title="Lấy vị trí GPS hiện tại"
                  >
                    {gpsLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                    ) : (
                      <Crosshair className="w-3 h-3 text-blue-600" />
                    )}
                    <span>{gpsLoading ? 'Đang lấy GPS...' : 'Vị trí của tôi'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onStartPickOnMap('origin')}
                    className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 transition active:scale-95 disabled:opacity-50 ${
                      pickingField === 'origin'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200'
                    }`}
                    title="Ghim điểm xuất phát trên bản đồ"
                  >
                    <Map className="w-3 h-3" />
                    <span>Ghim trên map</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-gray-50/80 rounded-xl border border-gray-200/90 focus-within:border-emerald-500 focus-within:bg-white transition">
                <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <input
                  type="text"
                  disabled={loading}
                  value={activeField === 'origin' ? searchQuery : origin.label}
                  onFocus={() => {
                    setActiveField('origin');
                    setSearchQuery(origin.label);
                  }}
                  onBlur={() =>
                    setTimeout(() => {
                      if (activeField === 'origin') setActiveField(null);
                    }, 250)
                  }
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    onChangeOrigin({
                      label: e.target.value,
                      lat: 0,
                      lng: 0,
                    });
                  }}
                  placeholder="Nhập địa chỉ xuất phát..."
                  className="text-xs bg-transparent w-full outline-none font-medium text-gray-800 placeholder-gray-400 disabled:opacity-50"
                />
                {origin.label && !loading && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeOrigin({ label: '', lat: 0, lng: 0 });
                      setSearchQuery('');
                    }}
                    className="text-gray-400 hover:text-gray-600 p-0.5 active:scale-90 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Suggestions for Origin */}
              {activeField === 'origin' && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl mt-1.5 max-h-56 overflow-y-auto divide-y divide-gray-100">
                  <div className="p-2 bg-gray-50/95 backdrop-blur-sm text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10">
                    <span className="flex items-center gap-1">
                      <Search className="w-3 h-3 text-emerald-600" />
                      Gợi ý địa chỉ
                    </span>
                  </div>

                  {searching ? (
                    <div className="py-7 flex flex-col items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                      <span className="text-xs font-semibold text-gray-700">Đang tìm kiếm địa chỉ...</span>
                      <span className="text-[10px] text-gray-400">Vui lòng chờ trong giây lát</span>
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="p-4 text-xs text-gray-500 text-center flex flex-col items-center justify-center gap-1">
                      <span className="font-semibold text-gray-700">Không tìm thấy địa chỉ</span>
                      <span className="text-[11px] text-gray-400">Thử nhập tên đường hoặc địa danh phổ biến</span>
                    </div>
                  ) : (
                    suggestions.map((item, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => handleSelectLocation(item)}
                        className="p-2.5 text-xs text-gray-800 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer transition flex items-start gap-2 active:bg-emerald-100"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 leading-snug">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                            {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {gpsError && (
                <div className="p-2 bg-amber-50 border border-amber-200/90 rounded-xl text-[11px] text-amber-900 flex items-center gap-2 mt-1.5 animate-in fade-in">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span className="flex-1">{gpsError}</span>
                  <button
                    type="button"
                    onClick={() => setGpsError(null)}
                    className="p-0.5 text-amber-700 hover:text-amber-900 rounded cursor-pointer"
                    title="Đóng thông báo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Swap button */}
            <div className="flex justify-center -my-1.5 z-10 relative">
              <button
                type="button"
                disabled={loading}
                onClick={handleSwap}
                title="Đảo chiều điểm đi và điểm đến"
                className="group p-1.5 bg-white border border-gray-200/90 text-gray-600 hover:text-blue-600 rounded-full shadow-sm hover:shadow transition active:scale-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUpDown className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300" />
              </button>
            </div>

            {/* Destination Field */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs inline-block" />
                  <span>Điểm đến</span>
                </span>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onStartPickOnMap('dest')}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 transition active:scale-95 disabled:opacity-50 ${
                    pickingField === 'dest'
                      ? 'bg-rose-600 text-white'
                      : 'text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200'
                  }`}
                  title="Ghim điểm đến trên bản đồ"
                >
                  <Map className="w-3 h-3" />
                  <span>Ghim trên map</span>
                </button>
              </div>

              <div className="flex items-center gap-2 p-2 bg-gray-50/80 rounded-xl border border-gray-200/90 focus-within:border-rose-500 focus-within:bg-white transition">
                <Target className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <input
                  type="text"
                  disabled={loading}
                  value={activeField === 'dest' ? searchQuery : destination.label}
                  onFocus={() => {
                    setActiveField('dest');
                    setSearchQuery(destination.label);
                  }}
                  onBlur={() =>
                    setTimeout(() => {
                      if (activeField === 'dest') setActiveField(null);
                    }, 250)
                  }
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    onChangeDestination({
                      label: e.target.value,
                      lat: 0,
                      lng: 0,
                    });
                  }}
                  placeholder="Nhập địa chỉ điểm đến..."
                  className="text-xs bg-transparent w-full outline-none font-medium text-gray-800 placeholder-gray-400 disabled:opacity-50"
                />
                {destination.label && !loading && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeDestination({ label: '', lat: 0, lng: 0 });
                      setSearchQuery('');
                    }}
                    className="text-gray-400 hover:text-gray-600 p-0.5 active:scale-90 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Suggestions for Destination */}
              {activeField === 'dest' && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl mt-1.5 max-h-56 overflow-y-auto divide-y divide-gray-100">
                  <div className="p-2 bg-gray-50/95 backdrop-blur-sm text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10">
                    <span className="flex items-center gap-1">
                      <Search className="w-3 h-3 text-rose-600" />
                      Gợi ý địa chỉ
                    </span>
                  </div>

                  {searching ? (
                    <div className="py-7 flex flex-col items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
                      <span className="text-xs font-semibold text-gray-700">Đang tìm kiếm địa chỉ...</span>
                      <span className="text-[10px] text-gray-400">Vui lòng chờ trong giây lát</span>
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="p-4 text-xs text-gray-500 text-center flex flex-col items-center justify-center gap-1">
                      <span className="font-semibold text-gray-700">Không tìm thấy địa chỉ</span>
                      <span className="text-[11px] text-gray-400">Thử nhập tên đường hoặc địa danh phổ biến</span>
                    </div>
                  ) : (
                    suggestions.map((item, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => handleSelectLocation(item)}
                        className="p-2.5 text-xs text-gray-800 hover:bg-rose-50 hover:text-rose-800 cursor-pointer transition flex items-start gap-2 active:bg-rose-100"
                      >
                        <Target className="w-3.5 h-3.5 text-rose-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 leading-snug">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
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

          <VehicleSelector vehicle={vehicle} onChange={setVehicle} disabled={loading} />
          <TimeSelector
            selectedTime={targetTime}
            disabled={loading}
            onChange={(t) => {
              setTargetTime(t);
              if (onRefreshFloods) onRefreshFloods(t);
            }}
          />

          {/* Primary CTA button with locking and loading state */}
          <button
            type="button"
            onClick={handleSearch}
            disabled={isFindRouteDisabled}
            className="w-full py-3.5 min-h-[46px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Đang tính toán lộ trình né ngập...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 fill-current text-white" />
                <span>Tìm lộ trình an toàn</span>
              </>
            )}
          </button>

          {/* Route calculation error notification */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200/90 rounded-xl text-xs flex items-start gap-2.5 text-red-900 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-red-900 mb-0.5 leading-snug">
                  Không thể tính lộ trình
                </div>
                <p className="text-[11px] text-red-700 leading-normal">{errorMsg}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100/60 rounded-lg transition cursor-pointer"
                title="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Route Results Comparison Section */}
          {routeData && (
            <div className="space-y-2.5 pt-2 border-t border-gray-100">
              {/* Visual Flood Detection Alert Banner */}
              {routeData.safe_route.isFlooded ? (
                <div className="p-3 bg-red-50 border border-red-200/90 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-red-900">
                    <AlertOctagon className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>
                      Mọi ngả đường đều ngập sâu {routeData.safe_route.maxFloodDepthCm} cm ({routeData.safe_route.floodedDistanceMeters} m)
                    </span>
                  </div>
                  <p className="text-red-700 text-[11px] leading-tight">
                    Khu vực xung quanh ngập sâu diện rộng. Vui lòng cân nhắc đổi thời gian di chuyển.
                  </p>
                </div>
              ) : routeData.fastest_route.isFlooded ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200/90 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Đã tự động né ngập thành công
                    </span>
                  </div>
                  <p className="text-emerald-700 text-[11px] leading-tight">
                    Tuyến nhanh nhất ngập {routeData.fastest_route.maxFloodDepthCm} cm ({routeData.fastest_route.floodedDistanceMeters} m). Đã chuyển sang lộ trình khô ráo.
                  </p>
                </div>
              ) : null}

              <RouteComparisonCard
                type="safe"
                distanceMeters={routeData.safe_route.distanceMeters}
                durationSeconds={routeData.safe_route.durationSeconds}
                isFlooded={routeData.safe_route.isFlooded}
                maxFloodDepthCm={routeData.safe_route.maxFloodDepthCm}
                floodedDistanceMeters={routeData.safe_route.floodedDistanceMeters}
                hasAvoidedFlood={routeData.fastest_route.isFlooded && !routeData.safe_route.isFlooded}
                isSelected={selectedRouteType === 'safe'}
                onSelect={() => onSelectRouteType('safe')}
              />

              <RouteComparisonCard
                type="fastest"
                distanceMeters={routeData.fastest_route.distanceMeters}
                durationSeconds={routeData.fastest_route.durationSeconds}
                isFlooded={routeData.fastest_route.isFlooded}
                maxFloodDepthCm={routeData.fastest_route.maxFloodDepthCm}
                floodedDistanceMeters={routeData.fastest_route.floodedDistanceMeters}
                isSelected={selectedRouteType === 'fastest'}
                onSelect={() => onSelectRouteType('fastest')}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RoutePlannerPanel;
