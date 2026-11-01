"use client";

import { RiChat3Line, RiErrorWarningFill } from "@remixicon/react";
import { useMessages } from "@/Context/MessagesContext";
import { useNavigate } from "@/lib/navigation";

/**
 * Opens the chat with a doctor, with the visit (and medicine) attached as the topic.
 * Shows the unread count, and turns red when there's an unread urgent message.
 */
export default function MessageDoctorButton({
  doctorId,
  appointmentId,
  medicineName,
  label = "Message doctor",
  compact = false,
  className = "",
}: {
  doctorId: string;
  appointmentId?: string;
  medicineName?: string;
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const { unread, urgentUnread } = useMessages().forDoctor(doctorId);

  const open = () => {
    const params = new URLSearchParams({ doctor: doctorId });
    if (appointmentId) params.set("appointment", appointmentId);
    if (medicineName) params.set("medicine", medicineName);
    navigate(`/messages?${params}`);
  };

  const tone = urgentUnread
    ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
    : unread
      ? "bg-teal-500 text-white border-teal-500 hover:bg-teal-600"
      : "bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:text-teal-700";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        open();
      }}
      title={urgentUnread ? "Your doctor sent you an urgent message" : label}
      className={`relative inline-flex items-center justify-center gap-1.5 border font-bold transition-colors ${
        compact ? "px-3 py-2 rounded-xl text-[11px]" : "px-5 py-3 rounded-xl md:rounded-2xl text-[11px] md:text-xs uppercase"
      } ${tone} ${className}`}
    >
      {urgentUnread ? <RiErrorWarningFill size={15} className="animate-pulse" /> : <RiChat3Line size={15} />}
      {urgentUnread ? "Urgent message" : unread ? `${unread} new message${unread > 1 ? "s" : ""}` : label}
    </button>
  );
}
