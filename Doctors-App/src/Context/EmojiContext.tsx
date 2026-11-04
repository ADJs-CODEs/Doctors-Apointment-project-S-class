"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { getSocket } from "../utils/socket";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPath";
import EmojiRain from "../components/EmojiRain";
import LiveLoveCounter, { type LiveLove } from "../components/wishwell/LiveLoveCounter";

// the counter stays this long after the last wish arrives
const COUNTER_MS = 4500;
// "while you were away": at most this many emoji replay, this far apart
const REPLAY_MAX = 12;
const REPLAY_GAP_MS = 220;

interface EmojiParticle {
  id: string;
  emoji: string;
  x: number;
  size: number;
  duration: number;
  wobble: number;
}

interface EmojiContextType {
  addEmoji: (emoji: string, count?: number) => void;
}

const EmojiContext = createContext<EmojiContextType | undefined>(undefined);

export const EmojiProvider: React.FC<{
  children: React.ReactNode;
  userId?: string;
}> = ({ children, userId }) => {
  const [particles, setParticles] = useState<EmojiParticle[]>([]);
  // the corner counter while love is arriving
  const [love, setLove] = useState<LiveLove | null>(null);
  const hideLove = useRef<ReturnType<typeof setTimeout>>(undefined);

  const countLove = useCallback((emoji: string, total?: number, from?: string) => {
    setLove((prev) => ({
      emoji,
      total: total ?? (from ? undefined : prev?.total),
      // a run of love from the same place adds up; a new sender starts again
      burst: prev && prev.from === from ? prev.burst + 1 : 1,
      from,
      tick: Date.now(),
    }));
    clearTimeout(hideLove.current);
    hideLove.current = setTimeout(() => setLove(null), COUNTER_MS);
  }, []);
  useEffect(() => () => clearTimeout(hideLove.current), []);

  const addEmoji = useCallback((emoji: string, count = 1) => {
    const newParticles: EmojiParticle[] = Array.from(
      { length: count },
      (_, i) => ({
        id: `${Date.now()}-${i}-${Math.random()}`,
        emoji,
        // Spawn from bottom right — TikTok style
        x: 20 + Math.random() * 80, // right side, random offset
        size: 28 + Math.random() * 20, // varied sizes
        duration: 2 + Math.random() * 1.5, // varied durations
        wobble: (Math.random() - 0.5) * 80, // left/right wobble
      }),
    );
    setParticles((prev) => [...prev, ...newParticles]);
  }, []);

  const removeParticle = useCallback((id: string) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // love that arrived while the app wasn't open: replay it, newest few, with a "while you were away" count
  const replayMissed = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.EMOJI.UNDELIVERED, { silent: true } as any);
      const pings: { emoji: string }[] = data?.pings ?? [];
      const total: number = data?.total ?? pings.length;
      if (!data?.success || !total) return;
      const shown = pings.slice(0, REPLAY_MAX).reverse(); // oldest of the newest first
      clearTimeout(hideLove.current);
      setLove({ emoji: shown[shown.length - 1]?.emoji ?? "❤️", burst: total, away: true, tick: Date.now() });
      shown.forEach((p, i) => setTimeout(() => addEmoji(p.emoji, 1), 400 + i * REPLAY_GAP_MS));
      hideLove.current = setTimeout(() => setLove(null), 400 + shown.length * REPLAY_GAP_MS + COUNTER_MS);
    } catch {
      // nice to have: if it fails, the love is still counted on their Wish Well entry
    }
  }, [addEmoji]);

  // Connect socket and listen for emojis
  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();
    // tell the server who this is on every (re)connect, then catch up on anything missed meanwhile
    const onConnect = () => {
      socket.emit("register", userId);
      replayMissed();
    };
    socket.on("connect", onConnect);
    if (socket.connected) onConnect();

    socket.on(
      "emoji_received",
      (data: {
        emoji: string;
        fromName: string;
        isWishWell?: boolean;
        isCongratulations?: boolean;
        /** Wish Well: the patient's new running total */
        total?: number;
      }) => {
        if (data.isCongratulations) {
          // Burst of celebration
          addEmoji("🎉", 6);
          addEmoji("❤️", 4);
          addEmoji("⭐", 3);
        } else {
          addEmoji(data.emoji, 1);
          // the Wish Well is anonymous and has a total; care circle love comes from a person
          countLove(data.emoji, data.total, data.isWishWell ? undefined : data.fromName);
        }
      },
    );

    return () => {
      socket.off("emoji_received");
      socket.off("connect", onConnect);
    };
  }, [userId, addEmoji, countLove, replayMissed]);

  return (
    <EmojiContext.Provider value={{ addEmoji }}>
      {children}
      {/* Global overlay — renders on top of everything */}
      <EmojiRain particles={particles} onComplete={removeParticle} />
      <LiveLoveCounter love={love} />
    </EmojiContext.Provider>
  );
};

export const useEmoji = () => {
  const context = useContext(EmojiContext);
  if (!context) throw new Error("useEmoji must be used within EmojiProvider");
  return context;
};
