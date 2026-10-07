import React, { useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { UserReport } from '../../types';
import { voteReport } from '../../services/api';
import { Loader2, ThumbsUp, Sun, Check, Clock } from 'lucide-react';

const reportIcon = L.divIcon({
  className: 'custom-report-icon',
  html: `<div style="background: linear-gradient(135deg, #2563EB, #1D4ED8); color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 14px rgba(37,99,235,0.45); cursor: pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const getDepthLevelInfo = (level: UserReport['depthLevel']) => {
  switch (level) {
    case 'ankle':
      return { label: 'Mắt cá chân (< 20 cm)', dotBg: 'bg-amber-400', badge: 'bg-pastel-amber-50 text-amber-900 border-pastel-amber-200' };
    case 'wheel':
      return { label: 'Nửa bánh xe (20 - 40 cm)', dotBg: 'bg-orange-400', badge: 'bg-pastel-coral-50/70 text-orange-950 border-orange-200' };
    case 'knee':
      return { label: 'Đầu gối / Ngập pô (40 - 60 cm)', dotBg: 'bg-rose-500', badge: 'bg-pastel-coral-50 text-rose-950 border-pastel-coral-200' };
    case 'deep':
      return { label: 'Ngập sâu (> 60 cm)', dotBg: 'bg-red-600', badge: 'bg-red-50 text-red-950 border-red-200' };
    default:
      return { label: 'Báo cáo ngập', dotBg: 'bg-blue-600', badge: 'bg-pastel-sky-50 text-blue-900 border-sky-200' };
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
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (hasVoted === type) {
        setHasVoted(null);
      } else {
        await voteReport(report.id, type);
        setHasVoted(type);
        if (onVoteReport) {
          onVoteReport(report.id, type);
        }
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
        <div className="text-xs p-1 min-w-[220px] max-w-[250px] font-sans">
          <div className="flex items-center justify-between pb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-pastel-mint-50 text-pastel-mint-800 border border-pastel-mint-200 rounded-full font-bold text-[10px]">
              <Check className="w-2.5 h-2.5" />
              <span>Điểm ngập đã duyệt</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              <span>{report.reportedAt ? new Date(report.reportedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong'}</span>
            </span>
          </div>

          <div className={`mt-1.5 p-2 rounded-xl border flex items-center justify-between ${depthInfo.badge}`}>
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${depthInfo.dotBg} shadow-xs inline-block`} />
              <span>{depthInfo.label}</span>
            </div>
            <span className="font-mono font-bold text-xs">~{report.depthCm} cm</span>
          </div>

          {report.description && (
            <p
              title={report.description}
              className="text-slate-700 text-[11px] mt-1.5 italic bg-slate-50 p-2 rounded-xl border border-slate-200 leading-relaxed"
            >
              "{report.description}"
            </p>
          )}

          {/* Consensus Progress Bar */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex my-2 shadow-inner">
            <div
              style={{ width: `${upPercent}%` }}
              className="bg-blue-600 h-full transition-all duration-300"
            />
            <div
              style={{ width: `${downPercent}%` }}
              className="bg-amber-400 h-full transition-all duration-300"
            />
          </div>

          <div className="text-slate-500 text-[10px] flex items-center justify-between font-medium">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3 text-blue-600 flex-shrink-0" />
              <span>{upvotesCount} đang ngập ({upPercent}%)</span>
            </span>
            <span className="flex items-center gap-1">
              <Sun className="w-3 h-3 text-amber-500 flex-shrink-0" />
              <span>{downvotesCount} đã rút ({downPercent}%)</span>
            </span>
          </div>

          {/* Community Vote CTA buttons */}
          <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center gap-1.5">
            {hasVoted ? (
              <div className="w-full text-center py-2 px-2 bg-pastel-mint-50 text-pastel-mint-800 font-bold text-[10px] rounded-xl border border-pastel-mint-200 flex items-center justify-center gap-1">
                <Check className="w-3.5 h-3.5 text-pastel-mint-600" />
                <span>Đã ghi nhận đóng góp cộng đồng!</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleVote('upvote')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 bg-pastel-sky-50 hover:bg-pastel-sky-100 text-blue-800 font-bold text-[10px] rounded-xl border border-sky-200 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  title="Xác nhận điểm ngập này vẫn còn (tự động gia hạn thêm 3 giờ)"
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
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 bg-pastel-mint-50 hover:bg-pastel-mint-100 text-pastel-mint-800 font-bold text-[10px] rounded-xl border border-pastel-mint-200 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  title="Báo cáo nước đã rút tại đây"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3 h-3 animate-spin text-pastel-mint-600" />
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
