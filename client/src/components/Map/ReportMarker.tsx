import React, { useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { UserReport } from '../../types';
import { voteReport } from '../../services/api';
import { Loader2 } from 'lucide-react';

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

const SingleReportMarker: React.FC<{
  report: UserReport;
  onVoteReport?: (id: string, type: 'upvote' | 'resolved') => void;
}> = ({ report, onVoteReport }) => {
  const [hasVoted, setHasVoted] = useState<'upvote' | 'resolved' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = async (type: 'upvote' | 'resolved') => {
    if (hasVoted || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await voteReport(report.id, type);
      setHasVoted(type);
      if (onVoteReport) {
        onVoteReport(report.id, type);
      }
    } catch (err) {
      console.warn('Failed to submit vote for report', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Marker
      position={[report.coordinate.lat, report.coordinate.lng]}
      icon={reportIcon}
    >
      <Popup>
        <div className="text-xs p-1 min-w-[210px] max-w-[240px]">
          <div className="flex items-center justify-between">
            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-bold text-[10px]">
              Báo cáo cộng đồng
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              {report.reportedAt ? new Date(report.reportedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong'}
            </span>
          </div>

          <div className="mt-1.5 font-bold text-gray-900 text-xs leading-snug">
            {getDepthLevelLabel(report.depthLevel)}
          </div>
          <div className="text-[11px] text-gray-600 font-mono mt-0.5 font-medium">
            Độ sâu ghi nhận: ~{report.depthCm} cm
          </div>
          {report.description && (
            <p className="text-gray-700 text-[11px] mt-1.5 italic bg-gray-50 p-1.5 rounded-lg border border-gray-100">
              "{report.description}"
            </p>
          )}

          <div className="text-gray-500 text-[10px] mt-2 flex items-center justify-between font-medium">
            <span>👍 {report.upvotes + (hasVoted === 'upvote' ? 1 : 0)} xác nhận</span>
            <span>☀️ {report.downvotes + (hasVoted === 'resolved' ? 1 : 0)}/3 báo đã rút</span>
          </div>

          {/* Community Vote CTA buttons */}
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-1.5">
            {hasVoted ? (
              <div className="w-full text-center py-1.5 px-2 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded-lg border border-emerald-200">
                ✓ Đã ghi nhận đóng góp của bạn!
              </div>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleVote('upvote')}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg border border-blue-200 active:scale-95 transition cursor-pointer disabled:opacity-50"
                  title="Xác nhận điểm ngập này vẫn còn"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                  ) : (
                    <span>👍</span>
                  )}
                  <span>Đang ngập</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleVote('resolved')}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-lg border border-emerald-200 active:scale-95 transition cursor-pointer disabled:opacity-50"
                  title="Báo cáo nước đã rút tại đây (3 người báo sẽ ẩn điểm ngập)"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                  ) : (
                    <span>☀️</span>
                  )}
                  <span>Nước đã rút</span>
                </button>
              </>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

export const ReportMarker: React.FC<{
  reports: UserReport[];
  onVoteReport?: (id: string, type: 'upvote' | 'resolved') => void;
}> = ({ reports, onVoteReport }) => {
  return (
    <>
      {reports.map((report) => (
        <SingleReportMarker
          key={report.id}
          report={report}
          onVoteReport={onVoteReport}
        />
      ))}
    </>
  );
};

export default ReportMarker;
