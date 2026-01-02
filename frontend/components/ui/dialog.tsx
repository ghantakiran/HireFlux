import * as React from 'react';
import { cn } from '@/lib/utils';
import { ModalStackManager } from './modal-stack-context';

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

interface DialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogTriggerProps {
  asChild?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const modalId = React.useId();
  const previouslyFocusedElement = React.useRef<HTMLElement | null>(null);
  const wasOpen = React.useRef(false);

  // Capture the focused element when dialog is about to open (use LayoutEffect to run before child effects)
  React.useLayoutEffect(() => {
    if (open && !wasOpen.current) {
      // Dialog is opening - store the currently focused element (WCAG 2.1 AA - Issue #151)
      // This runs before DialogContent's useEffect, so we capture the trigger element
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      wasOpen.current = true;
      document.body.style.overflow = 'hidden';
    } else if (!open && wasOpen.current) {
      // Dialog is closing - restore focus (WCAG 2.1 AA - Issue #151)
      wasOpen.current = false;
      document.body.style.overflow = 'unset';

      // Restore focus after modal unmounts
      const restoreFocus = () => {
        if (previouslyFocusedElement.current && document.body.contains(previouslyFocusedElement.current)) {
          previouslyFocusedElement.current.focus();
        }
        previouslyFocusedElement.current = null;
      };

      // Use requestAnimationFrame to restore focus after next paint
      requestAnimationFrame(restoreFocus);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  // Register/unregister with modal stack for nested modal support
  React.useEffect(() => {
    if (open) {
      ModalStackManager.register(modalId, () => onOpenChange?.(false));
      return () => {
        ModalStackManager.unregister(modalId);
      };
    }
  }, [open, modalId, onOpenChange]);

  // Handle Escape key to close modal (WCAG 2.1 AA - Issue #149)
  // Only close if this is the topmost modal in the stack
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

export function DialogContent({ className, children, ...props }: DialogContentProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);

  // Focus trapping for keyboard navigation (WCAG 2.1 AA - Issue #151)
  React.useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    // Get all focusable elements within the dialog
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const getFocusableElements = () => {
      return Array.from(
        dialogElement.querySelectorAll<HTMLElement>(focusableSelectors)
      );
    };

    // Focus the first focusable element when dialog opens
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle Tab key to trap focus within dialog
    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (event.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Prevent focus from escaping the dialog (WCAG 2.1 AA - Issue #151)
    // This handles both keyboard and programmatic focus attempts
    const handleFocusOut = (event: FocusEvent) => {
      const relatedTarget = event.relatedTarget as Node | null;

      // If focus is moving outside the dialog, bring it back
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
      className={cn(
        'relative z-50 w-full max-w-lg rounded-lg bg-white p-6 shadow-lg',
        className
      )}
      role="dialog"
      aria-modal="true"
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className, children }: DialogHeaderProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}>
      {children}
    </div>
  );
}

export function DialogTitle({ className, children }: DialogTitleProps) {
  return (
    <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({ className, children }: DialogDescriptionProps) {
  return <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>;
}

export function DialogFooter({ className, children }: DialogFooterProps) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    >
      {children}
    </div>
  );
}

export function DialogTrigger({ asChild, className, children, onClick }: DialogTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e: React.MouseEvent) => {
        onClick?.();
        // @ts-ignore - preserve original onClick if exists
        children.props.onClick?.(e);
      },
    } as any);
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
}
