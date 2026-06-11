import { type Request, type Response } from 'express';
declare const addDoctor: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const loginAdmin: (req: Request, res: Response) => Promise<void>;
declare const allDoctors: (req: Request, res: Response) => Promise<void>;
declare const appointmentsAdmin: (req: Request, res: Response) => Promise<void>;
declare const appointmentCancel: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const adminDashboard: (req: Request, res: Response) => Promise<void>;
declare const deleteDoctor: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export { addDoctor, loginAdmin, allDoctors, appointmentsAdmin, appointmentCancel, adminDashboard, deleteDoctor };
//# sourceMappingURL=adminController.d.ts.map