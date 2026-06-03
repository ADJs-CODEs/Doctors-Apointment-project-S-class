import React, { useState, useRef, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiRobot2Line,
  RiSendPlaneLine,
  RiCloseLine,
  RiLoader4Line,
  RiStethoscopeLine,
  RiSparklingLine,
} from "@remixicon/react";
import { DoctorContext } from "../context/DoctorContext.js";
import type { DoctorContextType } from "../types/index.js";
import axiosInstance from "../utils/axiosInstance.js";
import { API_PATHS } from "../utils/apiPath.js";

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
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5 bg-slate-900 text-white px-5 py-3.5 rounded-full shadow-2xl border border-white/10"
          >
            <RiSparklingLine size={18} className="text-teal-400" />
            <span className="text-[11px] font-black uppercase tracking-widest">
              AI Assistant
            </span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-teal-400 rounded-full animate-pulse" />
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
            className="fixed bottom-6 right-6 z-[9999] w-[360px] sm:w-[420px] h-[580px] bg-white border border-slate-100 rounded-[28px] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-900 px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-500/20 rounded-xl flex items-center justify-center">
                  <RiRobot2Line size={18} className="text-teal-400" />
                </div>
                <div>
                  <p className="text-white font-black text-sm uppercase tracking-tight">
                    Clinical AI
                  </p>
                  {appointmentContext ? (
                    <p className="text-teal-400 text-[10px] font-bold truncate max-w-[180px]">
                      {appointmentContext.userData?.name} loaded
                    </p>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                      <p className="text-teal-400 text-[10px] font-bold uppercase tracking-widest">
                        Ready
                      </p>
                    </div>
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
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-teal-50" : "bg-slate-900"}`}
                  >
                    {msg.role === "assistant" ? (
                      <RiStethoscopeLine size={14} className="text-teal-500" />
                    ) : (
                      <RiRobot2Line size={14} className="text-white" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap ${
                      msg.role === "assistant"
                        ? "bg-slate-50 text-slate-700 rounded-tl-sm"
                        : "bg-slate-900 text-white rounded-tr-sm"
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
                  <div className="w-7 h-7 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                    <RiStethoscopeLine size={14} className="text-teal-500" />
                  </div>
                  <div className="bg-slate-50 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 bg-slate-300 rounded-full"
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
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Quick actions
                  </p>
                  {QUICK_PROMPTS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="text-left px-3.5 py-2.5 bg-white border border-slate-100 rounded-2xl text-xs font-medium text-slate-600 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50 transition-all active:scale-95"
                    >
                      {q}
                    </button>
                  ))}
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-4 border-t border-slate-50 shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 focus-within:border-teal-400 focus-within:bg-white transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask a clinical question..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 font-medium"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="p-1.5 bg-slate-900 text-white rounded-xl disabled:opacity-30 hover:bg-teal-600 transition-all active:scale-90 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <RiLoader4Line size={14} className="animate-spin" />
                  ) : (
                    <RiSendPlaneLine size={14} />
                  )}
                </button>
              </div>
              <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest text-center mt-2">
                Powered by Gemini · Clinical use only
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DoctorAI;
