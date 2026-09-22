import { useState, useEffect } from 'react';

/**
 * Hook to detect if WebGL is supported by the user's browser.
 * Returns true if supported, false otherwise.
 */
export function useWebGL() {
  const [hasWebGL, setHasWebGL] = useState(true); // Assume true initially to avoid flicker

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const supported = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
      setHasWebGL(supported);
    } catch (e) {
      setHasWebGL(false);
    }
  }, []);

  return hasWebGL;
}
