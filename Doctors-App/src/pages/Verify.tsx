import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppContext } from "../Context/AppContext.js";
import { toast } from "sonner";
import type { AppContextType } from "../types/index.js";
import axiosInstance from "../utils/axiosInstance.js";
import { API_PATHS } from "../utils/apiPath.js";
import { motion } from "framer-motion";
import {
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiLoader4Line,
  RiShieldCheckFill,
} from "@remixicon/react";

const Verify: React.FC = () => {
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success");
  const appointmentId = searchParams.get("appointmentId");

  const context = useContext(AppContext) as AppContextType;
  const { token, setProgress } = context;
  const navigate = useNavigate();

  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    "loading",
  );

  const verifyStripe = async () => {
    try {
      if (success === "false" || !success) {
        setStatus("failed");
        setTimeout(() => navigate("/my-appointments"), 2500);
        return;
      }
      setProgress(40);
      const { data } = await axiosInstance.post(API_PATHS.AUTH.VERIFY_STRIPE, {
        success,
        appointmentId,
      });
      setProgress(80);
      if (data.success) {
        setStatus("success");
        toast.success(data.message || "Payment Confirmed!");
        setTimeout(() => navigate("/my-appointments"), 2000);
      } else {
        setStatus("failed");
        toast.error(data.message || "Payment failed");
        setTimeout(() => navigate("/"), 2500);
      }
    } catch (error: any) {
      setStatus("failed");
      toast.error(error.message);
      setTimeout(() => navigate("/"), 2500);
    } finally {
      setProgress(100);
    }
  };

  useEffect(() => {
    if (token && appointmentId) verifyStripe();
  }, [token]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-slate-100 rounded-[40px] p-12 md:p-16 shadow-sm flex flex-col items-center text-center max-w-sm w-full"
      >
        {/* Logo */}
        <div className="w-14 h-14 bg-teal-50 rounded-full border-2 border-dotted border-teal-200 flex items-center justify-center mb-8">
          <span className="text-teal-600 font-black text-2xl leading-none">
            +
          </span>
        </div>

        <AnimatedIcon status={status} />

        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-6 mb-2">
          {status === "loading" && "Securing Payment"}
          {status === "success" && "Payment Confirmed"}
          {status === "failed" && "Payment Failed"}
        </h2>
        <p className="text-slate-400 text-xs font-medium leading-relaxed">
          {status === "loading" &&
            "Verifying your transaction with Stripe — please wait."}
          {status === "success" &&
            "Your appointment is booked. Redirecting to your appointments..."}
          {status === "failed" &&
            "Something went wrong. Redirecting you back now..."}
        </p>

        {status !== "loading" && (
          <button
            onClick={() => navigate("/my-appointments")}
            className="mt-8 px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-teal-600 transition-all active:scale-95"
          >
            View Appointments
          </button>
        )}
      </motion.div>
    </div>
  );
};

const AnimatedIcon: React.FC<{ status: "loading" | "success" | "failed" }> = ({
  status,
}) => {
  if (status === "loading")
    return (
      <div className="w-16 h-16 rounded-full bg-slate-50 border-2 border-teal-100 flex items-center justify-center">
        <RiLoader4Line size={28} className="text-teal-500 animate-spin" />
      </div>
    );
  if (status === "success")
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 12 }}
        className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center"
      >
        <RiCheckboxCircleFill size={36} className="text-teal-500" />
      </motion.div>
    );
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", damping: 12 }}
      className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center"
    >
      <RiCloseCircleFill size={36} className="text-red-400" />
    </motion.div>
  );
};

export default Verify;
