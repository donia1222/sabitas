import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Analytics } from '@vercel/analytics/next';
import { Bienvenida } from '@/components/bienvenida'

// ⚙️ MANTENIMIENTO: cambia a false para volver al estado normal
const MAINTENANCE_MODE = false




const TITULO = 'Sabitas · Handgemachte Unikate aus der Schweiz'
const DESCRIPCION =
  'Taschen aus geliebtem Jeansstoff, kuschelige Hoodies und liebevolle Deko – jedes Stück ein Unikat, von Hand gefertigt.'

export const metadata: Metadata = {
  // Sin esto, las rutas de las imagenes de abajo salen relativas y WhatsApp
  // o Facebook no las encuentran.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://sabitas.vercel.app'),
  title: TITULO,
  description: DESCRIPCION,
  generator: 'Lweb',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  // Lo que se ve al pegar el enlace en WhatsApp, Facebook o iMessage. Sin
  // esto sale el icono gris de Vercel.
  openGraph: {
    type: 'website',
    siteName: 'Sabitas',
    title: TITULO,
    description: DESCRIPCION,
    locale: 'de_CH',
    images: [{ url: '/og-sabitas.jpg', width: 1200, height: 630, alt: 'Sabitas' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITULO,
    description: DESCRIPCION,
    images: ['/og-sabitas.jpg'],
  },
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
    <html lang="de">
      <head>
        {/* Decide la bienvenida ANTES de que se pinte nada: si se mirase
            desde React, la pagina ya se habria visto un instante. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!localStorage.getItem('sabitas_bienvenida_vista'))document.documentElement.dataset.bienvenida='1'}catch(e){}",
          }}
        />
        {/* Red de seguridad: los bloques con fade salen del servidor con
            opacity:0 y es el JavaScript quien los enciende. Si el JS no llega,
            esto los deja visibles en vez de dejar la pagina en blanco. */}
        <noscript>
          <style>{`[data-fade]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body><Bienvenida />{children} <Analytics /></body>
    </html>
  )
}
