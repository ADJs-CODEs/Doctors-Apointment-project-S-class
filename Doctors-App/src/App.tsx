import React, { useContext } from 'react'
import { Route, Routes } from 'react-router-dom'
// ... (your existing imports)
import { AppContext } from './Context/AppContext.js';
import type { AppContextType } from './types/index.js';
import LoadingBar from 'react-top-loading-bar';

const App: React.FC = () => {
  // Pull the progress state from your Context so it actually moves!
  const { progress, setProgress } = useContext(AppContext) as AppContextType;

  return (
    /* CHANGE: Updated the container classes. 
       - Removed mx-4 (too much for small phones).
       - Added px-2 (slight breathing room for mobile).
       - kept sm:mx-[10%] for desktop elegance.
    */
    <div className='px-2 sm:px-0 sm:mx-[10%] min-h-screen flex flex-col'>
      <LoadingBar
        color='#14b8a6' // Changed to match your Teal branding
        progress={progress}
        onLoaderFinished={() => setProgress(0)}
        height={3}
      />

      <Toaster position="top-right" richColors expand={false} />

      <Navbar />

      {/* Wrapping Routes in a main tag helps with layout consistency */}
      <main className='flex-grow'>
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
      </main>

      <Footer />
    </div>
  )
}

export default App