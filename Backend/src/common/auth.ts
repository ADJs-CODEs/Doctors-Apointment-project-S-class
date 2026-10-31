import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { fail } from './http';

// Three kinds of logged-in caller, each with its own token:
//  - patient: JWT of { id: userId }
//  - doctor:  JWT of { id: doctorId }
//  - admin:   JWT of the string ADMIN_EMAIL + ADMIN_PASSWORD (no admin row in the DB)
// All are sent as "Authorization: Bearer <token>".

type AuthedRequest = Request & { userId?: string; docId?: string };

function bearerToken(req: Request, missingMessage: string): string {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.split(' ')[1] : undefined;
  if (!token) fail(missingMessage, HttpStatus.UNAUTHORIZED);
  return token;
}

function verify(token: string): string | jwt.JwtPayload {
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string);
  } catch (err: any) {
    fail(err.message, HttpStatus.UNAUTHORIZED);
  }
}

@Injectable()
export class UserAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const decoded = verify(bearerToken(req, 'unauthorized user, Login again')) as { id: string };
    req.userId = decoded.id;
    return true;
  }
}

@Injectable()
export class DoctorAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const decoded = verify(bearerToken(req, 'unauthorized user, Login again')) as { id: string };
    req.docId = decoded.id;
    return true;
  }
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const decoded = verify(bearerToken(req, 'Not Authorized.Login Again'));
    if (decoded !== `${process.env.ADMIN_EMAIL}${process.env.ADMIN_PASSWORD}`) {
      fail('Not Authorized Login Again', HttpStatus.UNAUTHORIZED);
    }
    return true;
  }
}

/** The logged-in patient's id, set by UserAuthGuard. Never read it from the body. */
export const UserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthedRequest>().userId,
);

/** The logged-in doctor's id, set by DoctorAuthGuard. */
export const DocId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthedRequest>().docId,
);
