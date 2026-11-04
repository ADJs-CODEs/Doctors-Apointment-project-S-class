'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './Landing.module.css';

/**
 * The logged-out home page: a scroll story over one 3D heart (components/landing/landingScene).
 * The 3D part is loaded only in the browser and only for this page, so three.js stays out of
 * every other page's download. The widgets in the cards are small working demos, not live data.
 */

// The doctor and pharmacy sign-in is the admin panel's front page; without its address set,
// the join cards fall back to the contact page.
const PANEL_URL = process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, '');

const ORBIT = [
  ['hug', 'Clinic and video visits'],
  ['star', 'Dose reminders'],
  ['warmth', 'Care circle'],
  ['strength', 'In-app calls'],
  ['heart', 'Wish Well'],
  ['flower', 'Pharmacy delivery'],
] as const;

// the emoji that keep rising over the heart in the Wish Well chapter
const RISING = [
  { e: 'heart', x: -90, delay: 0 },
  { e: 'warmth', x: 70, delay: 0.6 },
  { e: 'star', x: -30, delay: 1.2, size: 48 },
  { e: 'hug', x: 110, delay: 1.8 },
  { e: 'heart', x: 20, delay: 2.4, size: 44 },
  { e: 'prayer', x: -120, delay: 3, size: 50 },
];

const REACTIONS = [
  ['heart', 'Send love'],
  ['hug', 'Send a hug'],
  ['warmth', 'Send warm love'],
  ['strength', 'Send strength'],
  ['prayer', 'Send a prayer'],
] as const;

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');
const emoji = (name: string) => `/emoji/${name}.webp`;
const reducedMotion = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const [no3d, setNo3d] = useState(false);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    import('@/components/landing/landingScene')
      .then(({ startLandingScene }) => {
        if (!cancelled && root.current) stop = startLandingScene(root.current, () => setNo3d(true));
      })
      .catch(() => setNo3d(true));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return (
    <div ref={root} className={cx(styles.root, no3d && styles.no3d)}>
      <div className={cx(styles.blob, styles.blobA)} aria-hidden="true" />
      <div className={cx(styles.blob, styles.blobB)} aria-hidden="true" />
      <div className={styles.stage} data-stage aria-hidden="true" />
      <img className={styles.fallback} src={emoji('heart')} alt="" aria-hidden="true" />
      <div className={styles.progress} data-progress aria-hidden="true" />
      <div className={styles.orbit} data-orbit aria-hidden="true">
        {ORBIT.map(([e, label]) => (
          <span key={label}>
            <img src={emoji(e)} alt="" />
            {label}
          </span>
        ))}
      </div>
      <WishWellRising />

      <nav className={styles.nav}>
        <div className={styles.navIn}>
          <a className={styles.logo} href="#top">
            <b>Clarity</b>
            <span>by ADJ&apos;s CODEs</span>
          </a>
          <div className={styles.navLinks}>
            <a href="#doctors">Doctors</a>
            <a href="#medicines">Medicines</a>
            <a href="#circle">Care circle</a>
            <a href="#wishwell">Wish Well</a>
            <a href="#pharmacy">Pharmacy</a>
          </div>
          <div className={styles.navActions}>
            <Link className={cx(styles.btn, styles.ghost, styles.small, styles.loginLink)} href="/login">
              Log in
            </Link>
            <Link className={cx(styles.btn, styles.primary, styles.small)} href="/login?mode=signup">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main className={styles.main} id="top">
        <section className={styles.hero} data-chapter="0">
          <div className={styles.wrap}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Your care, all together</p>
              <h1>Your whole health story, in one place.</h1>
              <p className={styles.lead}>
                Book your doctors, take your medicines on time, keep your family in the loop, and feel a whole
                community behind you when it&apos;s hard.
              </p>
              <div className={styles.row}>
                <Link className={cx(styles.btn, styles.primary)} href="/login?mode=signup">
                  Get started
                </Link>
                <a className={cx(styles.btn, styles.ghost)} href="#doctors">
                  See how it works
                </a>
              </div>
              <div className={styles.tags}>
                {ORBIT.map(([, label]) => (
                  <span key={label} className={styles.tag}>
                    {label}
                  </span>
                ))}
              </div>
              <a className={styles.scrollHint} href="#doctors">
                <i />
                Scroll the story
              </a>
            </div>
          </div>
        </section>

        <Chapter id="doctors" n={1} eyebrow="Your doctors" title="See a specialist your way.">
          <p className={styles.body}>
            Pick a doctor, then choose how you want to meet. You only see times they&apos;re really free.
          </p>
          <SessionChoice />
          <p className={styles.note}>Your time is held for 30 minutes while you pay from your wallet or by card.</p>
        </Chapter>

        <Chapter id="medicines" n={2} right eyebrow="Your medicines" title="Never wonder if it's time.">
          <p className={styles.body}>
            What your doctor prescribes becomes a schedule. You get a reminder before each dose and a nudge if you
            miss one. Take a dose too early and your doctor is told.
          </p>
          <DoseWidget />
        </Chapter>

        <Chapter id="circle" n={3} eyebrow="Your care circle" title="The people who love you, in the loop.">
          <p className={styles.body}>
            Let family watch over your visits and doses. They hear when you miss a dose, can send a nudge straight to
            your phone, and you can tell them you&apos;re okay.
          </p>
          <div className={styles.bubbles}>
            <div className={cx(styles.bubble, styles.them)}>
              Have you taken your medicine?<small>Mum · 9:12 am</small>
            </div>
            <div className={cx(styles.bubble, styles.me)}>
              I&apos;m okay, don&apos;t worry<small>You · 9:13 am</small>
            </div>
          </div>
        </Chapter>

        <Chapter id="calls" n={4} right eyebrow="Your calls" title="Your doctor, a tap away.">
          <p className={styles.body}>
            Voice and video calls right inside the app, no links to copy. Your doctor can ring you, and you can ring
            them during your video visit.
          </p>
          <div className={styles.chip}>
            <div className={styles.av}>RJ</div>
            <div className={styles.chipText}>
              <b>Dr Richard James is calling</b>
              <span>Voice call</span>
            </div>
            <span className={styles.pillBtn}>Accept</span>
          </div>
        </Chapter>

        <Chapter id="wishwell" n={5} eyebrow="The Wish Well" title="When it's hard, everyone shows up.">
          <p className={styles.body}>
            With the patient&apos;s permission, their doctor can add them to the Wish Well. People send wishes and
            gifts, and every tap lands on their screen as it happens.
          </p>
          <WishWellDemo rootRef={root} />
        </Chapter>

        <Chapter id="pharmacy" n={6} right eyebrow="Your pharmacy" title="Medicine to your door.">
          <p className={styles.body}>
            Shop pharmacies that deliver to where you are. A rider from the pharmacy brings your order, and you can
            follow every step.
          </p>
          <ol className={styles.steps} aria-label="Order progress">
            <li className={styles.done}>
              Order placed<span className={styles.when}>2:04 pm</span>
            </li>
            <li className={styles.done}>
              Accepted by Good Health Pharmacy<span className={styles.when}>2:06 pm</span>
            </li>
            <li className={styles.done}>
              Packed<span className={styles.when}>2:15 pm</span>
            </li>
            <li className={styles.now}>
              Out for delivery<span className={styles.when}>arriving 2:41 pm</span>
            </li>
            <li>Delivered</li>
          </ol>
          <p className={styles.note}>
            Prescription medicines need a prescription from your doctor here, checked by the pharmacist before
            it&apos;s packed.
          </p>
        </Chapter>

        <section className={styles.final} id="start" data-chapter="7">
          <div className={styles.wrap}>
            <div className={styles.finalCopy}>
              <p className={styles.eyebrow}>Start your story</p>
              <h2>All of your care, finally in one place.</h2>
              <p className={styles.lead} style={{ maxWidth: '40ch' }}>
                Create your account in a minute. Book your first visit when you&apos;re ready.
              </p>
              <div className={styles.row}>
                <Link className={cx(styles.btn, styles.primary)} href="/login?mode=signup">
                  Create my account
                </Link>
                <Link className={cx(styles.btn, styles.ghost)} href="/doctors">
                  Find a doctor
                </Link>
              </div>
            </div>
            <div className={styles.join}>
              <JoinCard href={PANEL_URL ?? '/contact'} title="Are you a doctor?">
                Run clinic and video visits, prescribe, follow your patients&apos; doses and withdraw your earnings.
              </JoinCard>
              <JoinCard href={PANEL_URL ?? '/contact'} title="Run a pharmacy?">
                Sell to patients nearby, check prescriptions and deliver with your own riders.
              </JoinCard>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <span>© {new Date().getFullYear()} ADJ&apos;s CODEs</span>
          <span>
            <Link href="/about">About</Link> · <Link href="/contact">Contact</Link>
          </span>
          <span>Animated emoji by Google (Noto Emoji), CC BY 4.0</span>
        </div>
      </footer>
    </div>
  );
}

function Chapter({
  id, n, right, eyebrow, title, children,
}: { id: string; n: number; right?: boolean; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className={cx(styles.chapter, right && styles.right)} id={id} data-chapter={n}>
      <div className={styles.wrap}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2>{title}</h2>
          {children}
        </div>
      </div>
    </section>
  );
}

function JoinCard({ href, title, children }: { href: string; title: string; children: React.ReactNode }) {
  const card = (
    <div className={styles.card}>
      <b>{title}</b>
      <span>{children}</span>
    </div>
  );
  return href.startsWith('/') ? <Link href={href}>{card}</Link> : <a href={href}>{card}</a>;
}

/** The two kinds of visit, clickable like the real booking page's choice. */
function SessionChoice() {
  const [kind, setKind] = useState<'clinic' | 'video'>('clinic');
  return (
    <div className={styles.sessions} role="group" aria-label="Type of visit">
      <button type="button" className={styles.session} aria-pressed={kind === 'clinic'} onClick={() => setKind('clinic')}>
        <span className={cx(styles.ico, styles.icoClinic)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 21h18M5 21V7l7-4 7 4v14M10 9h4M12 7v4M9 21v-5h6v5" />
          </svg>
        </span>
        <b>At the clinic</b>
        <span>Directions and travel time from you</span>
        <span className={styles.price}>$50</span>
      </button>
      <button type="button" className={styles.session} aria-pressed={kind === 'video'} onClick={() => setKind('video')}>
        <span className={cx(styles.ico, styles.icoVideo)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="6" width="12" height="12" rx="3" />
            <path d="M15 10l6-3v10l-6-3z" />
          </svg>
        </span>
        <b>Video call</b>
        <span>Join from the app at your time</span>
        <span className={styles.price}>$40</span>
      </button>
    </div>
  );
}

const RING = 326.7; // the ring's circumference (r = 52)
const DOSE_GAP = 8 * 3600; // every 8 hours

/** The ring counts down to the next dose; taking it now logs it and shows the early-dose note. */
function DoseWidget() {
  const [left, setLeft] = useState(42 * 60);
  const [taken, setTaken] = useState(false);

  useEffect(() => {
    if (taken || reducedMotion()) return;
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [taken]);

  // the ring is the time left (zoomed in on the last 2 hours so it visibly moves)
  const offset = taken ? 0 : RING * (1 - Math.min(1, (left / DOSE_GAP) * 4));
  const countdown = taken ? '8:00' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;

  return (
    <div className={cx(styles.med, taken && styles.taken)}>
      <div className={styles.medHead}>
        <span className={styles.capsule} aria-hidden="true">
          <i />
        </span>
        <div>
          <b>Amoxicillin 500 mg</b>
          <span>Every 8 hours · 12 left · from Dr James</span>
        </div>
      </div>
      <div className={styles.medMid}>
        <div className={styles.ring} role="img" aria-label="Next dose in 42 minutes, at 2:00 pm">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" className={styles.track} />
            <circle cx="60" cy="60" r="52" className={styles.ringFill} style={{ strokeDashoffset: offset }} />
          </svg>
          <div className={styles.ringText}>
            <b className={styles.mono}>{countdown}</b>
            <span>{taken ? 'until 9:18 pm' : 'until 2:00 pm'}</span>
          </div>
        </div>
        <ol className={styles.today} aria-label="Today's doses">
          <li className={styles.done}>
            <span className={styles.mono}>6:00 am</span>Taken at 6:04
          </li>
          <li className={cx(styles.next, taken && styles.done)}>
            <span className={styles.mono}>2:00 pm</span>
            <em>{taken ? 'Taken at 1:18 pm' : 'Next dose'}</em>
          </li>
          <li>
            <span className={styles.mono}>10:00 pm</span>Later
          </li>
        </ol>
      </div>
      <div className={styles.week} aria-label="This week: 19 of 20 doses taken">
        <div className={styles.bars} aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <i key={d} className={d === 5 ? styles.miss : undefined} />
          ))}
        </div>
        <span>
          <b className={styles.mono}>19 of 20</b> doses this week
        </span>
      </div>
      <button type="button" className={styles.take} onClick={() => setTaken(true)}>
        {taken ? 'Taken · logged at 1:18 pm' : 'Take the 2:00 pm dose'}
      </button>
      {taken && (
        <p className={styles.early}>
          That&apos;s 42 minutes early, so Dr James will be told. Your next dose moves to 9:18 pm.
        </p>
      )}
    </div>
  );
}

/** The emoji that rise over the heart; the 3D scene moves this layer to sit above it. */
function WishWellRising() {
  return (
    <div className={styles.love} data-love aria-hidden="true">
      {RISING.map((r, i) => (
        <img
          key={i}
          src={emoji(r.e)}
          alt=""
          style={{ '--x': `${r.x}px`, animationDelay: `${r.delay}s`, width: r.size, height: r.size } as CSSProperties}
        />
      ))}
    </div>
  );
}

/** Each tap sends one more emoji up from the heart and ticks the counter. */
function WishWellDemo({ rootRef }: { rootRef: React.RefObject<HTMLDivElement | null> }) {
  const [wishes, setWishes] = useState(1284);

  useEffect(() => {
    if (reducedMotion()) return;
    const timer = setInterval(() => setWishes((w) => w + 1 + Math.floor(Math.random() * 3)), 1800);
    return () => clearInterval(timer);
  }, []);

  const send = (name: string) => {
    setWishes((w) => w + 1);
    const layer = rootRef.current?.querySelector('[data-love]');
    if (!layer || reducedMotion()) return;
    const img = document.createElement('img');
    img.src = emoji(name);
    img.alt = '';
    img.className = styles.once;
    img.style.setProperty('--x', `${Math.round((Math.random() - 0.5) * 220)}px`);
    layer.appendChild(img);
    setTimeout(() => img.remove(), 3700);
  };

  return (
    <>
      <div className={styles.counter}>
        <b>{wishes.toLocaleString('en-US')}</b>
        <span>wishes for Tunde so far</span>
      </div>
      <div className={styles.reactions}>
        {REACTIONS.map(([name, label]) => (
          <button key={name} type="button" aria-label={label} onClick={() => send(name)}>
            <img src={emoji(name)} alt="" />
          </button>
        ))}
      </div>
    </>
  );
}
