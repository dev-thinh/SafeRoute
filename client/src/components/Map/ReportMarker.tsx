import React, { useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { UserReport } from '../../types';
import { voteReport } from '../../services/api';
import { Loader2, ThumbsUp, Sun, Check } from 'lucide-react';

const reportIcon = L.divIcon({
  className: 'custom-report-icon',
  html: `<div style="background-color: #2563EB; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 12px rgba(37,99,235,0.4);"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const getDepthLevelInfo = (level: UserReport['depthLevel']) => {
  switch (level) {
    case 'ankle':
      return { label: 'Mắt cá chân (< 20 cm)', dotBg: 'bg-yellow-500' };
    case 'wheel':
      return { label: 'Nửa bánh xe (20 - 40 cm)', dotBg: 'bg-amber-500' };
    case 'knee':
      return { label: 'Đầu gối / Ngập pô (40 - 60 cm)', dotBg: 'bg-orange-500' };
    case 'deep':
      return { label: 'Ngập sâu (> 60 cm)', dotBg: 'bg-red-600' };
    default:
      return { label: 'Báo cáo ngập', dotBg: 'bg-blue-600' };
  }
};

const SingleReportMarker: React.FC<{
  report: UserReport;
  onVoteReport?: (id: string, type: 'upvote' | 'resolved') => void;
}> = ({ report, onVoteReport }) => {
  const [hasVoted, setHasVoted] = useState<'upvote' | 'resolved' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const depthInfo = getDepthLevelInfo(report.depthLevel);

  const upvotesCount = report.upvotes + (hasVoted === 'upvote' ? 1 : 0);
  const downvotesCount = report.downvotes + (hasVoted === 'resolved' ? 1 : 0);
  const totalVotes = upvotesCount + downvotesCount;
  const upPercent = totalVotes > 0 ? Math.round((upvotesCount / totalVotes) * 100) : 0;
  const downPercent = totalVotes > 0 ? 100 - upPercent : 0;

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

          <div className="mt-1.5 font-bold text-gray-900 text-xs leading-snug flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${depthInfo.dotBg} inline-block flex-shrink-0`} />
            <span>{depthInfo.label}</span>
          </div>
          <div className="text-[11px] text-gray-600 font-mono mt-0.5 font-medium">
            Độ sâu ghi nhận: ~{report.depthCm} cm
          </div>
          {report.description && (
            <p className="text-gray-700 text-[11px] mt-1.5 italic bg-gray-50 p-1.5 rounded-lg border border-gray-100">
              "{report.description}"
            </p>
          )}

          {/* Consensus Progress Bar */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex my-2 shadow-inner">
            <div
              style={{ width: `${upPercent}%` }}
              className="bg-blue-600 h-full transition-all duration-300"
            />
            <div
              style={{ width: `${downPercent}%` }}
              className="bg-amber-500 h-full transition-all duration-300"
            />
          </div>

          <div className="text-gray-500 text-[10px] flex items-center justify-between font-medium">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3 text-blue-600 flex-shrink-0" />
              <span>{upvotesCount} đang ngập ({upPercent}%)</span>
            </span>
            <span className="flex items-center gap-1">
              <Sun className="w-3 h-3 text-amber-500 flex-shrink-0" />
              <span>{downvotesCount}/{totalVotes} báo đã rút ({downPercent}%)</span>
            </span>
          </div>

          {/* Community Vote CTA buttons */}
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-1.5">
            {hasVoted ? (
              <div className="w-full text-center py-1.5 px-2 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded-lg border border-emerald-200 flex items-center justify-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đã ghi nhận đóng góp của bạn!</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleVote('upvote')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg border border-blue-200 active:scale-95 transition cursor-pointer disabled:opacity-50"
                  title="Xác nhận điểm ngập này vẫn còn"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                  ) : (
                    <ThumbsUp className="w-3 h-3 text-blue-600" />
                  )}
                  <span>Đang ngập</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleVote('resolved')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-lg border border-emerald-200 active:scale-95 transition cursor-pointer disabled:opacity-50"
                  title="Báo cáo nước đã rút tại đây (khi đa số ≥ 60% xác nhận sẽ tự động ẩn điểm ngập)"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                  ) : (
                    <Sun className="w-3 h-3 text-amber-500" />
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
