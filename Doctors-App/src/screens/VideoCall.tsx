"use client";

import { RiArrowLeftLine, RiExternalLinkLine, RiLoader4Line, RiVideoOnLine } from "@remixicon/react";
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
      <div className="max-w-6xl mx-auto py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Link to="/my-appointments" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900">
            <RiArrowLeftLine size={18} /> Leave call
          </Link>
          <a href={join.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-400 hover:text-teal-600">
            Open in a new tab <RiExternalLinkLine size={14} />
          </a>
        </div>
        <iframe
          title="Video consultation"
          src={join.url}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-[calc(100dvh-11rem)] min-h-[420px] rounded-[24px] border border-slate-200 bg-slate-900"
        />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-16 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-5">
        <RiVideoOnLine size={30} />
      </div>
      {error ? (
        <>
          <h1 className="text-2xl font-black text-slate-900">Can&apos;t join yet</h1>
          <p className="text-slate-500 mt-2">{error}</p>
        </>
      ) : join ? (
        <>
          <h1 className="text-2xl font-black text-slate-900">Your call is ready</h1>
          <p className="text-slate-500 mt-2">It opens in a new tab. Allow your camera and microphone when asked.</p>
          <a
            href={join.url}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-violet-600 text-white font-bold hover:bg-violet-700"
          >
            <RiVideoOnLine size={18} /> Join video call
          </a>
        </>
      ) : (
        <p className="flex items-center justify-center gap-2 text-slate-500 font-bold">
          <RiLoader4Line size={18} className="animate-spin" /> Opening your call…
        </p>
      )}
      <Link to="/my-appointments" className="block mt-6 text-sm font-bold text-slate-400 hover:text-slate-700">
        Back to appointments
      </Link>
    </div>
  );
}
