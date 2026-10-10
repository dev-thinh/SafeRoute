import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, ChevronDown, Check, RotateCcw, X } from 'lucide-react';

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

// 24 hours grid representation
const HOURS_GRID = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_PRESETS = [0, 15, 30, 45];

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

  // References to anchor portal popovers
  const dateOtherBtnRef = useRef<HTMLButtonElement>(null);
  const timeBtnRef = useRef<HTMLButtonElement>(null);

  // Custom dropdown open state: 'dateOther' | 'timePicker' | null
  const [openDropdown, setOpenDropdown] = useState<'dateOther' | 'timePicker' | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  }>({
    top: 0,
    left: 0,
    width: 280,
    maxHeight: 360,
  });

  // 24-hour precise time inputs state
  const [inputHours, setInputHours] = useState(() => currentDate.getHours().toString().padStart(2, '0'));
  const [inputMinutes, setInputMinutes] = useState(() => currentDate.getMinutes().toString().padStart(2, '0'));
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [isEditingMinutes, setIsEditingMinutes] = useState(false);

  // Sync inputs whenever selectedTime changes externally, but never while user is editing
  useEffect(() => {
    if (!isEditingHours) {
      setInputHours(currentDate.getHours().toString().padStart(2, '0'));
    }
    if (!isEditingMinutes) {
      setInputMinutes(currentDate.getMinutes().toString().padStart(2, '0'));
    }
  }, [currentDate, isEditingHours, isEditingMinutes]);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Compute smart popover position with screen-boundary clamping
  const computePopoverPosition = (type: 'dateOther' | 'timePicker') => {
    const btn = type === 'dateOther' ? dateOtherBtnRef.current : timeBtnRef.current;
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();

    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      return null;
    }

    const targetHeight = type === 'timePicker' ? 360 : 300;
    const popoverWidth = Math.max(rect.width, type === 'timePicker' ? 310 : 260);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - popoverWidth - 12);

    const margin = 12;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;

    const shouldOpenAbove = spaceBelow < targetHeight && spaceAbove > spaceBelow;

    if (shouldOpenAbove) {
      const availableHeight = Math.min(targetHeight, Math.max(160, spaceAbove));
      const top = Math.max(margin, rect.top - availableHeight - 6);
      return { top, left, width: popoverWidth, maxHeight: availableHeight };
    } else {
      const availableHeight = Math.min(targetHeight, Math.max(160, spaceBelow));
      const top = rect.bottom + 6;
      return { top, left, width: popoverWidth, maxHeight: availableHeight };
    }
  };

  useEffect(() => {
    if (!openDropdown) return;

    const handleScroll = (e: Event) => {
      if (popoverRef.current && (popoverRef.current === e.target || popoverRef.current.contains(e.target as Node))) {
        return;
      }
      const pos = computePopoverPosition(openDropdown);
      if (!pos) setOpenDropdown(null);
      else setPopoverCoords(pos);
    };

    const handleResize = () => {
      const pos = computePopoverPosition(openDropdown);
      if (!pos) setOpenDropdown(null);
      else setPopoverCoords(pos);
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

  const handleToggleDropdown = (type: 'dateOther' | 'timePicker') => {
    if (openDropdown === type) {
      setOpenDropdown(null);
      return;
    }
    const pos = computePopoverPosition(type);
    if (!pos) return;
    setPopoverCoords(pos);
    setOpenDropdown(type);
  };

  // Generate date tabs: 3 prominent primary days (Hôm nay, Ngày mai, Ngày kia) + later days
  const { primaryDateTabs, laterDateOptions } = useMemo(() => {
    const now = new Date();
    const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const tabs: { key: string; label: string; sublabel: string; fullLabel: string }[] = [];
    const later: { key: string; label: string; fullLabel: string }[] = [];

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

      if (i < 3) {
        tabs.push({
          key,
          label: relPrefix,
          sublabel: `${dd}/${mm}`,
          fullLabel,
        });
      } else {
        later.push({
          key,
          label: `${dayName}, ${dd}/${mm}`,
          fullLabel,
        });
      }
    }

    return { primaryDateTabs: tabs, laterDateOptions: later };
  }, []);

  // Determine if active date is one of the later dates (index >= 3)
  const activeLaterDate = useMemo(() => {
    return laterDateOptions.find((d) => d.key === currentDateKey) || null;
  }, [laterDateOptions, currentDateKey]);

  // Handle date selection: keep current hours & minutes intact
  const handleSelectDate = (newDateKey: string) => {
    const [yStr, mStr, dStr] = newDateKey.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10) - 1;
    const day = parseInt(dStr, 10);

    const nextDate = new Date(year, month, day, currentDate.getHours(), currentDate.getMinutes(), 0);
    onChange(nextDate.toISOString());
    setOpenDropdown(null);
  };

  // Adjust time by relative minutes (e.g. -30, +30, +60)
  const handleAdjustMinutes = (deltaMinutes: number) => {
    const nextDate = new Date(currentDate.getTime() + deltaMinutes * 60 * 1000);
    onChange(nextDate.toISOString());
  };

  // Direct set hour (keeps minutes)
  const handleSetHour = (hour: number) => {
    const nextDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      hour,
      currentDate.getMinutes(),
      0
    );
    onChange(nextDate.toISOString());
  };

  // Direct set minute (keeps hour)
  const handleSetMinute = (minute: number) => {
    const nextDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      currentDate.getHours(),
      minute,
      0
    );
    onChange(nextDate.toISOString());
  };

  // Reset to current real-time
  const handleSetNow = () => {
    onChange(new Date().toISOString());
  };

  // Manual input hours handler
  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    setInputHours(raw);
    if (raw.length === 2) {
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num >= 0 && num <= 23) {
        handleSetHour(num);
      }
    }
  };

  const handleHoursBlur = () => {
    setIsEditingHours(false);
    let num = parseInt(inputHours, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 23) num = 23;
    setInputHours(num.toString().padStart(2, '0'));
    handleSetHour(num);
  };

  // Manual input minutes handler
  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    setInputMinutes(raw);
    if (raw.length === 2) {
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num >= 0 && num <= 59) {
        handleSetMinute(num);
      }
    }
  };

  const handleMinutesBlur = () => {
    setIsEditingMinutes(false);
    let num = parseInt(inputMinutes, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 59) num = 59;
    setInputMinutes(num.toString().padStart(2, '0'));
    handleSetMinute(num);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50/70 rounded-2xl border border-blue-200/80 p-3 shadow-xs space-y-2.5 font-sans select-none">
      {/* 1. Header: Tiêu đề + Nút Đặt về thời gian hiện tại */}
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

      {/* 2. Chọn Ngày dạng Segmented Tabs 1-chạm (Hôm nay, Ngày mai, Ngày kia, Khác) */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-white/80 rounded-xl border border-slate-200/90 shadow-2xs">
        {primaryDateTabs.map((tab) => {
          const isSelected = tab.key === currentDateKey;
          return (
            <button
              key={tab.key}
              type="button"
              disabled={disabled}
              onClick={() => handleSelectDate(tab.key)}
              className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[40px] ${
                isSelected
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-semibold'
              } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
              title={tab.fullLabel}
            >
              <span className="text-xs leading-none">{tab.label}</span>
              <span className={`text-[10px] mt-0.5 leading-none ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                {tab.sublabel}
              </span>
            </button>
          );
        })}

        {/* Tab 4: Chọn ngày khác */}
        <div className="relative">
          <button
            ref={dateOtherBtnRef}
            type="button"
            disabled={disabled}
            onClick={() => handleToggleDropdown('dateOther')}
            className={`w-full h-full py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[40px] ${
              activeLaterDate || openDropdown === 'dateOther'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-semibold'
            } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
            title={activeLaterDate ? activeLaterDate.fullLabel : 'Chọn ngày khác trong 2 tuần'}
          >
            <div className="flex items-center gap-0.5 text-xs leading-none">
              <span>{activeLaterDate ? activeLaterDate.label.split(',')[0] : 'Khác'}</span>
              <ChevronDown className="w-3 h-3" />
            </div>
            <span
              className={`text-[10px] mt-0.5 leading-none truncate max-w-full ${
                activeLaterDate ? 'text-blue-100' : 'text-slate-400'
              }`}
            >
              {activeLaterDate ? activeLaterDate.label.split(',')[1]?.trim() : '2 tuần'}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Chọn Giờ: Nút Giờ trung tâm + Stepper điều chỉnh nhanh (+/-30p, +1h) */}
      <div className="flex items-center gap-1.5">
        {/* Nút lùi 30 phút */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleAdjustMinutes(-30)}
          className="px-2 py-2 rounded-xl bg-white hover:bg-blue-50 border border-slate-200/90 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50 shrink-0 min-h-[42px] flex items-center justify-center"
          title="Lùi lại 30 phút"
        >
          -30p
        </button>

        {/* Ô Giờ trung tâm: Bấm vào mở lưới chọn giờ thông minh */}
        <button
          ref={timeBtnRef}
          type="button"
          disabled={disabled}
          onClick={() => handleToggleDropdown('timePicker')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 transition-all cursor-pointer min-h-[42px] shadow-xs ${
            openDropdown === 'timePicker'
              ? 'bg-white border-blue-600 ring-3 ring-blue-500/15 shadow-sm'
              : 'bg-white hover:bg-blue-50/50 border-blue-200/90 hover:border-blue-400'
          } disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]`}
          title="Chạm để mở bộ chọn giờ nhanh"
        >
          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-base font-extrabold text-slate-900 tracking-tight">
            {currentTimeKey}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-blue-600 shrink-0 transition-transform duration-200 ${
              openDropdown === 'timePicker' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Nút tiến 30 phút */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleAdjustMinutes(30)}
          className="px-2 py-2 rounded-xl bg-white hover:bg-blue-50 border border-slate-200/90 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50 shrink-0 min-h-[42px] flex items-center justify-center"
          title="Tiến thêm 30 phút"
        >
          +30p
        </button>

        {/* Nút tiến 1 giờ */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleAdjustMinutes(60)}
          className="px-2 py-2 rounded-xl bg-white hover:bg-blue-50 border border-slate-200/90 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50 shrink-0 min-h-[42px] flex items-center justify-center"
          title="Tiến thêm 1 giờ"
        >
          +1h
        </button>
      </div>

      {/* 4. REACT PORTAL DROPDOWNS */}
      {openDropdown &&
        createPortal(
          <div className="fixed inset-0 z-[99999] pointer-events-auto" onClick={() => setOpenDropdown(null)}>
            <div
              ref={popoverRef}
              style={{
                position: 'fixed',
                top: popoverCoords.top,
                left: popoverCoords.left,
                width: popoverCoords.width,
                maxHeight: `${popoverCoords.maxHeight || 360}px`,
              }}
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border-2 border-slate-300 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Dropdown 1: Chọn ngày khác (từ ngày thứ 4 trở đi) */}
              {openDropdown === 'dateOther' && (
                <>
                  <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0 select-none">
                    <span>Chọn ngày khác</span>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                      title="Đóng"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="overflow-y-auto divide-y divide-slate-100 py-1 flex-1">
                    {laterDateOptions.map((opt) => {
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

              {/* Dropdown 2: Bộ chọn giờ thông minh (Lưới 24h + 4 mốc phút) */}
              {openDropdown === 'timePicker' && (
                <>
                  <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0 select-none">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Chọn giờ khởi hành</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                      title="Đóng"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-3 overflow-y-auto space-y-3 flex-1">
                    {/* Hàng gõ giờ chính xác thủ công */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-xs font-semibold text-slate-600">Nhập giờ cụ thể:</span>
                      <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-300 shadow-2xs focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          value={inputHours}
                          onFocus={(e) => {
                            setIsEditingHours(true);
                            e.target.select();
                          }}
                          onChange={handleHoursChange}
                          onBlur={handleHoursBlur}
                          className="w-6 text-center text-xs font-bold text-slate-900 bg-transparent outline-none cursor-text"
                          title="Giờ (00-23)"
                        />
                        <span className="text-xs font-bold text-slate-400">:</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          value={inputMinutes}
                          onFocus={(e) => {
                            setIsEditingMinutes(true);
                            e.target.select();
                          }}
                          onChange={handleMinutesChange}
                          onBlur={handleMinutesBlur}
                          className="w-6 text-center text-xs font-bold text-slate-900 bg-transparent outline-none cursor-text"
                          title="Phút (00-59)"
                        />
                      </div>
                    </div>

                    {/* Lưới 24 Giờ (4 hàng x 6 cột) */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Chọn giờ (00 - 23h)
                      </div>
                      <div className="grid grid-cols-6 gap-1">
                        {HOURS_GRID.map((h) => {
                          const isCurrentH = currentDate.getHours() === h;
                          const label = h.toString().padStart(2, '0');
                          return (
                            <button
                              key={h}
                              type="button"
                              onClick={() => handleSetHour(h)}
                              className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                                isCurrentH
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-700'
                              } active:scale-95`}
                            >
                              {label}h
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4 Mốc Phút chuẩn (:00, :15, :30, :45) */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Chọn phút
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {MINUTE_PRESETS.map((m) => {
                          const isCurrentM = currentDate.getMinutes() === m;
                          const label = `:${m.toString().padStart(2, '0')}`;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => handleSetMinute(m)}
                              className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                                isCurrentM
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-700'
                              } active:scale-95`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Nút Xong */}
                  <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      Xong
                    </button>
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
