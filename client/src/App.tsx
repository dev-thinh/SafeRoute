import React, { useState, useEffect } from 'react';
import { MapView } from './components/Map/MapView';
import { FloodLayer } from './components/Map/FloodLayer';
import { RoutePolyline } from './components/Map/RoutePolyline';
import { FloodDepthLegend } from './components/Map/FloodDepthLegend';
import { ReportMarker } from './components/Map/ReportMarker';
import { RoutePlannerPanel, LocationItem } from './components/Navigation/RoutePlannerPanel';
import { ReportFloodModal } from './components/Reporting/ReportFloodModal';
import { getActiveFloods, reverseGeocode } from './services/api';
import { Droplet } from 'lucide-react';
import { NavigateResponse, FloodEvent, UserReport } from './types';

export const App: React.FC = () => {
  const [routes, setRoutes] = useState<NavigateResponse | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<'safe' | 'fastest'>('safe');
  const [floodEvents, setFloodEvents] = useState<FloodEvent[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Origin & Destination state
  const [origin, setOrigin] = useState<LocationItem>({
    label: 'ĐH Khoa Học Tự Nhiên, 227 Nguyễn Văn Cừ, Quận 5',
    lat: 10.7626,
    lng: 106.6823,
  });
  const [destination, setDestination] = useState<LocationItem>({
    label: 'KĐT Phú Mỹ Hưng, Quận 7',
    lat: 10.7303,
    lng: 106.7075,
  });

  // Pick on map state: 'origin' | 'dest' | null
  const [pickingField, setPickingField] = useState<'origin' | 'dest' | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);

  const loadFloods = async (targetTime?: string) => {
    try {
      const data = await getActiveFloods(targetTime);
      setFloodEvents(data.events || []);
      setReports(data.reports || []);
    } catch (err) {
      console.error('Failed to load active floods', err);
    }
  };

  useEffect(() => {
    loadFloods();
  }, []);

  const handleMapClick = async (lat: number, lng: number) => {
    if (!pickingField) return;

    try {
      const rev = await reverseGeocode(lat, lng);
      if (pickingField === 'origin') {
        setOrigin({
          label: rev.label,
          lat,
          lng,
        });
      } else if (pickingField === 'dest') {
        setDestination({
          label: rev.label,
          lat,
          lng,
        });
      }
    } catch (err) {
      console.error('Failed to reverse geocode clicked point', err);
    } finally {
      setPickingField(null);
    }
  };

  const handleDragOrigin = async (lat: number, lng: number) => {
    try {
      const rev = await reverseGeocode(lat, lng);
      setOrigin({
        label: rev.label,
        lat,
        lng,
      });
    } catch (err) {
      setOrigin((prev) => ({ ...prev, lat, lng }));
    }
  };

  const handleDragDestination = async (lat: number, lng: number) => {
    try {
      const rev = await reverseGeocode(lat, lng);
      setDestination({
        label: rev.label,
        lat,
        lng,
      });
    } catch (err) {
      setDestination((prev) => ({ ...prev, lat, lng }));
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans">
      <RoutePlannerPanel
        origin={origin}
        destination={destination}
        onChangeOrigin={setOrigin}
        onChangeDestination={setDestination}
        onRoutesCalculated={setRoutes}
        selectedRouteType={selectedRouteType}
        onSelectRouteType={setSelectedRouteType}
        pickingField={pickingField}
        onStartPickOnMap={setPickingField}
        onCancelPickOnMap={() => setPickingField(null)}
        onRefreshFloods={loadFloods}
        onSelectLocation={(lat, lng) => setMapCenter([lat, lng])}
      />

      <MapView
        origin={origin}
        destination={destination}
        routes={routes}
        center={mapCenter}
        onMapClick={handleMapClick}
        onDragOrigin={handleDragOrigin}
        onDragDestination={handleDragDestination}
        isPickingLocation={pickingField !== null}
      >
        <FloodLayer events={floodEvents} />
        <ReportMarker reports={reports} />
        {routes && (
          <RoutePolyline
            safeGeometry={routes.safe_route?.geometry}
            fastestGeometry={routes.fastest_route?.geometry}
            safeFloodedSegments={routes.safe_route?.floodedSegments}
            fastestFloodedSegments={routes.fastest_route?.floodedSegments}
            selectedRoute={selectedRouteType}
          />
        )}
      </MapView>

      {/* Floating Flood Depth Legend Bar (Yellow -> Orange -> Red -> Prohibited) */}
      <FloodDepthLegend />

      {/* Floating Action Button */}
      <div className="absolute bottom-6 right-6 z-[1000]">
        <button
          onClick={() => setIsReportOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full shadow-xl transition"
        >
          <Droplet className="w-4 h-4" />
          Báo ngập tại đây
        </button>
      </div>

      <ReportFloodModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onReportSubmitted={loadFloods}
      />
    </div>
  );
};

export default App;
