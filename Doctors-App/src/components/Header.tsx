import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  RiArrowRightLine,
  RiShieldCheckFill,
  RiCalendarCheckLine,
  RiHeartPulseLine,
  RiStethoscopeLine,
} from "@remixicon/react";

const Header: React.FC = () => {
  const navigate = useNavigate();

  const stats = [
    { value: "50+", label: "Specialists" },
    { value: "10k+", label: "Appointments" },
    { value: "99%", label: "Satisfaction" },
  ];

  const features = [
    {
      icon: <RiCalendarCheckLine size={20} className="text-teal-500" />,
      title: "Book Instantly",
      desc: "Schedule with verified doctors in under 60 seconds",
    },
    {
      icon: <RiHeartPulseLine size={20} className="text-rose-500" />,
      title: "Track Your Health",
      desc: "Monitor vitals, prescriptions & appointment history",
    },
    {
      icon: <RiShieldCheckFill size={20} className="text-blue-500" />,
      title: "Secure Records",
      desc: "Your medical data, encrypted and always accessible",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-20 pb-6 md:pb-12">
      {/* --- Trust Badge --- */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-center mb-8 md:mb-12"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-100 rounded-full">
          <RiShieldCheckFill size={14} className="text-teal-600" />
          <span className="text-[10px] font-black uppercase tracking-[2px] text-teal-700">
            Board-Certified Medical Network
          </span>
        </div>
      </motion.div>

      {/* --- Hero Content --- */}
      <div className="text-center max-w-4xl mx-auto mb-12 md:mb-16">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-black text-slate-900 uppercase tracking-tighter leading-[0.95] mb-6"
        >
          Your Health,
          <br />
          <span className="text-teal-500 font-serif normal-case italic text-5xl sm:text-6xl md:text-8xl">
            Managed.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-500 text-sm md:text-lg font-medium max-w-xl mx-auto leading-relaxed mb-8 md:mb-10"
        >
          Book appointments with verified specialists, track your prescriptions
          in real-time, and monitor your health data — all in one secure
          platform.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              navigate("/doctors");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="w-full sm:w-auto bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[2px] text-[11px] flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20 group"
          >
            Find a Doctor
            <RiArrowRightLine
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              navigate("/login");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="w-full sm:w-auto bg-white text-slate-700 px-10 py-4 rounded-2xl font-black uppercase tracking-[2px] text-[11px] flex items-center justify-center gap-3 border border-slate-200 hover:border-teal-300 transition-all"
          >
            Create Account
          </motion.button>
        </motion.div>
      </div>

      {/* --- Stats Row --- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="flex items-center justify-center gap-8 md:gap-16 mb-12 md:mb-20"
      >
        {stats.map((stat, i) => (
          <div key={i} className="text-center">
            <p className="text-2xl md:text-3xl font-black text-slate-900">
              {stat.value}
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>

      {/* --- Feature Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {features.map((feat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
            className="bg-white border border-slate-100 rounded-[28px] p-6 md:p-8 shadow-sm hover:shadow-md hover:border-teal-100 transition-all group"
          >
            <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              {feat.icon}
            </div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">
              {feat.title}
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {feat.desc}
            </p>
          </motion.div>
        ))}
      </div>

      {/* --- Speciality Quick Access Visual --- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="mt-12 md:mt-20 bg-slate-900 rounded-[32px] md:rounded-[48px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative"
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full mb-4">
            <RiStethoscopeLine size={12} className="text-teal-400" />
            <span className="text-[9px] font-black uppercase tracking-[2px] text-teal-400">
              Live Availability
            </span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-tight">
            Specialists Available
            <br />
            <span className="text-teal-400 font-serif normal-case italic text-3xl md:text-4xl">
              Right Now
            </span>
          </h3>
        </div>

        <div className="z-10 flex flex-col items-center md:items-end gap-4">
          <p className="text-slate-400 text-sm font-medium max-w-xs text-center md:text-right">
            Browse all 6 clinical departments and book your slot in minutes.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              document
                .getElementById("speciality")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-teal-500 text-white px-8 py-3.5 rounded-xl font-black uppercase tracking-[2px] text-[10px] flex items-center gap-2 shadow-lg shadow-teal-500/30"
          >
            Browse Departments <RiArrowRightLine size={16} />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default Header;
