import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import type { DoctorContextType, Appointment, Doctor, ProviderProps } from "../types/index.js";

export const DoctorContext = createContext<DoctorContextType | undefined>(undefined);

const DoctorContextProvider = ({ children }: ProviderProps) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const [dToken, setDToken] = useState<string>(localStorage.getItem('dToken') ?? '');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [dashData, setDashData] = useState<any>(false);
    const [profileData, setProfileData] = useState<Doctor | false>(false);

    const getAppointments = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/doctor/appointments', {
                headers: { dtoken: dToken }
            });
            if (data.success) {
                setAppointments(data.appointments.reverse());
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const completeAppointment = async (appointmentId: string) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/doctor/complete-appointment',
                { appointmentId },
                { headers: { dtoken: dToken } }
            );
            if (data.success) {
                toast.success(data.message);
                getAppointments();
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const cancelAppointment = async (appointmentId: string) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/doctor/cancel-appointment',
                { appointmentId },
                { headers: { dtoken: dToken } }
            );
            if (data.success) {
                toast.success(data.message);
                getAppointments();
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const getDashData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/doctor/dashboard', {
                headers: { dtoken: dToken }
            });
            if (data.success) {
                setDashData(data.dashData);
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const getProfileData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/doctor/profile', {
                headers: { dtoken: dToken }
            });
            if (data.success) {
                setProfileData(data.profileData);
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const updateProfile = async (updateData: any): Promise<boolean> => {
        try {
            const { data } = await axios.post(backendUrl + '/api/doctor/update-profile',
                updateData,
                { headers: { dtoken: dToken } }
            );
            if (data.success) {
                toast.success(data.message);
                getProfileData();
                return true;
            } else {
                toast.error(data.message);
                return false;
            }
        } catch (error: any) {
            toast.error(error.message);
            return false;
        }
    };

    useEffect(() => {
        if (dToken) {
            localStorage.setItem('dToken', dToken);
        } else {
            localStorage.removeItem('dToken');
        }
    }, [dToken]);

    const value: DoctorContextType = {
        dToken, setDToken, backendUrl,
        appointments, setAppointments, getAppointments,
        cancelAppointment, completeAppointment, dashData,
        setDashData, getDashData, profileData, setProfileData,
        getProfileData, updateProfile
    };

    return (
        <DoctorContext.Provider value={value}>
            {children}
        </DoctorContext.Provider>
    );
};

export default DoctorContextProvider;