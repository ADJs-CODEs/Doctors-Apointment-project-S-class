import { createContext, } from "react";
import type { ReactNode } from "react";
import type { AppContextType } from "../types/index.js";

export const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppContextProviderProps {
    children: ReactNode;
}

const AppContextProvider = ({ children }: AppContextProviderProps) => {

    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

    const calculateAge = (dob: string): number => {
        const today = new Date();
        const birthDate = new Date(dob);

        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const months: string[] = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

    const slotDateFormat = (slotDate: string): string => {
        if (!slotDate) return "";
        const dateArray = slotDate.split('_');
        // dateArray[1] is the month index from your string format "DD_MM_YYYY"
        return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2];
    };

    const currency = '$';

    const value: AppContextType = {
        backendUrl,
        calculateAge,
        slotDateFormat,
        currency
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export default AppContextProvider;