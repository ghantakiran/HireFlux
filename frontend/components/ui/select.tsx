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
}>({
  value: '',
  onValueChange: () => {},
  open: false,
  setOpen: () => {},
  disabled: false
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

  return (
    <SelectContext.Provider value={{ value, onValueChange: setValue, open, setOpen, disabled }}>
      <div className="relative" {...props}>{children}</div>
    </SelectContext.Provider>
  );
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function SelectTrigger({ className = '', children, ...props }: SelectTriggerProps) {
  const { open, setOpen, disabled } = React.useContext(SelectContext);

  return (
    <button
      type="button"
      onClick={() => !disabled && setOpen(!open)}
      disabled={disabled}
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
    return <span className="text-gray-400">{placeholder}</span>;
  }

  return <span>{value}</span>;
}

export interface SelectContentProps {
  className?: string;
  children: React.ReactNode;
}

export function SelectContent({ className = '', children }: SelectContentProps) {
  const { open, setOpen } = React.useContext(SelectContext);
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

  if (!open) return null;

  return (
    <div
      ref={contentRef}
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
  const { value: selectedValue, onValueChange, setOpen } = React.useContext(SelectContext);
  const isSelected = value === selectedValue;

  const handleClick = () => {
    if (!disabled) {
      onValueChange(value);
      setOpen(false);
    }
  };

  return (
    <div
      onClick={handleClick}
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
