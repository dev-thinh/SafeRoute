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
      return { core: '#EAB308', casing: '#713F12', label: 'Ngập nhẹ ≤ 15cm' };
    case 'medium':
      return { core: '#F97316', casing: '#7C2D12', label: 'Cảnh báo ngập 16 - 25cm' };
    case 'high':
      return { core: '#EF4444', casing: '#7F1D1D', label: 'Ngập sâu 26 - 35cm' };
    case 'prohibited':
    default:
      return { core: '#991B1B', casing: '#450A0A', label: 'Cấm lưu thông > 35cm' };
  }
};

export const RoutePolyline: React.FC<RoutePolylineProps> = ({
  safeGeometry,
  fastestGeometry,
  safeFloodedSegments = [],
  fastestFloodedSegments = [],
  selectedRoute,
}) => {
  const isSafeSelected = selectedRoute === 'safe';
  const isFastestSelected = selectedRoute === 'fastest';

  // Only render flooded segments belonging to the currently selected route
  const activeFloodedSegments = isSafeSelected ? safeFloodedSegments : fastestFloodedSegments;

  return (
    <>
      {/* Secondary / Inactive Route rendered softly in background */}
      {!isFastestSelected && fastestGeometry && (
        <Polyline
          positions={fastestGeometry.coordinates.map((c) => [c[1], c[0]])}
          pathOptions={{
            color: '#94A3B8',
            weight: 4,
            opacity: 0.45,
            dashArray: '6, 8',
          }}
        />
      )}

      {!isSafeSelected && safeGeometry && (
        <Polyline
          positions={safeGeometry.coordinates.map((c) => [c[1], c[0]])}
          pathOptions={{
            color: '#94A3B8',
            weight: 4,
            opacity: 0.45,
          }}
        />
      )}

      {/* Active Primary Route */}
      {isFastestSelected && fastestGeometry && (
        <>
          {/* Outer casing */}
          <Polyline
            positions={fastestGeometry.coordinates.map((c) => [c[1], c[0]])}
            pathOptions={{
              color: '#3B0764',
              weight: 8,
              opacity: 0.8,
            }}
          />
          {/* Inner core line */}
          <Polyline
            positions={fastestGeometry.coordinates.map((c) => [c[1], c[0]])}
            pathOptions={{
              color: '#A855F7',
              weight: 5,
              opacity: 1,
            }}
          />
        </>
      )}

      {isSafeSelected && safeGeometry && (
        <>
          {/* Outer casing */}
          <Polyline
            positions={safeGeometry.coordinates.map((c) => [c[1], c[0]])}
            pathOptions={{
              color: '#0C4A6E',
              weight: 9,
              opacity: 0.85,
            }}
          />
          {/* Inner core line */}
          <Polyline
            positions={safeGeometry.coordinates.map((c) => [c[1], c[0]])}
            pathOptions={{
              color: '#0284C7',
              weight: 6,
              opacity: 1,
            }}
          />
        </>
      )}

      {/* Flooded Segments ONLY for the currently active route */}
      {activeFloodedSegments.map((seg, idx) => {
        const colors = getSeverityColor(seg.severity);
        return (
          <React.Fragment key={`active-flood-${idx}`}>
            {/* Outer high-contrast black casing */}
            <Polyline
              positions={seg.coordinates.map((c) => [c[1], c[0]])}
              pathOptions={{
                color: colors.casing,
                weight: 12,
                opacity: 0.95,
              }}
            />
            {/* Vivid Color Segment */}
            <Polyline
              positions={seg.coordinates.map((c) => [c[1], c[0]])}
              pathOptions={{
                color: colors.core,
                weight: 7,
                opacity: 1,
              }}
            >
              <Popup>
                <div className="p-1.5 text-xs max-w-[240px]">
                  <div className="font-bold flex items-center gap-1.5 text-red-600">
                    <span>⚠️ Đoạn ngập trên lộ trình</span>
                  </div>
                  {seg.streetName && (
                    <div className="text-gray-900 font-bold mt-1 text-sm">
                      {seg.streetName}
                    </div>
                  )}
                  <div className="mt-1 text-[11px] text-gray-700">
                    Độ sâu dự báo: <strong className="text-red-700 font-extrabold text-xs">{seg.depthCm} cm</strong>
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
