'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ZoomLevel = '90' | '100' | '110' | '120' | '130';

const STORAGE_KEY = 'pharmapos-zoom';

/**
 * Apply zoom using CSS `zoom` on <html>.
 * After applying, dispatches a custom event so Lenis and other
 * scroll-dependent components can reinitialize with correct dimensions.
 */
export function applyZoomToDocument(zoom: ZoomLevel): void {
  if (typeof document === 'undefined') return;
  const factor = parseInt(zoom) / 100;
  const html = document.documentElement;

  // Clean up any previous approaches
  document.body.style.zoom = '';
  document.body.style.transform = '';
  document.body.style.width = '';
  document.body.style.height = '';
  html.style.fontSize = '';

  if (factor === 1) {
    html.style.zoom = '';
    html.style.removeProperty('--app-zoom');
  } else {
    html.style.zoom = String(factor);
    html.style.setProperty('--app-zoom', String(factor));
  }

  // Notify scroll engines to recalculate after zoom settles
  // Use two rAFs to ensure the browser has painted the zoomed layout
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Trigger resize event — Lenis listens to this to recalculate scroll dimensions
      window.dispatchEvent(new Event('resize'));
      // Also dispatch a custom event for our ZoomSync to handle
      window.dispatchEvent(new CustomEvent('pharmapos-zoom-changed', { detail: { zoom, factor } }));
    });
  });
}

interface ZoomState {
  zoom: ZoomLevel;
  setZoom: (zoom: ZoomLevel) => void;
}

export const useZoomStore = create<ZoomState>()(
  persist(
    (set) => ({
      zoom: '100',
      setZoom: (zoom) => {
        set({ zoom });
        applyZoomToDocument(zoom);
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({ zoom: s.zoom }),
      onRehydrateStorage: () => (state) => {
        if (state?.zoom) applyZoomToDocument(state.zoom);
      },
    },
  ),
);
