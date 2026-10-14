import { Injectable } from '@nestjs/common';

interface OtpRecord {
  otp: string;
  name: string;
  expiresAt: number;
  used: boolean;
}

@Injectable()
export class OtpService {
  /** In-memory OTP store: email → record */
  private readonly store = new Map<string, OtpRecord>();
  private readonly EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  /** Generate a 6-digit numeric OTP and store it. */
  generate(email: string, name: string): string {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    this.store.set(email.toLowerCase(), {
      otp,
      name,
      expiresAt: Date.now() + this.EXPIRY_MS,
      used: false,
    });
    return otp;
  }

  /** Verify OTP. Returns true if valid and marks it as used. */
  verify(email: string, otp: string): { valid: boolean; message: string } {
    const key = email.toLowerCase();
    const record = this.store.get(key);

    if (!record) return { valid: false, message: 'No OTP found. Please log in again to receive a new OTP.' };
    if (record.used) return { valid: false, message: 'This OTP has already been used. Please log in again.' };
    if (Date.now() > record.expiresAt) {
      this.store.delete(key);
      return { valid: false, message: 'OTP has expired. Please log in again to receive a new OTP.' };
    }
    if (record.otp !== otp.trim()) return { valid: false, message: 'Incorrect OTP. Please check your email and try again.' };

    record.used = true;
    this.store.delete(key);
    return { valid: true, message: 'OTP verified.' };
  }

  /** Check if there is a pending (unused, non-expired) OTP for this email. */
  hasPending(email: string): boolean {
    const record = this.store.get(email.toLowerCase());
    return !!record && !record.used && Date.now() <= record.expiresAt;
  }

  /** Invalidate any existing OTP for this email (used on new login attempt). */
  invalidate(email: string): void {
    this.store.delete(email.toLowerCase());
  }
}
