"use client";

import {
  RiApps2Line,
  RiCalendarCheckLine,
  RiCapsuleLine,
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
} from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useContext, useEffect, useState } from "react";
import NotificationBell from "@/components/NotificationBell";
import { AppContext } from "@/Context/AppContext";
import { Link, NavLink, useNavigate } from "@/lib/navigation";
import type { AppContextType } from "@/types";

type NavItem = { label: string; path: string; icon: typeof RiHome5Line };

const MAIN_NAV: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: RiHome5Line },
  { label: "Appointments", path: "/my-appointments", icon: RiCalendarCheckLine },
  { label: "Medications", path: "/medication-history", icon: RiCapsuleLine },
  { label: "Find a doctor", path: "/doctors", icon: RiStethoscopeLine },
  { label: "Care circle", path: "/watching-over", icon: RiTeamLine },
  { label: "Wish Well", path: "/wish-well", icon: RiHeart3Line },
];

const ACCOUNT_NAV: NavItem[] = [
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
    <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0">
      <div className="w-10 h-10 bg-teal-50 rounded-full border-2 border-dotted border-teal-200 flex items-center justify-center">
        <span className="text-teal-600 font-black text-xl leading-none">+</span>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[15px] font-black text-slate-800 tracking-tighter uppercase whitespace-nowrap">
          ADJ&apos;s <span className="text-teal-600">CODEs</span>
        </span>
        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[2px]">
          Patient portal
        </span>
      </div>
    </Link>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-bold transition-colors ${
          isActive
            ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        }`
      }
    >
      <Icon size={19} />
      {item.label}
    </NavLink>
  );
}

function UserBadge({ compact = false }: { compact?: boolean }) {
  const { userData } = useContext(AppContext) as AppContextType;
  if (!userData) return null;
  return (
    <Link to="/my-profile" className="flex items-center gap-3 min-w-0">
      <img
        src={userData.image}
        alt=""
        className="w-10 h-10 rounded-xl object-cover border border-slate-100 bg-white shrink-0"
      />
      {!compact && (
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900 truncate">{userData.name}</p>
          <p className="text-[11px] font-medium text-slate-400 truncate">{userData.email}</p>
        </div>
      )}
    </Link>
  );
}

export default function PatientShell({ children }: { children: ReactNode }) {
  const { setToken } = useContext(AppContext) as AppContextType;
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  // close the "More" sheet with Escape
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const logout = () => {
    setMoreOpen(false);
    setToken("");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-clinic-bg text-slate-800">
      {/* --- desktop sidebar --- */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 flex-col bg-white border-r border-slate-100 px-5 py-6 z-40">
        <div className="px-2 mb-8">
          <Logo />
        </div>

        <nav className="flex-1 overflow-y-auto space-y-1">
          {MAIN_NAV.map((item) => (
            <SidebarLink key={item.path} item={item} />
          ))}

          <p className="px-4 pt-6 pb-2 text-[10px] font-black uppercase tracking-[2px] text-slate-400">
            Account
          </p>
          {ACCOUNT_NAV.map((item) => (
            <SidebarLink key={item.path} item={item} />
          ))}
        </nav>

        <div className="pt-4 mt-4 border-t border-slate-100 space-y-4">
          <div className="flex gap-4 px-4 text-[11px] font-bold text-slate-400">
            {HELP_NAV.map((item) => (
              <Link key={item.path} to={item.path} className="hover:text-teal-600">
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 px-2">
            <UserBadge />
            <button
              onClick={logout}
              title="Log out"
              className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
            >
              <RiLogoutBoxRLine size={19} />
            </button>
          </div>
        </div>
      </aside>

      {/* --- top bar (phones and tablets) --- */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 bg-white/85 backdrop-blur-xl border-b border-slate-100">
        <Logo />
        <div className="flex items-center gap-3">
          <NotificationBell />
          <UserBadge compact />
        </div>
      </header>

      {/* --- page content --- */}
      <div className="lg:pl-72">
        <header className="hidden lg:flex sticky top-0 z-30 h-16 items-center justify-end gap-5 px-10 bg-clinic-bg/85 backdrop-blur-xl border-b border-slate-100">
          <Link
            to="/doctors"
            className="text-[12px] font-bold text-slate-500 hover:text-teal-600 transition-colors"
          >
            Book an appointment
          </Link>
          <span className="w-px h-5 bg-slate-200" />
          <NotificationBell />
        </header>
        {/* bottom padding keeps content clear of the phone tab bar */}
        <main className="px-4 sm:px-6 lg:px-10 pb-28 lg:pb-12">{children}</main>
      </div>

      {/* --- phone tab bar --- */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-100 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {TAB_BAR.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold ${
                    isActive ? "text-teal-600" : "text-slate-400"
                  }`
                }
              >
                <Icon size={22} />
                {item.label === "Find a doctor" ? "Doctors" : item.label}
              </NavLink>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold text-slate-400"
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
              className="lg:hidden fixed inset-0 z-50 bg-slate-900/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-[32px] px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <UserBadge />
                <button onClick={() => setMoreOpen(false)} className="p-2 text-slate-400">
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
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 text-slate-700 text-[11px] font-bold text-center"
                    >
                      <Icon size={22} className="text-teal-600" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              <button
                onClick={logout}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-50 text-red-600 text-sm font-bold"
              >
                <RiLogoutBoxRLine size={18} />
                Log out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
