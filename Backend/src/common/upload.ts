import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

// Uploaded images land in the OS temp folder, then get pushed to Cloudinary by path.
export const ImageUpload = () =>
  FileInterceptor('image', {
    storage: diskStorage({
      filename: (_req, file, callback) => callback(null, file.originalname),
    }),
  });
