import React, { useState, useEffect, useRef } from 'react';
import { MapView } from './components/Map/MapView';
import { FloodLayer } from './components/Map/FloodLayer';
import { RoutePolyline } from './components/Map/RoutePolyline';
import { FloodDepthLegend } from './components/Map/FloodDepthLegend';
import { ReportMarker } from './components/Map/ReportMarker';
import { RoutePlannerPanel, LocationItem } from './components/Navigation/RoutePlannerPanel';
import { ReportFloodModal, SelectedReportLocation } from './components/Reporting/ReportFloodModal';
import { ReportLocationPinOverlay } from './components/Reporting/ReportLocationPinOverlay';
import { AdminDashboardModal } from './components/Admin/AdminDashboardModal';
import { TopUtilityBar } from './components/Navigation/TopUtilityBar';
import { getActiveFloods, reverseGeocode, getAdminReports } from './services/api';
import { Droplet, PanelLeftOpen, MapPin, Target, AlertTriangle, X, Waves } from 'lucide-react';
import { NavigateResponse, FloodEvent, UserReport } from './types';

export const App: React.FC = () => {
  const [routes, setRoutes] = useState<NavigateResponse | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<'safe' | 'fastest'>('safe');
  const [floodEvents, setFloodEvents] = useState<FloodEvent[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Admin Dashboard State
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [pendingAdminCount, setPendingAdminCount] = useState(0);

  // Panel State
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'routes' | 'news' | 'weather'>('routes');

  // Zoom & Fit handlers ref from MapView
  const zoomHandlersRef = useRef<{ zoomIn: () => void; zoomOut: () => void } | null>(null);
  const fitRouteRef = useRef<(() => void) | null>(null);
  const skipNextReverseGeocodeRef = useRef(false);

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
      const [floodData, adminData] = await Promise.allSettled([
        getActiveFloods(targetTime),
        getAdminReports(),
      ]);
      if (floodData.status === 'fulfilled') {
        setFloodEvents(floodData.value.events || []);
        setReports(floodData.value.reports || []);
      }
      if (adminData.status === 'fulfilled') {
        setPendingAdminCount(adminData.value.summary?.totalPending || 0);
      }
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
    if (skipNextReverseGeocodeRef.current) {
      skipNextReverseGeocodeRef.current = false;
      setIsLoadingAddress(false);
      return;
    }
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

  const handleMapClick = (lat: number, lng: number) => {
    if (!pickingField) return;
    const targetField = pickingField;

    // 1. Immediately exit picking mode so banner closes in 0ms
    setPickingField(null);

    // 2. Optimistically update marker coordinate and temporary label
    if (targetField === 'origin') {
      setOrigin({
        label: 'Đang xác định địa chỉ...',
        lat,
        lng,
      });
    } else if (targetField === 'dest') {
      setDestination({
        label: 'Đang xác định địa chỉ...',
        lat,
        lng,
      });
    }

    // 3. Resolve human-readable address in background without blocking UI
    reverseGeocode(lat, lng)
      .then((rev) => {
        if (targetField === 'origin') {
          setOrigin((prev) =>
            prev.lat === lat && prev.lng === lng ? { ...prev, label: rev.label } : prev
          );
        } else if (targetField === 'dest') {
          setDestination((prev) =>
            prev.lat === lat && prev.lng === lng ? { ...prev, label: rev.label } : prev
          );
        }
      })
      .catch((err) => {
        console.warn('Failed to reverse geocode clicked point', err);
        const fallback = `Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        if (targetField === 'origin') {
          setOrigin((prev) =>
            prev.lat === lat && prev.lng === lng ? { ...prev, label: fallback } : prev
          );
        } else if (targetField === 'dest') {
          setDestination((prev) =>
            prev.lat === lat && prev.lng === lng ? { ...prev, label: fallback } : prev
          );
        }
      });
  };

  const handleDragOrigin = (lat: number, lng: number) => {
    setOrigin((prev) => ({ ...prev, lat, lng, label: 'Đang xác định địa chỉ...' }));
    reverseGeocode(lat, lng)
      .then((rev) => {
        setOrigin((prev) =>
          prev.lat === lat && prev.lng === lng ? { ...prev, label: rev.label } : prev
        );
      })
      .catch(() => {
        setOrigin((prev) =>
          prev.lat === lat && prev.lng === lng
            ? { ...prev, label: `Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}` }
            : prev
        );
      });
  };

  const handleDragDestination = (lat: number, lng: number) => {
    setDestination((prev) => ({ ...prev, lat, lng, label: 'Đang xác định địa chỉ...' }));
    reverseGeocode(lat, lng)
      .then((rev) => {
        setDestination((prev) =>
          prev.lat === lat && prev.lng === lng ? { ...prev, label: rev.label } : prev
        );
      })
      .catch(() => {
        setDestination((prev) =>
          prev.lat === lat && prev.lng === lng
            ? { ...prev, label: `Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}` }
            : prev
        );
      });
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
          setToastMessage('Không thể xác định vị trí GPS. Vui lòng cấp quyền vị trí trên trình duyệt.');
          setTimeout(() => setToastMessage(null), 4500);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setToastMessage('Trình duyệt không hỗ trợ định vị GPS.');
      setTimeout(() => setToastMessage(null), 4500);
    }
  };

  // User selects an autocomplete suggestion in the report pin overlay
  const handleSelectReportLocation = (lat: number, lng: number, label: string) => {
    skipNextReverseGeocodeRef.current = true;
    setMapCenter([lat, lng]);
    setCenterCoord({ lat, lng });
    setCenterAddress(label);
    setIsLoadingAddress(false);
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
          activeTab={activeTab}
          onTabChange={setActiveTab}
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
          <Waves className="w-4 h-4 text-blue-600" />
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
        onRegisterFitRoute={(fn) => {
          fitRouteRef.current = fn;
        }}
      >
        <FloodLayer events={floodEvents} />
        <ReportMarker reports={reports} onVoteReport={() => loadFloods()} />
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

      {/* Top Right Consolidated Utility Bar */}
      {!isPinningReport && (
        <TopUtilityBar
          onOpenAdmin={() => setIsAdminOpen(true)}
          onOpenWeather={() => {
            setActiveTab('weather');
            setIsPanelCollapsed(false);
          }}
          pendingAdminCount={pendingAdminCount}
          onFitRoute={() => fitRouteRef.current?.()}
          hasRoute={!!(routes?.safe_route || routes?.fastest_route)}
        />
      )}

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

      {/* 3. Floating Bottom-Right Action Dock (Legend + FAB) */}
      {!isPinningReport && (
        <div className="absolute bottom-6 right-6 z-[1000] flex flex-col items-end gap-3 select-none pointer-events-auto">
          {/* Flood Depth Legend */}
          <FloodDepthLegend />

          {/* Floating Action Button "Báo ngập tại đây" */}
          <button
            type="button"
            onClick={handleStartReportPinning}
            className="flex items-center gap-2.5 px-5 py-3.5 min-h-[48px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold rounded-full shadow-xl shadow-blue-500/25 transition-all hover:shadow-2xl hover:shadow-blue-500/35 cursor-pointer"
            title="Báo ngập tại vị trí"
            aria-label="Báo ngập tại vị trí trên bản đồ"
          >
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <Droplet className="w-3.5 h-3.5 fill-current text-white" />
            </div>
            <span className="tracking-wide">Báo ngập tại đây</span>
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
        onSelectLocation={handleSelectReportLocation}
        onZoomIn={() => zoomHandlersRef.current?.zoomIn()}
        onZoomOut={() => zoomHandlersRef.current?.zoomOut()}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[1200] bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-gray-200/90 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-gray-800">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition cursor-pointer"
            title="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 6. Report Flood Form Modal with marked location details */}
      <ReportFloodModal
        isOpen={isReportOpen}
        location={selectedReportLocation}
        onClose={() => setIsReportOpen(false)}
        onReportSubmitted={loadFloods}
        onRePickLocation={handleRePickLocation}
      />

      {/* 7. Admin Moderation Dashboard Modal */}
      <AdminDashboardModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onDataChanged={loadFloods}
      />
    </div>
  );
};

export default App;
