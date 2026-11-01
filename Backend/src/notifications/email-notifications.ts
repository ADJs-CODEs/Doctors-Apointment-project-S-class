import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { MODEL } from '../database/models';
import type { IAppointment, IMedicine, IRefund } from '../database/schemas/appointment.schema';
import type { IConnection } from '../database/schemas/social.schemas';
import type { IUser } from '../database/schemas/user.schema';
import { type Mail, MailService } from '../integrations/integrations';
import { type AppNotification, AppNotifier } from './app-notifier';
import { CLINIC_TZ, slotParts, type WallClock } from './clinic-time';
import { details, escapeHtml, layout, quote } from './email-templates';

const VISIT_MINUTES = 30;

const patientUrl = (path = '') => `${process.env.USER_URL || process.env.CLIENT_URL || ''}${path}`;
const adminUrl = (path = '') => `${process.env.ADMIN_URL || ''}${path}`;

type Person = { _id?: unknown; name: string; email: string };
const idOf = (p: { _id?: unknown }) => (p._id ? String(p._id) : '');

/** Wall-clock parts -> "20260327T103000" (no zone; the zone is given separately). */
function stamp(p: WallClock, addMinutes = 0) {
  // UTC is used only as a calculator for adding minutes; no zone conversion happens
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute + addMinutes));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;
}

const prettyDate = (slotDate: string) => {
  const p = slotParts(slotDate, '12:00 pm');
  if (!p) return slotDate.replace(/_/g, '/');
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const clinicTime = (at: Date) =>
  at.toLocaleTimeString('en-GB', { timeZone: CLINIC_TZ, hour: 'numeric', minute: '2-digit', hour12: true });

const clinicDateTime = (at: Date) =>
  at.toLocaleString('en-GB', { timeZone: CLINIC_TZ, dateStyle: 'medium', timeStyle: 'short' });

const firstName = (name?: string) => (name ?? '').trim().split(/\s+/)[0] || 'there';

const money = (amount: number) => {
  const currency = (process.env.CURRENCY || 'usd').toUpperCase();
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};

/** "Add to Google Calendar" link and an .ics file (Apple Calendar, Outlook) for a visit. */
function calendarFor(a: IAppointment) {
  const p = slotParts(a.slotDate, a.slotTime);
  if (!p) return null;
  const start = stamp(p);
  const end = stamp(p, VISIT_MINUTES);
  const title = `Appointment with ${a.docData?.name ?? 'your doctor'}`;
  const where = [a.docData?.address?.line1, a.docData?.address?.line2].filter(Boolean).join(', ');
  const description = `${a.docData?.speciality ?? ''} appointment booked on ADJ's CODEs.\n${patientUrl('/my-appointments')}`;

  const google =
    'https://calendar.google.com/calendar/render?' +
    new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${start}/${end}`,
      ctz: CLINIC_TZ,
      details: description,
      location: where,
    }).toString();

  const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    "PRODID:-//ADJ's CODEs//Appointments//EN",
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${a._id}@adjscodes`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART;TZID=${CLINIC_TZ}:${start}`,
    `DTEND;TZID=${CLINIC_TZ}:${end}`,
    `SUMMARY:${icsText(title)}`,
    `DESCRIPTION:${icsText(description)}`,
    where ? `LOCATION:${icsText(where)}` : '',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Appointment in 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  return {
    google,
    attachment: { filename: 'appointment.ics', content: Buffer.from(ics).toString('base64'), type: 'text/calendar' },
  };
}

const visitRows = (a: IAppointment): [string, unknown][] => [
  ['Doctor', a.docData?.name],
  ['Speciality', a.docData?.speciality],
  ['Date', prettyDate(a.slotDate)],
  ['Time', a.slotTime],
];

const CARE_FOOTER = 'You are receiving this because you are in their care circle on ADJ&#39;s CODEs.';
const DOCTOR_FOOTER = 'You are receiving this because patients can book you on ADJ&#39;s CODEs.';

/**
 * Every automatic notification for an event: the email (these used to be n8n workflows)
 * and, for patients and their care circle, the in-app + device notification via
 * AppNotifier. All fire-and-forget: a failure is logged and never fails the request.
 */
@Injectable()
export class EmailNotifications {
  private readonly logger = new Logger('EmailNotifications');

  constructor(
    private readonly mail: MailService,
    private readonly app: AppNotifier,
    @InjectModel(MODEL.connection) private readonly connections: Model<IConnection>,
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
  ) {}

  private deliver(kind: string, mail: Mail) {
    if (!mail.to) return;
    this.mail.send(mail).catch((err) => this.logger.warn(`${kind} email to ${mail.to} failed: ${err.message}`));
  }

  /** People who accepted to watch over this patient (their care circle). */
  private async watchersOf(patientId: string): Promise<Person[]> {
    const links = await this.connections.find({ patientId, status: 'accepted' }).select('requesterId').lean();
    if (!links.length) return [];
    const people = await this.users
      .find({ _id: { $in: links.map((l) => l.requesterId) } })
      .select(['name', 'email'])
      .lean();
    return people.filter((p) => p.email).map((p) => ({ _id: String(p._id), name: p.name, email: p.email }));
  }

  /** Emails (and notifies in-app) every watcher; never throws. */
  private toCareCircle(
    patientId: string,
    kind: string,
    build: (watcher: Person) => Omit<Mail, 'to'>,
    inApp?: AppNotification,
  ) {
    this.watchersOf(patientId)
      .then((watchers) =>
        watchers.forEach((w) => {
          this.deliver(`care circle: ${kind}`, { to: w.email, ...build(w) });
          if (inApp) this.app.send(idOf(w), { ...inApp, type: 'care', link: `/watching/${patientId}` });
        }),
      )
      .catch((err) => this.logger.warn(`care circle lookup failed: ${err.message}`));
  }

  // --- account ---

  welcome(user: Person) {
    this.deliver('welcome', {
      to: user.email,
      subject: "Welcome to ADJ's CODEs",
      html: layout({
        title: `Welcome, ${firstName(user.name)}!`,
        body: `<p>Your account is ready. Here's what you can do:</p>
               <ul style="padding-left:18px;margin:10px 0;">
                 <li>Book appointments with verified doctors</li>
                 <li>Get reminders before every dose of your medicine</li>
                 <li>Message your doctor about a visit or a prescription</li>
                 <li>Invite family to your care circle so they can look out for you</li>
               </ul>`,
        button: { label: 'Find a doctor', url: patientUrl('/doctors') },
      }),
      text: `Welcome, ${user.name}! Your account is ready. Find a doctor: ${patientUrl('/doctors')}`,
    });
    this.app.send(idOf(user), {
      title: "Welcome to ADJ's CODEs",
      message: 'Book a doctor, get dose reminders and message your doctor, all in one place.',
      type: 'general',
      link: '/doctors',
      inAppOnly: true,
    });
  }

  signInAlert(user: Person) {
    this.deliver('sign-in', {
      to: user.email,
      subject: 'New sign-in to your account',
      html: layout({
        title: 'New sign-in',
        body: `<p>Hi ${escapeHtml(firstName(user.name))}, your account was just signed in to on <strong>${escapeHtml(clinicDateTime(new Date()))}</strong>.</p>
               <p>If this wasn't you, reset your password straight away.</p>`,
        button: { label: 'Reset password', url: patientUrl('/forgot-password') },
        footer: 'We send this every time someone signs in to your account.',
      }),
    });
  }

  passwordReset(to: string, link: string) {
    return this.mail.send({
      to,
      subject: 'Reset your password',
      html: layout({
        title: 'Reset your password',
        body: `<p>Someone asked to reset the password for this account. The link below works for 15 minutes.</p>
               <p style="font-size:13px;color:#64748b;">If it wasn't you, ignore this email; your password stays the same.</p>`,
        button: { label: 'Choose a new password', url: link },
      }),
      text: `Reset your password (link valid for 15 minutes): ${link}`,
    });
  }

  // --- appointments ---

  bookingConfirmed(a: IAppointment) {
    const calendar = calendarFor(a);
    this.deliver('booking', {
      to: a.userData?.email,
      subject: `Booked: ${a.docData?.name} on ${prettyDate(a.slotDate)}`,
      html: layout({
        title: 'Your appointment is booked',
        body: `<p>Hi ${escapeHtml(firstName(a.userData?.name))}, here are the details:</p>
               ${details([...visitRows(a), ['Fee', money(a.amount)], ['Payment', 'Not paid yet']])}
               <p style="font-size:13px;color:#64748b;">We'll remind you an hour before. The calendar file attached works with Apple Calendar and Outlook.</p>`,
        button: calendar ? { label: 'Add to Google Calendar', url: calendar.google } : undefined,
        secondary: { label: 'Pay or manage', url: patientUrl('/my-appointments') },
      }),
      attachments: calendar ? [calendar.attachment] : undefined,
    });
    this.app.send(a.userId, {
      title: 'Appointment booked',
      message: `${a.docData?.name} · ${prettyDate(a.slotDate)} at ${a.slotTime}. We'll remind you an hour before.`,
      type: 'appointment',
      link: '/my-appointments',
      inAppOnly: true, // they're looking at the screen that just booked it
    });

    this.deliver('booking (doctor)', {
      to: a.docData?.email,
      subject: `New booking: ${a.userData?.name}, ${prettyDate(a.slotDate)} ${a.slotTime}`,
      html: layout({
        title: 'New appointment booked',
        body: details([
          ['Patient', a.userData?.name],
          ['Date', prettyDate(a.slotDate)],
          ['Time', a.slotTime],
        ]),
        button: { label: 'Open schedule', url: adminUrl('/doctor-appointments') },
        footer: DOCTOR_FOOTER,
      }),
    });

    this.toCareCircle(
      a.userId,
      'booking',
      (w) => ({
        subject: `${firstName(a.userData?.name)} has an appointment on ${prettyDate(a.slotDate)}`,
        html: layout({
          title: `${a.userData?.name} booked an appointment`,
          body: `<p>Hi ${escapeHtml(firstName(w.name))}, just so you know:</p>${details(visitRows(a))}`,
          button: { label: 'See how they are doing', url: patientUrl(`/watching/${a.userId}`) },
          footer: CARE_FOOTER,
        }),
      }),
      {
        title: `${firstName(a.userData?.name)} booked an appointment`,
        message: `${a.docData?.name} · ${prettyDate(a.slotDate)} at ${a.slotTime}`,
        type: 'care',
      },
    );
  }

  /** reference: the Stripe session id for card payments, or 'wallet'. */
  paymentReceived(a: IAppointment, reference?: string) {
    const byWallet = reference === 'wallet';
    const w = a.walletPayment;
    const rows: [string, unknown][] = [
      ['Amount', money(a.amount)],
      ['For', `Appointment with ${a.docData?.name}`],
      ['Visit', `${prettyDate(a.slotDate)}, ${a.slotTime}`],
      ['Paid on', clinicDateTime(new Date())],
      [
        'Paid with',
        byWallet
          ? [w?.fundCents && `${money(w.fundCents / 100)} care fund`, w?.coins && `${w.coins.toLocaleString('en-US')} coins`]
              .filter(Boolean)
              .join(' + ') || 'Wallet'
          : 'Card',
      ],
    ];
    if (reference && !byWallet) rows.push(['Reference', reference.slice(-12).toUpperCase()]);

    this.deliver('payment', {
      to: a.userData?.email,
      subject: `Payment received: ${money(a.amount)} for ${a.docData?.name}`,
      html: layout({
        title: 'Payment received, thank you',
        body: `<p>Hi ${escapeHtml(firstName(a.userData?.name))}, your appointment is paid. Keep this email as your receipt.</p>${details(rows)}`,
        button: { label: 'View appointment', url: patientUrl('/my-appointments') },
      }),
    });
    this.app.send(a.userId, {
      title: 'Payment received',
      message: `${money(a.amount)} for your appointment with ${a.docData?.name}${byWallet ? ', paid from your wallet' : ''}. Your receipt is in your email.`,
      type: 'payment',
      link: '/my-appointments',
      inAppOnly: true,
    });

    this.deliver('payment (doctor)', {
      to: a.docData?.email,
      subject: `Paid: ${a.userData?.name}, ${prettyDate(a.slotDate)} ${a.slotTime}`,
      html: layout({
        title: 'An appointment was paid',
        body: details([
          ['Patient', a.userData?.name],
          ['Visit', `${prettyDate(a.slotDate)}, ${a.slotTime}`],
          ['Amount', money(a.amount)],
        ]),
        button: { label: 'Open schedule', url: adminUrl('/doctor-appointments') },
        footer: DOCTOR_FOOTER,
      }),
    });
  }

  /** An hour before the visit. */
  appointmentSoon(a: IAppointment, minutes: number) {
    const unpaid = !a.payment;
    this.deliver('appointment soon', {
      to: a.userData?.email,
      subject: `In ${minutes} minutes: your appointment with ${a.docData?.name}`,
      html: layout({
        title: `Your appointment is in ${minutes} minutes`,
        tone: 'orange',
        body: `<p>Hi ${escapeHtml(firstName(a.userData?.name))}, a quick reminder:</p>${details(visitRows(a))}
               ${unpaid ? '<p><strong>This visit isn&#39;t paid yet.</strong> You can pay online before you go.</p>' : ''}`,
        button: { label: unpaid ? 'Pay now' : 'View appointment', url: patientUrl('/my-appointments') },
        secondary: { label: 'Message the doctor', url: patientUrl(`/messages?doctor=${a.docId}&appointment=${a._id}`) },
      }),
    });
    this.app.send(a.userId, {
      title: `Appointment in ${minutes} minutes`,
      message: `${a.docData?.name} at ${a.slotTime}${unpaid ? ' · not paid yet' : ''}`,
      type: 'appointment',
      link: '/my-appointments',
      tag: `appt-${a._id}`,
    });
  }

  /** When the visit starts: both sides. */
  appointmentNow(a: IAppointment) {
    this.deliver('appointment now', {
      to: a.userData?.email,
      subject: `It's time: your appointment with ${a.docData?.name}`,
      html: layout({
        title: "It's time for your appointment",
        tone: 'orange',
        body: `<p>Hi ${escapeHtml(firstName(a.userData?.name))}, your appointment with <strong>${escapeHtml(a.docData?.name)}</strong> starts now (${escapeHtml(a.slotTime)}).</p>`,
        button: { label: 'Message the doctor', url: patientUrl(`/messages?doctor=${a.docId}&appointment=${a._id}`) },
      }),
    });
    this.app.send(a.userId, {
      title: "It's time for your appointment",
      message: `${a.docData?.name} · ${a.slotTime}`,
      type: 'appointment',
      link: '/my-appointments',
      tag: `appt-${a._id}`,
      urgent: true,
    });
    this.deliver('appointment now (doctor)', {
      to: a.docData?.email,
      subject: `Now: ${a.userData?.name} (${a.slotTime})`,
      html: layout({
        title: 'Your next appointment starts now',
        body: details([
          ['Patient', a.userData?.name],
          ['Time', a.slotTime],
          ['Paid', a.payment ? 'Yes' : 'Not yet'],
        ]),
        button: { label: 'Open patient', url: adminUrl(`/doctor-messages?patient=${a.userId}&appointment=${a._id}`) },
        footer: DOCTOR_FOOTER,
      }),
    });
  }

  /** Tells the other side(s) about a cancellation. refund: set when a wallet payment went back. */
  appointmentCancelled(a: IAppointment, by: 'patient' | 'doctor' | 'admin', refund?: IRefund | null) {
    const refundText = refund
      ? ` ${money(refund.amount)} has been refunded to your wallet.`
      : a.payment
        ? ' Your payment will be refunded.'
        : '';
    const rows = details([
      ['Doctor', a.docData?.name],
      ['Patient', a.userData?.name],
      ['Date', prettyDate(a.slotDate)],
      ['Time', a.slotTime],
    ]);
    const who = { patient: 'the patient', doctor: 'the doctor', admin: 'the clinic' }[by];

    // the patient always hears about it, even when they cancelled (as a confirmation)
    this.deliver('cancel (patient)', {
      to: a.userData?.email,
      subject: `Cancelled: your appointment on ${prettyDate(a.slotDate)}`,
      html: layout({
        title: by === 'patient' ? 'You cancelled your appointment' : 'Your appointment was cancelled',
        tone: 'orange',
        body: `<p>Hi ${escapeHtml(firstName(a.userData?.name))}, ${
          by === 'patient' ? 'this is to confirm you cancelled this appointment.' : `this appointment was cancelled by ${who}.`
        }${refundText}</p>${rows}`,
        button: { label: 'Book another time', url: patientUrl(`/appointments/${a.docId}`) },
      }),
    });
    if (by !== 'patient') {
      this.app.send(a.userId, {
        title: 'Appointment cancelled',
        message: `Your visit with ${a.docData?.name} on ${prettyDate(a.slotDate)} was cancelled by ${who}.${refundText}`,
        type: 'appointment',
        link: `/appointments/${a.docId}`,
      });
    }
    if (by !== 'doctor') {
      this.deliver('cancel (doctor)', {
        to: a.docData?.email,
        subject: `Cancelled: ${a.userData?.name}, ${prettyDate(a.slotDate)} ${a.slotTime}`,
        html: layout({
          title: 'An appointment was cancelled',
          tone: 'orange',
          body: `<p>This appointment was cancelled by ${who}. The slot is free again.</p>${rows}`,
          button: { label: 'Open schedule', url: adminUrl('/doctor-appointments') },
          footer: DOCTOR_FOOTER,
        }),
      });
    }
  }

  /** Half an hour after the slot: ask the doctor to close it before the 24h auto-rule. */
  doctorCloseReminder(a: IAppointment) {
    this.deliver('close reminder (doctor)', {
      to: a.docData?.email,
      subject: `Did ${a.userData?.name} attend? (${a.slotTime})`,
      html: layout({
        title: 'Please close this appointment',
        tone: 'orange',
        body: `<p>Your appointment with <strong>${escapeHtml(a.userData?.name)}</strong> at ${escapeHtml(a.slotTime)} today hasn't been recorded yet.</p>
               <p>Mark it <strong>completed</strong> (with vitals and prescriptions) or <strong>patient didn't show</strong>. If it's still open 24 hours after the slot, it's treated as missed by the doctor and the patient gets a <strong>full refund</strong>.</p>`,
        button: { label: 'Open schedule', url: adminUrl('/doctor-appointments') },
        footer: DOCTOR_FOOTER,
      }),
    });
  }

  /** A no-show was recorded (by the doctor, the admin, or the 24h rule). */
  appointmentMissed(a: IAppointment, refund: IRefund | null) {
    const patientMissed = a.missed?.by === 'patient';
    const auto = a.missed?.markedBy === 'system';
    const paid = refund ? money(refund.amount) : '';
    const refundLine = !refund
      ? ''
      : refund.status === 'refunded' && refund.method === 'wallet'
        ? `<p><strong>${refund.percent}% of your fee (${escapeHtml(paid)}) is back in your wallet</strong>, ready to use.</p>`
        : refund.status === 'refunded'
        ? `<p><strong>${refund.percent}% of your fee (${escapeHtml(paid)}) has been refunded</strong> to the card you paid with. It usually shows in 5–10 working days.</p>`
        : `<p><strong>You're due a ${refund.percent}% refund (${escapeHtml(paid)}).</strong> Our team is processing it and will be in touch.</p>`;

    this.deliver('missed (patient)', {
      to: a.userData?.email,
      subject: patientMissed
        ? `Missed appointment with ${a.docData?.name}`
        : `Sorry, ${a.docData?.name} missed your appointment`,
      html: layout({
        title: patientMissed ? 'You missed your appointment' : 'Your doctor missed your appointment',
        tone: patientMissed ? 'orange' : 'red',
        body: `<p>Hi ${escapeHtml(firstName(a.userData?.name))}, ${
          patientMissed
            ? `your appointment was recorded as missed because you didn't attend.${
                refund ? ' As the time was held for you, half of the fee is kept.' : ''
              }`
            : "we're sorry: this appointment didn't go ahead because the doctor wasn't able to attend."
        }</p>${details(visitRows(a))}${refundLine}`,
        button: { label: 'Book a new time', url: patientUrl(`/appointments/${a.docId}`) },
        secondary: { label: 'Message the doctor', url: patientUrl(`/messages?doctor=${a.docId}&appointment=${a._id}`) },
      }),
    });
    this.app.send(a.userId, {
      title: patientMissed ? 'Missed appointment' : 'Your doctor missed your appointment',
      message: `${a.docData?.name} · ${prettyDate(a.slotDate)} ${a.slotTime}${
        refund
          ? ` · ${refund.percent}% refund (${paid})${
              refund.method === 'wallet' ? ' back in your wallet' : refund.status === 'refunded' ? ' sent' : ' being processed'
            }`
          : ''
      }`,
      type: refund ? 'payment' : 'appointment',
      link: '/my-appointments',
    });

    this.deliver('missed (doctor)', {
      to: a.docData?.email,
      subject: patientMissed
        ? `No-show recorded: ${a.userData?.name}, ${prettyDate(a.slotDate)}`
        : `Missed appointment: ${a.userData?.name}, ${prettyDate(a.slotDate)}`,
      html: layout({
        title: patientMissed ? 'No-show recorded' : 'Appointment marked as missed by you',
        tone: patientMissed ? 'teal' : 'red',
        body: `${
          patientMissed
            ? `<p>${escapeHtml(a.userData?.name)} didn't attend.${refund ? ` They were refunded ${refund.percent}%; you keep ${100 - refund.percent}% of the fee.` : ''}</p>`
            : auto
              ? `<p>This visit was still open 24 hours after its slot, so it was treated as missed by the doctor.${refund ? ' The patient was refunded in full.' : ''}</p>`
              : `<p>This visit was recorded as missed by the doctor.${refund ? ' The patient was refunded in full.' : ''}</p>`
        }${details([
          ['Patient', a.userData?.name],
          ['Visit', `${prettyDate(a.slotDate)}, ${a.slotTime}`],
          ['Fee', money(a.amount)],
          ['Refunded', refund ? `${refund.percent}% (${paid})` : 'Not paid, nothing to refund'],
        ])}`,
        button: { label: 'Open schedule', url: adminUrl('/doctor-appointments') },
        footer: DOCTOR_FOOTER,
      }),
    });
  }

  /** A refund that couldn't go through Stripe automatically; the admin must send it. */
  refundNeedsAdmin(a: IAppointment, refund: IRefund) {
    this.deliver('refund needs admin', {
      to: process.env.ADMIN_EMAIL ?? '',
      subject: `Action needed: refund ${money(refund.amount)} to ${a.userData?.name}`,
      html: layout({
        title: 'A refund needs to be sent by hand',
        tone: 'red',
        body: `<p>${
          refund.status === 'manual'
            ? 'This appointment was paid before payment references were saved, so it can&#39;t be refunded automatically.'
            : `Stripe refused the automatic refund: <em>${escapeHtml(refund.error)}</em>`
        }</p>${details([
          ['Patient', `${a.userData?.name} (${a.userData?.email})`],
          ['Doctor', a.docData?.name],
          ['Visit', `${prettyDate(a.slotDate)}, ${a.slotTime}`],
          ['Refund', `${refund.percent}% of ${money(a.amount)} = ${money(refund.amount)}`],
          ['Appointment ID', String(a._id)],
        ])}<p>Refund it from the Stripe dashboard (Payments → find the payment → Refund).</p>`,
        button: { label: 'Open Stripe payments', url: 'https://dashboard.stripe.com/payments' },
        footer: 'Sent to the clinic admin.',
      }),
    });
  }

  // --- wish well gifting ---

  coinsPurchased(user: Person, coins: number, cents: number) {
    this.deliver('coins purchased', {
      to: user.email,
      subject: `${coins.toLocaleString('en-US')} coins added to your wallet`,
      html: layout({
        title: 'Coins added',
        body: `<p>Hi ${escapeHtml(firstName(user.name))}, thanks for supporting Wish Well patients.</p>${details([
          ['Coins', coins.toLocaleString('en-US')],
          ['Paid', money(cents / 100)],
          ['Date', clinicDateTime(new Date())],
        ])}<p style="font-size:13px;color:#64748b;">Keep this email as your receipt.</p>`,
        button: { label: 'Send a gift', url: patientUrl('/wish-well') },
      }),
    });
    this.app.send(idOf(user), {
      title: 'Coins added',
      message: `${coins.toLocaleString('en-US')} coins are in your wallet.`,
      type: 'payment',
      link: '/wallet',
      inAppOnly: true,
    });
  }

  /** A Wish Well patient received a paid gift. */
  giftReceived(
    patientId: string,
    patientName: string,
    gift: { name: string; emoji: string; coins: number },
    fromName: string,
    fundCents: number,
    message?: string,
  ) {
    this.users
      .findById(patientId)
      .select(['email'])
      .lean()
      .then((u) => {
        if (!u?.email) return;
        this.deliver('gift received', {
          to: u.email,
          subject: `${fromName} sent you ${gift.emoji} ${gift.name}`,
          html: layout({
            title: `${gift.emoji} You received a ${gift.name}!`,
            body: `<p>Hi ${escapeHtml(firstName(patientName))}, <strong>${escapeHtml(fromName)}</strong> sent you a ${escapeHtml(gift.name)} on the Wish Well.</p>
                   ${message ? quote(message) : ''}
                   <p><strong>${escapeHtml(money(fundCents / 100))}</strong> has been added to your care fund.</p>`,
            button: { label: 'See your care fund', url: patientUrl('/wallet') },
          }),
        });
      })
      .catch((err) => this.logger.warn(`gift email lookup failed: ${err.message}`));
    this.app.send(patientId, {
      title: `${fromName} sent you ${gift.emoji} ${gift.name}`,
      message: `${message ? `“${message}” · ` : ''}${money(fundCents / 100)} added to your care fund.`,
      type: 'care',
      link: '/wallet',
    });
  }

  payoutRequested(p: { _id: unknown; userName: string; userEmail: string; cents: number; bankName: string }) {
    this.deliver('payout requested (admin)', {
      to: process.env.ADMIN_EMAIL ?? '',
      subject: `Withdrawal request: ${money(p.cents / 100)} for ${p.userName}`,
      html: layout({
        title: 'A patient wants to withdraw their care fund',
        tone: 'orange',
        body: `${details([
          ['Patient', `${p.userName} (${p.userEmail})`],
          ['Amount', money(p.cents / 100)],
          ['Bank', p.bankName],
        ])}<p>Verify their identity, send the transfer, then mark it paid with the reference.</p>`,
        button: { label: 'Open payouts', url: adminUrl('/payouts') },
        footer: 'Sent to the clinic admin.',
      }),
    });
  }

  payoutDecided(p: {
    userId: string;
    userName: string;
    userEmail: string;
    cents: number;
    status: string;
    reference?: string;
    adminNote?: string;
  }) {
    const paid = p.status === 'paid';
    this.deliver('payout decided', {
      to: p.userEmail,
      subject: paid ? `Sent: ${money(p.cents / 100)} from your care fund` : 'Your withdrawal was not approved',
      html: layout({
        title: paid ? 'Your care fund withdrawal was sent' : 'Withdrawal not approved',
        tone: paid ? 'teal' : 'orange',
        body: paid
          ? `<p>Hi ${escapeHtml(firstName(p.userName))}, we've sent ${escapeHtml(money(p.cents / 100))} to your bank account.</p>${details([
              ['Reference', p.reference],
              ['Sent on', clinicDateTime(new Date())],
            ])}<p style="font-size:13px;color:#64748b;">Bank transfers can take 1–3 working days to arrive.</p>`
          : `<p>Hi ${escapeHtml(firstName(p.userName))}, your withdrawal of ${escapeHtml(money(p.cents / 100))} wasn't approved, and the amount is back in your care fund.</p>${
              p.adminNote ? quote(p.adminNote, 'orange') : ''
            }`,
        button: { label: 'Open your wallet', url: patientUrl('/wallet') },
      }),
    });
    this.app.send(p.userId, {
      title: paid ? 'Care fund withdrawal sent' : 'Withdrawal not approved',
      message: paid
        ? `${money(p.cents / 100)} is on its way to your bank (ref ${p.reference}).`
        : `${money(p.cents / 100)} is back in your care fund.${p.adminNote ? ` ${p.adminNote}` : ''}`,
      type: 'payment',
      link: '/wallet',
    });
  }

  // --- medicines ---

  doseReminder(a: IAppointment, med: IMedicine, dueAt: Date) {
    const time = clinicTime(dueAt);
    this.deliver('dose reminder', {
      to: a.userData?.email,
      subject: `Reminder: ${med.name} at ${time}`,
      html: layout({
        title: `Time for your ${med.name} soon`,
        tone: 'orange',
        body: `<p>Hi ${escapeHtml(firstName(a.userData?.name))}, your next dose of <strong>${escapeHtml(med.name)}</strong> is due at <strong>${escapeHtml(time)}</strong>.</p>
               <p>Once you've taken it, tap <strong>I took it</strong> so your doctor can see you're on track. You have ${med.remainingQuantity} dose${med.remainingQuantity === 1 ? '' : 's'} left.</p>`,
        button: { label: 'Log my dose', url: patientUrl('/medication-history') },
        footer: `Prescribed by ${escapeHtml(a.docData?.name)}. You get a reminder before each dose while the course is running.`,
      }),
    });
    const minutes = Math.round((dueAt.getTime() - Date.now()) / 60_000);
    this.app.send(a.userId, {
      title: `Time for ${med.name}`,
      message:
        minutes > 0
          ? `Your next dose is due in ${minutes} minutes (${time}).`
          : 'Your dose is due now. Tap "I took it" once you have taken it.',
      type: 'dose',
      link: '/medication-history',
      tag: `dose-${a._id}-${med.name}`,
    });
  }

  /** A dose went past its grace window without being logged. Patient + care circle. */
  missedDose(a: IAppointment, med: IMedicine, dueAt: Date) {
    const time = clinicTime(dueAt);
    this.deliver('missed dose', {
      to: a.userData?.email,
      subject: `Missed: your ${med.name} dose (due ${time})`,
      html: layout({
        title: `You missed a dose of ${med.name}`,
        tone: 'red',
        body: `<p>Hi ${escapeHtml(firstName(a.userData?.name))}, your <strong>${escapeHtml(med.name)}</strong> dose was due at <strong>${escapeHtml(time)}</strong> and hasn't been logged.</p>
               <p>If you've taken it, log it now. If you're not sure what to do, message ${escapeHtml(a.docData?.name ?? 'your doctor')}; don't take a double dose without asking.</p>`,
        button: { label: 'Log my dose', url: patientUrl('/medication-history') },
        secondary: { label: 'Ask my doctor', url: patientUrl(`/messages?doctor=${a.docId}&appointment=${a._id}`) },
      }),
    });

    this.app.send(a.userId, {
      title: `Missed dose: ${med.name}`,
      message: `It was due at ${time}. Log it if you took it, or ask your doctor what to do.`,
      type: 'alert',
      link: '/medication-history',
      tag: `dose-${a._id}-${med.name}`,
      urgent: true,
    });

    this.toCareCircle(
      a.userId,
      'missed dose',
      (w) => ({
        subject: `${firstName(a.userData?.name)} missed a dose of ${med.name}`,
        html: layout({
          title: `${a.userData?.name} missed a dose`,
          tone: 'red',
          body: `<p>Hi ${escapeHtml(firstName(w.name))}, ${escapeHtml(firstName(a.userData?.name))}'s <strong>${escapeHtml(med.name)}</strong> was due at <strong>${escapeHtml(time)}</strong> and hasn't been logged yet. You may want to check in on them.</p>`,
          button: { label: 'See their medicines', url: patientUrl(`/watching/${a.userId}`) },
          footer: CARE_FOOTER,
        }),
      }),
      {
        title: `${firstName(a.userData?.name)} missed a dose`,
        message: `${med.name} was due at ${time} and hasn't been logged.`,
        type: 'care',
        urgent: true,
      },
    );
  }

  /** The patient logged a dose before it was due; their doctor should know. */
  earlyDose(a: IAppointment, medicineName: string) {
    this.deliver('early dose', {
      to: a.docData?.email,
      subject: `Early dose: ${a.userData?.name} took ${medicineName} early`,
      html: layout({
        title: 'A patient took a dose early',
        tone: 'red',
        body: `<p><strong>${escapeHtml(a.userData?.name)}</strong> logged a dose of <strong>${escapeHtml(medicineName)}</strong> before it was due. Their visit has been marked Critical.</p>
               ${details([
                 ['Visit', `${prettyDate(a.slotDate)}, ${a.slotTime}`],
                 ['Logged at', clinicDateTime(new Date())],
               ])}`,
        button: { label: 'Message the patient', url: adminUrl(`/doctor-messages?patient=${a.userId}&appointment=${a._id}`) },
        footer: 'You are receiving this because you prescribed this medicine.',
      }),
    });
  }

  // --- messages ---

  /** A normal (non-urgent) chat message from a doctor. */
  doctorMessage(to: Person, doctor: { _id: string; name: string; email?: string }, text: string) {
    this.deliver('doctor message', {
      to: to.email,
      replyTo: doctor.email,
      subject: `New message from ${doctor.name}`,
      html: layout({
        title: `${doctor.name} sent you a message`,
        body: `<p>Hi ${escapeHtml(firstName(to.name))},</p>${quote(text)}`,
        button: { label: 'Read and reply', url: patientUrl(`/messages?doctor=${doctor._id}`) },
        footer: "We email you when your doctor writes and you haven't read their earlier messages yet, at most once an hour.",
      }),
      text: `${doctor.name} sent you a message:\n\n"${text}"\n\nReply in the app: ${patientUrl(`/messages?doctor=${doctor._id}`)}`,
    });
  }

  /** The doctor's urgent chat message / alert. Patient gets the text; the care circle a heads-up. */
  urgentMessage(to: Person & { _id: string }, doctor: { _id: string; name: string; email?: string }, text: string) {
    this.deliver('urgent message', {
      to: to.email,
      replyTo: doctor.email,
      subject: `URGENT: message from ${doctor.name}`,
      html: layout({
        title: `Urgent message from ${doctor.name}`,
        tone: 'red',
        body: `<p>Hi ${escapeHtml(firstName(to.name))},</p>${quote(text, 'red')}`,
        button: { label: 'Open and reply', url: patientUrl(`/messages?doctor=${doctor._id}`) },
      }),
      text: `${doctor.name} sent you an urgent message:\n\n"${text}"\n\nOpen the app to reply: ${patientUrl('/messages')}`,
    });

    // the message itself is private; the care circle only hears that it happened
    this.toCareCircle(
      to._id,
      'urgent message',
      (w) => ({
        subject: `${firstName(to.name)}'s doctor sent an urgent message`,
        html: layout({
          title: `${to.name} needs attention`,
          tone: 'red',
          body: `<p>Hi ${escapeHtml(firstName(w.name))}, ${escapeHtml(doctor.name)} just sent ${escapeHtml(firstName(to.name))} an urgent message and marked them as critical. You may want to check in with them.</p>`,
          button: { label: 'See how they are doing', url: patientUrl(`/watching/${to._id}`) },
          footer: CARE_FOOTER,
        }),
      }),
      {
        title: `${firstName(to.name)} needs attention`,
        message: `${doctor.name} sent them an urgent message. You may want to check in.`,
        type: 'care',
        urgent: true,
      },
    );
  }

  // --- care circle ---

  /** Someone asked to watch over this patient. */
  careRequest(patient: Person, requester: Person) {
    this.deliver('care request', {
      to: patient.email,
      subject: `${requester.name} wants to join your care circle`,
      html: layout({
        title: `${requester.name} wants to look out for you`,
        body: `<p>Hi ${escapeHtml(firstName(patient.name))}, <strong>${escapeHtml(requester.name)}</strong> (${escapeHtml(requester.email)}) asked to join your care circle.</p>
               <p>If you accept, they'll be able to see your appointments, medicines and vitals, and we'll let them know if you miss a dose or your doctor marks something urgent. You can remove them at any time.</p>`,
        button: { label: 'Review request', url: patientUrl('/watching-over') },
        footer: "If you don't know this person, just ignore the request.",
      }),
    });
    this.app.send(idOf(patient), {
      title: `${requester.name} wants to join your care circle`,
      message: 'Accept to let them see your appointments and medicines.',
      type: 'care',
      link: '/watching-over',
    });
  }

  /** The patient said yes or no. Tell the requester; on yes, confirm to the patient too. */
  careResponse(patient: Person, requester: Person, patientId: string, accepted: boolean) {
    this.deliver('care response', {
      to: requester.email,
      subject: accepted
        ? `You're now in ${firstName(patient.name)}'s care circle`
        : `${firstName(patient.name)} declined your care circle request`,
      html: layout({
        title: accepted ? `You're watching over ${patient.name}` : 'Request declined',
        tone: accepted ? 'teal' : 'orange',
        body: accepted
          ? `<p>Hi ${escapeHtml(firstName(requester.name))}, <strong>${escapeHtml(patient.name)}</strong> accepted your request. You can now see their appointments and medicines, and we'll email you if they miss a dose, book a visit or their doctor sends something urgent.</p>`
          : `<p>Hi ${escapeHtml(firstName(requester.name))}, <strong>${escapeHtml(patient.name)}</strong> declined your care circle request.</p>`,
        button: accepted ? { label: 'Open their dashboard', url: patientUrl(`/watching/${patientId}`) } : undefined,
      }),
    });
    this.app.send(idOf(requester), {
      title: accepted ? `You're now watching over ${firstName(patient.name)}` : 'Care circle request declined',
      message: accepted
        ? "You'll be told if they miss a dose, book a visit or get an urgent message."
        : `${patient.name} declined your request.`,
      type: 'care',
      link: accepted ? `/watching/${patientId}` : '/watching-over',
    });
    if (accepted) {
      this.app.send(patientId, {
        title: `${requester.name} is now in your care circle`,
        message: 'They can see your appointments and medicines. You can remove them any time.',
        type: 'care',
        link: '/watching-over',
        inAppOnly: true,
      });
      this.deliver('care accepted (patient)', {
        to: patient.email,
        subject: `${requester.name} is now in your care circle`,
        html: layout({
          title: `${requester.name} is now watching over you`,
          body: `<p>Hi ${escapeHtml(firstName(patient.name))}, ${escapeHtml(requester.name)} can now see your appointments, medicines and vitals, and will be emailed if you miss a dose or get an urgent message from your doctor.</p>
                 <p>Changed your mind? You can remove them any time.</p>`,
          button: { label: 'Manage care circle', url: patientUrl('/watching-over') },
        }),
      });
    }
  }

  /** A connection was ended; tell the other person. */
  careRemoved(to: Person, by: Person, role: 'watcher' | 'patient') {
    this.deliver('care removed', {
      to: to.email,
      subject:
        role === 'patient'
          ? `${firstName(by.name)} removed you from their care circle`
          : `${firstName(by.name)} stopped watching over you`,
      html: layout({
        title: 'Care circle updated',
        tone: 'orange',
        body:
          role === 'patient'
            ? `<p>Hi ${escapeHtml(firstName(to.name))}, ${escapeHtml(by.name)} removed you from their care circle, so you won't see their health updates anymore.</p>`
            : `<p>Hi ${escapeHtml(firstName(to.name))}, ${escapeHtml(by.name)} is no longer in your care circle and can't see your health updates anymore.</p>`,
        button: { label: 'Open care circle', url: patientUrl('/watching-over') },
      }),
    });
    this.app.send(idOf(to), {
      title: 'Care circle updated',
      message:
        role === 'patient'
          ? `${by.name} removed you from their care circle.`
          : `${by.name} is no longer in your care circle.`,
      type: 'care',
      link: '/watching-over',
      inAppOnly: true,
    });
  }
}
