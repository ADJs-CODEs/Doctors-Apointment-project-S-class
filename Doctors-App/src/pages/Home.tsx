import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header.js";
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
} from "@remixicon/react";

const stats = [
  { value: "2,400+", label: "Patients Served" },
  { value: "50+", label: "Verified Doctors" },
  { value: "6", label: "Specialities" },
  { value: "99%", label: "Satisfaction Rate" },
];

const features = [
  {
    icon: <RiCalendarCheckLine size={28} />,
    title: "Book Appointments",
    desc: "Browse verified specialists and book a slot that fits your schedule — no phone calls, no waiting rooms.",
    color: "bg-teal-50 text-teal-600",
  },
  {
    icon: <RiMedicineBottleLine size={28} />,
    title: "Medication Tracker",
    desc: "Your doctor prescribes digitally. Log each dose, track adherence, and get alerts if you take a dose too early.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: <RiHeartPulseLine size={28} />,
    title: "Live Health Vitals",
    desc: "After every appointment, your doctor records your BP, pulse, and temperature directly into your profile.",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: <RiMailSendLine size={28} />,
    title: "Doctor Alerts",
    desc: "Receive direct email notifications from your doctor when your health status changes or requires action.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: <RiShieldCheckFill size={28} />,
    title: "Secure Payments",
    desc: "Pay consultation fees securely via Stripe. Your financial and medical data is fully encrypted at rest.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: <RiSmartphoneLine size={28} />,
    title: "Pharmacy Vault",
    desc: "Every prescription you've ever received lives in your Pharmacy Vault — browse your full medication history.",
    color: "bg-slate-100 text-slate-600",
  },
];

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

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="animate-reveal overflow-hidden">
      {/* Hero */}
      <Header />

      {/* Stats bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 my-8 md:my-12">
        <div className="bg-slate-900 rounded-[24px] md:rounded-[32px] grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
          {stats.map((s, i) => (
            <div
              key={i}
              className="flex flex-col items-center py-6 md:py-8 px-4"
            >
              <span className="text-2xl md:text-3xl font-black text-teal-400">
                {s.value}
              </span>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[2px] text-slate-500 mt-1">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative bg-white border border-slate-100 rounded-[24px] md:rounded-[32px] p-7 md:p-8 shadow-sm"
            >
              <span className="text-[48px] md:text-[56px] font-black text-slate-50 leading-none absolute top-4 right-6 select-none">
                {step.num}
              </span>
              <p className="text-teal-600 font-black text-[9px] uppercase tracking-[3px] mb-3 relative z-10">
                {step.num}
              </p>
              <h3 className="text-base md:text-lg font-black text-slate-900 mb-2 uppercase tracking-tight relative z-10">
                {step.title}
              </h3>
              <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed relative z-10">
                {step.desc}
              </p>
              {i < steps.length - 1 && (
                <div className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white border border-slate-100 rounded-full items-center justify-center text-teal-500 shadow-sm">
                  <RiArrowRightLine size={14} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Speciality Menu */}
      <SpecialityMenu />

      {/* Features grid */}
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
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white border border-slate-100 rounded-[24px] md:rounded-[32px] p-7 md:p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-5 ${f.color}`}
              >
                {f.icon}
              </div>
              <h3 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-tight mb-2">
                {f.title}
              </h3>
              <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Top Doctors */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <TopDoctors />
      </div>

      {/* CTA Banner */}
      <Banner />
    </div>
  );
};

export default Home;
