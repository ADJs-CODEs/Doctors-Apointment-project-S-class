"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useNavigate } from "@/lib/navigation";
import type { AppNotification, ChatMessage, Conversation } from "@/types";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";
import { getSocket } from "@/utils/socket";

type Listener = (message: ChatMessage) => void;

type MessagesContextType = {
  conversations: Conversation[];
  loaded: boolean;
  unread: number;
  urgentUnread: number;
  /** Unread counts for one doctor, for badges on appointments and medicines. */
  forDoctor: (doctorId: string) => { unread: number; urgentUnread: number };
  refresh: () => Promise<void>;
  /** Live messages, for an open thread. Returns an unsubscribe function. */
  subscribe: (fn: Listener) => () => void;
  /** The thread on screen, so new messages there don't pop a toast. */
  setOpenDoctor: (doctorId: string | null) => void;
};

const MessagesContext = createContext<MessagesContextType | null>(null);

/**
 * Doctor chat state for a logged-in patient: the conversation list with unread counts
 * (for the sidebar badge and the "message your doctor" buttons) and the live socket.
 */
export function MessagesProvider({ token, children }: { token: string; children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const listeners = useRef(new Set<Listener>());
  const openDoctor = useRef<string | null>(null);
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.MESSAGES.CONVERSATIONS, { silent: true } as any);
      if (data.success) setConversations(data.conversations);
    } catch {
      // badges just stay as they were
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Join this patient's private room (the server checks the token), and again after
  // every reconnect, since rooms don't survive a dropped connection.
  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit("auth", { token, role: "patient" });
    join();
    socket.on("connect", join);

    const onMessage = (message: ChatMessage) => {
      listeners.current.forEach((fn) => fn(message));
      refresh();
      if (message.sender === "doctor" && openDoctor.current !== message.doctorId) {
        const show = message.urgent ? toast.error : toast.message;
        show(message.urgent ? "Urgent message from your doctor" : "New message from your doctor", {
          description: message.text.length > 90 ? `${message.text.slice(0, 90)}…` : message.text,
          action: {
            label: "Open",
            onClick: () => navigate(`/messages?doctor=${message.doctorId}`),
          },
        });
      }
    };
    const onRead = () => refresh();

    // Pop-up for every other live notification (reminders, payments, care circle...).
    // Doctor messages already got their own pop-up above, so they're skipped here.
    const onNotification = (n: AppNotification) => {
      if (n.link?.startsWith("/messages")) return;
      const show = n.type === "alert" ? toast.error : n.type === "payment" ? toast.success : toast.message;
      show(n.title, {
        description: n.message,
        action: n.link ? { label: "Open", onClick: () => navigate(n.link!) } : undefined,
      });
    };

    socket.on("chat_message", onMessage);
    socket.on("chat_read", onRead);
    socket.on("notification", onNotification);
    return () => {
      socket.off("connect", join);
      socket.off("chat_message", onMessage);
      socket.off("chat_read", onRead);
      socket.off("notification", onNotification);
    };
  }, [token, refresh, navigate]);

  // These two must keep the same identity when the list refreshes: screens use them in
  // effects, and a new function each time would re-run those effects in a loop.
  const subscribe = useCallback((fn: Listener) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);
  const setOpenDoctor = useCallback((doctorId: string | null) => {
    openDoctor.current = doctorId;
  }, []);

  const value = useMemo<MessagesContextType>(() => {
    const byDoctor = new Map(conversations.map((c) => [c.doctor._id, c]));
    return {
      conversations,
      loaded,
      unread: conversations.reduce((n, c) => n + c.unread, 0),
      urgentUnread: conversations.reduce((n, c) => n + c.urgentUnread, 0),
      forDoctor: (doctorId) => {
        const c = byDoctor.get(doctorId);
        return { unread: c?.unread ?? 0, urgentUnread: c?.urgentUnread ?? 0 };
      },
      refresh,
      subscribe,
      setOpenDoctor,
    };
  }, [conversations, loaded, refresh, subscribe, setOpenDoctor]);

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

/** Chat state; works outside the provider too (logged out), with nothing unread. */
export function useMessages(): MessagesContextType {
  return (
    useContext(MessagesContext) ?? {
      conversations: [],
      loaded: false,
      unread: 0,
      urgentUnread: 0,
      forDoctor: () => ({ unread: 0, urgentUnread: 0 }),
      refresh: async () => {},
      subscribe: () => () => {},
      setOpenDoctor: () => {},
    }
  );
}
