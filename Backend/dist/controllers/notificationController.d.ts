import { type Request, type Response } from "express";
declare const createNotification: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const getNotifications: (req: Request, res: Response) => Promise<void>;
declare const markAllRead: (req: Request, res: Response) => Promise<void>;
declare const markOneRead: (req: Request, res: Response) => Promise<void>;
declare const clearAll: (req: Request, res: Response) => Promise<void>;
export { createNotification, getNotifications, markAllRead, markOneRead, clearAll, };
//# sourceMappingURL=notificationController.d.ts.map