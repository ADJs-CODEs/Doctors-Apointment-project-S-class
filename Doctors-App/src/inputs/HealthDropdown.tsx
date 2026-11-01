"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  RiMessage3Line,
  RiHeartPulseLine,
  RiDashboardLine,
  RiTempHotLine,
  RiCapsuleLine,
  RiArrowRightSLine,
  RiArrowRightLine,
} from "@remixicon/react";
import { describeSchedule } from "../utils/medicationUtils";
import { useMessages } from "../Context/MessagesContext";
import MessageDoctorButton from "../components/patient/MessageDoctorButton";
import { medicineState } from "../utils/patientRecords";
import type { HealthDropdownProps } from "../types/index";

/**
 * The report for one finished visit: the doctor's note, the vitals taken, and what was
 * prescribed. Doses are logged on the Medications tab, so medicines here only link there.
 */
const HealthDropdown: React.FC<HealthDropdownProps> = ({
  isCritical,
  item,
  latestMessage,
  openMedications,
}) => {
  const medicines = item.healthData?.prescribedMedicines ?? [];
  const { unread, urgentUnread } = useMessages().forDoctor(item.docId);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div
        className={`rounded-[32px] border bg-white p-5 md:p-8 space-y-6 ${isCritical ? "border-red-200" : "border-slate-100"}`}
      >
        {/* conversation with the doctor, in place of the old one-way instructions */}
        <div
          className={`p-4 md:p-5 rounded-2xl border-l-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
            urgentUnread ? "bg-red-50 border-red-500" : "bg-slate-50 border-teal-500"
          }`}
        >
          <div className="flex gap-3 items-start flex-1 min-w-0">
            <RiMessage3Line
              size={20}
              className={`${urgentUnread ? "text-red-500" : "text-teal-600"} mt-0.5 shrink-0`}
            />
            <div className="min-w-0">
              <p
                className={`text-[10px] font-black uppercase tracking-[2px] mb-1 ${urgentUnread ? "text-red-600" : "text-teal-700"}`}
              >
                {urgentUnread
                  ? `Urgent message from ${item.docData?.name ?? "your doctor"}`
                  : unread
                    ? `${unread} unread message${unread > 1 ? "s" : ""}`
                    : `Chat with ${item.docData?.name ?? "your doctor"}`}
              </p>
              <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                {latestMessage
                  ? `“${latestMessage.content}”`
                  : "Questions about this visit or your medicines? Send your doctor a message."}
              </p>
            </div>
          </div>
          <MessageDoctorButton
            doctorId={item.docId}
            appointmentId={item._id}
            label={latestMessage ? "Open chat" : "Message doctor"}
            className="shrink-0"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: <RiHeartPulseLine className="text-rose-500" size={20} />,
              label: "Heart rate",
              value: item.healthData?.heartRate,
              unit: "BPM",
            },
            {
              icon: <RiDashboardLine className="text-blue-500" size={20} />,
              label: "Blood pressure",
              value: item.healthData?.bloodPressure,
              unit: "mmHg",
            },
            {
              icon: <RiTempHotLine className="text-orange-500" size={20} />,
              label: "Temperature",
              value: item.healthData?.temperature,
              unit: "°C",
            },
          ].map((v) => (
            <div key={v.label} className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
                {v.icon}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {v.label}
                </p>
                <p className="text-lg font-black text-slate-900">
                  {v.value || "--"}{" "}
                  <span className="text-[11px] font-medium text-slate-400">
                    {v.value ? v.unit : ""}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {item.healthData?.doctorNotes && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 mb-2">
              Visit notes
            </p>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {item.healthData.doctorNotes}
            </p>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[2px] text-slate-400">
              <RiCapsuleLine size={14} className="text-teal-600" />
              Prescribed this visit
            </p>
            {medicines.length > 0 && (
              <button
                onClick={() => openMedications(item._id)}
                className="flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-700"
              >
                Log doses in Medications <RiArrowRightLine size={14} />
              </button>
            )}
          </div>

          {medicines.length ? (
            <ul className="rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
              {medicines.map((med) => {
                const kind = medicineState(item, med).kind;
                const label = kind === "finished" ? "Finished" : kind === "lapsed" ? "Stopped" : "Active";
                const finished = kind === "finished" || kind === "lapsed";
                return (
                  <li key={med.name}>
                    <button
                      onClick={() => openMedications(item._id, med.name)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 capitalize truncate">{med.name}</p>
                        <p className="text-[12px] text-slate-400">{describeSchedule(med)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            finished ? "bg-slate-100 text-slate-500" : "bg-teal-50 text-teal-700"
                          }`}
                        >
                          {label}
                        </span>
                        <RiArrowRightSLine size={18} className="text-slate-300" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Nothing was prescribed at this visit.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default HealthDropdown;
