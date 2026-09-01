import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { RolesGuard } from './common/roles.guard';
import { DataModule } from './data/data.module';
import { GuidesModule } from './guides/guides.module';
import { IssuesModule } from './issues/issues.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TripsModule } from './trips/trips.module';
import { TripRequestsModule } from './trip-requests/trip-requests.module';
import { UsersModule } from './users/users.module';
import { VendorsModule } from './vendors/vendors.module';
import { WorkflowModule } from './workflow/workflow.module';
import { UploadModule } from './upload/upload.module';

import { FileLoggerService } from './common/services/file-logger.service';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { AdminAuditMiddleware } from './common/middleware/admin-audit.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    DataModule,
    AuthModule,
    UsersModule,
    GuidesModule,
    VendorsModule,
    TripsModule,
    TripRequestsModule,
    IssuesModule,
    MessagesModule,
    NotificationsModule,
    WorkflowModule,
    UploadModule,
  ],
  providers: [
    FileLoggerService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Global middleware: security headers on all routes
    consumer
      .apply(SecurityMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // Global middleware: request logging on all routes
    consumer
      .apply(LoggingMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // Router-level middleware: admin audit logging bound to specific admin routes only
    consumer
      .apply(AdminAuditMiddleware)
      .forRoutes(
        { path: 'users', method: RequestMethod.ALL },
        { path: 'users/*path', method: RequestMethod.ALL },
        { path: 'vendors', method: RequestMethod.ALL },
        { path: 'vendors/*path', method: RequestMethod.ALL },
        { path: 'guides', method: RequestMethod.ALL },
        { path: 'guides/*path', method: RequestMethod.ALL },
      );
  }
}
