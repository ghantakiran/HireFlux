/**
 * Dropdown Menu Component
 * Dropdown menu with composable sub-components
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const DropdownMenuContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({
  open: false,
  setOpen: () => {}
});

interface DropdownMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function DropdownMenu({ open: controlledOpen, onOpenChange, children }: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setOpen]);

  // Handle Escape key to close dropdown (WCAG 2.1 AA - Issue #149)
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, setOpen]);

  return (
    <DropdownMenuContext.Provider value={{ open: isOpen, setOpen }}>
      <div className="relative" ref={dropdownRef}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

export function DropdownMenuTrigger({ children, asChild, className }: DropdownMenuTriggerProps) {
  const { open, setOpen } = React.useContext(DropdownMenuContext);

  if (asChild) {
    return <div onClick={() => setOpen(!open)}>{children}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn('focus:outline-none', className)}
    >
      {children}
    </button>
  );
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function DropdownMenuContent({ children, align = 'end', className }: DropdownMenuContentProps) {
  const { open } = React.useContext(DropdownMenuContext);

  if (!open) return null;

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0'
  };

  return (
    <div
      className={cn(
        'absolute z-50 mt-2 w-48 rounded-md border bg-white dark:bg-gray-900 shadow-lg',
        alignmentClasses[align],
        className
      )}
      role="menu"
      aria-orientation="vertical"
    >
      <div className="py-1">{children}</div>
    </div>
  );
}

interface DropdownMenuItemProps {
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function DropdownMenuItem({ onClick, children, className, disabled }: DropdownMenuItemProps) {
  const { setOpen } = React.useContext(DropdownMenuContext);

  const handleClick = (e: React.MouseEvent) => {
    if (!disabled) {
      if (onClick) {
        onClick(e);
      }
      setOpen(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

interface DropdownMenuSeparatorProps {
  className?: string;
}

export function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return <div className={cn('my-1 h-px bg-gray-200 dark:bg-gray-700', className)} />;
}

interface DropdownMenuLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function DropdownMenuLabel({ children, className }: DropdownMenuLabelProps) {
  return (
    <div className={cn('px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400', className)}>
      {children}
    </div>
  );
}
