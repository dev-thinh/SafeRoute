import React from 'react';
import { Bike, Car } from 'lucide-react';

interface VehicleSelectorProps {
  vehicle: 'motorbike' | 'car';
  onChange: (v: 'motorbike' | 'car') => void;
}

export const VehicleSelector: React.FC<VehicleSelectorProps> = ({ vehicle, onChange }) => {
  return (
    <div className="flex bg-gray-100 p-1 rounded-xl">
      <button
        type="button"
        onClick={() => onChange('motorbike')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
          vehicle === 'motorbike' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Bike className="w-4 h-4" />
        Xe máy (&le;20cm)
      </button>
      <button
        type="button"
        onClick={() => onChange('car')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
          vehicle === 'car' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Car className="w-4 h-4" />
        Ô tô (&le;35cm)
      </button>
    </div>
  );
};
