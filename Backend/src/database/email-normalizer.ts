import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { MODEL } from './models';
import type { IDoctor } from './schemas/doctor.schema';
import type { IUser } from './schemas/user.schema';

// One-off clean-up carried over from the Express app: older accounts were saved with
// uppercase letters in their emails, which breaks case-insensitive login. On startup,
// lowercase any that are left, skipping ones that would collide with an existing account.
@Injectable()
export class EmailNormalizer implements OnApplicationBootstrap {
  private readonly logger = new Logger('EmailNormalizer');

  constructor(
    @InjectModel(MODEL.user) private readonly users: Model<IUser>,
    @InjectModel(MODEL.doctor) private readonly doctors: Model<IDoctor>,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.normalize(this.users, 'user');
      await this.normalize(this.doctors, 'doctor');
    } catch (err: any) {
      this.logger.error(`startup normalization failed: ${err.message}`);
    }
  }

  private async normalize(model: Model<any>, label: string) {
    const docs = await model.find({ email: { $regex: /[A-Z]/ } });
    for (const doc of docs) {
      const normalized = doc.email.toLowerCase().trim();
      if (await model.exists({ email: normalized })) {
        this.logger.warn(`${label} email ${normalized} already exists, skipping`);
        continue;
      }
      doc.email = normalized;
      await doc.save();
    }
    if (docs.length) this.logger.log(`normalized ${docs.length} ${label} emails`);
  }
}
