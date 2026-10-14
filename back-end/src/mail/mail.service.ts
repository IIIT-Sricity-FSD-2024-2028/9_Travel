import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const [key, ...rest] = line.split('=');
      const k = key?.trim();
      const v = rest.join('=').trim().replace(/^["']|["']$/g, '');
      if (k && v && !k.startsWith('#')) {
        process.env[k] = v;
      }
    }
  } catch { /* ignore */ }
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  isConfigured(): boolean {
    loadEnv();
    const user = process.env.MAIL_USER || '';
    const pass = process.env.MAIL_PASS || '';
    return (
      Boolean(user) &&
      Boolean(pass) &&
      !user.includes('your-gmail') &&
      !pass.includes('your-16-char')
    );
  }

  private getTransporter(): { transporter: nodemailer.Transporter; from: { name: string; address: string } } | null {
    loadEnv();
    const user = process.env.MAIL_USER || '';
    const pass = process.env.MAIL_PASS || '';
    if (!this.isConfigured()) return null;

    const senderName = process.env.MAIL_SENDER_NAME || 'Dream Destination';
    const from = {
      name: senderName,
      address: user,
    };
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.MAIL_PORT) || 587,
      secure: process.env.MAIL_SECURE === 'true',
      auth: { user, pass },
    });
    return { transporter, from };
  }

  /** Send a raw email. Falls back to console logging if SMTP is not configured. */
  async send(options: { to: string; subject: string; html: string }): Promise<void> {
    const client = this.getTransporter();

    if (!client) {
      this.logger.warn(
        `[EMAIL SIMULATION] SMTP is not yet configured in back-end/.env!\n` +
        `To receive real emails in your inbox, set your real Gmail & App Password in back-end/.env.\n` +
        `TO: ${options.to}\nSUBJECT: ${options.subject}\n` +
        `BODY: ${options.html.replace(/<[^>]+>/g, '').trim().slice(0, 400)}`,
      );
      return;
    }

    try {
      await client.transporter.sendMail({ from: client.from, ...options });
      this.logger.log(`Real email sent successfully → ${options.to} | ${options.subject}`);
    } catch (err) {
      this.logger.error(`Failed to send real email to ${options.to}: ${(err as any).message}`);
    }
  }

  /** Send an OTP verification email to verify email on registration / partner application. */
  async sendRegistrationOtp(to: string, name: string, otp: string, purpose = 'Account Registration'): Promise<void> {
    await this.send({
      to,
      subject: '🔐 Your Dream Destination Verification Code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
          <div style="text-align:center;margin-bottom:24px">
            <h1 style="color:#0ea5e9;margin:0;font-size:24px">✈️ Dream Destination</h1>
          </div>
          <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e2e8f0">
            <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px">Hi ${name},</h2>
            <p style="color:#475569;font-size:15px;margin:0 0 24px">
              Please use the verification code below to verify your email address for <strong>${purpose}</strong>. It expires in <strong>5 minutes</strong>.
            </p>
            <div style="background:#f0f9ff;border:2px dashed #0ea5e9;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px">
              <div style="font-size:40px;font-weight:900;letter-spacing:12px;color:#0284c7">${otp}</div>
              <div style="font-size:12px;color:#64748b;margin-top:8px">One-Time Verification Code · Valid for 5 minutes</div>
            </div>
            <p style="color:#94a3b8;font-size:13px;margin:0">
              If you did not request this verification code, please ignore this email.
            </p>
          </div>
          <p style="text-align:center;color:#cbd5e1;font-size:12px;margin-top:20px">
            © Dream Destination Travel Platform
          </p>
        </div>
      `,
    });
  }

  /** Send an employee invitation email with login credentials. */
  async sendEmployeeInvitation(to: string, name: string, role: string, password: string): Promise<void> {
    await this.send({
      to,
      subject: '🎉 Welcome to Dream Destination – Your Employee Account is Ready',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
          <div style="text-align:center;margin-bottom:24px">
            <h1 style="color:#0ea5e9;margin:0;font-size:24px">✈️ Dream Destination</h1>
          </div>
          <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e2e8f0">
            <h2 style="margin:0 0 8px;color:#0f172a">Welcome, ${name}! 👋</h2>
            <p style="color:#475569;font-size:15px;margin:0 0 20px">
              Your employee account has been created by the Super Admin. You can now log in to the Dream Destination platform.
            </p>
            <div style="background:#f0f9ff;border-radius:10px;padding:20px;margin-bottom:20px;border:1px solid #bae6fd">
              <div style="margin-bottom:12px">
                <span style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase">Role</span>
                <div style="font-size:16px;font-weight:700;color:#0284c7;margin-top:4px">${role}</div>
              </div>
              <div style="margin-bottom:12px">
                <span style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase">Login Email</span>
                <div style="font-size:15px;font-weight:600;color:#0f172a;margin-top:4px">${to}</div>
              </div>
              <div>
                <span style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase">Temporary Password</span>
                <div style="font-size:18px;font-weight:900;letter-spacing:4px;color:#0f172a;margin-top:4px;background:#e0f2fe;padding:8px 14px;border-radius:6px;display:inline-block">${password}</div>
              </div>
            </div>
            <p style="color:#dc2626;font-size:13px;font-weight:600;margin:0 0 16px">
              ⚠️ Please change your password after your first login.
            </p>
            <a href="http://localhost:5173/login" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
              Login to Dashboard →
            </a>
          </div>
          <p style="text-align:center;color:#cbd5e1;font-size:12px;margin-top:20px">
            © Dream Destination Travel Platform
          </p>
        </div>
      `,
    });
  }

  /** Send an approval confirmation email to an external business partner. */
  async sendPartnerApproval(to: string, name: string, role: string): Promise<void> {
    await this.send({
      to,
      subject: '✅ Your Business Partner Application Has Been Approved!',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
          <div style="text-align:center;margin-bottom:24px">
            <h1 style="color:#0ea5e9;margin:0;font-size:24px">✈️ Dream Destination</h1>
          </div>
          <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e2e8f0">
            <div style="width:48px;height:48px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:24px">
              ✅
            </div>
            <h2 style="margin:0 0 8px;color:#0f172a">Congratulations, ${name}!</h2>
            <p style="color:#475569;font-size:15px;margin:0 0 20px">
              Your application to join Dream Destination as a <strong>${role}</strong> has been reviewed and <span style="color:#16a34a;font-weight:700">APPROVED</span> by the Super User.
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px">
              <div style="font-size:14px;color:#15803d;font-weight:600">Your account is now ACTIVE</div>
              <div style="font-size:13px;color:#4b5563;margin-top:4px">You can sign in using the email and password you provided during application.</div>
            </div>
            <a href="http://localhost:5173/login" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
              Sign In to Your Dashboard →
            </a>
          </div>
          <p style="text-align:center;color:#cbd5e1;font-size:12px;margin-top:20px">
            © Dream Destination Travel Platform
          </p>
        </div>
      `,
    });
  }

  /** Send a rejection notice email to an external business partner. */
  async sendPartnerRejection(to: string, name: string, role: string, reason: string): Promise<void> {
    await this.send({
      to,
      subject: 'Update on Your Business Partner Application',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
          <div style="text-align:center;margin-bottom:24px">
            <h1 style="color:#0ea5e9;margin:0;font-size:24px">✈️ Dream Destination</h1>
          </div>
          <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e2e8f0">
            <h2 style="margin:0 0 8px;color:#0f172a">Hello ${name},</h2>
            <p style="color:#475569;font-size:15px;margin:0 0 16px">
              Thank you for your interest in joining Dream Destination as a <strong>${role}</strong>.
            </p>
            <p style="color:#475569;font-size:15px;margin:0 0 20px">
              After careful review, we regret to inform you that we are unable to approve your application at this time.
            </p>
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:20px">
              <div style="font-size:13px;color:#991b1b;font-weight:600">Reason for Decision:</div>
              <div style="font-size:14px;color:#b91c1c;margin-top:4px">${reason}</div>
            </div>
            <p style="color:#64748b;font-size:13px;margin:0">
              If you have any questions or would like to submit updated documentation, please contact our support team.
            </p>
          </div>
          <p style="text-align:center;color:#cbd5e1;font-size:12px;margin-top:20px">
            © Dream Destination Travel Platform
          </p>
        </div>
      `,
    });
  }
}
