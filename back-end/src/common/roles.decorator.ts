import { SetMetadata, applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { ALL_ROLES, Role } from './role.enum';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const ApiRoleHeader = () =>
  applyDecorators(
    ApiHeader({
      name: 'x-role',
      required: true,
      enum: ALL_ROLES,
      description:
        'Role-based access header. Pass one of: Super User, Traveler, Travel Partner, Tour Guide, Vendor, Support Executive.',
    }),
  );
