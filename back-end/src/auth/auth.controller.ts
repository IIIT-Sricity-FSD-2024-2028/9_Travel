import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ALL_ROLES } from '../common/role.enum';
import { Roles } from '../common/roles.decorator';
import { ApiRoleHeader } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { PartnerApplyDto } from './dto/partner-apply.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('auth')
@ApiRoleHeader()
@UseGuards(RolesGuard)
@Roles(...ALL_ROLES)
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('send-registration-otp')
  @ApiOkResponse({ description: 'Sends OTP to verify email existence before creating account.' })
  async sendRegistrationOtp(@Body() dto: SendOtpDto) {
    return this.auth.sendRegistrationOtp(dto);
  }

  @Post('register')
  @ApiCreatedResponse({ description: 'Register a new Traveler with verified email OTP.' })
  register(@Body() dto: RegisterDto) {
    return { success: true, data: this.auth.register(dto) };
  }

  @Post('apply-partner')
  @ApiCreatedResponse({ description: 'Submit a business partner application (Guide or Vendor) with verified email OTP.' })
  applyPartner(@Body() dto: PartnerApplyDto) {
    return { success: true, data: this.auth.applyPartner(dto) };
  }

  @Post('login')
  @ApiOkResponse({ description: 'Direct login for all users (Super Admin, Traveler, Partners) without OTP.' })
  login(@Body() dto: LoginDto) {
    return { success: true, data: this.auth.login(dto) };
  }

  @Post('verify-otp')
  @ApiOkResponse({ description: 'Verify OTP code.' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return { success: true, data: this.auth.verifyOtp(dto) };
  }

  @Post('resend-otp')
  @ApiOkResponse({ description: 'Resend registration OTP to the email.' })
  resendOtp(@Body() body: { email: string }) {
    return this.auth.resendOtp(body.email);
  }
}
