"use client";

import { RiArrowLeftLine, RiExternalLinkLine, RiLoader4Line, RiMicLine, RiShieldCheckLine, RiVideoOnLine } from "@remixicon/react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "@/lib/navigation";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";

type Join = { provider: "daily" | "jitsi"; url: string; embed: boolean };

/**
 * The video consultation. Daily.co rooms open right here; the Jitsi fallback opens in a
 * new tab (Jitsi doesn't allow long calls inside other sites).
 */
export default function VideoCall() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [join, setJoin] = useState<Join | null>(null);
  const [error, setError] = useState<string | null>(null);
  const asked = useRef(false);

  useEffect(() => {
    if (!appointmentId || asked.current) return;
    asked.current = true;
    axiosInstance
      .post(API_PATHS.VIDEO.JOIN(appointmentId))
      .then(({ data }) => (data.success ? setJoin(data) : setError(data.message)))
      .catch((err) => setError(err.response?.data?.message || "Couldn't open the call"));
  }, [appointmentId]);

  if (join?.embed) {
    return (
      <div className="max-w-6xl mx-auto py-3 space-y-3">
        <div className="glass rounded-[18px] flex items-center justify-between gap-3 px-3 py-2">
          <Link to="/my-appointments" className="btn !py-2 !px-3.5 !text-[14px] !rounded-xl text-white border border-rose-700 bg-[linear-gradient(180deg,#F05468,#D62F45)]">
            <RiArrowLeftLine size={17} /> Leave call
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-3">
            <RiShieldCheckLine size={16} className="text-brand-ink" /> Private room for you and your doctor
          </span>
          <a href={join.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-3 hover:text-brand-ink">
            Open in a new tab <RiExternalLinkLine size={15} />
          </a>
        </div>
        <iframe
          title="Video consultation"
          src={join.url}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-[calc(100dvh-11rem)] min-h-[420px] rounded-[22px] border border-[#071A33] bg-ink shadow-[0_18px_40px_rgba(11,37,69,.2)]"
        />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-10 md:py-16 px-4 md:px-0">
      <div className="glass rounded-[24px] p-7 sm:p-9 text-center">
        <span className="w-16 h-16 mx-auto rounded-[20px] grid place-items-center mb-5 text-white border border-violet-800 bg-[linear-gradient(180deg,#8B5CF6,#6D28D9)] shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_10px_24px_rgba(109,40,217,.25)]">
          <RiVideoOnLine size={28} />
        </span>
        {error ? (
          <>
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">You can&apos;t join just yet</h1>
            <p className="text-[15px] text-ink-2 mt-2">{error}</p>
            <p className="text-[13px] text-ink-3 mt-3">Calls open 10 minutes before your visit and stay open for an hour after.</p>
          </>
        ) : join ? (
          <>
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">Your call is ready</h1>
            <p className="text-[15px] text-ink-2 mt-2">It opens in a new tab.</p>
            <a href={join.url} target="_blank" rel="noreferrer" className="btn mt-6 text-white border border-violet-800 bg-[linear-gradient(180deg,#8B5CF6,#6D28D9)] shadow-[inset_0_1px_0_rgba(255,255,255,.22),0_8px_20px_rgba(109,40,217,.25)]">
              <RiVideoOnLine size={18} /> Join video call
            </a>
          </>
        ) : (
          <p className="flex items-center justify-center gap-2 text-[15px] font-semibold text-ink-2">
            <RiLoader4Line size={18} className="animate-spin" /> Opening your call…
          </p>
        )}
        {!error && (
          <p className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 mt-5">
            <RiMicLine size={15} /> Allow your camera and microphone when your browser asks.
          </p>
        )}
      </div>
      <Link to="/my-appointments" className="flex justify-center items-center gap-1.5 mt-5 text-[14px] font-semibold text-ink-3 hover:text-ink">
        <RiArrowLeftLine size={16} /> Back to appointments
      </Link>
    </div>
  );
}
