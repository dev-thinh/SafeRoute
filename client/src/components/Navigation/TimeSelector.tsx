import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Clock, Calendar, ChevronDown, Check, RotateCcw } from 'lucide-react';

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

  // Quick reset to current time
  const handleSetNow = () => {
    onChange(new Date().toISOString());
  };

  // 24-hour precise time inputs state (hours: 00-23, minutes: 00-59)
  const [inputHours, setInputHours] = useState(() => currentDate.getHours().toString().padStart(2, '0'));
  const [inputMinutes, setInputMinutes] = useState(() => currentDate.getMinutes().toString().padStart(2, '0'));

  // Sync inputs whenever selectedTime or currentDate changes externally
  useEffect(() => {
    setInputHours(currentDate.getHours().toString().padStart(2, '0'));
    setInputMinutes(currentDate.getMinutes().toString().padStart(2, '0'));
  }, [currentDate]);

  // Handle 24-hour format manual input for hours (00-23)
  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    setInputHours(raw);
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 0 && num <= 23) {
      const nextDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        num,
        currentDate.getMinutes(),
        0
      );
      onChange(nextDate.toISOString());
    }
  };

  const handleHoursBlur = () => {
    let num = parseInt(inputHours, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 23) num = 23;
    const formatted = num.toString().padStart(2, '0');
    setInputHours(formatted);
    const nextDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      num,
      currentDate.getMinutes(),
      0
    );
    onChange(nextDate.toISOString());
  };

  // Handle 24-hour format manual input for minutes (00-59)
  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    setInputMinutes(raw);
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 0 && num <= 59) {
      const nextDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        currentDate.getHours(),
        num,
        0
      );
      onChange(nextDate.toISOString());
    }
  };

  const handleMinutesBlur = () => {
    let num = parseInt(inputMinutes, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 59) num = 59;
    const formatted = num.toString().padStart(2, '0');
    setInputMinutes(formatted);
    const nextDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      currentDate.getHours(),
      num,
      0
    );
    onChange(nextDate.toISOString());
  };

  const handleHoursKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextH = (currentDate.getHours() + 1) % 24;
      const nextDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        nextH,
        currentDate.getMinutes(),
        0
      );
      onChange(nextDate.toISOString());
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const prevH = (currentDate.getHours() - 1 + 24) % 24;
      const nextDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        prevH,
        currentDate.getMinutes(),
        0
      );
      onChange(nextDate.toISOString());
    }
  };

  const handleMinutesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextM = (currentDate.getMinutes() + 1) % 60;
      const nextDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        currentDate.getHours(),
        nextM,
        0
      );
      onChange(nextDate.toISOString());
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const prevM = (currentDate.getMinutes() - 1 + 60) % 60;
      const nextDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        currentDate.getHours(),
        prevM,
        0
      );
      onChange(nextDate.toISOString());
    }
  };

  return (
    <div className="space-y-2 select-none font-sans" ref={containerRef}>
      {/* 1. Header Label */}
      <div className="flex items-center justify-between px-0.5">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-blue-600" />
          <span>Thời gian khởi hành</span>
        </label>
        <span className="text-xs text-blue-700 font-bold bg-blue-100/70 px-2.5 py-0.5 rounded-full border border-blue-200">
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
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all cursor-pointer min-h-[46px] text-left shadow-xs ${
              openDropdown === 'date'
                ? 'bg-white border-blue-600 ring-4 ring-blue-500/15 shadow-md'
                : 'bg-blue-50/80 hover:bg-blue-100/80 border-blue-200/90 hover:border-blue-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Chọn ngày khởi hành"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-900 truncate">
                {selectedDateLabel}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-blue-600 shrink-0 transition-transform duration-200 ${
                openDropdown === 'date' ? 'rotate-180 text-blue-700' : ''
              }`}
            />
          </button>

          {/* Custom Date Options Menu - Solid White elevated surface, no sunken glass */}
          {openDropdown === 'date' && (
            <div className="absolute top-full left-0 right-0 z-[1200] mt-1.5 bg-white rounded-2xl border-2 border-slate-200 shadow-2xl py-1 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              {dateOptions.map((opt) => {
                const isSelected = opt.key === currentDateKey;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleSelectDate(opt.key)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-800 hover:bg-blue-50 hover:text-blue-700 font-medium'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
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
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all cursor-pointer min-h-[46px] text-left shadow-xs ${
              openDropdown === 'time'
                ? 'bg-white border-blue-600 ring-4 ring-blue-500/15 shadow-md'
                : 'bg-blue-50/80 hover:bg-blue-100/80 border-blue-200/90 hover:border-blue-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Chọn giờ khởi hành"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-900 truncate">
                {selectedTimeLabel}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-blue-600 shrink-0 transition-transform duration-200 ${
                openDropdown === 'time' ? 'rotate-180 text-blue-700' : ''
              }`}
            />
          </button>

          {/* Custom Time Options Menu - Solid White elevated surface, no sunken glass */}
          {openDropdown === 'time' && (
            <div className="absolute top-full left-0 right-0 z-[1200] mt-1.5 bg-white rounded-2xl border-2 border-slate-200 shadow-2xl py-1 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              {TIME_PRESETS.map((p) => {
                const isSelected = p.value === currentTimeKey;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handleSelectTime(p.value)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-800 hover:bg-blue-50 hover:text-blue-700 font-medium'
                    }`}
                  >
                    <span>{p.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Sub actions: Đặt lại thời gian hiện tại & Nhập phút chính xác */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <button
          type="button"
          disabled={disabled}
          onClick={handleSetNow}
          className="flex items-center gap-1.5 py-2 px-3 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-400 rounded-xl font-semibold text-slate-700 hover:text-blue-700 shadow-xs transition-all text-xs cursor-pointer disabled:opacity-50 active:scale-95 min-h-[36px]"
          title="Đặt lại về thời gian hiện tại"
        >
          <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
          <span>Thời gian hiện tại</span>
        </button>

        {/* 24-hour Precise Time Picker - Guaranteed 24h format across all browsers */}
        <div
          className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-300 shadow-xs min-h-[36px] focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100"
          title="Chỉnh giờ chính xác theo thang 24h"
        >
          <span className="text-xs font-medium text-slate-500">Giờ:</span>
          <input
            type="text"
            inputMode="numeric"
            disabled={disabled}
            maxLength={2}
            value={inputHours}
            onChange={handleHoursChange}
            onBlur={handleHoursBlur}
            onKeyDown={handleHoursKeyDown}
            className="w-6 text-center text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200/80 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded py-0.5 outline-none transition cursor-text disabled:opacity-50"
            aria-label="Giờ 00 đến 23"
            title="Giờ (00-23)"
          />
          <span className="text-xs font-black text-slate-400 select-none">:</span>
          <input
            type="text"
            inputMode="numeric"
            disabled={disabled}
            maxLength={2}
            value={inputMinutes}
            onChange={handleMinutesChange}
            onBlur={handleMinutesBlur}
            onKeyDown={handleMinutesKeyDown}
            className="w-6 text-center text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200/80 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded py-0.5 outline-none transition cursor-text disabled:opacity-50"
            aria-label="Phút 00 đến 59"
            title="Phút (00-59)"
          />
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-200 select-none">
            24h
          </span>
        </div>
      </div>
    </div>
  );
};

export default TimeSelector;
