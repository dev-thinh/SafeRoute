import React, { useState, useEffect } from 'react';
import { X, MapPin, Check, CheckCheck, Trash2, Loader2, Calendar, FileText, AlertTriangle, Bot } from 'lucide-react';
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

  // Keyboard accessibility: ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-gray-900/50 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-xl max-h-[90vh] shadow-2xl border border-sky-100/90 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 1. Header (Standard 3-part layout) */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-pastel-sky-50/50 via-white to-pastel-lavender-50/40">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-glass-xs ${
                isSpamCluster
                  ? 'bg-pastel-coral-100 text-rose-700 border border-pastel-coral-200'
                  : 'bg-pastel-sky-100 text-pastel-sky-800 border border-pastel-sky-200'
              }`}
            >
              {isSpamCluster ? <AlertTriangle className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 leading-tight">
                Chi tiết cụm điểm ngập
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Mã cụm: {cluster.clusterId} • {cluster.totalReports} báo cáo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            aria-label="Đóng chi tiết"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* AI Credibility Assessment Card */}
          <div
            className={`p-4 rounded-2xl border space-y-2.5 shadow-glass-xs ${
              isSpamCluster
                ? 'bg-pastel-coral-50/60 border-pastel-coral-200'
                : 'bg-gradient-to-br from-pastel-sky-50/80 via-white/80 to-pastel-lavender-50/50 border-pastel-sky-200/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                {isSpamCluster ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span className="text-rose-950">AI Cảnh Báo Spam / Vô Nghĩa</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 text-pastel-sky-700" />
                    <span className="text-gray-900">AI Thẩm Định Thật/Giả - Ma trận 4 trụ cột</span>
                  </>
                )}
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-xs ${
                  confidencePercent >= 85
                    ? 'bg-pastel-mint-100 text-emerald-950 border-pastel-mint-300'
                    : confidencePercent >= 60
                    ? 'bg-pastel-amber-100 text-amber-950 border-pastel-amber-300'
                    : 'bg-pastel-coral-100 text-rose-950 border-pastel-coral-300'
                }`}
              >
                {confidencePercent}% Độ tin cậy
              </span>
            </div>

            {/* Score Bar */}
            <div className="w-full h-2.5 bg-gray-200/80 rounded-full overflow-hidden shadow-inner">
              <div
                style={{ width: `${Math.max(5, confidencePercent)}%` }}
                className={`h-full transition-all duration-500 rounded-full ${
                  confidencePercent >= 85
                    ? 'bg-pastel-mint-600'
                    : confidencePercent >= 60
                    ? 'bg-pastel-amber-500'
                    : 'bg-rose-500'
                }`}
              />
            </div>

            <p className="text-xs text-gray-700 leading-relaxed font-medium" title={cluster.aiReasoning}>
              {cluster.aiReasoning}
            </p>
          </div>

          {/* Location & Depth summary */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-gray-50/80 border border-gray-200/80">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">
                Độ sâu bình quân
              </span>
              <span className="text-sm font-bold text-gray-900 mt-0.5 block">
                ~{cluster.avgDepthCm} cm
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-gray-50/80 border border-gray-200/80">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">
                Tọa độ tâm cụm
              </span>
              <span
                className="text-xs font-bold text-gray-900 mt-0.5 block"
                title={`Tọa độ tâm: ${cluster.coordinate.lat}, ${cluster.coordinate.lng}`}
              >
                {cluster.coordinate.lat.toFixed(4)}, {cluster.coordinate.lng.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Individual Reports List */}
          <div>
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span>Các báo cáo thành phần • {cluster.reports.length}</span>
            </h4>

            <div className="space-y-2.5">
              {cluster.reports.map((r, idx) => {
                const isReportSpam =
                  (r.aiConfidence ?? 0.5) <= 0.15 ||
                  r.aiReasoning?.includes('SPAM') ||
                  r.aiReasoning?.includes('vô nghĩa') ||
                  r.aiReasoning?.includes('rác');

                return (
                  <div
                    key={r.id || idx}
                    className={`p-3.5 rounded-2xl border transition text-xs space-y-2 shadow-xs ${
                      isReportSpam
                        ? 'border-pastel-coral-200 bg-pastel-coral-50/20 hover:border-pastel-coral-300'
                        : 'border-gray-200/90 bg-white/90 hover:border-pastel-sky-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">Báo cáo #{idx + 1}</span>
                        {isReportSpam ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-pastel-coral-100 text-rose-900 border border-pastel-coral-200 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                            <span>Nội dung rác / vô nghĩa</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-pastel-mint-100 text-emerald-900 border border-pastel-mint-200 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Hợp lệ</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>
                          {r.reportedAt
                            ? new Date(r.reportedAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                              })
                            : 'Vừa xong'}
                        </span>
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 font-medium">
                      Mức độ ghi nhận: <span className="font-bold text-gray-800">~{r.depthCm} cm</span>
                    </div>

                    {r.description ? (
                      <p
                        title={r.description}
                        className={`text-xs italic p-2.5 rounded-xl border ${
                          isReportSpam
                            ? 'bg-pastel-coral-50/70 border-pastel-coral-200 text-rose-950 font-medium'
                            : 'bg-gray-50 border-gray-100 text-gray-700'
                        }`}
                      >
                        "{r.description}"
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Không kèm mô tả chi tiết</p>
                    )}

                    {r.aiReasoning && (
                      <div className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                        <span className="text-gray-400">Đánh giá AI:</span>
                        <span
                          title={r.aiReasoning}
                          className={isReportSpam ? 'text-rose-700 font-medium' : 'text-gray-600'}
                        >
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

        {/* 3. Footer Actions (Rule #39: Hủy/Đóng on left, Confirm on right) */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/90 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm rounded-xl border border-slate-300 transition active:scale-95 cursor-pointer shadow-sm min-h-[44px] whitespace-nowrap shrink-0 text-center"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleReject}
              className="flex-1 sm:flex-initial py-2.5 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-300 font-bold text-sm rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50 min-h-[44px] shadow-sm whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bác bỏ cả cụm</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApprove}
              className="flex-1 sm:flex-initial py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50 min-h-[44px] whitespace-nowrap"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5" />
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
