import { Injectable } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { Role } from '../common/role.enum';
import { DataService } from '../data/data.service';
import { PartnerApplicationEntity } from '../data/entities';

@Injectable()
export class PartnerApplicationsService {
  constructor(
    private readonly data: DataService,
    private readonly mail: MailService,
  ) {}

  findAll(): PartnerApplicationEntity[] {
    return this.data.partnerApplications();
  }

  findOne(id: string): PartnerApplicationEntity {
    return this.data.findPartnerApplication(id);
  }

  async approve(id: string, reviewer = 'Super User') {
    const app = this.data.findPartnerApplication(id);
    app.status = 'APPROVED';
    app.reviewedAt = this.data.now();
    app.reviewedBy = reviewer;
    app.rejectionReason = undefined;

    // Create or activate the user account
    let user = this.data.users().find((u) => u.email.toLowerCase() === app.email.toLowerCase());
    if (user) {
      user.status = 'Active';
      user.role = app.requestedRole;
      if (app.password) user.password = app.password;
    } else {
      user = {
        id: `USER-${Date.now()}`,
        name: app.applicantName,
        email: app.email.toLowerCase(),
        phone: app.phone,
        password: app.password || '123456',
        role: app.requestedRole,
        status: 'Active',
        businessName: app.businessName,
        address: app.address,
        joined: this.data.now(),
      };
      this.data.addUser(user);
    }

    // Provision into directory if Guide or Vendor
    if (app.requestedRole === Role.Guide) {
      const existingGuide = this.data.guides().find(
        (g) => g.name.toLowerCase() === app.applicantName.toLowerCase() || g.id === user!.id,
      );
      if (!existingGuide) {
        const initials = app.applicantName
          .split(' ')
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'TG';
        this.data.guides().push({
          id: `GUI-${Date.now()}`,
          name: app.applicantName,
          initials,
          languages: 'English, Local',
          experience: 'Certified Professional Guide',
          rating: 5.0,
          tours: 0,
          status: 'Available',
        });
      }
    } else if (app.requestedRole === Role.Vendor) {
      const vName = app.businessName || app.applicantName;
      const existingVendor = this.data.vendors().find(
        (v) => v.name.toLowerCase() === vName.toLowerCase() || v.id === user!.id,
      );
      if (!existingVendor) {
        this.data.vendors().push({
          id: `VEN-${Date.now()}`,
          name: vName,
          type: 'Activities & Transport',
          location: app.address || 'Regional Hub',
          rating: 5.0,
          trips: 0,
          status: 'Available',
        });
      }
    }

    this.data.persist();

    // Send approval email
    await this.mail.sendPartnerApproval(app.email, app.applicantName, app.requestedRole);

    return {
      success: true,
      message: `Partner application for ${app.applicantName} approved and account activated successfully.`,
      application: app,
    };
  }

  async reject(id: string, reason = 'Application does not meet platform requirements.', reviewer = 'Super User') {
    const app = this.data.findPartnerApplication(id);
    app.status = 'REJECTED';
    app.rejectionReason = reason;
    app.reviewedAt = this.data.now();
    app.reviewedBy = reviewer;

    // Deactivate user account if one exists
    const user = this.data.users().find((u) => u.email.toLowerCase() === app.email.toLowerCase());
    if (user) {
      user.status = 'Suspended';
    }

    this.data.persist();

    // Send rejection email
    await this.mail.sendPartnerRejection(app.email, app.applicantName, app.requestedRole, reason);

    return {
      success: true,
      message: `Partner application for ${app.applicantName} has been rejected.`,
      application: app,
    };
  }
}
