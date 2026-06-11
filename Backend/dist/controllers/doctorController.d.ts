import { type Request, type Response } from 'express';
declare const changeAvailability: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const doctorList: (req: Request, res: Response) => Promise<void>;
declare const loginDoctor: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const appointmentsDoctor: (req: Request, res: Response) => Promise<void>;
declare const appointmentComplete: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const appointmentCancel: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const doctorDashboard: (req: Request, res: Response) => Promise<void>;
declare const doctorProfile: (req: Request, res: Response) => Promise<void>;
declare const updateDoctorProfile: (req: Request, res: Response) => Promise<void>;
declare const sendPatientAlert: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export { changeAvailability, doctorList, loginDoctor, appointmentsDoctor, appointmentCancel, appointmentComplete, doctorDashboard, doctorProfile, updateDoctorProfile, sendPatientAlert };
//# sourceMappingURL=doctorController.d.ts.map