import { type Request, type Response } from "express";
declare const chatWithGemini: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const chatWithGeminiDoctor: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export { chatWithGemini, chatWithGeminiDoctor };
//# sourceMappingURL=chatController.d.ts.map