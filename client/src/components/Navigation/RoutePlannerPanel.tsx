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
  AlertOctagon,
  ShieldCheck,
} from 'lucide-react';
import { VehicleSelector } from './VehicleSelector';
import { TimeSelector } from './TimeSelector';
import { RouteComparisonCard } from './RouteComparisonCard';
import { QuickPresetChips } from './QuickPresetChips';
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
  activeTab?: 'routes' | 'news' | 'weather';
  onTabChange?: (t: 'routes' | 'news' | 'weather') => void;
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
  activeTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<'routes' | 'news' | 'weather'>('routes');
  const mainTab = activeTab !== undefined ? activeTab : internalTab;
  const setMainTab = (tab: 'routes' | 'news' | 'weather') => {
    if (onTabChange) onTabChange(tab);
    setInternalTab(tab);
  };

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

  const handlePresetSelect = (preset: LocationItem, targetField: 'origin' | 'dest') => {
    setErrorMsg(null);
    if (targetField === 'origin') {
      onChangeOrigin(preset);
    } else {
      onChangeDestination(preset);
    }
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
        // Optimistically update origin immediately
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
    <div className="absolute top-4 left-4 z-[1000] w-[calc(100vw-2rem)] sm:w-[410px] max-h-[92vh] overflow-y-auto bg-white/92 backdrop-blur-xl p-4 sm:p-4.5 rounded-3xl shadow-2xl border border-sky-100/90 flex flex-col gap-3.5 transition-all select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between pb-0.5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center shadow-xs overflow-hidden p-1 flex-shrink-0">
            <img src="/logo.png" alt="SafeRoute Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-extrabold text-base text-slate-900 tracking-tight leading-tight">
                SafeRoute
              </h2>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-pastel-mint-100 text-pastel-mint-800 border border-pastel-mint-200">
                TP.HCM
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Định tuyến né ngập thông minh & an toàn
            </p>
          </div>
        </div>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Thu gọn bảng điều khiển"
            aria-label="Thu gọn bảng điều khiển"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition active:scale-95 cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Segmented Pill Tab Bar: Lộ Trình vs Tin Tức vs Thời Tiết */}
      <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60">
        <button
          type="button"
          onClick={() => setMainTab('routes')}
          title="Tìm kiếm và so sánh lộ trình né ngập"
          aria-label="Chuyển sang tab Tìm lộ trình"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-200 min-h-[38px] cursor-pointer ${
            mainTab === 'routes'
              ? 'bg-white text-blue-700 shadow-sm shadow-blue-500/10 ring-1 ring-black/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Lộ trình</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('news')}
          title="Xem tin tức ngập lụt được AI tổng hợp"
          aria-label="Chuyển sang tab Tin tức ngập lụt"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-200 min-h-[38px] cursor-pointer ${
            mainTab === 'news'
              ? 'bg-white text-blue-700 shadow-sm shadow-blue-500/10 ring-1 ring-black/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Newspaper className="w-3.5 h-3.5" />
          <span>Tin tức</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('weather')}
          title="Xem tình hình mưa & triều cường TP.HCM"
          aria-label="Chuyển sang tab Thời tiết và triều cường"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-200 min-h-[38px] cursor-pointer ${
            mainTab === 'weather'
              ? 'bg-white text-blue-700 shadow-sm shadow-blue-500/10 ring-1 ring-black/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
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
              className={`p-3 rounded-2xl flex items-center justify-between text-xs border transition-all animate-in fade-in ${
                pickingField === 'origin'
                  ? 'bg-pastel-mint-50 text-pastel-mint-800 border-pastel-mint-200'
                  : 'bg-pastel-coral-50 text-pastel-coral-800 border-pastel-coral-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {pickingField === 'origin' ? (
                  <MapPin className="w-4 h-4 text-pastel-mint-600 flex-shrink-0" />
                ) : (
                  <Target className="w-4 h-4 text-pastel-coral-600 flex-shrink-0" />
                )}
                <span>
                  {pickingField === 'origin'
                    ? 'Chạm bản đồ để ghim Điểm xuất phát'
                    : 'Chạm bản đồ để ghim Điểm đến'}
                </span>
              </div>
              <button
                type="button"
                onClick={onCancelPickOnMap}
                className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl transition active:scale-95 cursor-pointer bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-sm whitespace-nowrap"
              >
                Hủy
              </button>
            </div>
          )}

          {/* Origin & Destination Inputs Card */}
          <div className="space-y-2">
            {/* Origin Field */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1 px-0.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-pastel-mint-600 shadow-xs inline-block" />
                  <span>Điểm xuất phát (A)</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={loading || gpsLoading}
                    onClick={handleGetCurrentLocation}
                    className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-pastel-sky-50 hover:bg-pastel-sky-100 px-2 py-1 rounded-lg flex items-center gap-1 transition active:scale-95 disabled:opacity-50 cursor-pointer"
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
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                      pickingField === 'origin'
                        ? 'bg-pastel-mint-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                    }`}
                    title="Ghim điểm xuất phát trên bản đồ"
                  >
                    <Map className="w-3 h-3" />
                    <span>Ghim trên map</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-pastel-mint-50/40 rounded-2xl border border-pastel-mint-200/70 focus-within:border-pastel-mint-600 focus-within:ring-2 focus-within:ring-pastel-mint-100 focus-within:bg-white transition-all">
                <MapPin className="w-4 h-4 text-pastel-mint-600 flex-shrink-0" />
                <input
                  type="text"
                  disabled={loading}
                  value={activeField === 'origin' ? searchQuery : origin.label}
                  title={origin.label || 'Nhập địa chỉ xuất phát...'}
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
                  className="text-xs bg-transparent w-full outline-none font-semibold text-slate-800 placeholder-slate-400 disabled:opacity-50"
                />
                {origin.label && !loading && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeOrigin({ label: '', lat: 0, lng: 0 });
                      setSearchQuery('');
                    }}
                    className="text-slate-400 hover:text-slate-600 p-0.5 active:scale-90 transition cursor-pointer"
                    title="Xóa địa chỉ xuất phát"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Suggestions for Origin */}
              {activeField === 'origin' && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl mt-1.5 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in">
                  <div className="p-2 bg-slate-50/95 backdrop-blur-sm text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10">
                    <span className="flex items-center gap-1">
                      <Search className="w-3 h-3 text-pastel-mint-600" />
                      Gợi ý địa chỉ xuất phát
                    </span>
                  </div>

                  {searching ? (
                    <div className="py-7 flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-pastel-mint-600" />
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
                        onMouseDown={() => handleSelectLocation(item)}
                        title={`${item.label} (${item.lat.toFixed(4)}, ${item.lng.toFixed(4)})`}
                        className="p-2.5 text-xs text-slate-800 hover:bg-pastel-mint-50 hover:text-pastel-mint-900 cursor-pointer transition flex items-start gap-2 active:bg-pastel-mint-100"
                      >
                        <MapPin className="w-3.5 h-3.5 text-pastel-mint-600 mt-0.5 flex-shrink-0" />
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

              {gpsError && (
                <div className="p-2.5 bg-amber-50 border border-amber-200/90 rounded-xl text-[11px] text-amber-900 flex items-center gap-2 mt-1.5 animate-in fade-in">
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
                aria-label="Đảo chiều điểm đi và điểm đến"
                className="group p-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-600 hover:text-blue-600 rounded-full shadow-sm hover:shadow-md transition-all active:scale-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUpDown className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300" />
              </button>
            </div>

            {/* Destination Field */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1 px-0.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-pastel-coral-600 shadow-xs inline-block" />
                  <span>Điểm đến (B)</span>
                </span>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onStartPickOnMap('dest')}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                    pickingField === 'dest'
                      ? 'bg-pastel-coral-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                  }`}
                  title="Ghim điểm đến trên bản đồ"
                >
                  <Map className="w-3 h-3" />
                  <span>Ghim trên map</span>
                </button>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-pastel-coral-50/40 rounded-2xl border border-pastel-coral-200/70 focus-within:border-pastel-coral-600 focus-within:ring-2 focus-within:ring-pastel-coral-100 focus-within:bg-white transition-all">
                <Target className="w-4 h-4 text-pastel-coral-600 flex-shrink-0" />
                <input
                  type="text"
                  disabled={loading}
                  value={activeField === 'dest' ? searchQuery : destination.label}
                  title={destination.label || 'Nhập địa chỉ điểm đến...'}
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
                  className="text-xs bg-transparent w-full outline-none font-semibold text-slate-800 placeholder-slate-400 disabled:opacity-50"
                />
                {destination.label && !loading && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeDestination({ label: '', lat: 0, lng: 0 });
                      setSearchQuery('');
                    }}
                    className="text-slate-400 hover:text-slate-600 p-0.5 active:scale-90 transition cursor-pointer"
                    title="Xóa địa chỉ điểm đến"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Suggestions for Destination */}
              {activeField === 'dest' && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl mt-1.5 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in">
                  <div className="p-2 bg-slate-50/95 backdrop-blur-sm text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10">
                    <span className="flex items-center gap-1">
                      <Search className="w-3 h-3 text-pastel-coral-600" />
                      Gợi ý địa chỉ điểm đến
                    </span>
                  </div>

                  {searching ? (
                    <div className="py-7 flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-pastel-coral-600" />
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
                        onMouseDown={() => handleSelectLocation(item)}
                        title={`${item.label} (${item.lat.toFixed(4)}, ${item.lng.toFixed(4)})`}
                        className="p-2.5 text-xs text-slate-800 hover:bg-pastel-coral-50 hover:text-pastel-coral-900 cursor-pointer transition flex items-start gap-2 active:bg-pastel-coral-100"
                      >
                        <Target className="w-3.5 h-3.5 text-pastel-coral-600 mt-0.5 flex-shrink-0" />
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

          {/* Quick HCMC Preset Chips */}
          <QuickPresetChips
            activeField={activeField}
            onSelectPreset={handlePresetSelect}
            disabled={loading}
          />

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
            className="w-full py-3.5 min-h-[48px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white font-bold rounded-2xl shadow-pastel-blue hover:shadow-lg transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Đang tính toán lộ trình né ngập...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 fill-current text-white" />
                <span>Tìm lộ trình né ngập an toàn</span>
              </>
            )}
          </button>

          {/* Route calculation error notification */}
          {errorMsg && (
            <div className="p-3 bg-pastel-coral-50 border border-pastel-coral-200 rounded-2xl text-xs flex items-start gap-2.5 text-pastel-coral-900 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-pastel-coral-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-bold mb-0.5 leading-snug">
                  Không thể tính lộ trình
                </div>
                <p className="text-[11px] leading-normal opacity-90">{errorMsg}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="p-1 text-pastel-coral-700 hover:text-pastel-coral-900 hover:bg-pastel-coral-100 rounded-lg transition cursor-pointer"
                title="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Route Results Comparison Section */}
          {routeData && (
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              {/* Visual Flood Detection Alert Banner */}
              {routeData.safe_route.isFlooded ? (
                <div
                  className="p-3 bg-pastel-coral-50 border border-pastel-coral-200/90 rounded-2xl text-xs space-y-1"
                  title={`Mọi ngả đường đều ngập sâu ${routeData.safe_route.maxFloodDepthCm} cm (${routeData.safe_route.floodedDistanceMeters} m). Khu vực ngập diện rộng.`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-pastel-coral-900">
                    <AlertOctagon className="w-4 h-4 text-pastel-coral-600 flex-shrink-0" />
                    <span>
                      Mọi ngả đường đều ngập sâu {routeData.safe_route.maxFloodDepthCm} cm ({routeData.safe_route.floodedDistanceMeters} m)
                    </span>
                  </div>
                  <p className="text-pastel-coral-800 text-[11px] leading-tight">
                    Khu vực xung quanh ngập sâu diện rộng. Vui lòng cân nhắc đổi thời gian di chuyển.
                  </p>
                </div>
              ) : routeData.fastest_route.isFlooded ? (
                <div
                  className="p-3 bg-pastel-mint-50 border border-pastel-mint-200 rounded-2xl text-xs space-y-1"
                  title={`Tuyến nhanh nhất ngập ${routeData.fastest_route.maxFloodDepthCm} cm (${routeData.fastest_route.floodedDistanceMeters} m). Đã chuyển sang lộ trình khô ráo.`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-pastel-mint-900">
                    <ShieldCheck className="w-4 h-4 text-pastel-mint-600 flex-shrink-0" />
                    <span>
                      Đã tự động né ngập thành công
                    </span>
                  </div>
                  <p className="text-pastel-mint-800 text-[11px] leading-tight">
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
