import React, { useContext } from 'react'
import Login from './pages/Login.js'
import { Toaster } from 'sonner';
import { AppContext } from './context/AppContext.js'
import { AdminContext } from './context/AdminContext.js';
import Navbar from './components/Navbar.js';
import Sidebar from './components/Sidebar.js';
import { Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Admin/Dashboard.js';
import AddDoctor from './pages/Admin/AddDoctor.js';
import DoctorsList from './pages/Admin/DoctorsList.js';
import AllAppointments from './pages/Admin/AllAppointments.js';
import { DoctorContext } from './context/DoctorContext.js';
import DoctorDashboard from './pages/Doctor/DoctorDashboard.js';
import DoctorAppointment from './pages/Doctor/DoctorAppointment.js';
import DoctorProfile from './pages/Doctor/DoctorProfile.js';
import type { AdminContextType, DoctorContextType } from './types/index.js';

const App: React.FC = () => {

  const { aToken } = useContext(AdminContext) as AdminContextType
  const { dToken } = useContext(DoctorContext) as DoctorContextType

  return aToken || dToken ? (
    <div className='bg-[#F8F9FD]'>
      <Toaster richColors position="top-right" />
      <Navbar />
      <div className='flex items-start'>
        <Sidebar />
        <Routes>
          {/* Admin Routes */}
          <Route path='/' element={<></>} />
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
  ) : (
    <>
      <Login />
      <Toaster richColors position="top-right" />
    </>
  )
}

export default App