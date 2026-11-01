import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import ClientRoot from './client-root';
import '../index.css';

export const metadata: Metadata = {
  title: "ADJ's CODEs Admin",
  description: 'Admin and doctor panel',
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
