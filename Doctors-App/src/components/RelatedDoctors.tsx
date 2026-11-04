"use client";

import React, { useContext, useMemo } from 'react';
import { AppContext } from '../Context/AppContext';
import DoctorsCardGrid from '../cards/DoctorsCardGrid';
import type { AppContextType } from '../types/index';

interface RelatedDoctorsProps {
  speciality: string;
  docId: string;
}

/** Other doctors in the same speciality, as the same cards the doctors list uses. */
const RelatedDoctors: React.FC<RelatedDoctorsProps> = ({ speciality, docId }) => {
  const { doctors } = useContext(AppContext) as AppContextType;
  const related = useMemo(
    () => doctors.filter((doc) => doc.speciality === speciality && doc._id !== docId).slice(0, 3),
    [doctors, speciality, docId],
  );

  if (!related.length) return null;

  return (
    <section>
      <p className='eyebrow mb-1.5'>Also in {speciality}</p>
      <h2 className='text-[28px] md:text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink mb-6'>
        Other doctors you could see
      </h2>
      <DoctorsCardGrid filteredDoctors={related} handleClearFilters={() => {}} />
    </section>
  );
};

export default RelatedDoctors;
