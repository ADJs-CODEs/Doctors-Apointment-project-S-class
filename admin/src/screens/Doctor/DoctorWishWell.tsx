"use client";

import React, { useEffect, useState, useContext } from "react";
import { RiCheckLine, RiCloseLine, RiDeleteBinLine, RiHeartLine, RiUserAddLine } from "@remixicon/react";
import { toast } from "sonner";
import { DoctorContext } from "../../context/DoctorContext";
import type { DoctorContextType } from "../../types/index";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Avatar } from "../../components/visits";
import { PageHeader, Pill, Skeleton } from "../../components/panel";

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
  /** false until the patient accepts; nothing is public before that */
  consentGiven: boolean;
  optedOut: boolean;
  hidden?: boolean;
  hiddenReason?: string;
  createdAt: string;
}

const WISH_NAMES: Record<keyof WishWellEntry["emojiCounts"], string> = {
  heart: "Hearts",
  flower: "Flowers",
  clap: "Claps",
  star: "Stars",
  prayer: "Prayers",
};

const ghost = "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-line bg-white text-[13px] font-bold text-ink-2 hover:bg-canvas disabled:opacity-50";
const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

type Pending = { kind: "recovered" | "passed" | "remove"; entry: WishWellEntry };

const DoctorWishWell: React.FC = () => {
  const { dToken, appointments, getAppointments } = useContext(DoctorContext) as DoctorContextType;

  const [entries, setEntries] = useState<WishWellEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNominateModal, setShowNominateModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [condition, setCondition] = useState("");
  const [story, setStory] = useState("");
  const [nominating, setNominating] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchEntries = async () => {
    try {
      // this doctor's own nominations, including ones still waiting for the patient
      const { data } = await axiosInstance.get(API_PATHS.WISH_WELL.MINE);
      if (data.success) setEntries(data.entries);
    } catch {
      toast.error("Failed to load Wish Well entries");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowNominateModal(false);
    setCondition("");
    setStory("");
  };

  const nominatePatient = async () => {
    if (!condition.trim() || !story.trim()) {
      return toast.error("Please fill in the condition and patient story");
    }
    try {
      setNominating(true);
      const { data } = await axiosInstance.post(API_PATHS.WISH_WELL.NOMINATE, {
        patientId: selectedPatientId,
        condition,
        story,
      });
      if (data.success) {
        toast.success(data.message);
        closeModal();
        fetchEntries();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to nominate patient");
    } finally {
      setNominating(false);
    }
  };

  const confirmPending = async () => {
    if (!pending) return;
    const { kind, entry } = pending;
    setBusy(true);
    try {
      const { data } =
        kind === "remove"
          ? await axiosInstance.post(API_PATHS.WISH_WELL.REMOVE, { entryId: entry._id })
          : await axiosInstance.post(API_PATHS.WISH_WELL.UPDATE_STATUS, { entryId: entry._id, status: kind });
      if (data.success) {
        toast.success(kind === "remove" ? "Removed from the Wish Well" : kind === "recovered" ? `${entry.patientName} is marked as recovered` : "Status updated");
        fetchEntries();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "That didn't work, try again");
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  useEffect(() => {
    if (dToken) {
      fetchEntries();
      if (!appointments.length) getAppointments();
    }
  }, [dToken]);

  // patients from this doctor's completed visits can be put forward
  const eligiblePatients = appointments
    .filter((a) => a.isCompleted && !a.cancelled)
    .reduce((acc: { userId: string; name: string; email: string }[], appt) => {
      if (!acc.find((p) => p.userId === appt.userId)) {
        acc.push({ userId: appt.userId, name: appt.userData?.name ?? "Patient", email: appt.userData?.email ?? "" });
      }
      return acc;
    }, []);

  const fighting = entries.filter((e) => e.status === "critical");
  const recovered = entries.filter((e) => e.status === "recovered");
  const passed = entries.filter((e) => e.status === "passed");

  const stats = [
    { label: "On the Wish Well", value: fighting.length },
    { label: "Recovered", value: recovered.length },
    { label: "Wishes sent", value: entries.reduce((a, e) => a + e.totalEmojis, 0).toLocaleString() },
  ];

  const first = (name: string) => name.split(" ")[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-reveal">
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          eyebrow="Community"
          title="Wish Well"
          subtitle="Put forward a seriously ill patient so the community can send them support. They decide whether to join."
          action={
            <button onClick={() => setShowNominateModal(true)} className="btn btn-ink !rounded-xl">
              <RiUserAddLine size={17} /> Put a patient forward
            </button>
          }
        />

        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="surface rounded-[20px] p-4">
              <p className="num text-[24px] leading-none text-ink">{loading ? "–" : s.value}</p>
              <p className="text-[14px] font-semibold text-ink-3 mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <Skeleton className="h-48" />
        ) : entries.length === 0 ? (
          <div className="surface rounded-[24px] py-16 px-4 text-center">
            <div className="w-14 h-14 bg-brand-soft rounded-2xl flex items-center justify-center text-brand-ink mb-4 mx-auto">
              <RiHeartLine size={24} />
            </div>
            <p className="font-bold text-ink">Nobody on the Wish Well yet</p>
            <p className="text-ink-3 text-[14px] mt-1 max-w-sm mx-auto">
              Put forward a seriously ill patient. They&apos;re asked first, and nothing about them is public until they say yes.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {fighting.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[16px] font-bold text-ink">On the Wish Well</h2>
                {fighting.map((entry) => (
                  <div key={entry._id} className="surface rounded-[22px] p-5">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Avatar src={entry.patientImage} name={entry.patientName} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[16px] font-bold text-ink">{entry.patientName}</p>
                          {!entry.consentGiven ? (
                            <Pill tone="amber">Waiting for {first(entry.patientName)} to accept</Pill>
                          ) : entry.optedOut ? (
                            <Pill>{first(entry.patientName)} left the Wish Well</Pill>
                          ) : entry.hidden ? (
                            <Pill tone="rose">Hidden by the clinic</Pill>
                          ) : (
                            <Pill tone="brand">Live</Pill>
                          )}
                        </div>
                        <p className="text-[14px] font-bold text-ink-2 mt-1.5">{entry.condition}</p>
                        <p className="text-[14px] text-ink-2 mt-0.5 line-clamp-3 whitespace-pre-line">{entry.story}</p>
                        <p className="text-[13px] text-ink-3 mt-1.5">
                          Put forward {when(entry.createdAt)}
                          {!entry.consentGiven && " · not public yet"}
                        </p>
                        {entry.hidden && entry.hiddenReason && <p className="text-[13px] text-rose-700 mt-1">Why hidden: {entry.hiddenReason}</p>}
                      </div>
                      <div className="sm:text-right shrink-0">
                        <p className="num text-[22px] leading-none text-ink">{entry.totalEmojis.toLocaleString()}</p>
                        <p className="text-[12px] font-semibold text-ink-3 mt-1">Wishes</p>
                      </div>
                    </div>

                    {entry.totalEmojis > 0 && <WishBreakdown counts={entry.emojiCounts} />}

                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-line">
                      {!entry.consentGiven ? (
                        <button onClick={() => setPending({ kind: "remove", entry })} className={ghost}>
                          <RiCloseLine size={15} /> Withdraw the request
                        </button>
                      ) : (
                        <>
                          <button onClick={() => setPending({ kind: "recovered", entry })} className="btn btn-teal !py-2 !px-3 !text-[13px] !rounded-xl">
                            <RiCheckLine size={15} /> Recovered
                          </button>
                          <button onClick={() => setPending({ kind: "passed", entry })} className={ghost}>
                            Passed away
                          </button>
                          <button
                            onClick={() => setPending({ kind: "remove", entry })}
                            className={`ml-auto ${ghost} hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200`}
                          >
                            <RiDeleteBinLine size={15} /> Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {recovered.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[16px] font-bold text-ink">Recovered</h2>
                {recovered.map((entry) => (
                  <div key={entry._id} className="surface rounded-[22px] p-5">
                    <div className="flex items-center gap-4">
                      <Avatar src={entry.patientImage} name={entry.patientName} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-bold text-ink">{entry.patientName}</p>
                        <p className="text-[13px] text-brand-ink font-semibold mt-0.5">
                          Recovered, with <span className="num">{entry.totalEmojis.toLocaleString()}</span> wishes from the community
                        </p>
                      </div>
                      <button
                        onClick={() => setPending({ kind: "remove", entry })}
                        aria-label={`Remove ${entry.patientName}`}
                        className="p-2 rounded-xl border border-line text-ink-3 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                      >
                        <RiDeleteBinLine size={16} />
                      </button>
                    </div>
                    {entry.totalEmojis > 0 && <WishBreakdown counts={entry.emojiCounts} />}
                  </div>
                ))}
              </section>
            )}

            {passed.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[16px] font-bold text-ink">Passed away</h2>
                {passed.map((entry) => (
                  <div key={entry._id} className="rounded-[22px] border border-line bg-canvas/60 p-4 flex items-center gap-4">
                    <Avatar src={entry.patientImage} name={entry.patientName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-ink-2">{entry.patientName}</p>
                      <p className="text-[13px] text-ink-3">
                        Received <span className="num">{entry.totalEmojis.toLocaleString()}</span> wishes from the community
                      </p>
                    </div>
                    <button
                      onClick={() => setPending({ kind: "remove", entry })}
                      aria-label={`Remove ${entry.patientName}`}
                      className="p-2 rounded-xl text-ink-3 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <RiDeleteBinLine size={16} />
                    </button>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pending}
        busy={busy}
        tone={pending?.kind === "recovered" ? "teal" : pending?.kind === "passed" ? "slate" : "rose"}
        title={
          !pending
            ? ""
            : pending.kind === "recovered"
              ? `Mark ${pending.entry.patientName} as recovered?`
              : pending.kind === "passed"
                ? `Mark ${pending.entry.patientName} as passed away?`
                : !pending.entry.consentGiven
                  ? "Withdraw this request?"
                  : `Remove ${pending.entry.patientName} from the Wish Well?`
        }
        body={
          pending?.kind === "recovered"
            ? "Wishes stop, and they're told the community sent them its love."
            : pending?.kind === "passed"
              ? "Wishes and gifts stop. Do this only once it's confirmed."
              : "This deletes the entry and its wish counts. It can't be undone."
        }
        confirmLabel={
          pending?.kind === "recovered" ? "Mark recovered" : pending?.kind === "passed" ? "Mark passed away" : pending && !pending.entry.consentGiven ? "Withdraw" : "Remove"
        }
        cancelLabel="Back"
        onCancel={() => setPending(null)}
        onConfirm={confirmPending}
      />

      {showNominateModal && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/40 backdrop-blur-sm" onClick={closeModal}>
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-[24px] sm:rounded-[24px] p-5 sm:p-6 w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto animate-reveal"
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-ink">Put a patient forward</h2>
                <p className="text-ink-2 text-[14px] mt-0.5">They&apos;re asked first. Nothing is public until they say yes.</p>
              </div>
              <button onClick={closeModal} aria-label="Close" className="p-2 rounded-xl text-ink-3 hover:bg-canvas">
                <RiCloseLine size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="block caption mb-1.5">Patient</span>
                <select value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)} className="field">
                  <option value="">Choose a patient…</option>
                  {eligiblePatients.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      {p.name} · {p.email}
                    </option>
                  ))}
                </select>
                {eligiblePatients.length === 0 && <span className="block text-[13px] text-ink-3 mt-1.5">Patients appear here after a completed visit.</span>}
              </label>

              <label className="block">
                <span className="block caption mb-1.5">Condition</span>
                <input type="text" placeholder="e.g. Leukaemia" value={condition} onChange={(e) => setCondition(e.target.value)} maxLength={120} className="field" />
              </label>

              <label className="block">
                <span className="block caption mb-1.5">Their story (the community reads this)</span>
                <textarea
                  placeholder="A few kind words. The patient sees exactly this before they decide."
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  className="field resize-none"
                />
              </label>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={closeModal} className="flex-1 px-4 py-3 rounded-xl border border-line bg-white text-ink-2 text-[15px] font-bold hover:bg-canvas">
                Cancel
              </button>
              <button onClick={nominatePatient} disabled={nominating || !selectedPatientId} className="btn btn-ink flex-[2] !rounded-xl disabled:opacity-50">
                {nominating ? "Sending…" : "Ask the patient"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** How many of each wish they received, in words. */
function WishBreakdown({ counts }: { counts: WishWellEntry["emojiCounts"] }) {
  const parts = (Object.keys(WISH_NAMES) as (keyof typeof WISH_NAMES)[]).filter((k) => counts[k] > 0);
  if (!parts.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-4">
      {parts.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-canvas border border-line px-2.5 py-1 text-[12px] text-ink-2">
          {WISH_NAMES[k]} <span className="num text-ink">{counts[k].toLocaleString()}</span>
        </span>
      ))}
    </div>
  );
}

export default DoctorWishWell;
