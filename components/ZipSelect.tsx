'use client';

import { type CSSProperties, type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type ZipSelectOption = {
  value: string;
  label: string;
  buttonLabel?: string;
  description?: string;
  disabled?: boolean;
  separatorAbove?: boolean;
  searchOnly?: boolean;
  flag?: string;
  countryName?: string;
  dialCode?: string;
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
  searchable?: boolean;
};

const MENU_GAP = 8;
const VIEWPORT_GUTTER = 14;

export function ZipSelect({ id, value, options, onChange, ariaLabel, placeholder = 'Select', disabled = false, className = '', searchable = false }: ZipSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const [opensAbove, setOpensAbove] = useState(false);
  const isCountrySelector = className.split(/\s+/).includes('phone-country-select');
  const selectedOption = useMemo(() => options.find(option => option.value === value), [options, value]);
  const enabledOptions = useMemo(() => options.filter(option => !option.disabled), [options]);
  const visibleOptions = useMemo(() => {
    const needle = searchText.trim().toLocaleLowerCase();
    if (!searchable) return options;
    if (!needle) return options.filter(option => !option.searchOnly || option.value === value);
    return options.filter(option => `${option.label} ${option.value}`.toLocaleLowerCase().includes(needle));
  }, [options, searchText, searchable, value]);

  const updateMenuPosition = useCallback(() => {
    if (typeof window === 'undefined' || isCountrySelector) return;
    const button = rootRef.current?.querySelector<HTMLButtonElement>('.zip-select-button');
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    const below = Math.max(0, top + height - rect.bottom - MENU_GAP - VIEWPORT_GUTTER);
    const above = Math.max(0, rect.top - top - MENU_GAP - VIEWPORT_GUTTER);
    const putAbove = below < 150 && above > below;
    const maxHeight = Math.min(320, Math.max(120, putAbove ? above : below));
    const menuWidth = Math.min(Math.max(rect.width, 180), width - VIEWPORT_GUTTER * 2);
    const menuLeft = Math.min(Math.max(rect.left, left + VIEWPORT_GUTTER), left + width - menuWidth - VIEWPORT_GUTTER);
    const menuTop = putAbove ? rect.top - maxHeight - MENU_GAP : rect.bottom + MENU_GAP;
    setOpensAbove(putAbove);
    setMenuStyle({ position: 'fixed', left: Math.round(menuLeft), top: Math.round(menuTop), width: Math.round(menuWidth), maxHeight: Math.round(maxHeight) });
  }, [isCountrySelector]);


  useEffect(() => setMounted(true), []);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => { if (!open) setSearchText(''); }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => { updateMenuPosition(); };
    update();
    const frame = window.requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    if (isCountrySelector) {
      document.body.style.overflow = 'hidden';
      // Do not focus the search on open: mobile keyboard appears only after an explicit tap.
    }
    const closeOutside = (event: MouseEvent | TouchEvent) => {
      const node = event.target as Node;
      if (!rootRef.current?.contains(node) && !menuRef.current?.contains(node)) setOpen(false);
    };
    const keyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
      if (!isCountrySelector || event.key !== 'Tab' || !menuRef.current) return;
      const controls = [...menuRef.current.querySelectorAll<HTMLElement>('input:not([disabled]), button:not([disabled])')].filter(node => node.offsetParent !== null);
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[controls.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0].focus(); }
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('touchstart', closeOutside);
    document.addEventListener('keydown', keyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('touchstart', closeOutside);
      document.removeEventListener('keydown', keyDown);
      if (isCountrySelector) rootRef.current?.querySelector<HTMLButtonElement>('.zip-select-button')?.focus();
    };
  }, [open, isCountrySelector]);

  function choose(nextValue: string) {
    const choice = options.find(option => option.value === nextValue);
    if (!choice || choice.disabled) return;
    onChange(choice.value);
    setOpen(false);
    setSearchText('');
  }

  function chooseByOffset(offset: number) {
    if (!enabledOptions.length) return;
    const at = enabledOptions.findIndex(item => item.value === value);
    const next = (Math.max(at, 0) + offset + enabledOptions.length) % enabledOptions.length;
    choose(enabledOptions[next].value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) setOpen(true);
      else if (!isCountrySelector) chooseByOffset(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(previous => !previous);
    }
  }

  const optionsList = (
    <div className="zip-select-options-scroll" role="listbox" aria-label={isCountrySelector ? 'Countries and dialling codes' : ariaLabel ?? 'Options'}>
      {visibleOptions.length === 0 && <p className="zip-select-empty">No matching country</p>}
      {visibleOptions.map(option => (
        <div key={option.value}>
          {option.separatorAbove && !searchText.trim() && <div className="zip-select-divider" aria-hidden="true" />}
          <button
            type="button"
            role="option"
            aria-selected={option.value === value}
            disabled={option.disabled}
            className={`zip-select-option ${option.value === value ? 'is-selected' : ''}`}
            onClick={() => choose(option.value)}
          >
            {isCountrySelector && option.countryName ? (
              <span className="zip-country-option-content">
                <span className="zip-country-option-flag" aria-hidden="true">{option.flag}</span>
                <span className="zip-country-option-name">{option.countryName}</span>
                <span className="zip-country-option-dial">{option.dialCode}</span>
              </span>
            ) : <span>{option.label}</span>}
            {option.description && <small>{option.description}</small>}
          </button>
        </div>
      ))}
    </div>
  );

  const menu = isCountrySelector ? (
    <div className="zip-select-country-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div ref={menuRef} className="zip-select-country-dialog" role="dialog" aria-modal="true" aria-label={ariaLabel ?? 'Select country code'}>
        <div className="zip-select-country-heading">
          <div>
            <strong>Choose country code</strong>
            <p>Popular countries. Search for more.</p>
          </div>
          <button type="button" className="zip-select-country-close" onClick={() => setOpen(false)} aria-label="Close country selector">×</button>
        </div>
        <div className="zip-select-country-search">
          <span className="zip-select-country-search-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg></span>
          <input type="search" autoComplete="off" aria-label="Search country or dialling code" placeholder="Search country or code…" value={searchText} onChange={event => setSearchText(event.target.value)} />
        </div>
        {optionsList}
      </div>
    </div>
  ) : (
    <div ref={menuRef} className={`zip-select-menu zip-select-floating-menu ${opensAbove ? 'opens-above' : 'opens-below'}`} role={searchable ? 'dialog' : 'listbox'} aria-label={ariaLabel ?? 'Select an option'} style={menuStyle}>
      {searchable && <div className="zip-select-search-row"><input type="search" aria-label="Search options" placeholder="Search…" value={searchText} onChange={event => setSearchText(event.target.value)} /></div>}
      {optionsList}
    </div>
  );

  return (
    <div ref={rootRef} className={`zip-select ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`.trim()}>
      <button
        id={id}
        type="button"
        className="zip-select-button"
        aria-haspopup={isCountrySelector || searchable ? 'dialog' : 'listbox'}
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen(previous => !previous)}
        onKeyDown={handleKeyDown}
      >
        <span className={`zip-select-value ${selectedOption ? '' : 'is-placeholder'}`.trim()}>{selectedOption?.buttonLabel ?? selectedOption?.label ?? placeholder}</span>
        <span className="zip-select-chevron" aria-hidden="true"><svg className="zip-select-chevron-icon" viewBox="0 0 24 24" focusable="false"><path d="M6.4 8.8 12 14.4l5.6-5.6" /></svg></span>
      </button>
      {open && mounted ? createPortal(menu, document.body) : null}
    </div>
  );
}
