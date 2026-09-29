import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, ArrowUpDown, Search, X } from 'lucide-react';
import { VehicleSelector } from './VehicleSelector';
import { TimeSelector } from './TimeSelector';
import { RouteComparisonCard } from './RouteComparisonCard';
import { navigateRoute, searchLocation } from '../../services/api';
import { NavigateResponse } from '../../types';

interface LocationItem {
  label: string;
  lat: number;
  lng: number;
}

export const RoutePlannerPanel: React.FC<{
  onRoutesCalculated: (routes: NavigateResponse) => void;
  selectedRouteType: 'safe' | 'fastest';
  onSelectRouteType: (t: 'safe' | 'fastest') => void;
}> = ({ onRoutesCalculated, selectedRouteType, onSelectRouteType }) => {
  const [vehicle, setVehicle] = useState<'motorbike' | 'car'>('motorbike');
  // Default to current local time (ISO format)
  const [targetTime, setTargetTime] = useState<string>(() => new Date().toISOString());
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState<NavigateResponse | null>(null);

  // Origin & Destination state
  const [origin, setOrigin] = useState<LocationItem>({
    label: 'ĐH Khoa Học Tự Nhiên (227 Nguyễn Văn Cừ, Q5)',
    lat: 10.7626,
    lng: 106.6823,
  });
  const [dest, setDest] = useState<LocationItem>({
    label: 'KĐT Phú Mỹ Hưng (Quận 7)',
    lat: 10.7303,
    lng: 106.7075,
  });

  // Autocomplete / Search state
  const [activeField, setActiveField] = useState<'origin' | 'dest' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationItem[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger search when searchQuery changes
  useEffect(() => {
    if (activeField) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchLocation(searchQuery);
        setSuggestions(results);
      }, 250);
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, activeField]);

  const handleSelectLocation = (loc: LocationItem) => {
    if (activeField === 'origin') {
      setOrigin(loc);
    } else if (activeField === 'dest') {
      setDest(loc);
    }
    setActiveField(null);
    setSearchQuery('');
  };

  const handleSwap = () => {
    const temp = { ...origin };
    setOrigin(dest);
    setDest(temp);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      let finalOrigin = { ...origin };
      let finalDest = { ...dest };

      // Fallback geocoding if user typed text but lat/lng is missing
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
    } catch (err) {
      console.error('Route calculation failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-4 left-4 z-[1000] w-96 max-h-[92vh] overflow-y-auto bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gray-100 flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌊</span>
          <div>
            <h2 className="font-extrabold text-base text-gray-900 tracking-tight">SafeRoute</h2>
            <p className="text-[11px] text-gray-500">Định tuyến né ngập thông minh TP.HCM</p>
          </div>
        </div>
      </div>

      {/* Origin & Destination Inputs with Swap button */}
      <div className="relative space-y-2">
        {/* Origin Field */}
        <div className="relative">
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-emerald-500 focus-within:bg-white transition">
            <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <input
              type="text"
              value={activeField === 'origin' ? searchQuery : origin.label}
              onFocus={() => {
                setActiveField('origin');
                setSearchQuery(origin.label);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setOrigin((prev) => ({ ...prev, label: e.target.value }));
              }}
              placeholder="Nhập địa chỉ hoặc điểm xuất phát..."
              className="text-xs bg-transparent w-full outline-none font-medium text-gray-800 placeholder-gray-400"
            />
            {origin.label && (
              <button
                type="button"
                onClick={() => {
                  setOrigin({ label: '', lat: 0, lng: 0 });
                  setSearchQuery('');
                }}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-end pr-3 -my-1 z-10 relative">
          <button
            type="button"
            onClick={handleSwap}
            title="Đảo ngược điểm đi và điểm đến"
            className="p-1 bg-white border border-gray-200 text-gray-600 hover:text-blue-600 rounded-full shadow-sm hover:shadow transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Destination Field */}
        <div className="relative">
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-blue-500 focus-within:bg-white transition">
            <Navigation className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <input
              type="text"
              value={activeField === 'dest' ? searchQuery : dest.label}
              onFocus={() => {
                setActiveField('dest');
                setSearchQuery(dest.label);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDest((prev) => ({ ...prev, label: e.target.value }));
              }}
              placeholder="Nhập địa chỉ hoặc điểm đến..."
              className="text-xs bg-transparent w-full outline-none font-medium text-gray-800 placeholder-gray-400"
            />
            {dest.label && (
              <button
                type="button"
                onClick={() => {
                  setDest({ label: '', lat: 0, lng: 0 });
                  setSearchQuery('');
                }}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Suggestions */}
        {activeField && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-52 overflow-y-auto divide-y divide-gray-100">
            <div className="p-2 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Search className="w-3 h-3 text-blue-600" />
              Gợi ý địa điểm TP.HCM
            </div>
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                onMouseDown={() => handleSelectLocation(item)}
                className="p-2.5 text-xs text-gray-800 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition flex items-start gap-2"
              >
                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="font-medium line-clamp-1">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <VehicleSelector vehicle={vehicle} onChange={setVehicle} />
      <TimeSelector selectedTime={targetTime} onChange={setTargetTime} />

      <button
        onClick={handleSearch}
        disabled={loading || !origin.label || !dest.label}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
      >
        {loading ? 'Đang phân tích vùng ngập...' : 'Tìm Lộ Trình Né Ngập'}
      </button>

      {routeData && (
        <div className="space-y-2.5 pt-2 border-t border-gray-100">
          <RouteComparisonCard
            type="safe"
            distanceMeters={routeData.safe_route.distanceMeters}
            durationSeconds={routeData.safe_route.durationSeconds}
            isFlooded={false}
            floodedDistanceMeters={0}
            isSelected={selectedRouteType === 'safe'}
            onSelect={() => onSelectRouteType('safe')}
          />
          <RouteComparisonCard
            type="fastest"
            distanceMeters={routeData.fastest_route.distanceMeters}
            durationSeconds={routeData.fastest_route.durationSeconds}
            isFlooded={routeData.fastest_route.isFlooded}
            floodedDistanceMeters={routeData.fastest_route.floodedDistanceMeters}
            isSelected={selectedRouteType === 'fastest'}
            onSelect={() => onSelectRouteType('fastest')}
          />
        </div>
      )}
    </div>
  );
};
