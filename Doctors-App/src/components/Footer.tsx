import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  RiGithubFill,
  RiGlobalLine,
  RiInstagramLine,
  RiTwitterXFill,
  RiSendPlane2Fill,
  RiShieldCheckFill,
  RiPhoneFill,
  RiMailFill,
  RiArrowRightLine,
} from "@remixicon/react";

const Footer: React.FC = () => {
  const navigate = useNavigate();

  const go = (path: string) => {
    navigate(path);
    window.scrollTo(0, 0);
  };

  return (
    <footer className="relative mt-16 md:mt-32 overflow-hidden bg-white border-t border-slate-100 pt-12 md:pt-20">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full md:w-[900px] h-[250px] md:h-[350px] bg-teal-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pb-10">
        {/* Main card */}
        <div className="bg-white border border-slate-100 p-6 sm:p-10 md:p-14 rounded-[28px] md:rounded-[44px] flex flex-col lg:grid lg:grid-cols-[1.5fr_1fr_1.5fr] gap-10 md:gap-14 relative z-10 shadow-sm">
          {/* Identity */}
          <div className="space-y-5 text-center lg:text-left">
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => go("/")}
              className="flex items-center justify-center lg:justify-start gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 bg-teal-50 rounded-full border-2 border-dotted border-teal-200 flex items-center justify-center shrink-0">
                <span className="text-teal-600 font-black text-xl leading-none">
                  +
                </span>
              </div>
              <div className="flex flex-col leading-tight text-left">
                <span className="text-base md:text-lg font-black text-slate-800 tracking-tighter uppercase">
                  ADJ's <span className="text-teal-600">CODEs</span>
                </span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[2px] -mt-0.5">
                  Pharmaceutical
                </span>
              </div>
            </motion.div>

            <p className="text-slate-500 leading-relaxed max-w-xs mx-auto lg:mx-0 text-xs font-medium">
              <span className="text-teal-600 font-bold italic">
                ADJ's CODEs
              </span>{" "}
              is redefining digital healthcare through advanced diagnostics and
              clinical excellence.
            </p>

            <div className="flex justify-center lg:justify-start gap-2.5">
              {[
                { icon: <RiGithubFill size={16} /> },
                { icon: <RiGlobalLine size={16} /> },
                { icon: <RiTwitterXFill size={16} /> },
                { icon: <RiInstagramLine size={16} /> },
              ].map((s, i) => (
                <motion.a
                  key={i}
                  href="#"
                  whileHover={{
                    y: -3,
                    backgroundColor: "#f0fdfa",
                    color: "#0d9488",
                  }}
                  className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 transition-all"
                >
                  {s.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="text-center lg:text-left lg:pl-8">
            <h3 className="text-slate-900 font-black tracking-[2px] text-[9px] uppercase mb-5 md:mb-7">
              Quick Links
            </h3>
            <ul className="flex flex-row flex-wrap lg:flex-col justify-center lg:justify-start gap-x-6 gap-y-3 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              {["Home", "Doctors", "About", "Wish Well", "Contact"].map(
                (item) => (
                  <li
                    key={item}
                    onClick={() =>
                      go(
                        item === "Home"
                          ? "/"
                          : item === "Wish Well"
                            ? "/wish-well"
                            : `/${item.toLowerCase()}`,
                      )
                    }
                    className="cursor-pointer hover:text-teal-600 transition-all flex items-center justify-center lg:justify-start gap-2 group"
                  >
                    <div className="hidden lg:block w-1.5 h-1.5 bg-teal-500 rounded-full scale-0 group-hover:scale-100 transition-transform" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* Support box */}
          <div className="bg-slate-900 rounded-[24px] md:rounded-[32px] p-6 md:p-8 text-white shadow-xl">
            <div className="flex items-center gap-2 mb-6">
              <RiSendPlane2Fill size={16} className="text-teal-400" />
              <h3 className="text-white font-black tracking-[2px] text-[9px] uppercase">
                Direct Access
              </h3>
            </div>

            <ul className="space-y-4 mb-7">
              <li className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-teal-400 shrink-0">
                  <RiPhoneFill size={15} />
                </div>
                <div>
                  <p className="text-[8px] text-slate-400 font-black uppercase mb-0.5">
                    24/7 Hotline
                  </p>
                  <span className="text-white font-bold text-xs">
                    (+234) 704 203 0981
                  </span>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 shrink-0">
                  <RiMailFill size={15} />
                </div>
                <div>
                  <p className="text-[8px] text-slate-400 font-black uppercase mb-0.5">
                    Email
                  </p>
                  <span className="text-white font-bold text-xs break-all">
                    adjscode@gmail.com
                  </span>
                </div>
              </li>
            </ul>

            {/* Email input - fixed overflow */}
            <div className="relative">
              <input
                type="email"
                placeholder="Updates registry"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-11 outline-none text-[11px] text-white placeholder:text-slate-500 focus:border-teal-500/50 transition-colors"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-teal-500 text-slate-900 p-1.5 rounded-lg hover:bg-teal-400 transition-colors">
                <RiArrowRightLine size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
            <RiShieldCheckFill size={14} className="text-teal-600" />
            <p className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase tracking-widest">
              Secure: <span className="text-slate-900">ADJ'S ENCRYPTION</span>
            </p>
          </div>
          <p className="text-slate-400 text-[8px] md:text-[9px] font-bold uppercase tracking-[2px] text-center">
            © 2026 ADJ'S CODES PHARMACEUTICAL.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
