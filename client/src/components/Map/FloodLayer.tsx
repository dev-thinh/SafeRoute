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
        const depth = event.current_depth_cm || event.estimatedDepthCm;
        const color = depth > 35 ? '#EF4444' : depth > 20 ? '#F97316' : '#EAB308';
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
              fillOpacity: 0.35,
              weight: 2,
            }}
          >
            <Popup>
              <div className="p-1 text-xs">
                <h4 className="font-bold text-gray-900">{event.streetName}</h4>
                <p className="text-gray-600">Quận/Huyện: {event.district}</p>
                <p className="font-bold text-red-600 mt-1">Độ sâu dự kiến: ~{depth} cm</p>
                <p className="text-gray-500 text-[10px]">
                  Nguyên nhân: {event.cause === 'high_tide' ? 'Triều cường' : 'Mưa lớn'}
                </p>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
};
