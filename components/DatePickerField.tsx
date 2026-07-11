'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type DatePickerMode = 'standard' | 'dob';

type DatePickerFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  mode?: DatePickerMode;
};

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseIsoDate(value?: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day, 12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) return null;
  return date;
}

function parseDisplayDate(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  const match = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(trimmed);
  if (!match) return null;
  const day = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const year = Number(match[3]);
  const date = new Date(year, monthIndex, day, 12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) return null;
  return date;
}

function parseDisplayDateToIso(value?: string) {
  const date = parseDisplayDate(value);
  return date ? toIsoDate(date) : '';
}

function monthFromTypedValue(value?: string) {
  if (!value) return null;

  const exactDate = parseDisplayDate(value);
  if (exactDate) return exactDate;

  const trimmed = value.trim();
  const dateParts = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.]?(\d{0,4})$/.exec(trimmed);
  if (dateParts) {
    const monthIndex = Math.max(0, Math.min(11, Number(dateParts[2]) - 1));
    const year = dateParts[3]?.length === 4 ? Number(dateParts[3]) : null;
    if (year && year >= 1900 && year <= 2100) return new Date(year, monthIndex, 1, 12, 0, 0, 0);
  }

  const monthYearParts = /^(\d{1,2})[\/\-.](\d{4})$/.exec(trimmed);
  if (monthYearParts) {
    const monthIndex = Math.max(0, Math.min(11, Number(monthYearParts[1]) - 1));
    const year = Number(monthYearParts[2]);
    if (year >= 1900 && year <= 2100) return new Date(year, monthIndex, 1, 12, 0, 0, 0);
  }

  const yearMatch = /(\d{4})/.exec(trimmed);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    if (year >= 1900 && year <= 2100) return new Date(year, 0, 1, 12, 0, 0, 0);
  }

  return null;
}

function formatDisplayDate(value?: string) {
  const date = parseIsoDate(value);
  if (!date) return '';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date);
}

function mondayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function isBeforeLimit(value: string, min?: string) {
  return Boolean(min && value < min);
}

function isAfterLimit(value: string, max?: string) {
  return Boolean(max && value > max);
}

function clampYear(year: number, minYear: number, maxYear: number) {
  return Math.min(maxYear, Math.max(minYear, year));
}

export function DatePickerField({
  id,
  value,
  onChange,
  min,
  max,
  required = false,
  placeholder = 'Select date',
  ariaLabel = 'Choose date',
  mode = 'standard'
}: DatePickerFieldProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const isDob = mode === 'dob';
  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const effectiveMin = isDob ? (min ?? '1900-01-01') : min;
  const effectiveMax = isDob ? (max ?? todayIso) : max;
  const minYear = parseIsoDate(effectiveMin)?.getFullYear() ?? 1900;
  const maxYear = parseIsoDate(effectiveMax)?.getFullYear() ?? new Date().getFullYear();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 16, left: 16, width: 342 });
  const [manualText, setManualText] = useState(() => formatDisplayDate(value));
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const selected = parseIsoDate(value);
    return selected ?? new Date();
  });
  const [yearText, setYearText] = useState(() => String((parseIsoDate(value) ?? new Date()).getFullYear()));

  const selectedDate = parseIsoDate(value);

  useEffect(() => {
    setMounted(true);
  }, []);

  const syncCalendarToBestDate = useCallback(() => {
    const selected = parseIsoDate(value);
    const typed = isDob ? monthFromTypedValue(manualText) : null;
    const next = selected ?? typed;
    if (next) setCalendarMonth(new Date(next.getFullYear(), next.getMonth(), 1, 12, 0, 0, 0));
  }, [isDob, manualText, value]);

  const updatePopoverPosition = useCallback(() => {
    if (!wrapperRef.current || typeof window === 'undefined') return;

    const triggerRect = wrapperRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth <= 640;
    const gap = 16;
    const width = Math.min(isDob ? 374 : 342, viewportWidth - gap * 2);
    const measuredHeight = popoverRef.current?.getBoundingClientRect().height ?? (isDob ? 430 : 390);

    if (isMobile) {
      setPopoverPosition({
        width,
        left: Math.max(gap, (viewportWidth - width) / 2),
        top: Math.max(gap, (viewportHeight - measuredHeight) / 2)
      });
      return;
    }

    const rawLeft = triggerRect.right - width;
    const left = Math.min(Math.max(gap, rawLeft), viewportWidth - width - gap);
    const rawTop = triggerRect.top - 8;
    const maxTop = Math.max(gap, viewportHeight - measuredHeight - gap);
    const top = Math.max(gap, Math.min(rawTop, maxTop));

    setPopoverPosition({ width, left, top });
  }, [isDob]);

  useEffect(() => {
    setManualText(formatDisplayDate(value));
  }, [value]);

  useEffect(() => {
    if (!value) return;
    const next = parseIsoDate(value);
    if (next) setCalendarMonth(next);
  }, [value]);

  useEffect(() => {
    setYearText(String(calendarMonth.getFullYear()));
  }, [calendarMonth]);

  useEffect(() => {
    if (!open) return;

    updatePopoverPosition();

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      const insideTrigger = wrapperRef.current?.contains(target);
      const insidePopover = popoverRef.current?.contains(target);
      if (!insideTrigger && !insidePopover) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    function handleViewportChange() {
      updatePopoverPosition();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open, updatePopoverPosition]);

  useEffect(() => {
    if (!open) return;
    updatePopoverPosition();
  }, [calendarMonth, open, updatePopoverPosition]);

  const monthCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const monthIndex = calendarMonth.getMonth();
    const firstOfMonth = new Date(year, monthIndex, 1, 12, 0, 0, 0);
    const leadingDays = mondayIndex(firstOfMonth);
    const gridStart = new Date(year, monthIndex, 1 - leadingDays, 12, 0, 0, 0);

    return Array.from({ length: 42 }, (_, index) => {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + index);
      const iso = toIsoDate(cellDate);
      return {
        iso,
        day: cellDate.getDate(),
        isCurrentMonth: cellDate.getMonth() === monthIndex,
        isSelected: value === iso,
        isToday: todayIso === iso,
        disabled: isBeforeLimit(iso, effectiveMin) || isAfterLimit(iso, effectiveMax)
      };
    });
  }, [calendarMonth, effectiveMax, effectiveMin, todayIso, value]);

  function moveMonth(monthDelta: number) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + monthDelta, 1, 12, 0, 0, 0));
  }

  function setMonth(monthIndex: number) {
    setCalendarMonth((current) => new Date(current.getFullYear(), monthIndex, 1, 12, 0, 0, 0));
  }

  function handleYearInput(yearValue: string) {
    if (!/^\d{0,4}$/.test(yearValue)) return;
    setYearText(yearValue);

    if (yearValue.length === 4) {
      const year = Number(yearValue);
      if (!Number.isFinite(year)) return;
      const safeYear = clampYear(year, minYear, maxYear);
      setCalendarMonth((current) => new Date(safeYear, current.getMonth(), 1, 12, 0, 0, 0));
    }
  }

  function handleYearBlur() {
    const year = Number(yearText);
    if (!Number.isFinite(year) || yearText.length !== 4) {
      setYearText(String(calendarMonth.getFullYear()));
      return;
    }

    const safeYear = clampYear(year, minYear, maxYear);
    setYearText(String(safeYear));
    setCalendarMonth((current) => new Date(safeYear, current.getMonth(), 1, 12, 0, 0, 0));
  }

  function chooseDate(nextValue: string) {
    if (isBeforeLimit(nextValue, effectiveMin) || isAfterLimit(nextValue, effectiveMax)) return;
    onChange(nextValue);
    const next = parseIsoDate(nextValue);
    if (next) {
      setCalendarMonth(next);
      setManualText(formatDisplayDate(nextValue));
    }
    setOpen(false);
  }

  function chooseToday() {
    chooseDate(todayIso);
  }

  function openCalendar() {
    syncCalendarToBestDate();
    setOpen((current) => !current);
  }

  function handleManualChange(nextText: string) {
    setManualText(nextText);

    if (!nextText.trim()) {
      if (!required) onChange('');
      return;
    }

    const nextIso = parseDisplayDateToIso(nextText);
    if (nextIso && !isBeforeLimit(nextIso, effectiveMin) && !isAfterLimit(nextIso, effectiveMax)) {
      onChange(nextIso);
      const nextDate = parseIsoDate(nextIso);
      if (nextDate) setCalendarMonth(nextDate);
    }
  }

  function handleManualBlur() {
    if (!manualText.trim()) {
      setManualText(formatDisplayDate(value));
      return;
    }

    const nextIso = parseDisplayDateToIso(manualText);
    if (nextIso && !isBeforeLimit(nextIso, effectiveMin) && !isAfterLimit(nextIso, effectiveMax)) {
      setManualText(formatDisplayDate(nextIso));
    }
  }

  const displayDate = formatDisplayDate(value);

  const calendarPopup = (
    <div
      ref={popoverRef}
      className={`zip-calendar-popover is-floating ${isDob ? 'is-dob-calendar' : ''}`}
      role="dialog"
      aria-label={ariaLabel}
      style={{
        top: `${popoverPosition.top}px`,
        left: `${popoverPosition.left}px`,
        width: `${popoverPosition.width}px`
      }}
    >
      {isDob ? (
        <div className="zip-calendar-head is-dob-head">
          <button type="button" className="zip-calendar-nav" onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button>
          <div className="zip-calendar-jump-controls" aria-label="Choose month and year">
            <select
              value={calendarMonth.getMonth()}
              onChange={(event) => setMonth(Number(event.target.value))}
              aria-label="Month"
            >
              {MONTH_NAMES.map((month, index) => (
                <option key={month} value={index}>{month}</option>
              ))}
            </select>
            <input
              type="number"
              inputMode="numeric"
              min={minYear}
              max={maxYear}
              value={yearText}
              onChange={(event) => handleYearInput(event.target.value)}
              onBlur={handleYearBlur}
              aria-label="Year"
            />
          </div>
          <button type="button" className="zip-calendar-nav" onClick={() => moveMonth(1)} aria-label="Next month">›</button>
        </div>
      ) : (
        <div className="zip-calendar-head">
          <button type="button" className="zip-calendar-nav" onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button>
          <strong>{formatMonthTitle(calendarMonth)}</strong>
          <button type="button" className="zip-calendar-nav" onClick={() => moveMonth(1)} aria-label="Next month">›</button>
        </div>
      )}

      <div className="zip-calendar-weekdays" aria-hidden="true">
        {WEEK_DAYS.map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="zip-calendar-grid">
        {monthCells.map((cell) => (
          <button
            key={cell.iso}
            type="button"
            className={`zip-calendar-day ${cell.isCurrentMonth ? '' : 'is-muted'} ${cell.isSelected ? 'is-selected' : ''} ${cell.isToday ? 'is-today' : ''}`}
            disabled={cell.disabled}
            onClick={() => chooseDate(cell.iso)}
          >
            {cell.day}
          </button>
        ))}
      </div>

      <div className="zip-calendar-foot">
        {!required && <button type="button" onClick={() => { onChange(''); setManualText(''); setOpen(false); }}>Clear</button>}
        <button type="button" onClick={chooseToday}>Today</button>
      </div>
    </div>
  );

  if (isDob) {
    return (
      <div className="zip-date-picker" ref={wrapperRef}>
        <div className={`zip-date-trigger zip-date-manual-control ${open ? 'is-open' : ''} ${!value && !manualText ? 'is-empty' : ''}`}>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            value={manualText}
            placeholder={placeholder || 'dd/mm/yyyy'}
            aria-label={ariaLabel}
            onChange={(event) => handleManualChange(event.target.value)}
            onBlur={handleManualBlur}
            onFocus={() => syncCalendarToBestDate()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                syncCalendarToBestDate();
                setOpen(true);
              }
            }}
          />
          <button type="button" className="zip-date-icon zip-date-icon-button" aria-label={ariaLabel} aria-expanded={open} onClick={openCalendar}>📅</button>
        </div>
        {open && mounted ? createPortal(calendarPopup, document.body) : null}
      </div>
    );
  }

  return (
    <div className="zip-date-picker" ref={wrapperRef}>
      <button
        id={id}
        type="button"
        className={`zip-date-trigger ${open ? 'is-open' : ''} ${!value ? 'is-empty' : ''}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={openCalendar}
      >
        <span>{displayDate || placeholder}</span>
        <span className="zip-date-icon" aria-hidden="true">📅</span>
      </button>
      {open && mounted ? createPortal(calendarPopup, document.body) : null}
    </div>
  );
}
