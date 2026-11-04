"use client";

import React, { useContext, useState } from "react";
import ConfirmLogout from "./ConfirmLogout";
import { AdminContext } from "../context/AdminContext";
import { NavLink, useNavigate } from "@/lib/navigation";
import { DoctorContext } from "../context/DoctorContext";
import {
  RiDashboard3Line,
  RiCalendarCheckLine,
  RiUserAddLine,
  RiGroupLine,
  RiUser3Line,
  RiHeart3Line,
  RiChat3Line,
  RiBankLine,
  RiLineChartLine,
  RiSettings3Line,
  RiShoppingBag3Line,
  RiWallet3Line,
  RiStore2Line,
  RiTeamLine,
  RiCapsuleLine,
  RiTruckLine,
  RiMoneyDollarCircleLine,
  RiLogoutCircleRLine,
} from "@remixicon/react";
import { usePharmacy } from "../context/PharmacyContext";
import { useDoctorMessages } from "../context/DoctorMessagesContext";
import type { AdminContextType, DoctorContextType } from "../types/index";

type Item = { to: string; label: string; Icon: typeof RiDashboard3Line; badge?: number };

const ADMIN: Item[] = [
  { to: "/admin-dashboard", label: "Dashboard", Icon: RiDashboard3Line },
  { to: "/all-appointments", label: "Appointments", Icon: RiCalendarCheckLine },
  { to: "/doctor-list", label: "Doctors", Icon: RiGroupLine },
  { to: "/add-doctor", label: "Add a doctor", Icon: RiUserAddLine },
  { to: "/wish-well", label: "Wish Well", Icon: RiHeart3Line },
  { to: "/pharmacies", label: "Pharmacies", Icon: RiStore2Line },
  { to: "/shop-orders", label: "Shop orders", Icon: RiShoppingBag3Line },
  { to: "/finance", label: "Finance", Icon: RiLineChartLine },
  { to: "/payouts", label: "Payouts", Icon: RiBankLine },
];

const DOCTOR: Item[] = [
  { to: "/doctor-dashboard", label: "Dashboard", Icon: RiDashboard3Line },
  { to: "/doctor-appointments", label: "Schedule", Icon: RiCalendarCheckLine },
  { to: "/doctor-messages", label: "Messages", Icon: RiChat3Line },
  { to: "/doctor-wish-well", label: "Wish Well", Icon: RiHeart3Line },
  { to: "/doctor-wallet", label: "Wallet", Icon: RiWallet3Line },
  { to: "/doctor-profile", label: "My profile", Icon: RiUser3Line },
  { to: "/doctor-settings", label: "Settings", Icon: RiSettings3Line },
];

const pharmacyItems = (owner: boolean): Item[] =>
  [
    { to: "/pharmacy", label: "Overview", Icon: RiStore2Line, show: true },
    { to: "/pharmacy-orders", label: "Orders", Icon: RiTruckLine, show: true },
    { to: "/pharmacy-products", label: "Products", Icon: RiCapsuleLine, show: true },
    { to: "/pharmacy-earnings", label: "Earnings", Icon: RiMoneyDollarCircleLine, show: owner },
    { to: "/pharmacy-staff", label: "Staff", Icon: RiTeamLine, show: owner },
    { to: "/pharmacy-settings", label: "Settings", Icon: RiSettings3Line, show: true },
  ].filter((l) => l.show);

function Link({ item }: { item: Item }) {
  const { to, label, Icon, badge } = item;
  return (
    <NavLink
      to={to}
      title={label}
      aria-label={label}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 shrink-0 rounded-[14px] transition-colors px-3 py-2.5 lg:px-3.5 lg:py-2.5 ${
          isActive ? "btn-ink" : "text-ink-2 hover:bg-canvas hover:text-ink"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative shrink-0">
            <Icon size={20} className={isActive ? "" : "text-ink-3 group-hover:text-ink"} />
            {!!badge && (
              <span className="num lg:hidden absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-brand text-white text-[9px] grid place-items-center">
                {badge}
              </span>
            )}
          </span>
          <span className="hidden lg:block text-[15px] font-semibold">{label}</span>
          {!!badge && (
            <span className="num hidden lg:grid ml-auto min-w-5 h-5 px-1.5 rounded-full bg-brand text-white text-[11px] place-items-center">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

/**
 * The panel's navigation for whoever is logged in (admin, doctor or pharmacy staff).
 * Wide screens: a column on the left. Phones and tablets: a strip of icons under the top bar.
 */
const Sidebar: React.FC = () => {
  const { aToken, setAToken } = useContext(AdminContext) as AdminContextType;
  const { dToken, setDToken } = useContext(DoctorContext) as DoctorContextType;
  const { unread: unreadMessages } = useDoctorMessages();
  const { pToken, staff, logout: pharmacyLogout } = usePharmacy();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  // clears whichever login is active and goes back to the login screen
  const logout = () => {
    navigate("/");
    if (aToken) {
      setAToken("");
      localStorage.removeItem("aToken");
    }
    if (dToken) {
      setDToken("");
      localStorage.removeItem("dToken");
    }
    if (pToken) pharmacyLogout();
  };

  const section = aToken
    ? { title: "Clinic", items: ADMIN }
    : dToken
      ? { title: "Your practice", items: DOCTOR.map((i) => (i.to === "/doctor-messages" ? { ...i, badge: unreadMessages } : i)) }
      : pToken
        ? { title: "Your pharmacy", items: pharmacyItems(staff?.role === "owner") }
        : null;

  return (
    <aside className="w-full lg:w-[264px] shrink-0 sticky top-[68px] z-40 lg:h-[calc(100dvh-68px)] bg-white/80 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none border-b border-line lg:border-b-0">
      <div className="lg:h-full lg:p-3">
        <div className="lg:glass lg:h-full lg:rounded-[22px] flex lg:flex-col overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto [scrollbar-width:none] px-3 py-2 lg:p-3 gap-1">
          {section && (
            <>
              <p className="hidden lg:block px-3.5 pt-1 pb-2 text-[12px] font-bold text-ink-3">{section.title}</p>
              <nav className="flex lg:flex-col gap-1" aria-label={section.title}>
                {section.items.map((item) => (
                  <Link key={item.to} item={item} />
                ))}
              </nav>
            </>
          )}

          {/* log out (every role) */}
          <div className="lg:mt-auto lg:pt-3 lg:border-t border-line shrink-0">
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="Log out"
              title="Log out"
              className="w-full flex items-center gap-3 rounded-[14px] px-3 py-2.5 lg:px-3.5 text-ink-2 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              <RiLogoutCircleRLine size={20} className="shrink-0" />
              <span className="hidden lg:block text-[15px] font-semibold">Log out</span>
            </button>
          </div>
        </div>
      </div>
      <ConfirmLogout
        open={confirming}
        who={aToken ? "the clinic panel" : dToken ? "the doctor panel" : pToken ? "the pharmacy portal" : undefined}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          logout();
        }}
      />
    </aside>
  );
};

export default Sidebar;
