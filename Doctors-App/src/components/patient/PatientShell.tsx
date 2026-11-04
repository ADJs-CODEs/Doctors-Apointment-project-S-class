"use client";

import {
  RiAddLine,
  RiApps2Line,
  RiCalendarCheckLine,
  RiCapsuleLine,
  RiShoppingBag3Line,
  RiChat3Line,
  RiCloseLine,
  RiCustomerService2Line,
  RiHeart3Line,
  RiHome5Line,
  RiInformationLine,
  RiLogoutBoxRLine,
  RiSettings3Line,
  RiStethoscopeLine,
  RiTeamLine,
  RiUser3Line,
  RiWallet3Line,
} from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useContext, useEffect, useState } from "react";
import NotificationBell from "@/components/NotificationBell";
import ConfirmLogout from "@/components/ConfirmLogout";
import { BRAND } from "@/components/brand/Logo";
import { AppContext } from "@/Context/AppContext";
import { useMessages } from "@/Context/MessagesContext";
import { Link, NavLink } from "@/lib/navigation";
import { useLogout } from "@/hooks/useLogout";
import { syncPush } from "@/utils/push";
import type { AppContextType } from "@/types";

type NavItem = { label: string; path: string; icon: typeof RiHome5Line };

const MAIN_NAV: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: RiHome5Line },
  { label: "Appointments", path: "/my-appointments", icon: RiCalendarCheckLine },
  { label: "Medications", path: "/medication-history", icon: RiCapsuleLine },
  { label: "Messages", path: "/messages", icon: RiChat3Line },
  { label: "Pharmacy", path: "/shop", icon: RiShoppingBag3Line },
  { label: "Find a doctor", path: "/doctors", icon: RiStethoscopeLine },
  { label: "Care circle", path: "/watching-over", icon: RiTeamLine },
  { label: "Wish Well", path: "/wish-well", icon: RiHeart3Line },
];

const ACCOUNT_NAV: NavItem[] = [
  { label: "Wallet", path: "/wallet", icon: RiWallet3Line },
  { label: "Medical profile", path: "/my-profile", icon: RiUser3Line },
  { label: "Settings", path: "/account-settings", icon: RiSettings3Line },
];

const HELP_NAV: NavItem[] = [
  { label: "About", path: "/about", icon: RiInformationLine },
  { label: "Contact", path: "/contact", icon: RiCustomerService2Line },
];

// The phone tab bar has room for four sections; the rest live under "More".
const TAB_BAR = MAIN_NAV.slice(0, 4);
const MORE_MENU = [...MAIN_NAV.slice(4), ...ACCOUNT_NAV, ...HELP_NAV];

function Logo() {
  return (
    <Link to="/dashboard" className="flex items-baseline gap-2 shrink-0">
      <b className="text-[20px] font-extrabold tracking-[-0.5px] text-ink">{BRAND.name}</b>
      <span className="text-[12px] font-semibold text-ink-3 whitespace-nowrap hidden sm:inline">{BRAND.by}</span>
    </Link>
  );
}

/** Unread doctor messages; red when one of them is urgent. */
function MessagesBadge({ className = "" }: { className?: string }) {
  const { unread, urgentUnread } = useMessages();
  if (!unread) return null;
  return (
    <span
      className={`num min-w-5 h-5 px-1.5 rounded-full text-[11px] text-white flex items-center justify-center ${
        urgentUnread ? "bg-rose-600 animate-pulse" : "bg-brand"
      } ${className}`}
    >
      {unread > 99 ? "99+" : unread}
    </span>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] text-[15px] font-semibold transition-colors ${
          isActive ? "btn-ink" : "text-ink-2 hover:bg-white/80 hover:text-ink"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={19} className={isActive ? "" : "text-ink-3"} />
          {item.label}
          {item.path === "/messages" && <MessagesBadge className="ml-auto" />}
        </>
      )}
    </NavLink>
  );
}

function UserBadge({ compact = false }: { compact?: boolean }) {
  const { userData } = useContext(AppContext) as AppContextType;
  if (!userData) return null;
  return (
    <Link to="/my-profile" className="flex items-center gap-3 min-w-0" aria-label="My profile">
      <img src={userData.image} alt="" className="w-10 h-10 rounded-xl object-cover border border-line bg-white shrink-0" />
      {!compact && (
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-ink truncate">{userData.name}</p>
          <p className="text-[12px] text-ink-3 truncate">{userData.email}</p>
        </div>
      )}
    </Link>
  );
}

export default function PatientShell({ children }: { children: ReactNode }) {
  const logout = useLogout();
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);

  // close the "More" sheet with Escape
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  // this device should follow whoever is logged in (no prompt if notifications are off)
  useEffect(() => {
    syncPush();
  }, []);

  const askLogout = () => {
    setMoreOpen(false);
    setConfirmOut(true);
  };

  return (
    <div className="relative isolate min-h-screen bg-canvas text-ink overflow-x-clip">
      {/* the brand's soft teal and blue glow */}
      <div aria-hidden="true" className="fixed -z-10 rounded-full blur-[60px] opacity-50 pointer-events-none w-[46vw] h-[46vw] bg-[#CDEFED] -right-[12vw] -top-[10vw]" />
      <div aria-hidden="true" className="fixed -z-10 rounded-full blur-[60px] opacity-50 pointer-events-none w-[40vw] h-[40vw] bg-[#DCE3FA] -left-[14vw] top-[40vh]" />

      {/* --- desktop sidebar --- */}
      <aside className="hidden lg:flex fixed inset-y-3 left-3 w-[272px] flex-col glass rounded-[22px] px-3.5 py-5 z-40">
        <div className="px-2.5 mb-6">
          <Logo />
        </div>

        <nav className="flex-1 overflow-y-auto space-y-0.5 [scrollbar-width:thin]">
          {MAIN_NAV.map((item) => (
            <SidebarLink key={item.path} item={item} />
          ))}
          <p className="px-3.5 pt-5 pb-1.5 text-[12px] font-bold text-ink-3">Account</p>
          {ACCOUNT_NAV.map((item) => (
            <SidebarLink key={item.path} item={item} />
          ))}
        </nav>

        <div className="pt-3 mt-3 border-t border-line space-y-3">
          <div className="flex gap-4 px-3.5 text-[13px] font-semibold text-ink-3">
            {HELP_NAV.map((item) => (
              <Link key={item.path} to={item.path} className="hover:text-brand-ink">
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 px-1.5">
            <UserBadge />
            <button
              type="button"
              onClick={askLogout}
              title="Log out"
              aria-label="Log out"
              className="p-2.5 rounded-xl text-ink-3 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
            >
              <RiLogoutBoxRLine size={19} />
            </button>
          </div>
        </div>
      </aside>

      {/* --- top bar (phones and tablets) --- */}
      <header className="lg:hidden sticky top-0 z-40 px-3 pt-3">
        <div className="glass rounded-[18px] flex items-center justify-between gap-3 pl-4 pr-2.5 py-2">
          <Logo />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserBadge compact />
          </div>
        </div>
      </header>

      {/* --- page content --- */}
      <div className="lg:pl-[290px]">
        <header className="hidden lg:flex sticky top-0 z-30 px-7 pt-3">
          <div className="glass rounded-[18px] w-full flex items-center justify-end gap-3 px-3 py-2">
            <Link to="/doctors" className="btn btn-ink !py-2 !px-3.5 !text-[14px] !rounded-xl">
              <RiAddLine size={17} /> Book a visit
            </Link>
            <NotificationBell />
          </div>
        </header>
        {/* bottom padding keeps content clear of the phone tab bar */}
        <main className="px-4 sm:px-6 lg:px-7 pt-4 pb-28 lg:pb-12">{children}</main>
      </div>

      {/* --- phone tab bar --- */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="glass rounded-[20px] grid grid-cols-5">
          {TAB_BAR.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${isActive ? "text-brand-ink" : "text-ink-3"}`
                }
              >
                <span className="relative">
                  <Icon size={22} />
                  {item.path === "/messages" && (
                    <MessagesBadge className="absolute -top-1.5 -right-3 !min-w-4 !h-4 !text-[9px] !px-1" />
                  )}
                </span>
                {item.label === "Find a doctor" ? "Doctors" : item.label}
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold text-ink-3"
          >
            <RiApps2Line size={22} />
            More
          </button>
        </div>
      </nav>

      {/* --- "More" sheet (phones) --- */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-canvas rounded-t-[28px] px-4 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(11,37,69,0.15)]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <UserBadge />
                <button type="button" aria-label="Close" onClick={() => setMoreOpen(false)} className="p-2 rounded-xl text-ink-3 hover:bg-white">
                  <RiCloseLine size={22} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MORE_MENU.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMoreOpen(false)}
                      className="surface flex flex-col items-center gap-2 p-3.5 rounded-[16px] text-ink text-[13px] font-semibold text-center"
                    >
                      <Icon size={22} className="text-brand-ink" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={askLogout}
                className="btn w-full mt-3 bg-rose-50 text-rose-600 border border-rose-100"
              >
                <RiLogoutBoxRLine size={18} />
                Log out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmLogout open={confirmOut} onCancel={() => setConfirmOut(false)} onConfirm={logout} />
    </div>
  );
}
