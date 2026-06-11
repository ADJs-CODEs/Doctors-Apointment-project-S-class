import { type Request, type Response } from "express";
declare const sendEmojiPing: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const getUndeliveredPings: (req: Request, res: Response) => Promise<void>;
export { sendEmojiPing, getUndeliveredPings };
//# sourceMappingURL=emojiController.d.ts.map