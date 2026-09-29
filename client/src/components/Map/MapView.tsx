import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  children?: React.ReactNode;
  origin?: { lat: number; lng: number; label: string };
  destination?: { lat: number; lng: number; label: string };
  onMapClick?: (lat: number, lng: number) => void;
  onDragOrigin?: (lat: number, lng: number) => void;
  onDragDestination?: (lat: number, lng: number) => void;
  isPickingLocation?: boolean;
}

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
  onMapClick,
  onDragOrigin,
  onDragDestination,
  isPickingLocation,
}) => {
  const defaultCenter: [number, number] = [10.7626, 106.6823];

  return (
    <div className={`w-full h-full relative ${isPickingLocation ? 'cursor-crosshair' : ''}`}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
