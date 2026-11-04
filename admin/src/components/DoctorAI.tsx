"use client";

import React, { useState, useRef, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiRobot2Line,
  RiSendPlaneLine,
  RiCloseLine,
  RiLoader4Line,
  RiStethoscopeLine,
} from "@remixicon/react";
import { DoctorContext } from "../context/DoctorContext";
import type { DoctorContextType } from "../types/index";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPath";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "Draft an alert for a patient with high BP and missed doses",
  "What are common drug interactions with Metformin?",
  "Suggest clinical notes for a patient with 36.5°C temp and 72 BPM",
  "How should I handle a patient with low medication adherence?",
];

interface DoctorAIProps {
  appointmentContext?: any;
}

const DoctorAI: React.FC<DoctorAIProps> = ({ appointmentContext }) => {
  const { dToken } = useContext(DoctorContext) as DoctorContextType;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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
          content: appointmentContext
            ? `I have ${appointmentContext.userData?.name}'s chart loaded. I can help you draft alerts, explain their medications, or answer clinical questions. What do you need?`
            : `Hello Doctor! I can help you draft patient alerts, check drug interactions, suggest clinical notes, or answer any medical reference questions. What do you need?`,
        },
      ]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    setInput("");
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: messageText },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const { data } = await axiosInstance.post(API_PATHS.CHAT.DOCTOR_MESSAGE, {
        message: messageText,
        history: newMessages.slice(-6),
        appointmentContext: appointmentContext || null,
      });
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection issue. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!dToken) return null;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            aria-label="Open the AI assistant"
            title="AI assistant"
            // same button as the patient site's assistant
            className="btn-ink fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full flex items-center justify-center group"
          >
            <RiRobot2Line size={24} className="text-[#8FE3E1] group-hover:rotate-12 transition-transform" />
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
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] w-[calc(100vw-2rem)] sm:w-[420px] h-[min(580px,calc(100dvh-2rem))] surface !bg-white rounded-[24px] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="btn-ink !rounded-none px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                  <RiRobot2Line size={18} className="text-[#8FE3E1]" />
                </div>
                <div>
                  <p className="text-white font-bold text-[15px]">Clinical assistant</p>
                  {appointmentContext ? (
                    <p className="text-[#8FE3E1] text-[12px] font-semibold truncate max-w-[180px]">
                      Looking at {appointmentContext.userData?.name}
                    </p>
                  ) : (
                    <p className="text-white/60 text-[12px] font-semibold">Ask about a patient or a medicine</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90"
              >
                <RiCloseLine size={18} className="text-white" />
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
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-brand-soft" : "bg-ink"}`}
                  >
                    {msg.role === "assistant" ? (
                      <RiRobot2Line size={14} className="text-brand-ink" />
                    ) : (
                      <RiStethoscopeLine size={14} className="text-white" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap ${
                      msg.role === "assistant"
                        ? "bg-canvas border border-line text-ink-2 rounded-tl-sm"
                        : "bg-ink text-white rounded-tr-sm"
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
                  <div className="w-7 h-7 rounded-xl bg-brand-soft flex items-center justify-center shrink-0">
                    <RiRobot2Line size={14} className="text-brand-ink" />
                  </div>
                  <div className="bg-canvas border border-line px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
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

              {/* Quick prompts */}
              {messages.length <= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col gap-2 mt-2"
                >
                  <p className="caption px-1">Try asking</p>
                  {QUICK_PROMPTS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="text-left px-3.5 py-2.5 bg-white border border-line rounded-2xl text-[13px] text-ink-2 hover:border-teal-300 hover:text-brand-ink hover:bg-brand-soft transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-4 border-t border-line shrink-0">
              <div className="flex items-center gap-2 bg-white border-[1.5px] border-line rounded-2xl px-4 py-2.5 focus-within:border-brand transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask a clinical question…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  aria-label="Send"
                  className="btn btn-teal !p-2 !rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <RiLoader4Line size={14} className="animate-spin" />
                  ) : (
                    <RiSendPlaneLine size={14} />
                  )}
                </button>
              </div>
              <p className="text-[12px] text-ink-3 text-center mt-2">
                Powered by Gemini. Check its answers before acting on them.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DoctorAI;
