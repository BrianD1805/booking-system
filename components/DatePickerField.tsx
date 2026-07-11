'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type DatePickerFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  placeholder?: string;
  ariaLabel?: string;
};

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isoFromParts(year: number, monthIndex: number, day: number) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
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

export function DatePickerField({
  id,
  value,
  onChange,
  min,
  max,
  required = false,
  placeholder = 'Select date',
  ariaLabel = 'Choose date'
}: DatePickerFieldProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const selected = parseIsoDate(value);
    return selected ?? new Date();
  });

  const selectedDate = parseIsoDate(value);
  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  useEffect(() => {
    if (!value) return;
    const next = parseIsoDate(value);
    if (next) setCalendarMonth(next);
  }, [value]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

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
        disabled: isBeforeLimit(iso, min) || isAfterLimit(iso, max)
      };
    });
  }, [calendarMonth, max, min, todayIso, value]);

  function moveMonth(monthDelta: number) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + monthDelta, 1, 12, 0, 0, 0));
  }

  function chooseDate(nextValue: string) {
    if (isBeforeLimit(nextValue, min) || isAfterLimit(nextValue, max)) return;
    onChange(nextValue);
    const next = parseIsoDate(nextValue);
    if (next) setCalendarMonth(next);
    setOpen(false);
  }

  function chooseToday() {
    chooseDate(todayIso);
  }

  const displayDate = formatDisplayDate(value);

  return (
    <div className="zip-date-picker" ref={wrapperRef}>
      <button
        id={id}
        type="button"
        className={`zip-date-trigger ${open ? 'is-open' : ''} ${!value ? 'is-empty' : ''}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{displayDate || placeholder}</span>
        <span className="zip-date-icon" aria-hidden="true">📅</span>
      </button>
      {open && (
        <div className="zip-calendar-popover" role="dialog" aria-label={ariaLabel}>
          <div className="zip-calendar-head">
            <button type="button" className="zip-calendar-nav" onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button>
            <strong>{formatMonthTitle(calendarMonth)}</strong>
            <button type="button" className="zip-calendar-nav" onClick={() => moveMonth(1)} aria-label="Next month">›</button>
          </div>

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
            {!required && <button type="button" onClick={() => { onChange(''); setOpen(false); }}>Clear</button>}
            <button type="button" onClick={chooseToday}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}
