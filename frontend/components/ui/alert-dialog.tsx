/**
 * Alert Dialog Component
 * Modal dialog for confirmations and alerts
 * WCAG 2.1 AA compliant: role="alertdialog", aria-modal, focus trap, focus restore, Escape key
 */

'use client';

import * as React from 'react';
import { ModalStackManager } from './modal-stack-context';

// Context for AlertDialog
const AlertDialogContext = React.createContext<{
  onOpenChange?: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
} | null>(null);

export interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  const modalId = React.useId();
  const titleId = React.useId();
  const descriptionId = React.useId();
  const previouslyFocusedElement = React.useRef<HTMLElement | null>(null);
  const wasOpen = React.useRef(false);

  // Capture/restore focus and manage body scroll (WCAG 2.1 AA)
  React.useLayoutEffect(() => {
    if (open && !wasOpen.current) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      wasOpen.current = true;
      document.body.style.overflow = 'hidden';
    } else if (!open && wasOpen.current) {
      wasOpen.current = false;
      document.body.style.overflow = 'unset';

      const restoreFocus = () => {
        if (previouslyFocusedElement.current && document.body.contains(previouslyFocusedElement.current)) {
          previouslyFocusedElement.current.focus();
        }
        previouslyFocusedElement.current = null;
      };

      requestAnimationFrame(restoreFocus);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  // Register with modal stack for nested modal support
  React.useEffect(() => {
    if (open) {
      ModalStackManager.register(modalId, () => onOpenChange?.(false));
      return () => {
        ModalStackManager.unregister(modalId);
      };
    }
  }, [open, modalId, onOpenChange]);

  // Handle Escape key (WCAG 2.1 AA)
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open && ModalStackManager.isTopModal(modalId)) {
        onOpenChange?.(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onOpenChange, modalId]);

  if (!open) return null;

  return (
    <AlertDialogContext.Provider value={{ onOpenChange, titleId, descriptionId }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="fixed inset-0 bg-black/50"
          onClick={() => onOpenChange?.(false)}
          aria-hidden="true"
        />
        <div className="relative z-50">{children}</div>
      </div>
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const context = React.useContext(AlertDialogContext);

  // Focus trapping (WCAG 2.1 AA)
  React.useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const getFocusableElements = () => {
      return Array.from(dialogElement.querySelectorAll<HTMLElement>(focusableSelectors));
    };

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Tab key trapping
    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Prevent focus escape
    const handleFocusOut = (event: FocusEvent) => {
      const relatedTarget = event.relatedTarget as Node | null;
      if (relatedTarget && !dialogElement.contains(relatedTarget)) {
        event.preventDefault();
        const focusable = getFocusableElements();
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    };

    dialogElement.addEventListener('keydown', handleTabKey);
    dialogElement.addEventListener('focusout', handleFocusOut);

    return () => {
      dialogElement.removeEventListener('keydown', handleTabKey);
      dialogElement.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return (
    <div
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={context?.titleId}
      aria-describedby={context?.descriptionId}
      className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-md w-full ${className}`}
    >
      {children}
    </div>
  );
}

export function AlertDialogHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function AlertDialogTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const context = React.useContext(AlertDialogContext);
  return <h2 id={context?.titleId} className={`text-lg font-semibold ${className}`}>{children}</h2>;
}

export function AlertDialogDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const context = React.useContext(AlertDialogContext);
  return <p id={context?.descriptionId} className={`text-sm text-gray-600 dark:text-gray-400 ${className}`}>{children}</p>;
}

export function AlertDialogFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex justify-end gap-2 mt-4 ${className}`}>{children}</div>;
}

export function AlertDialogAction({ children, onClick, disabled, className = '' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function AlertDialogCancel({ children, onClick, disabled, className = '' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
