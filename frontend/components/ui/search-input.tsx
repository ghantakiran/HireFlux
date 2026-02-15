'use client';

import * as React from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  isSearching?: boolean;
  showClear?: boolean;
  'data-testid'?: string;
  wrapperClassName?: string;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      isSearching = false,
      showClear = true,
      placeholder = 'Search...',
      className,
      wrapperClassName,
      'data-testid': dataTestId,
      ...props
    },
    ref
  ) => {
    const handleClear = () => {
      onChange('');
    };

    return (
      <div className={cn('relative', wrapperClassName)}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isSearching ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <Input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleClear();
            props.onKeyDown?.(e);
          }}
          placeholder={placeholder}
          className={cn('pl-10 pr-9', className)}
          data-testid={dataTestId}
          aria-label={typeof placeholder === 'string' ? placeholder : 'Search'}
          {...props}
        />
        {showClear && value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';

export { SearchInput };
