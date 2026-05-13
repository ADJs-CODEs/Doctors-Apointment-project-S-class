import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SpecialityMenu from "../components/SpecialityMenu.js";
import TopDoctors from "../components/TopDoctors.js";
import Banner from "../components/Banner.js";
import {
  RiCalendarCheckLine,
  RiMedicineBottleLine,
  RiHeartPulseLine,
  RiShieldCheckFill,
  RiArrowRightLine,
  RiUserFollowFill,
  RiStethoscopeLine,
  RiSmartphoneLine,
  RiMailSendLine,
  RiArrowRightUpLine,
  RiCheckboxCircleFill,
  RiTimeLine,
  RiTempHotLine,
  RiDashboardLine,
  RiVerifiedBadgeFill,
  RiLoader4Line,
} from "@remixicon/react";

// ─── Animated Hero Dashboard Mockup ─────────────────────────────────────────

const doses = ["Amoxicillin", "Metformin", "Lisinopril"];

const HeroDashboard: React.FC = () => {
  const [activeDose, setActiveDose] = useState(0);
  const [logged, setLogged] = useState<boolean[]>([false, false, false]);
  const [pulse, setPulse] = useState(72);

  // Cycle highlight on meds
  useEffect(() => {
    const t = setInterval(() => setActiveDose((p) => (p + 1) % 3), 2200);
    return () => clearInterval(t);
  }, []);

  // Simulate live pulse fluctuation
  useEffect(() => {
    const t = setInterval(
      () => setPulse(72 + Math.floor(Math.random() * 8) - 4),
      1800,
    );
    return () => clearInterval(t);
  }, []);

  const handleLog = (i: number) => {
    setLogged((prev) => {
      const n = [...prev];
      n[i] = true;
      return n;
    });
  };

  return (
    <div className="w-full max-w-[420px] mx-auto lg:mx-0 space-y-3">
      {/* Appointment card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/10 backdrop-blur-md border border-white/10 rounded-[20px] p-4 flex items-center gap-4"
      >
        <div className="w-11 h-11 rounded-2xl bg-teal-500/20 flex items-center justify-center shrink-0">
          <RiCalendarCheckLine size={20} className="text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[2px] text-slate-400">
            Next Appointment
          </p>
          <p className="text-white font-black text-sm truncate">
            Dr. Sarah Chen · Neurologist
          </p>
          <p className="text-teal-400 text-[10px] font-bold">Today · 3:30 PM</p>
        </div>
        <div className="shrink-0 w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
      </motion.div>

      {/* Vitals row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-3 gap-2"
      >
        {[
          {
            icon: <RiHeartPulseLine size={14} />,
            label: "Pulse",
            value: `${pulse}`,
            unit: "BPM",
            color: "text-rose-400",
          },
          {
            icon: <RiDashboardLine size={14} />,
            label: "BP",
            value: "120/80",
            unit: "",
            color: "text-blue-400",
          },
          {
            icon: <RiTempHotLine size={14} />,
            label: "Temp",
            value: "36.5",
            unit: "°C",
            color: "text-amber-400",
          },
        ].map((v, i) => (
          <div
            key={i}
            className="bg-white/10 backdrop-blur-md border border-white/10 rounded-[16px] p-3 text-center"
          >
            <span className={v.color}>{v.icon}</span>
            <p className="text-white font-black text-sm mt-1">
              {v.value}
              <span className="text-[9px] text-slate-400 font-normal ml-0.5">
                {v.unit}
              </span>
            </p>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-0.5">
              {v.label}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Medication tracker */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white/10 backdrop-blur-md border border-white/10 rounded-[20px] p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-black uppercase tracking-[2px] text-slate-400">
            Medication Tracker
          </p>
          <span className="text-[8px] font-black uppercase tracking-widest text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded-full">
            Today
          </span>
        </div>
        <div className="space-y-2">
          {doses.map((med, i) => (
            <div
              key={med}
              onClick={() => handleLog(i)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-300 ${
                activeDose === i && !logged[i]
                  ? "bg-teal-500/20 border border-teal-400/30"
                  : "bg-white/5 border border-white/5"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <RiMedicineBottleLine
                  size={14}
                  className={logged[i] ? "text-teal-400" : "text-slate-400"}
                />
                <span className="text-white text-xs font-bold">{med}</span>
              </div>
              {logged[i] ? (
                <RiCheckboxCircleFill size={16} className="text-teal-400" />
              ) : activeDose === i ? (
                <span className="text-[8px] font-black text-teal-400 uppercase tracking-wider animate-pulse">
                  Tap
                </span>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-white/20" />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Doctor message */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className="bg-white/10 backdrop-blur-md border border-white/10 rounded-[20px] p-4 flex gap-3 items-start"
      >
        <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center shrink-0 text-teal-400">
          <RiStethoscopeLine size={14} />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[2px] text-teal-400 mb-0.5">
            Doctor's Note
          </p>
          <p className="text-slate-300 text-[11px] font-medium leading-relaxed italic">
            "Continue Metformin twice daily. Follow up in 2 weeks."
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Stats ───────────────────────────────────────────────────────────────────

const stats = [
  { value: "2,400+", label: "Patients Served", path: "/doctors" },
  { value: "50+", label: "Verified Doctors", path: "/doctors" },
  { value: "6", label: "Specialities", path: "/doctors" },
  { value: "99%", label: "Satisfaction Rate", path: "/about" },
];

// ─── Features ────────────────────────────────────────────────────────────────

const features = [
  {
    icon: <RiCalendarCheckLine size={26} />,
    title: "Book Appointments",
    desc: "Browse verified specialists and book a slot that fits your schedule — no phone calls, no waiting rooms.",
    color: "bg-teal-50 text-teal-600",
    hover: "group-hover:bg-teal-600 group-hover:text-white",
  },
  {
    icon: <RiMedicineBottleLine size={26} />,
    title: "Medication Tracker",
    desc: "Your doctor prescribes digitally. Log each dose, track adherence, and get alerts if you take a dose too early.",
    color: "bg-blue-50 text-blue-600",
    hover: "group-hover:bg-blue-600 group-hover:text-white",
  },
  {
    icon: <RiHeartPulseLine size={26} />,
    title: "Live Health Vitals",
    desc: "After every appointment, your doctor records your BP, pulse, and temperature directly into your profile.",
    color: "bg-rose-50 text-rose-600",
    hover: "group-hover:bg-rose-600 group-hover:text-white",
  },
  {
    icon: <RiMailSendLine size={26} />,
    title: "Doctor Alerts",
    desc: "Receive direct email notifications from your doctor when your health status changes or requires action.",
    color: "bg-amber-50 text-amber-600",
    hover: "group-hover:bg-amber-500 group-hover:text-white",
  },
  {
    icon: <RiShieldCheckFill size={26} />,
    title: "Secure Payments",
    desc: "Pay consultation fees securely via Stripe. Your financial and medical data is fully encrypted at rest.",
    color: "bg-purple-50 text-purple-600",
    hover: "group-hover:bg-purple-600 group-hover:text-white",
  },
  {
    icon: <RiSmartphoneLine size={26} />,
    title: "Pharmacy Vault",
    desc: "Every prescription you have ever received lives in your Pharmacy Vault — browse your full medication history.",
    color: "bg-slate-100 text-slate-600",
    hover: "group-hover:bg-slate-800 group-hover:text-white",
  },
];

// ─── Steps ───────────────────────────────────────────────────────────────────

const steps = [
  {
    num: "01",
    title: "Create your profile",
    desc: "Sign up in seconds using Google or email. Your medical profile is instantly created.",
  },
  {
    num: "02",
    title: "Choose a specialist",
    desc: "Browse our network of verified doctors filtered by speciality, availability, and fee.",
  },
  {
    num: "03",
    title: "Book & pay securely",
    desc: "Select a time slot and pay online via Stripe, or settle with cash on the day.",
  },
  {
    num: "04",
    title: "Track your recovery",
    desc: "After your visit, log medication doses, view vitals, and receive doctor updates.",
  },
];

// ─── Home Page ───────────────────────────────────────────────────────────────

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="animate-reveal overflow-hidden">
      {/* ── HERO ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-4 md:pb-8">
        <div className="relative bg-slate-900 rounded-[32px] md:rounded-[48px] overflow-hidden min-h-[560px] md:min-h-[640px] border border-white/5">
          {/* Background glows */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-500/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-teal-500/3 blur-[80px] rounded-full" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-0 py-14 md:py-20 px-6 sm:px-10 lg:px-16">
            {/* Left: text */}
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-teal-400 mb-6 md:mb-8"
              >
                <RiShieldCheckFill size={12} />
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[2px]">
                  Lagos Trusted Network
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-[64px] font-black text-white leading-[1.05] mb-5 uppercase tracking-tight"
              >
                Book.
                <br />
                Track.
                <br />
                <span className="text-teal-400 font-serif normal-case italic text-5xl md:text-[72px]">
                  Recover.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-slate-400 text-sm md:text-base font-medium mb-8 max-w-md mx-auto lg:mx-0 leading-relaxed"
              >
                Book appointments with verified specialists, track your
                medication schedule, and monitor your health vitals — all in one
                secure platform.
              </motion.p>

              {/* Feature pills */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-8"
              >
                {[
                  {
                    icon: <RiCalendarCheckLine size={12} />,
                    label: "Book Appointments",
                  },
                  {
                    icon: <RiMedicineBottleLine size={12} />,
                    label: "Track Medication",
                  },
                  {
                    icon: <RiHeartPulseLine size={12} />,
                    label: "Monitor Vitals",
                  },
                ].map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-slate-300 text-[10px] font-bold"
                  >
                    <span className="text-teal-400">{f.icon}</span>
                    {f.label}
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
              >
                <a
                  href="#speciality"
                  className="inline-flex items-center justify-center gap-3 bg-teal-400 text-slate-950 px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-[11px] shadow-xl shadow-teal-500/20 hover:bg-white transition-all"
                >
                  Find a Specialist
                  <RiArrowRightUpLine size={16} />
                </a>
                <button
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-[11px] border border-white/10 text-slate-300 hover:bg-white/5 transition-all"
                >
                  Patient Portal
                  <RiArrowRightLine size={14} />
                </button>
              </motion.div>
            </div>

            {/* Right: interactive dashboard */}
            <div className="w-full lg:w-[420px] shrink-0">
              <HeroDashboard />
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 my-8 md:my-12">
        <div className="bg-slate-900 rounded-[24px] md:rounded-[32px] grid grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <motion.button
              key={i}
              whileHover={{ backgroundColor: "rgba(20,184,166,0.08)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                navigate(s.path);
                window.scrollTo(0, 0);
              }}
              className={`flex flex-col items-center py-7 md:py-9 px-4 cursor-pointer transition-all rounded-[24px] md:rounded-[32px] group ${
                i < 2 ? "border-b md:border-b-0 border-white/5" : ""
              } ${i % 2 === 0 ? "border-r border-white/5" : ""} md:border-r md:last:border-r-0 md:border-white/5`}
            >
              <span className="text-2xl md:text-3xl font-black text-teal-400 group-hover:scale-110 transition-transform">
                {s.value}
              </span>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[2px] text-slate-500 mt-1.5 group-hover:text-slate-300 transition-colors">
                {s.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 my-16 md:my-28">
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 rounded-full text-teal-600 mb-4">
            <RiUserFollowFill size={13} />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">
              How It Works
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight">
            From booking to{" "}
            <span className="text-teal-500 font-serif normal-case italic">
              recovery
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{
                y: -6,
                boxShadow:
                  "0 24px 48px rgba(20,184,166,0.18), 0 0 0 1px rgba(20,184,166,0.15)",
              }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative bg-white border border-slate-100 rounded-[24px] md:rounded-[32px] p-7 md:p-8 cursor-default group transition-colors duration-300 hover:border-teal-200"
            >
              {/* Watermark number - bottom corner accent */}
              <span className="text-[36px] font-black text-slate-200/60 leading-none absolute bottom-4 right-5 select-none group-hover:text-teal-300/50 transition-colors duration-300">
                {step.num}
              </span>
              <p className="text-teal-600 font-black text-[9px] uppercase tracking-[3px] mb-3 relative z-10">
                {step.num}
              </p>
              <h3 className="text-sm md:text-base font-black text-slate-900 mb-2 uppercase tracking-tight relative z-10">
                {step.title}
              </h3>
              <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed relative z-10">
                {step.desc}
              </p>
              {/* Arrow connector */}
              {i < steps.length - 1 && (
                <div className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white border border-slate-100 rounded-full items-center justify-center text-teal-400 shadow-sm">
                  <RiArrowRightLine size={14} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── SPECIALITY MENU ── */}
      <SpecialityMenu />

      {/* ── FEATURES GRID ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 my-16 md:my-28">
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 rounded-full text-teal-600 mb-4">
            <RiStethoscopeLine size={13} />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">
              Platform Features
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight">
            Everything your{" "}
            <span className="text-teal-500 font-serif normal-case italic">
              health needs
            </span>
          </h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto mt-3 font-medium">
            ADJ's CODEs is more than a booking platform — it's a complete
            digital health companion.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="bg-white border border-slate-100 rounded-[24px] md:rounded-[32px] p-7 md:p-8 shadow-sm hover:shadow-[0_20px_48px_rgba(20,184,166,0.15)] hover:border-teal-200 transition-all duration-300 group cursor-default"
            >
              <div
                className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 ${f.color} ${f.hover}`}
              >
                {f.icon}
              </div>
              <h3 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-tight mb-2 group-hover:text-teal-600 transition-colors">
                {f.title}
              </h3>
              <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── TOP DOCTORS ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <TopDoctors />
      </div>

      {/* ── BANNER ── */}
      <Banner />
    </div>
  );
};

export default Home;
