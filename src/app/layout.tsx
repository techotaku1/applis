import { Delius, Lexend } from 'next/font/google';

import { esMX } from '@clerk/localizations';
import { UserButton, ClerkProvider } from '@clerk/nextjs';
import { type Metadata } from 'next';

import '~/styles/globals.css';
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
    <ClerkProvider localization={esMX}>
      <html lang="es-MX" className={`${delius.variable} ${lexend.variable}`}>
        <body>
          <header className="fixed top-0 right-0 z-50 flex h-16 items-center justify-end gap-4 p-4">
            <UserButton />
          </header>
          <Background />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
