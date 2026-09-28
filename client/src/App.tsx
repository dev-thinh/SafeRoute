import React, { useState, useEffect } from 'react';
import { MapView } from './components/Map/MapView';
import { FloodLayer } from './components/Map/FloodLayer';
import { RoutePolyline } from './components/Map/RoutePolyline';
import { ReportMarker } from './components/Map/ReportMarker';
import { RoutePlannerPanel } from './components/Navigation/RoutePlannerPanel';
import { ReportFloodModal } from './components/Reporting/ReportFloodModal';
import { AdminArticleIngestion } from './components/Admin/AdminArticleIngestion';
import { getActiveFloods } from './services/api';
import { Droplet, Newspaper } from 'lucide-react';
import { NavigateResponse, FloodEvent, UserReport } from './types';

export const App: React.FC = () => {
  const [routes, setRoutes] = useState<NavigateResponse | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<'safe' | 'fastest'>('safe');
  const [floodEvents, setFloodEvents] = useState<FloodEvent[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const loadFloods = async () => {
    try {
      const data = await getActiveFloods();
      setFloodEvents(data.events || []);
      setReports(data.reports || []);
    } catch (err) {
      console.error('Failed to load active floods', err);
    }
  };

  useEffect(() => {
    loadFloods();
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans">
      <RoutePlannerPanel
        onRoutesCalculated={setRoutes}
        selectedRouteType={selectedRouteType}
        onSelectRouteType={setSelectedRouteType}
      />

      <MapView>
        <FloodLayer events={floodEvents} />
        <ReportMarker reports={reports} />
        {routes && (
          <RoutePolyline
            safeGeometry={routes.safe_route?.geometry}
            fastestGeometry={routes.fastest_route?.geometry}
            selectedRoute={selectedRouteType}
          />
        )}
      </MapView>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2.5">
        <button
          onClick={() => setIsAdminOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/90 hover:bg-white text-gray-800 text-xs font-bold rounded-full shadow-lg border border-gray-200 transition backdrop-blur-sm"
        >
          <Newspaper className="w-4 h-4 text-purple-600" />
          Phân tích tin tức (AI)
        </button>
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

      <AdminArticleIngestion
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onSuccess={loadFloods}
      />
    </div>
  );
};

export default App;
