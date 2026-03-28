import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  RiGithubFill,
  RiGlobalLine,
  RiInstagramLine,
  RiTwitterXFill,
  RiSendPlane2Fill,
  RiShieldCheckFill,
  RiPhoneFill,
  RiMailFill,
  RiArrowRightLine
} from "@remixicon/react"

const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className='relative mt-20 md:mt-40 overflow-hidden bg-white border-t border-slate-100 pt-16 md:pt-24'>
      {/* Background Glow */}
      <div className='absolute top-0 left-1/2 -translate-x-1/2 w-full md:w-[1200px] h-[300px] md:h-[400px] bg-teal-500/5 blur-[100px] md:blur-[140px] rounded-full pointer-events-none' />

      <div className='max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pb-12'>
        {/* Main Footer Card - Responsive Grid */}
        <div className='bg-white border border-slate-100 p-8 md:p-16 rounded-[32px] md:rounded-[48px] flex flex-col lg:grid lg:grid-cols-[1.5fr_1fr_1.5fr] gap-12 lg:gap-16 relative z-10 shadow-[0_32px_64px_-16px_rgba(15,23,42,0.04)]'>

          {/* --- IDENTITY SECTION --- */}
          <div className='space-y-6 md:space-y-8 text-center lg:text-left'>
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => { navigate('/'); window.scrollTo(0, 0); }}
              className='flex items-center justify-center lg:justify-start gap-4 cursor-pointer'
            >
              <div className='w-10 h-10 md:w-12 md:h-12 bg-teal-50 rounded-full border-2 border-dotted border-teal-200 flex items-center justify-center shadow-sm shrink-0'>
                <div className='text-teal-600 font-black text-2xl md:text-3xl leading-none'>+</div>
              </div>

              <div className='flex flex-col leading-tight text-left'>
                <span className='text-[18px] md:text-[20px] font-black text-slate-800 tracking-tighter uppercase'>
                  ADJ's <span className='text-teal-600'>CODEs</span>
                </span>
                <span className='text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[2px] md:tracking-[2.5px] -mt-0.5 md:-mt-1'>
                  Pharmaceutical
                </span>
              </div>
            </motion.div>

            <p className='text-slate-500 leading-relaxed max-w-sm mx-auto lg:mx-0 text-xs md:text-sm font-medium'>
              <span className='text-teal-600 font-bold italic'>ADJ's CODEs Pharmaceutical</span> is redefining digital healthcare through advanced diagnostics and clinical excellence.
            </p>

            <div className='flex justify-center lg:justify-start gap-3'>
              {[
                { icon: <RiGithubFill size={18} />, link: '#' },
                { icon: <RiGlobalLine size={18} />, link: '#' },
                { icon: <RiTwitterXFill size={18} />, link: '#' },
                { icon: <RiInstagramLine size={18} />, link: '#' }
              ].map((social, i) => (
                <motion.a
                  key={i}
                  href={social.link}
                  whileHover={{ y: -4, backgroundColor: '#f0fdfa', color: '#0d9488' }}
                  className='w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 transition-all'
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* --- NAVIGATION SECTION --- */}
          <div className='lg:pl-10 text-center lg:text-left'>
            <h3 className='text-slate-900 font-black tracking-[2px] md:tracking-[3px] text-[9px] md:text-[10px] uppercase mb-6 md:mb-8'>Quick Links</h3>
            <ul className='flex flex-col gap-3 md:gap-4 text-slate-500 text-[11px] md:text-sm font-bold uppercase tracking-wider'>
              {['Home', 'Doctors', 'About', 'Contact'].map((item) => (
                <li
                  key={item}
                  onClick={() => { navigate(item === 'Home' ? '/' : `/${item.toLowerCase()}`); window.scrollTo(0, 0); }}
                  className='cursor-pointer hover:text-teal-600 transition-all flex items-center justify-center lg:justify-start gap-3 group'
                >
                  <div className='hidden lg:block w-1.5 h-1.5 bg-teal-500 rounded-full scale-0 group-hover:scale-100 transition-transform' />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* --- SUPPORT BOX SECTION --- */}
          <div className='bg-slate-900 rounded-[32px] md:rounded-[40px] p-6 md:p-8 text-white shadow-2xl shadow-slate-900/20'>
            <div className='flex items-center justify-center lg:justify-start gap-2 mb-6 md:mb-8'>
              <RiSendPlane2Fill size={18} className="text-teal-400" />
              <h3 className='text-white font-black tracking-[2px] md:tracking-[3px] text-[9px] md:text-[10px] uppercase'>Direct Access</h3>
            </div>

            <ul className='space-y-4 md:space-y-6 mb-8 md:mb-10'>
              <li className='flex items-center gap-4'>
                <div className='w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-400 shrink-0'><RiPhoneFill size={16} /></div>
                <div className='text-left'>
                  <p className='text-[8px] md:text-[9px] text-slate-400 font-black uppercase mb-0.5'>24/7 Hotline</p>
                  <span className='text-white font-bold text-xs md:text-sm'>(+234) 704 203 0981</span>
                </div>
              </li>
              <li className='flex items-center gap-4'>
                <div className='w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 shrink-0'><RiMailFill size={16} /></div>
                <div className='text-left'>
                  <p className='text-[8px] md:text-[9px] text-slate-400 font-black uppercase mb-0.5'>Official Email</p>
                  <span className='text-white font-bold text-[11px] md:text-sm underline decoration-teal-500/50 underline-offset-4 break-all'>adjscode@gmail.com</span>
                </div>
              </li>
            </ul>

            <div className='relative'>
              <input type="email" placeholder="Updates registry" className='w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3.5 md:py-4 pl-4 pr-12 outline-none text-[11px] text-white placeholder:text-slate-500 focus:border-teal-500/50 transition-colors' />
              <button className='absolute right-2 top-2 bg-teal-500 text-slate-900 p-1.5 md:p-2 rounded-lg md:rounded-xl hover:bg-teal-400 transition-colors'><RiArrowRightLine size={16} /></button>
            </div>
          </div>
        </div>

        {/* --- BOTTOM BAR --- */}
        <div className='mt-12 md:mt-16 pt-8 md:pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8'>
          <div className='flex items-center gap-3 px-4 md:px-5 py-2 md:py-2.5 bg-slate-50 rounded-full border border-slate-100'>
            <RiShieldCheckFill size={16} className="text-teal-600" />
            <p className='text-[8px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest'>Secure Data: <span className='text-slate-900'>ADJ'S ENCRYPTION</span></p>
          </div>
          <p className='text-slate-400 text-[8px] md:text-[10px] font-bold uppercase tracking-[2px] md:tracking-[3px] text-center'>© 2026 ADJ'S CODES PHARMACEUTICAL.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer