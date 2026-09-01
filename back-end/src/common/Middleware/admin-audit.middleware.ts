import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FileLoggerService } from '../services/file-logger.service';

/**
 * Router-level middleware specifically bound to admin routes (/users/*, /vendors/*, /guides/*).
 * Demonstrates route-specific middleware registration (not global).
 * Logs admin-level access with elevated audit detail for FDFED evaluation.
 */
@Injectable()
export class AdminAuditMiddleware implements NestMiddleware {
  constructor(private readonly logger: FileLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const role = req.get('x-role') || 'Anonymous';
    const userEmail = req.get('x-user-email') || 'unknown';
    const { method, originalUrl, ip } = req;
    const timestamp = new Date().toISOString();

    // Log admin route access with audit-level detail
    this.logger.log(
      `ADMIN-AUDIT | ${timestamp} | ${method} ${originalUrl} | Role: ${role} | User: ${userEmail} | IP: ${ip}`,
      'AdminAuditMiddleware',
    );

    // Track response for audit completion
    res.on('finish', () => {
      const { statusCode } = res;
      if (statusCode >= 400) {
        this.logger.warn(
          `ADMIN-AUDIT RESULT | ${method} ${originalUrl} | Status: ${statusCode} | Role: ${role} | User: ${userEmail}`,
          'AdminAuditMiddleware',
        );
      }
    });

    next();
  }
}
