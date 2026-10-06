import React, { useState } from 'react';
import { X, Droplet, MapPin, Edit3, Loader2, Check, CheckCircle2 } from 'lucide-react';
import { submitReport } from '../../services/api';

export interface SelectedReportLocation {
  lat: number;
  lng: number;
  label: string;
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

  if (!isOpen || !location) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await submitReport({
        coordinate: { lat: location.lat, lng: location.lng },
        depth_level: depthLevel,
        description: description.trim() || undefined,
      });
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
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 border border-gray-100 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-1">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-gray-900 leading-tight">
            Đã tiếp nhận báo cáo của bạn!
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Cảm ơn tinh thần đóng góp của bạn. Báo cáo đã được chuyển đến ban điều phối để kiểm duyệt trước khi đưa lên bản đồ điều hướng.
          </p>
          <button
            type="button"
            onClick={handleFinish}
            className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 border border-gray-100 flex flex-col gap-4">
        {/* 1. Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 flex-shrink-0">
              <Droplet className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 leading-tight">
                Báo cáo điểm ngập tức thì
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Cập nhật ngay vào bản đồ cho toàn bộ cộng đồng
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition active:scale-95 cursor-pointer"
            aria-label="Đóng biểu mẫu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Marked Location Card */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg mt-0.5 flex-shrink-0 shadow-xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide block">
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
            className="flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-900 font-bold bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 shadow-xs hover:shadow transition flex-shrink-0 active:scale-95 cursor-pointer"
          >
            <Edit3 className="w-3 h-3" />
            <span>Đổi vị trí</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* 3. Form Content */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
              Mức độ ngập thực tế
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDepthLevel('ankle')}
                className={`p-3 rounded-xl border text-left transition-all active:scale-[0.98] cursor-pointer ${
                  depthLevel === 'ankle'
                    ? 'border-yellow-500 bg-yellow-50/90 font-bold ring-2 ring-yellow-400/40 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-yellow-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-xs" />
                  <span>Mắt cá chân</span>
                </div>
                <div className="text-[10px] text-yellow-800 font-medium mt-1">
                  &lt; 20 cm • Xe qua tốt
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDepthLevel('wheel')}
                className={`p-3 rounded-xl border text-left transition-all active:scale-[0.98] cursor-pointer ${
                  depthLevel === 'wheel'
                    ? 'border-amber-500 bg-amber-50/90 font-bold ring-2 ring-amber-400/40 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
                  <span>Nửa bánh xe</span>
                </div>
                <div className="text-[10px] text-amber-800 font-medium mt-1">
                  20 - 40 cm • Cần cẩn thận
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDepthLevel('knee')}
                className={`p-3 rounded-xl border text-left transition-all active:scale-[0.98] cursor-pointer ${
                  depthLevel === 'knee'
                    ? 'border-orange-500 bg-orange-50/90 font-bold ring-2 ring-orange-400/40 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-orange-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-xs" />
                  <span>Đầu gối / Ngập pô</span>
                </div>
                <div className="text-[10px] text-orange-800 font-medium mt-1">
                  40 - 60 cm • Nguy cơ chết máy
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDepthLevel('deep')}
                className={`p-3 rounded-xl border text-left transition-all active:scale-[0.98] cursor-pointer ${
                  depthLevel === 'deep'
                    ? 'border-red-500 bg-red-50/90 font-bold ring-2 ring-red-400/40 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-red-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-xs" />
                  <span>Ngập sâu</span>
                </div>
                <div className="text-[10px] text-red-800 font-medium mt-1">
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
              className="w-full text-xs p-3 border border-gray-200/90 rounded-xl outline-none focus:border-blue-500 font-medium text-gray-800 transition resize-none bg-gray-50/50 focus:bg-white"
              rows={3}
            />
          </div>

          {/* 4. Action Footer */}
          <div className="flex items-center gap-2.5 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 min-h-[44px] bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl transition active:scale-95 cursor-pointer shadow-xs"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-3 min-h-[44px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Đang gửi báo cáo...</span>
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
