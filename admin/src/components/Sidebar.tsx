"use client";

import React, { useContext } from "react";
import { AdminContext } from "../context/AdminContext";
import { NavLink } from "@/lib/navigation";
import { DoctorContext } from "../context/DoctorContext";
import { AppContext } from "../context/AppContext";
import {
  RiDashboard3Line,
  RiCalendarCheckLine,
  RiUserAddLine,
  RiGroupLine,
  RiUser3Line,
  RiHeart3Fill,
  RiChat3Line,
  RiBankLine,
  RiLineChartLine,
} from "@remixicon/react";
import { useDoctorMessages } from "../context/DoctorMessagesContext";
import type {
  AdminContextType,
  DoctorContextType,
  AppContextType,
} from "../types/index";

const Sidebar: React.FC = () => {
  const { aToken } = useContext(AdminContext) as AdminContextType;
  const { dToken } = useContext(DoctorContext) as DoctorContextType;
  const { setProgress } = useContext(AppContext) as AppContextType;
  const { unread: unreadMessages } = useDoctorMessages();

  const activeClass = "bg-slate-900 text-white shadow-xl lg:translate-x-2";
  const inactiveClass = "text-slate-500 hover:bg-slate-50 hover:text-slate-900";
  const baseClass =
    "flex items-center gap-4 py-3 md:py-4 px-4 md:px-6 cursor-pointer transition-all duration-300 rounded-2xl mx-1 md:mx-4 mb-2 group active:scale-95";

  const handleLinkClick = () => {
  };

  return (
    <div className="w-full lg:w-72 bg-white border-b lg:border-r border-slate-100 py-4 lg:py-10 shrink-0 sticky top-[72px] lg:min-h-screen z-40 overflow-x-auto lg:overflow-x-visible">
      <div className="flex lg:flex-col items-center lg:items-stretch min-w-max lg:min-w-full px-4 lg:px-0">
        {/* --- Admin Section --- */}
        {aToken && (
          <div className="animate-reveal flex lg:flex-col items-center lg:items-stretch">
            <p className="hidden lg:block text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-8 px-10">
              Management
            </p>

            <ul className="flex lg:flex-col space-x-1 lg:space-x-0 lg:space-y-1">
              <NavLink
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `${baseClass} ${isActive ? activeClass : inactiveClass}`
                }
                to={"/admin-dashboard"}
              >
                <RiDashboard3Line
                  size={22}
                  className="shrink-0 group-hover:text-teal-500 transition-colors"
                />
                <p className="hidden lg:block text-[11px] font-black uppercase tracking-widest">
                  Dashboard
                </p>
              </NavLink>

              <NavLink
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `${baseClass} ${isActive ? activeClass : inactiveClass}`
                }
                to={"/all-appointments"}
              >
                <RiCalendarCheckLine
                  size={22}
                  className="shrink-0 group-hover:text-teal-500 transition-colors"
                />
                <p className="hidden lg:block text-[11px] font-black uppercase tracking-widest">
                  Appointments
                </p>
              </NavLink>

              <NavLink
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `${baseClass} ${isActive ? activeClass : inactiveClass}`
                }
                to={"/add-doctor"}
              >
                <RiUserAddLine
                  size={22}
                  className="shrink-0 group-hover:text-teal-500 transition-colors"
                />
                <p className="hidden lg:block text-[11px] font-black uppercase tracking-widest">
                  Add Doctor
                </p>
              </NavLink>

              <NavLink
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `${baseClass} ${isActive ? activeClass : inactiveClass}`
                }
                to={"/doctor-list"}
              >
                <RiGroupLine
                  size={22}
                  className="shrink-0 group-hover:text-teal-500 transition-colors"
                />
                <p className="hidden lg:block text-[11px] font-black uppercase tracking-widest">
                  Registry
                </p>
              </NavLink>

              <NavLink
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `${baseClass} ${isActive ? activeClass : inactiveClass}`
                }
                to={"/finance"}
              >
                <RiLineChartLine
                  size={22}
                  className="shrink-0 group-hover:text-teal-500 transition-colors"
                />
                <p className="hidden lg:block text-[11px] font-black uppercase tracking-widest">
                  Finance
                </p>
              </NavLink>

              <NavLink
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `${baseClass} ${isActive ? activeClass : inactiveClass}`
                }
                to={"/payouts"}
              >
                <RiBankLine
                  size={22}
                  className="shrink-0 group-hover:text-teal-500 transition-colors"
                />
                <p className="hidden lg:block text-[11px] font-black uppercase tracking-widest">
                  Payouts
                </p>
              </NavLink>
            </ul>
          </div>
        )}

        {/* --- Doctor Section --- */}
        {dToken && (
          <div className="animate-reveal flex lg:flex-col items-center lg:items-stretch">
            <p className="hidden lg:block text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-8 px-10">
              Medical Portal
            </p>

            <ul className="flex lg:flex-col space-x-1 lg:space-x-0 lg:space-y-1">
              <NavLink
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `${baseClass} ${isActive ? activeClass : inactiveClass}`
                }
                to={"/doctor-dashboard"}
              >
                <RiDashboard3Line
                  size={22}
                  className="shrink-0 group-hover:text-indigo-500 transition-colors"
                />
                <p className="hidden lg:block text-[11px] font-black uppercase tracking-widest">
                  Overview
                </p>
              </NavLink>

              <NavLink
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `${baseClass} ${isActive ? activeClass : inactiveClass}`
                }
                to={"/doctor-appointments"}
              >
                <RiCalendarCheckLine
                  size={22}
                  className="shrink-0 group-hover:text-indigo-500 transition-colors"
                />
                <p className="hidden lg:block text-[11px] font-black uppercase tracking-widest">
                  Schedule
                </p>
              </NavLink>
              <NavLink
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `${baseClass} ${isActive ? activeClass : inactiveClass}`
                }
                to={"/doctor-messages"}
              >
                <span className="relative shrink-0">
                  <RiChat3Line
                    size={22}
                    className="group-hover:text-indigo-500 transition-colors"
                  />
                  {unreadMessages > 0 && (
                    <span className="lg:hidden absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-teal-500 text-white text-[9px] font-black flex items-center justify-center">
                      {unreadMessages}
                    </span>
                  )}
                </span>
                <p className="hidden lg:block text-[11px] font-black uppercase tracking-widest">
                  Messages
                </p>
                {unreadMessages > 0 && (
                  <span className="hidden lg:flex ml-auto min-w-5 h-5 px-1.5 rounded-full bg-teal-500 text-white text-[11px] font-black items-center justify-center">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
              </NavLink>
              <NavLink
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `${baseClass} ${isActive ? activeClass : inactiveClass}`
                }
                to={"/doctor-wish-well"}
              >
                <RiHeart3Fill
                  size={22}
                  className="shrink-0 group-hover:text-indigo-500 transition-colors"
                />
                <p className="hidden lg:block text-[11px] font-black uppercase tracking-widest">
                  Wish Well
                </p>
              </NavLink>

              <NavLink
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `${baseClass} ${isActive ? activeClass : inactiveClass}`
                }
                to={"/doctor-profile"}
              >
                <RiUser3Line
                  size={22}
                  className="shrink-0 group-hover:text-indigo-500 transition-colors"
                />
                <p className="hidden lg:block text-[11px] font-black uppercase tracking-widest">
                  My Profile
                </p>
              </NavLink>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
