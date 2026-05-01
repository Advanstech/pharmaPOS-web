import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { ApolloProvider } from '@/lib/apollo/apollo-provider';
import { LenisProvider } from '@/lib/lenis/lenis-provider';
import { ThemeSync } from '@/components/theme-sync';
import { ZoomSync } from '@/components/zoom-sync';
import { ZoomWrapper } from '@/components/zoom-wrapper';
import { ToastProvider, ConfirmProvider, PromptProvider } from '@/components/ui/toast';

const THEME_INIT = `(function(){
  try {
    var raw = localStorage.getItem('azzay-pharmacy-theme');
    var theme = 'system';
    if (raw) {
      var p = JSON.parse(raw);
      if (p && p.state && typeof p.state.theme === 'string') theme = p.state.theme;
    }
    var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    var zRaw = localStorage.getItem('azzay-pharmacy-zoom');
    if (zRaw) {
      var z = JSON.parse(zRaw);
      if (z && z.state && z.state.zoom && z.state.zoom !== '100') {
        document.documentElement.style.zoom = String(parseInt(z.state.zoom) / 100);
      }
    }
  } catch (e) {}
})();`;

// Optimize font loading with display: swap and preload
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
  adjustFontFallback: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  preload: true,
  fallback: ['Courier New', 'monospace'],
  adjustFontFallback: true,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Azzay Pharmacy Pro - AI-Powered Pharmacy Management',
    template: '%s | Azzay Pharmacy Pro',
  },
  description: 'AI-powered pharmacy POS for Azzay Pharmacy — Accra, Ghana. Lightning-fast offline POS, intelligent inventory, and FDA compliance built-in.',
  keywords: ['Azzay Pharmacy', 'pharmacy POS', 'Ghana pharmacy software', 'inventory', 'accounting', 'FDA compliance', 'offline POS'],
  authors: [{ name: 'Advansis Technologies' }],
  creator: 'Advansis Technologies',
  publisher: 'Advansis Technologies',
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_GH',
    siteName: 'Azzay Pharmacy Pro',
    title: 'Azzay Pharmacy Pro - AI-Powered Pharmacy Management',
    description: 'Lightning-fast offline POS, intelligent inventory, and FDA compliance built-in.',
    url: '/',
    images: [{ url: '/icon.png', width: 512, height: 512, alt: 'Azzay Pharmacy logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Azzay Pharmacy Pro - AI-Powered Pharmacy Management',
    description: 'Lightning-fast offline POS, intelligent inventory, and FDA compliance built-in.',
    images: ['/icon.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Azzay Pharmacy',
  },
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
  },
  category: 'business',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#064E3B' },
    { media: '(prefers-color-scheme: dark)', color: '#06392F' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow zoom for accessibility
  userScalable: true, // Allow zoom for accessibility
  viewportFit: 'cover',
};

// React 19: children is a plain prop, not wrapped in FC<{children}>
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html 
      lang="en" 
      className={`${inter.variable} ${jetbrainsMono.variable}`} 
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to API for faster requests */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'} />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/manifest.json" as="fetch" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        {/* Inline critical theme script to prevent flash */}
        <Script id="azzay-pharmacy-theme-init" strategy="beforeInteractive">
          {THEME_INIT}
        </Script>
        
        <ApolloProvider>
          <ThemeSync />
          <ZoomSync />
          <ToastProvider>
            <ConfirmProvider>
              <PromptProvider>
                <LenisProvider>
                  <ZoomWrapper>
                    {children}
                  </ZoomWrapper>
                </LenisProvider>
              </PromptProvider>
            </ConfirmProvider>
          </ToastProvider>
        </ApolloProvider>
      </body>
    </html>
  );
}
