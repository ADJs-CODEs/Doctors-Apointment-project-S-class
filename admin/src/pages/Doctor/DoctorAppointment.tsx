import React from "react"
import {
  RiHistoryLine, RiCheckboxCircleFill, RiCloseCircleFill
} from "@remixicon/react"
import useDoctorAppointment from '../../hooks/useDoctorAppointment.js'
import DoctorsAdherenceView from "../../layout/DoctorsAdherenceView.js"
import DoctorsAppointmentModal from "../../Modal/DoctorsAppointmentModal.js"
import DoctorsPrescribeModal from "../../Modal/DoctorsPrescribeModal.js"


const DoctorAppointment: React.FC = () => {
  const { appointments, setExpandedId, expandedId, calculateAge, currency, slotDateFormat, setProgress, cancelAppointment, setSelectedApptId,
    setShowModal, setShowAlertModal, getAdherenceStats, alertForm, setAlertForm, showAlertModal, isSendingAlert, handleSendAlert, showModal,
    resetForm, vitals, setVitals, setMedicines, medicines, completeAppointment, getAppointments, selectedApptId,
  } = useDoctorAppointment()

  const sortedAppointments = appointments ? [...appointments].sort((a, b) => {
    const aCritical = a.patientStatus === 'Critical' || a.healthData?.prescribedMedicines?.some(m => m.overdoseAlert);
    const bCritical = b.patientStatus === 'Critical' || b.healthData?.prescribedMedicines?.some(m => m.overdoseAlert);
    if (aCritical && !bCritical) return -1;
    if (!aCritical && bCritical) return 1;
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;
    return 0;
  }) : [];


  return (
    <div className='w-full max-w-6xl m-2 sm:m-5 animate-reveal'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4'>
        <p className='text-xl sm:text-2xl font-bold text-gray-800'>Patient Management</p>
        <div className='flex gap-2'>
          <span className='flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full'>● CRITICAL</span>
          <span className='flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full'>● ACTIVE</span>
        </div>
      </div>

      <div className='bg-white border rounded-2xl text-sm max-h-[80vh] overflow-y-auto shadow-sm custom-scrollbar'>
        <div className='hidden lg:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 py-4 px-6 border-b bg-gray-50 text-gray-600 font-bold sticky top-0 z-20'>
          <p>#</p><p>Patient</p><p>Payment</p><p>Age</p><p>Date & Time</p><p>Fees</p><p className='text-center'>Action</p>
        </div>

        {sortedAppointments.map((item, index) => {
          const isCritical = item.patientStatus === 'Critical' || item.healthData?.prescribedMedicines?.some(m => m.overdoseAlert);

          return (
            <React.Fragment key={item._id || index}>
              <div
                onClick={() => item.isCompleted && setExpandedId(expandedId === item._id ? null : item._id)}
                className={`flex flex-col lg:grid lg:grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-3 lg:gap-1 items-start lg:items-center text-gray-500 py-5 lg:py-4 px-4 sm:px-6 border-b hover:bg-blue-50/30 transition-all cursor-pointer relative
                ${isCritical ? 'bg-red-50/50 border-l-4 border-l-red-500' : ''} 
                ${item.isCompleted ? 'opacity-90' : ''} 
                ${expandedId === item._id ? 'bg-blue-50/50' : ''}`}
              >
                <p className='hidden lg:block font-medium text-xs'>{index + 1}</p>

                <div className='flex items-center gap-3 w-full lg:w-auto'>
                  <div className='relative'>
                    <img className='w-12 h-12 lg:w-10 lg:h-10 rounded-full border bg-gray-100 object-cover' src={item.userData.image} alt="" />
                    {isCritical && <div className='absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse' />}
                  </div>
                  <div className='flex-1'>
                    <p className={`font-bold text-base lg:text-sm ${isCritical ? 'text-red-600' : 'text-gray-900'}`}>{item.userData.name}</p>
                    <p className='lg:hidden text-xs text-gray-500'>{calculateAge(item.userData.dob)} Years • {item.payment ? 'Online' : 'Cash'}</p>
                    {item.isCompleted && (
                      <p className='text-[9px] text-teal-600 font-black flex items-center gap-1 uppercase tracking-tighter mt-1'>
                        <RiHistoryLine size={10} /> {expandedId === item._id ? 'Close Details' : 'View Adherence'}
                      </p>
                    )}
                  </div>
                  <div className='lg:hidden font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-lg'>{currency}{item.amount}</div>
                </div>

                <div className='hidden lg:block'>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${item.payment ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                    {item.payment ? 'ONLINE' : 'CASH'}
                  </span>
                </div>

                <p className='hidden lg:block font-medium'>{calculateAge(item.userData.dob)} Years</p>

                <div className='flex flex-row lg:flex-col items-center lg:items-start gap-2 lg:gap-0 w-full lg:w-auto border-t lg:border-none pt-2 lg:pt-0'>
                  <p className='font-semibold text-gray-700 text-xs sm:text-sm'>{slotDateFormat(item.slotDate)}</p>
                  <span className='lg:hidden text-gray-300'>|</span>
                  <p className='text-xs opacity-70'>{item.slotTime}</p>
                </div>

                <p className='hidden lg:block font-bold text-gray-800'>{currency}{item.amount}</p>

                <div className='flex lg:justify-center w-full lg:w-auto mt-2 lg:mt-0'>
                  {item.cancelled ? <p className='text-red-400 text-[10px] font-black uppercase bg-red-50 px-3 py-1 rounded-full'>Cancelled</p> :
                    item.isCompleted ? <p className='text-emerald-500 text-[10px] font-black uppercase bg-emerald-50 px-3 py-1 rounded-full'>Completed</p> :
                      <div className='flex items-center gap-4 lg:gap-2 w-full lg:w-auto'>
                        {/* Cancel Button */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setProgress(40);
                            await cancelAppointment(item._id);
                            setProgress(100);
                          }}
                          className='flex-1 lg:flex-none flex justify-center items-center bg-red-50 hover:bg-red-100 border border-red-100 p-2.5 lg:p-2 rounded-xl lg:rounded-full active:scale-90 transition-all group'
                          title="Cancel Appointment"
                        >
                          <RiCloseCircleFill className="text-red-500 group-hover:text-red-600 size-6 lg:size-5" />
                          <span className='lg:hidden ml-2 font-bold text-red-600 text-xs'>Cancel</span>
                        </button>

                        {/* Complete/Consult Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApptId(item._id);
                            setShowModal(true);
                          }}
                          className='flex-1 lg:flex-none flex justify-center items-center bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 p-2.5 lg:p-2 rounded-xl lg:rounded-full active:scale-90 transition-all group'
                          title="Mark Complete"
                        >
                          <RiCheckboxCircleFill className="text-emerald-500 group-hover:text-emerald-600 size-6 lg:size-5" />
                          <span className='lg:hidden ml-2 font-bold text-emerald-600 text-xs'>Consult</span>
                        </button>
                      </div>}
                </div>
              </div>

              {/* Expanded Adherence View */}
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
      </div>

      {/* --- ALERT MODAL --- */}
      <DoctorsAppointmentModal
        showAlertModal={showAlertModal}
        alertForm={alertForm}
        setAlertForm={setAlertForm}
        isSendingAlert={isSendingAlert}
        handleSendAlert={handleSendAlert}
        setShowAlertModal={setShowAlertModal}
      />

      {/* --- PRESCRIBE MODAL --- */}
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
  )
}

export default DoctorAppointment;