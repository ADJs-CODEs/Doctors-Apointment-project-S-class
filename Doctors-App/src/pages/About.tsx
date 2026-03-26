import React from 'react'
import { assets } from '../assets/assets/assets_frontend/assets.js'
import { motion } from 'framer-motion'
import {
  RiTimerFlashLine,
  RiGlobalLine,
  RiFingerprintLine,
  RiFocus2Line,
  RiDoubleQuotesL,
  RiSettings4Line,
  RiCodeSSlashLine,
  RiDatabase2Line,
  RiStackLine
} from "@remixicon/react"

const About: React.FC = () => {
  return (
    <div className='max-w-7xl mx-auto px-6 py-20 bg-clinic-bg min-h-screen animate-reveal'>

      {/* --- Header Section: Engineering Precision --- */}
      <div className='flex flex-col md:flex-row justify-between items-end gap-8 mb-20 border-b border-slate-100 pb-12'>
        <div className='w-full md:w-1/2'>
          <div className='inline-flex items-center gap-2 px-3 py-1 bg-teal-50 rounded-full text-teal-600 mb-4 border border-teal-100/50'>
            <RiSettings4Line size={14} className="animate-spin-slow" />
            <span className='text-[10px] font-black uppercase tracking-widest'>The ADJ's CODEs Blueprint</span>
          </div>
          <h1 className='text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase'>
            The <span className='text-teal-500 italic font-serif normal-case'>Architecture</span>
          </h1>
        </div>
        <p className='text-slate-400 text-[11px] font-black uppercase tracking-[2px] max-w-xs text-right hidden md:block leading-relaxed'>
          Engineering the future of clinical synchronization.
        </p>
      </div>

      {/* --- Story Section --- */}
      <div className='my-20 flex flex-col lg:flex-row gap-24 items-center'>

        {/* Brand Frame */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className='relative w-full lg:max-w-[480px] group shrink-0'
        >
          <div className='relative bg-white p-5 rounded-[48px] shadow-clinical border border-slate-100 overflow-hidden'>
            <div className='absolute top-10 right-10 w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white font-black text-2xl z-20 shadow-lg'>+</div>

            <div className='rounded-[36px] overflow-hidden bg-slate-100 relative'>
              <img
                className='w-full grayscale-[0.4] hover:grayscale-0 transition-all duration-1000 hover:scale-105 object-cover'
                src={assets.about_image}
                alt="ADJ's CODEs Operations"
              />
            </div>
          </div>
        </motion.div>

        {/* Story Content */}
        <div className='flex flex-col gap-10 justify-center flex-1'>
          <div className='space-y-6'>
            <div className='flex items-center gap-3'>
              <div className='w-8 h-[2px] bg-teal-500'></div>
              <p className='text-[10px] text-teal-600 font-black uppercase tracking-[3px]'>Foundational Logic</p>
            </div>
            <p className='text-xl text-slate-700 leading-relaxed font-medium'>
              At <span className='text-slate-900 font-bold tracking-tight'>ADJ's CODEs Pharmaceutical</span>, we believe healthcare is an engineering challenge. Born from a fusion of <span className='text-teal-600 font-bold'>Mechanical Precision</span> and <span className='text-slate-900 font-bold'>Full-Stack Logic</span>, our platform is designed to eliminate the friction in patient-doctor interactions.
            </p>
            <p className='text-slate-500 leading-relaxed text-sm'>
              By applying modular architectural principles to medical data, we ensure that every diagnosis is backed by a stable, high-performance digital infrastructure built for reliability.
            </p>
          </div>

          {/* Premium Vision Quote */}
          <div className='bg-slate-900 border border-slate-800 p-10 rounded-[40px] shadow-2xl relative group transition-all'>
            <RiDoubleQuotesL size={40} className='text-teal-500/20 absolute top-6 right-8' />
            <b className='text-teal-500 uppercase tracking-widest text-[9px] font-black block mb-4'>The Engineering Oath</b>
            <p className='text-slate-300 text-lg italic leading-relaxed font-serif'>
              "To construct a medical ecosystem where data integrity is absolute, and human health is optimized through structural excellence."
            </p>
          </div>
        </div>
      </div>

      {/* --- Technical Stack Section --- */}
      <div className='mt-32'>
        <div className='flex flex-col items-center text-center mb-16'>
          <RiStackLine size={32} className='text-teal-500 mb-4' />
          <p className='text-[10px] text-teal-600 font-black uppercase tracking-[4px] mb-2'>System Architecture</p>
          <h2 className='text-3xl font-black text-slate-900 uppercase tracking-tight'>
            Powered by the <span className='text-teal-500 italic'>MERN</span> Stack
          </h2>
          <div className='w-20 h-1 bg-teal-500/20 mt-4 rounded-full'></div>
        </div>

        <div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
          {[
            { name: 'MongoDB', desc: 'NoSQL Database', icon: <RiDatabase2Line size={24} /> },
            { name: 'Express.js', desc: 'Server Logic', icon: <RiSettings4Line size={24} /> },
            { name: 'React.js', desc: 'Frontend Engine', icon: <RiCodeSSlashLine size={24} /> },
            { name: 'Node.js', desc: 'Runtime Env', icon: <RiSettings4Line size={24} /> }
          ].map((tech, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5, borderColor: '#14b8a6' }}
              className='bg-white border border-slate-100 p-8 rounded-[32px] text-center shadow-sm hover:shadow-clinical transition-all group'
            >
              <div className='text-teal-600 flex justify-center mb-4 group-hover:scale-110 transition-transform'>
                {tech.icon}
              </div>
              <h4 className='text-slate-900 font-black text-sm uppercase tracking-wider'>{tech.name}</h4>
              <p className='text-slate-400 text-[10px] font-bold uppercase mt-1'>{tech.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className='flex flex-wrap justify-center gap-3 mt-10'>
          {['Tailwind CSS', 'TypeScript', 'Framer Motion', 'Axios', 'Cloudinary'].map((tool) => (
            <span key={tool} className='px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500'>
              {tool}
            </span>
          ))}
        </div>
      </div>

      {/* --- Why Choose Us Section --- */}
      <div className='mt-40 mb-16 flex items-center gap-6'>
        <h2 className='text-2xl font-black uppercase tracking-[5px] text-slate-900 shrink-0'>
          The <span className='text-teal-500 font-serif normal-case italic'>Core Specs</span>
        </h2>
        <div className='h-[1px] w-full bg-slate-100'></div>
      </div>

      {/* Features Bento Grid */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-100 rounded-[48px] overflow-hidden bg-white shadow-clinical'>

        {/* Feature 1: Performance */}
        <div className='group p-12 lg:p-16 flex flex-col gap-8 hover:bg-slate-50 transition-all duration-500 border-b md:border-b-0 md:border-r border-slate-100'>
          <div className='w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-slate-900 group-hover:text-teal-400 transition-all shadow-sm'>
            <RiTimerFlashLine size={28} />
          </div>
          <div className='space-y-4'>
            <p className='text-teal-600 font-black text-[9px] uppercase tracking-[3px]'>01. Latency</p>
            <b className='text-slate-900 text-xl block font-black uppercase tracking-tight'>Zero-Friction UX</b>
            <p className='text-slate-500 text-sm leading-relaxed font-medium'>Optimized scheduling algorithms designed to respond at the speed of your health needs.</p>
          </div>
        </div>

        {/* Feature 2: Scalability */}
        <div className='group p-12 lg:p-16 flex flex-col gap-8 hover:bg-slate-50 transition-all duration-500 border-b md:border-b-0 md:border-r border-slate-100'>
          <div className='w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-slate-900 group-hover:text-teal-400 transition-all shadow-sm'>
            <RiGlobalLine size={28} />
          </div>
          <div className='space-y-4'>
            <p className='text-teal-600 font-black text-[9px] uppercase tracking-[3px]'>02. Scale</p>
            <b className='text-slate-900 text-xl block font-black uppercase tracking-tight'>Verified Cluster</b>
            <p className='text-slate-500 text-sm leading-relaxed font-medium'>Access a globally distributed network of elite medical professionals vetted through our QA process.</p>
          </div>
        </div>

        {/* Feature 3: Security */}
        <div className='group p-12 lg:p-16 flex flex-col gap-8 hover:bg-slate-50 transition-all duration-500'>
          <div className='w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-slate-900 group-hover:text-teal-400 transition-all shadow-sm'>
            <RiFingerprintLine size={28} />
          </div>
          <div className='space-y-4'>
            <p className='text-teal-600 font-black text-[9px] uppercase tracking-[3px]'>03. Encryption</p>
            <b className='text-slate-900 text-xl block font-black uppercase tracking-tight'>Immutable Data</b>
            <p className='text-slate-500 text-sm leading-relaxed font-medium'>Medical history secured with multi-layer encryption protocols, protecting your privacy like a vault.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default About