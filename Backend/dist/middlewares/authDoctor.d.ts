import { type Request, type Response, type NextFunction } from 'express';
interface CustomRequest extends Request {
    docId?: string;
}
declare const authDoctor: (req: CustomRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export default authDoctor;
//# sourceMappingURL=authDoctor.d.ts.map