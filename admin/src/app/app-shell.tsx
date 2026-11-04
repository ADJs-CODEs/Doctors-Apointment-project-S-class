'use client';

import { type ReactNode, useContext, useEffect, useRef } from 'react';
import LoadingBar, { type LoadingBarRef } from 'react-top-loading-bar';
import { Toaster } from 'sonner';
import { CallProvider } from '@/components/calls/CallLayer';
import DoctorAI from '@/components/DoctorAI';
import { API_PATHS } from '@/utils/apiPath';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import AdminContextProvider, { AdminContext } from '@/context/AdminContext';
import AppContextProvider from '@/context/AppContext';
import DoctorContextProvider, { DoctorContext } from '@/context/DoctorContext';
import { DoctorMessagesProvider } from '@/context/DoctorMessagesContext';
import { PharmacyContextProvider, usePharmacy } from '@/context/PharmacyContext';
import { NavigationWatcher } from '@/lib/navigation';
import DoctorFirstLogin from '@/screens/Doctor/DoctorFirstLogin';
import Login from '@/screens/Login';
import ChangePasswordGate from '@/screens/Pharmacy/ChangePassword';
import PharmacyHome from '@/screens/Pharmacy/PharmacyHome';
import { usePathname } from 'next/navigation';
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
  const { dToken, profileData } = useContext(DoctorContext) as DoctorContextType;
  const { pToken, staff } = usePharmacy();
  const pathname = usePathname();

  const loadingBar = (
    <>
      <RequestLoadingBar />
      <NavigationWatcher />
    </>
  );

  // Logged out: every address shows the login screen.
  if (!aToken && !dToken && !pToken) {
    return (
      <>
        {loadingBar}
        <Login />
        <Toaster richColors position="top-right" />
      </>
    );
  }

  // Pharmacy personnel only ever see pharmacy pages; first they replace their emailed password.
  if (pToken && !aToken && !dToken) {
    if (staff?.mustChangePassword) {
      return (
        <>
          {loadingBar}
          <ChangePasswordGate />
          <Toaster richColors position="top-right" />
        </>
      );
    }
    const pharmacyPage = /^\/pharmacy(-staff|-settings|-products|-orders|-earnings)?$/.test(pathname) ? children : <PharmacyHome />;
    return (
      <div className="relative isolate bg-canvas min-h-screen flex flex-col overflow-x-clip">
        <Glow />
        {loadingBar}
        <Toaster richColors position="top-right" />
        <Navbar />
        <div className="flex flex-col lg:flex-row items-start flex-1 w-full">
          <Sidebar />
          <div className="flex-1 w-full overflow-x-hidden p-4 sm:p-6 lg:p-0">{pharmacyPage}</div>
        </div>
      </div>
    );
  }

  // doctors the admin added replace their emailed starting password first
  if (dToken && !aToken && profileData && profileData.mustChangePassword) {
    return (
      <>
        {loadingBar}
        <DoctorFirstLogin />
        <Toaster richColors position="top-right" />
      </>
    );
  }

  const page = (
    <div className="relative isolate bg-canvas min-h-screen flex flex-col overflow-x-clip">
      <Glow />
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

  // doctors get live patient messages, the unread badge and in-app calls
  return dToken ? (
    <DoctorMessagesProvider token={dToken}>
      <CallProvider side="doctor" apiBase={API_PATHS.DOCTOR.CALLS}>
        {page}
      </CallProvider>
    </DoctorMessagesProvider>
  ) : (
    page
  );
}

/** The brand's soft teal and blue glow behind the panel (same as the patient site). */
function Glow() {
  return (
    <>
      <div aria-hidden="true" className="fixed -z-10 rounded-full blur-[60px] opacity-45 pointer-events-none w-[46vw] h-[46vw] bg-[#CDEFED] -right-[12vw] -top-[10vw]" />
      <div aria-hidden="true" className="fixed -z-10 rounded-full blur-[60px] opacity-45 pointer-events-none w-[40vw] h-[40vw] bg-[#DCE3FA] -left-[14vw] top-[40vh]" />
    </>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AdminContextProvider>
      <DoctorContextProvider>
        <PharmacyContextProvider>
          <AppContextProvider>
            <Shell>{children}</Shell>
          </AppContextProvider>
        </PharmacyContextProvider>
      </DoctorContextProvider>
    </AdminContextProvider>
  );
}
