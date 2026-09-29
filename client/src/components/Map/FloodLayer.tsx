import React from 'react';
import { Circle, Popup } from 'react-leaflet';
import { FloodEvent } from '../../types';

interface FloodLayerProps {
  events: FloodEvent[];
}

export const FloodLayer: React.FC<FloodLayerProps> = ({ events }) => {
  return (
    <>
      {events.map((event) => {
        const depth =
          event.current_depth_cm !== undefined
            ? event.current_depth_cm
            : event.estimatedDepthCm;
        const isActive = depth >= 10;

        // Color based on active depth severity scale
        let color = '#9CA3AF'; // Muted gray when dry
        let severityText = 'Mực nước bình thường, khô ráo';
        if (depth > 35) {
          color = '#991B1B';
          severityText = 'Cấm lưu thông > 35cm';
        } else if (depth > 25) {
          color = '#EF4444';
          severityText = 'Ngập sâu 26 - 35cm';
        } else if (depth > 15) {
          color = '#F97316';
          severityText = 'Cảnh báo ngập 16 - 25cm';
        } else if (depth >= 10) {
          color = '#EAB308';
          severityText = 'Ngập nhẹ 10 - 15cm';
        }

        const coords: [number, number] = [
          event.geometry.coordinates[1],
          event.geometry.coordinates[0],
        ];

        return (
          <Circle
            key={event.id}
            center={coords}
            radius={250}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: isActive ? 0.35 : 0.08,
              weight: isActive ? 2 : 1,
              dashArray: isActive ? undefined : '4, 4',
            }}
          >
            <Popup>
              <div className="p-1 text-xs">
                <h4 className="font-bold text-gray-900">{event.streetName}</h4>
                <p className="text-gray-600">Quận: {event.district}</p>
                <div className="mt-1 font-bold text-xs" style={{ color: isActive ? color : '#4B5563' }}>
                  {isActive ? `Độ sâu dự báo: ~${depth} cm` : `Hiện tại khô ráo`}
                </div>
                <div className="mt-0.5 text-[10px] text-gray-500 font-medium">
                  {severityText}
                </div>
                <p className="text-gray-400 text-[10px] mt-1 border-t border-gray-100 pt-1">
                  Đỉnh triều dự kiến: ~{event.estimatedDepthCm} cm
                </p>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
};
