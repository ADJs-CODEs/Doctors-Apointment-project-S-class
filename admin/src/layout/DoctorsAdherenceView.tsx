import type { Dispatch, SetStateAction } from "react";
import type { Appointment } from "../types/index.js";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiHeartPulseLine,
  RiSendPlaneFill,
  RiTempHotLine,
  RiTimeLine,
} from "@remixicon/react";
import { toast } from "react-hot-toast";
import axiosInstance from "../utils/axiosInstance.js";

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
  return (
    <AnimatePresence>
      {expandedId === item._id && item.healthData && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-slate-50 overflow-hidden border-b"
        >
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">
                Clinical Monitoring
              </p>
              <button
                onClick={() => {
                  setSelectedApptId(item._id);
                  setShowAlertModal(true);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-3 sm:py-2 rounded-xl text-[10px] font-black hover:bg-red-600 active:scale-95 transition-all"
              >
                <RiSendPlaneFill size={14} /> SEND PATIENT ALERT
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
                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-red-600 active:scale-95 transition-all"
              >
                ❤️ ADD TO WISH WELL
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  {
                    label: "BP",
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
                    label: "Temp",
                    value: item.healthData.temperature + "°C",
                    icon: <RiTempHotLine size={16} />,
                    color: "text-teal-500",
                  },
                ].map((vital, vIdx) => (
                  <div
                    key={vIdx}
                    className="bg-white p-3 sm:p-4 rounded-2xl border text-center shadow-sm"
                  >
                    <div className={`${vital.color} flex justify-center mb-1`}>
                      {vital.icon}
                    </div>
                    <p className="text-xs sm:text-sm font-black text-slate-800">
                      {vital.value || "--"}
                    </p>
                    <p className="text-[7px] sm:text-[8px] font-bold text-slate-400 uppercase">
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
                        className={`bg-white p-3 sm:p-4 rounded-2xl border ${med.overdoseAlert ? "border-red-500 bg-red-50/20" : "border-slate-100"}`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-bold text-[11px] sm:text-xs">
                            {med.name}
                          </p>
                          <p className="text-[10px] sm:text-[11px] font-black text-teal-500">
                            {stats.rate}%
                          </p>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
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
