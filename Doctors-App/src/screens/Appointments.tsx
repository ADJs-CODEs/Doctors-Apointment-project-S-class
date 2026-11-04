"use client";

import React, { useCallback, useContext, useEffect, useState } from "react";
import PayAppointmentModal from "../components/patient/PayAppointmentModal";
import { useParams, useNavigate, useSearchParams } from "@/lib/navigation";
import { AppContext } from "../Context/AppContext";
import RelatedDoctors from "../components/RelatedDoctors";
import ClinicMap from "../components/patient/ClinicMap";
import IconTile from "../components/brand/IconTile";
import { experienceText } from "../cards/DoctorsCardGrid";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiVerifiedBadgeFill,
  RiCalendarEventLine,
  RiTimeLine,
  RiHospitalLine,
  RiVideoOnLine,
  RiArrowRightLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import type { AppContextType, Appointment, Doctor, DoctorAvailability } from "../types/index";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPath";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Appointments: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const context = useContext(AppContext) as AppContextType;
  const { doctors, currencySymbol, token, getDoctorsData } = context;
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
      toast.warning("Log in or create an account to book");
      return navigate("/login");
    }
    const day = availability?.days[slotIndex];
    if (!slotTime || !day) return toast.info("Pick a time first");
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

  const day = availability?.days[slotIndex];
  const dayText = day
    ? new Date(`${day.iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
    : "";
  const video = kind === "video";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto py-4 md:py-8 px-4 md:px-0">
      {/* the doctor */}
      <div className="grid gap-5 md:grid-cols-[260px_minmax(0,1fr)] mb-6">
        <img
          className="w-full aspect-[4/3] md:aspect-[4/5] object-cover object-top rounded-[24px] bg-brand-soft border border-line"
          src={docInfo.image}
          alt={docInfo.name}
        />
        <div className="glass rounded-[24px] p-5 md:p-8 flex flex-col gap-4">
          <div>
            <p className="eyebrow !text-[12px] mb-1">{docInfo.speciality}</p>
            <h1 className="flex flex-wrap items-center gap-2 text-[30px] md:text-[38px] leading-[1.05] font-extrabold tracking-[-0.035em] text-ink">
              {docInfo.name}
              <RiVerifiedBadgeFill className="text-brand shrink-0" size={24} aria-label="Verified doctor" />
            </h1>
            <p className="text-[15px] text-ink-3 mt-1.5">
              {[docInfo.degree, experienceText(docInfo.experience)].filter(Boolean).join(" · ")}
            </p>
          </div>
          {docInfo.about && <p className="text-[16px] text-ink-2 leading-relaxed">{docInfo.about}</p>}
          <div className="flex flex-wrap gap-2 mt-auto pt-2">
            {availability?.offersInPerson !== false && (
              <span className="inline-flex items-center gap-2 rounded-[14px] border border-line bg-white px-3.5 py-2.5">
                <RiHospitalLine size={17} className="text-brand-ink" />
                <span className="text-[14px] font-semibold text-ink-2">Clinic</span>
                <span className="num text-[16px] text-ink">
                  {currencySymbol}
                  {availability?.fees ?? docInfo.fees}
                </span>
              </span>
            )}
            {availability?.offersVideo && availability.videoFees != null && (
              <span className="inline-flex items-center gap-2 rounded-[14px] border border-line bg-white px-3.5 py-2.5">
                <RiVideoOnLine size={17} className="text-video" />
                <span className="text-[14px] font-semibold text-ink-2">Video call</span>
                <span className="num text-[16px] text-ink">
                  {currencySymbol}
                  {availability.videoFees}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* booking */}
      <section className="surface rounded-[24px] p-5 md:p-8">
        <h2 className="flex items-center gap-2.5 text-[20px] font-extrabold tracking-[-0.02em] text-ink mb-5">
          <IconTile>
            <RiCalendarEventLine size={17} />
          </IconTile>
          Book a visit
        </h2>

        {/* 1. in person or video */}
        <p className="text-[14px] font-bold text-ink mb-2">How do you want to meet?</p>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2.5 mb-7 max-w-lg" role="group" aria-label="Type of visit">
          {(
            [
              { id: "in-person", title: "At the clinic", hint: "Visit in person", icon: RiHospitalLine },
              { id: "video", title: "Video call", hint: "From your phone or computer", icon: RiVideoOnLine },
            ] as const
          ).map((o) => {
            const Icon = o.icon;
            const active = kind === o.id;
            const offered = !availability || (o.id === "video" ? availability.offersVideo : availability.offersInPerson);
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={active}
                onClick={() => setKind(o.id)}
                disabled={!offered}
                title={offered ? undefined : `This doctor doesn't offer ${o.id === "video" ? "video calls" : "clinic visits"}`}
                className={`flex items-center gap-3 text-left rounded-[16px] border-[1.5px] bg-white px-3.5 py-3 transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
                  active
                    ? o.id === "video"
                      ? "border-video shadow-[0_0_0_3px_rgba(109,40,217,.12)]"
                      : "border-brand shadow-[0_0_0_3px_rgba(14,165,164,.15)]"
                    : "border-line"
                }`}
              >
                <IconTile tone={o.id === "video" ? "video" : "brand"} size="md">
                  <Icon size={20} />
                </IconTile>
                <span>
                  <span className="block text-[15px] font-bold text-ink">{o.title}</span>
                  <span className="block text-[13px] text-ink-3">{offered ? o.hint : "Not offered"}</span>
                </span>
              </button>
            );
          })}
        </div>

        {!availability ? (
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="w-[68px] h-[84px] rounded-[18px] bg-line/70 animate-pulse" />
            ))}
          </div>
        ) : !availability.available || availability.days.length === 0 ? (
          <div className="rounded-[18px] bg-canvas border border-line px-5 py-6 text-center">
            <p className="text-[16px] font-bold text-ink">
              {!availability.available
                ? "This doctor isn't taking bookings right now"
                : `No free ${video ? "video call" : "clinic"} times in the next two weeks`}
            </p>
            <p className="text-[14px] text-ink-3 mt-1">
              Try {video ? "a clinic visit" : availability.offersVideo ? "a video call" : "another doctor"}, or message the doctor.
            </p>
          </div>
        ) : (
          <>
            {/* 2. the day */}
            <p className="text-[14px] font-bold text-ink mb-2">Pick a day</p>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 [scrollbar-width:none]">
              {availability.days.map((d, index) => {
                const on = slotIndex === index;
                return (
                  <button
                    key={d.slotDate}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setSlotIndex(index);
                      setSlotTime("");
                    }}
                    className={`flex flex-col items-center justify-center min-w-[68px] py-3.5 rounded-[18px] border transition-[transform,background] shrink-0 ${
                      on ? "btn-ink -translate-y-0.5" : "bg-white border-line text-ink-2 hover:border-brand"
                    }`}
                  >
                    <span className={`text-[12px] font-semibold ${on ? "text-white/75" : "text-ink-3"}`}>{DAYS[d.weekday]}</span>
                    <span className="num text-[20px] leading-tight">{Number(d.slotDate.split("_")[0])}</span>
                    <span className={`text-[12px] font-semibold ${on ? "text-white/75" : "text-ink-3"}`}>
                      {new Date(`${d.iso}T12:00:00`).toLocaleDateString("en-GB", { month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 3. the time */}
            <p className="text-[14px] font-bold text-ink mt-6 mb-2">Pick a time</p>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence mode="wait">
                {day?.slots.map((time) => {
                  const on = time === slotTime;
                  return (
                    <motion.button
                      key={`${slotIndex}-${time}`}
                      type="button"
                      aria-pressed={on}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setSlotTime(time)}
                      className={`num inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[12px] text-[14px] border transition-colors ${
                        on
                          ? video
                            ? "text-white border-violet-800 bg-[linear-gradient(180deg,#8B5CF6,#6D28D9)] shadow-[inset_0_1px_0_rgba(255,255,255,.22),0_6px_14px_rgba(109,40,217,.25)]"
                            : "btn-teal"
                          : "bg-white text-ink-2 border-line hover:border-brand"
                      }`}
                    >
                      <RiTimeLine size={14} className="shrink-0" />
                      {time}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* summary + pay */}
            <div className="mt-7 pt-5 border-t border-line flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 min-w-0">
                {slotTime ? (
                  <p className="text-[16px] text-ink">
                    <b>{video ? "Video call" : "Clinic visit"}</b> on {dayText} at <span className="num">{slotTime}</span>
                  </p>
                ) : (
                  <p className="text-[16px] text-ink-3">Pick a time to continue.</p>
                )}
                <p className="flex items-start gap-1.5 text-[13px] text-ink-3 mt-1">
                  <RiShieldCheckLine size={15} className="text-brand-ink shrink-0 mt-0.5" />
                  <span>
                    Your time is held for 30 minutes while you pay from your wallet or by card; it&apos;s only booked once paid.
                    {video && " You'll join from your Appointments page; it opens 10 minutes before."}
                  </span>
                </p>
              </div>
              <button type="button" onClick={bookAppointment} disabled={holding || !slotTime} className="btn btn-ink shrink-0">
                {holding ? (
                  "Holding your time…"
                ) : (
                  <>
                    Continue to payment
                    {fee != null && (
                      <span className="num">
                        · {currencySymbol}
                        {fee}
                      </span>
                    )}
                    <RiArrowRightLine size={18} />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </section>

      {/* where the clinic is (Google Maps; can be switched off in Settings) */}
      {!video && (
        <div className="mt-6">
          <ClinicMap docId={docInfo._id} address={docInfo.address} name={docInfo.name} />
        </div>
      )}

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

      <div className="mt-14 md:mt-20">
        <RelatedDoctors docId={docId || ""} speciality={docInfo.speciality} />
      </div>
    </motion.div>
  );
};

export default Appointments;
