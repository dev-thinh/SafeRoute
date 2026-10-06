import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
  Eye,
  Check,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { ReportCluster, AdminSettings } from '../../types';
import {
  getAdminReports,
  approveAdminCluster,
  rejectAdminCluster,
  takedownAdminReport,
  getAdminSettings,
  updateAdminSettings,
} from '../../services/api';
import { ClusterDetailModal } from './ClusterDetailModal';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [clusters, setClusters] = useState<ReportCluster[]>([]);
  const [settings, setSettings] = useState<AdminSettings>({
    isAutoPilotEnabled: true,
    autoApproveThreshold: 0.85,
    minClusterCountForAutoApprove: 5,
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [selectedCluster, setSelectedCluster] = useState<ReportCluster | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportsData, settingsData] = await Promise.all([
        getAdminReports(),
        getAdminSettings(),
      ]);
      setClusters(reportsData.clusters || []);
      if (settingsData.settings) {
        setSettings(settingsData.settings);
      }
    } catch (err) {
      console.warn('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleAutoPilot = async () => {
    const nextVal = !settings.isAutoPilotEnabled;
    try {
      const res = await updateAdminSettings({ isAutoPilotEnabled: nextVal });
      if (res.settings) {
        setSettings(res.settings);
      }
    } catch (err) {
      console.warn('Failed to toggle autopilot:', err);
    }
  };

  const handleApproveCluster = async (clusterId: string) => {
    setActionLoadingId(clusterId);
    try {
      await approveAdminCluster(clusterId);
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.warn('Failed to approve cluster:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectCluster = async (clusterId: string) => {
    setActionLoadingId(clusterId);
    try {
      await rejectAdminCluster(clusterId);
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.warn('Failed to reject cluster:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTakedownCluster = async (cluster: ReportCluster) => {
    setActionLoadingId(cluster.clusterId);
    try {
      // Takedown all reports in this cluster
      await Promise.all(cluster.reports.map((r) => takedownAdminReport(r.id)));
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.warn('Failed to takedown cluster:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingClusters = clusters.filter((c) => c.status === 'pending');
  const approvedClusters = clusters.filter((c) => c.status === 'approved');
  const totalSubmissions = clusters.reduce((sum, c) => sum + c.totalReports, 0);

  const displayedClusters = activeTab === 'pending' ? pendingClusters : approvedClusters;

  return (
    <div className="fixed inset-0 z-[2050] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        {/* 1. Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-gray-900 leading-tight">
                Trung Tâm Điều Phối & Kiểm Duyệt Ngập Lụt
              </h2>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                Kiểm duyệt đa tầng AI và điều hành dữ liệu giao thông công cộng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              title="Làm mới dữ liệu"
              className="p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition active:scale-95 cursor-pointer"
              aria-label="Đóng bảng quản trị"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Top Summary & Auto-Pilot Toggle Bar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-white grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Stat 1: Pending */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-800 uppercase block">Chờ duyệt</span>
              <span className="text-base font-bold text-amber-950 font-mono">
                {pendingClusters.length} cụm
              </span>
            </div>
          </div>

          {/* Stat 2: Approved / Live on map */}
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Đang trên map</span>
              <span className="text-base font-bold text-emerald-950 font-mono">
                {approvedClusters.length} điểm
              </span>
            </div>
          </div>

          {/* Stat 3: Total submissions */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-800 uppercase block">Tổng tin báo</span>
              <span className="text-base font-bold text-blue-950 font-mono">
                {totalSubmissions} tin
              </span>
            </div>
          </div>

          {/* Stat 4: Auto-Pilot Switch Card */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500 fill-current" />
                <span>Auto-Pilot AI</span>
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">
                {settings.isAutoPilotEnabled ? 'Tự duyệt ≥85% & ≥5 tin' : 'Tắt tự duyệt'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggleAutoPilot}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex items-center p-0.5 ${
                settings.isAutoPilotEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              title="Bật/Tắt chế độ tự động duyệt khi tin cậy cao"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  settings.isAutoPilotEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 3. Navigation Tabs */}
        <div className="px-4 sm:px-5 pt-3 border-b border-gray-100 flex items-center gap-4 bg-gray-50/40">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`pb-2.5 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>Cụm tin chờ duyệt</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono">
              {pendingClusters.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            className={`pb-2.5 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'approved'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>Điểm đang hiển thị trên bản đồ</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono">
              {approvedClusters.length}
            </span>
          </button>
        </div>

        {/* 4. List Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 bg-gray-50/30">
          {displayedClusters.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center text-gray-400 gap-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/80 stroke-1" />
              <p className="text-xs font-bold text-gray-700">
                {activeTab === 'pending'
                  ? 'Hiện không có cụm báo cáo nào đang chờ duyệt!'
                  : 'Chưa có điểm báo cáo cộng đồng nào được duyệt lên bản đồ!'}
              </p>
              <p className="text-[11px] text-gray-500 max-w-sm">
                Bản đồ công cộng đang hoàn toàn an toàn và không bị ảnh hưởng bởi tin ảo.
              </p>
            </div>
          ) : (
            displayedClusters.map((cluster) => {
              const confidencePercent = Math.round((cluster.aiConfidence || 0.5) * 100);
              const isBusy = actionLoadingId === cluster.clusterId;
              const isSpamCluster = confidencePercent <= 15 || cluster.aiReasoning.includes('spam') || cluster.aiReasoning.includes('SPAM');

              return (
                <div
                  key={cluster.clusterId}
                  className={`rounded-xl border p-4 shadow-xs transition space-y-3 ${
                    isSpamCluster
                      ? 'bg-red-50/20 border-red-200 hover:border-red-300'
                      : 'bg-white border-gray-200/90 hover:border-gray-300'
                  }`}
                >
                  {/* Top row: Cluster summary */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900">
                          Tọa độ: {cluster.coordinate.lat.toFixed(4)}, {cluster.coordinate.lng.toFixed(4)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isSpamCluster
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {cluster.totalReports} báo cáo từ dân
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 font-mono">
                        Độ sâu trung bình: ~{cluster.avgDepthCm} cm • Báo lúc: {new Date(cluster.latestReportedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* AI Score Badge */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isSpamCluster ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          <span>Spam rác: {confidencePercent}%</span>
                        </span>
                      ) : (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          confidencePercent >= 85
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : confidencePercent >= 60
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-gray-100 text-gray-800 border border-gray-300'
                        }`}>
                          AI chấm: {confidencePercent}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AI Reasoning Bar */}
                  <div className={`p-2.5 rounded-lg border flex items-center gap-2 text-xs ${
                    isSpamCluster
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-gray-50/80 border-gray-100 text-gray-700'
                  }`}>
                    {isSpamCluster ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    )}
                    <p className="text-[11px] font-medium line-clamp-1">
                      {cluster.aiReasoning}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCluster(cluster);
                        setIsDetailOpen(true);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem chi tiết từng báo cáo ({cluster.reports.length})</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {activeTab === 'pending' ? (
                        <>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleRejectCluster(cluster.clusterId)}
                            className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] rounded-lg transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Bác bỏ</span>
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleApproveCluster(cluster.clusterId)}
                            className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            {isBusy ? (
                              <Loader2 className="w-3 h-3 animate-spin text-white" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            <span>Duyệt & Lên map</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleTakedownCluster(cluster)}
                          className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] rounded-lg transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          title="Gỡ bỏ điểm ngập này khỏi bản đồ"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Gỡ bỏ khỏi bản đồ</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. Footer */}
        <div className="p-3.5 sm:p-4 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between text-xs text-gray-500">
          <span>
            Hệ thống tự động đồng bộ theo thời gian thực với PostgreSQL / Memory
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold rounded-lg transition active:scale-95 cursor-pointer shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Drill-down Cluster Detail Modal */}
      <ClusterDetailModal
        isOpen={isDetailOpen}
        cluster={selectedCluster}
        onClose={() => setIsDetailOpen(false)}
        onApprove={handleApproveCluster}
        onReject={handleRejectCluster}
      />
    </div>
  );
};

export default AdminDashboardModal;
