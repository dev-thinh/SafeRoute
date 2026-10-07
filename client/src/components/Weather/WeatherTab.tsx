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
  Waves,
  Search,
  Loader2,
  X,
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
  const [searchStreet, setSearchStreet] = useState('');

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWeatherData();
      setData(res);
    } catch (err: any) {
      console.error('Failed to fetch weather data', err);
      setError(err?.response?.data?.error || err.message || 'Lỗi kết nối trạm khí tượng');
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
          bg: 'bg-pastel-coral-50/90 border-pastel-coral-200 text-pastel-coral-900',
          dot: 'bg-rose-600',
          icon: ShieldAlert,
          label: 'Nguy cơ cao',
        };
      case 'warning':
        return {
          bg: 'bg-pastel-amber-50/90 border-pastel-amber-200 text-amber-900',
          dot: 'bg-amber-500',
          icon: AlertTriangle,
          label: 'Cảnh báo',
        };
      case 'safe':
      default:
        return {
          bg: 'bg-pastel-mint-50/90 border-pastel-mint-200 text-pastel-mint-900',
          dot: 'bg-emerald-600',
          icon: CheckCircle2,
          label: 'An toàn',
        };
    }
  };

  const getCorridorBadge = (depthCm: number, isFlooded: boolean) => {
    if (!isFlooded || depthCm < 10) {
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        text: 'Bình thường',
        dotBg: 'bg-slate-400',
      };
    }
    if (depthCm > 60) {
      return {
        bg: 'bg-red-50 text-red-900 border-red-200 font-extrabold',
        text: `Ngập sâu ~${depthCm}cm`,
        dotBg: 'bg-red-600',
      };
    }
    if (depthCm >= 40) {
      return {
        bg: 'bg-pastel-coral-50 text-rose-950 border-pastel-coral-200 font-bold',
        text: `Đầu gối ~${depthCm}cm`,
        dotBg: 'bg-rose-500',
      };
    }
    if (depthCm >= 20) {
      return {
        bg: 'bg-pastel-coral-50/70 text-orange-950 border-orange-200 font-bold',
        text: `Nửa bánh ~${depthCm}cm`,
        dotBg: 'bg-orange-400',
      };
    }
    return {
      bg: 'bg-pastel-amber-50 text-amber-900 border-pastel-amber-200 font-semibold',
      text: `Mắt cá ~${depthCm}cm`,
      dotBg: 'bg-amber-400',
    };
  };

  const displayedCorridors = (data?.corridorsAtRisk || []).filter((c) => {
    const matchesFilter = filterMode === 'flooded' ? c.isCurrentlyFlooded : true;
    const matchesSearch =
      searchStreet.trim() === '' ||
      c.streetName.toLowerCase().includes(searchStreet.toLowerCase()) ||
      c.district.toLowerCase().includes(searchStreet.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-3.5 select-none font-sans">
      {/* 1. Header Banner & Refresh Button */}
      <div className="bg-gradient-to-br from-pastel-sky-50 via-white to-pastel-lavender-50 border border-sky-100/90 rounded-2xl p-3 shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
              <CloudRain className="w-4 h-4 text-blue-600" />
              <span>Khí tượng & Thủy triều TP.HCM</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Dữ liệu radar Open-Meteo và trạm đo Phú An / Nhà Bè
            </p>
          </div>

          <button
            type="button"
            onClick={fetchWeather}
            disabled={loading}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-pastel-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Cập nhật số liệu mới nhất"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>

        {data?.fetchedAt && (
          <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Cập nhật: {new Date(data.fetchedAt).toLocaleTimeString('vi-VN')}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-pastel-coral-50 border border-pastel-coral-200 rounded-2xl text-xs text-pastel-coral-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-pastel-coral-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Astronomical Tide Status Card */}
      {data?.tideStatus && (
        <div className="bg-gradient-to-r from-pastel-sky-50/90 to-pastel-lavender-50/80 border border-sky-200/70 rounded-2xl p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Waves className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-xs font-bold text-slate-900">
                Thủy triều trạm Phú An / Nhà Bè
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                data.tideStatus.isSpringTide
                  ? 'bg-pastel-coral-100 text-pastel-coral-800 border-pastel-coral-200'
                  : 'bg-pastel-sky-100 text-blue-800 border-sky-200'
              }`}
            >
              {data.tideStatus.isSpringTide ? 'Kỳ triều cường' : 'Kỳ triều kém'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/90 p-2.5 rounded-xl border border-sky-100/90 shadow-xs">
              <span className="text-[10px] text-slate-500 font-semibold block">Đỉnh triều dự báo</span>
              <span className="text-base font-black text-blue-900 font-mono">
                {data.tideStatus.peakTideHeightM.toFixed(2)}{' '}
                <span className="text-[10px] font-medium text-slate-500">mét</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                (Ngày {data.tideStatus.lunarDay} Âm lịch)
              </span>
            </div>

            <div className="bg-white/90 p-2.5 rounded-xl border border-sky-100/90 shadow-xs flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-semibold block">Khung giờ đỉnh triều</span>
              <div className="text-[11px] font-bold text-slate-800 mt-0.5 font-mono">
                Sáng: {new Date(data.tideStatus.morningPeak).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-[11px] font-bold text-slate-800 font-mono">
                Chiều: {new Date(data.tideStatus.eveningPeak).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. 4-Quadrants Weather Cards */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase tracking-wider px-0.5">
          <span className="flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-blue-600" />
            <span>Lượng mưa 4 phân vùng TP.HCM</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono lowercase">mm/h</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {data?.quadrants.map((quad) => {
            const badge = getAlertBadge(quad.alertLevel);
            const Icon = badge.icon;
            return (
              <div
                key={quad.id}
                className={`p-2.5 rounded-2xl border transition-all ${badge.bg}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 truncate" title={quad.name}>
                    {quad.name}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold">
                    <Icon className="w-3 h-3" />
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-black tracking-tight text-slate-900 font-mono">
                    {quad.precipitationMm}
                  </span>
                  <span className="text-[10px] font-medium opacity-80 font-mono">mm/h</span>
                </div>
                <p className="text-[10px] mt-1 leading-tight opacity-90 line-clamp-1 font-medium" title={quad.alertText}>
                  {quad.alertText}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Hourly Precipitation Timeline */}
      {data?.hourlyTimeline && data.hourlyTimeline.length > 0 && (
        <div className="bg-white/90 border border-sky-100/90 rounded-2xl p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Diễn biến mưa 12 giờ tới</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Trạm Trung tâm</span>
          </div>

          <div className="flex items-end gap-2 overflow-x-auto pb-1 pt-2 scrollbar-none">
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
                  <span className="text-[9px] font-mono font-bold text-slate-700">
                    {item.precipitationMm > 0 ? `${item.precipitationMm}` : '0'}
                  </span>
                  <div
                    style={{ height: `${heightPx}px` }}
                    className={`w-3.5 rounded-t-lg transition-all ${
                      isHeavy
                        ? 'bg-rose-500 shadow-sm'
                        : isRaining
                        ? 'bg-blue-500 shadow-sm'
                        : 'bg-slate-200'
                    }`}
                  />
                  <span className="text-[9px] text-slate-500 font-medium">
                    {hourLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Vulnerable Corridors List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Tuyến đường trọng điểm ({displayedCorridors.length})</span>
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2 py-1 rounded-xl font-bold transition active:scale-95 cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('flooded')}
              className={`px-2 py-1 rounded-xl font-bold transition active:scale-95 cursor-pointer ${
                filterMode === 'flooded'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Nguy cơ cao
            </button>
          </div>
        </div>

        {/* Search Input Filter */}
        <div className="flex items-center gap-2 p-2.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white transition-all">
          <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={searchStreet}
            onChange={(e) => setSearchStreet(e.target.value)}
            placeholder="Lọc theo tên đường hoặc quận..."
            className="text-xs bg-transparent w-full outline-none font-medium text-slate-800 placeholder-slate-400"
          />
          {searchStreet && (
            <button
              type="button"
              onClick={() => setSearchStreet('')}
              className="text-slate-400 hover:text-slate-600 p-0.5 active:scale-90 transition cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Corridors List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
          {loading && !data && (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Đang tải dữ liệu tuyến đường...</span>
            </div>
          )}

          {displayedCorridors.length === 0 && !loading && (
            <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-500">
              Không có tuyến đường phù hợp.
            </div>
          )}

          {displayedCorridors.map((c: CorridorRiskStatus) => {
            const badge = getCorridorBadge(c.estimatedDepthCm, c.isCurrentlyFlooded);
            return (
              <div
                key={c.id}
                className={`p-3 rounded-2xl border transition-all ${
                  c.isCurrentlyFlooded
                    ? 'bg-pastel-coral-50/60 border-pastel-coral-200 hover:border-pastel-coral-300'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900 truncate" title={`${c.streetName} (${c.district})`}>
                        {c.streetName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-lg font-medium flex-shrink-0">
                        {c.district}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1" title={c.description}>
                      {c.description}
                    </p>
                  </div>

                  <span
                    className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-lg border flex items-center gap-1.5 ${badge.bg}`}
                    title={badge.text}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dotBg} flex-shrink-0`} />
                    <span>{badge.text}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px]">
                  <div
                    className="flex items-center gap-2 text-slate-600"
                    title={`Mưa hiện tại: ${c.currentRainMm} mm/h, Ngưỡng chịu tải: ${c.rainThresholdMm} mm/h`}
                  >
                    <span>
                      Mưa: <strong className={c.currentRainMm >= c.rainThresholdMm ? 'text-rose-600 font-mono' : 'text-slate-800 font-mono'}>{c.currentRainMm} mm/h</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Ngưỡng: <strong className="font-mono">{c.rainThresholdMm} mm/h</strong>
                    </span>
                  </div>

                  {onSelectLocation && (
                    <button
                      type="button"
                      onClick={() => onSelectLocation(c.coordinate[1], c.coordinate[0])}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>Xem vị trí</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeatherTab;
