"use client";

import { RiGiftLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import { Link } from "@/lib/navigation";
import type { GiftEvent } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";
import { getSocket } from "@/utils/socket";

/** Scrolling banner of recent big gifts ("Amaka sent 🌈 Rainbow to Tunde"); updates live. */
export default function RecentGiftsBanner() {
  const [gifts, setGifts] = useState<GiftEvent[]>([]);

  useEffect(() => {
    axiosInstance
      .get(API_PATHS.WALLET.RECENT_GIFTS, { silent: true } as any)
      .then(({ data }) => data.success && setGifts(data.gifts))
      .catch(() => {});

    const socket = getSocket();
    const onGift = (e: GiftEvent) => {
      if (e.gift && e.gift.tier !== "small") setGifts((g) => [e, ...g].slice(0, 20));
    };
    socket.on("wishwell_gift", onGift);
    return () => {
      socket.off("wishwell_gift", onGift);
    };
  }, []);

  if (!gifts.length) return null;

  const items = gifts.map((g, i) => (
    <span key={`${g._id ?? i}`} className="inline-flex items-center gap-2 mx-6 text-sm">
      <span className="text-xl">{g.gift?.emoji}</span>
      <span className="font-bold text-slate-800">{g.fromName}</span>
      <span className="text-slate-500">sent</span>
      <span className="font-bold text-rose-600">{g.gift?.name}</span>
      <span className="text-slate-500">to</span>
      <span className="font-bold text-slate-800">{g.toName}</span>
    </span>
  ));

  return (
    <Link
      to="/wish-well"
      className="group flex items-center overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50 to-violet-50 border border-rose-100"
    >
      <span className="shrink-0 flex items-center gap-1.5 px-4 py-3 bg-white/70 border-r border-rose-100 text-[10px] font-black uppercase tracking-[2px] text-rose-600">
        <RiGiftLine size={14} /> Gifts
      </span>
      <div className="overflow-hidden flex-1">
        {/* the list twice, so the scroll loops without a gap */}
        <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] py-3 whitespace-nowrap">
          {items}
          {items}
        </div>
      </div>
    </Link>
  );
}
