"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { API_PATHS } from "../utils/apiPath";
import axiosInstance from "../utils/axiosInstance";

export type StaffRole = "owner" | "pharmacist" | "staff";

export type PharmacyStaff = {
  _id: string;
  name: string;
  email: string;
  role: StaffRole;
  pharmacistLicense?: string;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
};

export type Pharmacy = {
  _id: string;
  name: string;
  licenseNumber: string;
  email: string;
  phone: string;
  address: { line1: string; line2?: string };
  located: boolean;
  deliveryRadiusKm: number;
  deliveryFeeCents: number;
  status: "pending" | "approved" | "rejected" | "suspended";
  statusNote?: string;
  operatedByClinic: boolean;
  approvedAt?: string;
  createdAt: string;
};

type PharmacyContextType = {
  pToken: string;
  setPToken: (token: string) => void;
  staff: PharmacyStaff | null;
  pharmacy: Pharmacy | null;
  setPharmacy: (p: Pharmacy) => void;
  refresh: () => Promise<void>;
  logout: () => void;
};

const PharmacyContext = createContext<PharmacyContextType | null>(null);

/** Pharmacy personnel's login: who they are and which pharmacy they work for. */
export function PharmacyContextProvider({ children }: { children: ReactNode }) {
  const [pToken, setTokenState] = useState<string>(() => localStorage.getItem("pToken") ?? "");
  const [staff, setStaff] = useState<PharmacyStaff | null>(null);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);

  const setPToken = useCallback((token: string) => {
    if (token) localStorage.setItem("pToken", token);
    else localStorage.removeItem("pToken");
    setTokenState(token);
  }, []);

  const logout = useCallback(() => {
    setPToken("");
    setStaff(null);
    setPharmacy(null);
  }, [setPToken]);

  const refresh = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.PHARMACY.ME, { silent: true } as any);
      if (data.success) {
        setStaff(data.staff);
        setPharmacy(data.pharmacy);
      }
    } catch (err: any) {
      // deactivated or the token is no longer valid: back to the login screen
      if (err.response?.status === 401) logout();
    }
  }, [logout]);

  useEffect(() => {
    if (pToken) refresh();
  }, [pToken, refresh]);

  return (
    <PharmacyContext.Provider value={{ pToken, setPToken, staff, pharmacy, setPharmacy, refresh, logout }}>
      {children}
    </PharmacyContext.Provider>
  );
}

export function usePharmacy(): PharmacyContextType {
  const ctx = useContext(PharmacyContext);
  if (!ctx) throw new Error("usePharmacy must be used inside PharmacyContextProvider");
  return ctx;
}
