"use client";

import React from 'react'
import Link from 'next/link'
import { RiMapPin2Line, RiPhoneLine, RiMailLine, RiArrowRightUpLine } from "@remixicon/react"

const ADDRESS = 'No 17 Ago Palace Way, Isolo, Lagos, Nigeria';
// doctors and pharmacies sign in (and pharmacies apply) on the admin panel
const PANEL_URL = process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, '');

const WAYS = [
  { icon: <RiPhoneLine size={20} />, label: 'Call us', value: '+234 704 203 0981', href: 'tel:+2347042030981', mono: true },
  { icon: <RiMailLine size={20} />, label: 'Email us', value: 'adjscode@gmail.com', href: 'mailto:adjscode@gmail.com' },
  {
    icon: <RiMapPin2Line size={20} />,
    label: 'Visit us',
    value: ADDRESS,
    href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ADDRESS)}`,
  },
];

const Contact: React.FC = () => {
  return (
    <div className='max-w-[1180px] mx-auto px-4 py-8 md:py-14'>
      <div className='max-w-2xl'>
        <p className='eyebrow mb-2'>Contact</p>
        <h1 className='text-[40px] md:text-[56px] leading-[1] font-extrabold tracking-[-0.04em] text-ink'>
          We&apos;re here to help.
        </h1>
        <p className='text-[18px] text-ink-2 mt-4'>
          A question about a visit, a payment or an order? Call or email us and a real person will get back to you.
        </p>
      </div>

      <div className='grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] mt-10'>
        <ul className='flex flex-col gap-3'>
          {WAYS.map((w) => (
            <li key={w.label}>
              <a
                href={w.href}
                target={w.href.startsWith('http') ? '_blank' : undefined}
                rel='noreferrer'
                className='glass rounded-[20px] p-5 flex items-center gap-4 transition-transform hover:-translate-y-0.5'
              >
                <span className='w-11 h-11 shrink-0 rounded-xl grid place-items-center bg-brand-soft text-brand-ink'>{w.icon}</span>
                <span className='min-w-0'>
                  <span className='block text-[13px] font-bold text-ink-3'>{w.label}</span>
                  <span className={`block text-[16px] font-bold text-ink break-words ${w.mono ? 'num' : ''}`}>{w.value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className='glass rounded-[24px] p-2.5 min-h-[320px]'>
          <iframe
            title='Map of our office'
            src={`https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&output=embed`}
            className='w-full h-full min-h-[300px] rounded-[18px] border-0'
            loading='lazy'
            referrerPolicy='no-referrer-when-downgrade'
          />
        </div>
      </div>

      <section className='mt-16'>
        <p className='eyebrow mb-2'>Work with us</p>
        <h2 className='text-[30px] md:text-[38px] leading-[1.05] font-extrabold tracking-[-0.035em] text-ink'>
          Doctors and pharmacies welcome.
        </h2>
        <div className='grid gap-4 md:grid-cols-2 mt-6'>
          <JoinCard
            href={PANEL_URL ?? 'mailto:adjscode@gmail.com?subject=Joining%20as%20a%20doctor'}
            title='Are you a doctor?'
            text='Run clinic and video visits, prescribe, follow your patients’ doses and withdraw your earnings. Email us to be added, or log in if you already are.'
            action={PANEL_URL ? 'Doctor log in' : 'Email us'}
          />
          <JoinCard
            href={PANEL_URL ?? 'mailto:adjscode@gmail.com?subject=Selling%20as%20a%20pharmacy'}
            title='Run a pharmacy?'
            text='Sell to patients nearby, check prescriptions and deliver with your own riders. Apply from the pharmacy portal.'
            action={PANEL_URL ? 'Apply or log in' : 'Email us'}
          />
        </div>
      </section>
    </div>
  )
}

function JoinCard({ href, title, text, action }: { href: string; title: string; text: string; action: string }) {
  return (
    <Link href={href} className='group glass rounded-[24px] p-6 flex flex-col gap-2 transition-transform hover:-translate-y-1'>
      <b className='text-[19px] text-ink'>{title}</b>
      <span className='text-[15px] text-ink-2 leading-relaxed'>{text}</span>
      <span className='mt-2 inline-flex items-center gap-1 text-[15px] font-bold text-brand-ink'>
        {action} <RiArrowRightUpLine size={18} className='transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
      </span>
    </Link>
  )
}

export default Contact
