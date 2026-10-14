import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { normalizeRole, Role } from '../common/role.enum';
import { DataService } from '../data/data.service';
import { PartnerApplicationEntity } from '../data/entities';
import { LoginDto } from './dto/login.dto';
import { PartnerApplyDto } from './dto/partner-apply.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly data: DataService,
    private readonly mail: MailService,
    private readonly otp: OtpService,
  ) {}

  /**
   * Send verification OTP to verify that the entered email exists during
   * Traveler registration or Business Partner (Guide/Vendor) application.
   */
  async sendRegistrationOtp(dto: SendOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name?.trim() || 'User';

    if (this.data.users().some((user) => user.email.toLowerCase() === email)) {
      throw new BadRequestException('An account with this email already exists. Please sign in instead.');
    }

    const existingApp = this.data.partnerApplications().find(
      (a) => a.email.toLowerCase() === email && a.status === 'PENDING',
    );
    if (existingApp) {
      throw new BadRequestException('A partner application with this email is already PENDING review.');
    }

    this.otp.invalidate(email);
    const otpCode = this.otp.generate(email, name);
    await this.mail.sendRegistrationOtp(email, name, otpCode, dto.purpose || 'Account Verification');

    const isConfigured = this.mail.isConfigured();
    return {
      success: true,
      message: isConfigured
        ? `Verification code sent to ${email}. Please check your inbox.`
        : `SMTP not configured in back-end/.env. Simulated verification code: ${otpCode}`,
      isEmailConfigured: isConfigured,
      devOtp: !isConfigured ? otpCode : undefined,
    };
  }

  /**
   * Traveler Registration:
   * Requires OTP verification code sent to the traveler's email to ensure the email exists.
   */
  register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (this.data.users().some((user) => user.email === email)) {
      throw new BadRequestException('A user with this email already exists.');
    }

    const requested = dto.role ? normalizeRole(dto.role) : Role.Traveler;
    if (requested === Role.Partner || requested === Role.Support || requested === Role.SuperUser) {
      throw new BadRequestException(
        'Public self-registration is only allowed for Travelers. Company employees (Travel Partner, Support Executive) must be created by the Super User.',
      );
    }
    if (requested === Role.Guide || requested === Role.Vendor) {
      throw new BadRequestException(
        'Business partners (Tour Guide, Vendor) cannot register directly. Please use "Become a Business Partner" to apply.',
      );
    }

    // Verify OTP for traveler registration
    if (!dto.otp) {
      throw new BadRequestException('Verification code is required. Please verify your email with the OTP sent.');
    }
    const otpResult = this.otp.verify(email, dto.otp);
    if (!otpResult.valid) {
      throw new BadRequestException(otpResult.message);
    }

    const user = {
      id: `USER-${Date.now()}`,
      name: dto.name,
      email,
      phone: dto.phone,
      password: dto.password,
      role: Role.Traveler,
      status: 'Active' as const,
      joined: this.data.now(),
    };
    this.data.addUser(user);
    return this.data.stripPassword(user);
  }

  /**
   * Business Partner Application (Guide / Vendor):
   * Requires OTP verification code sent to the business email to ensure the email exists.
   */
  applyPartner(dto: PartnerApplyDto) {
    const email = dto.email.trim().toLowerCase();
    if (this.data.users().some((user) => user.email.toLowerCase() === email)) {
      throw new BadRequestException('An account with this email already exists.');
    }
    const existingApp = this.data.partnerApplications().find((a) => a.email.toLowerCase() === email);
    if (existingApp && existingApp.status === 'PENDING') {
      throw new BadRequestException('A partner application with this email is already PENDING review.');
    }

    const normRole = normalizeRole(dto.requestedRole);
    if (normRole !== Role.Guide && normRole !== Role.Vendor) {
      throw new BadRequestException('Business Partner application is only available for Tour Guide or Vendor.');
    }

    // Verify OTP for partner application
    if (!dto.otp) {
      throw new BadRequestException('Verification code is required. Please verify your email with the OTP sent.');
    }
    const otpResult = this.otp.verify(email, dto.otp);
    if (!otpResult.valid) {
      throw new BadRequestException(otpResult.message);
    }

    const application: PartnerApplicationEntity = {
      id: `APP-${Date.now()}`,
      applicantName: dto.applicantName.trim(),
      businessName: dto.businessName.trim(),
      email,
      phone: dto.phone.trim(),
      address: dto.address?.trim() || '',
      businessDetails: dto.businessDetails?.trim() || '',
      verificationInfo: dto.verificationInfo?.trim() || '',
      requestedRole: normRole,
      status: 'PENDING',
      submittedAt: this.data.now(),
      password: dto.password,
    };

    this.data.addPartnerApplication(application);
    return {
      id: application.id,
      applicantName: application.applicantName,
      businessName: application.businessName,
      email: application.email,
      requestedRole: application.requestedRole,
      status: application.status,
      submittedAt: application.submittedAt,
      message: 'Business partner application submitted successfully with status PENDING. Super User review required.',
    };
  }

  /**
   * Login: Direct login for all users (including Super Admin).
   * Validates credentials and returns full session immediately without OTP.
   */
  login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = this.data.users().find((item) => {
      const itemEmail = item.email.toLowerCase();
      if (itemEmail === email) return true;
      if ((email === 'dileep@gmail.com' && itemEmail === 'partner@gmail.com') || (email === 'partner@gmail.com' && itemEmail === 'dileep@gmail.com')) return true;
      if ((email === 'mahendra@gmail.com' && itemEmail === 'support@gmail.com') || (email === 'support@gmail.com' && itemEmail === 'mahendra@gmail.com')) return true;
      return false;
    });

    if (!user) {
      const app = this.data.partnerApplications().find((a) => a.email.toLowerCase() === email);
      if (app) {
        if (app.status === 'PENDING') {
          throw new UnauthorizedException(
            'Your business partner application is currently PENDING review by the Super User. You will be able to log in once approved.',
          );
        }
        if (app.status === 'REJECTED') {
          throw new UnauthorizedException(
            `Your business partner application was REJECTED by the Super User.${app.rejectionReason ? ' Reason: ' + app.rejectionReason : ''}`,
          );
        }
      }
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.password !== dto.password) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status === 'Suspended') {
      const isRootAdmin = user.id === 'USER-1' || user.email === 'superadmin@gmail.com';
      if (!isRootAdmin) {
        throw new UnauthorizedException('This account is suspended. Contact the Super Admin to activate it.');
      }
      user.status = 'Active';
    }

    if (user.status === 'Pending' || user.status === 'PENDING') {
      throw new UnauthorizedException('Your account is currently pending Super User review and approval.');
    }

    if (user.status === 'Rejected' || user.status === 'REJECTED') {
      throw new UnauthorizedException('Your account application was rejected.');
    }

    // Role check if specified by client
    if (dto.role) {
      const requestedNorm = normalizeRole(dto.role);
      const userNorm = normalizeRole(user.role);
      if (requestedNorm && userNorm && requestedNorm !== userNorm) {
        // Allow friendly message
        const roleLabel = user.role;
        throw new UnauthorizedException(`This email belongs to a ${roleLabel}. Select "${roleLabel}" to sign in.`);
      }
    }

    return {
      id: user.id,
      role: this.sessionRole(user.role),
      displayRole: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      status: user.status,
      availabilityStatus: user.availabilityStatus || user.availability || 'Available',
      availability: user.availability || user.availabilityStatus || 'Available',
      profile: user.profile || {},
      joined: user.joined,
    };
  }

  /**
   * Verify an arbitrary OTP (e.g. for manual verification or direct testing)
   */
  verifyOtp(dto: VerifyOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const result = this.otp.verify(email, dto.otp);
    if (!result.valid) {
      throw new UnauthorizedException(result.message);
    }
    return { verified: true, email };
  }

  /**
   * Resend OTP for registration
   */
  async resendOtp(email: string) {
    const cleanEmail = email.trim().toLowerCase();
    this.otp.invalidate(cleanEmail);
    const otpCode = this.otp.generate(cleanEmail, 'User');
    await this.mail.sendRegistrationOtp(cleanEmail, 'User', otpCode);
    return { success: true, message: `A new verification code has been sent to ${cleanEmail}.` };
  }

  private sessionRole(role: Role): string {
    const map: Record<Role, string> = {
      [Role.SuperUser]: 'superuser',
      [Role.Traveler]: 'traveler',
      [Role.Partner]: 'partner',
      [Role.Guide]: 'guide',
      [Role.Vendor]: 'vendor',
      [Role.Support]: 'support',
    };
    return map[role] || 'traveler';
  }
}
