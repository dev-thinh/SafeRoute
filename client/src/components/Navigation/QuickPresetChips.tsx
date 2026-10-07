import React from 'react';
import { MapPin, Sparkles } from 'lucide-react';
import { LocationItem } from './RoutePlannerPanel';

interface QuickPresetChipsProps {
  onSelectPreset: (preset: LocationItem, targetField: 'origin' | 'dest') => void;
  activeField: 'origin' | 'dest' | null;
  disabled?: boolean;
}

const HCMC_PRESETS: Array<{ label: string; shortName: string; lat: number; lng: number }> = [
  { label: 'Sân bay Tân Sơn Nhất, Q.Tân Bình', shortName: '✈️ Sân bay TSN', lat: 10.8184, lng: 106.6588 },
  { label: 'Chợ Bến Thành, Quận 1', shortName: '🏛️ Chợ Bến Thành', lat: 10.7725, lng: 106.6980 },
  { label: 'ĐH Khoa học Tự nhiên, 227 Nguyễn Văn Cừ, Q.5', shortName: '🎓 ĐH KHTN (Q.5)', lat: 10.7626, lng: 106.6823 },
  { label: 'Landmark 81, Vinhomes Central Park, Q.Bình Thạnh', shortName: '🏙️ Landmark 81', lat: 10.7950, lng: 106.7218 },
  { label: 'KTX Khu B ĐHQG, TP.Thủ Đức', shortName: '📚 KTX ĐHQG', lat: 10.8800, lng: 106.7820 },
  { label: 'Ngã tư Hàng Xanh, Q.Bình Thạnh', shortName: '🚦 Hàng Xanh', lat: 10.8016, lng: 106.7114 },
  { label: 'Hồ Bán Nguyệt, Phú Mỹ Hưng, Quận 7', shortName: '🌉 Cầu Ánh Sao (Q.7)', lat: 10.7200, lng: 106.7196 },
];

export const QuickPresetChips: React.FC<QuickPresetChipsProps> = ({
  onSelectPreset,
  activeField,
  disabled,
}) => {
  const target = activeField || 'dest';

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between px-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        <span className="flex items-center gap-1 text-slate-600">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Điểm phổ biến TP.HCM</span>
        </span>
        <span className="text-slate-400 font-normal">
          {target === 'origin' ? 'Điền điểm đi (A)' : 'Điền điểm đến (B)'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {HCMC_PRESETS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPreset({ label: preset.label, lat: preset.lat, lng: preset.lng }, target)}
            className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 flex items-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              target === 'origin'
                ? 'bg-pastel-mint-50/80 hover:bg-pastel-mint-100 text-pastel-mint-800 border-pastel-mint-200/80 hover:border-pastel-mint-300'
                : 'bg-pastel-coral-50/80 hover:bg-pastel-coral-100 text-pastel-coral-800 border-pastel-coral-200/80 hover:border-pastel-coral-300'
            }`}
            title={`Chọn ${preset.label} làm ${target === 'origin' ? 'Điểm xuất phát' : 'Điểm đến'}`}
          >
            <MapPin className={`w-3 h-3 flex-shrink-0 ${target === 'origin' ? 'text-pastel-mint-600' : 'text-pastel-coral-600'}`} />
            <span className="whitespace-nowrap">{preset.shortName}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickPresetChips;
