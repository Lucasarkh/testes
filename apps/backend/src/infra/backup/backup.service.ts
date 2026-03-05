import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Readable } from 'stream';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly backupPrefix = 'database-backups';
  private readonly retentionDays = 30;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY')!
      }
    });
    this.bucketName = this.configService.get('AWS_S3_BUCKET')!;
  }

  /**
   * Backup 3x ao dia: 06h, 14h, 22h (somente em produção)
   */
  @Cron('0 0 6,14,22 * * *')
  async handlePeriodicBackup() {
    if (process.env.NODE_ENV !== 'production') return;
    await this.createBackup('periodic');
  }

  /**
   * Limpeza de backups antigos (executa 1x por dia às 03:00, somente em produção)
   */
  @Cron('0 0 3 * * *')
  async handleCleanup() {
    if (process.env.NODE_ENV !== 'production') return;
    await this.cleanupOldBackups();
  }

  /**
   * Cria um backup do banco de dados e envia para o S3
   */
  async createBackup(
    label: string = 'manual'
  ): Promise<{ success: boolean; key?: string; error?: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `lotio-backup-${timestamp}-${label}.sql.gz`;
    const tempPath = path.join(os.tmpdir(), filename);

    this.logger.log(`Iniciando backup do banco de dados (${label})...`);

    try {
      // Get database connection details from environment
      const dbUrl = this.configService.get('DATABASE_URL');
      if (!dbUrl) {
        throw new Error('DATABASE_URL não configurada');
      }

      // Parse DATABASE_URL
      const url = new URL(dbUrl);
      const host = url.hostname;
      const port = url.port || '5432';
      const database = url.pathname.slice(1);
      const username = url.username;
      const password = url.password;

      // Create pg_dump command with gzip compression
      const pgDumpCmd = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --no-owner --no-acl | gzip > "${tempPath}"`;

      this.logger.debug(`Executando pg_dump para ${database}@${host}...`);

      await execAsync(pgDumpCmd, {
        env: { ...process.env, PGPASSWORD: password }
      });

      // Check if file was created
      if (!fs.existsSync(tempPath)) {
        throw new Error('Arquivo de backup não foi criado');
      }

      const stats = fs.statSync(tempPath);
      this.logger.log(
        `Backup criado: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`
      );

      // Upload to S3
      const s3Key = `${this.backupPrefix}/${filename}`;
      const fileBuffer = fs.readFileSync(tempPath);

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: 'application/gzip',
          Metadata: {
            'backup-type': label,
            'backup-date': new Date().toISOString(),
            database: database
          }
        })
      );

      this.logger.log(`Backup enviado para S3: ${s3Key}`);

      // Remove temp file
      fs.unlinkSync(tempPath);

      return { success: true, key: s3Key };
    } catch (error) {
      this.logger.error(`Erro ao criar backup (${label}):`, error);

      // Cleanup temp file if exists
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Remove backups com mais de 30 dias
   */
  async cleanupOldBackups(): Promise<{ deleted: number }> {
    this.logger.log('Iniciando limpeza de backups antigos...');

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      // List all backup files
      const listResponse = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: this.backupPrefix
        })
      );

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        this.logger.debug('Nenhum backup encontrado');
        return { deleted: 0 };
      }

      let deletedCount = 0;

      for (const obj of listResponse.Contents) {
        if (obj.LastModified && obj.LastModified < cutoffDate) {
          await this.s3Client.send(
            new DeleteObjectCommand({
              Bucket: this.bucketName,
              Key: obj.Key
            })
          );

          this.logger.log(`Backup antigo removido: ${obj.Key}`);
          deletedCount++;
        }
      }

      this.logger.log(
        `Limpeza concluída: ${deletedCount} backup(s) removido(s)`
      );
      return { deleted: deletedCount };
    } catch (error) {
      this.logger.error('Erro ao limpar backups antigos:', error);
      return { deleted: 0 };
    }
  }

  /**
   * Lista todos os backups disponíveis
   */
  async listBackups(): Promise<{
    backups: Array<{
      key: string;
      size: number;
      lastModified: Date;
      label?: string;
    }>;
  }> {
    try {
      const listResponse = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: this.backupPrefix
        })
      );

      if (!listResponse.Contents) {
        return { backups: [] };
      }

      const backups = listResponse.Contents.filter(
        (obj) => obj.Key && obj.Size && obj.LastModified
      )
        .map((obj) => {
          // Extract label from filename (e.g., lotio-backup-2025-01-27T10-00-00-000Z-morning.sql.gz)
          const filename = obj.Key!.split('/').pop() || '';
          const labelMatch = filename.match(/-(\w+)\.sql\.gz$/);
          const label = labelMatch ? labelMatch[1] : 'unknown';

          return {
            key: obj.Key!,
            size: obj.Size!,
            lastModified: obj.LastModified!,
            label
          };
        })
        .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

      return { backups };
    } catch (error) {
      this.logger.error('Erro ao listar backups:', error);
      return { backups: [] };
    }
  }

  /**
   * Restaura um backup específico
   * ATENÇÃO: Esta operação irá sobrescrever todos os dados do banco!
   */
  async restoreBackup(
    backupKey: string
  ): Promise<{ success: boolean; error?: string }> {
    this.logger.warn(`⚠️ INICIANDO RESTAURAÇÃO DO BACKUP: ${backupKey}`);

    const tempPath = path.join(os.tmpdir(), 'restore-backup.sql.gz');
    const sqlPath = path.join(os.tmpdir(), 'restore-backup.sql');

    try {
      // Get database connection details from environment
      const dbUrl = this.configService.get('DATABASE_URL');
      if (!dbUrl) {
        throw new Error('DATABASE_URL não configurada');
      }

      // Parse DATABASE_URL
      const url = new URL(dbUrl);
      const host = url.hostname;
      const port = url.port || '5432';
      const database = url.pathname.slice(1);
      const username = url.username;
      const password = url.password;

      // Download backup from S3
      this.logger.log(`Baixando backup do S3: ${backupKey}`);

      const getResponse = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: backupKey
        })
      );

      if (!getResponse.Body) {
        throw new Error('Backup não encontrado ou vazio');
      }

      // Save to temp file
      const bodyStream = getResponse.Body as Readable;
      const writeStream = fs.createWriteStream(tempPath);

      await new Promise<void>((resolve, reject) => {
        bodyStream.pipe(writeStream);
        bodyStream.on('error', reject);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });

      this.logger.log('Backup baixado, descompactando...');

      // Decompress gzip
      await execAsync(`gunzip -c "${tempPath}" > "${sqlPath}"`, {
        shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'
      });

      // Verify file exists
      if (!fs.existsSync(sqlPath)) {
        throw new Error('Falha ao descompactar backup');
      }

      const stats = fs.statSync(sqlPath);
      this.logger.log(
        `Backup descompactado: ${(stats.size / 1024 / 1024).toFixed(2)} MB`
      );

      // Restore database
      this.logger.warn('Iniciando restauração do banco de dados...');

      const restoreCmd = `psql -h ${host} -p ${port} -U ${username} -d ${database} -f "${sqlPath}"`;

      await execAsync(restoreCmd, {
        env: { ...process.env, PGPASSWORD: password }
      });

      this.logger.log('✅ Restauração concluída com sucesso!');

      // Cleanup temp files
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);

      return { success: true };
    } catch (error) {
      this.logger.error('❌ Erro ao restaurar backup:', error);

      // Cleanup temp files
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);

      return { success: false, error: error.message };
    }
  }
}
