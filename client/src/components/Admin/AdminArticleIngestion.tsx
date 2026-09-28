import React, { useState } from 'react';
import { Newspaper, Sparkles, X } from 'lucide-react';
import { parseArticle } from '../../services/api';

export const AdminArticleIngestion: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [url, setUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleParse = async () => {
    setLoading(true);
    try {
      const data = await parseArticle({ url, raw_text: rawText });
      setResult(data.extracted);
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Newspaper className="w-6 h-6 text-purple-600" />
          <h3 className="font-bold text-lg text-gray-900">Quản trị: Phân tích bài báo bằng Gemini AI</h3>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Dán link bài báo thời sự hoặc đoạn văn bản dự báo ngập/triều cường để AI tự động trích xuất tọa độ điểm ngập vào bản đồ.
        </p>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-gray-700">URL bài viết:</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://vnexpress.net/trieu-cuong-ngap-duong-quan-7..."
              className="w-full p-2.5 mt-1 border rounded-xl outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700">Hoặc dán nội dung văn bản:</label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Chiều nay 17h triều cường dâng cao trên đường Trần Xuân Soạn gây ngập 40cm..."
              className="w-full p-2.5 mt-1 border rounded-xl outline-none focus:border-purple-500"
              rows={4}
            />
          </div>

          <button
            onClick={handleParse}
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Gemini AI đang phân tích...' : 'Trích Xuất Điểm Ngập'}
          </button>

          {result && (
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 mt-3 space-y-2">
              <h4 className="font-bold text-purple-900">{result.summary}</h4>
              <p className="text-gray-600">Nguyên nhân: {result.cause}</p>
              <div className="space-y-1">
                {result.locations?.map((loc: any, idx: number) => (
                  <div key={idx} className="p-2 bg-white rounded-lg border text-[11px]">
                    <span className="font-bold">{loc.street_name} ({loc.district})</span> — Ngập {loc.estimated_depth_cm}cm
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
