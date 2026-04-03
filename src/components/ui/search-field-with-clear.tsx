'use client';

import type { InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';

export type SearchFieldWithClearProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string;
  onValueChange: (next: string) => void;
  iconSize?: number;
  wrapperClassName?: string;
};

/**
 * Search input with leading icon and trailing clear (X). Clear control uses inset-y + flex
 * centering so it stays vertically centered (avoids transform conflicts from motion or SVG baseline quirks).
 */
export function SearchFieldWithClear({
  value,
  onValueChange,
  iconSize = 15,
  wrapperClassName = '',
  className = '',
  ...inputProps
}: SearchFieldWithClearProps) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <Search
        size={iconSize}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--text-muted)' }}
        aria-hidden
      />
      <input
        {...inputProps}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={`${className} pl-10`}
      />
      {value ? (
        <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center pr-0.5 sm:right-1.5">
          <button
            type="button"
            onClick={() => onValueChange('')}
            className="pointer-events-auto flex size-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
            aria-label="Clear search"
          >
            <X size={14} strokeWidth={2} className="block shrink-0 text-[var(--text-muted)]" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
