import React, { useContext, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../Context/AppContext.js";
import type { AppContextType } from "../types/index.js";
import { motion, useScroll, useSpring } from "framer-motion";
import { RiSearchLine, RiFilter3Line } from "@remixicon/react";
import DoctorsCardGrid from "../cards/DoctorsCardGrid.js";

const specialties = [
  "General physician",
  "Gynecologist",
  "Dermatologist",
  "Pediatricians",
  "Neurologist",
  "Gastroenterologist",
];

const Doctors: React.FC = () => {
  const { speciality } = useParams<{ speciality?: string }>();
  const { doctors, loading } = useContext(AppContext) as AppContextType;
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const filteredDoctors = useMemo(
    () =>
      doctors.filter((doc) => {
        const matchesSpec = speciality ? doc.speciality === speciality : true;
        const matchesSearch = doc.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        return matchesSpec && matchesSearch;
      }),
    [doctors, speciality, searchTerm],
  );

  const handleClearFilters = () => {
    setSearchTerm("");
    navigate("/doctors");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-12 min-h-screen">
      {/* Scroll progress */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-teal-500 origin-left z-[100]"
        style={{ scaleX }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8 md:mb-12">
        <div className="max-w-xl">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 mb-2 uppercase">
            Expert{" "}
            <span className="text-teal-600 font-serif normal-case italic">
              Consultants
            </span>
          </h1>
          <p className="text-slate-500 text-sm font-medium leading-relaxed hidden sm:block">
            Find a certified specialist. Filter by department or search by name.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80 group">
          <RiSearchLine
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors"
          />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-5 focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500 transition-all outline-none text-slate-700 text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Mobile filter toggle */}
      <button
        onClick={() => setShowFilters((p) => !p)}
        className="sm:hidden flex items-center gap-2 mb-4 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm w-full justify-center"
      >
        <RiFilter3Line size={14} className="text-teal-600" />
        {speciality ? `Dept: ${speciality}` : "Filter by Department"}
      </button>

      <div className="flex flex-col lg:flex-row gap-6 md:gap-10">
        {/* Sidebar — hidden on mobile unless toggled, always visible on lg */}
        <aside
          className={`w-full lg:w-60 shrink-0 ${showFilters ? "block" : "hidden"} lg:block`}
        >
          <div className="lg:sticky lg:top-28">
            <div className="flex items-center gap-2 mb-3 md:mb-5 px-1">
              <RiFilter3Line size={15} className="text-teal-600" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">
                Department
              </p>
            </div>

            {/* Mobile: horizontal scroll pills. Desktop: vertical list */}
            <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
              <button
                onClick={() => {
                  navigate("/doctors");
                  setShowFilters(false);
                }}
                className={`whitespace-nowrap text-left px-4 md:px-5 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl transition-all border text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                  !speciality
                    ? "bg-slate-900 text-white border-slate-900 shadow-md"
                    : "bg-white border-slate-100 text-slate-500 hover:border-teal-400 hover:text-teal-600"
                }`}
              >
                All Specialists
              </button>
              {specialties.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    speciality === cat
                      ? navigate("/doctors")
                      : navigate(`/doctors/${cat}`);
                    setShowFilters(false);
                  }}
                  className={`whitespace-nowrap text-left px-4 md:px-5 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl transition-all border text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    speciality === cat
                      ? "bg-teal-600 text-white border-teal-600 shadow-md"
                      : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-teal-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Grid */}
        <main className="flex-1 min-w-0">
          <DoctorsCardGrid
            filteredDoctors={filteredDoctors}
            handleClearFilters={handleClearFilters}
          />
        </main>
      </div>
    </div>
  );
};

export default Doctors;
