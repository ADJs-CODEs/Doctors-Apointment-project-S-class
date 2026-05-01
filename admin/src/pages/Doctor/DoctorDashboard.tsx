import React, { useContext, useEffect, useState } from 'react'
import { DoctorContext } from '../../context/DoctorContext.js'
import { AppContext } from '../../context/AppContext.js'
import { assets } from '../../assets/assets/assets_admin/assets.js'
import type { DoctorContextType, AppContextType, Appointment, Medicine } from '../../types/index.js'
import {
  RiErrorWarningFill, RiCheckboxCircleFill, RiCloseCircleFill
} from "@remixicon/react"
import DoctorsDashboardModal from '../../Modal/DoctorsDashboardModal.js'

const DoctorDashboard: React.FC = () => {
  const { dToken, dashData, getDashData, completeAppointment, cancelAppointment } = useContext(DoctorContext) as DoctorContextType
  const { currency, slotDateFormat, setProgress } = useContext(AppContext) as AppContextType

  // --- Modal States ---
  const [showModal, setShowModal] = useState(false)
  const [selectedApptId, setSelectedApptId] = useState('')
  const [vitals, setVitals] = useState({ bloodPressure: '', heartRate: '', temperature: '', notes: '' })
  const [medicines, setMedicines] = useState<Medicine[]>([{
    name: '',
    frequencyType: 'daily',
    frequencyValue: 1,
    totalQuantity: 7,
    status: 'Active',
    remainingQuantity: 7,
    lastTaken: ''
  }])

  useEffect(() => {
    let isMounted = true;



    const loadDashboard = async () => {
      if (!dToken) return;
      try {
        setProgress(20);

        setTimeout(() => isMounted && setProgress(45), 150);
        await getDashData();

        if (isMounted) {
          setProgress(100);
          setTimeout(() => isMounted && setProgress(0), 600)
        }
      } catch (error) {
        console.error("Dashboard load error:", error);
        setProgress(0);
      }
    };
    loadDashboard();
    return () => { isMounted = false; };

  }, [dToken, getDashData, setProgress])

  const resetForm = () => {
    setVitals({ bloodPressure: '', heartRate: '', temperature: '', notes: '' })
    setMedicines([{ name: '', frequencyType: 'daily', frequencyValue: 1, totalQuantity: 7, status: 'Active', remainingQuantity: 7, lastTaken: '' }])
    setShowModal(false)
    setSelectedApptId('')
  }

  const handleCancel = async (id: string) => {
    setProgress(30)
    await cancelAppointment(id)
    setProgress(100)
  }

  if (!dashData) return null;

  const latestBookings = dashData.latestAppointments || dashData.latestAppointment || [];

  return (
    <div className='m-2 sm:m-5 space-y-6 animate-reveal'>
      {/* --- Stats Grid --- */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        <div className='bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform'>
          <div className='p-3 bg-emerald-50 rounded-xl'><img className='w-8' src={assets.earning_icon} alt="" /></div>
          <div>
            <p className='text-xl sm:text-2xl font-bold text-gray-800'>{currency} {dashData.earnings}</p>
            <p className='text-[10px] sm:text-sm text-gray-400 font-medium uppercase tracking-wider'>Total Earnings</p>
          </div>
        </div>

        <div className='bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform'>
          <div className='p-3 bg-blue-50 rounded-xl'><img className='w-8' src={assets.appointments_icon} alt="" /></div>
          <div>
            <p className='text-xl sm:text-2xl font-bold text-gray-800'>{dashData.appointments}</p>
            <p className='text-[10px] sm:text-sm text-gray-400 font-medium uppercase tracking-wider'>Total Bookings</p>
          </div>
        </div>

        <div className='bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 sm:col-span-2 lg:col-span-1 active:scale-[0.98] transition-transform'>
          <div className='p-3 bg-purple-50 rounded-xl'><img className='w-8' src={assets.patients_icon} alt="" /></div>
          <div>
            <p className='text-xl sm:text-2xl font-bold text-gray-800'>{dashData.patients}</p>
            <p className='text-[10px] sm:text-sm text-gray-400 font-medium uppercase tracking-wider'>Unique Patients</p>
          </div>
        </div>
      </div>

      {/* --- Latest Bookings Table --- */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-5 border-b border-gray-50 bg-gray-50/50 gap-3'>
          <div className='flex items-center gap-3'>
            <img className='w-5' src={assets.list_icon} alt="" />
            <p className='font-bold text-gray-700'>Latest Bookings</p>
          </div>
          <div className='flex items-center gap-2 bg-white sm:bg-transparent p-2 sm:p-0 rounded-lg'>
            <span className='w-2 h-2 bg-red-500 rounded-full animate-pulse'></span>
            <p className='text-[9px] sm:text-[10px] font-bold text-red-500 uppercase'>Urgent Attention Required</p>
          </div>
        </div>

        <div className='divide-y divide-gray-50 overflow-x-auto'>
          {latestBookings.length > 0 ? (
            latestBookings.map((item: Appointment, index: number) => {
              const isUrgent = item.patientStatus === 'Critical' ||
                item.healthData?.prescribedMedicines?.some(m => m.overdoseAlert);

              return (
                <div className={`flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-gray-50/80 transition-colors min-w-[320px] ${isUrgent ? 'bg-red-50/40' : ''}`} key={index}>
                  <div className='flex items-center gap-3'>
                    <div className='relative'>
                      <img className='rounded-full w-10 h-10 sm:w-12 sm:h-12 object-cover border-2 border-white shadow-sm' src={item.userData.image} alt="" />
                      {isUrgent && (
                        <div className='absolute -top-1 -right-1 text-red-500 bg-white rounded-full'>
                          <RiErrorWarningFill size={16} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className={`text-sm sm:text-base font-semibold ${isUrgent ? 'text-red-700' : 'text-gray-900'}`}>{item.userData.name}</p>
                      <p className='text-[10px] sm:text-xs text-gray-500'>{slotDateFormat(item.slotDate)} at {item.slotTime}</p>
                    </div>
                  </div>

                  <div className='flex items-center gap-2 sm:gap-3'>
                    {item.cancelled ? (
                      <span className='px-2 py-1 rounded-full bg-red-50 text-red-500 text-[9px] sm:text-xs font-bold uppercase'>Cancelled</span>
                    ) : item.isCompleted ? (
                      <span className='px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] sm:text-xs font-bold uppercase'>Completed</span>
                    ) : (
                      <div className='flex items-center gap-3 lg:gap-2 w-full lg:w-auto'>
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
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className='p-10 text-center text-gray-400 font-medium'>No recent bookings to show.</div>
          )}
        </div>
      </div>

      {/* --- Dashboard Modal --- */}
      <DoctorsDashboardModal
        showModal={showModal}
        resetForm={resetForm}
        vitals={vitals}
        setVitals={setVitals}
        setMedicines={setMedicines}
        medicines={medicines}
        completeAppointment={completeAppointment}
        getDashData={getDashData}
        setProgress={setProgress}
        selectedApptId={selectedApptId}
      />
    </div>
  )
}

export default DoctorDashboard