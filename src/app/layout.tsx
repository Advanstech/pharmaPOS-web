import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { ApolloProvider } from '@/lib/apollo/apollo-provider';
import { LenisProvider } from '@/lib/lenis/lenis-provider';
import { ThemeSync } from '@/components/theme-sync';

const THEME_INIT = `(function(){
  try {
    var raw = localStorage.getItem('pharmapos-theme');
    var theme = 'system';
    if (raw) {
      var p = JSON.parse(raw);
      if (p && p.state && typeof p.state.theme === 'string') theme = p.state.theme;
    }
    var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();`;

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'PharmaPOS Pro',
  description: 'AI-powered pharmacy POS for Azzay Pharmacy — Accra, Ghana',
  keywords: ['PharmaPOS', 'pharmacy POS', 'Ghana pharmacy software', 'inventory', 'accounting'],
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
    siteName: 'PharmaPOS Pro',
    title: 'PharmaPOS Pro',
    description: 'AI-powered pharmacy POS for Azzay Pharmacy — Accra, Ghana',
    url: '/',
    images: [{ url: '/icon.png', width: 512, height: 512, alt: 'PharmaPOS logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PharmaPOS Pro',
    description: 'AI-powered pharmacy POS for Azzay Pharmacy — Accra, Ghana',
    images: ['/icon.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PharmaPOS',
  },
};

export const viewport: Viewport = {
  themeColor: '#006D77',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// React 19: children is a plain prop, not wrapped in FC<{children}>
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body>
        <Script id="pharmapos-theme-init" strategy="beforeInteractive">
          {THEME_INIT}
        </Script>
        <ApolloProvider>
          <ThemeSync />
          <LenisProvider>
            {children}
          </LenisProvider>
        </ApolloProvider>
      </body>
    </html>
  );
}
