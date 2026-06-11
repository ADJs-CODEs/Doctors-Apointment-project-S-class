import { type Request, type Response } from "express";
declare const sendConnectionRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const respondToRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const getMyRequests: (req: Request, res: Response) => Promise<void>;
declare const getWatchingOver: (req: Request, res: Response) => Promise<void>;
declare const getMyWatchers: (req: Request, res: Response) => Promise<void>;
declare const removeConnection: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const getPatientData: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export { sendConnectionRequest, respondToRequest, getMyRequests, getWatchingOver, getMyWatchers, removeConnection, getPatientData, };
//# sourceMappingURL=connectionController.d.ts.map