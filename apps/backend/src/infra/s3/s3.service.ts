import {
  Injectable,
  Logger,
  ServiceUnavailableException
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly assetBaseUrl: string | null;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get('AWS_REGION', 'us-east-1');
    this.bucketName = this.configService.get('AWS_S3_BUCKET', 'lot-uploads');
    this.assetBaseUrl = this.normalizeBaseUrl(
      this.configService.get('ASSET_CDN_BASE_URL') ||
        this.configService.get('ASSET_BASE_URL')
    );

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY', '')
      }
    });
  }

  // ── helpers ──────────────────────────────────────────────

  private normalizeBaseUrl(value?: string | null): string | null {
    const trimmed = String(value || '').trim().replace(/\/+$/g, '');
    if (!trimmed) return null;

    try {
      return new URL(trimmed).toString().replace(/\/+$/g, '');
    } catch {
      this.logger.warn(`Ignoring invalid asset base URL: ${trimmed}`);
      return null;
    }
  }

  private publicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  hasPublicAssetBaseUrl(): boolean {
    return Boolean(this.assetBaseUrl);
  }

  publicAssetUrl(key: string): string {
    const normalizedKey = String(key || '').replace(/^\/+/, '');
    if (!this.assetBaseUrl) return this.publicUrl(normalizedKey);
    return `${this.assetBaseUrl}/${normalizedKey}`;
  }

  resolvePublicAssetUrl(url?: string | null): string | null {
    const trimmed = String(url || '').trim();
    if (!trimmed) return null;

    const key = this.keyFromUrl(trimmed);
    if (!key) return trimmed;

    return this.publicAssetUrl(key);
  }

  /**
   * Build a scoped S3 key.
   * Pattern: tenants/{tenantId}/{folder}/{uuid}.{ext}
   */
  buildKey(tenantId: string, folder: string, originalName: string): string {
    // Sanitize folder to prevent path traversal
    const sanitizedFolder = folder
      .replace(/\.\./g, '') // Remove ..
      .replace(/[^\w\-/]/g, '-') // Allow only alphanumeric, dashes, and slashes
      .replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes

    const ext = originalName.split('.').pop()?.replace(/[^\w]/g, '') ?? 'bin';
    return `tenants/${tenantId}/${sanitizedFolder}/${uuid()}.${ext}`;
  }

  // ── upload ───────────────────────────────────────────────

  /** Direct upload (backend receives the file first). */
  async upload(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<string> {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType
        })
      );
      const url = this.publicUrl(key);
      this.logger.log(`Uploaded ${key}`);
      return url;
    } catch (err) {
      this.logger.error('Upload failed', err);
      throw new ServiceUnavailableException('Falha ao fazer upload do arquivo');
    }
  }

  // ── delete ───────────────────────────────────────────────

  async delete(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({ Bucket: this.bucketName, Key: key })
      );
      this.logger.log(`Deleted ${key}`);
    } catch (err) {
      this.logger.error('Delete failed', err);
      throw new ServiceUnavailableException('Falha ao deletar arquivo');
    }
  }

  // ── presigned URLs ───────────────────────────────────────

  async presignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSec = 300
  ): Promise<{ url: string; key: string; publicUrl: string }> {
    try {
      const cmd = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType
      });
      const url = await getSignedUrl(this.s3Client, cmd, {
        expiresIn: expiresInSec
      });
      return { url, key, publicUrl: this.publicUrl(key) };
    } catch (err) {
      this.logger.error('Presigned upload URL failed', err);
      throw new ServiceUnavailableException('Falha ao gerar URL de upload');
    }
  }

  async presignedDownloadUrl(key: string, expiresInSec = 300): Promise<string> {
    try {
      const cmd = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
      return await getSignedUrl(this.s3Client, cmd, {
        expiresIn: expiresInSec
      });
    } catch (err) {
      this.logger.error('Presigned download URL failed', err);
      throw new ServiceUnavailableException('Falha ao gerar URL de download');
    }
  }

  // ── existence check ──────────────────────────────────────

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({ Bucket: this.bucketName, Key: key })
      );
      return true;
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  /** Extract the S3 key from a full public URL. */
  keyFromUrl(url: string): string | null {
    const trimmed = String(url || '').trim();
    if (!trimmed) return null;

    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      const bucket = this.bucketName.toLowerCase();
      const region = this.region.toLowerCase();
      const pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');

      if (this.assetBaseUrl) {
        const assetBase = new URL(this.assetBaseUrl);
        const assetHost = assetBase.hostname.toLowerCase();
        const assetBasePath = decodeURIComponent(assetBase.pathname).replace(
          /^\/+|\/+$/g,
          ''
        );

        if (host === assetHost) {
          if (!assetBasePath) {
            return pathname || null;
          }

          const lowerPathname = pathname.toLowerCase();
          const lowerBasePath = assetBasePath.toLowerCase();
          const expectedPrefix = `${lowerBasePath}/`;

          if (lowerPathname.startsWith(expectedPrefix)) {
            return pathname.slice(assetBasePath.length + 1) || null;
          }
        }
      }

      const virtualHostedHosts = new Set([
        `${bucket}.s3.${region}.amazonaws.com`,
        `${bucket}.s3-${region}.amazonaws.com`,
        `${bucket}.s3.amazonaws.com`
      ]);

      if (parsed.protocol === 's3:' && host === bucket) {
        return pathname || null;
      }

      if (virtualHostedHosts.has(host)) {
        return pathname || null;
      }

      const pathStyleHosts = new Set([
        `s3.${region}.amazonaws.com`,
        `s3-${region}.amazonaws.com`,
        's3.amazonaws.com'
      ]);

      if (pathStyleHosts.has(host)) {
        const expectedPrefix = `${bucket}/`;
        if (!pathname.toLowerCase().startsWith(expectedPrefix)) {
          return null;
        }
        return pathname.slice(expectedPrefix.length) || null;
      }
    } catch {
      return null;
    }

    return null;
  }
}
