import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class WhapiService {
  private readonly logger = new Logger(WhapiService.name);
  private readonly client: AxiosInstance;
  private readonly token: string;
  private readonly endpoint: string;
  private readonly defaultCountryCode: string;

  constructor(private readonly configService: ConfigService) {
    this.token = this.configService.get<string>('WHAPI_TOKEN') || '';
    this.endpoint =
      this.configService.get<string>('WHAPI_MESSAGES_ENDPOINT') ||
      'https://gate.whapi.cloud/messages/text';
    this.defaultCountryCode =
      this.configService.get<string>('WHAPI_DEFAULT_COUNTRY_CODE') || '55';

    const timeout = Number(this.configService.get<string>('WHAPI_TIMEOUT_MS') || 15000);

    this.client = axios.create({
      timeout,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!this.token) {
      this.logger.warn('WHAPI_TOKEN not configured. WhatsApp notifications are disabled.');
    }
  }

  isEnabled(): boolean {
    return !!this.token;
  }

  async sendText(to: string | null | undefined, body: string): Promise<boolean> {
    if (!this.isEnabled()) return false;
    if (!to || !body) return false;

    const normalizedTo = this.normalizePhone(to);
    if (!normalizedTo) {
      this.logger.warn(`Skipping WhatsApp send due to invalid phone: ${to}`);
      return false;
    }

    try {
      await this.client.post(this.endpoint, {
        to: normalizedTo,
        body,
      });
      return true;
    } catch (error: any) {
      const details = error?.response?.data || error?.message || 'unknown error';
      this.logger.error(`Failed to send WhatsApp to ${normalizedTo}: ${JSON.stringify(details)}`);
      return false;
    }
  }

  normalizePhone(rawPhone: string): string | null {
    const digits = rawPhone.replace(/\D/g, '');
    if (!digits) return null;

    const withCountry = digits.startsWith(this.defaultCountryCode)
      ? digits
      : `${this.defaultCountryCode}${digits}`;

    if (withCountry.length < 12 || withCountry.length > 14) {
      return null;
    }

    return `${withCountry}@c.us`;
  }
}
