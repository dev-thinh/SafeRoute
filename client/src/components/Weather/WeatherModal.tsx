import React, { useEffect } from 'react';
import { X, CloudRain } from 'lucide-react';
import { WeatherTab } from './WeatherTab';

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation?: (lat: number, lng: number) => void;
}

export const WeatherModal: React.FC<WeatherModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[2050] flex items-center justify-center bg-gray-900/50 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl border border-sky-100/90 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-pastel-sky-50/50 via-white to-pastel-mint-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pastel-sky-100 text-pastel-sky-700 border border-sky-200 flex items-center justify-center flex-shrink-0 shadow-xs">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-900 leading-tight">
                Khí Tượng & Triều Cường TP.HCM
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Mạng lưới trạm đo thời gian thực & dự báo diễn biến ngập lụt
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            aria-label="Đóng cửa sổ"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/40">
          <WeatherTab
            onSelectLocation={(lat, lng) => {
              if (onSelectLocation) onSelectLocation(lat, lng);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default WeatherModal;
