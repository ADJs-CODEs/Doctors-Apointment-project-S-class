import type { Metadata } from 'next';
import { IBM_Plex_Mono, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import ClientRoot from './client-root';
import '../index.css';

// the redesign's two faces, self-hosted by Next; pages use them through the CSS variables
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500'], variable: '--font-plex-mono', display: 'swap' });

export const metadata: Metadata = {
  title: "ADJ's CODEs Pharmaceutical",
  description:
    'Book clinic and video visits with specialists, take your medicines on time, keep your family in the loop and get medicine delivered.',
  icons: { icon: '/favicon.svg', apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: "ADJ's CODEs", statusBarStyle: 'default' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${plexMono.variable}`}>
      <body>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
