'use client';

import { type ReactNode, useContext, useEffect, useRef } from 'react';
import LoadingBar, { type LoadingBarRef } from 'react-top-loading-bar';
import { Toaster } from 'sonner';
import DoctorAI from '@/components/DoctorAI';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import AdminContextProvider, { AdminContext } from '@/context/AdminContext';
import AppContextProvider from '@/context/AppContext';
import DoctorContextProvider, { DoctorContext } from '@/context/DoctorContext';
import { DoctorMessagesProvider } from '@/context/DoctorMessagesContext';
import { NavigationWatcher } from '@/lib/navigation';
import Login from '@/screens/Login';
import type { AdminContextType, DoctorContextType } from '@/types';
import { requestTracker } from '@/utils/requestTracker';

// Background requests that finish quicker than this never show the bar, so it doesn't
// flash. Page changes the user clicked show it immediately.
const SHOW_DELAY_MS = 200;

/** The top bar follows real API activity (see utils/requestTracker). */
function RequestLoadingBar() {
  const bar = useRef<LoadingBarRef>(null);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let visible = false;

    const show = () => {
      clearTimeout(showTimer);
      showTimer = undefined;
      if (visible) return;
      visible = true;
      bar.current?.continuousStart(15);
    };

    const unsubscribe = requestTracker.subscribe((busy, immediate) => {
      if (busy) {
        if (immediate) show();
        else if (!visible && !showTimer) showTimer = setTimeout(show, SHOW_DELAY_MS);
        return;
      }
      clearTimeout(showTimer);
      showTimer = undefined;
      if (visible) bar.current?.complete();
      visible = false;
    });
    return () => {
      clearTimeout(showTimer);
      unsubscribe();
    };
  }, []);

  return <LoadingBar ref={bar} color="#0D9488" height={3} shadow={false} />;
}

function Shell({ children }: { children: ReactNode }) {
  const { aToken } = useContext(AdminContext) as AdminContextType;
  const { dToken } = useContext(DoctorContext) as DoctorContextType;

  const loadingBar = (
    <>
      <RequestLoadingBar />
      <NavigationWatcher />
    </>
  );

  // Logged out: every address shows the login screen.
  if (!aToken && !dToken) {
    return (
      <>
        {loadingBar}
        <Login />
        <Toaster richColors position="top-right" />
      </>
    );
  }

  const page = (
    <div className="bg-[#F8F9FD] min-h-screen flex flex-col">
      {loadingBar}
      <Toaster richColors position="top-right" />
      <Navbar />
      <div className="flex flex-col lg:flex-row items-start flex-1 w-full">
        <Sidebar />
        <div className="flex-1 w-full overflow-x-hidden p-4 sm:p-6 lg:p-0">{children}</div>
      </div>
      {/* the clinical assistant floats on every doctor page */}
      {dToken && <DoctorAI />}
    </div>
  );

  // doctors get live patient messages and the unread badge
  return dToken ? <DoctorMessagesProvider token={dToken}>{page}</DoctorMessagesProvider> : page;
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AdminContextProvider>
      <DoctorContextProvider>
        <AppContextProvider>
          <Shell>{children}</Shell>
        </AppContextProvider>
      </DoctorContextProvider>
    </AdminContextProvider>
  );
}
