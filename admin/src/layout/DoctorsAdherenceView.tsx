"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Appointment } from "../types/index";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiHeartLine,
  RiHeartPulseLine,
  RiSendPlaneFill,
  RiTempHotLine,
  RiTimeLine,
} from "@remixicon/react";
import { toast } from "sonner";
import axiosInstance from "../utils/axiosInstance";
import { useNavigate } from "@/lib/navigation";

interface DoctorsAdherenceViewProps {
  item: Appointment;
  expandedId: string | null;
  setSelectedApptId: Dispatch<SetStateAction<string>>;
  setShowAlertModal: Dispatch<SetStateAction<boolean>>;
  getAdherenceStats: (med: any) => { rate: number };
}

const DoctorsAdherenceView = ({
  item,
  expandedId,
  setSelectedApptId,
  setShowAlertModal,
  getAdherenceStats,
}: DoctorsAdherenceViewProps) => {
  const navigate = useNavigate();
  return (
    <AnimatePresence>
      {expandedId === item._id && item.healthData && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-canvas/60 overflow-hidden border-t border-line"
        >
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
              <p className="text-[15px] font-bold text-ink sm:mr-auto">How it&apos;s going since the visit</p>
              {/* alerts now go through the chat (tick "Urgent" there) */}
              <button
                onClick={() => navigate(`/doctor-messages?patient=${item.userId}&appointment=${item._id}`)}
                className="btn btn-ink w-full sm:w-auto !py-2 !px-4 !text-[13px] !rounded-xl"
              >
                <RiSendPlaneFill size={14} /> Message patient
              </button>
              <button
                onClick={() => {
                  const condition = window.prompt(
                    "What condition is the patient fighting?",
                  );
                  const story = window.prompt(
                    "Write a brief message about this patient (shown to the community):",
                  );
                  if (condition && story) {
                    axiosInstance
                      .post("/api/wish-well/nominate", {
                        patientId: item.userId,
                        condition,
                        story,
                      })
                      .then(({ data }) => {
                        if (data.success)
                          toast.success("Patient added to Wish Well");
                        else toast.error(data.message);
                      })
                      .catch(() => toast.error("Failed to add patient"));
                  }
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-line bg-white text-[13px] font-bold text-ink-2 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
              >
                <RiHeartLine size={15} /> Put forward for the Wish Well
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  {
                    label: "Blood pressure",
                    value: item.healthData.bloodPressure,
                    icon: <RiHeartPulseLine size={16} />,
                    color: "text-rose-500",
                  },
                  {
                    label: "Pulse",
                    value: item.healthData.heartRate,
                    icon: <RiTimeLine size={16} />,
                    color: "text-blue-500",
                  },
                  {
                    label: "Temperature",
                    value: item.healthData.temperature + "°C",
                    icon: <RiTempHotLine size={16} />,
                    color: "text-teal-500",
                  },
                ].map((vital, vIdx) => (
                  <div
                    key={vIdx}
                    className="bg-white p-3 sm:p-4 rounded-2xl border border-line text-center"
                  >
                    <div className={`${vital.color} flex justify-center mb-1`}>
                      {vital.icon}
                    </div>
                    <p className="num text-[15px] text-ink">
                      {vital.value || "--"}
                    </p>
                    <p className="text-[12px] font-semibold text-ink-3 mt-0.5">
                      {vital.label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-3 sm:space-y-4">
                {item.healthData.prescribedMedicines?.map(
                  (med: any, mIdx: number) => {
                    const stats = getAdherenceStats(med);
                    return (
                      <div
                        key={mIdx}
                        className={`bg-white p-3 sm:p-4 rounded-2xl border ${med.overdoseAlert ? "border-rose-300 bg-rose-50/30" : "border-line"}`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-bold text-[14px] text-ink">
                            {med.name}
                          </p>
                          <p className="num text-[13px] text-brand-ink" title="Doses taken on time">
                            {stats.rate}%
                          </p>
                        </div>
                        <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
                          <div
                            className={`h-full ${med.overdoseAlert ? "bg-red-500" : "bg-teal-500"}`}
                            style={{ width: `${stats.rate}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DoctorsAdherenceView;
