import React from 'react';
import { Circle, Popup } from 'react-leaflet';
import { FloodEvent } from '../../types';

interface FloodLayerProps {
  events: FloodEvent[];
}

export const FloodLayer: React.FC<FloodLayerProps> = ({ events }) => {
  // Only render corridors that are actively flooded (>= 10 cm), keeping the map clean
  const floodedEvents = events.filter((event) => {
    const depth =
      event.current_depth_cm !== undefined
        ? event.current_depth_cm
        : event.estimatedDepthCm;
    return depth >= 10;
  });

  return (
    <>
      {floodedEvents.map((event) => {
        const depth =
          event.current_depth_cm !== undefined
            ? event.current_depth_cm
            : event.estimatedDepthCm;
        const isActive = true;

        // Color based on standardized 4-tier flood alert scale
        let color = '#9CA3AF'; // Muted gray when dry
        let severityText = 'Khô ráo / Bình thường';
        let badgeBg = 'bg-gray-100 text-gray-700';

        if (depth > 60) {
          color = '#DC2626'; // red-600
          severityText = 'Ngập sâu (> 60cm) - Tuyệt đối không đi vào';
          badgeBg = 'bg-red-50 text-red-700 border-red-200';
        } else if (depth >= 40) {
          color = '#F97316'; // orange-500
          severityText = 'Đầu gối / Ngập pô (40 - 60cm) - Nguy hiểm xe máy';
          badgeBg = 'bg-orange-50 text-orange-700 border-orange-200';
        } else if (depth >= 20) {
          color = '#F59E0B'; // amber-500
          severityText = 'Nửa bánh xe (20 - 40cm) - Cần cẩn thận';
          badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
        } else if (depth >= 10) {
          color = '#EAB308'; // yellow-500
          severityText = 'Mắt cá chân (< 20cm) - Cảnh báo nhẹ';
          badgeBg = 'bg-yellow-50 text-yellow-800 border-yellow-200';
        }

        const coords: [number, number] = [
          event.geometry.coordinates[1],
          event.geometry.coordinates[0],
        ];

        // Synchronized with backend FLOOD_HAZARD_RADIUS_METERS = 80m
        const floodRadius = isActive ? 80 : 40;

        return (
          <Circle
            key={event.id}
            center={coords}
            radius={floodRadius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: isActive ? 0.35 : 0.08,
              weight: isActive ? 2 : 1,
              dashArray: isActive ? undefined : '4, 4',
            }}
          >
            <Popup>
              <div className="p-1.5 text-xs max-w-[220px]">
                <h4
                  className="font-bold text-gray-900 text-sm leading-snug"
                  title={`${event.streetName}, ${event.district}`}
                >
                  {event.streetName}
                </h4>
                <p className="text-gray-500 text-xs mt-0.5">Quận: {event.district}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-gray-600 text-xs">Độ sâu dự báo:</span>
                  <span className="font-bold text-xs" style={{ color: isActive ? color : '#4B5563' }}>
                    {isActive ? `~${depth} cm` : `Khô ráo`}
                  </span>
                </div>
                <div
                  className={`mt-2 p-1.5 rounded-lg border text-xs font-semibold leading-tight ${badgeBg}`}
                  title={severityText}
                >
                  {severityText}
                </div>
                {event.estimatedDepthCm !== undefined && (
                  <p className="text-gray-500 text-xs mt-1.5 border-t border-gray-100 pt-1">
                    Đỉnh triều dự kiến: ~{event.estimatedDepthCm} cm
                  </p>
                )}
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
};

export default FloodLayer;
