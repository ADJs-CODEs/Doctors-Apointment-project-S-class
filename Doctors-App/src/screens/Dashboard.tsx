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
  RiVideoOnLine,
} from "@remixicon/react";
import { motion } from "framer-motion";
import { type ReactNode, useContext, useState } from "react";
import PayAppointmentModal from "@/components/patient/PayAppointmentModal";
import JoinCallButton from "@/components/patient/JoinCallButton";
import { AppContext } from "@/Context/AppContext";
import { useMessages } from "@/Context/MessagesContext";
import MedicineRow from "@/components/patient/MedicineRow";
import { DeviceNotificationsCard } from "@/components/patient/DeviceNotifications";
import IconTile from "@/components/brand/IconTile";
import RecentGiftsBanner from "@/components/wishwell/RecentGiftsBanner";
import WishWellInvite from "@/components/wishwell/WishWellInvite";
import { useDashboard, type WishWellEntry } from "@/hooks/useDashboard";
import { doseKey } from "@/hooks/useDoseLogger";
import { Link } from "@/lib/navigation";
import type { AppContextType, Appointment } from "@/types";

// --- small helpers ---

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
};

/** "UMUTEME" / "umuteme" -> "Umuteme" (names are stored however people typed them) */
const properName = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

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
  tone,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "rose";
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`surface rounded-[24px] p-5 sm:p-6 ${className}`}
    >
      <header className="flex items-center justify-between gap-3 mb-4">
        <h2 className="flex items-center gap-2.5 text-[16px] font-bold text-ink">
          <IconTile tone={tone}>{icon}</IconTile>
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
    <Link to={to} className="flex items-center text-[13px] font-bold text-brand-ink hover:underline">
      {label}
      <RiArrowRightSLine size={16} />
    </Link>
  );
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[24px] bg-line/70 ${className}`} />;
}

// --- sections ---

function WishWellTicker({ entries }: { entries: WishWellEntry[] }) {
  if (!entries.length) return null;
  // the list is rendered twice so the scroll can loop without a gap
  const loop = [...entries, ...entries];
  return (
    <Link to="/wish-well" className="group glass block overflow-hidden rounded-[18px]">
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        {loop.map((entry, i) => (
          <div key={`${entry._id}-${i}`} className="flex items-center gap-3 px-5 py-3 shrink-0">
            <img
              src={entry.patientImage || "/assets/profile_pic.png"}
              alt=""
              className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
            />
            <p className="text-[14px] text-ink-2 whitespace-nowrap">
              <span className="font-bold text-ink">{entry.patientName}</span> is fighting{" "}
              <span className="font-semibold text-rose-600">{entry.condition}</span>
              {entry.totalEmojis > 0 && <> · <span className="num">{entry.totalEmojis}</span> wishes so far</>}
            </p>
            <span className="flex items-center gap-1 text-[13px] font-bold text-rose-600">
              <RiHeart3Line size={15} /> Send love
            </span>
            <span className="text-line">•</span>
          </div>
        ))}
      </div>
    </Link>
  );
}

function Vital({ icon, label, value, unit }: { icon: ReactNode; label: string; value?: string; unit: string }) {
  return (
    <div className="rounded-[16px] bg-canvas border border-line/70 p-4">
      {icon}
      <p className="text-[13px] font-semibold text-ink-3 mt-2">{label}</p>
      <p className="num text-[22px] text-ink leading-tight">
        {value || "--"} <span className="text-[12px] text-ink-3">{value ? unit : ""}</span>
      </p>
    </div>
  );
}

// --- page ---

export default function Dashboard() {
  const { userData, currencySymbol } = useContext(AppContext) as AppContextType;
  const d = useDashboard();
  const [payFor, setPayFor] = useState<Appointment | null>(null);
  const firstName = typeof userData?.name === "string" ? properName(userData.name.split(" ")[0]) : "";
  // the most pressing unread conversation: urgent first, then newest
  const unreadConversations = useMessages().conversations.filter((c) => c.unread > 0);
  const unreadChat =
    unreadConversations.find((c) => c.urgentUnread > 0) ?? unreadConversations[0] ?? null;
  const otherUnreadDoctors = Math.max(0, unreadConversations.length - 1);

  if (d.loading) {
    return (
      <div className="max-w-6xl mx-auto py-4 space-y-5">
        <Skeleton className="h-20" />
        <div className="grid lg:grid-cols-3 gap-5">
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
    <div className="max-w-6xl mx-auto py-4 space-y-5">
      {d.doseDialog}
      <PayAppointmentModal appointment={payFor} onClose={() => setPayFor(null)} onPaid={d.reload} />
      {/* greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[14px] font-semibold text-ink-3">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-[32px] sm:text-[40px] leading-[1.05] font-extrabold tracking-[-0.035em] text-ink">
            {greeting()}
            {firstName && <>, {firstName}</>}
          </h1>
        </div>
        {/* wide screens have this in the top bar */}
        <Link to="/doctors" className="btn btn-ink self-start sm:self-auto lg:hidden">
          <RiAddLine size={18} /> Book a visit
        </Link>
      </div>

      {/* unread doctor messages (from the chat); gone once they're read */}
      {unreadChat && unreadChat.lastMessage && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-[22px] border ${
            unreadChat.urgentUnread ? "bg-rose-50 border-rose-200" : "glass"
          }`}
        >
          <div className="flex gap-3.5 items-start flex-1 min-w-0">
            <IconTile tone={unreadChat.urgentUnread ? "rose" : "brand"}>
              {unreadChat.urgentUnread ? <RiAlarmWarningLine size={17} /> : <RiMessage3Line size={17} />}
            </IconTile>
            <div className="min-w-0">
              <p className={`text-[13px] font-bold ${unreadChat.urgentUnread ? "text-rose-600" : "text-brand-ink"}`}>
                {unreadChat.urgentUnread ? "Urgent message" : "New message"} from {unreadChat.doctor.name} ·{" "}
                {relativeTime(unreadChat.lastMessage.createdAt)}
                {unreadChat.unread > 1 && ` · ${unreadChat.unread} unread`}
              </p>
              <p className="text-[15px] text-ink mt-1 line-clamp-2">“{unreadChat.lastMessage.text}”</p>
              {otherUnreadDoctors > 0 && (
                <Link to="/messages" className="inline-block mt-1 text-[13px] font-semibold text-ink-3 hover:text-brand-ink">
                  + messages from {otherUnreadDoctors} other doctor{otherUnreadDoctors > 1 ? "s" : ""}
                </Link>
              )}
            </div>
          </div>
          <Link
            to={`/messages?doctor=${unreadChat.doctor._id}`}
            className={`btn shrink-0 !py-2.5 !text-[14px] ${
              unreadChat.urgentUnread
                ? "text-white border border-rose-700 bg-[linear-gradient(180deg,#F05468,#D62F45)]"
                : "btn-ink"
            }`}
          >
            Open chat <RiArrowRightSLine size={16} />
          </Link>
        </div>
      )}

      <DeviceNotificationsCard />

      <WishWellInvite onAnswered={d.reload} />
      <WishWellTicker entries={d.criticalWishWell} />
      <RecentGiftsBanner />

      {/* minmax(0,1fr): a long line inside a card must not widen the column past the screen */}
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-3 gap-5">
        {/* next appointment */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 rounded-[24px] text-white p-6 sm:p-7 relative overflow-hidden border border-[#071A33] bg-[linear-gradient(160deg,#1C3D68_0%,#0B2545_70%)] shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_18px_40px_rgba(11,37,69,.22)]"
        >
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-brand/30 blur-3xl" />
          <div className="relative flex items-center justify-between mb-5">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#8FE3E1]">
              <RiCalendarCheckLine size={18} /> Next appointment
            </h2>
            {d.upcoming.length > 1 && (
              <Link to="/my-appointments" className="text-[13px] font-semibold text-white/70 hover:text-white">
                +{d.upcoming.length - 1} more
              </Link>
            )}
          </div>

          {next ? (
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
              <img
                src={next.appointment.docData.image}
                alt=""
                className="w-20 h-20 rounded-[18px] object-cover bg-white/10 border border-white/15"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[22px] font-extrabold tracking-[-0.02em] truncate">{next.appointment.docData.name}</p>
                <p className="text-[14px] font-semibold text-[#8FE3E1]">{next.appointment.docData.speciality}</p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-white/85 text-[15px]">
                  <RiTimeLine size={16} />
                  <span className="font-bold text-white">{dayLabel(next.at!)}</span> at{" "}
                  <span className="num">{timeLabel(next.at!)}</span>
                  {next.appointment.kind === "video" && (
                    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-violet-100 bg-violet-500/25 px-2 py-0.5 rounded-full">
                      <RiVideoOnLine size={13} /> Video call
                    </span>
                  )}
                </p>
              </div>
              <div className="flex sm:flex-col gap-2 shrink-0">
                {next.appointment.kind === "video" && <JoinCallButton appointment={next.appointment} compact />}
                {next.appointment.payment ? (
                  <span className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand/20 text-[#8FE3E1] text-[14px] font-bold">
                    <RiShieldCheckLine size={16} /> Paid
                  </span>
                ) : (
                  <button type="button" onClick={() => setPayFor(next.appointment)} className="btn btn-teal !py-2.5 !text-[14px]">
                    <RiBankCardLine size={16} /> Pay {currencySymbol}
                    {next.appointment.amount}
                  </button>
                )}
                <Link
                  to="/my-appointments"
                  className="btn !py-2.5 !text-[14px] text-white bg-white/10 border border-white/15 hover:bg-white/20"
                >
                  Manage
                </Link>
              </div>
            </div>
          ) : (
            <div className="relative">
              <p className="text-[20px] font-bold">No upcoming appointments.</p>
              <p className="text-white/70 text-[15px] mt-1">Book a specialist when you need one, at the clinic or by video.</p>
              <Link to="/doctors" className="btn btn-teal mt-4 !py-2.5 !text-[14px]">
                <RiAddLine size={16} /> Find a doctor
              </Link>
            </div>
          )}
        </motion.section>

        {/* missed doses */}
        <Card
          title="Missed doses"
          icon={<RiAlarmWarningLine size={17} />}
          tone={d.missed.length ? "rose" : undefined}
          className={d.missed.length ? "!border-rose-200 !bg-rose-50/60" : ""}
        >
          {d.missed.length ? (
            <ul className="space-y-3">
              {d.missed.map((m) => (
                <li key={`${m.appointmentId}-${m.med.name}`} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold text-ink truncate capitalize">{m.med.name}</p>
                    <p className="text-[13px] text-rose-600 font-semibold">
                      {m.state.kind === "missed" && `${m.state.missedDoses} dose${m.state.missedDoses > 1 ? "s" : ""} missed`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => d.logDose(m.appointmentId, m.med)}
                    disabled={!!d.loggingKey}
                    className="btn shrink-0 !py-2 !px-3.5 !text-[14px] !rounded-xl text-white border border-rose-700 bg-[linear-gradient(180deg,#F05468,#D62F45)] shadow-[inset_0_1px_0_rgba(255,255,255,.22),0_6px_14px_rgba(214,47,69,.25)]"
                  >
                    Take now
                  </button>
                </li>
              ))}
              <p className="text-[13px] text-ink-3 pt-1">
                Don&apos;t double up to catch up. If you&apos;re unsure, ask your doctor or the assistant.
              </p>
            </ul>
          ) : (
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-[14px] bg-brand-soft text-brand-ink grid place-items-center">
                <RiCheckLine size={22} />
              </span>
              <div>
                <p className="text-[16px] font-bold text-ink">You&apos;re on track</p>
                <p className="text-[14px] text-ink-3">
                  {d.medicines.length ? "No missed doses." : "No active medications."}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* today's medications */}
        <Card
          title="Today's medications"
          icon={<RiCapsuleLine size={17} />}
          action={<SeeAll to="/medication-history" label="History" />}
          className="lg:col-span-2"
        >
          {d.medicines.length ? (
            <div className="divide-y divide-line">
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
            <p className="text-ink-3 text-[15px]">
              Nothing to take right now. Prescriptions from your doctor will show up here.
            </p>
          )}
        </Card>

        {/* care circle & alerts */}
        <Card title="Care circle" icon={<RiTeamLine size={17} />} action={<SeeAll to="/watching-over" />}>
          {d.pendingRequests.length > 0 && (
            <Link
              to="/my-profile"
              className="flex items-center justify-between gap-2 mb-4 p-3 rounded-[14px] bg-amber-50 border border-amber-100 text-amber-800 text-[14px] font-semibold"
            >
              {d.pendingRequests.length} request{d.pendingRequests.length > 1 ? "s" : ""} to watch over you
              <RiArrowRightSLine size={16} />
            </Link>
          )}
          <div className="space-y-4">
            <div>
              <p className="text-[13px] font-semibold text-ink-3 mb-2">Watching over you</p>
              {d.watchers.length ? (
                <div className="flex -space-x-2">
                  {d.watchers.slice(0, 6).map((c) => (
                    <img
                      key={c._id}
                      src={c.watcher?.image}
                      alt={c.watcher?.name}
                      title={c.watcher?.name}
                      className="w-9 h-9 rounded-full object-cover border-2 border-white bg-canvas"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[14px] text-ink-3">No one yet.</p>
              )}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-ink-3 mb-2">You&apos;re watching</p>
              {d.watching.length ? (
                <ul className="space-y-2">
                  {d.watching.slice(0, 3).map((c) => (
                    <li key={c._id}>
                      <Link
                        to={`/watching/${c.patient?._id}`}
                        className="flex items-center gap-3 rounded-xl hover:bg-canvas p-1 -m-1"
                      >
                        <img src={c.patient?.image} alt="" className="w-8 h-8 rounded-full object-cover bg-canvas" />
                        <span className="text-[14px] font-semibold text-ink truncate">{c.patient?.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[14px] text-ink-3">No one yet.</p>
              )}
            </div>
          </div>
        </Card>

        {/* latest vitals & report */}
        <Card
          title="Latest vitals and report"
          icon={<RiHeartPulseLine size={17} />}
          action={<SeeAll to="/medication-history" />}
          className="lg:col-span-2"
        >
          {d.latestReport ? (
            <>
              <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-3">
                <Vital
                  icon={<RiHeartPulseLine size={20} className="text-rose-500" />}
                  label="Heart rate"
                  value={d.latestReport.healthData?.heartRate}
                  unit="BPM"
                />
                <Vital
                  icon={<RiDashboard3Line size={20} className="text-[#3554C4]" />}
                  label="Blood pressure"
                  value={d.latestReport.healthData?.bloodPressure}
                  unit="mmHg"
                />
                <Vital
                  icon={<RiTempHotLine size={20} className="text-amber-600" />}
                  label="Temperature"
                  value={d.latestReport.healthData?.temperature}
                  unit="°C"
                />
              </div>
              {d.latestReport.healthData?.doctorNotes && (
                <div className="mt-4 p-4 rounded-[16px] border border-line">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-3 mb-1">
                    <RiFileList3Line size={15} /> Doctor&apos;s notes · {d.latestReport.docData?.name}
                  </p>
                  <p className="text-[15px] text-ink-2">{d.latestReport.healthData.doctorNotes}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-ink-3 text-[15px]">Your vitals and doctor&apos;s notes appear here after a visit.</p>
          )}
        </Card>

        {/* recent notifications */}
        <Card title="Recent alerts" icon={<RiNotification3Line size={17} />}>
          {d.notifications.length ? (
            <ul className="space-y-3.5">
              {d.notifications.slice(0, 4).map((n) => (
                <li key={n._id} className="flex gap-3">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.isRead ? "bg-line" : "bg-brand"}`} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-ink truncate">{n.title}</p>
                    <p className="text-[13px] text-ink-2 line-clamp-2">{n.message}</p>
                    <p className="text-[12px] text-ink-3 mt-0.5">{relativeTime(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-3 text-[15px]">You&apos;re all caught up.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
