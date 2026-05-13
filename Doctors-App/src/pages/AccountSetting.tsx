import React, { useState, useContext } from "react";
import { AppContext } from "../Context/AppContext.js";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  RiLockPasswordLine,
  RiDeleteBin6Line,
  RiShieldUserLine,
  RiEyeLine,
  RiEyeOffLine,
  RiLoader4Line,
  RiErrorWarningLine,
} from "@remixicon/react";
import axiosInstance from "../utils/axiosInstance.js";
import { API_PATHS } from "../utils/apiPath.js";
import type { AppContextType } from "../types/index.js";

const AccountSettings: React.FC = () => {
  const { token, setToken } = useContext(AppContext) as AppContextType;
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8)
      return toast.error("New password must be at least 8 characters");
    setPwLoading(true);
    try {
      const { data } = await axiosInstance.post(
        API_PATHS.AUTH.HANDLE_CHANGE_PASSWORD,
        { oldPassword, newPassword },
      );
      if (data.success) {
        toast.success(data.message);
        setOldPassword("");
        setNewPassword("");
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Update failed");
    } finally {
      setPwLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deletePhrase !== "DELETE") return toast.error("Type DELETE to confirm");
    try {
      const { data } = await axiosInstance.post(
        API_PATHS.AUTH.HANDLE_DELETE_ACCOUNT,
        {},
      );
      if (data.success) {
        setToken("");
        localStorage.removeItem("token");
        toast.success("Account deleted");
      }
    } catch {
      toast.error("Could not delete account");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-16 space-y-6">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
            <RiShieldUserLine size={20} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            Security &{" "}
            <span className="text-teal-500 font-serif normal-case italic">
              Credentials
            </span>
          </h1>
        </div>
        <p className="text-slate-400 text-xs font-medium ml-12">
          Manage your account password and data.
        </p>
      </div>

      {/* Change Password Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-7">
          <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
            <RiLockPasswordLine size={18} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">Update Password</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Change your login credentials
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Current password */}
          <div className="relative group">
            <input
              type={showOld ? "text" : "password"}
              placeholder="Current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-5 pr-12 text-sm font-medium outline-none focus:border-teal-500/40 focus:bg-white transition-all placeholder:text-slate-300"
              required
            />
            <button
              type="button"
              onClick={() => setShowOld((p) => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              {showOld ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
            </button>
          </div>

          {/* New password */}
          <div className="relative group">
            <input
              type={showNew ? "text" : "password"}
              placeholder="New password (min 8 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-5 pr-12 text-sm font-medium outline-none focus:border-teal-500/40 focus:bg-white transition-all placeholder:text-slate-300"
              required
            />
            <button
              type="button"
              onClick={() => setShowNew((p) => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              {showNew ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
            </button>
          </div>

          {/* Strength bar */}
          {newPassword.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    newPassword.length >= n * 3
                      ? n <= 2
                        ? "bg-red-400"
                        : n === 3
                          ? "bg-amber-400"
                          : "bg-teal-500"
                      : "bg-slate-100"
                  }`}
                />
              ))}
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {newPassword.length < 6
                  ? "Weak"
                  : newPassword.length < 10
                    ? "Fair"
                    : newPassword.length < 12
                      ? "Good"
                      : "Strong"}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={pwLoading}
            className="flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-teal-600 transition-all active:scale-95 disabled:opacity-60"
          >
            {pwLoading ? (
              <RiLoader4Line size={16} className="animate-spin" />
            ) : (
              <RiLockPasswordLine size={16} />
            )}
            {pwLoading ? "Updating..." : "Update Credentials"}
          </button>
        </form>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-red-50 border border-red-100 rounded-[32px] p-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-100 rounded-xl text-red-600">
            <RiErrorWarningLine size={18} />
          </div>
          <p className="text-red-600 font-black text-sm uppercase tracking-widest">
            Danger Zone
          </p>
        </div>

        <h3 className="text-slate-800 font-black text-base mb-2 ml-11">
          Permanently Delete Account
        </h3>
        <p className="text-slate-500 text-xs mb-6 ml-11 leading-relaxed max-w-md">
          This will erase your entire medical history, prescription records, and
          appointment logs. This action{" "}
          <span className="font-black text-slate-700">cannot be undone.</span>
        </p>

        <div className="ml-11 space-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Type <span className="text-red-500">DELETE</span> to confirm
            </p>
            <input
              type="text"
              placeholder="DELETE"
              value={deletePhrase}
              onChange={(e) => setDeletePhrase(e.target.value)}
              className="w-full max-w-xs bg-white border border-red-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-red-400 transition-all placeholder:text-slate-300"
            />
          </div>
          <button
            onClick={handleDeleteAccount}
            disabled={deletePhrase !== "DELETE"}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RiDeleteBin6Line size={16} />
            Purge Account Data
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AccountSettings;
