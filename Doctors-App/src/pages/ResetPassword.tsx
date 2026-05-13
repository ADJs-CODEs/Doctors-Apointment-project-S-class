import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  RiLock2Line,
  RiArrowLeftLine,
  RiLoader4Line,
  RiEyeLine,
  RiEyeOffLine,
} from "@remixicon/react";
import axiosInstance from "../utils/axiosInstance.js";
import { API_PATHS } from "../utils/apiPath.js";

const ResetPassword: React.FC = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8)
      return toast.error("Password must be at least 8 characters");
    if (newPassword !== confirm) return toast.error("Passwords do not match");

    setLoading(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.AUTH.RESET_PASSWORD, {
        token,
        newPassword,
      });
      if (data.success) {
        toast.success(data.message);
        navigate("/login");
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-100 rounded-[40px] md:rounded-[48px] shadow-sm p-8 md:p-12 max-w-md w-full relative overflow-hidden"
      >
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-teal-500/5 blur-[60px] rounded-full pointer-events-none" />

        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-teal-600 transition-colors mb-8 group"
        >
          <RiArrowLeftLine
            size={14}
            className="group-hover:-translate-x-1 transition-transform"
          />
          Back to Login
        </button>

        <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-6">
          <RiLock2Line size={28} />
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">
          New{" "}
          <span className="text-teal-500 font-serif normal-case italic">
            Password
          </span>
        </h2>
        <p className="text-slate-500 text-xs md:text-sm font-medium mb-8 leading-relaxed">
          Choose a strong password for your{" "}
          <span className="text-slate-900 font-bold">ADJ's CODEs</span> account.
          Minimum 8 characters.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New password */}
          <div className="relative group">
            <input
              type={showPw ? "text" : "password"}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 pr-12 text-sm font-medium outline-none focus:border-teal-500/50 focus:bg-white transition-all placeholder:text-slate-400"
              required
            />
            <RiLock2Line
              size={18}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPw((p) => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              {showPw ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
            </button>
          </div>

          {/* Confirm password */}
          <div className="relative group">
            <input
              type={showPw ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 pr-4 text-sm font-medium outline-none focus:border-teal-500/50 focus:bg-white transition-all placeholder:text-slate-400"
              required
            />
            <RiLock2Line
              size={18}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors"
            />
          </div>

          {/* Strength hint */}
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
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
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

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            type="submit"
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg hover:bg-teal-500 transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-2"
          >
            {loading ? (
              <RiLoader4Line size={20} className="animate-spin" />
            ) : (
              "Update Password"
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
