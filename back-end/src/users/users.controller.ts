import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ALL_ROLES, Role } from '../common/role.enum';
import { ApiRoleHeader, Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiRoleHeader()
@UseGuards(RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(Role.SuperUser, Role.Support)
  @ApiOkResponse({ description: 'List all users.' })
  findAll() {
    return { success: true, data: this.users.findAll() };
  }

  @Post()
  @Roles(Role.SuperUser)
  @ApiCreatedResponse({ description: 'Create a user.' })
  create(@Body() dto: CreateUserDto) {
    return { success: true, data: this.users.create(dto) };
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOkResponse({ description: 'Find one user by id or email.' })
  findOne(@Param('id') id: string) {
    return { success: true, data: this.users.findOne(id) };
  }

  @Patch(':id')
  @Roles(...ALL_ROLES)
  @ApiOkResponse({ description: 'Update a user.' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return { success: true, data: this.users.update(id, dto) };
  }

  @Delete(':id')
  @Roles(Role.SuperUser)
  @ApiOkResponse({ description: 'Delete a user.' })
  remove(@Param('id') id: string) {
    return { success: true, data: this.users.remove(id) };
  }
}
