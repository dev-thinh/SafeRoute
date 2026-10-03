import React, { useState, useEffect, useRef } from 'react';
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
  pickingField?: 'origin' | 'dest' | null;
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
  const prevOriginRef = useRef<{ lat: number; lng: number } | null>(null);
  const prevDestRef = useRef<{ lat: number; lng: number } | null>(null);
  const prevRoutesRef = useRef<NavigateResponse | null>(null);
  const isInitialMount = useRef(true);

  // 1. Explicit Center focus (e.g. clicking a flood news item in News tab)
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 15, { duration: 1.0 });
    }
  }, [center, map]);

  // 2. Focus on Origin when user selects or moves origin
  useEffect(() => {
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

  // 3. Focus on Destination when user selects or moves destination
  useEffect(() => {
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

  // 4. Zoom out to fit both Origin, Destination & Route once routes are calculated
  useEffect(() => {
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
        className="bg-white/95 hover:bg-white text-gray-800 font-bold px-3 py-2 rounded-xl shadow-lg border border-gray-200 text-xs flex items-center gap-1.5 transition backdrop-blur-sm cursor-pointer hover:shadow-xl active:scale-95"
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

  // When active (pinning report mode), zoom strictly into the center pin
  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();

    if (!active) {
      map.scrollWheelZoom?.enable();
      map.doubleClickZoom?.enable();
      return;
    }

    map.scrollWheelZoom?.disable();
    map.doubleClickZoom?.disable();

    let accumulatedDelta = 0;
    let wheelTimer: ReturnType<typeof setTimeout> | null = null;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (onMovingChange) onMovingChange(true);

      accumulatedDelta -= e.deltaY;

      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        if (Math.abs(accumulatedDelta) < 10) {
          accumulatedDelta = 0;
          if (onMovingChange) onMovingChange(false);
          return;
        }

        const delta = accumulatedDelta > 0 ? 1 : -1;
        accumulatedDelta = 0;

        const currentZoom = map.getZoom();
        const minZoom = map.getMinZoom();
        const maxZoom = map.getMaxZoom();
        const nextZoom = Math.min(Math.max(currentZoom + delta, minZoom), maxZoom);

        if (nextZoom !== currentZoom) {
          map.setView(map.getCenter(), nextZoom, { animate: true });
        } else {
          if (onMovingChange) onMovingChange(false);
        }
      }, 35);
    };

    const handleDblClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const currentZoom = map.getZoom();
      const maxZoom = map.getMaxZoom();
      if (currentZoom < maxZoom) {
        map.setView(map.getCenter(), currentZoom + 1, { animate: true });
      }
    };

    container.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    container.addEventListener('dblclick', handleDblClick, { capture: true });

    return () => {
      if (wheelTimer) clearTimeout(wheelTimer);
      container.removeEventListener('wheel', handleWheel, { capture: true } as any);
      container.removeEventListener('dblclick', handleDblClick, { capture: true } as any);
      map.scrollWheelZoom?.enable();
      map.doubleClickZoom?.enable();
    };
  }, [active, map, onMovingChange]);

  useEffect(() => {
    if (onRegisterZoomHandlers) {
      onRegisterZoomHandlers({
        zoomIn: () => map.setView(map.getCenter(), Math.min(map.getZoom() + 1, map.getMaxZoom()), { animate: true }),
        zoomOut: () => map.setView(map.getCenter(), Math.max(map.getZoom() - 1, map.getMinZoom()), { animate: true }),
      });
    }
  }, [map, onRegisterZoomHandlers]);

  useEffect(() => {
    if (active && onCenterChange) {
      const c = map.getCenter();
      onCenterChange(c.lat, c.lng);
      if (onMovingChange) onMovingChange(false);
    }
  }, [active]);

  return null;
};

// 1. Origin Pin: Compact Emerald Location Pin with Departure Bullseye (26x36px)
const originIcon = L.divIcon({
  className: 'custom-origin-pin',
  html: `
    <div style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35)); cursor: grab; display: flex; align-items: center; justify-content: center;">
      <svg width="26" height="36" viewBox="0 0 26 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="origGrad" x1="13" y1="1" x2="13" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#10B981" />
            <stop offset="100%" stop-color="#047857" />
          </linearGradient>
        </defs>
        <path d="M13 1C6.373 1 1 6.373 1 13c0 8.8 10.8 20.8 11.4 21.4.3.3.9.3 1.2 0 .6-.6 11.4-12.6 11.4-21.4C25 6.373 19.627 1 13 1z" fill="url(#origGrad)" stroke="white" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="13" cy="13" r="5" fill="white" />
        <circle cx="13" cy="13" r="2.2" fill="#047857" />
      </svg>
    </div>
  `,
  iconSize: [26, 36],
  iconAnchor: [13, 35],
  popupAnchor: [0, -36],
});

// 2. Destination Pin: Compact Ruby Rose Location Pin with Precision Target (26x36px)
const destIcon = L.divIcon({
  className: 'custom-dest-pin',
  html: `
    <div style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35)); cursor: grab; display: flex; align-items: center; justify-content: center;">
      <svg width="26" height="36" viewBox="0 0 26 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="destGrad" x1="13" y1="1" x2="13" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#F43F5E" />
            <stop offset="100%" stop-color="#BE123C" />
          </linearGradient>
        </defs>
        <path d="M13 1C6.373 1 1 6.373 1 13c0 8.8 10.8 20.8 11.4 21.4.3.3.9.3 1.2 0 .6-.6 11.4-12.6 11.4-21.4C25 6.373 19.627 1 13 1z" fill="url(#destGrad)" stroke="white" stroke-width="2" stroke-linejoin="round"/>
        <!-- High-Precision Radial Target Reticle (Centered at 13, 13) -->
        <circle cx="13" cy="13" r="5.5" stroke="white" stroke-width="1.6" fill="none" />
        <circle cx="13" cy="13" r="2.2" fill="white" />
        <line x1="13" y1="5.2" x2="13" y2="7.5" stroke="white" stroke-width="1.5" stroke-linecap="round" />
        <line x1="13" y1="18.5" x2="13" y2="20.8" stroke="white" stroke-width="1.5" stroke-linecap="round" />
        <line x1="5.2" y1="13" x2="7.5" y2="13" stroke="white" stroke-width="1.5" stroke-linecap="round" />
        <line x1="18.5" y1="13" x2="20.8" y2="13" stroke="white" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </div>
  `,
  iconSize: [26, 36],
  iconAnchor: [13, 35],
  popupAnchor: [0, -36],
});

// 3. Ghost Hover Icons when user is picking on the map
const ghostOriginIcon = L.divIcon({
  className: 'ghost-origin-pin',
  html: `
    <div style="filter: drop-shadow(0 0 10px rgba(16,185,129,0.85)); pointer-events: none; opacity: 0.92; transform: scale(1.1); display: flex; align-items: center; justify-content: center;">
      <svg width="26" height="36" viewBox="0 0 26 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ghostOrigGrad" x1="13" y1="1" x2="13" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#10B981" />
            <stop offset="100%" stop-color="#047857" />
          </linearGradient>
        </defs>
        <path d="M13 1C6.373 1 1 6.373 1 13c0 8.8 10.8 20.8 11.4 21.4.3.3.9.3 1.2 0 .6-.6 11.4-12.6 11.4-21.4C25 6.373 19.627 1 13 1z" fill="url(#ghostOrigGrad)" stroke="white" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="13" cy="13" r="5" fill="white" />
        <circle cx="13" cy="13" r="2.2" fill="#047857" />
      </svg>
    </div>
  `,
  iconSize: [26, 36],
  iconAnchor: [13, 35],
});

const ghostDestIcon = L.divIcon({
  className: 'ghost-dest-pin',
  html: `
    <div style="filter: drop-shadow(0 0 10px rgba(244,63,94,0.85)); pointer-events: none; opacity: 0.92; transform: scale(1.1); display: flex; align-items: center; justify-content: center;">
      <svg width="26" height="36" viewBox="0 0 26 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ghostDestGrad" x1="13" y1="1" x2="13" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#F43F5E" />
            <stop offset="100%" stop-color="#BE123C" />
          </linearGradient>
        </defs>
        <path d="M13 1C6.373 1 1 6.373 1 13c0 8.8 10.8 20.8 11.4 21.4.3.3.9.3 1.2 0 .6-.6 11.4-12.6 11.4-21.4C25 6.373 19.627 1 13 1z" fill="url(#ghostDestGrad)" stroke="white" stroke-width="2" stroke-linejoin="round"/>
        <!-- High-Precision Radial Target Reticle (Centered at 13, 13) -->
        <circle cx="13" cy="13" r="5.5" stroke="white" stroke-width="1.6" fill="none" />
        <circle cx="13" cy="13" r="2.2" fill="white" />
        <line x1="13" y1="5.2" x2="13" y2="7.5" stroke="white" stroke-width="1.5" stroke-linecap="round" />
        <line x1="13" y1="18.5" x2="13" y2="20.8" stroke="white" stroke-width="1.5" stroke-linecap="round" />
        <line x1="5.2" y1="13" x2="7.5" y2="13" stroke="white" stroke-width="1.5" stroke-linecap="round" />
        <line x1="18.5" y1="13" x2="20.8" y2="13" stroke="white" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </div>
  `,
  iconSize: [26, 36],
  iconAnchor: [13, 35],
});

const MapCursorPinFollower: React.FC<{
  pickingField?: 'origin' | 'dest' | null;
}> = ({ pickingField }) => {
  const [pos, setPos] = useState<[number, number] | null>(null);

  useMapEvents({
    mousemove(e) {
      if (pickingField) {
        setPos([e.latlng.lat, e.latlng.lng]);
      }
    },
    mouseout() {
      setPos(null);
    },
  });

  if (!pickingField || !pos) return null;

  return (
    <Marker
      position={pos}
      icon={pickingField === 'origin' ? ghostOriginIcon : ghostDestIcon}
      interactive={false}
    />
  );
};

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
  pickingField,
  isPinningReport,
  onMapCenterChange,
  onMapMovingChange,
  onRegisterZoomHandlers,
}) => {
  const defaultCenter: [number, number] = [10.7626, 106.6823];
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
        <MapCursorPinFollower pickingField={pickingField} />

        {/* Origin Marker: Only render when origin has coordinates > 0 */}
        {origin && origin.lat !== 0 && origin.lng !== 0 && (
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
              <div className="p-1 text-xs max-w-[200px]">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Điểm xuất phát</span>
                </div>
                <p className="mt-1 text-gray-800 font-medium leading-snug">{origin.label}</p>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                  {origin.lat.toFixed(5)}, {origin.lng.toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker: Only render when destination has coordinates > 0 */}
        {destination && destination.lat !== 0 && destination.lng !== 0 && (
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
              <div className="p-1 text-xs max-w-[200px]">
                <div className="flex items-center gap-1.5 font-bold text-rose-700">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Điểm đến</span>
                </div>
                <p className="mt-1 text-gray-800 font-medium leading-snug">{destination.label}</p>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                  {destination.lat.toFixed(5)}, {destination.lng.toFixed(5)}
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

export default MapView;
