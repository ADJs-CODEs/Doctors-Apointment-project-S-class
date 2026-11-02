import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { isValidObjectId, type Model } from 'mongoose';
import validator from 'validator';
import { fail } from '../common/http';
import { MODEL } from '../database/models';
import type { IPharmacy, IPharmacyStaff, PharmacyStatus, StaffRole } from '../database/schemas/pharmacy.schemas';
import { MapsService } from '../maps/maps.service';
import { EmailNotifications } from '../notifications/email-notifications';
import type { StaffContext } from './pharmacy.auth';

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const ROLES: StaffRole[] = ['owner', 'pharmacist', 'staff'];
const hash = async (password: string) => bcrypt.hash(password, await bcrypt.genSalt(10));
/** A readable starting password, e.g. "kx7m-9qpd-2wfa" (the person changes it on first login). */
const tempPassword = () =>
  Array.from({ length: 3 }, () => crypto.randomBytes(3).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, 'x').slice(0, 4)).join('-');

type PharmacyDetails = {
  name?: string;
  licenseNumber?: string;
  email?: string;
  phone?: string;
  address?: { line1?: string; line2?: string };
  deliveryRadiusKm?: number;
  deliveryFeeCents?: number;
};
type Person = { name?: string; email?: string; password?: string; pharmacistLicense?: string; role?: string };

/** What a pharmacy's own people see about it (and what the admin sees in the list). */
const pharmacyView = (p: IPharmacy) => ({
  _id: String(p._id),
  name: p.name,
  licenseNumber: p.licenseNumber,
  email: p.email,
  phone: p.phone,
  address: p.address,
  located: !!p.location?.coordinates?.length,
  deliveryRadiusKm: p.deliveryRadiusKm,
  deliveryFeeCents: p.deliveryFeeCents,
  status: p.status,
  statusNote: p.statusNote,
  operatedByClinic: p.operatedByClinic,
  approvedAt: p.approvedAt,
  createdAt: p.createdAt,
});

const staffView = (s: IPharmacyStaff) => ({
  _id: String(s._id),
  name: s.name,
  email: s.email,
  role: s.role,
  pharmacistLicense: s.pharmacistLicense,
  active: s.active,
  mustChangePassword: s.mustChangePassword,
  createdAt: s.createdAt,
});

/**
 * Pharmacies (the businesses) and their personnel. Step 1 of the medicine shop:
 * applying, admin approval, logging in, delivery settings and staff. Products, orders and
 * payouts build on this.
 */
@Injectable()
export class PharmacyService {
  constructor(
    @InjectModel(MODEL.pharmacy) private readonly pharmacies: Model<IPharmacy>,
    @InjectModel(MODEL.pharmacyStaff) private readonly staff: Model<IPharmacyStaff>,
    private readonly maps: MapsService,
    private readonly emails: EmailNotifications,
  ) {}

  // --- applying and logging in ---

  /** A pharmacy applies, with its owner's account. It can't sell until the admin approves it. */
  async apply(body: PharmacyDetails & { owner?: Person }) {
    const details = this.readDetails(body);
    const owner = this.readPerson(body.owner, true);
    if (await this.staff.exists({ email: owner.email })) fail('That email already has a pharmacy account. Log in instead.');

    const pharmacy = await this.pharmacies.create({ ...details, location: await this.locate(details.address) });
    try {
      await this.staff.create({
        pharmacyId: pharmacy._id,
        name: owner.name,
        email: owner.email,
        password: await hash(owner.password!),
        role: 'owner',
        pharmacistLicense: owner.pharmacistLicense || undefined,
      });
    } catch (err) {
      await this.pharmacies.deleteOne({ _id: pharmacy._id }); // don't leave a pharmacy nobody can log in to
      throw err;
    }
    this.emails.pharmacyApplied(pharmacy, { name: owner.name!, email: owner.email! }, !!pharmacy.location?.coordinates?.length);
    return { success: true, message: "Application sent. We'll email you once your licence has been checked." };
  }

  async login(body: { email?: string; password?: string }) {
    const email = clean(body.email, 160).toLowerCase();
    const staff = await this.staff.findOne({ email }).select('+password');
    if (!staff || !(await bcrypt.compare(body.password ?? '', staff.password))) fail('Wrong email or password', HttpStatus.UNAUTHORIZED);
    if (!staff.active) fail('Your account is not active. Ask your pharmacy owner.', HttpStatus.FORBIDDEN);
    const token = jwt.sign({ id: staff._id, kind: 'pharmacy' }, process.env.JWT_SECRET as string, { expiresIn: '30d' });
    return { success: true, token };
  }

  me({ staff, pharmacy }: StaffContext) {
    return { success: true, staff: staffView(staff), pharmacy: pharmacyView(pharmacy) };
  }

  async changePassword({ staff }: StaffContext, body: { currentPassword?: string; newPassword?: string }) {
    const me = await this.staff.findById(staff._id).select('+password');
    if (!me || !(await bcrypt.compare(body.currentPassword ?? '', me.password))) fail('Your current password is wrong');
    if (!body.newPassword || body.newPassword.length < 8) fail('Use at least 8 characters');
    if (body.newPassword === body.currentPassword) fail('Pick a different password');
    await this.staff.updateOne({ _id: me._id }, { $set: { password: await hash(body.newPassword), mustChangePassword: false } });
    return { success: true, message: 'Password changed' };
  }

  // --- the pharmacy's own settings (owner) ---

  async updateSettings({ pharmacy }: StaffContext, body: PharmacyDetails) {
    const set: Partial<IPharmacy> = {};
    if (body.phone !== undefined) set.phone = clean(body.phone, 30) || fail('Enter a phone number');
    if (body.deliveryRadiusKm !== undefined) set.deliveryRadiusKm = this.radius(body.deliveryRadiusKm);
    if (body.deliveryFeeCents !== undefined) set.deliveryFeeCents = this.fee(body.deliveryFeeCents);
    let lost = false;
    if (body.address) {
      const address = { line1: clean(body.address.line1, 200), line2: clean(body.address.line2, 200) || undefined };
      if (!address.line1) fail('Enter the street address');
      set.address = address;
      const location = await this.locate(address);
      if (location) set.location = location;
      lost = !location;
    }
    // a new address the map can't find must drop the old pin, or they'd show up in the wrong place
    const updated = await this.pharmacies.findByIdAndUpdate(
      pharmacy._id,
      { $set: set, ...(lost && { $unset: { location: 1 } }) },
      { returnDocument: 'after' },
    );
    return {
      success: true,
      message: lost ? "Saved, but we couldn't find that address on the map. Add the area and city." : 'Saved',
      pharmacy: pharmacyView(updated!),
    };
  }

  // --- personnel (owner) ---

  async listStaff({ pharmacy }: StaffContext) {
    const staff = await this.staff.find({ pharmacyId: pharmacy._id }).sort({ role: 1, createdAt: 1 });
    return { success: true, staff: staff.map(staffView) };
  }

  /** The owner adds someone; they get a starting password by email and must change it. */
  async addStaff({ pharmacy }: StaffContext, body: Person) {
    const person = this.readPerson(body, false);
    const role = this.role(body.role);
    if (role === 'pharmacist' && !person.pharmacistLicense) fail("Enter the pharmacist's licence number");
    if (await this.staff.exists({ email: person.email })) fail('That email already has a pharmacy account');
    const password = tempPassword();
    const created = await this.staff.create({
      pharmacyId: pharmacy._id,
      name: person.name,
      email: person.email,
      password: await hash(password),
      role,
      pharmacistLicense: person.pharmacistLicense || undefined,
      mustChangePassword: true,
    });
    this.emails.pharmacyStaffAdded({ name: created.name, email: created.email, role }, pharmacy.name, password);
    return { success: true, message: `Added. We've emailed ${created.email} their login.`, staff: staffView(created) };
  }

  /** Change someone's role, licence or access. The pharmacy always keeps an active owner. */
  async updateStaff({ staff: me, pharmacy }: StaffContext, staffId: string, body: { role?: string; active?: boolean; pharmacistLicense?: string }) {
    if (!isValidObjectId(staffId)) fail('Not found', HttpStatus.NOT_FOUND);
    const person = await this.staff.findOne({ _id: staffId, pharmacyId: pharmacy._id });
    if (!person) fail('Not found', HttpStatus.NOT_FOUND);

    const role = body.role !== undefined ? this.role(body.role) : person.role;
    const active = body.active !== undefined ? body.active === true : person.active;
    const license = body.pharmacistLicense !== undefined ? clean(body.pharmacistLicense, 60) : person.pharmacistLicense;
    if (role === 'pharmacist' && !license) fail("Enter the pharmacist's licence number");
    if (String(person._id) === String(me._id) && (!active || role !== 'owner')) fail("You can't remove your own owner access");

    const losesOwner = person.role === 'owner' && (role !== 'owner' || !active);
    if (losesOwner && !(await this.staff.exists({ pharmacyId: pharmacy._id, role: 'owner', active: true, _id: { $ne: person._id } }))) {
      fail('The pharmacy needs at least one active owner');
    }
    const updated = await this.staff.findByIdAndUpdate(
      person._id,
      { $set: { role, active, pharmacistLicense: license || undefined } },
      { returnDocument: 'after' },
    );
    return { success: true, message: 'Saved', staff: staffView(updated!) };
  }

  /** Someone forgot their password: a new starting password goes to their email. */
  async resetStaffPassword({ pharmacy }: StaffContext, staffId: string) {
    if (!isValidObjectId(staffId)) fail('Not found', HttpStatus.NOT_FOUND);
    const person = await this.staff.findOne({ _id: staffId, pharmacyId: pharmacy._id });
    if (!person) fail('Not found', HttpStatus.NOT_FOUND);
    const password = tempPassword();
    await this.staff.updateOne({ _id: person._id }, { $set: { password: await hash(password), mustChangePassword: true } });
    this.emails.pharmacyStaffAdded({ name: person.name, email: person.email, role: person.role }, pharmacy.name, password);
    return { success: true, message: `We've emailed ${person.email} a new starting password` };
  }

  // --- admin ---

  async adminList(status?: string) {
    const known: PharmacyStatus[] = ['pending', 'approved', 'rejected', 'suspended'];
    const filter: { status?: PharmacyStatus } = known.includes(status as PharmacyStatus) ? { status: status as PharmacyStatus } : {};
    const pharmacies = await this.pharmacies.find(filter).sort({ status: 1, createdAt: -1 }).limit(300);
    const owners = await this.staff
      .find({ pharmacyId: { $in: pharmacies.map((p) => p._id) }, role: 'owner' })
      .select(['pharmacyId', 'name', 'email', 'pharmacistLicense'])
      .lean();
    const counts = await this.staff.aggregate<{ _id: unknown; n: number }>([
      { $match: { pharmacyId: { $in: pharmacies.map((p) => p._id) }, active: true } },
      { $group: { _id: '$pharmacyId', n: { $sum: 1 } } },
    ]);
    return {
      success: true,
      pharmacies: pharmacies.map((p) => ({
        ...pharmacyView(p),
        owners: owners.filter((o) => String(o.pharmacyId) === String(p._id)).map((o) => ({ name: o.name, email: o.email, pharmacistLicense: o.pharmacistLicense })),
        staffCount: counts.find((c) => String(c._id) === String(p._id))?.n ?? 0,
      })),
    };
  }

  async setStatus(pharmacyId: string, body: { status?: string; note?: string }) {
    if (!isValidObjectId(pharmacyId)) fail('Not found', HttpStatus.NOT_FOUND);
    const status = body.status as PharmacyStatus;
    if (!['approved', 'rejected', 'suspended', 'pending'].includes(status)) fail('Pick approve, reject or suspend');
    const note = clean(body.note, 500);
    if ((status === 'rejected' || status === 'suspended') && !note) fail('Give the pharmacy a reason');

    const current = await this.pharmacies.findById(pharmacyId);
    if (!current) fail('Not found', HttpStatus.NOT_FOUND);
    if (current.status === status) fail(`It's already ${status}`);
    if (status === 'approved' && !current.location?.coordinates?.length) fail("We couldn't place this pharmacy on the map yet. Ask them to fix their address first.");

    const updated = await this.pharmacies.findByIdAndUpdate(
      pharmacyId,
      {
        $set: { status, statusNote: note || undefined, ...(status === 'approved' && { approvedAt: new Date() }) },
      },
      { returnDocument: 'after' },
    );
    this.emails.pharmacyStatusChanged(updated!);
    const done = { approved: 'Approved', rejected: 'Rejected', suspended: 'Suspended', pending: 'Moved back to review' }[status];
    return { success: true, message: `${done}. We've emailed the pharmacy.`, pharmacy: pharmacyView(updated!) };
  }

  /** The clinic's own pharmacy: created already approved, its owner gets a starting password. */
  async createClinicPharmacy(body: PharmacyDetails & { owner?: Person }) {
    const details = this.readDetails(body);
    const owner = this.readPerson(body.owner, false);
    if (await this.staff.exists({ email: owner.email })) fail('That email already has a pharmacy account');
    const location = await this.locate(details.address);
    if (!location) fail("We couldn't find that address on the map. Add the area and city.");

    const pharmacy = await this.pharmacies.create({ ...details, location, status: 'approved', approvedAt: new Date(), operatedByClinic: true });
    const password = tempPassword();
    try {
      await this.staff.create({
        pharmacyId: pharmacy._id,
        name: owner.name,
        email: owner.email,
        password: await hash(password),
        role: 'owner',
        pharmacistLicense: owner.pharmacistLicense || undefined,
        mustChangePassword: true,
      });
    } catch (err) {
      await this.pharmacies.deleteOne({ _id: pharmacy._id });
      throw err;
    }
    this.emails.pharmacyStaffAdded({ name: owner.name!, email: owner.email!, role: 'owner' }, pharmacy.name, password);
    return { success: true, message: `Created. We've emailed ${owner.email} their login.`, pharmacy: pharmacyView(pharmacy) };
  }

  // --- helpers ---

  private readDetails(body: PharmacyDetails) {
    const details = {
      name: clean(body.name, 120),
      licenseNumber: clean(body.licenseNumber, 60),
      email: clean(body.email, 160).toLowerCase(),
      phone: clean(body.phone, 30),
      address: { line1: clean(body.address?.line1, 200), line2: clean(body.address?.line2, 200) || undefined },
      deliveryRadiusKm: body.deliveryRadiusKm === undefined ? 10 : this.radius(body.deliveryRadiusKm),
      deliveryFeeCents: body.deliveryFeeCents === undefined ? 0 : this.fee(body.deliveryFeeCents),
    };
    if (!details.name || !details.licenseNumber || !details.phone || !details.address.line1) {
      fail('Enter the pharmacy name, licence number, phone and address');
    }
    if (!validator.isEmail(details.email)) fail("Enter the pharmacy's email");
    return details;
  }

  private readPerson(body: Person | undefined, withPassword: boolean) {
    const person = {
      name: clean(body?.name, 120),
      email: clean(body?.email, 160).toLowerCase(),
      password: typeof body?.password === 'string' ? body.password : '',
      pharmacistLicense: clean(body?.pharmacistLicense, 60),
    };
    if (!person.name) fail('Enter their full name');
    if (!validator.isEmail(person.email)) fail('Enter a valid email');
    if (withPassword && person.password.length < 8) fail('Use a password of at least 8 characters');
    return person;
  }

  private role(value: unknown): StaffRole {
    if (!ROLES.includes(value as StaffRole)) fail('Pick owner, pharmacist or staff');
    return value as StaffRole;
  }

  private radius(value: unknown) {
    const km = Number(value);
    if (!Number.isFinite(km) || km < 1 || km > 100) fail('Delivery distance must be between 1 and 100 km');
    return Math.round(km * 10) / 10;
  }

  private fee(value: unknown) {
    const cents = Number(value);
    if (!Number.isInteger(cents) || cents < 0 || cents > 100_000) fail('Enter a delivery fee between 0 and 1000');
    return cents;
  }

  /** Address -> GeoJSON point, or undefined if the map can't find it. */
  private async locate(address: { line1: string; line2?: string }) {
    const found = await this.maps.geocode([address.line1, address.line2].filter(Boolean).join(', '));
    return found ? { type: 'Point' as const, coordinates: [found.lng, found.lat] as [number, number] } : undefined;
  }
}
