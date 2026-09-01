import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ALL_ROLES } from '../common/role.enum';
import { Roles } from '../common/roles.decorator';
import { ApiRoleHeader } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@ApiRoleHeader()
@UseGuards(RolesGuard)
@Roles(...ALL_ROLES)
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiCreatedResponse({ description: 'Registered user wrapped in a consistent response.' })
  register(@Body() dto: RegisterDto) {
    return { success: true, data: this.auth.register(dto) };
  }

  @Post('login')
  @ApiOkResponse({ description: 'Session role, name, and email for the frontend.' })
  login(@Body() dto: LoginDto) {
    return { success: true, data: this.auth.login(dto) };
  }
}
