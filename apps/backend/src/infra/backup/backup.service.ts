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
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createGzip, createGunzip } from 'zlib';

type DatabaseConnection = {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
};

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

  private getDatabaseConnection(): DatabaseConnection {
    const dbUrl = this.configService.get('DATABASE_URL');
    if (!dbUrl) {
      throw new Error('DATABASE_URL não configurada');
    }

    const url = new URL(dbUrl);

    return {
      host: url.hostname,
      port: url.port || '5432',
      database: url.pathname.slice(1),
      username: url.username,
      password: url.password
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private unlinkIfExists(filePath: string) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  private toNodeReadable(body: unknown): Readable {
    if (body instanceof Readable) {
      return body;
    }

    if (
      body &&
      typeof body === 'object' &&
      'transformToWebStream' in body &&
      typeof body.transformToWebStream === 'function'
    ) {
      return Readable.fromWeb(body.transformToWebStream());
    }

    if (body && typeof body === 'object' && 'pipe' in body) {
      return body as Readable;
    }

    throw new Error('Resposta do S3 não retornou um stream legível');
  }

  private async dumpDatabaseToGzip(
    connection: DatabaseConnection,
    outputPath: string
  ): Promise<void> {
    const dumpProcess = spawn(
      'pg_dump',
      [
        '-h',
        connection.host,
        '-p',
        connection.port,
        '-U',
        connection.username,
        '-d',
        connection.database,
        '--no-owner',
        '--no-acl'
      ],
      {
        env: { ...process.env, PGPASSWORD: connection.password },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    const stderrChunks: string[] = [];
    dumpProcess.stderr.on('data', (chunk: Buffer | string) => {
      stderrChunks.push(chunk.toString());
    });

    const exitPromise = new Promise<void>((resolve, reject) => {
      dumpProcess.once('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') {
          reject(
            new Error('pg_dump não está disponível no ambiente do backend')
          );
          return;
        }

        reject(error);
      });

      dumpProcess.once('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        const stderr = stderrChunks.join('').trim();
        reject(
          new Error(stderr || `pg_dump finalizou com código ${code ?? 'desconhecido'}`)
        );
      });
    });

    await Promise.all([
      pipeline(dumpProcess.stdout, createGzip(), fs.createWriteStream(outputPath)),
      exitPromise
    ]);
  }

  private async unzipBackup(inputPath: string, outputPath: string): Promise<void> {
    await pipeline(
      fs.createReadStream(inputPath),
      createGunzip(),
      fs.createWriteStream(outputPath)
    );
  }

  private async restoreDatabaseFromSql(
    connection: DatabaseConnection,
    sqlPath: string
  ): Promise<void> {
    const restoreProcess = spawn(
      'psql',
      [
        '-h',
        connection.host,
        '-p',
        connection.port,
        '-U',
        connection.username,
        '-d',
        connection.database,
        '-v',
        'ON_ERROR_STOP=1',
        '-f',
        sqlPath
      ],
      {
        env: { ...process.env, PGPASSWORD: connection.password },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    const outputChunks: string[] = [];

    restoreProcess.stdout.on('data', (chunk: Buffer | string) => {
      outputChunks.push(chunk.toString());
    });

    restoreProcess.stderr.on('data', (chunk: Buffer | string) => {
      outputChunks.push(chunk.toString());
    });

    await new Promise<void>((resolve, reject) => {
      restoreProcess.once('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') {
          reject(new Error('psql não está disponível no ambiente do backend'));
          return;
        }

        reject(error);
      });

      restoreProcess.once('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        const output = outputChunks.join('').trim();
        reject(
          new Error(output || `psql finalizou com código ${code ?? 'desconhecido'}`)
        );
      });
    });
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
      const connection = this.getDatabaseConnection();

      this.logger.debug(
        `Executando pg_dump para ${connection.database}@${connection.host}...`
      );

      await this.dumpDatabaseToGzip(connection, tempPath);

      // Check if file was created
      if (!fs.existsSync(tempPath)) {
        throw new Error('Arquivo de backup não foi criado');
      }

      const stats = fs.statSync(tempPath);
      if (stats.size === 0) {
        throw new Error('Arquivo de backup foi gerado vazio');
      }

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
            database: connection.database,
            'compressed-size-bytes': String(stats.size)
          }
        })
      );

      this.logger.log(`Backup enviado para S3: ${s3Key}`);

      // Remove temp file
      this.unlinkIfExists(tempPath);

      return { success: true, key: s3Key };
    } catch (error) {
      this.logger.error(`Erro ao criar backup (${label}):`, error);

      // Cleanup temp file if exists
      this.unlinkIfExists(tempPath);

      return { success: false, error: this.getErrorMessage(error) };
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
        (obj) => obj.Key && obj.LastModified && typeof obj.Size === 'number'
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
      if (!backupKey || !backupKey.startsWith(`${this.backupPrefix}/`)) {
        throw new Error('Chave de backup inválida');
      }

      const connection = this.getDatabaseConnection();

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
      await pipeline(
        this.toNodeReadable(getResponse.Body),
        fs.createWriteStream(tempPath)
      );

      const archiveStats = fs.statSync(tempPath);
      if (archiveStats.size === 0) {
        throw new Error('Backup baixado está vazio');
      }

      this.logger.log('Backup baixado, descompactando...');

      await this.unzipBackup(tempPath, sqlPath);

      // Verify file exists
      if (!fs.existsSync(sqlPath)) {
        throw new Error('Falha ao descompactar backup');
      }

      const stats = fs.statSync(sqlPath);
      if (stats.size === 0) {
        throw new Error('Backup restaurável está vazio após descompactação');
      }

      this.logger.log(
        `Backup descompactado: ${(stats.size / 1024 / 1024).toFixed(2)} MB`
      );

      // Restore database
      this.logger.warn('Iniciando restauração do banco de dados...');

      await this.restoreDatabaseFromSql(connection, sqlPath);

      this.logger.log('✅ Restauração concluída com sucesso!');

      return { success: true };
    } catch (error) {
      this.logger.error('❌ Erro ao restaurar backup:', error);

      return { success: false, error: this.getErrorMessage(error) };
    } finally {
      this.unlinkIfExists(tempPath);
      this.unlinkIfExists(sqlPath);
    }
  }
}
