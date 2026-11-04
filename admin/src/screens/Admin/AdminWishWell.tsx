"use client";

import {
  RiAddLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiEdit2Line,
  RiEyeLine,
  RiEyeOffLine,
  RiGiftLine,
  RiHeart3Fill,
  RiSearchLine,
  RiStethoscopeLine,
} from "@remixicon/react";
import React, { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Avatar } from "../../components/visits";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

type Entry = {
  _id: string;
  patientId: string;
  patientName: string;
  patientImage: string;
  doctorId: string;
  doctorName: string;
  condition: string;
  story: string;
  status: "critical" | "recovered" | "passed";
  consentGiven: boolean;
  optedOut: boolean;
  nominatedBy?: "doctor" | "admin";
  hidden?: boolean;
  hiddenReason?: string;
  totalEmojis: number;
  giftCount?: number;
  giftCoins?: number;
  createdAt: string;
};
type Tab = "live" | "waiting" | "closed" | "hidden";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "live", label: "Live", hint: "On the public Wish Well now." },
  { id: "waiting", label: "Waiting for patient", hint: "Put forward, but the patient hasn't said yes yet. Nothing about them is public." },
  { id: "closed", label: "Recovered & passed", hint: "Emojis are closed for these." },
  { id: "hidden", label: "Hidden & left", hint: "Hidden by the clinic, or the patient chose to leave." },
];
const tabOf = (e: Entry): Tab =>
  !e.consentGiven ? "waiting" : e.optedOut || e.hidden ? "hidden" : e.status === "critical" ? "live" : "closed";

const field = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500";
const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** The admin's view of the Wish Well: everything in it, putting a patient forward, and moderation. */
export default function AdminWishWell() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [tab, setTab] = useState<Tab>("live");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.ADMIN.WISH_WELL);
      if (data.success) setEntries(data.entries);
      else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't load the Wish Well");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const g: Record<Tab, Entry[]> = { live: [], waiting: [], closed: [], hidden: [] };
    for (const e of entries ?? []) g[tabOf(e)].push(e);
    return g;
  }, [entries]);

  const live = groups.live;
  const stats = [
    { label: "Live now", value: live.length },
    { label: "Waiting for a yes", value: groups.waiting.length },
    { label: "Wishes sent", value: (entries ?? []).reduce((n, e) => n + (e.totalEmojis || 0), 0).toLocaleString() },
    { label: "Gifts received", value: (entries ?? []).reduce((n, e) => n + (e.giftCount || 0), 0).toLocaleString() },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen animate-reveal">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 bg-rose-500 rounded-xl text-white">
                <RiHeart3Fill size={20} />
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-slate-900">
                Wish <span className="text-rose-500 font-serif italic normal-case">Well</span>
              </h1>
            </div>
            <p className="text-slate-500 text-sm ml-12">Every patient on the Wish Well. Patients must say yes before anything about them is public.</p>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="self-start sm:self-auto flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-rose-500"
          >
            <RiAddLine size={18} /> Put a patient forward
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-white border border-slate-100 rounded-[24px] p-4 shadow-sm">
              <p className="text-2xl font-black text-slate-900 tabular-nums">{entries ? s.value : "–"}</p>
              <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
                tab === t.id ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label}
              {groups[t.id].length > 0 && (
                <span
                  className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-black flex items-center justify-center ${
                    t.id === "waiting" ? "bg-amber-500 text-white" : tab === t.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {groups[t.id].length}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-slate-500 -mt-3">{TABS.find((t) => t.id === tab)?.hint}</p>

        {entries === null ? (
          <div className="h-40 rounded-[28px] bg-slate-200/60 animate-pulse" />
        ) : groups[tab].length === 0 ? (
          <div className="bg-white rounded-[28px] border border-slate-100 py-14 text-center">
            <p className="font-black text-slate-900">Nobody here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups[tab].map((e) => (
              <EntryCard key={e._id} e={e} onChanged={load} />
            ))}
          </div>
        )}
      </div>

      {adding && (
        <AddPatient
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            setTab("waiting");
            load();
          }}
        />
      )}
    </div>
  );
}

function EntryCard({ e, onChanged }: { e: Entry; onChanged: () => void }) {
  const [mode, setMode] = useState<"none" | "edit" | "hide">("none");
  const [condition, setCondition] = useState(e.condition);
  const [story, setStory] = useState(e.story);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState<null | "recovered" | "passed" | "remove">(null);
  const [busy, setBusy] = useState(false);

  const call = async (url: string, method: "post" | "put", body: object, after?: () => void) => {
    setBusy(true);
    try {
      const { data } = await axiosInstance[method](url, body);
      if (data.success) {
        toast.success(data.message);
        after?.();
        onChanged();
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const state = tabOf(e);
  const badge =
    state === "waiting"
      ? { text: "Waiting for the patient", tone: "bg-amber-50 text-amber-800 border-amber-100" }
      : e.optedOut
        ? { text: "Patient left", tone: "bg-slate-100 text-slate-500 border-slate-200" }
        : e.hidden
          ? { text: "Hidden by the clinic", tone: "bg-rose-50 text-rose-700 border-rose-100" }
          : e.status === "critical"
            ? { text: "Live · fighting", tone: "bg-rose-50 text-rose-600 border-rose-100" }
            : e.status === "recovered"
              ? { text: "Recovered", tone: "bg-teal-50 text-teal-700 border-teal-100" }
              : { text: "Passed", tone: "bg-slate-100 text-slate-600 border-slate-200" };

  return (
    <div className="bg-white rounded-[24px] border border-slate-200 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row gap-4">
        <Avatar src={e.patientImage} name={e.patientName} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-slate-900">{e.patientName}</p>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.tone}`}>{badge.text}</span>
          </div>
          <p className="text-[12px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <RiStethoscopeLine size={13} className="text-teal-600" /> {e.doctorName}
            <span className="text-slate-300">·</span> put forward by {e.nominatedBy === "admin" ? "the clinic" : "the doctor"} on {when(e.createdAt)}
          </p>
          {e.hidden && e.hiddenReason && <p className="text-[12px] text-rose-700 mt-1">Why hidden: {e.hiddenReason}</p>}

          {mode === "edit" ? (
            <div className="mt-3 space-y-2">
              <input value={condition} onChange={(ev) => setCondition(ev.target.value)} maxLength={120} className={field} placeholder="Condition" />
              <textarea value={story} onChange={(ev) => setStory(ev.target.value)} maxLength={2000} rows={4} className={`${field} resize-y`} placeholder="Story" />
              <div className="flex gap-2">
                <button
                  onClick={() => call(API_PATHS.ADMIN.WISH_WELL_ENTRY(e._id), "put", { condition, story }, () => setMode("none"))}
                  disabled={busy}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white text-[13px] font-bold disabled:opacity-50"
                >
                  Save wording
                </button>
                <button onClick={() => setMode("none")} className="px-4 py-2 rounded-xl text-[13px] font-bold text-slate-500 hover:bg-slate-100">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[13px] font-black text-rose-600 mt-2">{e.condition}</p>
              <p className="text-sm text-slate-600 mt-0.5 line-clamp-3 whitespace-pre-line">{e.story}</p>
            </>
          )}

          {mode === "hide" && (
            <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-3 space-y-2">
              <input
                value={reason}
                onChange={(ev) => setReason(ev.target.value)}
                maxLength={300}
                className={field}
                placeholder="Why is it hidden? (only the clinic and the doctor see this)"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => call(API_PATHS.ADMIN.WISH_WELL_ENTRY(e._id, "hide"), "post", { hidden: true, reason }, () => setMode("none"))}
                  disabled={busy || !reason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-[13px] font-bold disabled:opacity-40"
                >
                  Hide it
                </button>
                <button onClick={() => setMode("none")} className="px-4 py-2 rounded-xl text-[13px] font-bold text-slate-500 hover:bg-slate-100">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex sm:flex-col gap-3 sm:items-end shrink-0 text-right">
          <div className="flex gap-4">
            <div>
              <p className="text-lg font-black text-rose-500 tabular-nums">{e.totalEmojis || 0}</p>
              <p className="text-[9px] font-black uppercase text-slate-400">Wishes</p>
            </div>
            <div>
              <p className="text-lg font-black text-amber-500 tabular-nums flex items-center gap-1 justify-end">
                <RiGiftLine size={15} /> {e.giftCount || 0}
              </p>
              <p className="text-[9px] font-black uppercase text-slate-400">Gifts</p>
            </div>
          </div>
        </div>
      </div>

      {mode === "none" && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
          {state !== "waiting" && (
            <button onClick={() => setMode("edit")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-slate-50">
              <RiEdit2Line size={15} /> Edit wording
            </button>
          )}
          {state !== "waiting" && !e.optedOut &&
            (e.hidden ? (
              <button
                onClick={() => call(API_PATHS.ADMIN.WISH_WELL_ENTRY(e._id, "hide"), "post", { hidden: false })}
                disabled={busy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-slate-50"
              >
                <RiEyeLine size={15} /> Show again
              </button>
            ) : (
              <button onClick={() => setMode("hide")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200">
                <RiEyeOffLine size={15} /> Hide
              </button>
            ))}
          {state === "live" && (
            <>
              <button onClick={() => setConfirm("recovered")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 text-[13px] font-bold text-white hover:bg-teal-700">
                <RiCheckLine size={15} /> Recovered
              </button>
              <button onClick={() => setConfirm("passed")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 text-[13px] font-bold text-white hover:bg-slate-800">
                🕊️ Passed
              </button>
            </>
          )}
          <button
            onClick={() => setConfirm("remove")}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
          >
            <RiDeleteBinLine size={15} /> {state === "waiting" ? "Withdraw request" : "Remove"}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        busy={busy}
        tone={confirm === "recovered" ? "teal" : confirm === "passed" ? "slate" : "rose"}
        title={
          confirm === "recovered"
            ? `Mark ${e.patientName} as recovered?`
            : confirm === "passed"
              ? `Mark ${e.patientName} as passed?`
              : state === "waiting"
                ? "Withdraw this request?"
                : `Remove ${e.patientName} from the Wish Well?`
        }
        body={
          confirm === "recovered"
            ? "Emojis stop, and they're told the community sent them its love."
            : confirm === "passed"
              ? "Emojis and gifts stop. Do this only once it's confirmed."
              : "This deletes the entry and its wish counts. It can't be undone."
        }
        confirmLabel={confirm === "recovered" ? "Mark recovered" : confirm === "passed" ? "Mark passed" : state === "waiting" ? "Withdraw" : "Remove"}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          confirm === "remove"
            ? call(API_PATHS.ADMIN.WISH_WELL_ENTRY(e._id, "remove"), "post", {}, () => setConfirm(null))
            : call(API_PATHS.ADMIN.WISH_WELL_ENTRY(e._id, "status"), "post", { status: confirm }, () => setConfirm(null))
        }
      />
    </div>
  );
}

type Candidate = { _id: string; name: string; email: string; image?: string; unavailable: boolean; doctors: { _id: string; name: string }[] };

/** Search a patient, pick the doctor treating them, write the condition and story. It then goes to the patient to accept. */
function AddPatient({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [docId, setDocId] = useState("");
  const [condition, setCondition] = useState("");
  const [story, setStory] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { data } = await axiosInstance.get(API_PATHS.ADMIN.WISH_WELL_CANDIDATES, { params: { q }, silent: true } as any);
        if (data.success) setResults(data.patients);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!picked) return;
    setSaving(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.ADMIN.WISH_WELL_NOMINATE, { patientId: picked._id, docId, condition, story });
      if (data.success) {
        toast.success(data.message);
        onAdded();
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(ev) => ev.stopPropagation()}
        className="w-full sm:max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-black text-slate-900">Put a patient forward</p>
            <p className="text-sm text-slate-500 mt-0.5">It goes to the patient to accept. Nothing is public until they say yes.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100" aria-label="Close">
            <RiCloseLine size={20} />
          </button>
        </div>

        {!picked ? (
          <div className="mt-5">
            <label className="relative block">
              <RiSearchLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input autoFocus value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Search a patient by name or email" className={`${field} pl-9`} />
            </label>
            <ul className="mt-3 divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {results === null ? (
                <li className="py-6 text-center text-sm text-slate-400">Searching…</li>
              ) : results.length === 0 ? (
                <li className="py-6 text-center text-sm text-slate-400">No patients with a visit match that.</li>
              ) : (
                results.map((p) => (
                  <li key={p._id}>
                    <button
                      type="button"
                      disabled={p.unavailable}
                      onClick={() => {
                        setPicked(p);
                        setDocId(p.doctors[0]?._id ?? "");
                      }}
                      className="w-full flex items-center gap-3 py-3 text-left hover:bg-slate-50 rounded-xl px-2 disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      <Avatar src={p.image} name={p.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 text-sm truncate">{p.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{p.email}</p>
                      </div>
                      {p.unavailable && <span className="text-[10px] font-bold text-slate-400">Already on it, or opted out</span>}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
              <Avatar src={picked.image} name={picked.name} size="sm" />
              <p className="font-bold text-slate-900 text-sm flex-1 truncate">{picked.name}</p>
              <button type="button" onClick={() => setPicked(null)} className="text-[12px] font-bold text-teal-700 hover:underline">
                Change
              </button>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">On behalf of their doctor</span>
              <select value={docId} onChange={(ev) => setDocId(ev.target.value)} className={field}>
                {picked.doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Condition</span>
              <input required maxLength={120} value={condition} onChange={(ev) => setCondition(ev.target.value)} className={field} placeholder="e.g. Leukaemia" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Their story</span>
              <textarea
                required
                maxLength={2000}
                rows={4}
                value={story}
                onChange={(ev) => setStory(ev.target.value)}
                className={`${field} resize-y`}
                placeholder="A few kind words the community will read. The patient sees exactly this before they decide."
              />
            </div>
            <button type="submit" disabled={saving || !docId} className="w-full px-5 py-3 rounded-xl bg-rose-500 text-white text-sm font-black hover:bg-rose-600 disabled:opacity-50">
              {saving ? "Sending…" : `Ask ${picked.name.split(" ")[0]}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
