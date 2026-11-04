"use client";

import React from 'react'
import type { DoctorsDashboardModalProps } from "../types/index"
import DoctorsPrescribeModal from './DoctorsPrescribeModal'

/** The same "complete the visit" form as the Schedule; afterwards it refreshes the dashboard instead. */
const DoctorsDashboardModal: React.FC<DoctorsDashboardModalProps> = ({ getDashData, ...props }) => (
  <DoctorsPrescribeModal {...props} getAppointments={getDashData} />
)

export default DoctorsDashboardModal
