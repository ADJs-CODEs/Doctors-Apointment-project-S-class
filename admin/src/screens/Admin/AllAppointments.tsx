"use client";

import {
  RiArrowDownSLine,
  RiCalendarEventLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiErrorWarningFill,
  RiHeartPulseLine,
  RiMedicineBottleLine,
  RiSearchLine,
  RiUserUnfollowLine,
} from "@remixicon/react";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  criticalReason,
  DateBlock,
  dayHeading,
  isCritical,
  isOpen,
  slotStart,
  sortVisits,
  VisitPills,
  VisitTabs,
  type VisitTab,
} from "../../components/visits";
import { AdminContext } from "../../context/AdminContext";
import { AppContext } from "../../context/AppContext";
import MissedAppointmentModal, { canMarkMissed, MissedBadge } from "../../Modal/MissedAppointmentModal";
import type { AdminContextType, AppContextType, Appointment } from "../../types/index";

/** Every visit at the clinic, laid out like the doctor's Schedule, with the doctor on each card. */
const AllAppointments: React.FC = () => {
  const { aToken, appointments, getAllAppointments, cancelAppointment } = useContext(AdminContext) as AdminContextType;
  const { calculateAge, currency } = useContext(AppContext) as AppContextType;

  const [tab, setTab] = useState<VisitTab>("upcoming");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [missedFor, setMissedFor] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (aToken) getAllAppointments();
  }, [aToken, getAllAppointments]);

  // search by patient or doctor first, so the tab counts follow it
  const lists = useMemo(() => {
    const q = query.trim().toLowerCase();
    const found = q
      ? (appointments ?? []).filter((a) => `${a.userData?.name} ${a.docData?.name} ${a.docData?.speciality}`.toLowerCase().includes(q))
      : (appointments ?? []);
    return sortVisits(found);
  }, [appointments, query]);

  const shown = lists[tab];
  const tabs = [
    { id: "upcoming" as const, label: "Upcoming", count: lists.upcoming.length },
    { id: "toClose" as const, label: "Not closed", count: lists.toClose.length, tone: "bg-orange-500 text-white" },
    { id: "attention" as const, label: "Needs attention", count: lists.attention.length, tone: "bg-rose-500 text-white" },
    { id: "completed" as const, label: "Completed", count: lists.completed.length },
    { id: "closed" as const, label: "Cancelled & missed", count: lists.closed.length },
  ];

  const cancel = async (id: string) => {
    setCancelling(id);
    try {
      await cancelAppointment(id);
    } finally {
      setCancelling(null);
    }
  };

  let lastDay = "";

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen animate-reveal">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
                <RiCalendarEventLine size={20} />
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-slate-900">
                Appointments
              </h1>
            </div>
            <p className="text-slate-500 text-sm ml-12">Every visit at the clinic, soonest first. {appointments.length} in total.</p>
          </div>
          <label className="relative sm:w-72">
            <RiSearchLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patient or doctor"
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-teal-400"
            />
          </label>
        </div>

        <VisitTabs tabs={tabs} current={tab} onChange={setTab} />

        {shown.length === 0 ? (
          <div className="bg-white rounded-[28px] border border-slate-100 py-16 text-center">
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 mx-auto">
              <RiCalendarEventLine size={24} />
            </div>
            <p className="font-black text-slate-900">
              {query
                ? "No visits match your search"
                : tab === "upcoming"
                  ? "No upcoming visits"
                  : tab === "toClose"
                    ? "Every past visit is closed"
                    : tab === "attention"
                      ? "Nobody needs attention"
                      : "Nothing here"}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {query
                ? ""
                : tab === "upcoming"
                  ? "New bookings appear here as soon as they're paid."
                  : tab === "toClose"
                    ? "Visits whose time passed without the doctor closing them show up here."
                    : tab === "attention"
                      ? "Patients flagged critical show up here."
                      : ""}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tab === "toClose" && (
              <p className="text-[13px] text-orange-800 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
                The doctor hasn&apos;t closed these visits. Mark who missed it if you know. A visit still open 24 hours after its time is marked as missed by
                the doctor automatically, and the patient is refunded in full.
              </p>
            )}
            {shown.map((item) => {
              const heading = tab === "upcoming" ? dayHeading(slotStart(item)) : "";
              const showHeading = tab === "upcoming" && heading !== lastDay;
              lastDay = heading;
              const critical = isCritical(item);
              const age = calculateAge(item.userData.dob);
              const expanded = expandedId === item._id;

              return (
                <React.Fragment key={item._id}>
                  {showHeading && <p className="text-[11px] font-black uppercase tracking-[2px] text-slate-400 pt-3 px-1">{heading}</p>}

                  <div className={`bg-white rounded-[24px] border overflow-hidden ${critical ? "border-rose-200" : "border-slate-200"}`}>
                    {critical && (
                      <div className="flex items-center gap-2 bg-rose-50 px-4 sm:px-5 py-2.5 border-b border-rose-100">
                        <RiErrorWarningFill size={16} className="text-rose-600" />
                        <p className="text-[12px] font-bold text-rose-800">Needs attention: {criticalReason(item)}. The doctor marks it resolved.</p>
                      </div>
                    )}

                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4">
                      <DateBlock item={item} />

                      {/* the patient */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar src={item.userData.image} name={item.userData.name} />
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 truncate">{item.userData.name}</p>
                          <p className="text-[12px] text-slate-500">{Number.isFinite(age) && age > 0 ? `${age} years old` : "Age not given"}</p>
                          <VisitPills item={item} currency={currency} />
                        </div>
                      </div>

                      {/* the doctor */}
                      <div className="flex items-center gap-2.5 md:w-48 shrink-0 rounded-2xl bg-slate-50 md:bg-transparent px-3 py-2 md:p-0">
                        <Avatar src={item.docData.image} name={item.docData.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-[13px] font-black text-slate-700 truncate">{item.docData.name}</p>
                          <p className="text-[11px] font-bold text-teal-700 truncate">{item.docData.speciality}</p>
                        </div>
                      </div>

                      {/* what the admin can do */}
                      <div className="flex flex-wrap items-center gap-2 md:justify-end md:w-56 shrink-0">
                        {item.missed ? (
                          <MissedBadge item={item} currency={currency} />
                        ) : item.cancelled ? (
                          <span className="text-[12px] font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">Cancelled</span>
                        ) : item.isCompleted ? (
                          <button
                            onClick={() => setExpandedId(expanded ? null : item._id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 border border-teal-100 text-[13px] font-bold text-teal-800 hover:bg-teal-100"
                          >
                            <RiCheckboxCircleLine size={16} /> {expanded ? "Hide report" : "Visit report"}
                            <RiArrowDownSLine size={16} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                          </button>
                        ) : (
                          isOpen(item) && (
                            <>
                              {canMarkMissed(item) && (
                                <button
                                  onClick={() => setMissedFor(item)}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-200 text-[13px] font-bold text-orange-700 hover:bg-orange-50"
                                >
                                  <RiUserUnfollowLine size={16} /> Missed
                                </button>
                              )}
                              <button
                                onClick={() => cancel(item._id)}
                                disabled={cancelling === item._id}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 disabled:opacity-50"
                              >
                                <RiCloseCircleLine size={16} /> {cancelling === item._id ? "Cancelling…" : "Cancel"}
                              </button>
                            </>
                          )
                        )}
                      </div>
                    </div>

                    {expanded && <VisitReport item={item} />}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      <MissedAppointmentModal
        appointment={missedFor}
        role="admin"
        currency={currency}
        onClose={() => setMissedFor(null)}
        onDone={getAllAppointments}
      />
    </div>
  );
};

/** What the doctor recorded at the visit: vitals, notes, and each medicine with how much is left. */
function VisitReport({ item }: { item: Appointment }) {
  const h = item.healthData;
  const vitals = [
    ["Blood pressure", h?.bloodPressure],
    ["Heart rate", h?.heartRate],
    ["Temperature", h?.temperature],
  ].filter(([, v]) => v);
  const meds = h?.prescribedMedicines ?? [];
  return (
    <div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5 space-y-4">
      {vitals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {vitals.map(([name, value]) => (
            <span key={name} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[12px]">
              <RiHeartPulseLine size={14} className="text-rose-500" />
              <span className="text-slate-400 font-bold">{name}</span>
              <span className="font-black text-slate-800">{value}</span>
            </span>
          ))}
        </div>
      )}
      {h?.doctorNotes && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Doctor&apos;s notes</p>
          <p className="text-sm text-slate-700 whitespace-pre-line">{h.doctorNotes}</p>
        </div>
      )}
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Prescribed</p>
        {meds.length === 0 ? (
          <p className="text-sm text-slate-400">No medicines prescribed.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-2">
            {meds.map((m, i) => {
              const total = Number(m.totalQuantity) || 0;
              const left = Number(m.remainingQuantity ?? total);
              const pct = total ? Math.round(((total - left) / total) * 100) : 0;
              const every = m.frequencyType === "interval" ? `every ${m.dosagePerDay}h` : `${m.dosagePerDay}× a day`;
              return (
                <li key={i} className="bg-white border border-slate-200 rounded-2xl p-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
                      <RiMedicineBottleLine size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-sm truncate">
                        {m.name}
                        {m.overdoseAlert && <span className="ml-2 text-[10px] font-black text-rose-600">EARLY DOSE</span>}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {every} · {left} of {total} left
                      </p>
                      {m.note && <p className="text-[11px] text-slate-500 italic mt-0.5">{m.note}</p>}
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full mt-2.5 overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AllAppointments;
