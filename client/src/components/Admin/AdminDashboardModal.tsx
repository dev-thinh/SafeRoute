import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Sparkles,
  Loader2,
  Eye,
  CheckCheck,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Bot,
  Hourglass,
  Layers,
  Newspaper,
  CloudRain,
  ShieldCheck,
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
import { NewsFeedTab } from '../News/NewsFeedTab';
import { WeatherTab } from '../Weather/WeatherTab';
import { useNewsCrawl } from '../../services/newsCrawlerManager';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
  onSelectLocation?: (lat: number, lng: number) => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
  onSelectLocation,
}) => {
  const [clusters, setClusters] = useState<ReportCluster[]>([]);
  const [settings, setSettings] = useState<AdminSettings>({
    isAutoPilotEnabled: true,
    autoApproveThreshold: 0.85,
    minClusterCountForAutoApprove: 5,
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'reports' | 'weather' | 'news'>('reports');
  const [reportFilter, setReportFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [selectedCluster, setSelectedCluster] = useState<ReportCluster | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Hook into background crawler status for tab badge
  const { isCrawling, progress } = useNewsCrawl();

  // Keyboard accessibility: ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDetailOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDetailOpen, onClose]);

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

  const displayedClusters =
    reportFilter === 'pending'
      ? pendingClusters
      : reportFilter === 'approved'
      ? approvedClusters
      : clusters;

  return (
    <div className="fixed inset-0 z-[2050] flex items-center justify-center bg-gray-900/50 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200">
      {/* Spacious 80% screen width & height admin modal */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full sm:w-[92vw] lg:w-[82vw] max-w-7xl h-[94vh] sm:h-[84vh] shadow-2xl border border-sky-100/90 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 font-sans">
        {/* 1. Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-pastel-sky-50/60 via-white to-pastel-lavender-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center overflow-hidden p-1 flex-shrink-0 shadow-xs">
              <img src="/logo.png" alt="SafeRoute" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg text-slate-900 leading-tight">
                  Trung Tâm Điều Phối & Quản Trị Dữ Liệu
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 hidden sm:inline">
                  Admin Hub
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Kiểm duyệt báo cáo ngập cộng đồng • Khí tượng thủy triều • Báo chí & Gemini AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'reports' && (
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                title="Làm mới dữ liệu kiểm duyệt"
                className="w-9 h-9 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              aria-label="Đóng bảng quản trị"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Top-level 3 Main Navigation Tabs */}
        <div className="px-5 sm:px-6 py-2.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between flex-wrap gap-2">
          <div className="flex p-1 bg-gray-200/80 rounded-2xl gap-1.5 w-full sm:w-auto">
            {/* Tab 1: Quản trị báo cáo ngập */}
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer min-h-[38px] ${
                activeTab === 'reports'
                  ? 'bg-white text-gray-900 shadow-glass-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Quản trị báo cáo ngập</span>
              {pendingClusters.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-pastel-amber-100 text-amber-900 font-bold animate-pulse">
                  {pendingClusters.length}
                </span>
              )}
            </button>

            {/* Tab 2: Khí tượng & Triều cường */}
            <button
              type="button"
              onClick={() => setActiveTab('weather')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer min-h-[38px] ${
                activeTab === 'weather'
                  ? 'bg-white text-gray-900 shadow-glass-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CloudRain className="w-4 h-4 text-sky-600" />
              <span>Khí tượng & Triều cường</span>
            </button>

            {/* Tab 3: Tin tức báo chí & AI */}
            <button
              type="button"
              onClick={() => setActiveTab('news')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer min-h-[38px] ${
                activeTab === 'news'
                  ? 'bg-white text-gray-900 shadow-glass-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Newspaper className="w-4 h-4 text-indigo-600" />
              <span>Tin tức báo chí & AI</span>
              {isCrawling && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-600 text-white font-bold animate-pulse flex items-center gap-1 shadow-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{progress}%</span>
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 3. Sub-header controls (Only for Reports tab) */}
        {activeTab === 'reports' && (
          <div className="p-3.5 sm:p-4 border-b border-gray-100 bg-white/70">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-3">
              {/* Stat 1: Pending Clusters */}
              <div
                onClick={() => setReportFilter('pending')}
                className={`p-3 rounded-2xl border flex items-center gap-3 shadow-glass-xs cursor-pointer transition-all ${
                  reportFilter === 'pending'
                    ? 'bg-amber-100/70 border-amber-300 ring-2 ring-amber-400/30'
                    : 'bg-pastel-amber-50/80 border-pastel-amber-200/80 hover:bg-amber-100/50'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Hourglass className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wide block">
                    Chờ duyệt
                  </span>
                  <span className="text-base font-bold text-amber-950">
                    {pendingClusters.length} cụm
                  </span>
                </div>
              </div>

              {/* Stat 2: Approved / Live on map */}
              <div
                onClick={() => setReportFilter('approved')}
                className={`p-3 rounded-2xl border flex items-center gap-3 shadow-glass-xs cursor-pointer transition-all ${
                  reportFilter === 'approved'
                    ? 'bg-emerald-100/70 border-emerald-300 ring-2 ring-emerald-400/30'
                    : 'bg-pastel-mint-50/80 border-pastel-mint-200/80 hover:bg-emerald-100/50'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-pastel-mint-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide block">
                    Đang trên bản đồ
                  </span>
                  <span className="text-base font-bold text-emerald-950">
                    {approvedClusters.length} điểm
                  </span>
                </div>
              </div>

              {/* Stat 3: Auto-Pilot Switch Card */}
              <div className="p-3 rounded-2xl bg-pastel-lavender-50/70 border border-pastel-lavender-200/80 flex items-center justify-between gap-3 shadow-glass-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wide block">
                      Auto-Pilot AI
                    </span>
                    <span className="text-xs text-gray-500">
                      {settings.isAutoPilotEnabled ? 'Tự duyệt tin cậy > 85%' : 'Duyệt thủ công'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleAutoPilot}
                  className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer flex items-center p-0.5 ${
                    settings.isAutoPilotEnabled ? 'bg-pastel-sky-600' : 'bg-gray-300'
                  }`}
                  title="Bật/Tắt chế độ tự động duyệt khi tin cậy cao"
                >
                  <div
                    className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                      settings.isAutoPilotEnabled ? 'translate-x-5.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:inline">
                Bộ lọc:
              </span>
              <button
                type="button"
                onClick={() => setReportFilter('pending')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer text-sm ${
                  reportFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Chờ duyệt • {pendingClusters.length}
              </button>
              <button
                type="button"
                onClick={() => setReportFilter('approved')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer text-sm ${
                  reportFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Đang trên bản đồ • {approvedClusters.length}
              </button>
              <button
                type="button"
                onClick={() => setReportFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer text-sm ${
                  reportFilter === 'all'
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Tất cả • {clusters.length}
              </button>
            </div>
          </div>
        )}

        {/* 4. Tab Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-gray-50/40">
          {/* TAB 1: REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-3">
              {displayedClusters.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center justify-center text-gray-400 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-pastel-mint-50 border border-pastel-mint-200 flex items-center justify-center text-emerald-600 shadow-sm">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <p className="text-xs font-bold text-gray-700">
                    {reportFilter === 'pending'
                      ? 'Hiện không có cụm báo cáo nào đang chờ duyệt!'
                      : reportFilter === 'approved'
                      ? 'Chưa có điểm báo cáo cộng đồng nào được duyệt lên bản đồ!'
                      : 'Không có dữ liệu báo cáo ngập.'}
                  </p>
                  <p className="text-xs text-gray-500 max-w-sm">
                    Bản đồ công cộng đang hoàn toàn an toàn và được bảo vệ khỏi tin ảo.
                  </p>
                </div>
              ) : (
                displayedClusters.map((cluster) => {
                  const confidencePercent = Math.round((cluster.aiConfidence || 0.5) * 100);
                  const isBusy = actionLoadingId === cluster.clusterId;
                  const isSpamCluster =
                    confidencePercent <= 15 ||
                    cluster.aiReasoning.includes('spam') ||
                    cluster.aiReasoning.includes('SPAM');

                  return (
                    <div
                      key={cluster.clusterId}
                      className={`rounded-2xl border p-4 shadow-glass-sm hover:shadow-glass-md transition-all space-y-3 ${
                        isSpamCluster
                          ? 'bg-pastel-coral-50/25 border-pastel-coral-200/80 hover:border-pastel-coral-300'
                          : 'bg-white/95 backdrop-blur-sm border-gray-200/90 hover:border-blue-300'
                      }`}
                    >
                      {/* Top row: Cluster summary */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="font-bold text-sm text-gray-900"
                              title={`Tọa độ tâm cụm báo cáo: ${cluster.coordinate.lat}, ${cluster.coordinate.lng}`}
                            >
                              Tọa độ: {cluster.coordinate.lat.toFixed(4)}, {cluster.coordinate.lng.toFixed(4)}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 ${
                                isSpamCluster
                                  ? 'bg-pastel-coral-50 text-pastel-coral-900 border-pastel-coral-200'
                                  : 'bg-pastel-sky-50 text-pastel-sky-900 border-pastel-sky-200'
                              }`}
                            >
                              <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{cluster.totalReports} báo cáo từ dân</span>
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                                cluster.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {cluster.status === 'approved' ? 'Đang trên map' : 'Chờ duyệt'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Độ sâu trung bình: ~{cluster.avgDepthCm} cm • Báo lúc:{' '}
                            {new Date(cluster.latestReportedAt).toLocaleTimeString('vi-VN', {
                              hour12: false,
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>

                        {/* AI Score Badge */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isSpamCluster ? (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-pastel-coral-100 text-rose-950 border border-pastel-coral-300 flex items-center gap-1 shadow-xs">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Spam rác: {confidencePercent}%</span>
                            </span>
                          ) : (
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full border shadow-xs flex items-center gap-1 ${
                                confidencePercent >= 85
                                  ? 'bg-pastel-mint-100 text-emerald-950 border-pastel-mint-300'
                                  : confidencePercent >= 60
                                  ? 'bg-pastel-amber-100 text-amber-950 border-pastel-amber-300'
                                  : 'bg-gray-100 text-gray-800 border-gray-300'
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-current" />
                              <span>AI chấm: {confidencePercent}%</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* AI Reasoning Bar */}
                      <div
                        title={cluster.aiReasoning}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs ${
                          isSpamCluster
                            ? 'bg-pastel-coral-50/70 border-pastel-coral-200 text-pastel-coral-900'
                            : 'bg-gray-50/80 border-gray-100 text-gray-700'
                        }`}
                      >
                        {isSpamCluster ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                        ) : (
                          <Bot className="w-3.5 h-3.5 text-pastel-sky-600 flex-shrink-0" />
                        )}
                        <p className="text-xs font-medium line-clamp-1" title={cluster.aiReasoning}>
                          {cluster.aiReasoning}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-2.5 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCluster(cluster);
                            setIsDetailOpen(true);
                          }}
                          className="text-sm font-semibold text-blue-700 hover:text-blue-900 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                          <span>Xem chi tiết từng báo cáo • {cluster.reports.length}</span>
                        </button>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          {cluster.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleRejectCluster(cluster.clusterId)}
                                title="Bác bỏ cụm báo cáo này"
                                className="py-2 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-300 font-semibold text-sm rounded-xl transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm whitespace-nowrap min-h-[38px]"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Bác bỏ</span>
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleApproveCluster(cluster.clusterId)}
                                title="Duyệt cụm báo cáo và đưa lên bản đồ SafeRoute trực tiếp"
                                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap min-h-[38px]"
                              >
                                {isBusy ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                ) : (
                                  <CheckCheck className="w-4 h-4" />
                                )}
                                <span>Duyệt & Lên map</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleTakedownCluster(cluster)}
                              className="py-2 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-300 font-semibold text-sm rounded-xl transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm whitespace-nowrap min-h-[38px]"
                              title="Gỡ bỏ điểm ngập này khỏi bản đồ"
                            >
                              <AlertTriangle className="w-4 h-4" />
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
          )}

          {/* TAB 2: WEATHER & TIDES */}
          {activeTab === 'weather' && (
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
              <WeatherTab onSelectLocation={onSelectLocation} />
            </div>
          )}

          {/* TAB 3: NEWS FEED & AI */}
          {activeTab === 'news' && (
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
              <NewsFeedTab onSelectLocation={onSelectLocation} onRefreshFloods={onDataChanged} />
            </div>
          )}
        </div>

        {/* 5. Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span className="text-center sm:text-left">
            Dữ liệu đồng bộ đa tầng: Báo cáo cư dân • Trạm đo thời tiết • RSS Báo chí & Gemini AI
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-6 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-sm rounded-xl transition active:scale-95 cursor-pointer shadow-sm text-center shrink-0 whitespace-nowrap min-h-[38px]"
          >
            Đóng cửa sổ
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
