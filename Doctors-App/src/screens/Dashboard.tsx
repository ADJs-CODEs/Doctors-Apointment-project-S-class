"use client";

import {
  RiAddLine,
  RiAlarmWarningLine,
  RiArrowRightSLine,
  RiBankCardLine,
  RiCalendarCheckLine,
  RiCapsuleLine,
  RiCheckLine,
  RiDashboard3Line,
  RiFileList3Line,
  RiHeart3Line,
  RiHeartPulseLine,
  RiMessage3Line,
  RiNotification3Line,
  RiShieldCheckLine,
  RiTeamLine,
  RiTempHotLine,
  RiTimeLine,
} from "@remixicon/react";
import { motion } from "framer-motion";
import { type ReactNode, useContext, useState } from "react";
import PayAppointmentModal from "@/components/patient/PayAppointmentModal";
import { AppContext } from "@/Context/AppContext";
import { useMessages } from "@/Context/MessagesContext";
import MedicineRow from "@/components/patient/MedicineRow";
import { DeviceNotificationsCard } from "@/components/patient/DeviceNotifications";
import RecentGiftsBanner from "@/components/wishwell/RecentGiftsBanner";
import { useDashboard, type WishWellEntry } from "@/hooks/useDashboard";
import { doseKey } from "@/hooks/useDoseLogger";
import { Link } from "@/lib/navigation";
import type { AppContextType, Appointment } from "@/types";

// --- small helpers ---

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
};

const dayLabel = (at: Date) => {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(at) - startOf(new Date())) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1 && days < 7) return `In ${days} days`;
  return at.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const timeLabel = (at: Date) =>
  at.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });

const relativeTime = (iso: string | Date) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

function Card({
  title,
  icon,
  action,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`bg-white rounded-[28px] border border-slate-100 shadow-clinical p-5 sm:p-6 ${className}`}
    >
      <header className="flex items-center justify-between gap-3 mb-5">
        <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[2px] text-slate-400">
          <span className="text-teal-600">{icon}</span>
          {title}
        </h2>
        {action}
      </header>
      {children}
    </motion.section>
  );
}

function SeeAll({ to, label = "See all" }: { to: string; label?: string }) {
  return (
    <Link to={to} className="flex items-center text-[11px] font-bold text-teal-600 hover:text-teal-700">
      {label}
      <RiArrowRightSLine size={16} />
    </Link>
  );
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[28px] bg-slate-200/60 ${className}`} />;
}

// --- sections ---

function WishWellTicker({ entries }: { entries: WishWellEntry[] }) {
  if (!entries.length) return null;
  // the list is rendered twice so the scroll can loop without a gap
  const loop = [...entries, ...entries];
  return (
    <Link
      to="/wish-well"
      className="group block overflow-hidden rounded-2xl bg-gradient-to-r from-rose-50 via-white to-teal-50 border border-rose-100"
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        {loop.map((entry, i) => (
          <div key={`${entry._id}-${i}`} className="flex items-center gap-3 px-6 py-3 shrink-0">
            <img
              src={entry.patientImage || "/assets/profile_pic.png"}
              alt=""
              className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
            />
            <p className="text-[13px] text-slate-600 whitespace-nowrap">
              <span className="font-black text-slate-900">{entry.patientName}</span> is fighting{" "}
              <span className="font-bold text-rose-500">{entry.condition}</span>
              {entry.totalEmojis > 0 && <> · {entry.totalEmojis} wishes so far</>}
            </p>
            <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-rose-500">
              <RiHeart3Line size={14} /> Send love
            </span>
            <span className="text-slate-200">•</span>
          </div>
        ))}
      </div>
    </Link>
  );
}

function Vital({ icon, label, value, unit }: { icon: ReactNode; label: string; value?: string; unit: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      {icon}
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">{label}</p>
      <p className="text-xl font-black text-slate-900">
        {value || "--"} <span className="text-[11px] font-medium text-slate-400">{value ? unit : ""}</span>
      </p>
    </div>
  );
}

// --- page ---

export default function Dashboard() {
  const { userData, currencySymbol } = useContext(AppContext) as AppContextType;
  const d = useDashboard();
  const [payFor, setPayFor] = useState<Appointment | null>(null);
  const firstName = typeof userData?.name === "string" ? userData.name.split(" ")[0] : "";
  // the most pressing unread conversation: urgent first, then newest
  const unreadConversations = useMessages().conversations.filter((c) => c.unread > 0);
  const unreadChat =
    unreadConversations.find((c) => c.urgentUnread > 0) ?? unreadConversations[0] ?? null;
  const otherUnreadDoctors = Math.max(0, unreadConversations.length - 1);

  if (d.loading) {
    return (
      <div className="max-w-6xl mx-auto py-6 space-y-6">
        <Skeleton className="h-20" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-56 lg:col-span-2" />
          <Skeleton className="h-56" />
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const next = d.nextAppointment;

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {d.doseDialog}
      <PayAppointmentModal appointment={payFor} onClose={() => setPayFor(null)} onPaid={d.reload} />
      {/* greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-bold text-slate-400">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            {greeting()}
            {firstName && (
              <>
                , <span className="font-serif italic font-normal text-teal-600">{firstName}</span>
              </>
            )}
          </h1>
        </div>
        <Link
          to="/doctors"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-[12px] font-black uppercase tracking-wider hover:bg-teal-600 transition-colors"
        >
          <RiAddLine size={18} /> Book appointment
        </Link>
      </div>

      {/* unread doctor messages (from the chat); gone once they're read */}
      {unreadChat && unreadChat.lastMessage && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-[24px] border ${
            unreadChat.urgentUnread ? "bg-red-50 border-red-200" : "bg-teal-50/60 border-teal-100"
          }`}
        >
          <div className="flex gap-4 items-start flex-1 min-w-0">
            <div className={unreadChat.urgentUnread ? "text-red-500" : "text-teal-600"}>
              {unreadChat.urgentUnread ? <RiAlarmWarningLine size={24} /> : <RiMessage3Line size={24} />}
            </div>
            <div className="min-w-0">
              <p
                className={`text-[10px] font-black uppercase tracking-[2px] ${
                  unreadChat.urgentUnread ? "text-red-500" : "text-teal-700"
                }`}
              >
                {unreadChat.urgentUnread ? "Urgent message" : "New message"} from {unreadChat.doctor.name} ·{" "}
                {relativeTime(unreadChat.lastMessage.createdAt)}
                {unreadChat.unread > 1 && ` · ${unreadChat.unread} unread`}
              </p>
              <p className="text-slate-800 font-medium mt-1 line-clamp-2">“{unreadChat.lastMessage.text}”</p>
              {otherUnreadDoctors > 0 && (
                <Link to="/messages" className="inline-block mt-1 text-[12px] font-bold text-slate-500 hover:text-teal-600">
                  + messages from {otherUnreadDoctors} other doctor{otherUnreadDoctors > 1 ? "s" : ""}
                </Link>
              )}
            </div>
          </div>
          <Link
            to={`/messages?doctor=${unreadChat.doctor._id}`}
            className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-colors ${
              unreadChat.urgentUnread ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-teal-600"
            }`}
          >
            Open chat <RiArrowRightSLine size={16} />
          </Link>
        </div>
      )}

      <DeviceNotificationsCard />

      <WishWellTicker entries={d.criticalWishWell} />
      <RecentGiftsBanner />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* next appointment */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 rounded-[28px] bg-slate-900 text-white p-6 sm:p-7 relative overflow-hidden"
        >
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="relative flex items-center justify-between mb-5">
            <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[2px] text-teal-300">
              <RiCalendarCheckLine size={16} /> Next appointment
            </h2>
            {d.upcoming.length > 1 && (
              <Link to="/my-appointments" className="text-[11px] font-bold text-slate-300 hover:text-white">
                +{d.upcoming.length - 1} more
              </Link>
            )}
          </div>

          {next ? (
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
              <img
                src={next.appointment.docData.image}
                alt=""
                className="w-20 h-20 rounded-2xl object-cover bg-white/10"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xl font-black truncate">{next.appointment.docData.name}</p>
                <p className="text-[12px] font-bold uppercase tracking-wider text-teal-300">
                  {next.appointment.docData.speciality}
                </p>
                <p className="mt-2 flex items-center gap-2 text-slate-200">
                  <RiTimeLine size={16} />
                  <span className="font-bold">{dayLabel(next.at!)}</span> at {timeLabel(next.at!)}
                </p>
              </div>
              <div className="flex sm:flex-col gap-2 shrink-0">
                {next.appointment.payment ? (
                  <span className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-500/15 text-teal-300 text-[11px] font-black uppercase tracking-wider">
                    <RiShieldCheckLine size={15} /> Paid
                  </span>
                ) : (
                  <button
                    onClick={() => setPayFor(next.appointment)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-500 text-slate-900 text-[11px] font-black uppercase tracking-wider hover:bg-teal-400 disabled:opacity-60"
                  >
                    <RiBankCardLine size={15} /> Pay {currencySymbol}
                    {next.appointment.amount}
                  </button>
                )}
                <Link
                  to="/my-appointments"
                  className="flex items-center justify-center px-4 py-2.5 rounded-xl bg-white/10 text-[11px] font-black uppercase tracking-wider hover:bg-white/20"
                >
                  Manage
                </Link>
              </div>
            </div>
          ) : (
            <div className="relative">
              <p className="text-lg font-bold">No upcoming appointments.</p>
              <p className="text-slate-400 text-sm mt-1">Book a specialist when you need one.</p>
              <Link
                to="/doctors"
                className="inline-flex mt-4 items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 text-slate-900 text-[11px] font-black uppercase tracking-wider"
              >
                <RiAddLine size={15} /> Find a doctor
              </Link>
            </div>
          )}
        </motion.section>

        {/* missed doses */}
        <Card
          title="Missed doses"
          icon={<RiAlarmWarningLine size={16} />}
          className={d.missed.length ? "border-red-100 bg-red-50/40" : ""}
        >
          {d.missed.length ? (
            <ul className="space-y-3">
              {d.missed.map((m) => (
                <li key={`${m.appointmentId}-${m.med.name}`} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 truncate">{m.med.name}</p>
                    <p className="text-[12px] text-red-500 font-bold">
                      {m.state.kind === "missed" && `${m.state.missedDoses} dose${m.state.missedDoses > 1 ? "s" : ""} missed`}
                    </p>
                  </div>
                  <button
                    onClick={() => d.logDose(m.appointmentId, m.med)}
                    disabled={!!d.loggingKey}
                    className="shrink-0 px-3 py-2 rounded-xl bg-red-500 text-white text-[11px] font-black uppercase tracking-wider disabled:opacity-50"
                  >
                    Take now
                  </button>
                </li>
              ))}
              <p className="text-[11px] text-slate-400 pt-1">
                Don&apos;t double up to catch up. If you&apos;re unsure, ask your doctor or the assistant.
              </p>
            </ul>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <RiCheckLine size={22} />
              </div>
              <div>
                <p className="font-black text-slate-900">You&apos;re on track</p>
                <p className="text-[12px] text-slate-400">
                  {d.medicines.length ? "No missed doses." : "No active medications."}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* today's medications */}
        <Card
          title="Today's medications"
          icon={<RiCapsuleLine size={16} />}
          action={<SeeAll to="/medication-history" label="History" />}
          className="lg:col-span-2"
        >
          {d.medicines.length ? (
            <div className="divide-y divide-slate-100">
              {d.medicines.map((item) => (
                <MedicineRow
                  key={doseKey(item.appointmentId, item.med.name)}
                  med={item.med}
                  state={item.state}
                  doctorName={item.doctorName}
                  busy={d.loggingKey === doseKey(item.appointmentId, item.med.name)}
                  disabled={!!d.loggingKey}
                  onTake={() => d.logDose(item.appointmentId, item.med)}
                />
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">
              Nothing to take right now. Prescriptions from your doctor will show up here.
            </p>
          )}
        </Card>

        {/* care circle & alerts */}
        <Card title="Care circle" icon={<RiTeamLine size={16} />} action={<SeeAll to="/watching-over" />}>
          {d.pendingRequests.length > 0 && (
            <Link
              to="/my-profile"
              className="flex items-center justify-between gap-2 mb-4 p-3 rounded-2xl bg-amber-50 text-amber-800 text-[12px] font-bold"
            >
              {d.pendingRequests.length} request{d.pendingRequests.length > 1 ? "s" : ""} to watch over you
              <RiArrowRightSLine size={16} />
            </Link>
          )}
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-2">Watching over you</p>
              {d.watchers.length ? (
                <div className="flex -space-x-2">
                  {d.watchers.slice(0, 6).map((c) => (
                    <img
                      key={c._id}
                      src={c.watcher?.image}
                      alt={c.watcher?.name}
                      title={c.watcher?.name}
                      className="w-9 h-9 rounded-full object-cover border-2 border-white bg-slate-100"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-slate-500">No one yet.</p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-2">You&apos;re watching</p>
              {d.watching.length ? (
                <ul className="space-y-2">
                  {d.watching.slice(0, 3).map((c) => (
                    <li key={c._id}>
                      <Link
                        to={`/watching/${c.patient?._id}`}
                        className="flex items-center gap-3 rounded-xl hover:bg-slate-50 p-1 -m-1"
                      >
                        <img
                          src={c.patient?.image}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover bg-slate-100"
                        />
                        <span className="text-[13px] font-bold text-slate-700 truncate">{c.patient?.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-slate-500">No one yet.</p>
              )}
            </div>
          </div>
        </Card>

        {/* latest vitals & report */}
        <Card
          title="Latest vitals & report"
          icon={<RiHeartPulseLine size={16} />}
          action={<SeeAll to="/medication-history" />}
          className="lg:col-span-2"
        >
          {d.latestReport ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Vital
                  icon={<RiHeartPulseLine size={20} className="text-rose-500" />}
                  label="Heart rate"
                  value={d.latestReport.healthData?.heartRate}
                  unit="BPM"
                />
                <Vital
                  icon={<RiDashboard3Line size={20} className="text-blue-500" />}
                  label="Blood pressure"
                  value={d.latestReport.healthData?.bloodPressure}
                  unit="mmHg"
                />
                <Vital
                  icon={<RiTempHotLine size={20} className="text-orange-500" />}
                  label="Temperature"
                  value={d.latestReport.healthData?.temperature}
                  unit="°C"
                />
              </div>
              {d.latestReport.healthData?.doctorNotes && (
                <div className="mt-4 p-4 rounded-2xl border border-slate-100">
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    <RiFileList3Line size={14} /> Doctor&apos;s notes · {d.latestReport.docData?.name}
                  </p>
                  <p className="text-[14px] text-slate-700">{d.latestReport.healthData.doctorNotes}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-400 text-sm">Your vitals and doctor&apos;s notes appear here after a visit.</p>
          )}
        </Card>

        {/* recent notifications */}
        <Card title="Recent alerts" icon={<RiNotification3Line size={16} />}>
          {d.notifications.length ? (
            <ul className="space-y-3">
              {d.notifications.slice(0, 4).map((n) => (
                <li key={n._id} className="flex gap-3">
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.isRead ? "bg-slate-200" : "bg-teal-500"}`}
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-800 truncate">{n.title}</p>
                    <p className="text-[12px] text-slate-500 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{relativeTime(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400 text-sm">You&apos;re all caught up.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
