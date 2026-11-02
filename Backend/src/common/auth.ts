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

// Four kinds of logged-in caller, each with its own token:
//  - patient:  JWT of { id: userId }
//  - doctor:   JWT of { id: doctorId }
//  - pharmacy: JWT of { id: staffId, kind: 'pharmacy' } (the kind keeps it out of the other two)
//  - admin:    JWT of the string ADMIN_EMAIL + ADMIN_PASSWORD (no admin row in the DB)
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

/** Patient and doctor tokens are plain { id }; anything marked with a kind is someone else's. */
function plainId(decoded: string | jwt.JwtPayload): string {
  if (typeof decoded === 'string' || decoded.kind || !decoded.id) fail('unauthorized user, Login again', HttpStatus.UNAUTHORIZED);
  return decoded.id;
}

@Injectable()
export class UserAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    req.userId = plainId(verify(bearerToken(req, 'unauthorized user, Login again')));
    return true;
  }
}

@Injectable()
export class DoctorAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    req.docId = plainId(verify(bearerToken(req, 'unauthorized user, Login again')));
    return true;
  }
}

/** A pharmacy staff token: { id: staffId, kind: 'pharmacy' } (see pharmacy/pharmacy.auth.ts). */
export function pharmacyStaffId(req: Request): string {
  const decoded = verify(bearerToken(req, 'Please log in again'));
  if (typeof decoded === 'string' || decoded.kind !== 'pharmacy' || !decoded.id) {
    fail('Please log in again', HttpStatus.UNAUTHORIZED);
  }
  return decoded.id;
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
