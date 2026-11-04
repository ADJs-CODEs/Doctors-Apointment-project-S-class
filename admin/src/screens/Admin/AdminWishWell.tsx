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
  RiSearchLine,
  RiStethoscopeLine,
} from "@remixicon/react";
import React, { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ConfirmDialog from "../../components/ConfirmDialog";
import { PageHeader, Pill, Skeleton } from "../../components/panel";
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

const field = "field";
const ghost = "flex items-center gap-1.5 px-3 py-2 rounded-xl border border-line bg-white text-[13px] font-bold text-ink-2 hover:bg-canvas";
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
    <div className="p-4 sm:p-6 lg:p-8 animate-reveal">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          eyebrow="Community"
          title="Wish Well"
          subtitle="Every patient on the Wish Well. Patients must say yes before anything about them is public."
          action={
            <button onClick={() => setAdding(true)} className="btn btn-ink !rounded-xl">
              <RiAddLine size={18} /> Put a patient forward
            </button>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="surface rounded-[20px] p-4">
              <p className="num text-[24px] leading-none text-ink">{entries ? s.value : "–"}</p>
              <p className="text-[14px] font-semibold text-ink-3 mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[15px] font-bold ${
                tab === t.id ? "btn-ink" : "bg-white border border-line text-ink-2 hover:border-ink-3/40"
              }`}
            >
              {t.label}
              {groups[t.id].length > 0 && (
                <span
                  className={`num min-w-5 h-5 px-1.5 rounded-full text-[11px] flex items-center justify-center ${
                    t.id === "waiting" ? "bg-amber-500 text-white" : tab === t.id ? "bg-white/20 text-white" : "bg-canvas text-ink-2"
                  }`}
                >
                  {groups[t.id].length}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-[14px] text-ink-3 -mt-3">{TABS.find((t) => t.id === tab)?.hint}</p>

        {entries === null ? (
          <Skeleton className="h-40" />
        ) : groups[tab].length === 0 ? (
          <div className="surface rounded-[24px] py-14 text-center">
            <p className="font-bold text-ink">Nobody here</p>
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
  const badge: { text: string; tone: "amber" | "neutral" | "rose" | "brand" } =
    state === "waiting"
      ? { text: "Waiting for the patient", tone: "amber" }
      : e.optedOut
        ? { text: "Patient left", tone: "neutral" }
        : e.hidden
          ? { text: "Hidden by the clinic", tone: "rose" }
          : e.status === "critical"
            ? { text: "Live", tone: "brand" }
            : e.status === "recovered"
              ? { text: "Recovered", tone: "brand" }
              : { text: "Passed", tone: "neutral" };

  return (
    <div className="surface rounded-[22px] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row gap-4">
        <Avatar src={e.patientImage} name={e.patientName} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[16px] font-bold text-ink">{e.patientName}</p>
            <Pill tone={badge.tone}>{badge.text}</Pill>
          </div>
          <p className="text-[13px] text-ink-3 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <RiStethoscopeLine size={13} className="text-brand-ink" /> {e.doctorName}
            <span className="text-line">·</span> put forward by {e.nominatedBy === "admin" ? "the clinic" : "the doctor"} on {when(e.createdAt)}
          </p>
          {e.hidden && e.hiddenReason && <p className="text-[13px] text-rose-700 mt-1">Why hidden: {e.hiddenReason}</p>}

          {mode === "edit" ? (
            <div className="mt-3 space-y-2">
              <input value={condition} onChange={(ev) => setCondition(ev.target.value)} maxLength={120} className={field} placeholder="Condition" />
              <textarea value={story} onChange={(ev) => setStory(ev.target.value)} maxLength={2000} rows={4} className={`${field} resize-y`} placeholder="Story" />
              <div className="flex gap-2">
                <button
                  onClick={() => call(API_PATHS.ADMIN.WISH_WELL_ENTRY(e._id), "put", { condition, story }, () => setMode("none"))}
                  disabled={busy}
                  className="btn btn-teal !py-2 !px-4 !text-[13px] !rounded-xl disabled:opacity-50"
                >
                  Save wording
                </button>
                <button onClick={() => setMode("none")} className="px-4 py-2 rounded-xl text-[13px] font-bold text-ink-3 hover:bg-canvas">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[14px] font-bold text-ink-2 mt-2">{e.condition}</p>
              <p className="text-[14px] text-ink-2 mt-0.5 line-clamp-3 whitespace-pre-line">{e.story}</p>
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
                <button onClick={() => setMode("none")} className="px-4 py-2 rounded-xl text-[13px] font-bold text-ink-3 hover:bg-canvas">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex sm:flex-col gap-3 sm:items-end shrink-0 text-right">
          <div className="flex gap-5">
            <div>
              <p className="num text-[18px] text-ink">{(e.totalEmojis || 0).toLocaleString()}</p>
              <p className="text-[12px] font-semibold text-ink-3">Wishes</p>
            </div>
            <div>
              <p className="num text-[18px] text-ink flex items-center gap-1 justify-end">
                <RiGiftLine size={15} className="text-amber-500" /> {e.giftCount || 0}
              </p>
              <p className="text-[12px] font-semibold text-ink-3">Gifts</p>
            </div>
          </div>
        </div>
      </div>

      {mode === "none" && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-line">
          {state !== "waiting" && (
            <button onClick={() => setMode("edit")} className={ghost}>
              <RiEdit2Line size={15} /> Edit wording
            </button>
          )}
          {state !== "waiting" && !e.optedOut &&
            (e.hidden ? (
              <button
                onClick={() => call(API_PATHS.ADMIN.WISH_WELL_ENTRY(e._id, "hide"), "post", { hidden: false })}
                disabled={busy}
                className={ghost}
              >
                <RiEyeLine size={15} /> Show again
              </button>
            ) : (
              <button onClick={() => setMode("hide")} className={`${ghost} hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200`}>
                <RiEyeOffLine size={15} /> Hide
              </button>
            ))}
          {state === "live" && (
            <>
              <button onClick={() => setConfirm("recovered")} className="btn btn-teal !py-2 !px-3 !text-[13px] !rounded-xl">
                <RiCheckLine size={15} /> Recovered
              </button>
              <button onClick={() => setConfirm("passed")} className={ghost}>
                Passed away
              </button>
            </>
          )}
          <button
            onClick={() => setConfirm("remove")}
            className={`ml-auto ${ghost} hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200`}
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
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(ev) => ev.stopPropagation()}
        className="w-full sm:max-w-lg bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[20px] font-extrabold tracking-[-0.02em] text-ink">Put a patient forward</p>
            <p className="text-[14px] text-ink-2 mt-0.5">It goes to the patient to accept. Nothing is public until they say yes.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-ink-3 hover:bg-canvas" aria-label="Close">
            <RiCloseLine size={20} />
          </button>
        </div>

        {!picked ? (
          <div className="mt-5">
            <label className="relative block">
              <RiSearchLine size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
              <input autoFocus value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Search a patient by name or email" className={`${field} !pl-10`} />
            </label>
            <ul className="mt-3 divide-y divide-line max-h-80 overflow-y-auto">
              {results === null ? (
                <li className="py-6 text-center text-[14px] text-ink-3">Searching…</li>
              ) : results.length === 0 ? (
                <li className="py-6 text-center text-[14px] text-ink-3">No patients with a visit match that.</li>
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
                      className="w-full flex items-center gap-3 py-3 text-left hover:bg-canvas rounded-xl px-2 disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      <Avatar src={p.image} name={p.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-ink text-[14px] truncate">{p.name}</p>
                        <p className="text-[12px] text-ink-3 truncate">{p.email}</p>
                      </div>
                      {p.unavailable && <span className="text-[12px] font-semibold text-ink-3">Already on it, or opted out</span>}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-2.5">
              <Avatar src={picked.image} name={picked.name} size="sm" />
              <p className="font-bold text-ink text-[14px] flex-1 truncate">{picked.name}</p>
              <button type="button" onClick={() => setPicked(null)} className="text-[13px] font-bold text-brand-ink hover:underline">
                Change
              </button>
            </div>
            <div>
              <span className="block caption mb-1.5">On behalf of their doctor</span>
              <select value={docId} onChange={(ev) => setDocId(ev.target.value)} className={field}>
                {picked.doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="block caption mb-1.5">Condition</span>
              <input required maxLength={120} value={condition} onChange={(ev) => setCondition(ev.target.value)} className={field} placeholder="e.g. Leukaemia" />
            </div>
            <div>
              <span className="block caption mb-1.5">Their story</span>
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
            <button type="submit" disabled={saving || !docId} className="btn btn-ink w-full !rounded-xl disabled:opacity-50">
              {saving ? "Sending…" : `Ask ${picked.name.split(" ")[0]}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
