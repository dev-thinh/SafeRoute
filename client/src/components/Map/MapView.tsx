import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  children?: React.ReactNode;
}

export const MapView: React.FC<MapViewProps> = ({ children }) => {
  // Center of Ho Chi Minh City
  const defaultCenter: [number, number] = [10.7626, 106.6823];

  return (
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
      {children}
    </MapContainer>
  );
};
