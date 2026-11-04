"use client";

import React, { useContext, useMemo, useState } from "react";
import { useNavigate, useParams } from "@/lib/navigation";
import { AppContext } from "../Context/AppContext";
import type { AppContextType } from "../types/index";
import { RiSearchLine, RiHospitalLine, RiVideoOnLine } from "@remixicon/react";
import DoctorsCardGrid, { offersClinic, offersVideo } from "../cards/DoctorsCardGrid";

const specialties = [
  "General physician",
  "Gynecologist",
  "Dermatologist",
  "Pediatricians",
  "Neurologist",
  "Gastroenterologist",
];

type Visit = "any" | "clinic" | "video";

const chip = (on: boolean) =>
  `shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[14px] font-semibold border transition-colors ${
    on ? "bg-ink text-white border-ink" : "bg-white/80 text-ink-2 border-line hover:border-brand hover:text-brand-ink"
  }`;

const Doctors: React.FC = () => {
  const { speciality } = useParams<{ speciality?: string }>();
  const { doctors } = useContext(AppContext) as AppContextType;
  const [searchTerm, setSearchTerm] = useState("");
  const [visit, setVisit] = useState<Visit>("any");
  const navigate = useNavigate();

  const filteredDoctors = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return doctors.filter((doc) => {
      if (speciality && doc.speciality !== speciality) return false;
      if (q && !doc.name.toLowerCase().includes(q) && !doc.speciality.toLowerCase().includes(q)) return false;
      if (visit === "video" && !offersVideo(doc)) return false;
      if (visit === "clinic" && !offersClinic(doc)) return false;
      return true;
    });
  }, [doctors, speciality, searchTerm, visit]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setVisit("any");
    navigate("/doctors");
  };

  return (
    <div className="max-w-[1180px] mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-6">
        <div className="max-w-xl">
          <p className="eyebrow mb-2">Your doctors</p>
          <h1 className="text-[36px] md:text-[48px] leading-[1.02] font-extrabold tracking-[-0.035em] text-ink">
            See a specialist your way.
          </h1>
          <p className="text-[16px] text-ink-2 mt-3">
            Pick a doctor, then choose a clinic visit or a video call. You only see times they&apos;re really free.
          </p>
        </div>
        <label className="relative w-full md:w-80">
          <span className="sr-only">Search doctors</span>
          <RiSearchLine size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            placeholder="Search by name or speciality"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="field !pl-11 !bg-white/90"
          />
        </label>
      </div>

      {/* filters: one row, scrolls sideways on small screens */}
      <div className="glass rounded-[20px] p-2.5 mb-8 flex flex-col lg:flex-row lg:items-start gap-2.5">
        <div className="flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible [scrollbar-width:none] min-w-0 flex-1" role="group" aria-label="Speciality">
          <button type="button" className={chip(!speciality)} aria-pressed={!speciality} onClick={() => navigate("/doctors")}>
            All specialities
          </button>
          {specialties.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={speciality === cat}
              className={chip(speciality === cat)}
              onClick={() => navigate(speciality === cat ? "/doctors" : `/doctors/${cat}`)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-2 shrink-0 pt-2.5 border-t lg:pt-0 lg:border-t-0 lg:pl-3 lg:border-l border-line" role="group" aria-label="Type of visit">
          <button type="button" className={chip(visit === "any")} aria-pressed={visit === "any"} onClick={() => setVisit("any")}>
            Any visit
          </button>
          <button type="button" className={chip(visit === "clinic")} aria-pressed={visit === "clinic"} onClick={() => setVisit("clinic")}>
            <RiHospitalLine size={15} /> Clinic
          </button>
          <button type="button" className={chip(visit === "video")} aria-pressed={visit === "video"} onClick={() => setVisit("video")}>
            <RiVideoOnLine size={15} /> Video
          </button>
        </div>
      </div>

      <DoctorsCardGrid filteredDoctors={filteredDoctors} handleClearFilters={handleClearFilters} />
    </div>
  );
};

export default Doctors;
