import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'PARTEQUIPOS SAS - Plataforma de Posventa Inteligente',
  description: 'Plataforma empresarial de gestión de posventa para equipos',
  openGraph: {
    title: 'PARTEQUIPOS SAS - Posventa Inteligente',
    description: 'Plataforma empresarial de gestión de posventa para equipos',
    locale: 'es_CO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PARTEQUIPOS SAS - Posventa Inteligente',
    description: 'Plataforma empresarial de gestión de posventa para equipos',
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
