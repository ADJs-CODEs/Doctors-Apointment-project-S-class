import React, { useEffect, useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiHeart3Fill,
  RiLoader4Line,
  RiCloseLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiUserAddLine,
  RiHeartLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { DoctorContext } from "../../context/DoctorContext.js";
import { AppContext } from "../../context/AppContext.js";
import type { DoctorContextType, AppContextType } from "../../types/index.js";
import axiosInstance from "../../utils/axiosInstance.js";
import { API_PATHS } from "../../utils/apiPath.js";

interface WishWellEntry {
  _id: string;
  patientId: string;
  patientName: string;
  patientImage: string;
  doctorId: string;
  doctorName: string;
  condition: string;
  story: string;
  status: "critical" | "recovered" | "passed";
  emojiCounts: {
    heart: number;
    flower: number;
    clap: number;
    star: number;
    prayer: number;
  };
  totalEmojis: number;
  createdAt: string;
}

const DoctorWishWell: React.FC = () => {
  const { dToken, appointments, getAppointments } = useContext(
    DoctorContext,
  ) as DoctorContextType;
  const { setProgress } = useContext(AppContext) as AppContextType;

  const [entries, setEntries] = useState<WishWellEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNominateModal, setShowNominateModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [condition, setCondition] = useState("");
  const [story, setStory] = useState("");
  const [nominating, setNominating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchEntries = async () => {
    try {
      setProgress(30);
      const { data } = await axiosInstance.get(API_PATHS.WISH_WELL.ALL);
      if (data.success) {
        // Only show entries that belong to this doctor
        setEntries(data.entries);
      }
    } catch (error: any) {
      toast.error("Failed to load Wish Well entries");
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  const nominatePatient = async () => {
    if (!condition.trim() || !story.trim()) {
      return toast.error("Please fill in the condition and patient story");
    }
    try {
      setNominating(true);
      setProgress(40);
      const { data } = await axiosInstance.post(API_PATHS.WISH_WELL.NOMINATE, {
        patientId: selectedPatientId,
        condition,
        story,
      });
      if (data.success) {
        toast.success("Patient added to the Wish Well");
        setShowNominateModal(false);
        setCondition("");
        setStory("");
        fetchEntries();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to nominate patient",
      );
    } finally {
      setNominating(false);
      setProgress(100);
    }
  };

  const updateStatus = async (
    entryId: string,
    status: "recovered" | "passed",
  ) => {
    const label =
      status === "recovered" ? "All Clear (Recovered)" : "Mark as Passed";
    if (
      !window.confirm(
        `Mark this patient as "${label}"? This will stop emoji sending.`,
      )
    )
      return;

    try {
      setUpdatingId(entryId);
      setProgress(40);
      const { data } = await axiosInstance.post(
        API_PATHS.WISH_WELL.UPDATE_STATUS,
        {
          entryId,
          status,
        },
      );
      if (data.success) {
        toast.success(
          status === "recovered"
            ? "🎉 Patient marked as recovered!"
            : "Status updated",
        );
        fetchEntries();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
      setProgress(100);
    }
  };

  const removeEntry = async (entryId: string, patientName: string) => {
    if (!window.confirm(`Remove ${patientName} from the Wish Well?`)) return;
    try {
      setRemovingId(entryId);
      const { data } = await axiosInstance.post(API_PATHS.WISH_WELL.REMOVE, {
        entryId,
      });
      if (data.success) {
        toast.success("Removed from Wish Well");
        fetchEntries();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error("Failed to remove");
    } finally {
      setRemovingId(null);
    }
  };

  useEffect(() => {
    if (dToken) {
      fetchEntries();
      if (!appointments.length) getAppointments();
    }
  }, [dToken]);

  // Get unique patients from completed appointments for nomination
  const eligiblePatients = appointments
    .filter((a) => a.isCompleted && !a.cancelled)
    .reduce((acc: any[], appt) => {
      if (!acc.find((p) => p.userId === appt.userId)) {
        acc.push({
          userId: appt.userId,
          name: appt.userData?.name,
          email: appt.userData?.email,
        });
      }
      return acc;
    }, []);

  const emojiMap: Record<string, string> = {
    heart: "❤️",
    flower: "🌸",
    clap: "👏",
    star: "⭐",
    prayer: "🙏",
  };

  return (
    <div className="m-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-red-50 text-red-500 rounded-2xl">
              <RiHeart3Fill size={20} />
            </div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Wish Well
            </h1>
          </div>
          <p className="text-slate-400 text-sm font-medium ml-12">
            Feature critically ill patients so the community can send them love
            and support
          </p>
        </div>
        <button
          onClick={() => setShowNominateModal(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all active:scale-95"
        >
          <RiUserAddLine size={16} />
          Add Patient to Wish Well
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Fighting",
            value: entries.filter((e) => e.status === "critical").length,
            color: "text-red-500",
            bg: "bg-red-50",
          },
          {
            label: "Recovered",
            value: entries.filter((e) => e.status === "recovered").length,
            color: "text-green-500",
            bg: "bg-green-50",
          },
          {
            label: "Total Wishes",
            value: entries.reduce((a, e) => a + e.totalEmojis, 0),
            color: "text-teal-500",
            bg: "bg-teal-50",
          },
        ].map((s, i) => (
          <div
            key={i}
            className={`${s.bg} rounded-[24px] p-5 text-center border border-white`}
          >
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RiLoader4Line size={32} className="text-red-400 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-200 rounded-[28px] text-center px-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-400 mb-4">
            <RiHeartLine size={32} />
          </div>
          <h3 className="font-black text-slate-900 text-xl mb-2">
            No patients on the Wish Well
          </h3>
          <p className="text-slate-400 text-sm font-medium max-w-xs leading-relaxed">
            Add a critically ill patient so the global community can send them
            love and support.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Critical patients */}
          {entries.filter((e) => e.status === "critical").length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-3">
                Currently Fighting 🔴
              </p>
              {entries
                .filter((e) => e.status === "critical")
                .map((entry) => (
                  <motion.div
                    key={entry._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-red-100 rounded-[24px] p-6 shadow-sm mb-4"
                  >
                    <div className="flex items-start gap-4 mb-5">
                      <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100 shrink-0 overflow-hidden">
                        {entry.patientImage ? (
                          <img
                            src={entry.patientImage}
                            alt={entry.patientName}
                            className="w-full h-full object-cover rounded-2xl"
                          />
                        ) : (
                          <span className="text-xl">👤</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-black text-slate-900 text-lg">
                            {entry.patientName}
                          </p>
                          <span className="text-[9px] font-black text-red-500 uppercase tracking-wider bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                            {entry.condition}
                          </span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium italic leading-relaxed mb-2">
                          "{entry.story}"
                        </p>
                        <p className="text-slate-400 text-xs font-medium">
                          Added{" "}
                          {new Date(entry.createdAt).toLocaleDateString(
                            "en-GB",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </p>
                      </div>
                      <div className="text-center shrink-0">
                        <p className="text-red-500 text-2xl font-black">
                          {entry.totalEmojis}
                        </p>
                        <p className="text-[9px] font-black text-slate-400 uppercase">
                          Wishes
                        </p>
                      </div>
                    </div>

                    {/* Emoji breakdown */}
                    {entry.totalEmojis > 0 && (
                      <div className="flex gap-3 mb-5 flex-wrap">
                        {Object.entries(entry.emojiCounts).map(
                          ([key, count]) =>
                            count > 0 ? (
                              <div
                                key={key}
                                className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1"
                              >
                                <span className="text-sm">{emojiMap[key]}</span>
                                <span className="text-xs font-black text-slate-500">
                                  {count}
                                </span>
                              </div>
                            ) : null,
                        )}
                      </div>
                    )}

                    {/* Doctor controls */}
                    <div className="flex gap-3 pt-4 border-t border-slate-50">
                      <button
                        onClick={() => updateStatus(entry._id, "recovered")}
                        disabled={updatingId === entry._id}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60"
                      >
                        {updatingId === entry._id ? (
                          <RiLoader4Line size={14} className="animate-spin" />
                        ) : (
                          <>
                            <RiCheckLine size={14} /> All Clear — Recovered
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => updateStatus(entry._id, "passed")}
                        disabled={updatingId === entry._id}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60"
                      >
                        🕊️ Passed
                      </button>
                      <button
                        onClick={() =>
                          removeEntry(entry._id, entry.patientName)
                        }
                        disabled={removingId === entry._id}
                        className="py-3 px-4 bg-red-50 border border-red-200 text-red-500 rounded-2xl hover:bg-red-100 transition-all active:scale-95 disabled:opacity-60"
                      >
                        {removingId === entry._id ? (
                          <RiLoader4Line size={16} className="animate-spin" />
                        ) : (
                          <RiDeleteBinLine size={16} />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
            </div>
          )}

          {/* Recovered patients */}
          {entries.filter((e) => e.status === "recovered").length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-3">
                Recovered 🟢
              </p>
              {entries
                .filter((e) => e.status === "recovered")
                .map((entry) => (
                  <motion.div
                    key={entry._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-100 rounded-[24px] p-6 shadow-sm mb-4"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center border border-green-200 shrink-0 overflow-hidden">
                        {entry.patientImage ? (
                          <img
                            src={entry.patientImage}
                            alt={entry.patientName}
                            className="w-full h-full object-cover rounded-2xl"
                          />
                        ) : (
                          <span className="text-xl">👤</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-slate-900 text-lg">
                          {entry.patientName}
                        </p>
                        <p className="text-green-600 text-xs font-black uppercase tracking-wider mt-1">
                          ✅ All Clear — Recovered
                        </p>
                      </div>
                      <p className="text-3xl">🔔</p>
                    </div>

                    {/* Love received badge */}
                    <div className="bg-white rounded-2xl p-5 border border-green-100 text-center mb-4">
                      <p className="text-green-500 text-4xl font-black">
                        {entry.totalEmojis}
                      </p>
                      <p className="text-green-700 font-bold text-sm mt-2">
                        Wishes of Love from the Community 💕
                      </p>
                      <div className="flex justify-center gap-3 mt-3 flex-wrap">
                        {Object.entries(entry.emojiCounts).map(
                          ([key, count]) =>
                            count > 0 ? (
                              <div
                                key={key}
                                className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-full px-3 py-1"
                              >
                                <span className="text-base">
                                  {emojiMap[key]}
                                </span>
                                <span className="text-sm font-black text-green-700">
                                  {count}
                                </span>
                              </div>
                            ) : null,
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => removeEntry(entry._id, entry.patientName)}
                      disabled={removingId === entry._id}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60"
                    >
                      {removingId === entry._id ? (
                        <RiLoader4Line size={14} className="animate-spin" />
                      ) : (
                        <>
                          <RiDeleteBinLine size={14} /> Remove from Wish Well
                        </>
                      )}
                    </button>
                  </motion.div>
                ))}
            </div>
          )}

          {/* Passed patients */}
          {entries.filter((e) => e.status === "passed").length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-3">
                Passed 🕊️
              </p>
              {entries
                .filter((e) => e.status === "passed")
                .map((entry) => (
                  <div
                    key={entry._id}
                    className="bg-slate-50 border border-slate-200 rounded-[24px] p-5 mb-3 flex items-center gap-4 opacity-70"
                  >
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                      <span>🕊️</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-slate-500 text-sm">
                        {entry.patientName}
                      </p>
                      <p className="text-slate-400 text-xs font-medium">
                        Received {entry.totalEmojis} community wishes
                      </p>
                    </div>
                    <button
                      onClick={() => removeEntry(entry._id, entry.patientName)}
                      disabled={removingId === entry._id}
                      className="p-2 text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <RiDeleteBinLine size={16} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Nominate Modal */}
      <AnimatePresence>
        {showNominateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    Add to Wish Well
                  </h2>
                  <p className="text-slate-400 text-xs font-medium mt-1">
                    The community will be able to send this patient love and
                    support
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowNominateModal(false);
                    setCondition("");
                    setStory("");
                  }}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <RiCloseLine size={20} className="text-slate-400" />
                </button>
              </div>

              {/* Patient selector */}
              <div className="mb-5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Select Patient
                </p>
                <select
                  value={selectedPatientId}
                  onChange={(e) => {
                    setSelectedPatientId(e.target.value);
                    const patient = eligiblePatients.find(
                      (p) => p.userId === e.target.value,
                    );
                    setSelectedPatientName(patient?.name || "");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-700 outline-none focus:border-teal-400 transition-all"
                >
                  <option value="">Choose a patient...</option>
                  {eligiblePatients.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      {p.name} — {p.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div className="mb-5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Condition / Illness
                </p>
                <input
                  type="text"
                  placeholder="e.g. Stage 3 Cancer, Heart Failure..."
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:border-teal-400 focus:bg-white transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Story */}
              <div className="mb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Patient Story (shown to community)
                </p>
                <textarea
                  placeholder="Share a brief message about this patient..."
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:border-teal-400 focus:bg-white transition-all placeholder:text-slate-400 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowNominateModal(false);
                    setCondition("");
                    setStory("");
                  }}
                  className="flex-1 border border-slate-200 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={nominatePatient}
                  disabled={nominating || !selectedPatientId}
                  className="flex-[2] bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {nominating ? (
                    <RiLoader4Line size={16} className="animate-spin" />
                  ) : (
                    <>
                      <RiHeart3Fill size={14} /> Add to Wish Well
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DoctorWishWell;
