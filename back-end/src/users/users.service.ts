import { BadRequestException, Injectable } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { normalizeRole, Role } from '../common/role.enum';
import { DataService } from '../data/data.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const EMPLOYEE_ROLES: Role[] = [Role.Partner, Role.Support];

@Injectable()
export class UsersService {
  constructor(
    private readonly data: DataService,
    private readonly mail: MailService,
  ) {}

  findAll() {
    return this.data.users().map((user) => this.data.stripPassword(user));
  }

  findOne(id: string) {
    return this.data.stripPassword(this.data.findUser(id));
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    if (this.data.users().some((user) => user.email === email)) {
      throw new BadRequestException('A user with this email already exists.');
    }
    const role = normalizeRole(dto.role) || Role.Traveler;
    const user = {
      id: `USER-${Date.now()}`,
      name: dto.name,
      email,
      phone: dto.phone || '',
      password: dto.password,
      role,
      monthlySalary: dto.monthlySalary !== undefined ? Number(dto.monthlySalary) : undefined,
      status: dto.status || ('Active' as const),
      joined: this.data.now(),
    };
    this.data.users().push(user);
    this.data.persist();

    // Send invitation email for employee roles
    if (EMPLOYEE_ROLES.includes(role) && dto.password) {
      await this.mail.sendEmployeeInvitation(email, dto.name, role, dto.password);
    }

    return this.data.stripPassword(user);
  }

  update(id: string, dto: UpdateUserDto, callerRole?: Role, callerEmail?: string) {
    const user = this.data.findUser(id);
    const isSuperUser = callerRole === Role.SuperUser;

    if (!isSuperUser && callerEmail) {
      if (user.email.toLowerCase() !== callerEmail.toLowerCase() && user.id !== id) {
        throw new BadRequestException('You are not authorized to update other user accounts.');
      }
    }

    if (dto.email) user.email = dto.email.trim().toLowerCase();
    if (dto.name) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.password) user.password = dto.password;

    if (isSuperUser) {
      if (dto.role) user.role = normalizeRole(dto.role) || user.role;
      if (dto.monthlySalary !== undefined) user.monthlySalary = Number(dto.monthlySalary);
      if (dto.status) user.status = dto.status;
    }
    this.data.persist();
    return this.data.stripPassword(user);
  }

  remove(id: string) {
    const user = this.data.findUser(id);
    const users = this.data.users();
    users.splice(users.indexOf(user), 1);
    this.data.persist();
    return { id, deleted: true };
  }
}
