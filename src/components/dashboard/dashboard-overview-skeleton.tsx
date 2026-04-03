'use client';

export function DashboardOverviewSkeleton() {
  return (
    <div className="w-full max-w-6xl space-y-6 p-6 md:p-10" style={{ background: 'var(--surface-base)' }}>
      <div className="space-y-2">
        <div className="skeleton h-6 w-40 rounded-lg" />
        <div className="skeleton h-4 w-72 rounded-md" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="skeleton h-48 w-full rounded-2xl" />
    </div>
  );
}
