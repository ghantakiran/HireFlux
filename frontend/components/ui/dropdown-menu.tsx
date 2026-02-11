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
  triggerRef: React.RefObject<HTMLButtonElement | HTMLDivElement | null>;
}>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
});

interface DropdownMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function DropdownMenu({ open: controlledOpen, onOpenChange, children }: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement | HTMLDivElement | null>(null);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Restore focus to trigger when dropdown closes (WCAG 2.1 AA)
  React.useEffect(() => {
    if (!isOpen && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [isOpen]);

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
    <DropdownMenuContext.Provider value={{ open: isOpen, setOpen, triggerRef }}>
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
  const { open, setOpen, triggerRef } = React.useContext(DropdownMenuContext);
  const internalRef = React.useRef<HTMLButtonElement>(null);

  // Store trigger ref for focus restoration
  React.useEffect(() => {
    if (!asChild && internalRef.current) {
      (triggerRef as React.MutableRefObject<HTMLButtonElement | HTMLDivElement | null>).current = internalRef.current;
    }
  }, [asChild, triggerRef]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
    }
  };

  if (asChild) {
    return (
      <div
        ref={(el) => {
          (triggerRef as React.MutableRefObject<HTMLButtonElement | HTMLDivElement | null>).current = el;
        }}
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {children}
      </div>
    );
  }

  return (
    <button
      ref={internalRef}
      type="button"
      onClick={() => setOpen(!open)}
      onKeyDown={handleKeyDown}
      aria-haspopup="menu"
      aria-expanded={open}
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
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Focus first menu item on open and handle arrow key navigation (WCAG 2.1 AA)
  React.useEffect(() => {
    if (!open || !contentRef.current) return;

    const menuItems = contentRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])');
    if (menuItems.length > 0) {
      menuItems[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const items = Array.from(contentRef.current!.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
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
      }
    };

    contentRef.current.addEventListener('keydown', handleKeyDown);
    const el = contentRef.current;
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) return null;

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0'
  };

  return (
    <div
      ref={contentRef}
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
      role="menuitem"
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
    <div className={cn('px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400', className)}>
      {children}
    </div>
  );
}
