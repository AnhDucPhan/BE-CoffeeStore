import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';

    // Nếu là HttpException (ValidationPipe cũng ném loại này)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      // Xử lý riêng validation error
      if (typeof res === 'object' && (res as any).message) {
        const msg = (res as any).message;
        if (Array.isArray(msg)) {
          // Tạo object { field: message }
          const formatted: Record<string, string> = {};
          msg.forEach((m: string) => {
            const [field] = m.split(' ');
            formatted[field] = m;
          });
          message = formatted;
        } else {
          message = msg;
        }
      } else {
        message = res;
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
