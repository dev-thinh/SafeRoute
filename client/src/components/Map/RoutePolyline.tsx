import React from 'react';
import { Polyline } from 'react-leaflet';

interface RoutePolylineProps {
  safeGeometry?: GeoJSON.LineString;
  fastestGeometry?: GeoJSON.LineString;
  selectedRoute: 'safe' | 'fastest';
}

export const RoutePolyline: React.FC<RoutePolylineProps> = ({
  safeGeometry,
  fastestGeometry,
  selectedRoute,
}) => {
  return (
    <>
      {fastestGeometry && (
        <Polyline
          positions={fastestGeometry.coordinates.map((c) => [c[1], c[0]])}
          pathOptions={{
            color: selectedRoute === 'fastest' ? '#F59E0B' : '#9CA3AF',
            weight: selectedRoute === 'fastest' ? 6 : 4,
            dashArray: '8, 8',
          }}
        />
      )}
      {safeGeometry && (
        <Polyline
          positions={safeGeometry.coordinates.map((c) => [c[1], c[0]])}
          pathOptions={{
            color: selectedRoute === 'safe' ? '#10B981' : '#6EE7B7',
            weight: selectedRoute === 'safe' ? 7 : 4,
          }}
        />
      )}
    </>
  );
};
