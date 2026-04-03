import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // PharmaPOS Pro brand — always use CSS vars, never hardcode hex in JS
        teal: {
          DEFAULT: 'var(--color-teal)',
          dark: 'var(--color-teal-dark)',
          light: 'var(--color-teal-light)',
        },
        gold: {
          DEFAULT: 'var(--color-gold)',
          surface: 'var(--color-gold-surface)',
        },
        // Classification badge colours
        otc: 'var(--color-otc)',
        pom: 'var(--color-pom)',
        controlled: 'var(--color-controlled)',
        // Surfaces
        surface: {
          base: 'var(--surface-base)',
          card: 'var(--surface-card)',
          border: 'var(--surface-border)',
          hover: 'var(--surface-hover)',
        },
        // Text
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // Error state shake — ui-ux non-negotiable
        shake: 'shake 0.4s ease-in-out',
        /** Landing header news ticker — half-width translate because content is duplicated */
        'pharma-ticker': 'pharma-ticker 75s linear infinite',
        /** Dashboard footprint marquee — slightly slower for reading + linked titles */
        'pharma-ticker-dashboard': 'pharma-ticker 95s linear infinite',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        'pharma-ticker': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
