'use client';

import { type CSSProperties, type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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

type MenuPlacement = 'below' | 'above';

const MENU_GAP = 8;
const VIEWPORT_GUTTER = 12;
const MIN_MENU_HEIGHT = 150;
const MAX_MENU_HEIGHT = 320;

export function ZipSelect({ id, value, options, onChange, ariaLabel, placeholder = 'Select', disabled = false, className = '' }: ZipSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const [menuPlacement, setMenuPlacement] = useState<MenuPlacement>('below');
  const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value]);
  const enabledOptions = useMemo(() => options.filter((option) => !option.disabled), [options]);
  const selectedIndex = selectedOption ? enabledOptions.findIndex((option) => option.value === selectedOption.value) : -1;

  const usesWideMenu = className.split(/\s+/).includes('phone-country-select');
  const menuClassName = [
    'zip-select-menu',
    'zip-select-floating-menu',
    menuPlacement === 'above' ? 'opens-above' : 'opens-below',
    usesWideMenu ? 'phone-country-select-menu' : '',
    className.split(/\s+/).includes('zip-calendar-month-select') ? 'zip-calendar-month-select-menu' : ''
  ].filter(Boolean).join(' ');

  const updateMenuPosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const root = rootRef.current;
    const button = root?.querySelector<HTMLButtonElement>('.zip-select-button');
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const visualViewport = window.visualViewport;
    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const viewportWidth = visualViewport?.width ?? window.innerWidth;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const availableBelow = Math.max(0, viewportTop + viewportHeight - rect.bottom - MENU_GAP - VIEWPORT_GUTTER);
    const availableAbove = Math.max(0, rect.top - viewportTop - MENU_GAP - VIEWPORT_GUTTER);
    const shouldOpenAbove = availableBelow < MIN_MENU_HEIGHT && availableAbove > availableBelow;
    const availableSpace = shouldOpenAbove ? availableAbove : availableBelow;
    const maxHeight = Math.max(MIN_MENU_HEIGHT, Math.min(MAX_MENU_HEIGHT, availableSpace || MAX_MENU_HEIGHT));
    const viewportSafeWidth = Math.max(180, viewportWidth - (VIEWPORT_GUTTER * 2));
    const preferredWidth = usesWideMenu ? Math.min(320, viewportSafeWidth) : Math.max(rect.width, 180);
    const menuWidth = Math.min(Math.max(rect.width, preferredWidth), viewportSafeWidth);
    const left = Math.min(
      Math.max(rect.left, viewportLeft + VIEWPORT_GUTTER),
      viewportLeft + viewportWidth - menuWidth - VIEWPORT_GUTTER
    );

    setMenuPlacement(shouldOpenAbove ? 'above' : 'below');
    setMenuStyle({
      position: 'fixed',
      left: `${Math.round(left)}px`,
      width: `${Math.round(menuWidth)}px`,
      maxHeight: `${Math.round(maxHeight)}px`,
      ...(shouldOpenAbove
        ? { top: 'auto', bottom: `${Math.round(Math.max(VIEWPORT_GUTTER, viewportTop + viewportHeight - rect.top + MENU_GAP))}px` }
        : { top: `${Math.round(Math.min(rect.bottom + MENU_GAP, viewportTop + viewportHeight - VIEWPORT_GUTTER - maxHeight))}px`, bottom: 'auto' })
    });
  }, [usesWideMenu]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const animationFrame = window.requestAnimationFrame(updateMenuPosition);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    window.visualViewport?.addEventListener('resize', updateMenuPosition);
    window.visualViewport?.addEventListener('scroll', updateMenuPosition);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.visualViewport?.removeEventListener('resize', updateMenuPosition);
      window.visualViewport?.removeEventListener('scroll', updateMenuPosition);
    };
  }, [open, options.length, updateMenuPosition, value]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
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

  const menu = (
    <div ref={menuRef} className={menuClassName} role="listbox" aria-labelledby={id} style={menuStyle}>
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
  );

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
      {open && mounted ? createPortal(menu, document.body) : null}
    </div>
  );
}
