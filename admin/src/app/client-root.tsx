'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

// The panel reads the admin/doctor tokens from localStorage as it starts, which only
// exists in the browser, so it renders client-side (as the Vite version did).
const AppShell = dynamic(() => import('./app-shell'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#F8F9FD]" />,
});

export default function ClientRoot({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
