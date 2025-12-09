// Add this to your app/layout.tsx or create a separate component

// Option 1: Add these meta tags to your existing layout.tsx <head>
export const pwaMetaTags = `
  <!-- PWA Meta Tags -->
  <meta name="application-name" content="Polygens" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Polygens" />
  <meta name="format-detection" content="telephone=no" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="theme-color" content="#00d2d3" />
  
  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.json" />
  
  <!-- Apple Touch Icons -->
  <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
  <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
  <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-192x192.png" />
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-96x96.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-72x72.png" />
  
  <!-- Splash Screens for iOS -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
`;

// Option 2: Full layout.tsx example
/*
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Polygens',
  description: 'Decentralized Prediction Markets on Solana',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Polygens',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#00d2d3',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
*/
