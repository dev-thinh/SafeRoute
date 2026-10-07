import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Clock, Calendar, ChevronDown, Check } from 'lucide-react';

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
  { value: '07:00', label: '07:00 - Đầu giờ sáng' },
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
  { value: '17:00', label: '17:00 - Bắt đầu tan tầm' },
  { value: '17:30', label: '17:30 - Đỉnh tan tầm' },
  { value: '18:00', label: '18:00 - Tan tầm tối' },
  { value: '18:30', label: '18:30' },
  { value: '19:00', label: '19:00' },
  { value: '19:30', label: '19:30 - Đỉnh triều cường' },
  { value: '20:00', label: '20:00 - Buổi tối' },
  { value: '20:30', label: '20:30' },
  { value: '21:00', label: '21:00' },
  { value: '22:00', label: '22:00' },
  { value: '23:00', label: '23:00 - Đêm khuya' },
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

  // Custom dropdown open state: 'date' | 'time' | null
  const [openDropdown, setOpenDropdown] = useState<'date' | 'time' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };

    if (openDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openDropdown]);

  // Generate 14 upcoming days without any parentheses
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
        label = `Hôm nay, ${dd}/${mm}`;
      } else if (i === 1) {
        label = `Ngày mai, ${dd}/${mm}`;
      } else if (i === 2) {
        label = `Ngày kia, ${dd}/${mm}`;
      } else {
        label = `${daysOfWeek[d.getDay()]}, ${dd}/${mm}`;
      }

      list.push({ key, label });
    }
    return list;
  }, []);

  // Find currently selected label
  const selectedDateLabel = useMemo(() => {
    const found = dateOptions.find((d) => d.key === currentDateKey);
    if (found) return found.label;
    const dd = currentDate.getDate().toString().padStart(2, '0');
    const mm = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    return `${dd}/${mm}/${currentDate.getFullYear()}`;
  }, [dateOptions, currentDateKey, currentDate]);

  const selectedTimeLabel = useMemo(() => {
    const preset = TIME_PRESETS.find((p) => p.value === currentTimeKey);
    return preset ? preset.label : currentTimeKey;
  }, [currentTimeKey]);

  // Handle date change
  const handleSelectDate = (newDateKey: string) => {
    const [yStr, mStr, dStr] = newDateKey.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10) - 1;
    const day = parseInt(dStr, 10);

    const nextDate = new Date(year, month, day, currentDate.getHours(), currentDate.getMinutes(), 0);
    onChange(nextDate.toISOString());
    setOpenDropdown(null);
  };

  // Handle time change
  const handleSelectTime = (newTimeVal: string) => {
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
    setOpenDropdown(null);
  };

  // Quick preset shortcuts (No parentheses)
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

  // Minute-precise manual time input
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

  return (
    <div className="space-y-2 select-none font-sans" ref={containerRef}>
      {/* 1. Header Label */}
      <div className="flex items-center justify-between px-0.5">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-blue-600" />
          <span>Thời gian khởi hành</span>
        </label>
        <span className="text-xs text-blue-700 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
          Mô phỏng ngập
        </span>
      </div>

      {/* 2. Custom Tailwind Dropdowns: Chọn ngày & Chọn giờ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 relative">
        {/* Dropdown 1: Chọn ngày */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white rounded-xl border transition-all cursor-pointer min-h-[42px] shadow-xs text-left ${
              openDropdown === 'date'
                ? 'border-blue-600 ring-2 ring-blue-100'
                : 'border-slate-300 hover:border-blue-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Chọn ngày khởi hành"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-sm font-semibold text-slate-900 truncate">
                {selectedDateLabel}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                openDropdown === 'date' ? 'rotate-180 text-blue-600' : ''
              }`}
            />
          </button>

          {/* Custom Date Options Menu */}
          {openDropdown === 'date' && (
            <div className="absolute top-full left-0 right-0 z-[1200] mt-1.5 bg-white/98 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-2xl py-1.5 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              {dateOptions.map((opt) => {
                const isSelected = opt.key === currentDateKey;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleSelectDate(opt.key)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-800 hover:bg-slate-50 hover:text-blue-600 font-medium'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dropdown 2: Chọn giờ */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpenDropdown(openDropdown === 'time' ? null : 'time')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white rounded-xl border transition-all cursor-pointer min-h-[42px] shadow-xs text-left ${
              openDropdown === 'time'
                ? 'border-blue-600 ring-2 ring-blue-100'
                : 'border-slate-300 hover:border-blue-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Chọn giờ khởi hành"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-sm font-semibold text-slate-900 truncate">
                {selectedTimeLabel}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                openDropdown === 'time' ? 'rotate-180 text-blue-600' : ''
              }`}
            />
          </button>

          {/* Custom Time Options Menu */}
          {openDropdown === 'time' && (
            <div className="absolute top-full left-0 right-0 z-[1200] mt-1.5 bg-white/98 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-2xl py-1.5 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              {TIME_PRESETS.map((p) => {
                const isSelected = p.value === currentTimeKey;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handleSelectTime(p.value)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-800 hover:bg-slate-50 hover:text-blue-600 font-medium'
                    }`}
                  >
                    <span>{p.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Quick Action Pills & Exact Minute Input (No parentheses) */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="grid grid-cols-4 gap-1.5 flex-1">
          <button
            type="button"
            disabled={disabled}
            onClick={handleSetNow}
            className="py-2 px-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 active:scale-95 font-semibold text-slate-700 shadow-xs transition-all text-center min-h-[36px] cursor-pointer disabled:opacity-50 text-xs"
            title="Đặt lại về thời gian hiện tại"
          >
            Hiện tại
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleAddHour}
            className="py-2 px-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 active:scale-95 font-semibold text-slate-700 shadow-xs transition-all text-center min-h-[36px] cursor-pointer disabled:opacity-50 text-xs"
            title="Tăng thêm 1 tiếng"
          >
            +1 tiếng
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleSetRushHour}
            className="py-2 px-2 bg-pastel-sky-50 border border-sky-200 text-blue-900 rounded-xl hover:bg-pastel-sky-100 active:scale-95 font-bold shadow-xs transition-all text-center min-h-[36px] cursor-pointer disabled:opacity-50 text-xs"
            title="Giờ tan tầm 17:30"
          >
            17:30 Tan tầm
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleSetHighTide}
            className="py-2 px-2 bg-pastel-lavender-50 border border-purple-200 text-purple-900 rounded-xl hover:bg-pastel-lavender-100 active:scale-95 font-bold shadow-xs transition-all text-center min-h-[36px] cursor-pointer disabled:opacity-50 text-xs"
            title="Đỉnh triều cường 19:30"
          >
            19:30 Triều đỉnh
          </button>
        </div>

        {/* Precise Minute Picker */}
        <div
          className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-xs min-h-[36px]"
          title="Chỉnh giờ chính xác từng phút"
        >
          <input
            type="time"
            disabled={disabled}
            value={currentTimeKey}
            onChange={handleExactTimeChange}
            className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            aria-label="Chọn giờ phút chính xác"
          />
        </div>
      </div>
    </div>
  );
};

export default TimeSelector;
