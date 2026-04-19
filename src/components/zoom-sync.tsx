'use client';

import { useEffect } from 'react';
import { useZoomStore, applyZoomToDocument } from '@/lib/store/zoom.store';

/** Syncs the zoom store to the document on mount and changes. */
export function ZoomSync() {
  const zoom = useZoomStore(s => s.zoom);

  useEffect(() => {
    applyZoomToDocument(zoom);
  }, [zoom]);

  return null;
}
