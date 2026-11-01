"use client";

import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../Context/AppContext';
import { toast } from 'sonner';
import { API_PATHS } from '../utils/apiPath';
import axiosInstance from '../utils/axiosInstance';
import type { AppContextType, Appointment } from '../types/index';

export const useMyAppointments = () => {
  const context = useContext(AppContext) as AppContextType;
  const { token, setProgress } = context;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingMed, setProcessingMed] = useState<string | null>(null);
  const [expandedTrackers, setExpandedTrackers] = useState<{ [key: string]: boolean }>({});

  // State to track which Health Trackers are expanded
  const toggleTracker = (id: string) => {
    setExpandedTrackers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getUserAppointments = async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.USER.FETCH_APPOINTMENT);
      if (data.success) {
        setAppointments(data.appointments.reverse());
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const { data } = await axiosInstance.post(API_PATHS.USER.CANCEL_APPOINTMENT, { appointmentId });
      if (data.success) {
        toast.success(data.message);
        getUserAppointments();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
    }
  };

  useEffect(() => {
    if (token) getUserAppointments();
  }, [token]);

  return {
    appointments,
    loading,
    processingMed,
    setProcessingMed,
    expandedTrackers,
    toggleTracker,
    cancelAppointment,
    getUserAppointments
  };
};