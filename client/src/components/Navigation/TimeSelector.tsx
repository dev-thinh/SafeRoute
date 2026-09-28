import React from 'react';
import { Clock } from 'lucide-react';

interface TimeSelectorProps {
  selectedTime: string;
  onChange: (isoString: string) => void;
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({ selectedTime, onChange }) => {
  const setRelativeHours = (hours: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    onChange(d.toISOString());
  };

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
        <Clock className="w-3.5 h-3.5 text-blue-600" /> Giờ khởi hành dự kiến
      </label>
      <div className="grid grid-cols-3 gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => onChange(new Date().toISOString())}
          className="py-1.5 px-2 bg-gray-50 border rounded-lg hover:bg-gray-100 font-medium text-gray-700"
        >
          Bây giờ
        </button>
        <button
          type="button"
          onClick={() => setRelativeHours(1)}
          className="py-1.5 px-2 bg-gray-50 border rounded-lg hover:bg-gray-100 font-medium text-gray-700"
        >
          +1 tiếng
        </button>
        <button
          type="button"
          onClick={() => setRelativeHours(3)}
          className="py-1.5 px-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg hover:bg-amber-100 font-semibold"
        >
          Đỉnh triều (+3h)
        </button>
      </div>
      <input
        type="datetime-local"
        value={selectedTime ? new Date(selectedTime).toISOString().slice(0, 16) : ''}
        onChange={(e) => onChange(new Date(e.target.value).toISOString())}
        className="w-full text-xs p-2 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500"
      />
    </div>
  );
};
