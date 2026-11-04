"use client";

import React, { useEffect, useRef, useState, useContext } from "react";
import { AppContext } from "../Context/AppContext";
import type { AppContextType } from "../types/index";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { RiGiftLine, RiUser3Line, RiCheckLine } from "@remixicon/react";
import GiftSheet from "../components/wishwell/GiftSheet";
import RecentGiftsBanner from "../components/wishwell/RecentGiftsBanner";
import WishWellInvite from "../components/wishwell/WishWellInvite";
import WishButton, { RollingNumber } from "../components/wishwell/WishButton";
import WishSky from "../components/wishwell/WishSky";
import WishWellOptOut from "../components/wishwell/WishWellOptOut";
import NotoEmoji from "../components/brand/NotoEmoji";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPath";

type EmojiKey = "heart" | "flower" | "clap" | "star" | "prayer";

interface WishWellEntry {
  _id: string;
  patientName: string;
  patientImage: string;
  doctorName: string;
  condition: string;
  story: string;
  status: "critical" | "recovered" | "passed";
  emojiCounts: Record<EmojiKey, number>;
  totalEmojis: number;
  /** paid gifts received */
  giftCount?: number;
  createdAt: string;
}

// what each button sends (the server stores these characters) and the count it adds to
const WISHES: { key: EmojiKey; emoji: string; label: string }[] = [
  { key: "heart", emoji: "❤️", label: "Love" },
  { key: "flower", emoji: "🌸", label: "Flower" },
  { key: "clap", emoji: "👏", label: "Clap" },
  { key: "star", emoji: "⭐", label: "Star" },
  { key: "prayer", emoji: "🙏", label: "Prayer" },
];

/** Doctor names are stored as typed: "Dr Richard James", "Dr. Fego" or just "Fego". */
const withDr = (name: string) => (/^dr\.?\s/i.test(name.trim()) ? name.trim() : `Dr ${name.trim()}`);

/** Names are stored however people typed them; show them as names. */
const properName = (s: string) => s.trim().toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());

const photo = (url: string) => url.replace("/upload/", "/upload/f_jpg,q_auto:best,w_300,h_300,c_fill/");

// the sky's colours: deep navy into night teal
const NIGHT = "bg-[radial-gradient(120%_90%_at_80%_0%,#1B4C6E_0%,#0E2C4D_45%,#081A33_100%)]";

// a story longer than this shows its first few lines, with "Read more"
const STORY_PREVIEW = 260;

/** The patient's story, in their (or their doctor's) words. Long ones open on request. */
function Story({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > STORY_PREVIEW;
  return (
    <div>
      <p className={`text-[16px] leading-relaxed text-ink-2 whitespace-pre-line break-words ${long && !open ? "line-clamp-4" : ""}`}>
        {text}
      </p>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 text-[14px] font-bold text-brand-ink hover:underline">
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function Avatar({ entry, className }: { entry: WishWellEntry; className: string }) {
  return (
    <span className={`block overflow-hidden bg-white/10 ${className}`}>
      {entry.patientImage ? (
        <img src={photo(entry.patientImage)} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="w-full h-full grid place-items-center text-white/60">
          <RiUser3Line size={26} />
        </span>
      )}
    </span>
  );
}

const WishWell: React.FC = () => {
  const { token } = useContext(AppContext) as AppContextType;
  const [entries, setEntries] = useState<WishWellEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [giftFor, setGiftFor] = useState<WishWellEntry | null>(null);
  // lanterns to launch: one per new wish, for the big sky and for each patient's own sky
  const [skyBursts, setSkyBursts] = useState(0);
  const [cardBursts, setCardBursts] = useState<Record<string, { n: number; x: number }>>({});
  const known = useRef<Record<string, number>>({});

  const launch = (entryId: string, howMany: number, x = 0.5) => {
    if (howMany <= 0) return;
    setSkyBursts((n) => n + howMany);
    setCardBursts((b) => ({ ...b, [entryId]: { n: (b[entryId]?.n ?? 0) + howMany, x } }));
  };

  const fetchEntries = async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.WISH_WELL.ALL, { silent: true } as any);
      if (!data.success) return;
      // wishes that arrived from other people since the last look rise as lanterns too
      for (const e of data.entries as WishWellEntry[]) {
        const before = known.current[e._id];
        if (before != null && e.totalEmojis > before) launch(e._id, e.totalEmojis - before, 0.2 + Math.random() * 0.6);
        known.current[e._id] = Math.max(before ?? 0, e.totalEmojis);
      }
      setEntries(data.entries);
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  // counts go up straight away; the next refresh brings in everyone else's wishes too
  const bump = (entryId: string, key?: EmojiKey) => {
    known.current[entryId] = (known.current[entryId] ?? 0) + 1;
    setEntries((list) =>
      list.map((e) =>
        e._id !== entryId
          ? e
          : { ...e, totalEmojis: e.totalEmojis + 1, emojiCounts: key ? { ...e.emojiCounts, [key]: (e.emojiCounts[key] ?? 0) + 1 } : e.emojiCounts },
      ),
    );
  };

  const sendWish = async (entryId: string, emoji: string, key?: EmojiKey, x?: number) => {
    if (!token) return toast.info("Log in to send wishes");
    bump(entryId, key);
    launch(entryId, 1, x);
    try {
      await axiosInstance.post(API_PATHS.WISH_WELL.SEND_EMOJI, { entryId, emoji }, { silent: true } as any);
      setTimeout(fetchEntries, 1200);
    } catch {
      fetchEntries(); // put the real numbers back
    }
  };

  const openGift = (entry: WishWellEntry) => {
    if (!token) return toast.info("Log in to send gifts");
    setGiftFor(entry);
  };

  useEffect(() => {
    fetchEntries();
    const t = setInterval(fetchEntries, 15_000);
    return () => clearInterval(t);
  }, []);

  const critical = entries.filter((e) => e.status === "critical");
  const recovered = entries.filter((e) => e.status === "recovered");
  const totalWishes = entries.reduce((a, e) => a + e.totalEmojis, 0);

  return (
    <div className="max-w-4xl mx-auto py-4 md:py-8 px-4 md:px-0">
      {/* a doctor asked to add this patient: they decide first */}
      <div className="mb-5 empty:hidden">
        <WishWellInvite onAnswered={fetchEntries} />
      </div>

      {/* the well: a night sky with one light for every wish ever sent */}
      <section
        className={`relative overflow-hidden rounded-[28px] min-h-[340px] sm:min-h-[380px] text-white border border-[#071A33] shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_24px_60px_rgba(8,26,51,.35)] ${NIGHT}`}
      >
        <div className="absolute inset-0">
          <WishSky count={totalWishes} bursts={skyBursts} seed={11} />
        </div>
        {/* a soft horizon glow, where the lanterns rise from */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(255,190,140,0.18),transparent_70%)]" />
        {/* the label stays at the top and the words at the bottom; if the words grow, the panel grows */}
        <div className="relative h-full min-h-[inherit] p-6 sm:p-9 flex flex-col justify-between gap-10">
          <p className="text-[13px] font-extrabold tracking-[2px] uppercase text-[#8FE3E1]">The Wish Well</p>
          <div className="max-w-[40rem]">
            <h1 className="text-[34px] sm:text-[44px] leading-[1.03] font-extrabold tracking-[-0.035em] text-balance">
              When it&apos;s hard, everyone shows up.
            </h1>
            <p className="text-[16px] text-white/75 mt-3 max-w-[48ch]">
              People going through something hard, shared with their permission. Each light is a kind word someone sent; yours
              reaches them the moment you send it.
            </p>
            <p className="text-[14px] text-white/65 mt-5">
              <RollingNumber value={totalWishes} className="text-white" /> wishes sent ·{" "}
              <span className="num text-white">{critical.length}</span> {critical.length === 1 ? "person" : "people"} being
              supported{recovered.length > 0 && <> · <span className="num text-white">{recovered.length}</span> recovered</>}
            </p>
          </div>
        </div>
      </section>

      <div className="my-6">
        <RecentGiftsBanner />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-72 rounded-[24px] bg-line/70 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {critical.length > 0 && (
            <section>
              <h2 className="text-[18px] font-bold text-ink mb-3">Sending love to</h2>
              <div className="space-y-5">
                {critical.map((entry, i) => (
                  <motion.article
                    key={entry._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 4) * 0.06 }}
                    className="surface rounded-[24px] overflow-hidden"
                  >
                    {/* their own sky: one light per wish they've had */}
                    <div className={`relative min-h-[148px] sm:min-h-[132px] text-white ${NIGHT}`}>
                      <div className="absolute inset-0">
                        <WishSky
                          count={entry.totalEmojis}
                          bursts={cardBursts[entry._id]?.n ?? 0}
                          burstX={cardBursts[entry._id]?.x}
                          seed={i + 3}
                        />
                      </div>
                      <div className="relative min-h-[inherit] flex items-end gap-4 p-5 pt-10">
                        <Avatar entry={entry} className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-[20px] border-2 border-white/20 shrink-0" />
                        {/* a long name gets two lines, then "…" (the full name shows on hover) */}
                        <div className="min-w-0 flex-1">
                          <p className="text-[20px] sm:text-[21px] leading-tight font-bold tracking-[-0.01em] line-clamp-2 break-words" title={properName(entry.patientName)}>
                            {properName(entry.patientName)}
                          </p>
                          <p className="text-[13px] text-white/70 truncate mt-0.5">Cared for by {withDr(entry.doctorName)}</p>
                        </div>
                        <p className="shrink-0 text-right text-[13px] text-white/65 leading-tight">
                          <RollingNumber value={entry.totalEmojis} className="text-[17px] text-white" />
                          <br />
                          wishes
                        </p>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6 flex flex-col gap-4">
                      {/* the condition in full: it can be long, so it gets its own line here, not the header */}
                      {entry.condition && (
                        <p className="text-[14px] text-ink-3 break-words">
                          Living with <span className="font-semibold text-ink-2">{entry.condition}</span>
                        </p>
                      )}
                      {entry.story && <Story text={entry.story} />}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap sm:gap-2" role="group" aria-label="Send a wish">
                          {WISHES.map((w, k) => (
                            <WishButton
                              key={w.key}
                              emoji={w.emoji}
                              label={w.label}
                              count={entry.emojiCounts?.[w.key] ?? 0}
                              index={k + i * 2}
                              onSend={() => sendWish(entry._id, w.emoji, w.key, 0.08 + k * 0.1)}
                            />
                          ))}
                        </div>
                        <button type="button" onClick={() => openGift(entry)} className="btn btn-ink !py-2.5 !px-4 !text-[14px] sm:ml-auto shrink-0">
                          <RiGiftLine size={17} /> Send a gift
                          {!!entry.giftCount && <span className="num text-[12px] text-white/70">· {entry.giftCount}</span>}
                        </button>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </section>
          )}

          {recovered.length > 0 && (
            <section>
              <h2 className="text-[18px] font-bold text-ink mb-3">Recovered</h2>
              <ul className="surface rounded-[24px] divide-y divide-line">
                {recovered.map((entry) => (
                  <li key={entry._id} className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                    <span className="relative shrink-0">
                      <Avatar entry={entry} className="w-12 h-12 rounded-[14px] !bg-canvas border border-line" />
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white grid place-items-center ring-2 ring-white">
                        <RiCheckLine size={13} />
                      </span>
                    </span>
                    <div className="flex-1 min-w-[10rem]">
                      <p className="text-[16px] font-bold text-ink">{properName(entry.patientName)}</p>
                      <p className="text-[13px] text-ink-3">
                        Recovered · <RollingNumber value={entry.totalEmojis} className="text-ink-2" /> wishes received
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <WishButton emoji="🎉" label="Congratulations" onSend={() => sendWish(entry._id, "🎉")} />
                      <button type="button" onClick={() => openGift(entry)} className="btn btn-glass !bg-white !py-2 !px-3.5 !text-[14px]">
                        <RiGiftLine size={16} /> Gift
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {entries.length === 0 && (
            <div className="glass flex flex-col items-center justify-center py-16 rounded-[24px] text-center px-6">
              <NotoEmoji emoji="❤️" size={44} className="mb-4" />
              <h3 className="text-[20px] font-extrabold text-ink mb-1.5">No one on the Wish Well right now</h3>
              <p className="text-[15px] text-ink-2 max-w-sm leading-relaxed">
                When a patient agrees to be featured by their doctor, you can send them wishes and gifts here.
              </p>
            </div>
          )}

          {token && (
            <div className="glass rounded-[20px] p-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-[15px] font-bold text-ink">Rather not be featured?</p>
                <p className="text-[14px] text-ink-3">
                  You can stop doctors putting you on the Wish Well. You can also do this in Settings.
                </p>
              </div>
              <WishWellOptOut onDone={fetchEntries} className="self-start sm:self-auto" />
            </div>
          )}
        </div>
      )}

      <GiftSheet entry={giftFor} onClose={() => setGiftFor(null)} onSent={fetchEntries} />
    </div>
  );
};

export default WishWell;
