import React, { useState, useEffect } from 'react';
import {
  CloudRain,
  RefreshCw,
  AlertTriangle,
  Clock,
  MapPin,
  ShieldAlert,
  Droplets,
  CheckCircle2,
} from 'lucide-react';
import { WeatherDashboardData, QuadrantWeatherStatus, CorridorRiskStatus } from '../../types';
import { getWeatherData } from '../../services/api';

interface WeatherTabProps {
  onSelectLocation?: (lat: number, lng: number) => void;
}

export const WeatherTab: React.FC<WeatherTabProps> = ({ onSelectLocation }) => {
  const [data, setData] = useState<WeatherDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'flooded'>('all');

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWeatherData();
      setData(res);
    } catch (err: any) {
      console.error('Failed to fetch weather data', err);
      setError(err.message || 'Lỗi kết nối trạm khí tượng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  const getAlertBadge = (level: QuadrantWeatherStatus['alertLevel']) => {
    switch (level) {
      case 'danger':
        return {
          bg: 'bg-red-50 border-red-200 text-red-700',
          dot: 'bg-red-500',
          icon: ShieldAlert,
          label: 'Nguy cơ cao',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
          dot: 'bg-amber-500',
          icon: AlertTriangle,
          label: 'Cảnh báo',
        };
      case 'safe':
      default:
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          dot: 'bg-emerald-500',
          icon: CheckCircle2,
          label: 'An toàn',
        };
    }
  };

  const displayedCorridors = data?.corridorsAtRisk.filter((c) => {
    if (filterMode === 'flooded') {
      return c.isCurrentlyFlooded;
    }
    return true;
  }) || [];

  return (
    <div className="space-y-3.5">
      {/* Top Banner with Auto-Fetch Info & Refresh Button */}
      <div className="bg-gradient-to-br from-sky-50 to-blue-50/80 border border-sky-100 rounded-2xl p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950">
              <CloudRain className="w-4 h-4 text-sky-600" />
              <span>Dự Báo Khí Tượng & Lượng Mưa Tức Thời</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
              Dữ liệu từ trạm vệ tinh Open-Meteo cập nhật liên tục 4 phân vùng TP.HCM
            </p>
          </div>

          <button
            type="button"
            onClick={fetchWeather}
            disabled={loading}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50"
            title="Làm mới số liệu lượng mưa"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>

        {data?.fetchedAt && (
          <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <span>Cập nhật lúc: {new Date(data.fetchedAt).toLocaleTimeString('vi-VN')}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Quadrants Weather Cards */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-gray-700 px-0.5">
          <span className="flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-sky-600" />
            Lượng mưa theo 4 phân vùng
          </span>
          <span className="text-[10px] text-gray-400 font-normal">Đơn vị: mm/h</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {data?.quadrants.map((quad) => {
            const badge = getAlertBadge(quad.alertLevel);
            const Icon = badge.icon;
            return (
              <div
                key={quad.id}
                className={`p-2.5 rounded-xl border transition-all ${badge.bg}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold truncate">{quad.name}</span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold">
                    <Icon className="w-3 h-3" />
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-black tracking-tight">
                    {quad.precipitationMm}
                  </span>
                  <span className="text-[10px] font-medium opacity-80">mm/h</span>
                </div>
                <p className="text-[10px] mt-1 leading-tight opacity-90 line-clamp-1">
                  {quad.alertText}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hourly Precipitation Timeline */}
      {data?.hourlyTimeline && data.hourlyTimeline.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Diễn biến mưa 12 giờ tới
            </span>
            <span className="text-[10px] text-gray-400 font-normal">Trạm Trung tâm</span>
          </div>

          <div className="flex items-end gap-2 overflow-x-auto pb-1 pt-2 scrollbar-thin">
            {data.hourlyTimeline.map((item, idx) => {
              const hourLabel = item.time.slice(11, 16);
              const isRaining = item.precipitationMm > 0;
              const isHeavy = item.precipitationMm >= 25;
              const heightPx = Math.min(48, Math.max(8, item.precipitationMm * 2));

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center flex-shrink-0 w-10 text-center gap-1"
                >
                  <span className="text-[9px] font-bold text-gray-600">
                    {item.precipitationMm > 0 ? `${item.precipitationMm}` : '0'}
                  </span>
                  <div
                    style={{ height: `${heightPx}px` }}
                    className={`w-4 rounded-t-sm transition-all ${
                      isHeavy
                        ? 'bg-red-500'
                        : isRaining
                        ? 'bg-sky-500'
                        : 'bg-gray-200'
                    }`}
                  />
                  <span className="text-[9px] text-gray-400 font-medium">
                    {hourLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vulnerable Corridors & Chronic Flooded Streets List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-800">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Tuyến đường trọng điểm ngập lụt</span>
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2 py-0.5 rounded-md font-semibold transition ${
                filterMode === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tất cả {data?.corridorsAtRisk ? data.corridorsAtRisk.length : ''}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('flooded')}
              className={`px-2 py-0.5 rounded-md font-semibold transition ${
                filterMode === 'flooded'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Nguy cơ cao {data?.corridorsAtRisk ? data.corridorsAtRisk.filter((c) => c.isCurrentlyFlooded).length : ''}
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
          {displayedCorridors.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-500">
              Hiện tại không có tuyến đường nào vượt ngưỡng ngập an toàn.
            </div>
          ) : (
            displayedCorridors.map((c: CorridorRiskStatus) => (
              <div
                key={c.id}
                className={`p-2.5 rounded-xl border transition-all ${
                  c.isCurrentlyFlooded
                    ? 'bg-red-50/70 border-red-200 hover:border-red-300'
                    : 'bg-gray-50/70 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-gray-900">
                        {c.streetName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-200/80 text-gray-700 rounded font-medium">
                        {c.district}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">
                      {c.description}
                    </p>
                  </div>

                  {c.isCurrentlyFlooded ? (
                    <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 bg-red-600 text-white rounded-md shadow-xs animate-pulse">
                      Ngập ~{c.estimatedDepthCm}cm
                    </span>
                  ) : (
                    <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                      Bình thường
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/60 text-[10px]">
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>
                      Mưa hiện tại: <strong className={c.currentRainMm >= c.rainThresholdMm ? 'text-red-600' : 'text-gray-800'}>{c.currentRainMm} mm/h</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Ngưỡng ngập: <strong>{c.rainThresholdMm} mm/h</strong>
                    </span>
                  </div>

                  {onSelectLocation && (
                    <button
                      type="button"
                      onClick={() => onSelectLocation(c.coordinate[1], c.coordinate[0])}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold hover:underline"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>Xem vị trí</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
