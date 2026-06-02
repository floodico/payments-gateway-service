import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string | string[];
  correlationId: string;
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = request.correlationId ?? 'unknown';
    const timestamp = new Date().toISOString();
    const path = request.url;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message: string | string[] = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const body = exceptionResponse as Record<string, unknown>;
        if (body.message !== undefined) {
          message = body.message as string | string[];
        }
        if (typeof body.error === 'string') {
          error = body.error;
        }
      }

      if (error === 'Internal Server Error') {
        error = HttpStatus[statusCode] ?? error;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        { correlationId, err: exception.message, stack: exception.stack },
        'Unhandled exception',
      );
    }

    const body: ErrorResponseBody = {
      statusCode,
      error,
      message,
      correlationId,
      timestamp,
      path,
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({ correlationId, path, statusCode }, String(message));
    }

    response.status(statusCode).json(body);
  }
}
