import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getSocket } from "../utils/socket.js";
import EmojiRain from "../components/EmojiRain.js";

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

  // Connect socket and listen for emojis
  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();
    socket.emit("register", userId);

    socket.on(
      "emoji_received",
      (data: {
        emoji: string;
        fromName: string;
        isWishWell?: boolean;
        isCongratulations?: boolean;
      }) => {
        if (data.isCongratulations) {
          // Burst of celebration
          addEmoji("🎉", 6);
          addEmoji("❤️", 4);
          addEmoji("⭐", 3);
        } else {
          addEmoji(data.emoji, 1);
        }
      },
    );

    return () => {
      socket.off("emoji_received");
    };
  }, [userId, addEmoji]);

  return (
    <EmojiContext.Provider value={{ addEmoji }}>
      {children}
      {/* Global overlay — renders on top of everything */}
      <EmojiRain particles={particles} onComplete={removeParticle} />
    </EmojiContext.Provider>
  );
};

export const useEmoji = () => {
  const context = useContext(EmojiContext);
  if (!context) throw new Error("useEmoji must be used within EmojiProvider");
  return context;
};
