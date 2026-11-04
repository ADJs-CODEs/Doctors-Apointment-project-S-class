"use client";

import React, { useState, useRef, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiRobot2Line,
  RiSendPlaneLine,
  RiCloseLine,
  RiLoader4Line,
  RiUserLine,
  RiStethoscopeLine,
} from "@remixicon/react";
import { AppContext } from "../Context/AppContext";
import type { AppContextType } from "../types/index";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPath";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "When is my next appointment?",
  "What medications am I on?",
  "What are my latest vitals?",
  "What does my prescription mean?",
];

/** "UMUTEME FEGO" -> "Umuteme" */
const firstName = (name?: string) => {
  const f = (name ?? "").trim().split(" ")[0];
  return f ? f.charAt(0).toUpperCase() + f.slice(1).toLowerCase() : "";
};

/** aboveTabBar: lift the bubble above the patient app tab bar on phones */
const ChatBot: React.FC<{ aboveTabBar?: boolean }> = ({ aboveTabBar = false }) => {
  const bottom = aboveTabBar ? "bottom-24 lg:bottom-6" : "bottom-6";
  const { token, userData } = useContext(AppContext) as AppContextType;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: `Hi ${firstName(userData?.name) || "there"}! I'm your health assistant. I can help with your appointments, medicines, vitals and general health questions. What would you like to know?`,
        },
      ]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    setInput("");
    setShowSuggestions(false);
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: messageText },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const { data } = await axiosInstance.post(API_PATHS.CHAT.MESSAGE, {
        message: messageText,
        history: newMessages.slice(-6),
      });

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I ran into an issue. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setOpen(true)}
            aria-label="Open the health assistant"
            title="Health assistant"
            // on desktop, sit just right of the sidebar instead of on top of the profile at its bottom
            className={`btn-ink fixed ${bottom} left-4 sm:left-6 ${aboveTabBar ? "lg:left-[19rem]" : ""} z-50 w-[52px] h-[52px] rounded-[18px] grid place-items-center group`}
          >
            <RiRobot2Line size={23} className="text-[#8FE3E1] group-hover:-rotate-6 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            role="dialog"
            aria-label="Health assistant"
            className={`surface !bg-white shadow-[0_24px_60px_rgba(11,37,69,.2)] fixed ${bottom} left-3 sm:left-6 ${aboveTabBar ? "lg:left-[19rem]" : ""} z-50 w-[calc(100vw-1.5rem)] max-w-[400px] h-[580px] max-h-[calc(100dvh-8rem)] rounded-[24px] flex flex-col overflow-hidden`}
          >
            <div className="px-4 py-3.5 flex items-center justify-between shrink-0 text-white border-b border-[#071A33] bg-[linear-gradient(160deg,#1C3D68_0%,#0B2545_80%)]">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-[12px] grid place-items-center bg-white/10 border border-white/15">
                  <RiRobot2Line size={18} className="text-[#8FE3E1]" />
                </span>
                <div>
                  <p className="text-[15px] font-bold">Health assistant</p>
                  <p className="text-[12px] text-white/65">Knows your visits, medicines and vitals</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-xl hover:bg-white/10 active:scale-90 transition">
                <RiCloseLine size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <span
                    className={`w-7 h-7 rounded-[10px] grid place-items-center shrink-0 ${msg.role === "assistant" ? "bg-brand-soft text-brand-ink" : "bg-ink text-white"}`}
                  >
                    {msg.role === "assistant" ? <RiStethoscopeLine size={14} /> : <RiUserLine size={14} />}
                  </span>
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 rounded-[16px] text-[14px] leading-relaxed whitespace-pre-line break-words ${
                      msg.role === "assistant"
                        ? "bg-white border border-line text-ink rounded-tl-md"
                        : "text-white rounded-tr-md bg-[linear-gradient(180deg,#1C3D68,#0B2545)]"
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-2.5"
                >
                  <span className="w-7 h-7 rounded-[10px] grid place-items-center shrink-0 bg-brand-soft text-brand-ink">
                    <RiStethoscopeLine size={14} />
                  </span>
                  <div className="bg-white border border-line px-4 py-3 rounded-[16px] rounded-tl-md flex items-center gap-1.5" aria-label="Thinking">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 bg-ink-3/50 rounded-full"
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Suggested questions */}
              {showSuggestions && messages.length <= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col gap-2 mt-2"
                >
                  <p className="text-[13px] font-bold text-ink-3 px-1">Try asking</p>
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => sendMessage(q)}
                      className="text-left px-3.5 py-2.5 bg-white border border-line rounded-[14px] text-[14px] text-ink-2 hover:border-brand hover:text-brand-ink hover:bg-brand-soft/40 transition-colors active:scale-[.98]"
                    >
                      {q}
                    </button>
                  ))}
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3.5 pt-3 pb-3.5 border-t border-line shrink-0 bg-white/70">
              <div className="flex items-center gap-2 bg-white border-[1.5px] border-line rounded-[16px] pl-4 pr-1.5 py-1.5 focus-within:border-brand focus-within:shadow-[0_0_0_4px_rgba(14,165,164,.12)] transition-[border-color,box-shadow]">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask about your health…"
                  aria-label="Your question"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1 min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3/70 py-1.5"
                />
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  aria-label="Send"
                  className="btn btn-ink !p-0 w-9 h-9 !rounded-[12px] shrink-0"
                >
                  {loading ? <RiLoader4Line size={16} className="animate-spin" /> : <RiSendPlaneLine size={16} />}
                </button>
              </div>
              <p className="text-[12px] text-ink-3 text-center mt-2 leading-snug">
                For information only, not a diagnosis. In an emergency, call your local emergency number.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
