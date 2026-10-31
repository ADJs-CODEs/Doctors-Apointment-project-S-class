'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { type ReactNode, useContext, useEffect, useRef } from 'react';
import LoadingBar, { type LoadingBarRef } from 'react-top-loading-bar';
import { Toaster } from 'sonner';
import ChatBot from '@/components/ChatBot';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import AppContextProvider, { AppContext } from '@/Context/AppContext';
import { EmojiProvider } from '@/Context/EmojiContext';
import { NavigationWatcher } from '@/lib/navigation';
import type { AppContextType } from '@/types';
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

  return <LoadingBar ref={bar} color="#14b8a6" height={3} shadow={false} />;
}

// Public OAuth client id (not a secret); NEXT_PUBLIC_GOOGLE_CLIENT_ID overrides it.
const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??
  '703083582094-kl10rok1pn4cev8mcq6thlr67scdevmu.apps.googleusercontent.com';

function Shell({ children }: { children: ReactNode }) {
  const { userData } = useContext(AppContext) as AppContextType;

  return (
    <EmojiProvider userId={userData?._id}>
      <div className="px-2 sm:px-0 sm:mx-[10%] min-h-screen flex flex-col">
        <RequestLoadingBar />
        <NavigationWatcher />
        <Toaster position="top-right" richColors expand={false} />
        <Navbar />
        <main className="grow">{children}</main>
        <Footer />
        <ChatBot />
      </div>
    </EmojiProvider>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppContextProvider>
      <div className="min-h-screen bg-dark-bg text-slate-200 relative isolate selection:bg-primary/30 selection:text-white">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-[10%] -right-[5%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[140px] animate-pulse"
            style={{ animationDuration: '8s' }}
          />
          <div
            className="absolute bottom-[5%] -left-[10%] w-[40%] h-[40%] bg-electric-cyan/15 rounded-full blur-[120px] animate-pulse"
            style={{ animationDuration: '12s' }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-primary/5 rounded-full blur-[160px]" />
        </div>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <Shell>{children}</Shell>
        </GoogleOAuthProvider>
      </div>
    </AppContextProvider>
  );
}
