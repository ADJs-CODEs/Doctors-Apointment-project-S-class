"use client";

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { assets } from '../assets/assets/assets_frontend/assets'
import { RiShieldCheckLine, RiBankCardLine, RiCapsuleLine, RiHeartLine, RiLockLine, RiUserHeartLine } from "@remixicon/react"

// everything here is something the app really does today
const PARTS = [
  { emoji: 'hug', title: 'Your doctors', text: 'Book a clinic visit or a video call with a specialist, at a time they are really free.' },
  { emoji: 'star', title: 'Your medicines', text: 'Prescriptions become a dose schedule, with a reminder before each dose and a nudge if you miss one.' },
  { emoji: 'warmth', title: 'Your care circle', text: 'Family can watch over your visits and doses, send you a nudge, and hear that you are okay.' },
  { emoji: 'strength', title: 'Your calls', text: 'Voice and video calls with your doctor right inside the app, no links to copy.' },
  { emoji: 'heart', title: 'The Wish Well', text: 'When it is hard, people send wishes and gifts. Only with the patient’s permission.' },
  { emoji: 'flower', title: 'Your pharmacy', text: 'Order from pharmacies that deliver to you, and follow your order to the door.' },
];

const PROMISES = [
  { icon: <RiUserHeartLine size={20} />, title: 'Doctors added by the clinic', text: 'Every doctor is set up by our team, not by sign-up.' },
  { icon: <RiBankCardLine size={20} />, title: 'Card payments by Stripe', text: 'Your card details go to Stripe. We never see or keep them.' },
  { icon: <RiCapsuleLine size={20} />, title: 'Prescriptions checked', text: 'Prescription medicines need one from your doctor here, and a pharmacist approves it before packing.' },
  { icon: <RiHeartLine size={20} />, title: 'Nothing public without you', text: 'You are only on the Wish Well if you say yes, and you can leave it.' },
  { icon: <RiLockLine size={20} />, title: 'Private calls', text: 'Each call gets its own private room, made for you and your doctor.' },
  { icon: <RiShieldCheckLine size={20} />, title: 'Your password, scrambled', text: 'Passwords are stored hashed, so not even our team can read them.' },
];

const About: React.FC = () => {
  return (
    <div className='max-w-[1180px] mx-auto px-4 py-8 md:py-14'>
      {/* the story */}
      <div className='grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] items-center'>
        <div className='flex flex-col gap-5'>
          <p className='eyebrow'>Our story</p>
          <h1 className='text-[40px] md:text-[56px] leading-[1] font-extrabold tracking-[-0.04em] text-ink text-balance'>
            Care is more than an appointment.
          </h1>
          <p className='text-[18px] text-ink-2 max-w-[52ch] leading-relaxed'>
            Getting better happens between visits too: taking the right dose at the right time, family who check in,
            a community that shows up when it&apos;s hard, and medicine that reaches your door. We built one place
            for all of it, so your whole health story stays together.
          </p>
          <div className='flex flex-wrap gap-3'>
            <Link href='/login?mode=signup' className='btn btn-ink'>Create my account</Link>
            <Link href='/doctors' className='btn btn-glass'>Find a doctor</Link>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className='glass rounded-[28px] p-3'>
          <img className='w-full rounded-[22px] object-cover' src={assets.about_image} alt='Doctors at the clinic' />
        </motion.div>
      </div>

      {/* the six parts */}
      <section className='mt-20 md:mt-28'>
        <p className='eyebrow mb-2'>What&apos;s in it</p>
        <h2 className='text-[32px] md:text-[42px] leading-[1.05] font-extrabold tracking-[-0.035em] text-ink max-w-[20ch]'>
          Six things, one place.
        </h2>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-8'>
          {PARTS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: (i % 3) * 0.06 }}
              className='glass rounded-[24px] p-6 flex flex-col gap-3'
            >
              <img src={`/emoji/${p.emoji}.webp`} alt='' className={`w-12 h-12 animate-bob ${p.emoji === 'star' ? 'scale-150' : ''}`} style={{ animationDelay: `${i * 0.15}s` }} />
              <b className='text-[18px] text-ink'>{p.title}</b>
              <p className='text-[15px] text-ink-2 leading-relaxed'>{p.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* how we look after you */}
      <section className='mt-20 md:mt-28 grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]'>
        <div>
          <p className='eyebrow mb-2'>How we look after you</p>
          <h2 className='text-[32px] md:text-[42px] leading-[1.05] font-extrabold tracking-[-0.035em] text-ink'>
            Safe by design, not by promise.
          </h2>
        </div>
        <ul className='surface rounded-[24px] divide-y divide-line'>
          {PROMISES.map((p) => (
            <li key={p.title} className='flex items-start gap-4 p-5'>
              <span className='w-10 h-10 shrink-0 rounded-xl grid place-items-center bg-brand-soft text-brand-ink'>{p.icon}</span>
              <div>
                <b className='block text-[16px] text-ink'>{p.title}</b>
                <span className='text-[15px] text-ink-2'>{p.text}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* who */}
      <section className='mt-20 md:mt-28 glass rounded-[28px] p-7 md:p-10 grid gap-6 md:grid-cols-[1fr_auto] items-center'>
        <div>
          <p className='eyebrow mb-2'>Who we are</p>
          <p className='text-[18px] text-ink-2 max-w-[60ch] leading-relaxed'>
            Clarity is made by <b className='text-ink'>ADJ&apos;s CODEs</b> in Lagos, Nigeria. Questions, ideas or
            something not working? We&apos;d love to hear from you.
          </p>
        </div>
        <Link href='/contact' className='btn btn-ink'>Contact us</Link>
      </section>
    </div>
  )
}

export default About
