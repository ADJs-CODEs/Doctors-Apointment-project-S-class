'use client';

import { type ReactNode, useContext } from 'react';
import LoadingBar from 'react-top-loading-bar';
import { Toaster } from 'sonner';
import DoctorAI from '@/components/DoctorAI';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import AdminContextProvider, { AdminContext } from '@/context/AdminContext';
import AppContextProvider, { AppContext } from '@/context/AppContext';
import DoctorContextProvider, { DoctorContext } from '@/context/DoctorContext';
import Login from '@/screens/Login';
import type { AdminContextType, AppContextType, DoctorContextType } from '@/types';

function Shell({ children }: { children: ReactNode }) {
  const { aToken } = useContext(AdminContext) as AdminContextType;
  const { dToken } = useContext(DoctorContext) as DoctorContextType;
  const { progress, setProgress } = useContext(AppContext) as AppContextType;

  const loadingBar = (
    <LoadingBar color="#0D9488" progress={progress} onLoaderFinished={() => setProgress(0)} />
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

  return (
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
