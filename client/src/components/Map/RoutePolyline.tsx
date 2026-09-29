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
      {/* Fastest Route - Neon Violet / Purple with outer casing */}
      {fastestGeometry && (
        <>
          {/* Outer casing */}
          <Polyline
            positions={fastestGeometry.coordinates.map((c) => [c[1], c[0]])}
            pathOptions={{
              color: '#3B0764',
              weight: selectedRoute === 'fastest' ? 8 : 5,
              opacity: 0.6,
            }}
          />
          {/* Inner dashed line */}
          <Polyline
            positions={fastestGeometry.coordinates.map((c) => [c[1], c[0]])}
            pathOptions={{
              color: selectedRoute === 'fastest' ? '#A855F7' : '#7E22CE',
              weight: selectedRoute === 'fastest' ? 5 : 3,
              dashArray: '6, 8',
              opacity: 0.95,
            }}
          />
        </>
      )}

      {/* Safe Route - Bright Electric Sky Blue with outer casing */}
      {safeGeometry && (
        <>
          {/* Outer casing for maximum contrast against map */}
          <Polyline
            positions={safeGeometry.coordinates.map((c) => [c[1], c[0]])}
            pathOptions={{
              color: '#0C4A6E',
              weight: selectedRoute === 'safe' ? 9 : 6,
              opacity: 0.7,
            }}
          />
          {/* Core Sky Blue Line */}
          <Polyline
            positions={safeGeometry.coordinates.map((c) => [c[1], c[0]])}
            pathOptions={{
              color: selectedRoute === 'safe' ? '#0284C7' : '#38BDF8',
              weight: selectedRoute === 'safe' ? 6 : 4,
              opacity: 1,
            }}
          />
        </>
      )}
    </>
  );
};
