import React, { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { VehicleSelector } from './VehicleSelector';
import { TimeSelector } from './TimeSelector';
import { RouteComparisonCard } from './RouteComparisonCard';
import { navigateRoute } from '../../services/api';
import { NavigateResponse } from '../../types';

export const RoutePlannerPanel: React.FC<{
  onRoutesCalculated: (routes: NavigateResponse) => void;
  selectedRouteType: 'safe' | 'fastest';
  onSelectRouteType: (t: 'safe' | 'fastest') => void;
}> = ({ onRoutesCalculated, selectedRouteType, onSelectRouteType }) => {
  const [vehicle, setVehicle] = useState<'motorbike' | 'car'>('motorbike');
  const [targetTime, setTargetTime] = useState<string>(new Date().toISOString());
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState<NavigateResponse | null>(null);

  // Default coordinates: HCMUS (D5) to Phu My Hung (D7)
  const [origin] = useState({ lat: 10.7626, lng: 106.6823, label: 'ĐH Khoa Học Tự Nhiên (Q5)' });
  const [dest] = useState({ lat: 10.7303, lng: 106.7075, label: 'KĐT Phú Mỹ Hưng (Q7)' });

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await navigateRoute({
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: dest.lat, lng: dest.lng },
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
    <div className="absolute top-4 left-4 z-[1000] w-96 max-h-[92vh] overflow-y-auto bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gray-100 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🌊</span>
        <div>
          <h2 className="font-extrabold text-base text-gray-900 tracking-tight">SafeRoute</h2>
          <p className="text-[11px] text-gray-500">Định tuyến né ngập thông minh TP.HCM</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
          <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <input
            readOnly
            value={origin.label}
            className="text-xs bg-transparent w-full outline-none font-medium text-gray-800"
          />
        </div>
        <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
          <Navigation className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <input
            readOnly
            value={dest.label}
            className="text-xs bg-transparent w-full outline-none font-medium text-gray-800"
          />
        </div>
      </div>

      <VehicleSelector vehicle={vehicle} onChange={setVehicle} />
      <TimeSelector selectedTime={targetTime} onChange={setTargetTime} />

      <button
        onClick={handleSearch}
        disabled={loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
      >
        {loading ? 'Đang phân tích vùng ngập...' : 'Tìm Lộ Trình Né Ngập'}
      </button>

      {routeData && (
        <div className="space-y-2.5 pt-2 border-t">
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
