import { type Request, type Response, type NextFunction } from 'express';
declare const authAdmin: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export default authAdmin;
//# sourceMappingURL=authAdmin.d.ts.map