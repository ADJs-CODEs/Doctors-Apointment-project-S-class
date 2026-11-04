'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { type ReactNode, useContext, useEffect, useRef } from 'react';
import LoadingBar, { type LoadingBarRef } from 'react-top-loading-bar';
import { Toaster } from 'sonner';
import { CallProvider } from '@/components/calls/CallLayer';
import ChatBot from '@/components/ChatBot';
import { API_PATHS } from '@/utils/apiPath';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import AppContextProvider, { AppContext } from '@/Context/AppContext';
import { EmojiProvider } from '@/Context/EmojiContext';
import { MessagesProvider } from '@/Context/MessagesContext';
import { NavigationWatcher } from '@/lib/navigation';
import PatientShell from '@/components/patient/PatientShell';
import GiftCelebration from '@/components/wishwell/GiftCelebration';
import { usePathname, useRouter } from 'next/navigation';
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

// Pages only a logged-in patient can use; logged-out visitors are sent to /login.
const PATIENT_ONLY = [
  '/dashboard',
  '/my-appointments',
  '/medication-history',
  '/messages',
  '/wallet',
  '/shop',
  '/call/',
  '/call-incoming/',
  '/my-profile',
  '/account-settings',
  '/watching-over',
  '/watching/',
  '/verify',
];
// Pages that keep the public website look even when logged in.
const PUBLIC_LOOK = ['/about', '/contact', '/login', '/forgot-password', '/reset-password'];

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`));

function Shell({ children }: { children: ReactNode }) {
  const { userData, token } = useContext(AppContext) as AppContextType;
  const pathname = usePathname() ?? '/';
  const router = useRouter();

  const loggedIn = !!token;
  // logged-in patients use the app, not the landing page; appointments is their home tab
  const redirectTo =
    loggedIn && pathname === '/'
      ? '/my-appointments'
      : !loggedIn && matches(pathname, PATIENT_ONLY)
        ? '/login'
        : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  const overlays = (
    <>
      <RequestLoadingBar />
      <NavigationWatcher />
      <Toaster position="top-right" richColors expand={false} />
    </>
  );

  if (redirectTo) return overlays;

  if (loggedIn && !matches(pathname, PUBLIC_LOOK)) {
    return (
      <EmojiProvider userId={userData?._id}>
        <MessagesProvider token={token}>
          <CallProvider side="patient" apiBase={API_PATHS.CALLS}>
            {overlays}
            <PatientShell>{children}</PatientShell>
            <ChatBot aboveTabBar />
            <GiftCelebration />
          </CallProvider>
        </MessagesProvider>
      </EmojiProvider>
    );
  }

  // the landing page brings its own navigation, footer and full-width layout
  if (pathname === '/') return <>{overlays}{children}</>;

  return (
    <EmojiProvider userId={userData?._id}>
      <div className="relative isolate min-h-screen flex flex-col bg-canvas text-ink overflow-x-clip">
        {/* the same soft teal and blue glow as the landing page */}
        <div aria-hidden="true" className="fixed -z-10 rounded-full blur-[60px] opacity-55 pointer-events-none w-[46vw] h-[46vw] bg-[#CDEFED] -right-[12vw] -top-[10vw]" />
        <div aria-hidden="true" className="fixed -z-10 rounded-full blur-[60px] opacity-55 pointer-events-none w-[40vw] h-[40vw] bg-[#DCE3FA] -left-[14vw] top-[40vh]" />
        {overlays}
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
