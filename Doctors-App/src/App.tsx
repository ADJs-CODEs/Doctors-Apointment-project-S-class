import React, { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home.js'
import Doctors from './pages/Doctors.js'
import Login from './pages/Login.js'
import About from './pages/About.js'
import Contact from './pages/Contact.js'
import MyProfile from './pages/MyProfile.js'
import MyAppointments from './pages/MyAppointments.js'
import Appointments from './pages/Appointments.js'
import Navbar from './components/Navbar.js'
import Footer from './components/Footer.js'
import { Toaster } from 'sonner'
import LoadingBar from 'react-top-loading-bar'
import Verify from './pages/Verify.js'
import MedHistory from './pages/MedHistory.js'
import AccountSettings from './pages/AccountSetting.js'
import ForgotPassword from './pages/ForgotPassword.js'
import ResetPassword from './pages/ResetPassword.js'

const App: React.FC = () => {

  const [progress, setProgress] = useState<number>(0)

  return (
    <div className='mx-4 sm:mx-[10%]'>
      <LoadingBar
        color='#5f6FFF' // Matching your primary theme color
        progress={progress}
        onLoaderFinished={() => setProgress(0)}
      />

      <Toaster position="top-right" richColors expand={false} />

      <Navbar />

      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/doctors' element={<Doctors />} />
        <Route path='/doctors/:speciality' element={<Doctors />} />
        <Route path='/login' element={<Login />} />
        <Route path='/about' element={<About />} />
        <Route path='/contact' element={<Contact />} />
        <Route path='/my-profile' element={<MyProfile />} />
        <Route path='/my-appointments' element={<MyAppointments />} />
        <Route path='/appointments/:docId' element={<Appointments />} />
        <Route path='/verify' element={<Verify />} />
        <Route path='/medication-history' element={<MedHistory />} />
        <Route path='/account-settings' element={<AccountSettings />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/reset-password/:token' element={<ResetPassword />} />
      </Routes>

      <Footer />
    </div>
  )
}

export default App