"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@/lib/navigation";
import type { ChatMessage, PatientConversation } from "../types/index";
import { API_PATHS } from "../utils/apiPath";
import axiosInstance from "../utils/axiosInstance";
import { getSocket } from "../utils/socket";

type Listener = (message: ChatMessage) => void;

type DoctorMessagesContextType = {
  conversations: PatientConversation[];
  loaded: boolean;
  unread: number;
  forPatient: (patientId: string) => number;
  refresh: () => Promise<void>;
  subscribe: (fn: Listener) => () => void;
  setOpenPatient: (patientId: string | null) => void;
};

const DoctorMessagesContext = createContext<DoctorMessagesContextType | null>(null);

/** Chat state for a logged-in doctor: conversations, unread badge and the live socket. */
export function DoctorMessagesProvider({ token, children }: { token: string; children: ReactNode }) {
  const [conversations, setConversations] = useState<PatientConversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const listeners = useRef(new Set<Listener>());
  const openPatient = useRef<string | null>(null);
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.MESSAGES.CONVERSATIONS, { silent: true } as any);
      if (data.success) setConversations(data.conversations);
    } catch {
      // keep the last list
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // join the doctor's private room (token checked server-side), again after reconnects
  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit("auth", { token, role: "doctor" });
    join();
    socket.on("connect", join);

    const onMessage = (message: ChatMessage) => {
      listeners.current.forEach((fn) => fn(message));
      refresh();
      if (message.sender === "patient" && openPatient.current !== message.userId) {
        toast.message("New message from a patient", {
          description: message.text.length > 90 ? `${message.text.slice(0, 90)}…` : message.text,
          action: { label: "Open", onClick: () => navigate(`/doctor-messages?patient=${message.userId}`) },
        });
      }
    };
    const onRead = () => refresh();
    socket.on("chat_message", onMessage);
    socket.on("chat_read", onRead);
    return () => {
      socket.off("connect", join);
      socket.off("chat_message", onMessage);
      socket.off("chat_read", onRead);
    };
  }, [token, refresh, navigate]);

  // stable identities: screens use these in effects, so they mustn't change on refresh
  const subscribe = useCallback((fn: Listener) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);
  const setOpenPatient = useCallback((patientId: string | null) => {
    openPatient.current = patientId;
  }, []);

  const value = useMemo<DoctorMessagesContextType>(() => {
    const byPatient = new Map(conversations.map((c) => [c.patient._id, c.unread]));
    return {
      conversations,
      loaded,
      unread: conversations.reduce((n, c) => n + c.unread, 0),
      forPatient: (patientId) => byPatient.get(patientId) ?? 0,
      refresh,
      subscribe,
      setOpenPatient,
    };
  }, [conversations, loaded, refresh, subscribe, setOpenPatient]);

  return <DoctorMessagesContext.Provider value={value}>{children}</DoctorMessagesContext.Provider>;
}

export function useDoctorMessages(): DoctorMessagesContextType {
  return (
    useContext(DoctorMessagesContext) ?? {
      conversations: [],
      loaded: false,
      unread: 0,
      forPatient: () => 0,
      refresh: async () => {},
      subscribe: () => () => {},
      setOpenPatient: () => {},
    }
  );
}
