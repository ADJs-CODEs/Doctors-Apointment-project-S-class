"use client";

import React from "react";
import Link from "next/link";
import Logo from "./brand/Logo";
import { RiPhoneLine, RiMailLine, RiMapPin2Line } from "@remixicon/react";

// doctors and pharmacies sign in on the admin panel; without its address, send them to Contact
const PANEL_URL = process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, "");

const COLUMNS = [
  {
    title: "For patients",
    links: [
      { label: "Find a doctor", href: "/doctors" },
      { label: "Wish Well", href: "/wish-well" },
      { label: "Create an account", href: "/login?mode=signup" },
      { label: "Log in", href: "/login" },
    ],
  },
  {
    title: "About us",
    links: [
      { label: "Our story", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "For doctors", href: PANEL_URL ?? "/contact" },
      { label: "For pharmacies", href: PANEL_URL ?? "/contact" },
    ],
  },
];

const Footer: React.FC = () => (
  <footer className="relative z-[1] mt-20 border-t border-line bg-white/70">
    <div className="max-w-[1180px] mx-auto px-4 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
      <div className="space-y-3">
        <Logo />
        <p className="text-[14px] text-ink-3 max-w-[32ch] leading-relaxed">
          Your doctors, your medicines, your family and your community, all in one place.
        </p>
      </div>

      {COLUMNS.map((col) => (
        <div key={col.title}>
          <p className="text-[13px] font-extrabold text-ink mb-3">{col.title}</p>
          <ul className="space-y-2">
            {col.links.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-[14px] text-ink-2 hover:text-brand-ink transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div>
        <p className="text-[13px] font-extrabold text-ink mb-3">Talk to us</p>
        <ul className="space-y-2.5 text-[14px] text-ink-2">
          <li>
            <a href="tel:+2347042030981" className="flex items-center gap-2 hover:text-brand-ink">
              <RiPhoneLine size={16} className="text-brand-ink" /> <span className="num">+234 704 203 0981</span>
            </a>
          </li>
          <li>
            <a href="mailto:adjscode@gmail.com" className="flex items-center gap-2 hover:text-brand-ink">
              <RiMailLine size={16} className="text-brand-ink" /> adjscode@gmail.com
            </a>
          </li>
          <li className="flex items-start gap-2">
            <RiMapPin2Line size={16} className="text-brand-ink mt-0.5 shrink-0" /> Isolo, Lagos, Nigeria
          </li>
        </ul>
      </div>
    </div>
    <div className="border-t border-line">
      <div className="max-w-[1180px] mx-auto px-4 py-5 flex flex-wrap gap-x-7 gap-y-2 justify-between text-[13px] text-ink-3">
        <span>© {new Date().getFullYear()} ADJ&apos;s CODEs</span>
        <span>Animated emoji by Google (Noto Emoji), CC BY 4.0</span>
      </div>
    </div>
  </footer>
);

export default Footer;
