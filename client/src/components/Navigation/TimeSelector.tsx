import React, { useMemo } from 'react';
import { Clock, Calendar, ChevronDown } from 'lucide-react';

interface TimeSelectorProps {
  selectedTime: string;
  onChange: (isoString: string) => void;
  disabled?: boolean;
}

// Format local date key "YYYY-MM-DD"
const toLocalDateKey = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Format local time key "HH:mm"
const toLocalTimeKey = (d: Date): string => {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

const TIME_PRESETS = [
  { value: '06:00', label: '06:00 - Sáng sớm' },
  { value: '06:30', label: '06:30' },
  { value: '07:00', label: '07:00 - Bắt đầu đi làm' },
  { value: '07:30', label: '07:30 - Cao điểm sáng' },
  { value: '08:00', label: '08:00 - Giờ làm việc' },
  { value: '08:30', label: '08:30' },
  { value: '09:00', label: '09:00' },
  { value: '10:00', label: '10:00' },
  { value: '11:00', label: '11:00' },
  { value: '12:00', label: '12:00 - Buổi trưa' },
  { value: '13:00', label: '13:00' },
  { value: '14:00', label: '14:00' },
  { value: '15:00', label: '15:00' },
  { value: '16:00', label: '16:00' },
  { value: '16:30', label: '16:30' },
  { value: '17:00', label: '17:00 - Tan tầm bắt đầu' },
  { value: '17:30', label: '17:30 - Đỉnh tan tầm' },
  { value: '18:00', label: '18:00 - Tan tầm tối' },
  { value: '18:30', label: '18:30' },
  { value: '19:00', label: '19:00' },
  { value: '19:30', label: '19:30 - Đỉnh triều cường' },
  { value: '20:00', label: '20:00 - Buổi tối' },
  { value: '20:30', label: '20:30' },
  { value: '21:00', label: '21:00' },
  { value: '22:00', label: '22:00' },
  { value: '23:00', label: '23:00 - Khuya' },
];

export const TimeSelector: React.FC<TimeSelectorProps> = ({
  selectedTime,
  onChange,
  disabled,
}) => {
  const currentDate = useMemo(() => {
    return selectedTime ? new Date(selectedTime) : new Date();
  }, [selectedTime]);

  const currentDateKey = toLocalDateKey(currentDate);
  const currentTimeKey = toLocalTimeKey(currentDate);

  // Generate 14 upcoming days safely in local time
  const dateOptions = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    const now = new Date();
    const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    for (let i = 0; i < 14; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const key = toLocalDateKey(d);
      const dd = d.getDate().toString().padStart(2, '0');
      const mm = (d.getMonth() + 1).toString().padStart(2, '0');

      let label = '';
      if (i === 0) {
        label = `Hôm nay (${dd}/${mm})`;
      } else if (i === 1) {
        label = `Ngày mai (${dd}/${mm})`;
      } else if (i === 2) {
        label = `Ngày kia (${dd}/${mm})`;
      } else {
        label = `${daysOfWeek[d.getDay()]}, ${dd}/${mm}`;
      }

      list.push({ key, label });
    }
    return list;
  }, []);

  // Handle date change from dropdown
  const handleDateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDateKey = e.target.value;
    const [yStr, mStr, dStr] = newDateKey.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10) - 1;
    const day = parseInt(dStr, 10);

    // Keep current selected hours and minutes
    const nextDate = new Date(year, month, day, currentDate.getHours(), currentDate.getMinutes(), 0);
    onChange(nextDate.toISOString());
  };

  // Handle time change from dropdown
  const handleTimeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimeVal = e.target.value;
    const [hStr, mStr] = newTimeVal.split(':');
    const hours = parseInt(hStr, 10);
    const minutes = parseInt(mStr, 10);

    const nextDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      hours,
      minutes,
      0
    );
    onChange(nextDate.toISOString());
  };

  // Quick preset shortcuts
  const handleSetNow = () => {
    onChange(new Date().toISOString());
  };

  const handleAddHour = () => {
    const next = new Date(currentDate.getTime() + 60 * 60 * 1000);
    onChange(next.toISOString());
  };

  const handleSetRushHour = () => {
    const next = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      17,
      30,
      0
    );
    onChange(next.toISOString());
  };

  const handleSetHighTide = () => {
    const next = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      19,
      30,
      0
    );
    onChange(next.toISOString());
  };

  // Handle minute-exact manual time change
  const handleExactTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [hStr, mStr] = val.split(':');
    const hours = parseInt(hStr, 10);
    const minutes = parseInt(mStr, 10);

    const nextDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      hours,
      minutes,
      0
    );
    onChange(nextDate.toISOString());
  };

  const isPresetMatch = TIME_PRESETS.some((p) => p.value === currentTimeKey);

  return (
    <div className="space-y-2 select-none font-sans">
      {/* 1. Header Label */}
      <div className="flex items-center justify-between px-0.5">
        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Thời gian khởi hành</span>
        </label>
        <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
          Mô phỏng ngập
        </span>
      </div>

      {/* 2. Dual External Dropdowns: Chọn ngày & Chọn giờ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Dropdown 1: Chọn ngày */}
        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-300 hover:border-blue-500 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 shadow-xs transition-all">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0 pointer-events-none" />
            <select
              disabled={disabled}
              value={currentDateKey}
              onChange={handleDateSelect}
              className="w-full text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer appearance-none pr-5 disabled:opacity-50"
              title="Chọn ngày khởi hành"
              aria-label="Chọn ngày khởi hành"
            >
              {dateOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
          </div>
        </div>

        {/* Dropdown 2: Chọn giờ */}
        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-300 hover:border-blue-500 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 shadow-xs transition-all">
            <Clock className="w-4 h-4 text-blue-600 shrink-0 pointer-events-none" />
            <select
              disabled={disabled}
              value={isPresetMatch ? currentTimeKey : 'custom'}
              onChange={handleTimeSelect}
              className="w-full text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer appearance-none pr-5 disabled:opacity-50 font-mono"
              title="Chọn giờ khởi hành"
              aria-label="Chọn giờ khởi hành"
            >
              {!isPresetMatch && (
                <option value="custom">
                  {currentTimeKey} (Tùy chỉnh)
                </option>
              )}
              {TIME_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. Quick Action Pills & Precise Minute Input */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="grid grid-cols-4 gap-1.5 text-xs flex-1">
          <button
            type="button"
            disabled={disabled}
            onClick={handleSetNow}
            className="py-1.5 px-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 active:scale-95 font-bold text-slate-700 shadow-xs transition-all text-center min-h-[32px] cursor-pointer disabled:opacity-50 text-[11px]"
            title="Đặt lại về thời gian hiện tại"
          >
            Hiện tại
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleAddHour}
            className="py-1.5 px-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 active:scale-95 font-bold text-slate-700 shadow-xs transition-all text-center min-h-[32px] cursor-pointer disabled:opacity-50 text-[11px]"
            title="Tăng thêm 1 tiếng"
          >
            +1 tiếng
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleSetRushHour}
            className="py-1.5 px-2 bg-pastel-sky-50 border border-sky-200 text-blue-900 rounded-lg hover:bg-pastel-sky-100 active:scale-95 font-bold shadow-xs transition-all text-center min-h-[32px] cursor-pointer disabled:opacity-50 text-[11px]"
            title="Giờ tan tầm 17:30"
          >
            17:30
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleSetHighTide}
            className="py-1.5 px-2 bg-pastel-lavender-50 border border-purple-200 text-purple-900 rounded-lg hover:bg-pastel-lavender-100 active:scale-95 font-bold shadow-xs transition-all text-center min-h-[32px] cursor-pointer disabled:opacity-50 text-[11px]"
            title="Đỉnh triều cường 19:30"
          >
            19:30
          </button>
        </div>

        {/* Precise Minute Picker Button */}
        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-xs" title="Chỉnh giờ chính xác từng phút">
          <input
            type="time"
            disabled={disabled}
            value={currentTimeKey}
            onChange={handleExactTimeChange}
            className="text-[11px] font-mono font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            aria-label="Chọn giờ phút chính xác"
          />
        </div>
      </div>
    </div>
  );
};

export default TimeSelector;
