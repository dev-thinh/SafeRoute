import React from 'react';
import { Clock } from 'lucide-react';

interface TimeSelectorProps {
  selectedTime: string;
  onChange: (isoString: string) => void;
}

// Convert a Date object to "YYYY-MM-DDTHH:mm" in the user's LOCAL timezone
const toLocalInputString = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const TimeSelector: React.FC<TimeSelectorProps> = ({ selectedTime, onChange }) => {
  const dateObj = selectedTime ? new Date(selectedTime) : new Date();

  const setRelativeHours = (hours: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    onChange(d.toISOString());
  };

  const setRushHourToday = () => {
    const d = new Date();
    d.setHours(17, 30, 0, 0); // 17:30 PM (common rush hour & tide peak in HCMC)
    // If 17:30 today has already passed by more than 2 hours, jump to tomorrow 17:30
    if (Date.now() > d.getTime() + 2 * 3600000) {
      d.setDate(d.getDate() + 1);
    }
    onChange(d.toISOString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const localVal = e.target.value;
    if (localVal) {
      // Local input value "YYYY-MM-DDTHH:mm" parsed by new Date(localVal) uses local timezone
      const parsed = new Date(localVal);
      if (!isNaN(parsed.getTime())) {
        onChange(parsed.toISOString());
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-600" /> Giờ khởi hành dự kiến
        </label>
        <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
          Giờ địa phương
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => onChange(new Date().toISOString())}
          className="py-1.5 px-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-gray-700 shadow-sm transition text-center"
        >
          Bây giờ
        </button>
        <button
          type="button"
          onClick={() => setRelativeHours(1)}
          className="py-1.5 px-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-gray-700 shadow-sm transition text-center"
        >
          +1 tiếng
        </button>
        <button
          type="button"
          onClick={() => setRelativeHours(2)}
          className="py-1.5 px-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-gray-700 shadow-sm transition text-center"
        >
          +2 tiếng
        </button>
        <button
          type="button"
          onClick={setRushHourToday}
          className="py-1.5 px-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg hover:bg-indigo-100 font-semibold shadow-sm transition text-center"
          title="Chọn khung giờ tan tầm 17:30 (thời điểm triều cường và mưa dễ gây ngập úng)"
        >
          17:30
        </button>
      </div>

      <input
        type="datetime-local"
        value={toLocalInputString(dateObj)}
        onChange={handleInputChange}
        className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-500 font-medium text-gray-800 shadow-sm"
      />
    </div>
  );
};
