'use client';

import { useEffect } from 'react';
import { useThemeStore, applyThemeToDocument } from '@/lib/store/theme.store';

/** Keeps `html.dark` in sync with persisted theme and OS changes when mode is `system`. */
export function ThemeSync() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeToDocument('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  return null;
}
