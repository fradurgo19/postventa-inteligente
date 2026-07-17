import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

/** Logo PARTEQUIPOS en círculo (Cloudinary: crop + r_max + PNG transparente) */
const APP_ICON_CIRCLE =
  'https://res.cloudinary.com/dbufrzoda/image/upload/c_fill,g_center,w_512,h_512,r_max,f_png/v1762897590/Logo2_eedoer.jpg';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000')
  ),
  title: 'PARTEQUIPOS MAQUINARIA - Plataforma de Posventa Inteligente',
  description: 'Plataforma empresarial de gestión de posventa para equipos',
  icons: {
    icon: [
      { url: APP_ICON_CIRCLE, type: 'image/png', sizes: '32x32' },
      { url: APP_ICON_CIRCLE, type: 'image/png', sizes: '192x192' },
    ],
    shortcut: APP_ICON_CIRCLE,
    apple: [{ url: APP_ICON_CIRCLE, sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'PARTEQUIPOS MAQUINARIA - Posventa Inteligente',
    description: 'Plataforma empresarial de gestión de posventa para equipos',
    locale: 'es_CO',
    type: 'website',
    images: [{ url: APP_ICON_CIRCLE, width: 512, height: 512, alt: 'PARTEQUIPOS MAQUINARIA' }],
  },
  twitter: {
    card: 'summary',
    title: 'PARTEQUIPOS MAQUINARIA - Posventa Inteligente',
    description: 'Plataforma empresarial de gestión de posventa para equipos',
    images: [APP_ICON_CIRCLE],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
