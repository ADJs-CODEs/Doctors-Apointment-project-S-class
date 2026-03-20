import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      userId?: string;  // Added for User Authentication
      docId?: string;   // Added for Doctor Authentication
      // req.file is usually handled by @types/multer, 
      // but adding it here is a safe backup for some configs
    }
  }
}