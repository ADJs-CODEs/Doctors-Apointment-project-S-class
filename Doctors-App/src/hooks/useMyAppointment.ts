import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../Context/AppContext.js';
import { toast } from 'sonner';
import { API_PATHS } from '../utils/apiPath.js';
import axiosInstance from '../utils/axiosInstance.js';
import type { AppContextType, Appointment } from '../types/index.js';

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
      setProgress(20);
      const { data } = await axiosInstance.get(API_PATHS.USER.FETCH_APPOINTMENT);
      setProgress(70);
      if (data.success) {
        setAppointments(data.appointments.reverse());
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      setProgress(40);
      const { data } = await axiosInstance.post(API_PATHS.USER.CANCEL_APPOINTMENT, { appointmentId });
      if (data.success) {
        toast.success(data.message);
        getUserAppointments();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProgress(100);
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