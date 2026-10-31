import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';

// The doctor endpoints historically answered unexpected errors with HTTP 200 and
// { success: false, message }, and the doctor panel only checks `success`. Auth
// failures (401) still pass through with their real status.
@Catch()
export class OkOnErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('DoctorApi');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const payload =
        typeof body === 'object' && body !== null && 'success' in body
          ? body
          : { success: false, message: exception.message };
      res.status(exception.getStatus()).json(payload);
      return;
    }

    const message = exception instanceof Error ? exception.message : String(exception);
    this.logger.error(message);
    res.status(200).json({ success: false, message });
  }
}
