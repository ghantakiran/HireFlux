import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 relative overflow-hidden whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:animate-ring-pulse disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-[0.97]',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-105 active:scale-[0.97]',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-[0.97]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105 active:scale-[0.97]',
        ghost: 'hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-[0.97]',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4 py-2', // WCAG 2.5.5: min 44px height
        sm: 'h-11 rounded-md px-3', // WCAG 2.5.5: min 44px height
        lg: 'h-12 rounded-md px-8', // WCAG 2.5.5: larger for emphasis
        icon: 'h-11 w-11', // WCAG 2.5.5: min 44x44px touch target
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  success?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, success = false, loadingText, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    // Add data attributes for E2E testing
    const hasHoverEffect = variant !== 'link';

    const renderContent = () => {
      if (loading) {
        return (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {loadingText && <span>{loadingText}</span>}
          </>
        );
      }

      if (success) {
        return (
          <>
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                className="animate-checkmark"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="24"
                strokeDashoffset="0"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Done</span>
          </>
        );
      }

      return children;
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        data-has-hover-effect={hasHoverEffect}
        data-transition-duration="200ms"
        data-loading={loading || undefined}
        data-success={success || undefined}
        {...props}
      >
        {renderContent()}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
