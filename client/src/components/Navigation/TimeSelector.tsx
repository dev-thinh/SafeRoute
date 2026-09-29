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

  // Reset to current time today
  const setNow = () => {
    onChange(new Date().toISOString());
  };

  // Add 1 hour relative to the ALREADY SELECTED date/time
  const addOneHour = () => {
    const base = selectedTime ? new Date(selectedTime) : new Date();
    const d = new Date(base.getTime());
    d.setHours(d.getHours() + 1);
    onChange(d.toISOString());
  };

  // Set to 17:30 of the ALREADY SELECTED date (preserving selected day, month, year)
  const setRushHourSelectedDate = () => {
    const base = selectedTime ? new Date(selectedTime) : new Date();
    const d = new Date(base.getTime());
    d.setHours(17, 30, 0, 0);
    onChange(d.toISOString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const localVal = e.target.value;
    if (localVal) {
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

      <div className="grid grid-cols-3 gap-1.5 text-xs">
        <button
          type="button"
          onClick={setNow}
          className="py-1.5 px-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-gray-700 shadow-sm transition text-center"
        >
          Bây giờ
        </button>
        <button
          type="button"
          onClick={addOneHour}
          className="py-1.5 px-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-gray-700 shadow-sm transition text-center"
          title="Tăng thêm 1 tiếng dựa trên ngày giờ đang chọn"
        >
          +1 tiếng
        </button>
        <button
          type="button"
          onClick={setRushHourSelectedDate}
          className="py-1.5 px-2 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg hover:bg-indigo-100 font-semibold shadow-sm transition text-center"
          title="Chuyển đến 17:30 của ngày đang được chọn"
        >
          17:30 (Tan tầm)
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
