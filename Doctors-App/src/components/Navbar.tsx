"use client";

import React, { useContext, useState, useEffect } from "react";
import { NavLink, useNavigate } from "@/lib/navigation";
import Link from "next/link";
import { AppContext } from "../Context/AppContext";
import type { AppContextType } from "../types/index";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "./NotificationBell";
import Logo from "./brand/Logo";
import ConfirmLogout from "./ConfirmLogout";
import { useLogout } from "../hooks/useLogout";
import { List, X, SignOut, CalendarCheck, UserGear, CaretDown, Fingerprint } from "@phosphor-icons/react";
import { RiEyeLine } from "@remixicon/react";

// the public pages; the landing page has its own header
const LINKS = [
  { label: "Doctors", to: "/doctors" },
  { label: "Wish Well", to: "/wish-well" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const ACCOUNT = [
  { icon: <CalendarCheck size={18} weight="duotone" />, label: "My appointments", path: "/my-appointments" },
  { icon: <UserGear size={18} weight="duotone" />, label: "My profile", path: "/my-profile" },
  { icon: <Fingerprint size={18} weight="duotone" />, label: "Settings", path: "/account-settings" },
  { icon: <RiEyeLine size={18} />, label: "Watching over", path: "/watching-over" },
];

/** The glass header on the public pages (doctors, about, contact, login). */
const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { token, userData } = useContext(AppContext) as AppContextType;
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    document.body.style.overflow = showMenu ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showMenu]);

  const logoutNow = useLogout();
  const [confirmOut, setConfirmOut] = useState(false);
  const logout = () => {
    setShowMenu(false);
    setConfirmOut(true);
  };

  const go = (path: string) => {
    setShowMenu(false);
    navigate(path);
    window.scrollTo(0, 0);
  };

  return (
    <nav className="sticky top-0 z-50 px-4 pt-3.5 pb-2">
      {/* logo | links centred | buttons: three columns so the links sit in the true middle */}
      <div className="glass max-w-[1180px] mx-auto flex md:grid md:grid-cols-[1fr_auto_1fr] items-center gap-5 rounded-[18px] py-2.5 pl-5 pr-3">
        <Logo compact />

        <ul className="hidden md:flex items-center gap-7">
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to}>
                {({ isActive }) => (
                  <span
                    className={`text-[14px] font-semibold transition-colors ${
                      isActive ? "text-brand-ink" : "text-ink-2 hover:text-brand-ink"
                    }`}
                  >
                    {l.label}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 ml-auto md:ml-0 md:justify-self-end">
          {token && <NotificationBell />}
          {token && userData ? (
            <div className="hidden md:flex items-center gap-2 cursor-pointer group relative py-1">
              <img
                className="w-9 h-9 rounded-xl border border-line object-cover bg-white"
                src={userData.image.replace("/upload/", "/upload/f_jpg,q_auto:best/")}
                alt=""
              />
              <span className="text-[14px] font-bold text-ink">{userData.name.split(" ")[0]}</span>
              <CaretDown size={12} weight="bold" className="text-ink-3 group-hover:rotate-180 transition-transform" />
              <div className="absolute top-full right-0 pt-3 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
                <div className="surface min-w-56 rounded-[18px] p-1.5">
                  {ACCOUNT.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => go(item.path)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-ink-3 hover:bg-canvas hover:text-brand-ink transition-colors"
                    >
                      {item.icon}
                      <span className="text-[14px] font-semibold text-ink">{item.label}</span>
                    </button>
                  ))}
                  <div className="h-px bg-line my-1 mx-2" />
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <SignOut size={18} weight="duotone" />
                    <span className="text-[14px] font-semibold">Log out</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Link href="/login" className="btn btn-glass !py-2.5 !px-4 !text-[14px] !rounded-xl hidden sm:inline-flex">
                Log in
              </Link>
              <Link href="/login?mode=signup" className="btn btn-ink !py-2.5 !px-4 !text-[14px] !rounded-xl whitespace-nowrap">
                Get started
              </Link>
            </>
          )}

          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setShowMenu(true)}
            className="md:hidden p-2 rounded-xl bg-white border border-line active:scale-90 transition-transform"
          >
            <List size={20} weight="bold" className="text-ink" />
          </button>
        </div>
      </div>

      {/* phone menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-0 z-[100] bg-canvas flex flex-col h-[100dvh] w-screen overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
              <Logo onClick={() => setShowMenu(false)} />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setShowMenu(false)}
                className="p-2 rounded-xl bg-white border border-line active:scale-95"
              >
                <X size={20} weight="bold" className="text-ink" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-8 space-y-10">
              <ul className="flex flex-col gap-4">
                {[{ label: "Home", to: "/" }, ...LINKS].map((l, i) => (
                  <motion.li
                    key={l.to}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <button
                      type="button"
                      onClick={() => go(l.to)}
                      className="text-[32px] font-extrabold tracking-[-0.03em] text-ink active:scale-95 transition-transform"
                    >
                      {l.label}
                    </button>
                  </motion.li>
                ))}
              </ul>

              {token && (
                <div>
                  <p className="eyebrow mb-4">My account</p>
                  <div className="flex flex-col gap-4">
                    {ACCOUNT.map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => go(item.path)}
                        className="flex items-center gap-3 text-ink font-semibold text-[17px] active:scale-95 transition-transform"
                      >
                        <span className="text-brand-ink">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-line shrink-0 flex flex-col gap-2.5">
              {!token ? (
                <>
                  <button type="button" onClick={() => go("/login?mode=signup")} className="btn btn-ink w-full">
                    Create my account
                  </button>
                  <button type="button" onClick={() => go("/login")} className="btn btn-glass w-full">
                    Log in
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={logout}
                  className="btn w-full bg-rose-50 text-rose-600 border border-rose-100"
                >
                  <SignOut size={18} weight="bold" /> Log out
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmLogout open={confirmOut} onCancel={() => setConfirmOut(false)} onConfirm={logoutNow} />
    </nav>
  );
};

export default Navbar;
