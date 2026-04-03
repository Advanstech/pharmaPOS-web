import { cn, formatGhsAmount } from '@/lib/utils';

/**
 * Ghana Cedi display: the Unicode ₵ glyph often renders larger than surrounding digits in system fonts.
 * Keep "GH" + amount aligned; shrink only the cedi sign.
 */
export function GhsMoney({
  amount,
  className,
  symbolClassName,
}: {
  amount: number;
  className?: string;
  symbolClassName?: string;
}) {
  const num = formatGhsAmount(amount);
  return (
    <span className={cn('tabular-nums inline-flex items-baseline gap-0 leading-[0.95]', className)}>
      <span className="text-inherit">GH</span>
      <span
        className={cn(
          'inline-block text-[0.76em] leading-none translate-y-[0.03em]',
          symbolClassName,
        )}
        aria-hidden
      >
        ₵
      </span>
      <span>{num}</span>
    </span>
  );
}
