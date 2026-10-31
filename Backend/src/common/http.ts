import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

// Every response in this API has the shape { success: boolean, message?, ...data },
// which the web, admin and mobile apps all rely on.

/** Stop the request and reply { success: false, message } with the given status. */
export function fail(message: string, status: number = HttpStatus.BAD_REQUEST): never {
  throw new HttpException({ success: false, message }, status);
}

/** Turns any thrown error into the { success: false, message } shape. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && 'success' in body) {
        res.status(exception.getStatus()).json(body);
        return;
      }
      // Nest's own errors (unknown route, payload too large, ...)
      res.status(exception.getStatus()).json({ success: false, message: exception.message });
      return;
    }

    const message = exception instanceof Error ? exception.message : String(exception);
    this.logger.error(message, exception instanceof Error ? exception.stack : undefined);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message });
  }
}
