import React, { useState, useMemo, useEffect } from 'react';
import { X, Droplet, MapPin, Edit3, Loader2, Check, CheckCircle2, AlertTriangle } from 'lucide-react';
import { submitReport } from '../../services/api';

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
  onClose: () => void;
  onReportSubmitted: () => void;
  onRePickLocation: () => void;
}> = ({ isOpen, location, onClose, onReportSubmitted, onRePickLocation }) => {
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
    if (loading || alreadyReported) return;
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
          <div className="w-14 h-14 rounded-2xl bg-pastel-mint-50 border border-pastel-mint-200 flex items-center justify-center text-pastel-mint-dark shadow-glass-xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-base text-gray-900 leading-tight">
              Đã tiếp nhận báo cáo của bạn!
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed mt-2">
              Cảm ơn tinh thần đóng góp của bạn. Báo cáo đã được chuyển đến ban điều phối để kiểm duyệt trước khi đưa lên bản đồ điều hướng.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFinish}
            className="w-full mt-2 py-3 min-h-[44px] bg-pastel-sky-600 hover:bg-pastel-sky-700 active:bg-pastel-sky-800 text-white font-bold text-xs rounded-xl shadow-glass-sm hover:shadow-glass-md transition-all active:scale-95 cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-glass-xl border border-white/70 flex flex-col gap-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* 1. Header (Standard 3-part layout: Header -> Body -> Footer) */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pastel-sky-50 border border-pastel-sky-200/80 flex items-center justify-center text-pastel-sky-700 flex-shrink-0 shadow-glass-xs">
              <Droplet className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 leading-tight">
                Báo cáo điểm ngập tức thì
              </h3>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                Cập nhật ngay vào bản đồ cho toàn bộ cộng đồng
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 min-h-[36px] min-w-[36px] rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            aria-label="Đóng biểu mẫu"
            title="Đóng (Esc)"
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
              <span className="text-[10px] font-bold text-pastel-sky-800 uppercase tracking-wider block">
                Vị trí đã đánh dấu
              </span>
              <p className="text-xs font-bold text-gray-900 mt-0.5 line-clamp-2 leading-snug">
                {location.label || `Tọa độ: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
              </p>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRePickLocation}
            className="flex items-center gap-1.5 text-xs text-pastel-sky-800 hover:text-pastel-sky-950 font-bold bg-white/90 hover:bg-white px-3 py-2 min-h-[38px] rounded-xl border border-pastel-sky-200/80 shadow-glass-xs hover:shadow-glass-sm transition-all flex-shrink-0 active:scale-95 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Đổi vị trí</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-pastel-coral-50 border border-pastel-coral-200 text-pastel-coral-900 text-xs rounded-2xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-pastel-coral-700 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {alreadyReported && (
          <div className="p-3 bg-pastel-mint-50 border border-pastel-mint-200 text-emerald-950 text-xs rounded-2xl flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-pastel-mint-dark flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs">Bạn đã gửi báo cáo tại khu vực này</p>
              <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                Hệ thống đã tiếp nhận dữ liệu và đang kiểm duyệt. Bạn không cần gửi lặp lại.
              </p>
            </div>
          </div>
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
                    ? 'border-pastel-amber-400 bg-pastel-amber-50/90 font-bold ring-2 ring-pastel-amber-400/40 shadow-glass-xs'
                    : 'border-gray-200/90 hover:border-pastel-amber-200 bg-white/80 hover:bg-pastel-amber-50/30'
                }`}
              >
                <div className="font-bold text-amber-950 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-pastel-amber-500 shadow-xs" />
                    <span>Mắt cá chân</span>
                  </div>
                  {depthLevel === 'ankle' && <Check className="w-3.5 h-3.5 text-amber-800" />}
                </div>
                <div className="text-[10px] text-amber-800 font-medium mt-1">
                  &lt; 20 cm • Xe qua tốt
                </div>
              </button>

              {/* Wheel */}
              <button
                type="button"
                onClick={() => setDepthLevel('wheel')}
                className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer min-h-[72px] flex flex-col justify-between ${
                  depthLevel === 'wheel'
                    ? 'border-pastel-amber-500 bg-pastel-amber-100/70 font-bold ring-2 ring-pastel-amber-500/40 shadow-glass-xs'
                    : 'border-gray-200/90 hover:border-pastel-amber-300 bg-white/80 hover:bg-pastel-amber-50/30'
                }`}
              >
                <div className="font-bold text-amber-950 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-xs" />
                    <span>Nửa bánh xe</span>
                  </div>
                  {depthLevel === 'wheel' && <Check className="w-3.5 h-3.5 text-amber-800" />}
                </div>
                <div className="text-[10px] text-amber-900 font-medium mt-1">
                  20 - 40 cm • Cần cẩn thận
                </div>
              </button>

              {/* Knee */}
              <button
                type="button"
                onClick={() => setDepthLevel('knee')}
                className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer min-h-[72px] flex flex-col justify-between ${
                  depthLevel === 'knee'
                    ? 'border-pastel-coral-400 bg-pastel-coral-50/90 font-bold ring-2 ring-pastel-coral-400/40 shadow-glass-xs'
                    : 'border-gray-200/90 hover:border-pastel-coral-200 bg-white/80 hover:bg-pastel-coral-50/30'
                }`}
              >
                <div className="font-bold text-pastel-coral-900 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-pastel-coral-dark shadow-xs" />
                    <span>Đầu gối / Ngập pô</span>
                  </div>
                  {depthLevel === 'knee' && <Check className="w-3.5 h-3.5 text-pastel-coral-dark" />}
                </div>
                <div className="text-[10px] text-pastel-coral-800 font-medium mt-1">
                  40 - 60 cm • Nguy cơ chết máy
                </div>
              </button>

              {/* Deep */}
              <button
                type="button"
                onClick={() => setDepthLevel('deep')}
                className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer min-h-[72px] flex flex-col justify-between ${
                  depthLevel === 'deep'
                    ? 'border-rose-400 bg-rose-50/90 font-bold ring-2 ring-rose-400/40 shadow-glass-xs'
                    : 'border-gray-200/90 hover:border-rose-200 bg-white/80 hover:bg-rose-50/30'
                }`}
              >
                <div className="font-bold text-rose-950 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-xs" />
                    <span>Ngập sâu</span>
                  </div>
                  {depthLevel === 'deep' && <Check className="w-3.5 h-3.5 text-rose-800" />}
                </div>
                <div className="text-[10px] text-rose-800 font-medium mt-1">
                  &gt; 60 cm • Tuyệt đối không vào
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5">
              Mô tả chi tiết (tùy chọn)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Nước chảy xiết trước số nhà 15, nhiều xe máy chết máy..."
              className="w-full text-xs p-3.5 border border-gray-200/90 rounded-2xl outline-none focus:border-pastel-sky-500 focus:ring-2 focus:ring-pastel-sky-400/30 font-medium text-gray-800 transition resize-none bg-gray-50/50 focus:bg-white shadow-xs"
              rows={3}
            />
          </div>

          {/* 4. Action Footer (Rule #39: Hủy on left, Xác nhận on right) */}
          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 min-h-[44px] bg-white border border-gray-200/90 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl transition active:scale-95 cursor-pointer shadow-glass-xs"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || alreadyReported}
              className={`flex-[2] py-3 min-h-[44px] font-bold text-xs rounded-xl shadow-glass-sm hover:shadow-glass-md transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer ${
                alreadyReported
                  ? 'bg-pastel-mint-dark/80 text-white cursor-not-allowed opacity-80'
                  : 'bg-pastel-sky-600 hover:bg-pastel-sky-700 active:bg-pastel-sky-800 text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Đang gửi báo cáo...</span>
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
