import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FileLoggerService } from '../services/file-logger.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: FileLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || 'Unknown';
    const role = req.get('x-role') || 'Anonymous';

    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;
      const logMessage = `${method} ${originalUrl} ${statusCode} - ${responseTime}ms - Role: ${role} - IP: ${ip} - UA: ${userAgent}`;

      if (statusCode >= 400) {
        this.logger.warn(logMessage, 'HTTP-REQUEST');
      } else {
        this.logger.log(logMessage, 'HTTP-REQUEST');
      }
    });

    next();
  }
}
