import { createContext, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { DoctorContextType, Appointment, Doctor, ProviderProps } from "../types/index.js";
import axiosInstance from "../utils/axiosInstance.js";
import { API_PATHS } from "../utils/apiPath.js";

export const DoctorContext = createContext<DoctorContextType | undefined>(undefined);

const DoctorContextProvider = ({ children }: ProviderProps) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // --- State Management ---
    const [dToken, setDToken] = useState<string>(localStorage.getItem('dToken') ?? '');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [dashData, setDashData] = useState<any>(false);
    const [profileData, setProfileData] = useState<Doctor | false>(false);

    // --- API Functions ---

    const getAppointments = async () => {
        try {
            const { data } = await axiosInstance.get(API_PATHS.DOCTOR.GET_APPOINTMENTS);
            if (data.success) {
                setAppointments(data.appointments.reverse());
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const cancelAppointment = async (appointmentId: string) => {
        try {
            const { data } = await axiosInstance.post(API_PATHS.DOCTOR.CANCEL_APPOINTMENT,
                { appointmentId }
            );
            if (data.success) {
                toast.success(data.message);
                getAppointments();
                getDashData();
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const getDashData = useCallback(async () => {
        try {
            const { data } = await axiosInstance.get(API_PATHS.DOCTOR.DASHBOARD);
            if (data.success) {
                setDashData(data.dashData);
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
        }
    }, [dToken])

    const getProfileData = async () => {
        try {
            const { data } = await axiosInstance.get(API_PATHS.DOCTOR.PROFILE);
            if (data.success) {
                setProfileData(data.profileData);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const updateProfile = async (updateData: any): Promise<boolean> => {
        try {
            const { data } = await axiosInstance.post(API_PATHS.DOCTOR.UPDATE_PROFILE,
                updateData);
            if (data.success) {
                toast.success(data.message);
                getProfileData();
                return true;
            } else {
                toast.error(data.message);
                return false;
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
            return false;
        }
    };

    const completeAppointment = async (appointmentId: string, healthData: any): Promise<boolean> => {
        try {
            const { data } = await axiosInstance.post(API_PATHS.DOCTOR.COMPLETE_APPOINTMENT,
                { appointmentId, healthData },
            );

            if (data.success) {
                toast.success(data.message);
                await getAppointments();
                await getDashData();
                return true;
            } else {
                toast.error(data.message);
                return false;
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
            return false;
        }
    };

    // --- FIXED: The missing sendAlert function ---
    const sendAlert = async (appointmentId: string, messageContent: string, isCritical: boolean): Promise<boolean> => {
        try {
            const { data } = await axiosInstance.post(API_PATHS.DOCTOR.SEND_ALERT,
                { appointmentId, messageContent, isCritical }
            );

            if (data.success) {
                toast.success(data.message);
                await getAppointments();
                await getDashData();
                return true;
            } else {
                toast.error(data.message);
                return false;
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
            return false;
        }
    };

    // --- Side Effects ---
    useEffect(() => {
        if (dToken) {
            localStorage.setItem('dToken', dToken);
            getAppointments();
            getDashData();
            getProfileData();
        } else {
            localStorage.removeItem('dToken');
            setAppointments([]);
            setDashData(false);
            setProfileData(false);
        }
    }, [dToken]);

    const value: DoctorContextType = {
        dToken,
        setDToken,
        backendUrl,
        appointments,
        setAppointments,
        getAppointments,
        cancelAppointment,
        completeAppointment,
        dashData,
        setDashData,
        getDashData,
        profileData,
        setProfileData,
        getProfileData,
        updateProfile,
        sendAlert
    };

    return (
        <DoctorContext.Provider value={value}>
            {children}
        </DoctorContext.Provider>
    );
};

export default DoctorContextProvider;