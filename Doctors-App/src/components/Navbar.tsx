import React, { useContext, useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AppContext } from "../Context/AppContext.js";
import type { AppContextType } from "../types/index.js";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "./NotificationBell.js";
import {
  List,
  X,
  SignOut,
  CalendarCheck,
  UserGear,
  CaretDown,
  Fingerprint,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { RiEyeLine } from "@remixicon/react";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { token, setToken, userData } = useContext(
    AppContext,
  ) as AppContextType;
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    document.body.style.overflow = showMenu ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showMenu]);

  const logout = () => {
    setToken("");
    localStorage.removeItem("token");
    setShowMenu(false);
    navigate("/login");
  };

  const go = (path: string) => {
    setShowMenu(false);
    navigate(path);
    window.scrollTo(0, 0);
  };

  const activeClass =
    "relative py-1 text-teal-600 font-bold after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-0.5 after:bg-teal-500 after:rounded-full";
  const normalClass =
    "py-1 text-slate-500 font-bold hover:text-teal-600 transition-all duration-300";

  return (
    <nav className="sticky top-0 z-50 py-3 px-4 md:px-8 bg-white/80 backdrop-blur-xl border-b border-slate-100 md:mt-3 md:mx-3 md:rounded-[24px] shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => go("/")}
          className="flex items-center gap-2 md:gap-3 cursor-pointer shrink-0"
        >
          <div className="w-9 h-9 md:w-11 md:h-11 bg-teal-50 rounded-full border-2 border-dotted border-teal-200 flex items-center justify-center shadow-sm shrink-0">
            <span className="text-teal-600 font-black text-lg md:text-2xl leading-none">
              +
            </span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] md:text-[17px] font-black text-slate-800 tracking-tighter uppercase whitespace-nowrap">
              ADJ's <span className="text-teal-600">CODEs</span>
            </span>
            <span className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-[2px] -mt-0.5 hidden xs:block">
              Pharmaceutical
            </span>
          </div>
        </motion.div>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-8 text-[11px] tracking-[2px] font-bold">
          {["HOME", "DOCTORS", "ABOUT", "CONTACT"].map((item) => (
            <NavLink
              key={item}
              to={item === "HOME" ? "/" : `/${item.toLowerCase()}`}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              {({ isActive }) => (
                <li className={isActive ? activeClass : normalClass}>{item}</li>
              )}
            </NavLink>
          ))}
        </ul>

        {/* Desktop right */}
        <div className="flex items-center gap-3 md:gap-5">
          {token && <NotificationBell />}
          {token && userData ? (
            <div className="hidden md:flex items-center gap-3 cursor-pointer group relative">
              <div className="relative isolate">
                <div className="absolute -inset-1 bg-teal-500/10 rounded-full blur-sm group-hover:bg-teal-500/20 transition duration-500" />
                <img
                  className="w-9 h-9 rounded-xl border border-slate-100 relative z-10 object-cover bg-white shadow-sm"
                  src={userData.image.replace(
                    "/upload/",
                    "/upload/f_jpg,q_auto:best/",
                  )}
                  alt="Profile"
                />
              </div>
              <div className="flex items-center gap-1">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  {userData.name.split(" ")[0]}
                </p>
                <CaretDown
                  size={12}
                  weight="bold"
                  className="text-slate-400 group-hover:rotate-180 transition-transform"
                />
              </div>
              {/* Dropdown */}
              <div className="absolute top-full right-0 pt-4 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-50">
                <div className="min-w-60 bg-white border border-slate-100 rounded-[20px] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
                  {[
                    {
                      icon: <UserGear size={18} weight="duotone" />,
                      label: "Medical Profile",
                      path: "/my-profile",
                    },
                    {
                      icon: <CalendarCheck size={18} weight="duotone" />,
                      label: "My Appointments",
                      path: "/my-appointments",
                    },
                    {
                      icon: <Fingerprint size={18} weight="duotone" />,
                      label: "Security & Credentials",
                      path: "/account-settings",
                    },
                    {
                      icon: <RiEyeLine size={18} weight="duotone" />,
                      label: "Watching Over",
                      path: "/watching-over",
                    },
                  ].map((item) => (
                    <div
                      key={item.path}
                      onClick={() => go(item.path)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-teal-600 group/item"
                    >
                      {item.icon}
                      <span className="text-xs font-bold text-slate-600 group-hover/item:text-slate-900">
                        {item.label}
                      </span>
                    </div>
                  ))}
                  <div className="h-px bg-slate-50 my-1 mx-2" />
                  <div
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                  >
                    <SignOut
                      size={18}
                      weight="duotone"
                      className="text-rose-500"
                    />
                    <span className="text-xs font-bold text-rose-500">
                      Sign Out
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="hidden md:flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[2px] hover:bg-teal-600 transition-all shadow-sm whitespace-nowrap"
            >
              Patient Portal
            </button>
          )}

          {/* Mobile hamburger */}
          <div
            onClick={() => setShowMenu(true)}
            className="md:hidden p-2 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer active:scale-90 transition-all"
          >
            <List size={22} weight="bold" className="text-slate-900" />
          </div>
        </div>
      </div>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col h-[100dvh] w-screen overflow-hidden"
          >
            {/* Mobile header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-50 rounded-full flex items-center justify-center">
                  <span className="text-teal-600 font-black text-lg">+</span>
                </div>
                <span className="font-black text-slate-900 tracking-tighter uppercase text-sm">
                  ADJ's CODEs
                </span>
              </div>
              <div
                onClick={() => setShowMenu(false)}
                className="p-2 bg-slate-50 rounded-xl cursor-pointer active:scale-95"
              >
                <X size={22} weight="bold" className="text-slate-900" />
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10">
              {/* Nav links */}
              <div>
                <p className="text-[9px] font-black text-teal-600 uppercase tracking-[4px] mb-5 opacity-60">
                  Navigation
                </p>
                <ul className="flex flex-col gap-5">
                  {["HOME", "DOCTORS", "ABOUT", "CONTACT"].map((item, i) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() =>
                        go(item === "HOME" ? "/" : `/${item.toLowerCase()}`)
                      }
                      className="text-3xl font-black text-slate-800 tracking-tighter uppercase cursor-pointer hover:text-teal-600 transition-colors active:scale-95"
                    >
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Dashboard section */}
              {token && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <p className="text-[9px] font-black text-teal-600 uppercase tracking-[4px] mb-5 opacity-60">
                    My Account
                  </p>
                  <div className="flex flex-col gap-5">
                    {[
                      {
                        icon: <UserGear size={26} weight="duotone" />,
                        label: "Medical Profile",
                        path: "/my-profile",
                      },
                      {
                        icon: <CalendarCheck size={26} weight="duotone" />,
                        label: "My Appointments",
                        path: "/my-appointments",
                      },
                      {
                        icon: <Fingerprint size={26} weight="duotone" />,
                        label: "Security & Credentials",
                        path: "/account-settings",
                      },
                      {
                        icon: <RiEyeLine size={18} weight="duotone" />,
                        label: "Watching Over",
                        path: "/watching-over",
                      },
                    ].map((item) => (
                      <button
                        key={item.path}
                        onClick={() => go(item.path)}
                        className="flex items-center gap-4 text-slate-700 font-bold text-lg active:scale-95 transition-transform"
                      >
                        <span className="text-teal-500">{item.icon}</span>{" "}
                        {item.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Bottom actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0 safe-area-bottom">
              {!token ? (
                <button
                  onClick={() => go("/login")}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-transform"
                >
                  Patient Portal Login
                </button>
              ) : (
                <button
                  onClick={logout}
                  className="w-full bg-rose-50 text-rose-500 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <SignOut size={18} weight="bold" /> Sign Out
                </button>
              )}
              <p className="mt-4 text-center text-[9px] font-bold text-slate-400 uppercase tracking-[2px]">
                (+234) 704 203 0981
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
