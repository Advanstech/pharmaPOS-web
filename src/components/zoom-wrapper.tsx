'use client';

/**
 * ZoomWrapper is no longer needed — zoom is applied directly on <html>
 * via the zoom.store. This is a passthrough component kept for compatibility.
 */
export function ZoomWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
