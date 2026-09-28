import React, { useState } from 'react';
import { X, Droplets } from 'lucide-react';
import { submitReport } from '../../services/api';

export const ReportFloodModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted: () => void;
}> = ({ isOpen, onClose, onReportSubmitted }) => {
  const [depthLevel, setDepthLevel] = useState<'ankle' | 'wheel' | 'knee' | 'deep'>('wheel');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Default to district 7 sample coordinate for quick report
      await submitReport({
        coordinate: { lat: 10.7485, lng: 106.7082 },
        depth_level: depthLevel,
        description,
      });
      onReportSubmitted();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Droplets className="w-6 h-6 text-blue-600" />
          <h3 className="font-bold text-lg text-gray-900">Báo cáo điểm ngập tức thì</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Mức độ ngập hiện tại:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDepthLevel('ankle')}
                className={`p-3 rounded-xl border text-left transition ${depthLevel === 'ankle' ? 'border-yellow-500 bg-yellow-50 font-bold' : 'border-gray-200'}`}
              >
                🟢 Mắt cá chân (&lt;20cm)
              </button>
              <button
                type="button"
                onClick={() => setDepthLevel('wheel')}
                className={`p-3 rounded-xl border text-left transition ${depthLevel === 'wheel' ? 'border-amber-500 bg-amber-50 font-bold' : 'border-gray-200'}`}
              >
                🟡 Nửa bánh xe (20-40cm)
              </button>
              <button
                type="button"
                onClick={() => setDepthLevel('knee')}
                className={`p-3 rounded-xl border text-left transition ${depthLevel === 'knee' ? 'border-orange-500 bg-orange-50 font-bold' : 'border-gray-200'}`}
              >
                🟠 Đầu gối / Lút bô (40-60cm)
              </button>
              <button
                type="button"
                onClick={() => setDepthLevel('deep')}
                className={`p-3 rounded-xl border text-left transition ${depthLevel === 'deep' ? 'border-red-500 bg-red-50 font-bold' : 'border-gray-200'}`}
              >
                🔴 Ngập sâu (&gt;60cm)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Mô tả thêm:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Nhiều xe máy bị chết máy, nước đang dâng nhanh..."
              className="w-full text-xs p-2.5 border rounded-xl outline-none focus:border-blue-500"
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 shadow-lg disabled:opacity-50"
          >
            {loading ? 'Đang gửi...' : 'Gửi báo cáo ngay'}
          </button>
        </form>
      </div>
    </div>
  );
};
