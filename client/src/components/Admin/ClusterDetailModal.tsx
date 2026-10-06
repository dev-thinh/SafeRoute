import React, { useState } from 'react';
import { X, MapPin, Sparkles, Check, Trash2, Loader2, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { ReportCluster } from '../../types';

interface ClusterDetailModalProps {
  isOpen: boolean;
  cluster: ReportCluster | null;
  onClose: () => void;
  onApprove: (clusterId: string) => Promise<void>;
  onReject: (clusterId: string) => Promise<void>;
}

export const ClusterDetailModal: React.FC<ClusterDetailModalProps> = ({
  isOpen,
  cluster,
  onClose,
  onApprove,
  onReject,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !cluster) return null;

  const handleApprove = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onApprove(cluster.clusterId);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onReject(cluster.clusterId);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const confidencePercent = Math.round((cluster.aiConfidence || 0.5) * 100);
  const isSpamCluster =
    confidencePercent <= 15 ||
    cluster.aiReasoning.includes('spam') ||
    cluster.aiReasoning.includes('SPAM') ||
    cluster.aiReasoning.includes('vô nghĩa');

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] shadow-2xl border border-gray-200/80 flex flex-col overflow-hidden">
        {/* 1. Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isSpamCluster ? 'bg-red-100 text-red-700' : 'bg-blue-100/80 text-blue-700'
            }`}>
              {isSpamCluster ? <AlertTriangle className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 leading-tight">
                Chi tiết cụm điểm ngập
              </h3>
              <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                Mã cụm: {cluster.clusterId} • {cluster.totalReports} báo cáo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition active:scale-95 cursor-pointer"
            aria-label="Đóng chi tiết"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* AI Credibility Assessment Card */}
          <div className={`p-3.5 rounded-xl border space-y-2 ${
            isSpamCluster
              ? 'bg-red-50/60 border-red-200'
              : 'bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border-blue-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                {isSpamCluster ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-red-900">AI Cảnh Báo Spam / Vô Nghĩa</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-900">AI Thẩm Định Thật/Giả (Ma trận 4 trụ cột)</span>
                  </>
                )}
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                confidencePercent >= 85
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : confidencePercent >= 60
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}>
                {confidencePercent}% Độ tin cậy
              </span>
            </div>

            {/* Score Bar */}
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div
                style={{ width: `${Math.max(5, confidencePercent)}%` }}
                className={`h-full transition-all duration-500 ${
                  confidencePercent >= 85 ? 'bg-emerald-600' : confidencePercent >= 60 ? 'bg-amber-500' : 'bg-red-500'
                }`}
              />
            </div>

            <p className="text-[11px] text-gray-700 leading-relaxed font-medium">
              {cluster.aiReasoning}
            </p>
          </div>

          {/* Location & Depth summary */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200/80">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Độ sâu bình quân</span>
              <span className="text-sm font-bold text-gray-900 font-mono mt-0.5 block">
                ~{cluster.avgDepthCm} cm
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200/80">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Tọa độ tâm cụm</span>
              <span className="text-[11px] font-bold text-gray-900 font-mono mt-0.5 block">
                {cluster.coordinate.lat.toFixed(4)}, {cluster.coordinate.lng.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Individual Reports List */}
          <div>
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span>Các báo cáo thành phần ({cluster.reports.length})</span>
            </h4>

            <div className="space-y-2">
              {cluster.reports.map((r, idx) => {
                const isReportSpam =
                  (r.aiConfidence ?? 0.5) <= 0.15 ||
                  r.aiReasoning?.includes('SPAM') ||
                  r.aiReasoning?.includes('vô nghĩa') ||
                  r.aiReasoning?.includes('rác');

                return (
                  <div
                    key={r.id || idx}
                    className={`p-3 rounded-xl border transition text-xs space-y-1.5 ${
                      isReportSpam
                        ? 'border-red-200 bg-red-50/20 hover:border-red-300'
                        : 'border-gray-200/90 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">
                          Báo cáo #{idx + 1}
                        </span>
                        {isReportSpam ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
                            <span>Nội dung rác / vô nghĩa</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ Hợp lệ
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{r.reportedAt ? new Date(r.reportedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'Vừa xong'}</span>
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-600 font-medium">
                      Mức độ ghi nhận: <span className="font-bold text-gray-800">~{r.depthCm} cm</span>
                    </div>

                    {r.description ? (
                      <p className={`text-[11px] italic p-2 rounded-lg border ${
                        isReportSpam
                          ? 'bg-red-50/70 border-red-200 text-red-900 font-medium'
                          : 'bg-gray-50 border-gray-100 text-gray-700'
                      }`}>
                        "{r.description}"
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">
                        (Không kèm mô tả chi tiết)
                      </p>
                    )}

                    {r.aiReasoning && (
                      <div className="text-[10px] text-gray-500 font-mono mt-1 flex items-start gap-1">
                        <span className="text-gray-400">Đánh giá AI:</span>
                        <span className={isReportSpam ? 'text-red-700 font-medium' : 'text-gray-600'}>
                          {r.aiReasoning}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl transition active:scale-95 cursor-pointer shadow-xs"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleReject}
              className="py-2.5 px-3.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bác bỏ cả cụm</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApprove}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Duyệt & Đưa lên bản đồ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterDetailModal;
