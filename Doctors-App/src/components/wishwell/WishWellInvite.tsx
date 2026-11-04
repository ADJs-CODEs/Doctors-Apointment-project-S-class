"use client";

import { RiHeart3Fill, RiShieldCheckLine } from "@remixicon/react";
import { useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppContext } from "@/Context/AppContext";
import type { AppContextType } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";

type Pending = { _id: string; doctorName: string; condition: string; story: string; createdAt: string };

/**
 * "Your doctor would like to add you to the Wish Well": nothing about the patient is public
 * until they accept here. Shown on the Dashboard and the Wish Well page.
 */
export default function WishWellInvite({ onAnswered }: { onAnswered?: () => void }) {
  const { token } = useContext(AppContext) as AppContextType;
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axiosInstance.get(API_PATHS.WISH_WELL.PENDING_CONSENT, { silent: true } as any);
      if (data.success) setPending(data.pending);
    } catch {
      // nothing to show
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const answer = async (entryId: string, accept: boolean) => {
    setBusy(entryId);
    try {
      const { data } = await axiosInstance.post(API_PATHS.WISH_WELL.CONSENT, { entryId, accept });
      if (data.success) {
        toast.success(data.message);
        setPending((p) => p.filter((x) => x._id !== entryId));
        onAnswered?.();
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setBusy(null);
    }
  };

  if (!pending.length) return null;

  return (
    <div className="space-y-3">
      {pending.map((p) => (
        <section key={p._id} className="rounded-[24px] border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-500 rounded-xl text-white shrink-0">
              <RiHeart3Fill size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[2px] text-rose-500">Wish Well invitation</p>
              <p className="font-black text-slate-900 text-lg leading-snug mt-0.5">{p.doctorName} would like to add you to the Wish Well</p>
              <p className="text-sm text-slate-600 mt-1">
                People in the community could see your name, photo and the words below, and send you encouragement and gifts. It&apos;s your choice.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white border border-rose-100 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">What would be shared</p>
            <p className="font-black text-rose-600 mt-1">{p.condition}</p>
            <p className="text-sm text-slate-700 mt-1 whitespace-pre-line">{p.story}</p>
          </div>

          <p className="flex items-center gap-1.5 text-[12px] text-slate-500 mt-3">
            <RiShieldCheckLine size={15} className="text-teal-600" /> Nothing is shared unless you say yes. You can leave any time in Settings.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              onClick={() => answer(p._id, true)}
              disabled={busy === p._id}
              className="flex-1 px-5 py-3 rounded-xl bg-rose-500 text-white text-sm font-black hover:bg-rose-600 disabled:opacity-50"
            >
              {busy === p._id ? "Saving…" : "Yes, add me"}
            </button>
            <button
              onClick={() => answer(p._id, false)}
              disabled={busy === p._id}
              className="flex-1 px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              No, thank you
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
