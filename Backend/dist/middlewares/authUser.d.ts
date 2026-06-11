import { type Request, type Response, type NextFunction } from 'express';
declare const authUser: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export default authUser;
//# sourceMappingURL=authUser.d.ts.map