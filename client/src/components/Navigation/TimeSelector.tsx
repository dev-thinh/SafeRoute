import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  Sparkles,
  Check,
} from 'lucide-react';

interface TimeSelectorProps {
  selectedTime: string;
  onChange: (isoString: string) => void;
  disabled?: boolean;
}

const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const formatDayLabel = (d: Date): string => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');

  if (isSameDay(d, now)) {
    return `Hôm nay, ${dd}/${mm}`;
  }
  if (isSameDay(d, tomorrow)) {
    return `Ngày mai, ${dd}/${mm}`;
  }

  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return `${days[d.getDay()]}, ${dd}/${mm}`;
};

export const TimeSelector: React.FC<TimeSelectorProps> = ({
  selectedTime,
  onChange,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentDate = selectedTime ? new Date(selectedTime) : new Date();

  // Calendar month state
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth()); // 0-indexed

  // Synchronize view month when popover opens
  useEffect(() => {
    if (isOpen) {
      setViewYear(currentDate.getFullYear());
      setViewMonth(currentDate.getMonth());
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Handlers for quick presets
  const handleSetNow = () => {
    onChange(new Date().toISOString());
  };

  const handleAddHour = (hoursToAdd = 1) => {
    const base = selectedTime ? new Date(selectedTime) : new Date();
    const next = new Date(base.getTime() + hoursToAdd * 60 * 60 * 1000);
    onChange(next.toISOString());
  };

  const handleSetRushHour = () => {
    const base = selectedTime ? new Date(selectedTime) : new Date();
    const next = new Date(base.getTime());
    next.setHours(17, 30, 0, 0);
    onChange(next.toISOString());
  };

  const handleSetHighTide = () => {
    const base = selectedTime ? new Date(selectedTime) : new Date();
    const next = new Date(base.getTime());
    next.setHours(19, 30, 0, 0);
    onChange(next.toISOString());
  };

  // Select a specific day
  const handleSelectDay = (day: number) => {
    const next = new Date(currentDate.getTime());
    next.setFullYear(viewYear);
    next.setMonth(viewMonth);
    next.setDate(day);
    onChange(next.toISOString());
  };

  // Set hours and minutes
  const handleTimeChange = (hour: number, minute: number) => {
    const next = new Date(currentDate.getTime());
    next.setHours(hour, minute, 0, 0);
    onChange(next.toISOString());
  };

  // Quick preset days
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(now);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  // Calendar month days calculation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const hoursString = currentDate.getHours().toString().padStart(2, '0');
  const minutesString = currentDate.getMinutes().toString().padStart(2, '0');

  return (
    <div className="space-y-2 select-none relative font-sans" ref={dropdownRef}>
      {/* 1. Header Label */}
      <div className="flex items-center justify-between px-0.5">
        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Thời gian khởi hành & Dự báo ngập</span>
        </label>
        <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
          Mô phỏng ngập
        </span>
      </div>

      {/* 2. Interactive Trigger Button / Display Card */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={`w-full p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between text-left shadow-sm ${
          isOpen
            ? 'bg-white border-blue-600 ring-4 ring-blue-100 shadow-md'
            : 'bg-white hover:bg-slate-50/80 border-slate-300 hover:border-blue-400 hover:shadow-md'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center flex-shrink-0 shadow-xs">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900">
                {formatDayLabel(currentDate)}
              </span>
              <span className="text-xs sm:text-sm font-black text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 shadow-xs">
                {hoursString}:{minutesString}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Chạm để đổi ngày giờ hoặc chọn giờ cao điểm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </div>
      </button>

      {/* 3. Quick preset pills below the trigger */}
      <div className="grid grid-cols-4 gap-1.5 text-xs">
        <button
          type="button"
          disabled={disabled}
          onClick={handleSetNow}
          className="py-2 px-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 active:scale-95 font-bold text-slate-700 shadow-xs transition-all text-center min-h-[38px] cursor-pointer disabled:opacity-50"
          title="Đặt về thời gian hiện tại"
        >
          Hiện tại
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleAddHour(1)}
          className="py-2 px-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 active:scale-95 font-bold text-slate-700 shadow-xs transition-all text-center min-h-[38px] cursor-pointer disabled:opacity-50"
          title="Tăng thêm 1 tiếng"
        >
          +1 tiếng
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={handleSetRushHour}
          className="py-2 px-1.5 bg-pastel-sky-50 border border-sky-200 text-blue-900 rounded-xl hover:bg-pastel-sky-100 active:scale-95 font-bold shadow-xs transition-all text-center min-h-[38px] cursor-pointer disabled:opacity-50"
          title="Giờ tan tầm 17:30"
        >
          17:30
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={handleSetHighTide}
          className="py-2 px-1.5 bg-pastel-lavender-50 border border-purple-200 text-purple-900 rounded-xl hover:bg-pastel-lavender-100 active:scale-95 font-bold shadow-xs transition-all text-center min-h-[38px] cursor-pointer disabled:opacity-50"
          title="Đỉnh triều cường 19:30"
        >
          19:30
        </button>
      </div>

      {/* 4. Elegant Interactive Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white/98 backdrop-blur-2xl rounded-3xl border border-sky-200 shadow-2xl p-4 sm:p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  Tùy chỉnh thời gian khởi hành
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  Mô phỏng bản đồ ngập lụt tại thời điểm chọn
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              title="Đóng (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Date Pills: Hôm nay, Ngày mai, Ngày kia */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'Hôm nay', date: now },
              { label: 'Ngày mai', date: tomorrow },
              { label: 'Ngày kia', date: dayAfterTomorrow },
            ].map((item, idx) => {
              const isSelected = isSameDay(currentDate, item.date);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const next = new Date(currentDate.getTime());
                    next.setFullYear(item.date.getFullYear(), item.date.getMonth(), item.date.getDate());
                    onChange(next.toISOString());
                  }}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border transition active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Mini Calendar View */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-3 space-y-2.5">
            {/* Month & Year Navigation */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 px-1">
              <span>
                Tháng {viewMonth + 1} / {viewYear}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition active:scale-90 cursor-pointer shadow-xs"
                  title="Tháng trước"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition active:scale-90 cursor-pointer shadow-xs"
                  title="Tháng sau"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                <div key={d} className="py-0.5">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 text-xs">
              {/* Empty padding cells for start of month */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="w-7 h-7" />
              ))}

              {/* Day numbers */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const thisDate = new Date(viewYear, viewMonth, day);
                const isSelected = isSameDay(currentDate, thisDate);
                const isToday = isSameDay(now, thisDate);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`w-7 h-7 mx-auto rounded-xl text-xs font-bold font-mono transition-all active:scale-90 flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isToday
                        ? 'bg-blue-100 text-blue-800 border border-blue-300 font-black'
                        : 'text-slate-700 hover:bg-white hover:shadow-xs'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Picker Section */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Giờ khởi hành (24h)</span>
              </span>
              <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                {hoursString}:{minutesString}
              </span>
            </div>

            {/* Hour & Minute Selection Controls */}
            <div className="grid grid-cols-2 gap-2">
              {/* Hours Select */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Giờ (00 - 23)
                </span>
                <select
                  value={currentDate.getHours()}
                  onChange={(e) =>
                    handleTimeChange(parseInt(e.target.value, 10), currentDate.getMinutes())
                  }
                  className="w-full text-xs font-bold font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                >
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <option key={h} value={h}>
                      {h.toString().padStart(2, '0')} giờ
                    </option>
                  ))}
                </select>
              </div>

              {/* Minutes Select */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Phút (00 - 55)
                </span>
                <select
                  value={Math.floor(currentDate.getMinutes() / 5) * 5}
                  onChange={(e) =>
                    handleTimeChange(currentDate.getHours(), parseInt(e.target.value, 10))
                  }
                  className="w-full text-xs font-bold font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                    <option key={m} value={m}>
                      {m.toString().padStart(2, '0')} phút
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Time Milestones */}
            <div className="grid grid-cols-4 gap-1 pt-1">
              {[
                { label: '07:30', h: 7, m: 30, desc: 'Sáng' },
                { label: '12:00', h: 12, m: 0, desc: 'Trưa' },
                { label: '17:30', h: 17, m: 30, desc: 'Tan tầm' },
                { label: '19:30', h: 19, m: 30, desc: 'Đỉnh triều' },
              ].map((milestone, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleTimeChange(milestone.h, milestone.m)}
                  className="p-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 text-center transition active:scale-95 cursor-pointer text-[11px] font-bold"
                  title={`${milestone.label} (${milestone.desc})`}
                >
                  <span className="font-mono block">{milestone.label}</span>
                  <span className="text-[9px] text-slate-500 font-normal">{milestone.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleSetNow}
              className="py-2 px-3 text-xs font-bold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Về hiện tại</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="py-2 px-5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition shadow-md hover:shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Xác nhận</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSelector;
