import React from 'react';
import { Clock } from 'lucide-react';

interface TimeSelectorProps {
  selectedTime: string;
  onChange: (isoString: string) => void;
  disabled?: boolean;
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

export const TimeSelector: React.FC<TimeSelectorProps> = ({ selectedTime, onChange, disabled }) => {
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

  // Set to 17:30 of the ALREADY SELECTED date
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
        <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Thời gian khởi hành</span>
        </label>
        <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
          Giờ địa phương
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-xs">
        <button
          type="button"
          disabled={disabled}
          onClick={setNow}
          className="py-2 px-2 bg-white border border-gray-200/90 rounded-xl hover:bg-gray-50 active:scale-95 font-semibold text-gray-700 shadow-xs transition text-center min-h-[38px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Hiện tại
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={addOneHour}
          className="py-2 px-2 bg-white border border-gray-200/90 rounded-xl hover:bg-gray-50 active:scale-95 font-semibold text-gray-700 shadow-xs transition text-center min-h-[38px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Tăng thêm 1 tiếng"
        >
          +1 tiếng
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={setRushHourSelectedDate}
          className="py-2 px-2 bg-blue-50/70 border border-blue-200/80 text-blue-800 rounded-xl hover:bg-blue-100/70 active:scale-95 font-bold shadow-xs transition text-center min-h-[38px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="17:30 Tan tầm"
        >
          17:30 (Tan tầm)
        </button>
      </div>

      <input
        type="datetime-local"
        disabled={disabled}
        value={toLocalInputString(dateObj)}
        onChange={handleInputChange}
        className="w-full text-xs p-2.5 min-h-[42px] border border-gray-200/90 rounded-xl bg-white outline-none focus:border-blue-500 font-medium text-gray-800 shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
};

export default TimeSelector;
