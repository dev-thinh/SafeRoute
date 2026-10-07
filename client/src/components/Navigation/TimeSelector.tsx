import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

const TIME_PRESETS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  const val = `${h}:${m}`;
  return { value: val, label: val };
});

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

  // References to anchor the portal popovers
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const timeBtnRef = useRef<HTMLButtonElement>(null);

  // Custom dropdown open state: 'date' | 'time' | null
  const [openDropdown, setOpenDropdown] = useState<'date' | 'time' | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 280,
  });

  // 24-hour precise time inputs state
  const [inputHours, setInputHours] = useState(() => currentDate.getHours().toString().padStart(2, '0'));
  const [inputMinutes, setInputMinutes] = useState(() => currentDate.getMinutes().toString().padStart(2, '0'));

  // Sync inputs whenever selectedTime changes externally
  useEffect(() => {
    setInputHours(currentDate.getHours().toString().padStart(2, '0'));
    setInputMinutes(currentDate.getMinutes().toString().padStart(2, '0'));
  }, [currentDate]);

  // Ref for the popover element to prevent self-scroll from closing it
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close or reposition dropdown on window resize, scroll, or Escape key
  useEffect(() => {
    if (!openDropdown) return;

    const handleScroll = (e: Event) => {
      // NEVER close or reposition if the user is scrolling INSIDE the popover list itself!
      if (
        popoverRef.current &&
        (popoverRef.current === e.target || popoverRef.current.contains(e.target as Node))
      ) {
        return;
      }

      const btn = openDropdown === 'date' ? dateBtnRef.current : timeBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();

      // If button scrolled completely offscreen, close dropdown
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpenDropdown(null);
        return;
      }

      // Smoothly track button position on outer container scroll
      const expectedHeight = 260;
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldOpenAbove = spaceBelow < expectedHeight && rect.top > expectedHeight;

      const top = shouldOpenAbove ? Math.max(10, rect.top - expectedHeight - 6) : rect.bottom + 6;
      const popoverWidth = Math.max(rect.width, 300);
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - popoverWidth - 12);

      setPopoverCoords({ top, left, width: popoverWidth });
    };

    const handleResize = () => {
      const btn = openDropdown === 'date' ? dateBtnRef.current : timeBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const expectedHeight = 260;
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldOpenAbove = spaceBelow < expectedHeight && rect.top > expectedHeight;

      const top = shouldOpenAbove ? Math.max(10, rect.top - expectedHeight - 6) : rect.bottom + 6;
      const popoverWidth = Math.max(rect.width, 300);
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - popoverWidth - 12);

      setPopoverCoords({ top, left, width: popoverWidth });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openDropdown]);

  // Open or close dropdown with exact viewport coordinates
  const handleToggleDropdown = (type: 'date' | 'time') => {
    if (openDropdown === type) {
      setOpenDropdown(null);
      return;
    }
    const btn = type === 'date' ? dateBtnRef.current : timeBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();

    const expectedHeight = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldOpenAbove = spaceBelow < expectedHeight && rect.top > expectedHeight;

    const top = shouldOpenAbove ? Math.max(10, rect.top - expectedHeight - 6) : rect.bottom + 6;
    const popoverWidth = Math.max(rect.width, 300);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - popoverWidth - 12);

    setPopoverCoords({ top, left, width: popoverWidth });
    setOpenDropdown(type);
  };

  // Generate 14 upcoming days (full tidal cycle & travel planning window)
  const dateOptions = useMemo(() => {
    const list: { key: string; label: string; fullLabel: string }[] = [];
    const now = new Date();
    const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    for (let i = 0; i < 14; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const key = toLocalDateKey(d);
      const dd = d.getDate().toString().padStart(2, '0');
      const mm = (d.getMonth() + 1).toString().padStart(2, '0');
      const yyyy = d.getFullYear();
      const dayName = daysOfWeek[d.getDay()];

      let relPrefix = '';
      if (i === 0) relPrefix = 'Hôm nay';
      else if (i === 1) relPrefix = 'Ngày mai';
      else if (i === 2) relPrefix = 'Ngày kia';

      const fullLabel = relPrefix
        ? `${relPrefix} • ${dayName}, ${dd}/${mm}/${yyyy}`
        : `${dayName}, ${dd}/${mm}/${yyyy}`;

      const label = relPrefix
        ? `${relPrefix} • ${dayName}, ${dd}/${mm}`
        : `${dayName}, ${dd}/${mm}`;

      list.push({ key, label, fullLabel });
    }
    return list;
  }, []);

  // Selected date label for the main button
  const selectedDateFullLabel = useMemo(() => {
    const found = dateOptions.find((d) => d.key === currentDateKey);
    if (found) return found.fullLabel;
    const dd = currentDate.getDate().toString().padStart(2, '0');
    const mm = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = currentDate.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }, [dateOptions, currentDateKey, currentDate]);

  const selectedTimeLabel = useMemo(() => {
    const preset = TIME_PRESETS.find((p) => p.value === currentTimeKey);
    return preset ? preset.label : currentTimeKey;
  }, [currentTimeKey]);

  // Handle date selection
  const handleSelectDate = (newDateKey: string) => {
    const [yStr, mStr, dStr] = newDateKey.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10) - 1;
    const day = parseInt(dStr, 10);

    const nextDate = new Date(year, month, day, currentDate.getHours(), currentDate.getMinutes(), 0);
    onChange(nextDate.toISOString());
    setOpenDropdown(null);
  };

  // Handle time selection
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

  // Quick reset to current real-time
  const handleSetNow = () => {
    onChange(new Date().toISOString());
  };

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
    <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50/70 rounded-2xl border border-blue-200/80 p-3 shadow-xs space-y-2.5 font-sans select-none">
      {/* 1. Header Bar: Tiêu đề + Nút Đặt lại về thời gian hiện tại */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-blue-600" />
          <span>Thời gian khởi hành</span>
        </label>

        <button
          type="button"
          disabled={disabled}
          onClick={handleSetNow}
          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 border border-blue-200 hover:border-blue-400 rounded-xl font-bold text-blue-700 shadow-xs transition-all text-xs cursor-pointer disabled:opacity-50 active:scale-95 min-h-[28px]"
          title="Đặt lại về thời gian hiện tại ngay bây giờ"
        >
          <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
          <span>Bây giờ</span>
        </button>
      </div>

      {/* 2. Hàng chọn ngày (Full width - Không bao giờ bị cắt chữ) */}
      <div className="relative">
        <button
          ref={dateBtnRef}
          type="button"
          disabled={disabled}
          onClick={() => handleToggleDropdown('date')}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl border-2 transition-all cursor-pointer min-h-[50px] text-left shadow-xs ${
            openDropdown === 'date'
              ? 'bg-white border-blue-600 ring-4 ring-blue-500/15 shadow-md'
              : 'bg-white hover:bg-blue-50/40 border-slate-200/90 hover:border-blue-400'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Chọn ngày khởi hành"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-900 truncate">
              {selectedDateFullLabel}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-blue-600 shrink-0 ml-2 transition-transform duration-200 ${
              openDropdown === 'date' ? 'rotate-180 text-blue-700' : ''
            }`}
          />
        </button>
      </div>

      {/* 3. Hàng chọn giờ: 1 ô duy nhất đồng bộ hoàn toàn với hàng chọn ngày */}
      <div className="relative">
        <button
          ref={timeBtnRef}
          type="button"
          disabled={disabled}
          onClick={() => handleToggleDropdown('time')}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl border-2 transition-all cursor-pointer min-h-[50px] text-left shadow-xs ${
            openDropdown === 'time'
              ? 'bg-white border-blue-600 ring-4 ring-blue-500/15 shadow-md'
              : 'bg-white hover:bg-blue-50/40 border-slate-200/90 hover:border-blue-400'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Chọn giờ khởi hành"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-900 truncate">
              {selectedTimeLabel}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-blue-600 shrink-0 ml-2 transition-transform duration-200 ${
              openDropdown === 'time' ? 'rotate-180 text-blue-700' : ''
            }`}
          />
        </button>
      </div>

      {/* 4. REACT PORTAL DROPDOWNS: Thả nổi ngoài DOM panel, KHÔNG làm cuộn panel, KHÔNG bị che khuất */}
      {openDropdown &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] pointer-events-auto"
            onClick={() => setOpenDropdown(null)}
          >
            <div
              ref={popoverRef}
              style={{
                position: 'fixed',
                top: popoverCoords.top,
                left: popoverCoords.left,
                width: popoverCoords.width,
                maxHeight: '280px',
              }}
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border-2 border-slate-300 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
            >
              {openDropdown === 'date' && (
                <>
                  <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0 select-none">
                    <span>Chọn ngày khởi hành</span>
                  </div>
                  <div className="overflow-y-auto max-h-[220px] divide-y divide-slate-100 py-1 flex-1">
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
                              : 'text-slate-800 hover:bg-blue-50 hover:text-blue-700 font-semibold'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {openDropdown === 'time' && (
                <>
                  <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0 select-none">
                    <span>Chọn giờ khởi hành</span>
                  </div>
                  {/* Ô chỉnh giờ phút chính xác nếu cần chỉnh từng phút */}
                  <div className="px-3.5 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
                    <span className="text-xs font-bold text-slate-600">Giờ chính xác:</span>
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-xs focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={inputHours}
                        onChange={handleHoursChange}
                        onBlur={handleHoursBlur}
                        onKeyDown={handleHoursKeyDown}
                        className="w-7 text-center text-sm font-bold text-slate-900 bg-slate-100 hover:bg-slate-200/70 focus:bg-white rounded py-0.5 outline-none transition"
                        title="Giờ (00-23)"
                        aria-label="Giờ"
                      />
                      <span className="text-sm font-bold text-slate-400 select-none">:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={inputMinutes}
                        onChange={handleMinutesChange}
                        onBlur={handleMinutesBlur}
                        onKeyDown={handleMinutesKeyDown}
                        className="w-7 text-center text-sm font-bold text-slate-900 bg-slate-100 hover:bg-slate-200/70 focus:bg-white rounded py-0.5 outline-none transition"
                        title="Phút (00-59)"
                        aria-label="Phút"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[190px] divide-y divide-slate-100 py-1 flex-1">
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
                              : 'text-slate-800 hover:bg-blue-50 hover:text-blue-700 font-semibold'
                          }`}
                        >
                          <span>{p.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default TimeSelector;
