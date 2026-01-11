import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorMessage?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, errorMessage, ...props }, ref) => {
    const [shouldShake, setShouldShake] = React.useState(false);

    // Trigger shake animation when error becomes true
    React.useEffect(() => {
      if (error) {
        setShouldShake(true);
        const timer = setTimeout(() => setShouldShake(false), 400); // Duration of shake animation
        return () => clearTimeout(timer);
      }
    }, [error]);

    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus-visible:ring-red-500',
            shouldShake && 'animate-shake',
            className
          )}
          ref={ref}
          aria-invalid={error}
          aria-describedby={error && errorMessage ? `${props.id}-error` : undefined}
          {...props}
        />
        {error && errorMessage && (
          <p
            id={`${props.id}-error`}
            className="mt-1 text-sm text-red-500 animate-slide-down"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
