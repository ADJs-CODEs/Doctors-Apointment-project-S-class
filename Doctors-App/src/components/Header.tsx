import React from "react";
import { assets } from "../assets/assets/assets_frontend/assets.js";
import { motion } from "framer-motion";
import {
  RiArrowRightUpLine,
  RiShieldCheckFill,
  RiHeartPulseLine,
  RiCalendarCheckLine,
  RiMedicineBottleLine,
} from "@remixicon/react";

const Header: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-4 md:pb-8">
      <div className="relative bg-slate-900 rounded-[32px] md:rounded-[48px] overflow-hidden flex flex-col lg:flex-row items-center min-h-[520px] md:min-h-[620px] border border-white/5">
        {/* Background glows */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-12 md:-top-24 -left-12 md:-left-24 w-64 h-64 md:w-96 md:h-96 bg-teal-500/10 blur-[60px] md:blur-[100px] rounded-full" />
          <div className="absolute bottom-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-500/5 blur-[80px] md:blur-[120px] rounded-full" />
        </div>

        {/* Left content */}
        <div className="flex-1 z-10 py-12 md:py-16 px-6 sm:px-10 lg:px-20 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-teal-400 mb-6 md:mb-8"
          >
            <RiShieldCheckFill size={14} />
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[2px] md:tracking-[3px]">
              Lagos Trusted Network
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-6xl font-black text-white leading-[1.1] mb-4 md:mb-6 uppercase tracking-tight"
          >
            Book. Track. <br />
            <span className="text-teal-400 font-serif normal-case italic text-4xl md:text-7xl">
              Recover.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-sm md:text-base font-medium mb-8 md:mb-10 max-w-md mx-auto lg:mx-0 leading-relaxed"
          >
            Book appointments with verified specialists, track your medication
            schedule, and monitor your health vitals — all in one secure
            platform.
          </motion.p>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-8 md:mb-10"
          >
            {[
              {
                icon: <RiCalendarCheckLine size={13} />,
                label: "Book Appointments",
              },
              {
                icon: <RiMedicineBottleLine size={13} />,
                label: "Track Medication",
              },
              { icon: <RiHeartPulseLine size={13} />, label: "Monitor Vitals" },
            ].map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-slate-300 text-[10px] font-bold"
              >
                <span className="text-teal-400">{f.icon}</span>
                {f.label}
              </div>
            ))}
          </motion.div>

          <motion.a
            href="#speciality"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center gap-3 md:gap-4 bg-teal-400 text-slate-950 px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-[11px] shadow-xl shadow-teal-500/20 hover:bg-white transition-all w-full sm:w-auto"
          >
            Find a Specialist
            <RiArrowRightUpLine size={18} />
          </motion.a>
        </div>

        {/* Right image */}
        <div className="lg:w-1/2 relative flex justify-center lg:justify-end items-end w-full mt-8 lg:mt-0 px-6 sm:px-10 lg:px-0">
          <motion.img
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="w-full max-w-[320px] sm:max-w-[400px] lg:max-w-[550px] object-contain drop-shadow-[-20px_0_40px_rgba(0,0,0,0.6)] lg:drop-shadow-[-30px_0_60px_rgba(0,0,0,0.8)]"
            src={assets.header_img}
            alt="Lead Surgeon"
          />
        </div>
      </div>
    </div>
  );
};

export default Header;
