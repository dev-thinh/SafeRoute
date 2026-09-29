import React from 'react';
import { Polyline, Popup } from 'react-leaflet';
import { FloodedSegment } from '../../types';

interface RoutePolylineProps {
  safeGeometry?: GeoJSON.LineString;
  fastestGeometry?: GeoJSON.LineString;
  safeFloodedSegments?: FloodedSegment[];
  fastestFloodedSegments?: FloodedSegment[];
  selectedRoute: 'safe' | 'fastest';
}

const getSeverityColor = (severity: FloodedSegment['severity']) => {
  switch (severity) {
    case 'low':
      return { core: '#EAB308', casing: '#713F12', label: 'Mức Vàng: Ngập nhẹ (≤ 15cm)' };
    case 'medium':
      return { core: '#F97316', casing: '#7C2D12', label: 'Mức Cam: Cảnh báo ngập (16 - 25cm)' };
    case 'high':
      return { core: '#EF4444', casing: '#7F1D1D', label: 'Mức Đỏ: Ngập sâu (26 - 35cm)' };
    case 'prohibited':
    default:
      return { core: '#991B1B', casing: '#450A0A', label: 'Mức Đỏ sẫm: CẤM LƯU THÔNG (> 35cm)' };
  }
};

export const RoutePolyline: React.FC<RoutePolylineProps> = ({
  safeGeometry,
  fastestGeometry,
  safeFloodedSegments = [],
  fastestFloodedSegments = [],
  selectedRoute,
}) => {
  // Determine which flooded segments to highlight based on active selection
  const activeFloodedSegments = selectedRoute === 'fastest' ? fastestFloodedSegments : safeFloodedSegments;
  // Also display inactive route flooded segments slightly dimmer
  const inactiveFloodedSegments = selectedRoute === 'fastest' ? safeFloodedSegments : fastestFloodedSegments;

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

      {/* Inactive Route Flooded Segments (Dimmer) */}
      {inactiveFloodedSegments.map((seg, idx) => {
        const colors = getSeverityColor(seg.severity);
        return (
          <Polyline
            key={`inactive-flood-${idx}`}
            positions={seg.coordinates.map((c) => [c[1], c[0]])}
            pathOptions={{
              color: colors.core,
              weight: 4,
              opacity: 0.5,
              dashArray: '4, 4',
            }}
          />
        );
      })}

      {/* Active Route Flooded Segments (Highlighted & Colored: Yellow -> Orange -> Red -> Prohibited Dark Red) */}
      {activeFloodedSegments.map((seg, idx) => {
        const colors = getSeverityColor(seg.severity);
        return (
          <React.Fragment key={`active-flood-${idx}`}>
            {/* Outer high-contrast black/dark casing */}
            <Polyline
              positions={seg.coordinates.map((c) => [c[1], c[0]])}
              pathOptions={{
                color: colors.casing,
                weight: 10,
                opacity: 0.9,
              }}
            />
            {/* Vivid Color Segment (Yellow -> Red) */}
            <Polyline
              positions={seg.coordinates.map((c) => [c[1], c[0]])}
              pathOptions={{
                color: colors.core,
                weight: 6,
                opacity: 1,
              }}
            >
              <Popup>
                <div className="p-1.5 text-xs max-w-[220px]">
                  <div className="font-bold flex items-center gap-1.5 text-red-600">
                    <span>⚠️ Đoạn đường ngập lụt</span>
                  </div>
                  {seg.streetName && (
                    <div className="text-gray-800 font-semibold mt-1">
                      Đường: {seg.streetName}
                    </div>
                  )}
                  <div className="mt-1 text-[11px] text-gray-700">
                    Độ sâu dự báo: <strong className="text-red-700">{seg.depthCm} cm</strong>
                  </div>
                  <div className="mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-800">
                    {colors.label}
                  </div>
                </div>
              </Popup>
            </Polyline>
          </React.Fragment>
        );
      })}
    </>
  );
};
