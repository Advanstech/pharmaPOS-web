export function ProductCardSkeleton() {
  return (
    <div
      className="rounded-2xl p-3 overflow-hidden"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
      aria-hidden="true"
    >
      {/* Image area */}
      <div className="skeleton w-full h-[120px] rounded-xl mb-3" />
      {/* Badge */}
      <div className="skeleton h-4 w-14 rounded-full mb-2" />
      {/* Name */}
      <div className="skeleton h-4 w-full rounded mb-1.5" />
      <div className="skeleton h-3 w-2/3 rounded mb-2" />
      {/* Price */}
      <div className="skeleton h-5 w-24 rounded mb-2.5" />
      {/* Stock bar */}
      <div className="skeleton h-1 w-full rounded-full mb-3" />
      {/* Button */}
      <div className="skeleton h-10 w-full rounded-xl" />
    </div>
  );
}
