import React, { useState, useMemo, useEffect } from 'react';
import { X, MapPin, Edit3, Loader2, Check, CheckCircle2, AlertTriangle, ShieldCheck, Radio } from 'lucide-react';
import { submitReport } from '../../services/api';
import { AuthUser } from '../../types';

export interface SelectedReportLocation {
  lat: number;
  lng: number;
  label: string;
}

interface MyReportRecord {
  id: string;
  lat: number;
  lng: number;
  depthLevel: string;
  reportedAt: string;
}

function calculateDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const ReportFloodModal: React.FC<{
  isOpen: boolean;
  location: SelectedReportLocation | null;
  currentUser?: AuthUser | null;
  onClose: () => void;
  onReportSubmitted: () => void;
  onRePickLocation: () => void;
}> = ({ isOpen, location, currentUser, onClose, onReportSubmitted, onRePickLocation }) => {
  const isAdmin = currentUser?.role === 'admin';
  const [depthLevel, setDepthLevel] = useState<'ankle' | 'wheel' | 'knee' | 'deep'>('wheel');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

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

  // Check if current user already reported at this location within 150m in the last 2 hours
  const alreadyReported = useMemo(() => {
    if (!location) return false;
    try {
      const stored = localStorage.getItem('saferoute_my_reports');
      if (!stored) return false;
      const list: MyReportRecord[] = JSON.parse(stored);
      const now = Date.now();
      return list.some((r) => {
        const diffMs = now - new Date(r.reportedAt).getTime();
        if (diffMs > 2 * 60 * 60 * 1000) return false;
        return calculateDistanceM(location.lat, location.lng, r.lat, r.lng) <= 150;
      });
    } catch {
      return false;
    }
  }, [location, isOpen]);

  if (!isOpen || !location) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || (!isAdmin && alreadyReported)) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await submitReport({
        coordinate: { lat: location.lat, lng: location.lng },
        depth_level: depthLevel,
        description: description.trim() || undefined,
      });

      // Save to local reports history to prevent duplicate reporting and show indicator
      try {
        const stored = localStorage.getItem('saferoute_my_reports');
        const list: MyReportRecord[] = stored ? JSON.parse(stored) : [];
        list.unshift({
          id: res?.report?.id || `rep_${Date.now()}`,
          lat: location.lat,
          lng: location.lng,
          depthLevel,
          reportedAt: new Date().toISOString(),
        });
        localStorage.setItem('saferoute_my_reports', JSON.stringify(list.slice(0, 30)));
      } catch (storageErr) {
        console.warn('Failed to save report to local storage:', storageErr);
      }

      setIsSuccess(true);
      setDescription('');
    } catch (err: any) {
      console.error('Failed to submit report', err);
      setErrorMsg(
        err?.response?.data?.error || err.message || 'Không thể gửi báo cáo lúc này. Vui lòng thử lại!'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    setIsSuccess(false);
    onReportSubmitted();
    onClose();
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-7 w-full max-w-sm shadow-glass-xl border border-white/70 flex flex-col items-center text-center gap-3.5 animate-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-pastel-mint-50 border border-pastel-mint-200 flex items-center justify-center text-emerald-600 shadow-sm">
            {isAdmin ? <ShieldCheck className="w-7 h-7 text-blue-600" /> : <CheckCircle2 className="w-7 h-7" />}
          </div>
          <div>
            <h3 className="font-bold text-base text-gray-900 leading-tight">
              {isAdmin ? 'Đã phát cảnh báo ngập thành công!' : 'Đã tiếp nhận báo cáo của bạn!'}
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed mt-2">
              {isAdmin
                ? 'Điểm ngập đã được đưa trực tiếp lên bản đồ công cộng. Toàn bộ người dân và thuật toán tìm đường đã được cập nhật ngay lập tức để né tránh vị trí này.'
                : 'Cảm ơn tinh thần đóng góp của bạn. Báo cáo đã được chuyển đến ban điều phối để kiểm duyệt trước khi đưa lên bản đồ điều hướng.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleFinish}
            className="w-full mt-2 py-3.5 min-h-[48px] bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm rounded-xl shadow-lg transition-all cursor-pointer whitespace-nowrap"
          >
            {isAdmin ? 'Hoàn tất & Xem bản đồ' : 'Đã hiểu'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-sky-100/90 flex flex-col gap-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* 1. Header (Standard 3-part layout: Header -> Body -> Footer) */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center overflow-hidden p-1 flex-shrink-0 shadow-xs">
              <img src="/logo.png" alt="SafeRoute" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 leading-tight">
                  {isAdmin ? 'Phát cảnh báo điểm ngập' : 'Báo cáo điểm ngập tức thì'}
                </h3>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full text-[11px] font-bold">
                    <ShieldCheck className="w-3 h-3 text-blue-600" />
                    <span>Admin</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {isAdmin
                  ? 'Cảnh báo chính thức được đưa thẳng lên bản đồ điều hướng'
                  : 'Cập nhật ngay vào bản đồ cho toàn bộ cộng đồng'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 min-h-[36px] min-w-[36px] rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            aria-label="Đóng biểu mẫu"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Marked Location Card */}
        <div className="bg-gradient-to-r from-pastel-sky-50/80 via-white/70 to-pastel-lavender-50/50 border border-pastel-sky-200/70 rounded-2xl p-3.5 flex items-start justify-between gap-3 shadow-glass-xs">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-2 bg-pastel-sky-600 text-white rounded-xl mt-0.5 flex-shrink-0 shadow-glass-xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-pastel-sky-800 uppercase tracking-wider block">
                Vị trí đã đánh dấu
              </span>
              <p
                className="text-sm font-bold text-gray-900 mt-0.5 line-clamp-2 leading-snug"
                title={location.label || `Tọa độ: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
              >
                {location.label || `Tọa độ: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRePickLocation}
            className="flex items-center gap-1.5 text-sm text-pastel-sky-800 hover:text-pastel-sky-950 font-semibold bg-white/90 hover:bg-white px-3 py-2 min-h-[38px] rounded-xl border border-pastel-sky-200/80 shadow-glass-xs hover:shadow-glass-sm transition-all flex-shrink-0 active:scale-95 cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Đổi vị trí</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-pastel-coral-50 border border-pastel-coral-200 text-pastel-coral-900 text-xs rounded-2xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-pastel-coral-700 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {isAdmin ? (
          <div className="p-3 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 border border-blue-200/80 rounded-2xl flex items-start gap-2.5 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs text-blue-950">Chế độ Quản trị viên (Official Dispatch)</p>
              <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">
                Điểm ngập sẽ được duyệt và hiển thị trực tiếp lên bản đồ ngay lập tức với độ tin cậy 100%, không cần qua hàng chờ duyệt.
              </p>
            </div>
          </div>
        ) : (
          alreadyReported && (
            <div className="p-3 bg-pastel-mint-50 border border-pastel-mint-200 text-emerald-950 text-xs rounded-2xl flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Bạn đã gửi báo cáo tại khu vực này</p>
                <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                  Hệ thống đã tiếp nhận dữ liệu và đang kiểm duyệt. Bạn không cần gửi lặp lại.
                </p>
              </div>
            </div>
          )
        )}

        {/* 3. Form Content */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
              Mức độ ngập thực tế
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Ankle */}
              <button
                type="button"
                onClick={() => setDepthLevel('ankle')}
                className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer min-h-[72px] flex flex-col justify-between ${
                  depthLevel === 'ankle'
                    ? 'border-pastel-amber-400 bg-pastel-amber-50/90 font-bold ring-2 ring-pastel-amber-400/40 shadow-xs'
                    : 'border-gray-200/90 hover:border-pastel-amber-200 bg-white/80 hover:bg-pastel-amber-50/30'
                }`}
              >
                <div className="font-bold text-sm text-amber-950 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-pastel-amber-500 shadow-xs" />
                    <span>Mắt cá chân</span>
                  </div>
                  {depthLevel === 'ankle' && <Check className="w-4 h-4 text-amber-800" />}
                </div>
                <div className="text-xs text-amber-800 font-medium mt-1">
                  &lt; 20 cm • Xe qua tốt
                </div>
              </button>

              {/* Wheel */}
              <button
                type="button"
                onClick={() => setDepthLevel('wheel')}
                className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer min-h-[72px] flex flex-col justify-between ${
                  depthLevel === 'wheel'
                    ? 'border-pastel-amber-500 bg-pastel-amber-100/70 font-bold ring-2 ring-pastel-amber-500/40 shadow-xs'
                    : 'border-gray-200/90 hover:border-pastel-amber-300 bg-white/80 hover:bg-pastel-amber-50/30'
                }`}
              >
                <div className="font-bold text-sm text-amber-950 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-xs" />
                    <span>Nửa bánh xe</span>
                  </div>
                  {depthLevel === 'wheel' && <Check className="w-4 h-4 text-amber-800" />}
                </div>
                <div className="text-xs text-amber-900 font-medium mt-1">
                  20 - 40 cm • Cần cẩn thận
                </div>
              </button>

              {/* Knee */}
              <button
                type="button"
                onClick={() => setDepthLevel('knee')}
                className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer min-h-[72px] flex flex-col justify-between ${
                  depthLevel === 'knee'
                    ? 'border-pastel-coral-400 bg-pastel-coral-50/90 font-bold ring-2 ring-pastel-coral-400/40 shadow-xs'
                    : 'border-gray-200/90 hover:border-pastel-coral-200 bg-white/80 hover:bg-pastel-coral-50/30'
                }`}
              >
                <div className="font-bold text-sm text-pastel-coral-900 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-xs" />
                    <span>Đầu gối / Ngập pô</span>
                  </div>
                  {depthLevel === 'knee' && <Check className="w-4 h-4 text-rose-700" />}
                </div>
                <div className="text-xs text-pastel-coral-800 font-medium mt-1">
                  40 - 60 cm • Nguy cơ chết máy
                </div>
              </button>

              {/* Deep */}
              <button
                type="button"
                onClick={() => setDepthLevel('deep')}
                className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer min-h-[72px] flex flex-col justify-between ${
                  depthLevel === 'deep'
                    ? 'border-rose-400 bg-rose-50/90 font-bold ring-2 ring-rose-400/40 shadow-xs'
                    : 'border-gray-200/90 hover:border-rose-200 bg-white/80 hover:bg-rose-50/30'
                }`}
              >
                <div className="font-bold text-sm text-rose-950 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-xs" />
                    <span>Ngập sâu</span>
                  </div>
                  {depthLevel === 'deep' && <Check className="w-4 h-4 text-rose-800" />}
                </div>
                <div className="text-xs text-rose-800 font-medium mt-1">
                  &gt; 60 cm • Tuyệt đối không vào
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5">
              Mô tả chi tiết - Không bắt buộc
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Nước chảy xiết trước số nhà 15, nhiều xe máy chết máy..."
              className="w-full text-sm p-3.5 border border-gray-200/90 rounded-2xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium text-gray-800 transition resize-none bg-gray-50/50 focus:bg-white shadow-xs"
              rows={3}
            />
          </div>

          {/* 4. Action Footer (Rule #39: Hủy on left, Xác nhận on right) */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-6 min-h-[46px] bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-sm rounded-xl transition active:scale-95 cursor-pointer shadow-sm whitespace-nowrap shrink-0"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || (!isAdmin && alreadyReported)}
              className={`flex-1 py-3 px-4 min-h-[46px] font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer whitespace-nowrap ${
                isAdmin
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed'
                  : alreadyReported
                  ? 'bg-emerald-600 text-white shadow-md opacity-90 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{isAdmin ? 'Đang phát cảnh báo...' : 'Đang gửi báo cáo...'}</span>
                </>
              ) : isAdmin ? (
                <>
                  <Radio className="w-4 h-4" />
                  <span>Phát cảnh báo ngập ngay</span>
                </>
              ) : alreadyReported ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Đã báo cáo vị trí này</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Gửi báo cáo ngay</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportFloodModal;
