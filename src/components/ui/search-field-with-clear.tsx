'use client';

import type { CSSProperties, InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SearchFieldWithClearProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string;
  onValueChange: (next: string) => void;
  iconSize?: number;
  wrapperClassName?: string;
};

/** Put background/border on wrapper; keep text color on the input (caret / typed text). */
function splitFieldStyle(style: InputHTMLAttributes<HTMLInputElement>['style']): {
  wrap: CSSProperties | undefined;
  input: CSSProperties | undefined;
} {
  if (style == null || typeof style !== 'object' || Array.isArray(style)) {
    return { wrap: style as CSSProperties | undefined, input: undefined };
  }
  const { color, ...rest } = style as CSSProperties & { color?: string };
  const hasRest = Object.keys(rest).length > 0;
  const hasColor = color !== undefined && color !== '';
  return {
    wrap: hasRest ? (rest as CSSProperties) : undefined,
    input: hasColor ? { color } : undefined,
  };
}

/**
 * Search input with leading icon and trailing clear (X). Layout is a 2-column grid so the
 * icon column can use flex centering against the real row height (same as the input), avoiding
 * absolute-position quirks with replaced-element height.
 */
export function SearchFieldWithClear({
  value,
  onValueChange,
  iconSize = 15,
  wrapperClassName = '',
  className = '',
  ...inputProps
}: SearchFieldWithClearProps) {
  const { style, ...restInput } = inputProps;
  const { wrap: wrapStyle, input: inputColorStyle } = splitFieldStyle(style);

  return (
    <div
      className={cn(
        'relative grid w-full min-w-0 grid-cols-[2.5rem_1fr] items-center gap-0 overflow-hidden rounded-lg',
        wrapperClassName,
      )}
      style={wrapStyle}
    >
      <div className="flex items-center justify-center pl-0.5" aria-hidden>
        <Search
          size={iconSize}
          className="block shrink-0"
          style={{ color: 'var(--text-muted)' }}
        />
      </div>
      <input
        {...restInput}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        style={inputColorStyle}
        className={cn(
          'min-w-0 border-0 bg-transparent py-2 pl-0 pr-10 text-sm outline-none ring-0 focus:outline-none focus:ring-0',
          className,
          '!rounded-none !pl-0',
        )}
      />
      {value ? (
        <div className="pointer-events-none absolute inset-y-0 right-1 z-10 flex items-center pr-0.5 sm:right-1.5">
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
