import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../Context/AppContext.js";
import RelatedDoctors from "../components/RelatedDoctors.js";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiVerifiedBadgeFill,
  RiInformationLine,
  RiMoneyDollarCircleLine,
  RiCalendarEventLine,
  RiTimeLine,
} from "@remixicon/react";
import type { AppContextType, Doctor } from "../types/index.js";
import axiosInstance from "../utils/axiosInstance.js";
import { API_PATHS } from "../utils/apiPath.js";

interface Slot {
  datetime: Date;
  time: string;
}

const Appointments: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const context = useContext(AppContext) as AppContextType;
  const { doctors, currencySymbol, token, getDoctorsData } = context;
  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const navigate = useNavigate();

  const [docInfo, setDocInfo] = useState<Doctor | null>(null);
  const [docSlots, setDocSlots] = useState<Slot[][]>([]);
  const [slotIndex, setSlotIndex] = useState(0);
  const [slotTime, setSlotTime] = useState("");

  const fetchDocInfo = () => {
    const info = doctors.find((doc) => doc._id === docId);
    if (info) setDocInfo(info);
  };

  const getAvailableSlots = () => {
    if (!docInfo) return;
    setDocSlots([]);
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      const endTime = new Date(currentDate);
      endTime.setHours(21, 0, 0, 0);
      if (today.getDate() === currentDate.getDate()) {
        currentDate.setHours(
          currentDate.getHours() > 10 ? currentDate.getHours() + 1 : 10,
        );
        currentDate.setMinutes(currentDate.getMinutes() > 30 ? 30 : 0);
      } else {
        currentDate.setHours(10);
        currentDate.setMinutes(0);
      }
      const timeSlots: Slot[] = [];
      while (currentDate < endTime) {
        const formattedTime = currentDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        const day = currentDate.getDate(),
          month = currentDate.getMonth() + 1,
          year = currentDate.getFullYear();
        const slotDate = `${day}_${month}_${year}`;
        if (!docInfo.slots_booked?.[slotDate]?.includes(formattedTime)) {
          timeSlots.push({
            datetime: new Date(currentDate),
            time: formattedTime,
          });
        }
        currentDate.setMinutes(currentDate.getMinutes() + 30);
      }
      if (timeSlots.length > 0) setDocSlots((prev) => [...prev, timeSlots]);
    }
  };

  const bookAppointment = async () => {
    if (!token) {
      toast.warning("Please login to continue");
      return navigate("/login");
    }
    if (!slotTime) return toast.info("Please select a time slot");
    const date = docSlots[slotIndex]?.[0]?.datetime;
    if (!date) return toast.error("No slots available");
    try {
      const slotDate = `${date.getDate()}_${date.getMonth() + 1}_${date.getFullYear()}`;
      const { data } = await axiosInstance.post(
        API_PATHS.USER.BOOK_APPOINTMENT,
        { docId, slotDate, slotTime },
      );
      if (data.success) {
        toast.success(data.message);
        getDoctorsData();
        navigate("/my-appointments");
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Booking failed. Try again.",
      );
    }
  };

  useEffect(() => {
    fetchDocInfo();
  }, [doctors, docId]);
  useEffect(() => {
    getAvailableSlots();
  }, [docInfo]);

  if (!docInfo) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto py-6 md:py-12 px-4"
    >
      {/* Doctor hero */}
      <div className="flex flex-col md:flex-row gap-5 md:gap-8 mb-8 md:mb-12">
        {/* Image */}
        <div className="w-full md:w-64 shrink-0">
          <img
            className="w-full aspect-[4/3] md:aspect-[4/5] object-cover rounded-[24px] md:rounded-[36px] bg-slate-900 shadow-lg"
            src={docInfo.image}
            alt={docInfo.name}
          />
        </div>

        {/* Info card */}
        <div className="flex-1 bg-white border border-slate-100 p-5 md:p-10 rounded-[24px] md:rounded-[40px] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 blur-3xl rounded-full -mr-12 -mt-12" />

          <div className="flex flex-wrap items-start gap-2 mb-3">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-tight">
              {docInfo.name}
            </h1>
            <RiVerifiedBadgeFill
              className="text-teal-500 mt-1 shrink-0"
              size={22}
            />
          </div>

          <p className="text-[10px] font-black text-teal-600 uppercase tracking-[2px] mb-1">
            {docInfo.degree} — {docInfo.speciality}
          </p>
          <span className="inline-block text-[9px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 bg-slate-50 border border-slate-100 rounded-full mb-5">
            {docInfo.experience} Experience
          </span>

          <div className="mb-6 md:mb-8">
            <p className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-[2px] mb-2">
              <RiInformationLine size={14} className="text-teal-500" /> About
            </p>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">
              {docInfo.about}
            </p>
          </div>

          <div className="pt-5 border-t border-slate-50 flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 rounded-xl text-teal-600">
              <RiMoneyDollarCircleLine size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Consultation Fee
              </p>
              <p className="text-lg font-black text-slate-900">
                {currencySymbol}
                {docInfo.fees}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking section */}
      <div className="bg-white p-5 md:p-10 rounded-[24px] md:rounded-[40px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-6 md:mb-8">
          <RiCalendarEventLine className="text-teal-500" size={18} />
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
            Book{" "}
            <span className="text-teal-500 font-serif normal-case italic">
              Appointment
            </span>
          </h2>
        </div>

        {/* Date selector */}
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-3 no-scrollbar">
          {docSlots.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                setSlotIndex(index);
                setSlotTime("");
              }}
              className={`flex flex-col items-center justify-center min-w-[64px] md:min-w-[76px] py-4 md:py-5 rounded-[20px] md:rounded-[28px] transition-all duration-300 shrink-0 ${
                slotIndex === index
                  ? "bg-slate-900 text-white shadow-lg -translate-y-1"
                  : "bg-slate-50 text-slate-400 border border-transparent hover:border-teal-200 hover:bg-white"
              }`}
            >
              <span className="text-[8px] md:text-[9px] font-black mb-1 opacity-60">
                {item[0] && daysOfWeek[item[0].datetime.getDay()]}
              </span>
              <span className="text-base md:text-lg font-black">
                {item[0] && item[0].datetime.getDate()}
              </span>
            </button>
          ))}
        </div>

        {/* Time selector */}
        <div className="flex flex-wrap gap-2 mt-6 md:mt-8">
          <AnimatePresence mode="wait">
            {docSlots[slotIndex]?.map((item) => (
              <motion.button
                key={`${slotIndex}-${item.time}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSlotTime(item.time)}
                className={`flex items-center gap-1.5 px-4 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all ${
                  item.time === slotTime
                    ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20"
                    : "bg-white text-slate-500 border border-slate-100 hover:border-teal-300"
                }`}
              >
                <RiTimeLine size={11} className="shrink-0" />
                {item.time}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={bookAppointment}
          className="mt-8 md:mt-10 w-full md:w-auto px-10 md:px-14 py-4 md:py-5 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-[2px] text-[10px] md:text-[11px] shadow-lg hover:bg-teal-600 transition-all"
        >
          Confirm Appointment
        </motion.button>
      </div>

      {/* Related */}
      <div className="mt-16 md:mt-28">
        <RelatedDoctors docId={docId || ""} speciality={docInfo.speciality} />
      </div>
    </motion.div>
  );
};

export default Appointments;
