import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  children?: React.ReactNode;
  origin?: { lat: number; lng: number; label: string };
  destination?: { lat: number; lng: number; label: string };
  onMapClick?: (lat: number, lng: number) => void;
  isPickingLocation?: boolean;
}

const originIcon = L.divIcon({
  className: 'custom-origin-icon',
  html: `<div style="background-color: #10B981; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 3px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.35);">A</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const destIcon = L.divIcon({
  className: 'custom-dest-icon',
  html: `<div style="background-color: #2563EB; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 3px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.35);">B</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
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
          <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
            <Popup>
              <div className="p-1 text-xs">
                <span className="font-bold text-emerald-700">🟢 Điểm xuất phát (A):</span>
                <p className="mt-1 text-gray-800">{origin.label}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {destination && destination.lat !== 0 && (
          <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
            <Popup>
              <div className="p-1 text-xs">
                <span className="font-bold text-blue-700">🏁 Điểm đến (B):</span>
                <p className="mt-1 text-gray-800">{destination.label}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {children}
      </MapContainer>
    </div>
  );
};
