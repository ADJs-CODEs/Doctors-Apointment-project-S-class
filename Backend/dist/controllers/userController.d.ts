import { type Request, type Response } from "express";
declare const registerUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const loginUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const googleAuth: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const getProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const updateProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const bookAppointment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const listAppointment: (req: Request, res: Response) => Promise<void>;
declare const cancelAppointment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const updateMedicationDose: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const paymentStripe: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const verifyStripe: (req: Request, res: Response) => Promise<void>;
declare const changePassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const forgotPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const resetPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const deleteAccount: (req: Request, res: Response) => Promise<void>;
export { registerUser, loginUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentStripe, verifyStripe, updateMedicationDose, googleAuth, changePassword, deleteAccount, forgotPassword, resetPassword, };
//# sourceMappingURL=userController.d.ts.map