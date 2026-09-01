import { BadRequestException, Injectable } from '@nestjs/common';
import { normalizeRole, Role } from '../common/role.enum';
import { DataService } from '../data/data.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly data: DataService) {}

  findAll() {
    return this.data.users().map((user) => this.data.stripPassword(user));
  }

  findOne(id: string) {
    return this.data.stripPassword(this.data.findUser(id));
  }

  create(dto: CreateUserDto) {
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
      status: dto.status || ('Active' as const),
      joined: this.data.now(),
    };
    this.data.users().push(user);
    return this.data.stripPassword(user);
  }

  update(id: string, dto: UpdateUserDto) {
    const user = this.data.findUser(id);
    if (dto.email) user.email = dto.email.trim().toLowerCase();
    if (dto.name) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.password) user.password = dto.password;
    if (dto.role) user.role = normalizeRole(dto.role) || user.role;
    if (dto.status) user.status = dto.status;
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
