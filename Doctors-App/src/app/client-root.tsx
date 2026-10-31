'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

// The app shell reads the login token from localStorage as it starts, which only
// exists in the browser, so it renders client-side (as the Vite version did).
// Pages can move to server rendering one at a time later.
const AppShell = dynamic(() => import('./app-shell'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-dark-bg" />,
});

export default function ClientRoot({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
