"use client";

import { RiLockPasswordLine } from "@remixicon/react";
import { useContext, useState } from "react";
import ConfirmLogout from "../../components/ConfirmLogout";
import { DoctorContext } from "../../context/DoctorContext";
import type { DoctorContextType } from "../../types/index";
import { PasswordForm } from "./DoctorSettings";

/** Shown instead of the panel until a doctor the admin added replaces their emailed starting password. */
export default function DoctorFirstLogin() {
  const { profileData, getProfileData, setDToken } = useContext(DoctorContext) as DoctorContextType;
  const name = profileData ? profileData.name : "";
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FD] p-4">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-portal p-6 sm:p-10">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
          <RiLockPasswordLine size={24} />
        </div>
        <p className="text-[24px] font-extrabold tracking-[-0.02em] text-ink mt-4">Choose your own password</p>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          Welcome{name ? `, ${name}` : ""}. Replace the starting password the clinic emailed you before you continue.
        </p>
        <PasswordForm stacked onDone={getProfileData} />
        <button onClick={() => setConfirming(true)} className="mt-4 text-[12px] font-bold text-slate-400 hover:text-slate-700">
          Log out
        </button>
        <ConfirmLogout
          open={confirming}
          who="the doctor panel"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setDToken("");
            localStorage.removeItem("dToken");
          }}
        />
      </div>
    </div>
  );
}
