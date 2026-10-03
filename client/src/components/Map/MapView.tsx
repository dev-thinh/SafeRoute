import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NavigateResponse } from '../../types';

interface MapViewProps {
  children?: React.ReactNode;
  origin?: { lat: number; lng: number; label: string };
  destination?: { lat: number; lng: number; label: string };
  routes?: NavigateResponse | null;
  center?: [number, number];
  onMapClick?: (lat: number, lng: number) => void;
  onDragOrigin?: (lat: number, lng: number) => void;
  onDragDestination?: (lat: number, lng: number) => void;
  isPickingLocation?: boolean;
  isPinningReport?: boolean;
  onMapCenterChange?: (lat: number, lng: number) => void;
  onMapMovingChange?: (isMoving: boolean) => void;
  onRegisterZoomHandlers?: (handlers: { zoomIn: () => void; zoomOut: () => void }) => void;
}

const MapNavigationController: React.FC<{
  origin?: { lat: number; lng: number; label: string };
  destination?: { lat: number; lng: number; label: string };
  center?: [number, number];
  routes?: NavigateResponse | null;
}> = ({ origin, destination, center, routes }) => {
  const map = useMap();
  const prevOriginRef = React.useRef<{ lat: number; lng: number } | null>(null);
  const prevDestRef = React.useRef<{ lat: number; lng: number } | null>(null);
  const prevRoutesRef = React.useRef<NavigateResponse | null>(null);
  const isInitialMount = React.useRef(true);

  // 1. Explicit Center focus (e.g. clicking a flood news item in News tab)
  React.useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 15, { duration: 1.0 });
    }
  }, [center, map]);

  // 2. Focus on Origin A when user selects or moves A
  React.useEffect(() => {
    if (!origin || !origin.lat || !origin.lng) return;
    const prev = prevOriginRef.current;
    const changed = !prev || Math.abs(prev.lat - origin.lat) > 0.0001 || Math.abs(prev.lng - origin.lng) > 0.0001;
    prevOriginRef.current = { lat: origin.lat, lng: origin.lng };

    if (isInitialMount.current) {
      return;
    }

    if (changed) {
      map.flyTo([origin.lat, origin.lng], 15, { duration: 1.0 });
    }
  }, [origin?.lat, origin?.lng, map]);

  // 3. Focus on Destination B when user selects or moves B
  React.useEffect(() => {
    if (!destination || !destination.lat || !destination.lng) return;
    const prev = prevDestRef.current;
    const changed = !prev || Math.abs(prev.lat - destination.lat) > 0.0001 || Math.abs(prev.lng - destination.lng) > 0.0001;
    prevDestRef.current = { lat: destination.lat, lng: destination.lng };

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (changed) {
      map.flyTo([destination.lat, destination.lng], 15, { duration: 1.0 });
    }
  }, [destination?.lat, destination?.lng, map]);

  // 4. Zoom out to fit both A, B & Route once routes are calculated
  React.useEffect(() => {
    if (!routes || (!routes.fastest_route && !routes.safe_route)) return;
    if (prevRoutesRef.current === routes) return;
    prevRoutesRef.current = routes;

    const bounds = L.latLngBounds([]);

    if (origin && origin.lat && origin.lng) {
      bounds.extend([origin.lat, origin.lng]);
    }
    if (destination && destination.lat && destination.lng) {
      bounds.extend([destination.lat, destination.lng]);
    }

    if (routes.safe_route?.geometry?.coordinates) {
      routes.safe_route.geometry.coordinates.forEach(([lng, lat]) => {
        bounds.extend([lat, lng]);
      });
    }
    if (routes.fastest_route?.geometry?.coordinates) {
      routes.fastest_route.geometry.coordinates.forEach(([lng, lat]) => {
        bounds.extend([lat, lng]);
      });
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        paddingTopLeft: [420, 60], // Offset 420px for the floating left sidebar
        paddingBottomRight: [60, 60],
        maxZoom: 15,
      });
    }
  }, [routes, origin, destination, map]);

  return null;
};

const FitRouteButton: React.FC<{
  routes?: NavigateResponse | null;
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  hidden?: boolean;
}> = ({ routes, origin, destination, hidden }) => {
  const map = useMap();
  if (hidden || !routes || (!routes.safe_route && !routes.fastest_route)) return null;

  const handleFit = () => {
    const bounds = L.latLngBounds([]);
    if (origin?.lat && origin?.lng) bounds.extend([origin.lat, origin.lng]);
    if (destination?.lat && destination?.lng) bounds.extend([destination.lat, destination.lng]);
    if (routes.safe_route?.geometry?.coordinates) {
      routes.safe_route.geometry.coordinates.forEach(([lng, lat]) => bounds.extend([lat, lng]));
    }
    if (routes.fastest_route?.geometry?.coordinates) {
      routes.fastest_route.geometry.coordinates.forEach(([lng, lat]) => bounds.extend([lat, lng]));
    }
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        paddingTopLeft: [420, 60],
        paddingBottomRight: [60, 60],
        maxZoom: 15,
      });
    }
  };

  return (
    <div className="leaflet-top leaflet-right z-[1000] pointer-events-auto m-4">
      <button
        type="button"
        onClick={handleFit}
        title="Thu nhỏ để xem toàn cảnh lộ trình"
        className="bg-white/95 hover:bg-white text-gray-800 font-bold px-3 py-2 rounded-xl shadow-lg border border-gray-200 text-xs flex items-center gap-1.5 transition backdrop-blur-sm cursor-pointer hover:shadow-xl"
      >
        <span>🗺️</span>
        <span>Toàn bộ lộ trình</span>
      </button>
    </div>
  );
};

const MapPinTracker: React.FC<{
  active?: boolean;
  onCenterChange?: (lat: number, lng: number) => void;
  onMovingChange?: (isMoving: boolean) => void;
  onRegisterZoomHandlers?: (handlers: { zoomIn: () => void; zoomOut: () => void }) => void;
}> = ({ active, onCenterChange, onMovingChange, onRegisterZoomHandlers }) => {
  const map = useMapEvents({
    movestart() {
      if (active && onMovingChange) {
        onMovingChange(true);
      }
    },
    move() {
      if (active && onCenterChange) {
        const c = map.getCenter();
        onCenterChange(c.lat, c.lng);
      }
    },
    moveend() {
      if (active) {
        if (onMovingChange) onMovingChange(false);
        if (onCenterChange) {
          const c = map.getCenter();
          onCenterChange(c.lat, c.lng);
        }
      }
    },
    zoomstart() {
      if (active && onMovingChange) {
        onMovingChange(true);
      }
    },
    zoomend() {
      if (active) {
        if (onMovingChange) onMovingChange(false);
        if (onCenterChange) {
          const c = map.getCenter();
          onCenterChange(c.lat, c.lng);
        }
      }
    },
  });

  // Dynamically set Leaflet zoom options to 'center' so mouse wheel and touch zoom
  // always zoom into the center pin being marked instead of the mouse cursor.
  React.useEffect(() => {
    if (!map) return;
    if (active) {
      map.options.scrollWheelZoom = 'center';
      map.options.doubleClickZoom = 'center';
      map.options.touchZoom = 'center';
    } else {
      map.options.scrollWheelZoom = true;
      map.options.doubleClickZoom = true;
      map.options.touchZoom = true;
    }
  }, [active, map]);

  // Expose zoomIn and zoomOut methods to parent/UI buttons
  React.useEffect(() => {
    if (onRegisterZoomHandlers) {
      onRegisterZoomHandlers({
        zoomIn: () => map.zoomIn(),
        zoomOut: () => map.zoomOut(),
      });
    }
  }, [map, onRegisterZoomHandlers]);

  React.useEffect(() => {
    if (active && onCenterChange) {
      const c = map.getCenter();
      onCenterChange(c.lat, c.lng);
      if (onMovingChange) onMovingChange(false);
    }
  }, [active]);

  return null;
};

const originIcon = L.divIcon({
  className: 'custom-origin-icon',
  html: `<div style="background-color: #10B981; color: white; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 15px; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.4); cursor: grab;">A</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const destIcon = L.divIcon({
  className: 'custom-dest-icon',
  html: `<div style="background-color: #2563EB; color: white; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 15px; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.4); cursor: grab;">B</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const MapClickHandler: React.FC<{ onMapClick?: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

export const MapView: React.FC<MapViewProps> = ({
  children,
  origin,
  destination,
  routes,
  center,
  onMapClick,
  onDragOrigin,
  onDragDestination,
  isPickingLocation,
  isPinningReport,
  onMapCenterChange,
  onMapMovingChange,
  onRegisterZoomHandlers,
}) => {
  const defaultCenter: [number, number] = [10.7626, 106.6823];
  // Pure OpenStreetMap raster tiles - 100% free and no API key required
  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div className={`w-full h-full relative ${isPickingLocation ? 'cursor-crosshair' : ''}`}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution={tileAttribution}
          url={tileUrl}
        />

        <MapNavigationController
          origin={origin}
          destination={destination}
          center={center}
          routes={routes}
        />
        <FitRouteButton
          routes={routes}
          origin={origin}
          destination={destination}
          hidden={isPinningReport}
        />
        <MapPinTracker
          active={isPinningReport}
          onCenterChange={onMapCenterChange}
          onMovingChange={onMapMovingChange}
          onRegisterZoomHandlers={onRegisterZoomHandlers}
        />
        <MapClickHandler onMapClick={onMapClick} />

        {origin && origin.lat !== 0 && (
          <Marker
            position={[origin.lat, origin.lng]}
            icon={originIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const pos = marker.getLatLng();
                if (onDragOrigin) {
                  onDragOrigin(pos.lat, pos.lng);
                }
              },
            }}
          >
            <Popup>
              <div className="p-1 text-xs">
                <span className="font-bold text-emerald-700">🟢 Điểm xuất phát (A):</span>
                <p className="mt-1 text-gray-800">{origin.label}</p>
                <p className="mt-1.5 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                  💡 Giữ & kéo ghim để chỉnh vị trí chính xác trước cửa nhà
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {destination && destination.lat !== 0 && (
          <Marker
            position={[destination.lat, destination.lng]}
            icon={destIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const pos = marker.getLatLng();
                if (onDragDestination) {
                  onDragDestination(pos.lat, pos.lng);
                }
              },
            }}
          >
            <Popup>
              <div className="p-1 text-xs">
                <span className="font-bold text-blue-700">🏁 Điểm đến (B):</span>
                <p className="mt-1 text-gray-800">{destination.label}</p>
                <p className="mt-1.5 text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                  💡 Giữ & kéo ghim để chỉnh vị trí chính xác trước cửa nhà
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {children}
      </MapContainer>
    </div>
  );
};
