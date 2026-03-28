import React, { useContext } from 'react'
import Login from './pages/Login.js'
import { Toaster } from 'sonner';
import { AppContext } from './context/AppContext.js'
import { AdminContext } from './context/AdminContext.js';
import Navbar from './components/Navbar.js';
import Sidebar from './components/Sidebar.js';
import { Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Admin/Dashboard.js';
import AddDoctor from './pages/Admin/AddDoctor.js';
import DoctorsList from './pages/Admin/DoctorsList.js';
import AllAppointments from './pages/Admin/AllAppointments.js';
import { DoctorContext } from './context/DoctorContext.js';
import DoctorDashboard from './pages/Doctor/DoctorDashboard.js';
import DoctorAppointment from './pages/Doctor/DoctorAppointment.js';
import DoctorProfile from './pages/Doctor/DoctorProfile.js';
import type { AdminContextType, DoctorContextType, AppContextType } from './types/index.js';
import LoadingBar from 'react-top-loading-bar';

const App: React.FC = () => {

  const { aToken } = useContext(AdminContext) as AdminContextType
  const { dToken } = useContext(DoctorContext) as DoctorContextType
  const { progress, setProgress } = useContext(AppContext) as AppContextType

  return aToken || dToken ? (
    <div className='bg-[#F8F9FD] min-h-screen flex flex-col'>
      {/* 1. Global Progress Bar - Strictly UI, no logic touch */}
      <LoadingBar
        color='#0D9488'
        progress={progress}
        onLoaderFinished={() => setProgress(0)}
      />
      <Toaster richColors position="top-right" />

      <Navbar />

      {/* 2. Responsive Layout Container 
          - Mobile/Tablet: flex-col (stacks vertically)
          - Large Screens (lg:): flex-row (original design)
          - Added h-full and w-full for proper tablet scaling
      */}
      <div className='flex flex-col lg:flex-row items-start flex-1 w-full'>
        <Sidebar />

        {/* Main Content Area
            - overflow-x-hidden prevents unwanted horizontal scrolling on mobile
            - p-4/sm:p-6 adds touch-friendly spacing without altering design components
        */}
        <div className='flex-1 w-full overflow-x-hidden p-4 sm:p-6 lg:p-0'>
          <Routes>
            {/* Admin Routes */}
            <Route path='/' element={<Navigate to={aToken ? '/admin-dashboard' : '/doctor-dashboard'} />} />
            <Route path='/admin-dashboard' element={<Dashboard />} />
            <Route path='/all-appointments' element={<AllAppointments />} />
            <Route path='/add-doctor' element={<AddDoctor />} />
            <Route path='/doctor-list' element={<DoctorsList />} />

            {/* Doctor Routes */}
            <Route path='/doctor-dashboard' element={<DoctorDashboard />} />
            <Route path='/doctor-appointments' element={<DoctorAppointment />} />
            <Route path='/doctor-profile' element={<DoctorProfile />} />
          </Routes>
        </div>
      </div>
    </div>
  ) : (
    <>
      <LoadingBar
        color='#0D9488'
        progress={progress}
        onLoaderFinished={() => setProgress(0)}
      />
      <Login />
      <Toaster richColors position="top-right" />
    </>
  )
}

export default App