import React from 'react';
import { Bike, Car } from 'lucide-react';

interface VehicleSelectorProps {
  vehicle: 'motorbike' | 'car';
  onChange: (v: 'motorbike' | 'car') => void;
  disabled?: boolean;
}

export const VehicleSelector: React.FC<VehicleSelectorProps> = ({ vehicle, onChange, disabled }) => {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
        Phương tiện di chuyển
      </label>
      <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/70">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('motorbike')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${
            vehicle === 'motorbike'
              ? 'bg-white text-blue-700 shadow-sm shadow-blue-500/10 ring-1 ring-black/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
          aria-pressed={vehicle === 'motorbike'}
        >
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
            vehicle === 'motorbike' ? 'bg-pastel-sky-100 text-blue-600' : 'bg-slate-200/60 text-slate-500'
          }`}>
            <Bike className="w-4 h-4" />
          </div>
          <span>Xe máy</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('car')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${
            vehicle === 'car'
              ? 'bg-white text-blue-700 shadow-sm shadow-blue-500/10 ring-1 ring-black/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
          aria-pressed={vehicle === 'car'}
        >
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
            vehicle === 'car' ? 'bg-pastel-sky-100 text-blue-600' : 'bg-slate-200/60 text-slate-500'
          }`}>
            <Car className="w-4 h-4" />
          </div>
          <span>Ô tô</span>
        </button>
      </div>
    </div>
  );
};

export default VehicleSelector;
