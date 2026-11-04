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
import IconTile from "../components/brand/IconTile";
import { medicineState } from "../utils/patientRecords";
import type { HealthDropdownProps } from "../types/index";

/**
 * The report for one finished visit: the doctor's note, the vitals taken, and what was
 * prescribed. Doses are logged on the Medications tab, so medicines here only link there.
 */
const HealthDropdown: React.FC<HealthDropdownProps> = ({ isCritical, item, latestMessage, openMedications }) => {
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
      <div className={`surface rounded-[22px] p-5 md:p-6 space-y-5 ${isCritical ? "!border-rose-200" : ""}`}>
        {/* conversation with the doctor, in place of the old one-way instructions */}
        <div
          className={`p-4 rounded-[16px] border flex flex-col sm:flex-row sm:items-center gap-4 ${
            urgentUnread ? "bg-rose-50 border-rose-200" : "bg-canvas border-line"
          }`}
        >
          <div className="flex gap-3 items-start flex-1 min-w-0">
            <IconTile tone={urgentUnread ? "rose" : "brand"}>
              <RiMessage3Line size={17} />
            </IconTile>
            <div className="min-w-0">
              <p className={`text-[14px] font-bold mb-0.5 ${urgentUnread ? "text-rose-600" : "text-ink"}`}>
                {urgentUnread
                  ? `Urgent message from ${item.docData?.name ?? "your doctor"}`
                  : unread
                    ? `${unread} unread message${unread > 1 ? "s" : ""}`
                    : `Chat with ${item.docData?.name ?? "your doctor"}`}
              </p>
              <p className="text-[14px] text-ink-2 leading-relaxed line-clamp-2">
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
            { icon: <RiHeartPulseLine className="text-rose-500" size={20} />, label: "Heart rate", value: item.healthData?.heartRate, unit: "BPM" },
            { icon: <RiDashboardLine className="text-[#3554C4]" size={20} />, label: "Blood pressure", value: item.healthData?.bloodPressure, unit: "mmHg" },
            { icon: <RiTempHotLine className="text-amber-600" size={20} />, label: "Temperature", value: item.healthData?.temperature, unit: "°C" },
          ].map((v) => (
            <div key={v.label} className="flex items-center gap-3.5 rounded-[16px] bg-canvas border border-line/70 p-4">
              <span className="w-10 h-10 rounded-xl bg-white border border-line grid place-items-center shrink-0">{v.icon}</span>
              <div>
                <p className="text-[13px] font-semibold text-ink-3">{v.label}</p>
                <p className="num text-[19px] text-ink leading-tight">
                  {v.value || "--"} <span className="text-[12px] text-ink-3">{v.value ? v.unit : ""}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {item.healthData?.doctorNotes && (
          <div>
            <p className="text-[14px] font-bold text-ink mb-1.5">Visit notes</p>
            <p className="text-[15px] text-ink-2 leading-relaxed whitespace-pre-line">{item.healthData.doctorNotes}</p>
          </div>
        )}

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="flex items-center gap-2 text-[14px] font-bold text-ink">
              <RiCapsuleLine size={16} className="text-brand-ink" />
              Prescribed this visit
            </p>
            {medicines.length > 0 && (
              <button
                type="button"
                onClick={() => openMedications(item._id)}
                className="flex items-center gap-1 text-[13px] font-bold text-brand-ink hover:underline"
              >
                Log doses in Medications <RiArrowRightLine size={15} />
              </button>
            )}
          </div>

          {medicines.length ? (
            <ul className="rounded-[16px] border border-line divide-y divide-line overflow-hidden bg-white">
              {medicines.map((med) => {
                const kind = medicineState(item, med).kind;
                const label = kind === "finished" ? "Finished" : kind === "lapsed" ? "Stopped" : "Active";
                const finished = kind === "finished" || kind === "lapsed";
                return (
                  <li key={med.name}>
                    <button
                      type="button"
                      onClick={() => openMedications(item._id, med.name)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-canvas transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-[15px] font-bold text-ink capitalize truncate">{med.name}</p>
                        <p className="text-[13px] text-ink-3">{describeSchedule(med)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${
                            finished ? "bg-canvas text-ink-3 border border-line" : "bg-brand-soft text-brand-ink"
                          }`}
                        >
                          {label}
                        </span>
                        <RiArrowRightSLine size={18} className="text-ink-3" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[15px] text-ink-3">Nothing was prescribed at this visit.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default HealthDropdown;
