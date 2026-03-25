import React from 'react'
import { assets } from '../assets/assets/assets_frontend/assets.js'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
// Clean, stable Remix Icons
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
    <footer className='relative mt-40 overflow-hidden bg-white border-t border-slate-100 pt-24'>
      <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[400px] bg-teal-500/5 blur-[140px] rounded-full pointer-events-none' />

      <div className='max-w-7xl mx-auto px-6 md:px-10 pb-12'>
        <div className='bg-white border border-slate-100 p-10 md:p-16 rounded-[48px] flex flex-col lg:grid grid-cols-[1.5fr_1fr_1.5fr] gap-16 relative z-10 shadow-[0_32px_64px_-16px_rgba(15,23,42,0.04)]'>

          {/* Brand Identity */}
          <div className='space-y-8'>
            <img src={assets.logo} className='w-40 cursor-pointer' alt="Clinic Logo" onClick={() => navigate('/')} />
            <p className='text-slate-500 leading-relaxed max-w-sm text-sm font-medium'>
              <span className='text-teal-600 font-bold italic'>Prescripto Medical Group</span> is redefining digital healthcare through advanced diagnostics.
            </p>

            <div className='flex gap-3'>
              {[
                { icon: <RiGithubFill size={20} />, link: '#' },
                { icon: <RiGlobalLine size={20} />, link: '#' },
                { icon: <RiTwitterXFill size={20} />, link: '#' },
                { icon: <RiInstagramLine size={20} />, link: '#' }
              ].map((social, i) => (
                <motion.a
                  key={i}
                  href={social.link}
                  whileHover={{ y: -4, backgroundColor: '#f0fdfa', color: '#0d9488' }}
                  className='w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 transition-all'
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className='lg:pl-10'>
            <h3 className='text-slate-900 font-black tracking-[3px] text-[10px] uppercase mb-8'>Quick Links</h3>
            <ul className='flex flex-col gap-4 text-slate-500 text-sm font-bold uppercase tracking-wider'>
              {['Home', 'Doctors', 'About', 'Contact'].map((item) => (
                <li key={item} onClick={() => navigate(item === 'Home' ? '/' : `/${item.toLowerCase()}`)} className='cursor-pointer hover:text-teal-600 transition-all flex items-center gap-3 group'>
                  <div className='w-1.5 h-1.5 bg-teal-500 rounded-full scale-0 group-hover:scale-100 transition-transform' />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Support Box */}
          <div className='bg-slate-900 rounded-[40px] p-8 text-white'>
            <div className='flex items-center gap-2 mb-8'>
              <RiSendPlane2Fill size={20} className="text-teal-400" />
              <h3 className='text-white font-black tracking-[3px] text-[10px] uppercase'>Direct Access</h3>
            </div>

            <ul className='space-y-6 mb-10'>
              <li className='flex items-center gap-4'>
                <div className='w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-400'><RiPhoneFill size={18} /></div>
                <div>
                  <p className='text-[9px] text-slate-400 font-black uppercase mb-0.5'>24/7 Hotline</p>
                  <span className='text-white font-bold text-sm'>(+234) 704 203 0981</span>
                </div>
              </li>
              <li className='flex items-center gap-4'>
                <div className='w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400'><RiMailFill size={18} /></div>
                <div>
                  <p className='text-[9px] text-slate-400 font-black uppercase mb-0.5'>Official Email</p>
                  <span className='text-white font-bold text-sm'>support@prescripto.com</span>
                </div>
              </li>
            </ul>

            <div className='relative'>
              <input type="email" placeholder="Join newsletter" className='w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-14 outline-none text-xs text-white' />
              <button className='absolute right-2 top-2 bg-teal-500 text-slate-900 p-2 rounded-xl'><RiArrowRightLine size={16} /></button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className='mt-16 pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8'>
          <div className='flex items-center gap-3 px-5 py-2.5 bg-slate-50 rounded-full border border-slate-100'>
            <RiShieldCheckFill size={18} className="text-teal-600" />
            <p className='text-[10px] text-slate-500 font-bold uppercase tracking-widest'>Secure Data: <span className='text-slate-900'>HIPAA COMPLIANT</span></p>
          </div>
          <p className='text-slate-400 text-[10px] font-bold uppercase tracking-[3px]'>© 2026 PRESCRIPTO MEDICAL GROUP.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer