import React from "react";
import {
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiHistoryLine,
  RiErrorWarningFill,
  RiCalendarCheckLine,
} from "@remixicon/react";
import useDoctorAppointment from "../../hooks/useDoctorAppointment.js";
import DoctorsAdherenceView from "../../layout/DoctorsAdherenceView.js";
import DoctorsAppointmentModal from "../../Modal/DoctorsAppointmentModal.js";
import DoctorsPrescribeModal from "../../Modal/DoctorsPrescribeModal.js";

const DoctorAppointment: React.FC = () => {
  const {
    appointments,
    setExpandedId,
    expandedId,
    calculateAge,
    currency,
    slotDateFormat,
    setProgress,
    cancelAppointment,
    setSelectedApptId,
    setShowModal,
    setShowAlertModal,
    getAdherenceStats,
    alertForm,
    setAlertForm,
    showAlertModal,
    isSendingAlert,
    handleSendAlert,
    showModal,
    resetForm,
    vitals,
    setVitals,
    setMedicines,
    medicines,
    completeAppointment,
    getAppointments,
    selectedApptId,
  } = useDoctorAppointment();

  const sortedAppointments = appointments
    ? [...appointments].sort((a, b) => {
        // 1. Critical patients first
        const aCritical =
          a.patientStatus === "Critical" ||
          a.healthData?.prescribedMedicines?.some((m) => m.overdoseAlert);
        const bCritical =
          b.patientStatus === "Critical" ||
          b.healthData?.prescribedMedicines?.some((m) => m.overdoseAlert);
        if (aCritical && !bCritical) return -1;
        if (!aCritical && bCritical) return 1;

        // 2. Active (not completed, not cancelled) next
        const aActive = !a.isCompleted && !a.cancelled;
        const bActive = !b.isCompleted && !b.cancelled;
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;

        // 3. Unpaid before paid within active
        if (aActive && bActive) {
          if (!a.payment && b.payment) return -1;
          if (a.payment && !b.payment) return 1;
        }

        // 4. Newest first by date
        return b.date - a.date;
      })
    : [];

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen animate-reveal">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 md:mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
                <RiCalendarCheckLine size={20} />
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-slate-900">
                Patient{" "}
                <span className="text-teal-500 font-serif italic normal-case">
                  Schedule
                </span>
              </h1>
            </div>
            <p className="text-slate-400 text-xs font-medium ml-12">
              Manage consultations, prescriptions, and patient alerts.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="flex items-center gap-1.5 text-[9px] font-black text-red-500 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />{" "}
              Critical
            </span>
            <span className="flex items-center gap-1.5 text-[9px] font-black text-teal-600 bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Active
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[32px] sm:rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          {/* Desktop header */}
          <div className="hidden lg:grid grid-cols-[0.5fr_2.5fr_1fr_1fr_2.5fr_1fr_1fr] items-center py-5 px-8 bg-slate-900 text-white">
            {[
              "#",
              "Patient",
              "Payment",
              "Age",
              "Date & Time",
              "Fee",
              "Action",
            ].map((h, i) => (
              <p
                key={i}
                className={`text-[10px] font-black uppercase tracking-widest opacity-50 ${i === 6 ? "text-center" : ""}`}
              >
                {h}
              </p>
            ))}
          </div>

          <div className="divide-y divide-slate-50 max-h-[75vh] overflow-y-auto">
            {sortedAppointments.map((item, index) => {
              const isCritical =
                item.patientStatus === "Critical" ||
                item.healthData?.prescribedMedicines?.some(
                  (m) => m.overdoseAlert,
                );

              return (
                <React.Fragment key={item._id || index}>
                  <div
                    onClick={() =>
                      item.isCompleted &&
                      setExpandedId(expandedId === item._id ? null : item._id)
                    }
                    className={`flex flex-col lg:grid lg:grid-cols-[0.5fr_2.5fr_1fr_1fr_2.5fr_1fr_1fr] gap-3 lg:gap-1 items-start lg:items-center py-5 px-5 sm:px-6 lg:px-8 hover:bg-slate-50/80 transition-all cursor-pointer ${
                      isCritical
                        ? "bg-red-50/40 border-l-4 border-l-red-500"
                        : ""
                    } ${expandedId === item._id ? "bg-slate-50" : ""}`}
                  >
                    <p className="hidden lg:block text-xs font-black text-slate-300">
                      {String(index + 1).padStart(2, "0")}
                    </p>

                    {/* Patient */}
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                      <div className="relative shrink-0">
                        <img
                          className="w-11 h-11 rounded-2xl object-cover border-2 border-white shadow-sm bg-slate-100"
                          src={item.userData.image}
                          alt=""
                        />
                        {isCritical && (
                          <div className="absolute -top-1 -right-1 text-red-500 bg-white rounded-full">
                            <RiErrorWarningFill size={14} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-black text-sm truncate ${isCritical ? "text-red-700" : "text-slate-900"}`}
                        >
                          {item.userData.name}
                        </p>
                        <p className="lg:hidden text-[10px] text-slate-400 font-bold">
                          {calculateAge(item.userData.dob)} yrs ·{" "}
                          {item.payment ? "Paid" : "Cash"}
                        </p>
                        {item.isCompleted && (
                          <p className="text-[9px] text-teal-600 font-black flex items-center gap-1 uppercase tracking-tighter mt-0.5">
                            <RiHistoryLine size={9} />{" "}
                            {expandedId === item._id
                              ? "Close"
                              : "View adherence"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Payment */}
                    <div className="hidden lg:block">
                      <span
                        className={`text-[9px] font-black px-3 py-1 rounded-full border ${
                          item.payment
                            ? "bg-teal-50 text-teal-600 border-teal-100"
                            : "bg-amber-50 text-amber-600 border-amber-100"
                        }`}
                      >
                        {item.payment ? "ONLINE" : "CASH"}
                      </span>
                    </div>

                    <p className="hidden lg:block text-sm font-bold text-slate-600">
                      {calculateAge(item.userData.dob)} yrs
                    </p>

                    {/* Schedule */}
                    <div className="flex items-center gap-3 w-full lg:w-auto border-t lg:border-none pt-2 lg:pt-0 border-slate-50">
                      <div>
                        <p className="font-black text-sm text-slate-800">
                          {slotDateFormat(item.slotDate)}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                          {item.slotTime}
                        </p>
                      </div>
                    </div>

                    <p className="hidden lg:block text-sm font-black text-slate-900">
                      {currency}
                      {item.amount}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center lg:justify-center gap-2 w-full lg:w-auto mt-1 lg:mt-0">
                      {item.cancelled ? (
                        <span className="text-[9px] font-black uppercase bg-red-50 text-red-400 border border-red-100 px-3 py-1.5 rounded-full">
                          Cancelled
                        </span>
                      ) : item.isCompleted ? (
                        <span className="text-[9px] font-black uppercase bg-teal-50 text-teal-600 border border-teal-100 px-3 py-1.5 rounded-full">
                          Completed
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 w-full lg:w-auto">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setProgress(40);
                              await cancelAppointment(item._id);
                              setProgress(100);
                            }}
                            className="flex-1 lg:flex-none flex justify-center items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-100 px-3 py-2.5 lg:p-2 rounded-xl lg:rounded-full active:scale-90 transition-all group"
                          >
                            <RiCloseCircleFill className="text-red-400 group-hover:text-red-600 size-5" />
                            <span className="lg:hidden text-xs font-black text-red-500">
                              Cancel
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApptId(item._id);
                              setShowModal(true);
                            }}
                            className="flex-1 lg:flex-none flex justify-center items-center gap-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-100 px-3 py-2.5 lg:p-2 rounded-xl lg:rounded-full active:scale-90 transition-all group"
                          >
                            <RiCheckboxCircleFill className="text-teal-500 group-hover:text-teal-700 size-5" />
                            <span className="lg:hidden text-xs font-black text-teal-600">
                              Consult
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Adherence expanded view */}
                  <DoctorsAdherenceView
                    item={item}
                    expandedId={expandedId}
                    setSelectedApptId={setSelectedApptId}
                    setShowAlertModal={setShowAlertModal}
                    getAdherenceStats={getAdherenceStats}
                  />
                </React.Fragment>
              );
            })}

            {sortedAppointments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                  <RiCalendarCheckLine size={24} />
                </div>
                <p className="font-black text-slate-900">No appointments yet</p>
                <p className="text-slate-400 text-sm font-medium mt-1">
                  Scheduled consultations will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <DoctorsAppointmentModal
        showAlertModal={showAlertModal}
        alertForm={alertForm}
        setAlertForm={setAlertForm}
        isSendingAlert={isSendingAlert}
        handleSendAlert={handleSendAlert}
        setShowAlertModal={setShowAlertModal}
      />
      <DoctorsPrescribeModal
        showModal={showModal}
        resetForm={resetForm}
        vitals={vitals}
        setVitals={setVitals}
        setMedicines={setMedicines}
        medicines={medicines}
        completeAppointment={completeAppointment}
        getAppointments={getAppointments}
        setProgress={setProgress}
        selectedApptId={selectedApptId}
      />
    </div>
  );
};

export default DoctorAppointment;
