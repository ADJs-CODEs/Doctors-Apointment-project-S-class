import { type Request, type Response } from "express";
declare const nominatePatient: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const giveConsent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const getWishWell: (req: Request, res: Response) => Promise<void>;
declare const sendWishWellEmoji: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const updatePatientStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const removeFromWishWell: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const optOut: (req: Request, res: Response) => Promise<void>;
declare const getPendingConsent: (req: Request, res: Response) => Promise<void>;
export { nominatePatient, giveConsent, getWishWell, sendWishWellEmoji, updatePatientStatus, removeFromWishWell, optOut, getPendingConsent, };
//# sourceMappingURL=wishWellController.d.ts.map