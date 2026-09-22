export function ProductCardSkeleton() {
  return (
    <div
      className="flex h-[130px] min-h-[130px] flex-row items-stretch gap-3 overflow-hidden rounded-[20px] border-2 p-3"
      style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}
      aria-hidden="true"
    >
      {/* Left: Image area */}
      <div className="h-full min-h-0 w-[100px] shrink-0 overflow-hidden rounded-[14px] sm:w-[110px]">
        <div className="skeleton h-full w-full" />
      </div>

      {/* Right: Content */}
      <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-0.5">
        {/* Badge */}
        <div className="skeleton h-5 w-12 rounded-full" />

        {/* Name area */}
        <div className="min-h-0 overflow-hidden py-1">
          <div className="skeleton mb-1.5 h-4 w-full rounded" />
          <div className="skeleton h-3 w-3/4 rounded" />
        </div>

        {/* Price + Button row */}
        <div className="flex shrink-0 items-end justify-between gap-2 border-t pt-2" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="min-w-0 flex-1">
            <div className="skeleton mb-1.5 h-5 w-20 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
          <div className="skeleton h-[38px] w-[70px] shrink-0 rounded-full" />
        </div>
      </div>
    </div>
  );
}
