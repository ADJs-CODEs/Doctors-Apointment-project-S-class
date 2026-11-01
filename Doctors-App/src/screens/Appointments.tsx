"use client";

import React, { useCallback, useContext, useEffect, useState } from "react";
import PayAppointmentModal from "../components/patient/PayAppointmentModal";
import { useParams, useNavigate, useSearchParams } from "@/lib/navigation";
import { AppContext } from "../Context/AppContext";
import RelatedDoctors from "../components/RelatedDoctors";
import ClinicMap from "../components/patient/ClinicMap";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiVerifiedBadgeFill,
  RiInformationLine,
  RiMoneyDollarCircleLine,
  RiCalendarEventLine,
  RiTimeLine,
  RiHospitalLine,
  RiVideoChatLine,
} from "@remixicon/react";
import type { AppContextType, Appointment, Doctor, DoctorAvailability } from "../types/index";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPath";

const Appointments: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const context = useContext(AppContext) as AppContextType;
  const { doctors, currencySymbol, token, getDoctorsData } = context;
  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const navigate = useNavigate();

  const [docInfo, setDocInfo] = useState<Doctor | null>(null);
  const [slotIndex, setSlotIndex] = useState(0);
  const [slotTime, setSlotTime] = useState("");
  // in person or by video; "Schedule video call" in Messages opens this with ?type=video
  const [params] = useSearchParams();
  const [kind, setKind] = useState<"in-person" | "video">(params.get("type") === "video" ? "video" : "in-person");

  const fetchDocInfo = () => {
    const info = doctors.find((doc) => doc._id === docId);
    if (info) setDocInfo(info);
  };

  // the doctor's real free times for this kind of visit, worked out by the server from
  // their hours, days off and existing bookings
  const [availability, setAvailability] = useState<DoctorAvailability | null>(null);
  const loadSlots = useCallback(async () => {
    if (!docId) return;
    try {
      const { data } = await axiosInstance.get(API_PATHS.AVAILABILITY(docId, kind), { silent: true } as any);
      if (data.success) {
        setAvailability(data);
        setSlotIndex(0);
        setSlotTime("");
      }
    } catch {
      toast.error("Couldn't load this doctor's times");
    }
  }, [docId, kind]);

  // after picking a time it's held, then paid for in the payment window
  const [holding, setHolding] = useState(false);
  const [held, setHeld] = useState<Appointment | null>(null);

  const bookAppointment = async () => {
    if (!token) {
      toast.warning("Please login to continue");
      return navigate("/login");
    }
    const day = availability?.days[slotIndex];
    if (!slotTime || !day) return toast.info("Please select a time");
    setHolding(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.USER.BOOK_APPOINTMENT, {
        docId,
        slotDate: day.slotDate,
        slotTime,
        kind,
      });
      if (data.success) {
        setHeld(data.appointment);
      } else {
        toast.error(data.message);
        loadSlots();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Booking failed. Try again.");
      loadSlots(); // someone may have just taken it
    } finally {
      setHolding(false);
    }
  };

  useEffect(() => {
    fetchDocInfo();
  }, [doctors, docId]);
  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const fee = kind === "video" ? availability?.videoFees : availability?.fees ?? docInfo?.fees;

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
                {availability?.fees ?? docInfo.fees}
                <span className="text-[11px] font-bold text-slate-400 ml-1">at the clinic</span>
              </p>
              {availability?.offersVideo && availability.videoFees != null && (
                <p className="text-sm font-black text-violet-700">
                  {currencySymbol}
                  {availability.videoFees}
                  <span className="text-[11px] font-bold text-violet-400 ml-1">video call</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Where the clinic is (Google Maps; can be switched off in Settings) */}
      <div className="mb-8 md:mb-12">
        <ClinicMap docId={docInfo._id} address={docInfo.address} name={docInfo.name} />
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

        {/* In person or video */}
        <div className="grid grid-cols-2 gap-2 md:gap-3 mb-6 md:mb-8 max-w-md">
          {(
            [
              { id: "in-person", title: "At the clinic", hint: "Visit in person", icon: RiHospitalLine },
              { id: "video", title: "Video call", hint: "From your phone or computer", icon: RiVideoChatLine },
            ] as const
          ).map((o) => {
            const Icon = o.icon;
            const active = kind === o.id;
            const offered = !availability || (o.id === "video" ? availability.offersVideo : availability.offersInPerson);
            return (
              <button
                key={o.id}
                onClick={() => setKind(o.id)}
                disabled={!offered}
                title={offered ? undefined : `This doctor doesn't offer ${o.id === "video" ? "video calls" : "clinic visits"}`}
                className={`flex items-center gap-3 text-left rounded-2xl border px-3 md:px-4 py-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  active
                    ? o.id === "video"
                      ? "border-violet-400 bg-violet-50 ring-2 ring-violet-100"
                      : "border-teal-400 bg-teal-50 ring-2 ring-teal-100"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Icon size={22} className={active ? (o.id === "video" ? "text-violet-600" : "text-teal-600") : "text-slate-400"} />
                <span>
                  <span className="block text-sm font-black text-slate-900">{o.title}</span>
                  <span className="block text-[11px] text-slate-500">{offered ? o.hint : "Not offered"}</span>
                </span>
              </button>
            );
          })}
        </div>

        {!availability ? (
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="w-16 md:w-[76px] h-20 rounded-[20px] bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : !availability.available || availability.days.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-5 py-6 text-center">
            <p className="font-black text-slate-800">
              {!availability.available
                ? "This doctor isn't taking bookings right now"
                : `No free ${kind === "video" ? "video call" : "clinic"} times in the next two weeks`}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Try {kind === "video" ? "a clinic visit" : availability.offersVideo ? "a video call" : "another doctor"}, or message the doctor.
            </p>
          </div>
        ) : (
          <>
            {/* Date selector */}
            <div className="flex gap-2 md:gap-3 overflow-x-auto pb-3 no-scrollbar">
              {availability.days.map((day, index) => (
                <button
                  key={day.slotDate}
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
                  <span className="text-[8px] md:text-[9px] font-black mb-1 opacity-60">{daysOfWeek[day.weekday]}</span>
                  <span className="text-base md:text-lg font-black">{Number(day.slotDate.split("_")[0])}</span>
                  <span className="text-[8px] md:text-[9px] font-bold opacity-50">
                    {new Date(`${day.iso}T12:00:00`).toLocaleDateString("en-GB", { month: "short" })}
                  </span>
                </button>
              ))}
            </div>

            {/* Time selector */}
            <div className="flex flex-wrap gap-2 mt-6 md:mt-8">
              <AnimatePresence mode="wait">
                {availability.days[slotIndex]?.slots.map((time) => (
                  <motion.button
                    key={`${slotIndex}-${time}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setSlotTime(time)}
                    className={`flex items-center gap-1.5 px-4 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all ${
                      time === slotTime
                        ? kind === "video"
                          ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                          : "bg-teal-500 text-white shadow-lg shadow-teal-500/20"
                        : "bg-white text-slate-500 border border-slate-100 hover:border-teal-300"
                    }`}
                  >
                    <RiTimeLine size={11} className="shrink-0" />
                    {time}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={bookAppointment}
              disabled={holding || !slotTime}
              className="mt-8 md:mt-10 w-full md:w-auto px-10 md:px-14 py-4 md:py-5 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-[2px] text-[10px] md:text-[11px] shadow-lg hover:bg-teal-600 transition-all disabled:opacity-50"
            >
              {holding ? "Holding your time…" : `Continue to payment${fee != null ? ` · ${currencySymbol}${fee}` : ""}`}
            </motion.button>
            <p className="text-[12px] text-slate-500 mt-3">
              Your time is held for 30 minutes while you pay; it&apos;s only booked once paid.
              {kind === "video" && " You'll join the video call from your Appointments page; it opens 10 minutes before."}
            </p>
          </>
        )}
      </div>

      {/* pay for the held time: wallet or card */}
      <PayAppointmentModal
        appointment={held}
        onClose={() => {
          setHeld(null);
          // still held for a while: they can finish paying from Appointments
          navigate("/my-appointments");
        }}
        onPaid={() => {
          getDoctorsData();
          navigate("/my-appointments");
        }}
      />

      {/* Related */}
      <div className="mt-16 md:mt-28">
        <RelatedDoctors docId={docId || ""} speciality={docInfo.speciality} />
      </div>
    </motion.div>
  );
};

export default Appointments;
