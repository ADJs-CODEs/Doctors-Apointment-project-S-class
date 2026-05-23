import React, { useContext } from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home.js";
import Doctors from "./pages/Doctors.js";
import Login from "./pages/Login.js";
import About from "./pages/About.js";
import Contact from "./pages/Contact.js";
import MyProfile from "./pages/MyProfile.js";
import MyAppointments from "./pages/MyAppointments.js";
import Appointments from "./pages/Appointments.js";
import Navbar from "./components/Navbar.js";
import Footer from "./components/Footer.js";
import { Toaster } from "sonner";
import LoadingBar from "react-top-loading-bar";
import Verify from "./pages/Verify.js";
import MedHistory from "./pages/MedHistory.js";
import AccountSettings from "./pages/AccountSetting.js";
import ForgotPassword from "./pages/ForgotPassword.js";
import ResetPassword from "./pages/ResetPassword.js";
import { AppContext } from "./Context/AppContext.js";
import type { AppContextType } from "./types/index.js";
import ChatBot from "./components/ChatBot.js";

const App: React.FC = () => {
  console.log(import.meta.env.VITE_BACKEND_URL);
  // Pull the progress state from your Context so it actually moves!
  const { progress, setProgress } = useContext(AppContext) as AppContextType;

  return (
    <div className="px-2 sm:px-0 sm:mx-[10%] min-h-screen flex flex-col">
      <LoadingBar
        color="#14b8a6" // Changed to match your Teal branding
        progress={progress}
        onLoaderFinished={() => setProgress(0)}
        height={3}
      />

      <Toaster position="top-right" richColors expand={false} />

      <Navbar />
      <main className="grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/doctors/:speciality" element={<Doctors />} />
          <Route path="/login" element={<Login />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/my-profile" element={<MyProfile />} />
          <Route path="/my-appointments" element={<MyAppointments />} />
          <Route path="/appointments/:docId" element={<Appointments />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/medication-history" element={<MedHistory />} />
          <Route path="/account-settings" element={<AccountSettings />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Routes>
      </main>

      <Footer />
      <ChatBot />
    </div>
  );
};

export default App;
