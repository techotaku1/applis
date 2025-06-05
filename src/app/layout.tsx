import { Delius, Lexend } from 'next/font/google';

import '~/styles/globals.css';
import { esMX } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/nextjs';
import { type Metadata } from 'next';

import Background from '~/components/Background';

export const metadata: Metadata = {
  title: 'AppLis',
  description: 'Aplicación de gestión de trámites',
  icons: [{ rel: 'icon', url: './favicon.ico' }],
};

const delius = Delius({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-delius',
});

const lexend = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
  weight: ['400', '500', '600', '700', '800', '900'],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider localization={esMX} dynamic>
      <html lang="es-MX" className={`${delius.variable} ${lexend.variable}`}>
        <body>
          <Background />
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
