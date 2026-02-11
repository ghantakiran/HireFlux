/**
 * Select Component
 * Custom select dropdown with composable sub-components
 */

'use client';

import * as React from 'react';

export interface SelectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const SelectContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  listboxId: string;
}>({
  value: '',
  onValueChange: () => {},
  open: false,
  setOpen: () => {},
  disabled: false,
  triggerRef: { current: null },
  listboxId: '',
});

export function Select({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  disabled,
  children,
  ...props
}: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const value = controlledValue ?? internalValue;
  const setValue = onValueChange ?? setInternalValue;
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listboxId = React.useId();

  return (
    <SelectContext.Provider value={{ value, onValueChange: setValue, open, setOpen, disabled, triggerRef, listboxId }}>
      <div className="relative" {...props}>{children}</div>
    </SelectContext.Provider>
  );
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function SelectTrigger({ className = '', children, ...props }: SelectTriggerProps) {
  const { open, setOpen, disabled, triggerRef, listboxId } = React.useContext(SelectContext);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
    }
  };

  return (
    <button
      ref={triggerRef as React.RefObject<HTMLButtonElement>}
      type="button"
      onClick={() => !disabled && setOpen(!open)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-owns={listboxId}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
      <svg
        className="h-4 w-4 opacity-50"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
}

export interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = React.useContext(SelectContext);

  if (!value && placeholder) {
    return <span className="text-gray-500">{placeholder}</span>;
  }

  return <span>{value}</span>;
}

export interface SelectContentProps {
  className?: string;
  children: React.ReactNode;
}

export function SelectContent({ className = '', children }: SelectContentProps) {
  const { open, setOpen, value, triggerRef, listboxId } = React.useContext(SelectContext);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, setOpen]);

  // Focus selected or first item on open, handle arrow keys and Escape (WCAG 2.1 AA)
  React.useEffect(() => {
    if (!open || !contentRef.current) return;

    const options = contentRef.current.querySelectorAll<HTMLElement>('[role="option"]');
    const selectedOption = contentRef.current.querySelector<HTMLElement>('[aria-selected="true"]');
    if (selectedOption) {
      selectedOption.focus();
    } else if (options.length > 0) {
      options[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const items = Array.from(contentRef.current!.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])'));
      if (items.length === 0) return;

      const currentIndex = items.indexOf(document.activeElement as HTMLElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev].focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    contentRef.current.addEventListener('keydown', handleKeyDown);
    const el = contentRef.current;
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [open, setOpen, triggerRef]);

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      id={listboxId}
      role="listbox"
      className={`absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}

export interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function SelectItem({ value, children, disabled, className = '' }: SelectItemProps) {
  const { value: selectedValue, onValueChange, setOpen, triggerRef } = React.useContext(SelectContext);
  const isSelected = value === selectedValue;

  const handleClick = () => {
    if (!disabled) {
      onValueChange(value);
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled || undefined}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`relative flex cursor-pointer select-none items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
        isSelected ? 'bg-blue-50 text-blue-600 font-medium' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
      {isSelected && (
        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </div>
  );
}
