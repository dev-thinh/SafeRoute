import React, { useState, useEffect, useRef } from 'react';
import { MapView } from './components/Map/MapView';
import { FloodLayer } from './components/Map/FloodLayer';
import { RoutePolyline } from './components/Map/RoutePolyline';
import { FloodDepthLegend } from './components/Map/FloodDepthLegend';
import { ReportMarker } from './components/Map/ReportMarker';
import { RoutePlannerPanel, LocationItem } from './components/Navigation/RoutePlannerPanel';
import { ReportFloodModal, SelectedReportLocation } from './components/Reporting/ReportFloodModal';
import { ReportLocationPinOverlay } from './components/Reporting/ReportLocationPinOverlay';
import { getActiveFloods, reverseGeocode } from './services/api';
import { Droplet, PanelLeftOpen, MapPin, Target } from 'lucide-react';
import { NavigateResponse, FloodEvent, UserReport } from './types';

export const App: React.FC = () => {
  const [routes, setRoutes] = useState<NavigateResponse | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<'safe' | 'fastest'>('safe');
  const [floodEvents, setFloodEvents] = useState<FloodEvent[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);

  // Panel Collapsible State for responsive layout
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Zoom handlers ref from MapView
  const zoomHandlersRef = useRef<{ zoomIn: () => void; zoomOut: () => void } | null>(null);

  // Modal & Pinning Mode State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isPinningReport, setIsPinningReport] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [centerCoord, setCenterCoord] = useState<{ lat: number; lng: number }>({
    lat: 10.7626,
    lng: 106.6823,
  });
  const [centerAddress, setCenterAddress] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [selectedReportLocation, setSelectedReportLocation] = useState<SelectedReportLocation | null>(null);

  // Origin & Destination state (starts empty)
  const [origin, setOrigin] = useState<LocationItem>({
    label: '',
    lat: 0,
    lng: 0,
  });
  const [destination, setDestination] = useState<LocationItem>({
    label: '',
    lat: 0,
    lng: 0,
  });

  // Pick on map state for route: 'origin' | 'dest' | null
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

  // Debounced reverse geocode when map center moves during pinning mode
  useEffect(() => {
    if (!isPinningReport) return;
    setIsLoadingAddress(true);
    const timer = setTimeout(async () => {
      try {
        const rev = await reverseGeocode(centerCoord.lat, centerCoord.lng);
        setCenterAddress(rev.label);
      } catch (err) {
        setCenterAddress(`Tọa độ: ${centerCoord.lat.toFixed(5)}, ${centerCoord.lng.toFixed(5)}`);
      } finally {
        setIsLoadingAddress(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [centerCoord.lat, centerCoord.lng, isPinningReport]);

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

  // Start pinning mode for report flood
  const handleStartReportPinning = () => {
    setIsPinningReport(true);
    setIsReportOpen(false);
  };

  // Confirm selected location and open report form modal
  const handleConfirmReportLocation = () => {
    setSelectedReportLocation({
      lat: centerCoord.lat,
      lng: centerCoord.lng,
      label: centerAddress || `Tọa độ: ${centerCoord.lat.toFixed(5)}, ${centerCoord.lng.toFixed(5)}`,
    });
    setIsPinningReport(false);
    setIsReportOpen(true);
  };

  // User wants to re-pick location from inside the modal
  const handleRePickLocation = () => {
    setIsReportOpen(false);
    setIsPinningReport(true);
  };

  // Locate me using browser GPS
  const handleLocateMe = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapCenter([pos.coords.latitude, pos.coords.longitude]);
          setCenterCoord({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn('Geolocation error:', err);
          alert('Không thể xác định vị trí GPS. Vui lòng cấp quyền vị trí trên trình duyệt.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      alert('Trình duyệt không hỗ trợ định vị GPS.');
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans">
      {/* 1. Left Sidebar Navigation Panel (Hidden during report pin mode) */}
      {!isPinningReport && !isPanelCollapsed && (
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
          onToggleCollapse={() => setIsPanelCollapsed(true)}
        />
      )}

      {/* Floating expand pill if panel is collapsed */}
      {!isPinningReport && isPanelCollapsed && (
        <button
          type="button"
          onClick={() => setIsPanelCollapsed(false)}
          className="absolute top-4 left-4 z-[1000] flex items-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-2xl shadow-xl hover:shadow-2xl hover:bg-white text-gray-800 font-bold text-xs active:scale-95 transition-all cursor-pointer min-h-[44px]"
          aria-label="Mở bảng điều khiển SafeRoute"
        >
          <PanelLeftOpen className="w-4 h-4 text-blue-600" />
          <span className="text-base leading-none">🌊</span>
          <span>Bảng điều khiển</span>
          <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-100">
            Mở
          </span>
        </button>
      )}

      {/* 2. Interactive Map View */}
      <MapView
        origin={origin}
        destination={destination}
        routes={routes}
        center={mapCenter}
        onMapClick={handleMapClick}
        onDragOrigin={handleDragOrigin}
        onDragDestination={handleDragDestination}
        isPickingLocation={pickingField !== null}
        pickingField={pickingField}
        isPinningReport={isPinningReport}
        onMapCenterChange={(lat, lng) => setCenterCoord({ lat, lng })}
        onMapMovingChange={setIsMapMoving}
        onRegisterZoomHandlers={(handlers) => {
          zoomHandlersRef.current = handlers;
        }}
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

      {/* Floating Picking Notification Banner */}
      {pickingField && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[1100] bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-gray-200/90 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs ${
              pickingField === 'origin' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            {pickingField === 'origin' ? (
              <MapPin className="w-4 h-4" />
            ) : (
              <Target className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-gray-900">
              {pickingField === 'origin' ? 'Ghim điểm xuất phát' : 'Ghim điểm đến'}
            </div>
            <div className="text-[11px] text-gray-500">
              Chạm hoặc click vị trí trên bản đồ để ghim
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPickingField(null)}
            className="ml-2 px-3 py-1.5 text-xs font-bold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition active:scale-95 cursor-pointer"
          >
            Hủy
          </button>
        </div>
      )}

      {/* 3. Floating Flood Depth Legend Bar (Hidden during report pin mode) */}
      {!isPinningReport && <FloodDepthLegend />}

      {/* 4. Floating Action Button "Báo ngập tại đây" (Hidden during report pin mode) */}
      {!isPinningReport && (
        <div className="absolute bottom-6 right-6 z-[1000]">
          <button
            type="button"
            onClick={handleStartReportPinning}
            className="flex items-center gap-2 px-5 py-3 min-h-[44px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-full shadow-xl transition-all hover:shadow-2xl hover:scale-105 active:scale-95 cursor-pointer"
            title="Báo ngập tại vị trí"
          >
            <Droplet className="w-4 h-4 fill-current text-white" />
            <span>Báo ngập tại đây</span>
          </button>
        </div>
      )}

      {/* 5. Center Pin & Overlay during Report Location Pinning */}
      <ReportLocationPinOverlay
        isPinning={isPinningReport}
        isMoving={isMapMoving}
        coord={centerCoord}
        address={centerAddress}
        isLoadingAddress={isLoadingAddress}
        onConfirm={handleConfirmReportLocation}
        onCancel={() => setIsPinningReport(false)}
        onLocateMe={handleLocateMe}
        onZoomIn={() => zoomHandlersRef.current?.zoomIn()}
        onZoomOut={() => zoomHandlersRef.current?.zoomOut()}
      />

      {/* 6. Report Flood Form Modal with marked location details */}
      <ReportFloodModal
        isOpen={isReportOpen}
        location={selectedReportLocation}
        onClose={() => setIsReportOpen(false)}
        onReportSubmitted={loadFloods}
        onRePickLocation={handleRePickLocation}
      />
    </div>
  );
};

export default App;
