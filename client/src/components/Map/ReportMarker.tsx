import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { UserReport } from '../../types';

const reportIcon = L.divIcon({
  className: 'custom-report-icon',
  html: `<div style="background-color: #2563EB; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 4px 12px rgba(37,99,235,0.4);">💧</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const getDepthLevelLabel = (level: UserReport['depthLevel']) => {
  switch (level) {
    case 'ankle':
      return '🟢 Mắt cá chân (< 20 cm)';
    case 'wheel':
      return '🟡 Nửa bánh xe (20 - 40 cm)';
    case 'knee':
      return '🟠 Đầu gối / Ngập pô (40 - 60 cm)';
    case 'deep':
      return '🔴 Ngập sâu (> 60 cm)';
    default:
      return 'Báo cáo ngập';
  }
};

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
            <div className="text-xs p-1 max-w-[200px]">
              <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-bold text-[10px]">
                Báo cáo cộng đồng
              </span>
              <div className="mt-1.5 font-bold text-gray-900 text-xs leading-snug">
                {getDepthLevelLabel(report.depthLevel)}
              </div>
              <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                Độ sâu ghi nhận: ~{report.depthCm} cm
              </div>
              {report.description && (
                <p className="text-gray-700 text-[11px] mt-1 italic border-t border-gray-100 pt-1">
                  "{report.description}"
                </p>
              )}
              <div className="text-gray-400 text-[10px] mt-1.5 flex items-center gap-1">
                <span>👍</span>
                <span>{report.upvotes} người xác nhận</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default ReportMarker;
