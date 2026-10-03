import React, { useState } from 'react';
import { X, Droplets, MapPin, Edit3 } from 'lucide-react';
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

  if (!isOpen || !location) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await submitReport({
        coordinate: { lat: location.lat, lng: location.lng },
        depth_level: depthLevel,
        description: description.trim() || undefined,
      });
      onReportSubmitted();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit report', err);
      setErrorMsg(err?.response?.data?.error || err.message || 'Không thể gửi báo cáo. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-gray-900 leading-tight">Báo cáo điểm ngập tức thì</h3>
            <p className="text-xs text-gray-500">Dữ liệu được cập nhật ngay vào bản đồ cho cộng đồng</p>
          </div>
        </div>

        {/* 1. Marked Location Section */}
        <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3.5 mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg mt-0.5 flex-shrink-0 shadow-sm">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                Vị trí bạn đã đánh dấu
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
            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-bold bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 shadow-sm hover:shadow transition flex-shrink-0"
          >
            <Edit3 className="w-3 h-3" />
            <span>Đổi vị trí</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 mb-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* 2. Form content */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              Mức độ ngập hiện tại:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDepthLevel('ankle')}
                className={`p-3 rounded-xl border text-left transition ${
                  depthLevel === 'ankle'
                    ? 'border-yellow-500 bg-yellow-50 font-bold ring-2 ring-yellow-400/30'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-yellow-800">🟢 Mắt cá chân</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Dưới 20 cm • xe qua tốt</div>
              </button>
              <button
                type="button"
                onClick={() => setDepthLevel('wheel')}
                className={`p-3 rounded-xl border text-left transition ${
                  depthLevel === 'wheel'
                    ? 'border-amber-500 bg-amber-50 font-bold ring-2 ring-amber-400/30'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-amber-800">🟡 Nửa bánh xe</div>
                <div className="text-[10px] text-gray-500 mt-0.5">20 - 40 cm • cẩn thận</div>
              </button>
              <button
                type="button"
                onClick={() => setDepthLevel('knee')}
                className={`p-3 rounded-xl border text-left transition ${
                  depthLevel === 'knee'
                    ? 'border-orange-500 bg-orange-50 font-bold ring-2 ring-orange-400/30'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-orange-800">🟠 Đầu gối / ngập pô</div>
                <div className="text-[10px] text-gray-500 mt-0.5">40 - 60 cm • nguy hiểm</div>
              </button>
              <button
                type="button"
                onClick={() => setDepthLevel('deep')}
                className={`p-3 rounded-xl border text-left transition ${
                  depthLevel === 'deep'
                    ? 'border-red-500 bg-red-50 font-bold ring-2 ring-red-400/30'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-red-800">🔴 Ngập sâu</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Trên 60 cm • không thể qua</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Mô tả thêm tình trạng (tùy chọn):
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Nước chảy xiết, nhiều xe bị chết máy trước số nhà 15..."
              className="w-full text-xs p-3 border rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Đang gửi báo cáo...' : 'Gửi báo cáo ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
