import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DataService } from '../data/data.service';
import { ROLES_KEY } from './roles.decorator';
import { Role, normalizeRole } from './role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly data: DataService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { role?: Role }>();
    const isAuthPath = request.path ? request.path.startsWith('/auth/') : false;
    if (isAuthPath) {
      return true;
    }

    const role = normalizeRole(request.headers['x-role']);
    if (!role) {
      throw new UnauthorizedException('Missing or invalid x-role header. Authentication required.');
    }

    request.role = role;

    const userEmail = String(request.headers['x-user-email'] || '').trim().toLowerCase();
    if (userEmail) {
      const user = this.data.users().find((item) => item.email === userEmail);
      if (!user) {
        if (role !== Role.SuperUser) {
          throw new ForbiddenException('The active session user was not found.');
        }
      } else {
        if (user.role !== role && role !== Role.SuperUser) {
          throw new ForbiddenException('The x-role header does not match the active session user.');
        }
        if (user.status === 'Suspended' && role !== Role.SuperUser) {
          throw new ForbiddenException('This account is suspended. Contact the Super Admin to reactivate it.');
        }
        const authPath = request.path.startsWith('/auth/');
        const readOnly = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
        if (user.status === 'Inactive' && !authPath && !readOnly && role !== Role.SuperUser) {
          throw new ForbiddenException('This account is inactive. You can log in, but operations are blocked until Super Admin activates it.');
        }
      }
    }

    const allowedRoles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (!allowedRoles.length || allowedRoles.includes(role)) {
      return true;
    }

    throw new ForbiddenException(`Role "${role}" is not allowed for this API.`);
  }
}
