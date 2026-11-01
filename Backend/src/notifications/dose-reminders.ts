import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { MODEL } from '../database/models';
import { hoursBetweenDoses, type IAppointment, type IMedicine } from '../database/schemas/appointment.schema';
import { BookingService } from '../appointments/booking.service';
import { MissedAppointments } from '../appointments/missed-appointments';
import { Preferences } from '../settings/preferences';
import { slotInstant } from './clinic-time';
import { EmailNotifications } from './email-notifications';

const MINUTE = 60_000;
const CHECK_EVERY = 5 * MINUTE;
// doses: reminded 15/30/60 min before (each patient's setting), and called missed once
// this grace window has passed (the app turns it red)
const MISSED_AFTER = 60 * MINUTE;
// a dose left unlogged this long is abandoned ("stopped" in the app): stop sending
const GIVE_UP_AFTER = 24 * 60 * MINUTE;
// appointments: "in an hour" reminder, then "it's time" at the start
const APPOINTMENT_SOON = 60 * MINUTE;
const APPOINTMENT_NOW_LATE = 10 * MINUTE;
// optional day-before reminder (sent in the hour 23–24h ahead)
const DAY_BEFORE = 24 * 60 * MINUTE;
// after the slot: nudge the doctor to close it, then treat it as missed by the doctor
const ASK_DOCTOR_AFTER = 30 * MINUTE;
const AUTO_MISSED_AFTER = 24 * 60 * MINUTE;
// The 24h rule only applies to visits that crossed it in the last 3 days, so the
// first deploy doesn't sweep up (and refund) months of old, never-closed test bookings.
const AUTO_MISSED_LOOKBACK = 3 * 24 * 60 * MINUTE;

/**
 * Time-based notifications (email + in-app): dose reminders, missed doses, and
 * appointment reminders. Replaces the n8n workflows that used to schedule them.
 *
 * Runs inside the API process every 5 minutes, so it only fires while the server is
 * awake: on a host that sleeps when idle (Render free tier) anything due during the sleep
 * is skipped. Each send is claimed with an atomic update first, so two instances never
 * send the same thing twice.
 */
@Injectable()
export class DoseReminders implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('Reminders');
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    @InjectModel(MODEL.appointment) private readonly appointments: Model<IAppointment>,
    private readonly emails: EmailNotifications,
    private readonly missed: MissedAppointments,
    private readonly prefs: Preferences,
    private readonly booking: BookingService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.DOSE_REMINDERS === 'off') return;
    this.timer = setInterval(() => this.check(), CHECK_EVERY);
    this.check();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async check() {
    if (this.running) return;
    this.running = true;
    try {
      await this.booking.expireHolds(); // free slots whose holds weren't paid in time
      const sent = (await this.checkDoses()) + (await this.checkAppointments());
      if (sent) this.logger.log(`sent ${sent} reminder${sent === 1 ? '' : 's'}`);
    } catch (err: any) {
      this.logger.error(`reminder check failed: ${err.message}`);
    } finally {
      this.running = false;
    }
  }

  // --- medicines ---

  private async checkDoses() {
    const now = Date.now();
    const visits = await this.appointments.find({
      cancelled: false,
      isCompleted: true,
      'healthData.prescribedMedicines': {
        $elemMatch: { status: 'Active', remainingQuantity: { $gt: 0 }, lastTaken: { $exists: true } },
      },
    });

    let sent = 0;
    for (const visit of visits) {
      // how early this patient wants dose reminders (15/30/60 min, Settings → Reminders)
      const remindBefore = (await this.prefs.get(visit.userId)).reminders.doseMinutesBefore * MINUTE;
      for (const med of visit.healthData.prescribedMedicines) {
        if (med.status !== 'Active' || med.remainingQuantity <= 0 || !med.lastTaken) continue;
        const dueAt = new Date(new Date(med.lastTaken).getTime() + hoursBetweenDoses(med) * 60 * MINUTE);
        const untilDue = dueAt.getTime() - now;
        if (untilDue > remindBefore || -untilDue > GIVE_UP_AFTER) continue;

        // before the grace window ends: "coming up"; after it: "missed"
        if (-untilDue <= MISSED_AFTER) {
          // (each of these sends the email, the bell item and the device notification)
          if (await this.claimDose(visit, med, 'reminderSentFor', dueAt)) {
            this.emails.doseReminder(visit, med, dueAt);
            sent++;
          }
        } else if (await this.claimDose(visit, med, 'missedAlertFor', dueAt)) {
          this.emails.missedDose(visit, med, dueAt);
          sent++;
        }
      }
    }
    return sent;
  }

  /** Marks this dose's reminder (or missed alert) as sent; false if it already was. */
  private async claimDose(
    visit: IAppointment,
    med: IMedicine,
    field: 'reminderSentFor' | 'missedAlertFor',
    dueAt: Date,
  ) {
    if (med[field] && new Date(med[field]!).getTime() === dueAt.getTime()) return false;
    const claimed = await this.appointments.updateOne(
      {
        _id: visit._id,
        'healthData.prescribedMedicines': {
          $elemMatch: { name: med.name, lastTaken: med.lastTaken, [field]: { $ne: dueAt } },
        },
      },
      { $set: { [`healthData.prescribedMedicines.$.${field}`]: dueAt } },
    );
    return claimed.modifiedCount > 0;
  }

  // --- appointments ---

  private async checkAppointments() {
    const now = Date.now();
    // open visits (not done, cancelled or missed); slot dates are text, so the time
    // windows are checked below rather than in the query
    const open = await this.appointments.find({
      cancelled: false,
      isCompleted: false,
      missed: { $exists: false },
      holdExpiresAt: { $exists: false }, // unpaid holds aren't bookings yet
      date: { $gt: now - 120 * 24 * 60 * MINUTE }, // booked in the last ~4 months
    });

    let sent = 0;
    for (const visit of open) {
      const startsAt = slotInstant(visit.slotDate, visit.slotTime);
      if (!startsAt) continue;
      const until = startsAt.getTime() - now;

      // still open a day after the slot: the doctor never recorded it, so it counts as
      // missed by the doctor and a paid fee is refunded in full
      if (-until >= AUTO_MISSED_AFTER) {
        // only visits that became overdue recently; older ones predate this rule
        if (-until < AUTO_MISSED_AFTER + AUTO_MISSED_LOOKBACK) {
          await this.missed
            .markMissed(String(visit._id), 'doctor', 'system')
            .then(() => sent++)
            .catch((err) => this.logger.warn(`auto-missed ${visit._id} failed: ${err.message ?? err}`));
        }
        continue;
      }

      if (-until >= ASK_DOCTOR_AFTER) {
        if (await this.claimAppointment(visit, 'ended')) {
          this.emails.doctorCloseReminder(visit);
          sent++;
        }
        continue;
      }

      // optional "tomorrow" reminder, for patients who turned it on
      if (until <= DAY_BEFORE && until > DAY_BEFORE - 60 * MINUTE) {
        if ((await this.prefs.get(visit.userId)).reminders.appointmentDayBefore && (await this.claimAppointment(visit, 'day'))) {
          this.emails.appointmentTomorrow(visit);
          sent++;
        }
        continue;
      }

      if (until <= CHECK_EVERY && until >= -APPOINTMENT_NOW_LATE) {
        if (await this.claimAppointment(visit, 'now')) {
          this.emails.appointmentNow(visit);
          sent++;
        }
      } else if (until > CHECK_EVERY && until <= APPOINTMENT_SOON) {
        if (await this.claimAppointment(visit, 'soon')) {
          this.emails.appointmentSoon(visit, Math.round(until / MINUTE / 5) * 5 || 5);
          sent++;
        }
      }
    }
    return sent;
  }

  private async claimAppointment(visit: IAppointment, key: 'day' | 'soon' | 'now' | 'ended') {
    const claimed = await this.appointments.updateOne(
      { _id: visit._id, remindersSent: { $ne: key } },
      { $addToSet: { remindersSent: key } },
    );
    return claimed.modifiedCount > 0;
  }
}
