"use client";

import React, { useEffect, useState, useContext } from "react";
import { AppContext } from "../Context/AppContext";
import { toast } from "sonner";
import { useNavigate, Link } from "@/lib/navigation";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import type { AppContextType } from "../types/index";
import { useGoogleLogin } from "@react-oauth/google";
import {
  RiArrowRightLine,
  RiGoogleFill,
  RiEyeLine,
  RiEyeOffLine,
  RiStethoscopeLine,
  RiCapsuleLine,
  RiTeamLine,
  RiShieldCheckLine,
  RiLockLine,
} from "@remixicon/react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPath";

// what an account gives you, beside the form on wide screens
const PERKS = [
  { icon: <RiStethoscopeLine size={20} />, title: "Clinic and video visits", text: "Book specialists at times they're really free." },
  { icon: <RiCapsuleLine size={20} />, title: "A reminder for every dose", text: "Your prescriptions become a schedule you can follow." },
  { icon: <RiTeamLine size={20} />, title: "Family in the loop", text: "Let the people who love you watch over your care." },
];

const Login: React.FC = () => {
  const { token, setToken } = useContext(AppContext) as AppContextType;
  const navigate = useNavigate();
  const [state, setState] = useState<"Sign Up" | "Login">("Login");
  // the landing page's "Get started" links here with ?mode=signup
  const wantsSignup = useSearchParams()?.get("mode") === "signup";
  useEffect(() => {
    if (wantsSignup) setState("Sign Up");
  }, [wantsSignup]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const signingUp = state === "Sign Up";

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        toast.info("Signing you in with Google…");
        const { data } = await axiosInstance.post(API_PATHS.AUTH.GOOGLE_AUTH, {
          access_token: tokenResponse.access_token,
        });
        if (data.success) {
          localStorage.setItem("token", data.token);
          setToken(data.token);
          toast.success(`Welcome, ${data.name.split(" ")[0]}!`);
        } else {
          toast.error(data.message);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Google sign-in didn't work. Please try again.");
      }
    },
    onError: () => toast.error("Google sign-in was closed before it finished."),
  });

  const onSubmitHandler = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const endpoint = signingUp ? API_PATHS.AUTH.REGISTER : API_PATHS.AUTH.LOGIN;
      const normalizedEmail = email.toLowerCase().trim();
      const payload = signingUp ? { name, email: normalizedEmail, password } : { email: normalizedEmail, password };
      const { data } = await axiosInstance.post(endpoint, payload);
      if (data.success) {
        localStorage.setItem("token", data.token);
        setToken(data.token);
        toast.success(signingUp ? "Your account is ready." : "Welcome back.");
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "We couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (token) navigate("/my-appointments");
  }, [token, navigate]);

  return (
    <div className="max-w-[1080px] mx-auto px-4 py-8 md:py-14 grid gap-8 lg:grid-cols-[1fr_minmax(0,460px)] items-center">
      {/* why sign up (wide screens) */}
      <div className="hidden lg:flex flex-col gap-6 pr-6">
        <p className="eyebrow">Your care, all together</p>
        <h1 className="text-[52px] leading-[1.02] font-extrabold tracking-[-0.035em] text-ink text-balance">
          Your whole health story, in one place.
        </h1>
        <ul className="glass rounded-[22px] mt-2 divide-y divide-line/80">
          {PERKS.map((p, i) => (
            <motion.li
              key={p.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="flex items-center gap-4 p-4"
            >
              <span className="w-11 h-11 shrink-0 rounded-xl grid place-items-center text-brand-ink border border-[#C4E8E5] bg-[linear-gradient(180deg,#EFFAF9,#D3F0EE)] shadow-[inset_0_1px_0_#fff,0_4px_10px_rgba(11,124,123,0.12)]">
                {p.icon}
              </span>
              <div>
                <b className="block text-[16px] text-ink">{p.title}</b>
                <span className="text-[14px] text-ink-3">{p.text}</span>
              </div>
            </motion.li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-semibold text-ink-3">
          <span className="inline-flex items-center gap-1.5">
            <RiShieldCheckLine size={16} className="text-brand-ink" /> Doctors verified by the clinic
          </span>
          <span className="inline-flex items-center gap-1.5">
            <RiLockLine size={16} className="text-brand-ink" /> Card payments by Stripe
          </span>
        </div>
      </div>

      {/* the form */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[28px] p-6 sm:p-9 w-full max-w-[460px] mx-auto"
      >
        <div className="mb-7">
          <h2 className="text-[30px] leading-tight font-extrabold tracking-[-0.03em] text-ink">
            {signingUp ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-[15px] text-ink-3 mt-1.5">
            {signingUp
              ? "It takes a minute. Book your first visit when you're ready."
              : "Log in to see your visits, medicines and messages."}
          </p>
        </div>

        <button type="button" onClick={() => handleGoogleLogin()} className="btn btn-glass w-full !bg-white">
          <RiGoogleFill size={18} className="text-[#4285F4]" /> Continue with Google
        </button>

        <div className="flex items-center gap-3 my-6 text-[13px] text-ink-3">
          <span className="h-px flex-1 bg-line" /> or with your email <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={onSubmitHandler} className="flex flex-col gap-4">
          {signingUp && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[14px] font-bold text-ink">Full name</span>
              <input
                type="text"
                autoComplete="name"
                className="field"
                onChange={(e) => setName(e.target.value)}
                value={name}
                required
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-bold text-ink">Email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="field"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between">
              <span className="text-[14px] font-bold text-ink">Password</span>
              {!signingUp && (
                <Link to="/forgot-password" className="text-[13px] font-semibold text-brand-ink hover:underline">
                  Forgot it?
                </Link>
              )}
            </span>
            <span className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={signingUp ? "new-password" : "current-password"}
                minLength={signingUp ? 8 : undefined}
                className="field !pr-12"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-ink-3 hover:text-ink"
              >
                {showPassword ? <RiEyeOffLine size={18} /> : <RiEyeLine size={18} />}
              </button>
            </span>
            {signingUp && <span className="text-[13px] text-ink-3">At least 8 characters.</span>}
          </label>

          <button type="submit" disabled={busy} className="btn btn-ink w-full mt-2">
            {busy ? "One moment…" : signingUp ? "Create my account" : "Log in"}
            {!busy && <RiArrowRightLine size={18} />}
          </button>
        </form>

        <p className="mt-6 text-center text-[14px] text-ink-3">
          {signingUp ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            onClick={() => setState(signingUp ? "Login" : "Sign Up")}
            className="font-bold text-brand-ink hover:underline"
          >
            {signingUp ? "Log in" : "Create an account"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
