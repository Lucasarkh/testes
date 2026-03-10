import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync
} from 'crypto';

/**
 * EncryptionService — AES-256-GCM field-level encryption.
 *
 * Stores encrypted values as: `iv:authTag:ciphertext` (all hex-encoded).
 * - iv      : 12 random bytes per encryption call (never reused)
 * - authTag : 16 bytes — detects any tampering with the ciphertext
 *
 * Required env var:
 *   ENCRYPTION_KEY — at least 32 characters of random entropy.
 *   Generate one with:
 *     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * WARNING: Changing ENCRYPTION_KEY makes all existing encrypted values
 * unreadable. Always back up the previous key before rotating.
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);

  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12; // 96-bit IV recommended for GCM
  private static readonly AUTH_TAG_LENGTH = 16;
  private static readonly SEPARATOR = ':';

  // AES-256-GCM requires exactly 32 bytes.
  // scrypt is used to derive a stable 32-byte key regardless of input length.
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const rawSecret = this.config.get<string>('ENCRYPTION_KEY');
    if (!rawSecret || rawSecret.length < 32) {
      throw new Error(
        '[EncryptionService] ENCRYPTION_KEY must be set and at least 32 characters long. ' +
          "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
      );
    }

    // Fixed salt — change only if you intend to force a full re-encryption.
    const salt = Buffer.from('intelligence-of-things-v1', 'utf8');
    this.key = scryptSync(rawSecret, salt, 32);

    this.logger.log('EncryptionService ready (AES-256-GCM)');
  }

  /**
   * Encrypts a plaintext string.
   * Returns a `iv:authTag:ciphertext` hex string, or null if input is falsy.
   */
  encrypt(plaintext: string | null | undefined): string | null {
    if (!plaintext) return null;

    const iv = randomBytes(EncryptionService.IV_LENGTH);
    const cipher = createCipheriv(EncryptionService.ALGORITHM, this.key, iv, {
      authTagLength: EncryptionService.AUTH_TAG_LENGTH
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);

    return [
      iv.toString('hex'),
      cipher.getAuthTag().toString('hex'),
      encrypted.toString('hex')
    ].join(EncryptionService.SEPARATOR);
  }

  /**
   * Decrypts a value produced by `encrypt()`.
   *
   * Graceful fallback: if the value is not in `iv:authTag:ciphertext` format
   * it is returned as-is (allows existing plaintext rows to keep working
   * while they are gradually re-encrypted on next save).
   */
  decrypt(encryptedValue: string | null | undefined): string | null {
    if (!encryptedValue) return null;

    const parts = encryptedValue.split(EncryptionService.SEPARATOR);

    if (parts.length !== 3) {
      this.logger.warn(
        'decrypt() received a value that is not in encrypted format — returning as-is. ' +
          'Re-save this record to encrypt it.'
      );
      return encryptedValue;
    }

    try {
      const [ivHex, authTagHex, ciphertextHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const ciphertext = Buffer.from(ciphertextHex, 'hex');

      const decipher = createDecipheriv(
        EncryptionService.ALGORITHM,
        this.key,
        iv,
        { authTagLength: EncryptionService.AUTH_TAG_LENGTH }
      );
      decipher.setAuthTag(authTag);

      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]).toString('utf8');
    } catch (err) {
      this.logger.error(
        'Failed to decrypt value — key mismatch or data corruption.',
        (err as Error)?.message
      );
      return null;
    }
  }

  /**
   * Encrypts a JSON-serializable object. Returns null if input is falsy.
   */
  encryptJson(data: Record<string, any> | null | undefined): string | null {
    if (!data) return null;
    return this.encrypt(JSON.stringify(data));
  }

  /**
   * Decrypts a value produced by `encryptJson()`.
   * Returns null if the input is null or cannot be parsed.
   */
  decryptJson<T = Record<string, any>>(
    encryptedValue: string | null | undefined
  ): T | null {
    const decrypted = this.decrypt(encryptedValue);
    if (!decrypted) return null;

    try {
      return JSON.parse(decrypted) as T;
    } catch {
      this.logger.error(
        'decryptJson() could not parse the decrypted value as JSON.'
      );
      return null;
    }
  }

  /**
   * Returns true if the value appears to be an encrypted blob from this service.
   */
  isEncrypted(value: string | null | undefined): boolean {
    if (!value) return false;
    return value.split(EncryptionService.SEPARATOR).length === 3;
  }
}
