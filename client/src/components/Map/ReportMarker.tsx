import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { UserReport } from '../../types';

const reportIcon = L.divIcon({
  className: 'custom-report-icon',
  html: `<div style="background-color: #3B82F6; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">💧</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export const ReportMarker: React.FC<{ reports: UserReport[] }> = ({ reports }) => {
  return (
    <>
      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.coordinate.lat, report.coordinate.lng]}
          icon={reportIcon}
        >
          <Popup>
            <div className="text-xs p-1">
              <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[10px]">
                Báo cáo cộng đồng
              </span>
              <p className="mt-1 font-bold">Mức ngập: {report.depthLevel} • {report.depthCm} cm</p>
              <p className="text-gray-600">{report.description || 'Không có mô tả chi tiết'}</p>
              <p className="text-gray-400 text-[10px] mt-1">👍 {report.upvotes} người xác nhận</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
};
