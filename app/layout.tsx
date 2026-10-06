import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Analytics } from '@vercel/analytics/next';
import { CookieBanner } from '@/components/cookie-banner'

// ⚙️ MANTENIMIENTO: cambia a false para volver al estado normal
const MAINTENANCE_MODE = false




export const metadata: Metadata = {
  title: 'Sabitas · Handgemachte Unikate aus der Schweiz',
  description: 'Taschen aus geliebtem Jeansstoff, kuschelige Hoodies und liebevolle Deko \u2013 jedes St\u00fcck ein Unikat, von Hand gefertigt.',
  generator: 'Lweb',
  icons: {
    icon: '/favicon.png',
    apple: '/icon-192x192.png',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#6B4F93',
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  if (MAINTENANCE_MODE) {
    return (
      <html lang="de">
        <body style={{ margin: 0, padding: 0 }}>
          <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(160deg, #f8f9fa 0%, #e9ecef 100%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
            textAlign: 'center', padding: '2rem',
          }}>

   
          </div>
        </body>
      </html>
    )
  }

  return (
    <html lang="en">
      <body>{children} <Analytics /><CookieBanner /></body>
    </html>
  )
}
