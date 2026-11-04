"use client";

import React, { useState } from "react";
import { useParams, useNavigate, Link } from "@/lib/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { RiArrowLeftLine, RiEyeLine, RiEyeOffLine } from "@remixicon/react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPath";

// a rough guide only; the real rule (8+ characters) is checked by the server
const strength = (pw: string) =>
  pw.length < 8 ? { n: 1, label: "Too short", color: "bg-rose-400" }
  : pw.length < 10 ? { n: 2, label: "Okay", color: "bg-amber-400" }
  : pw.length < 12 ? { n: 3, label: "Good", color: "bg-brand" }
  : { n: 4, label: "Strong", color: "bg-brand-ink" };

const ResetPassword: React.FC = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) return toast.error("Your password needs at least 8 characters.");
    if (newPassword !== confirm) return toast.error("The two passwords don't match.");

    setLoading(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.AUTH.RESET_PASSWORD, { token, newPassword });
      if (data.success) {
        toast.success("Password changed. You can log in now.");
        navigate("/login");
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("We couldn't change your password. The link may have expired; ask for a new one.");
    } finally {
      setLoading(false);
    }
  };

  const s = strength(newPassword);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[28px] p-6 sm:p-9 max-w-[440px] w-full"
      >
        <Link to="/login" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-3 hover:text-brand-ink mb-6">
          <RiArrowLeftLine size={16} /> Back to log in
        </Link>

        <h2 className="text-[28px] leading-tight font-extrabold tracking-[-0.03em] text-ink">Choose a new password</h2>
        <p className="text-[15px] text-ink-3 mt-1.5 mb-6">Use at least 8 characters. Longer is safer.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-bold text-ink">New password</span>
            <span className="relative">
              <input
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="field !pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-ink-3 hover:text-ink"
              >
                {showPw ? <RiEyeOffLine size={18} /> : <RiEyeLine size={18} />}
              </button>
            </span>
          </label>

          {newPassword.length > 0 && (
            <div className="flex items-center gap-2" aria-live="polite">
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= s.n ? s.color : "bg-line"}`} />
              ))}
              <span className="text-[13px] font-semibold text-ink-3 ml-1 w-16">{s.label}</span>
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-bold text-ink">Type it again</span>
            <input
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="field"
              required
            />
          </label>

          <button disabled={loading} type="submit" className="btn btn-ink w-full mt-1">
            {loading ? "Saving…" : "Save my new password"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
