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
      return { core: '#EAB308', casing: '#713F12', label: 'Mắt cá chân (< 20cm)' };
    case 'medium':
      return { core: '#F59E0B', casing: '#78350F', label: 'Nửa bánh xe (20 - 40cm)' };
    case 'high':
      return { core: '#F97316', casing: '#7C2D12', label: 'Đầu gối / Ngập pô (40 - 60cm)' };
    case 'prohibited':
    default:
      return { core: '#DC2626', casing: '#450A0A', label: 'Ngập sâu (> 60cm) - Nguy hiểm' };
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
            color: '#6EE7B7',
            weight: 4,
            opacity: 0.5,
          }}
        />
      )}

      {/* Active Primary Route: Fastest (Blue) */}
      {isFastestSelected && fastestGeometry && (
        <>
          <Polyline
            positions={fastestGeometry.coordinates.map((c) => [c[1], c[0]])}
            pathOptions={{
              color: '#1E3A8A',
              weight: 8,
              opacity: 0.8,
            }}
          />
          <Polyline
            positions={fastestGeometry.coordinates.map((c) => [c[1], c[0]])}
            pathOptions={{
              color: '#2563EB',
              weight: 5,
              opacity: 1,
            }}
          />
        </>
      )}

      {/* Active Primary Route: Safe (Emerald) */}
      {isSafeSelected && safeGeometry && (
        <>
          <Polyline
            positions={safeGeometry.coordinates.map((c) => [c[1], c[0]])}
            pathOptions={{
              color: '#064E3B',
              weight: 9,
              opacity: 0.85,
            }}
          />
          <Polyline
            positions={safeGeometry.coordinates.map((c) => [c[1], c[0]])}
            pathOptions={{
              color: '#059669',
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
            <Polyline
              positions={seg.coordinates.map((c) => [c[1], c[0]])}
              pathOptions={{
                color: colors.casing,
                weight: 12,
                opacity: 0.95,
              }}
            />
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
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-700">
                    <span>Độ sâu dự báo:</span>
                    <strong className="text-red-600 font-bold font-mono text-xs">{seg.depthCm} cm</strong>
                  </div>
                  <div className="mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 inline-block border border-gray-200">
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

export default RoutePolyline;
