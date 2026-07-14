'use client';

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

export type ZipSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type ZipSelectProps = {
  id?: string;
  value: string;
  options: ZipSelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function ZipSelect({ id, value, options, onChange, ariaLabel, placeholder = 'Select', disabled = false, className = '' }: ZipSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value]);
  const enabledOptions = useMemo(() => options.filter((option) => !option.disabled), [options]);
  const selectedIndex = selectedOption ? enabledOptions.findIndex((option) => option.value === selectedOption.value) : -1;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  function choose(nextValue: string) {
    const nextOption = options.find((option) => option.value === nextValue);
    if (!nextOption || nextOption.disabled) return;
    onChange(nextValue);
    setOpen(false);
  }

  function chooseByOffset(offset: number) {
    if (!enabledOptions.length) return;
    const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex = (currentIndex + offset + enabledOptions.length) % enabledOptions.length;
    choose(enabledOptions[nextIndex].value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) setOpen(true);
      else chooseByOffset(1);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) setOpen(true);
      else chooseByOffset(-1);
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen((current) => !current);
    }
  }

  return (
    <div ref={rootRef} className={`zip-select ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`.trim()}>
      <button
        id={id}
        type="button"
        className="zip-select-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className={`zip-select-value ${selectedOption ? '' : 'is-placeholder'}`.trim()}>
          {selectedOption?.label ?? placeholder}
        </span>
        <span className="zip-select-chevron" aria-hidden="true">
          <svg className="zip-select-chevron-icon" viewBox="0 0 24 24" focusable="false">
            <path d="M6.4 8.8 12 14.4l5.6-5.6" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="zip-select-menu" role="listbox" aria-labelledby={id}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                className={`zip-select-option ${selected ? 'is-selected' : ''}`.trim()}
                onClick={() => choose(option.value)}
              >
                <span>{option.label}</span>
                {option.description && <small>{option.description}</small>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
