// Custom DatePicker — themed calendar dropdown
// v2.0.0 | 2026-02-13

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Parse YYYY-MM-DD to local Date
const parseDate = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Format Date to YYYY-MM-DD
const toISO = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Format for display: "Feb 13, 2026"
const formatDisplay = (str) => {
  if (!str) return '';
  const date = parseDate(str);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Check if two dates are the same calendar day
const isSameDay = (a, b) => a && b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// Check if date is between start and end (inclusive)
const isBetween = (date, start, end) => {
  if (!start || !end) return false;
  const t = date.getTime();
  const s = Math.min(start.getTime(), end.getTime());
  const e = Math.max(start.getTime(), end.getTime());
  return t >= s && t <= e;
};

// Get calendar grid for a month (6 weeks x 7 days)
const getCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const days = [];

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    days.push({ day: d, month: prevMonth, year: prevYear, outside: true });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, month, year, outside: false });
  }

  // Next month padding (fill to complete rows)
  const totalCells = days.length <= 35 ? 35 : 42;
  const remaining = totalCells - days.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    days.push({ day: d, month: nextMonth, year: nextYear, outside: true });
  }

  return days;
};

// ─── Month/Year Picker Sub-component ───────────────────────────────────────

function MonthYearPicker({ viewMonth, viewYear, onSelect, minYear, maxYear }) {
  const monthListRef = useRef(null);
  const yearListRef = useRef(null);

  // Build year range
  const years = useMemo(() => {
    const result = [];
    for (let y = minYear; y <= maxYear; y++) result.push(y);
    return result;
  }, [minYear, maxYear]);

  // Scroll selected into view on mount
  useEffect(() => {
    const scrollTo = (ref, selector) => {
      if (!ref.current) return;
      const el = ref.current.querySelector(selector);
      if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
    };
    scrollTo(monthListRef, '[data-selected="true"]');
    scrollTo(yearListRef, '[data-selected="true"]');
  }, []);

  return (
    <div className="flex gap-1 px-2 pb-2">
      {/* Month column */}
      <div
        ref={monthListRef}
        className="flex-1 h-[180px] overflow-y-auto rounded-lg"
        style={{ scrollbarWidth: 'thin' }}
      >
        {MONTHS_SHORT.map((m, i) => (
          <button
            key={i}
            type="button"
            data-selected={i === viewMonth}
            onClick={() => onSelect(i, viewYear)}
            className={`
              w-full px-3 py-1.5 text-sm text-left rounded-md transition-colors
              ${i === viewMonth
                ? 'bg-accent text-text-inverse font-semibold'
                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'}
            `}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Year column */}
      <div
        ref={yearListRef}
        className="flex-1 h-[180px] overflow-y-auto rounded-lg"
        style={{ scrollbarWidth: 'thin' }}
      >
        {years.map(y => (
          <button
            key={y}
            type="button"
            data-selected={y === viewYear}
            onClick={() => onSelect(viewMonth, y)}
            className={`
              w-full px-3 py-1.5 text-sm text-left rounded-md transition-colors
              ${y === viewYear
                ? 'bg-accent text-text-inverse font-semibold'
                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'}
            `}
          >
            {y}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main DatePicker ───────────────────────────────────────────────────────

export default function DatePicker({
  value,          // YYYY-MM-DD (single mode)
  onChange,        // (YYYY-MM-DD) => void
  min,            // YYYY-MM-DD
  max,            // YYYY-MM-DD
  // Range mode props
  rangeStart,     // YYYY-MM-DD
  rangeEnd,       // YYYY-MM-DD
  onRangeChange,  // ({ start, end }) => void
  isRange = false,
  placeholder = 'Select date',
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const ref = useRef(null);

  // Calendar navigation state
  const initial = parseDate(isRange ? rangeStart : value) || new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  // Range selection state
  const [rangeSelecting, setRangeSelecting] = useState(false);
  const [tempStart, setTempStart] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  const minDate = parseDate(min);
  const maxDate = parseDate(max);
  const minYear = minDate ? minDate.getFullYear() : 2000;
  const maxYear = maxDate ? maxDate.getFullYear() : 2030;

  // Sync view when value changes externally
  useEffect(() => {
    const d = parseDate(isRange ? rangeStart : value);
    if (d) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [isRange ? rangeStart : value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setShowMonthYearPicker(false);
        setRangeSelecting(false);
        setTempStart(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (showMonthYearPicker) {
          setShowMonthYearPicker(false);
        } else {
          setOpen(false);
          setRangeSelecting(false);
          setTempStart(null);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, showMonthYearPicker]);

  // Drop-up detection
  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setDropUp(spaceBelow < 380);
  }, [open]);

  // Reset month/year picker when calendar closes
  useEffect(() => {
    if (!open) setShowMonthYearPicker(false);
  }, [open]);

  const navigateMonth = useCallback((delta) => {
    setViewMonth(prev => {
      let newMonth = prev + delta;
      let newYear = viewYear;
      if (newMonth < 0) { newMonth = 11; newYear--; }
      if (newMonth > 11) { newMonth = 0; newYear++; }
      setViewYear(newYear);
      return newMonth;
    });
  }, [viewYear]);

  const isDisabled = (date) => {
    if (minDate && date < minDate && !isSameDay(date, minDate)) return true;
    if (maxDate && date > maxDate && !isSameDay(date, maxDate)) return true;
    return false;
  };

  const handleDayClick = (dayInfo) => {
    const date = new Date(dayInfo.year, dayInfo.month, dayInfo.day);
    if (isDisabled(date)) return;

    // If clicking an outside-month day, navigate to that month
    if (dayInfo.outside) {
      setViewMonth(dayInfo.month);
      setViewYear(dayInfo.year);
    }

    const iso = toISO(date);

    if (isRange) {
      if (!rangeSelecting) {
        setRangeSelecting(true);
        setTempStart(iso);
        setHoverDate(null);
      } else {
        const start = tempStart;
        const end = iso;
        setRangeSelecting(false);
        setTempStart(null);
        setHoverDate(null);
        setOpen(false);
        if (start <= end) {
          onRangeChange({ start, end });
        } else {
          onRangeChange({ start: end, end: start });
        }
      }
    } else {
      onChange(iso);
      setOpen(false);
    }
  };

  const goToToday = () => {
    const now = new Date();
    const iso = toISO(now);
    if (!isDisabled(now)) {
      if (isRange) {
        onRangeChange({ start: iso, end: iso });
        setRangeSelecting(false);
        setTempStart(null);
      } else {
        onChange(iso);
      }
    }
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setOpen(false);
  };

  const handleMonthYearSelect = (month, year) => {
    setViewMonth(month);
    setViewYear(year);
    setShowMonthYearPicker(false);
  };

  const days = getCalendarDays(viewYear, viewMonth);
  const today = new Date();

  // Day state for styling
  const getDayState = (dayInfo) => {
    const date = new Date(dayInfo.year, dayInfo.month, dayInfo.day);
    const disabled = isDisabled(date);

    if (isRange) {
      const start = rangeSelecting ? parseDate(tempStart) : parseDate(rangeStart);
      const end = rangeSelecting ? (hoverDate ? parseDate(hoverDate) : null) : parseDate(rangeEnd);

      const isStart = isSameDay(date, start);
      const isEnd = isSameDay(date, end);
      const inRange = isBetween(date, start, end);

      return { disabled, isStart, isEnd, inRange, isSelected: isStart || isEnd };
    }

    const selected = isSameDay(date, parseDate(value));
    return { disabled, isSelected: selected, isStart: false, isEnd: false, inRange: false };
  };

  // Trigger button display text
  const displayText = isRange
    ? (rangeStart && rangeEnd
      ? `${formatDisplay(rangeStart)} — ${formatDisplay(rangeEnd)}`
      : placeholder)
    : (value ? formatDisplay(value) : placeholder);

  return (
    <div className="relative" ref={ref}>
      {/* ─── Trigger Button ─── */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          flex items-center gap-2 px-3 py-2 bg-bg-input border border-border rounded-lg
          text-sm font-medium cursor-pointer theme-transition
          focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20
          hover:border-accent/50 transition-all
          ${open ? 'border-accent ring-2 ring-accent/20' : ''}
        `}
      >
        <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-text-primary">{displayText}</span>
        <svg className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ─── Calendar Dropdown ─── */}
      {open && (
        <div
          className={`
            absolute z-50 mt-1.5 w-[308px]
            bg-bg-card border border-border rounded-xl
            theme-transition animate-fade-in overflow-hidden
            ${dropUp ? 'bottom-full mb-1.5' : ''}
          `}
          style={{
            animationDuration: '0.15s',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          {/* ─── Header: Month/Year Nav ─── */}
          <div className="flex items-center justify-between px-2 pt-2.5 pb-1.5">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Clickable month/year — opens picker */}
            <button
              type="button"
              onClick={() => setShowMonthYearPicker(!showMonthYearPicker)}
              className={`
                flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold transition-colors
                ${showMonthYearPicker
                  ? 'bg-bg-elevated text-accent'
                  : 'text-text-primary hover:bg-bg-elevated'}
              `}
            >
              {MONTHS[viewMonth]} {viewYear}
              <svg className={`w-3 h-3 transition-transform ${showMonthYearPicker ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* ─── Month/Year Picker (toggle view) ─── */}
          {showMonthYearPicker && (
            <MonthYearPicker
              viewMonth={viewMonth}
              viewYear={viewYear}
              onSelect={handleMonthYearSelect}
              minYear={minYear}
              maxYear={maxYear}
            />
          )}

          {/* ─── Calendar Grid ─── */}
          {!showMonthYearPicker && (
            <>
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 px-2 pt-1 pb-0.5">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[11px] font-semibold text-text-muted py-1 uppercase tracking-wide">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-y-0.5 px-2 pb-2">
                {days.map((dayInfo, i) => {
                  const state = getDayState(dayInfo);
                  const date = new Date(dayInfo.year, dayInfo.month, dayInfo.day);
                  const isToday = isSameDay(date, today);

                  // Build classes
                  let cellClasses = 'relative flex items-center justify-center h-[34px] text-[13px] font-medium rounded-lg transition-colors ';

                  if (state.disabled) {
                    cellClasses += 'text-text-muted/20 cursor-not-allowed ';
                  } else if (dayInfo.outside) {
                    cellClasses += 'text-text-muted/30 cursor-pointer hover:text-text-muted/60 hover:bg-bg-elevated/50 ';
                  } else if (state.isSelected) {
                    cellClasses += 'bg-accent text-text-inverse font-semibold cursor-pointer ';
                  } else if (state.inRange) {
                    cellClasses += 'bg-accent/12 text-accent font-semibold cursor-pointer hover:bg-accent/20 ';
                  } else {
                    cellClasses += 'text-text-primary cursor-pointer hover:bg-bg-elevated ';
                  }

                  if (isToday && !state.isSelected && !dayInfo.outside) {
                    cellClasses += 'ring-1 ring-inset ring-accent/50 ';
                  }

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={state.disabled}
                      onClick={() => handleDayClick(dayInfo)}
                      onMouseEnter={() => {
                        if (isRange && rangeSelecting && !isDisabled(date)) {
                          setHoverDate(toISO(date));
                        }
                      }}
                      className={cellClasses}
                    >
                      {dayInfo.day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ─── Footer ─── */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-bg-primary/50">
            <div className="min-w-0">
              {isRange && !rangeSelecting && (
                <span className="text-[11px] text-text-muted">Click a date to start</span>
              )}
              {isRange && rangeSelecting && (
                <span className="text-[11px] text-accent font-medium truncate">
                  {formatDisplay(tempStart)} → pick end
                </span>
              )}
              {!isRange && (
                <span className="text-[11px] text-text-muted">
                  {value ? formatDisplay(value) : 'No date selected'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isRange && rangeSelecting && (
                <button
                  type="button"
                  onClick={() => {
                    setRangeSelecting(false);
                    setTempStart(null);
                    setHoverDate(null);
                  }}
                  className="text-[11px] font-medium text-text-muted hover:text-text-primary px-1.5 py-0.5 rounded transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={goToToday}
                className="text-[11px] font-semibold text-accent hover:text-accent-hover px-1.5 py-0.5 rounded transition-colors"
              >
                Today
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
