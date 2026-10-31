import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import ClientRoot from './client-root';
import '../index.css';

export const metadata: Metadata = {
  title: "ADJ's CODEs Pharmaceutical",
  description:
    'Book appointments with verified specialists, track your medication and stay connected with the people who care for you.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
