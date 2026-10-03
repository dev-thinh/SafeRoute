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
      <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
        Phương tiện di chuyển
      </label>
      <div className="flex bg-gray-100/90 p-1 rounded-xl border border-gray-200/80">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('motorbike')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all min-h-[40px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            vehicle === 'motorbike'
              ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
          }`}
        >
          <Bike className="w-4 h-4 text-blue-600" />
          <span>Xe máy</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('car')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all min-h-[40px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            vehicle === 'car'
              ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
          }`}
        >
          <Car className="w-4 h-4 text-blue-600" />
          <span>Ô tô</span>
        </button>
      </div>
    </div>
  );
};

export default VehicleSelector;
