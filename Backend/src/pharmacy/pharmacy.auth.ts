import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import type { Request } from 'express';
import type { Model } from 'mongoose';
import { pharmacyStaffId } from '../common/auth';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IPharmacy, IPharmacyStaff, StaffRole } from '../database/schemas/pharmacy.schemas';

export type StaffContext = { staff: IPharmacyStaff; pharmacy: IPharmacy };
type PharmacyRequest = Request & { pharmacyCtx?: StaffContext };

const ROLES = 'pharmacyRoles';
/** Only these staff roles may call the route (default: any active staff member). */
export const PharmacyRoles = (...roles: StaffRole[]) => SetMetadata(ROLES, roles);

/**
 * Logged-in pharmacy personnel. Looks the person up on every request, so a deactivated
 * staff member (or a deleted pharmacy) is locked out straight away, not when their token
 * expires. Suspension is checked where it matters (selling), so a suspended pharmacy can
 * still log in and read why.
 */
@Injectable()
export class PharmacyAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(MODEL.pharmacyStaff) private readonly staff: Model<IPharmacyStaff>,
    @InjectModel(MODEL.pharmacy) private readonly pharmacies: Model<IPharmacy>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<PharmacyRequest>();
    const staff = await this.staff.findById(pharmacyStaffId(req));
    if (!staff || !staff.active) fail('Your account is not active. Ask your pharmacy owner.', HttpStatus.UNAUTHORIZED);
    const pharmacy = await this.pharmacies.findById(staff.pharmacyId);
    if (!pharmacy) fail('Pharmacy not found', HttpStatus.UNAUTHORIZED);

    const roles = this.reflector.getAllAndOverride<StaffRole[] | undefined>(ROLES, [context.getHandler(), context.getClass()]);
    if (roles?.length && !roles.includes(staff.role)) {
      fail(`Only the pharmacy's ${roles.join(' or ')} can do this`, HttpStatus.FORBIDDEN);
    }
    req.pharmacyCtx = { staff, pharmacy };
    return true;
  }
}

/** The logged-in staff member and their pharmacy, set by PharmacyAuthGuard. */
export const Staff = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<PharmacyRequest>().pharmacyCtx as StaffContext,
);
