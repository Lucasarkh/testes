import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createReadStream, existsSync, unlink } from 'node:fs';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@infra/db/prisma.service';
import { RabbitMqService } from '@infra/rabbitmq/rabbitmq.service';

const unlinkAsync = promisify(unlink);
const LOT_IMPORT_QUEUE = 'lots-csv-import';
const DEFAULT_CHUNK_SIZE = 1000;
const TERMINAL_IMPORT_STATUSES = new Set([
  'COMPLETED',
  'COMPLETED_WITH_ERRORS',
  'FAILED'
]);
const HEADER_ALIASES = {
  code: ['code', 'codigo', 'codigolote', 'cod'],
  status: ['status', 'situacao', 'lotstatus'],
  block: ['block', 'quadra'],
  lotNumber: ['lotnumber', 'lote', 'numerolote', 'numero'],
  areaM2: ['aream2', 'area', 'area_m2'],
  price: ['price', 'preco', 'valor', 'valortotal', 'valor_total'],
  pricePerM2: ['priceperm2', 'valorm2', 'valor_m2', 'precom2', 'precoporm2'],
  frontage: ['frontage', 'frente'],
  depth: ['depth', 'fundo', 'profundidade'],
  sideLeft: ['sideleft', 'lateral_esquerda', 'lateralesquerda', 'esquerda'],
  sideRight: ['sideright', 'lateral_direita', 'lateraldireita', 'direita'],
  slope: ['slope', 'topografia', 'inclinacao'],
  tags: ['tags', 'etiquetas'],
  notes: ['notes', 'observacoes', 'obs', 'descricao']
} as const;

type ImportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_ERRORS'
  | 'FAILED';

interface CsvImportQueueJob {
  importId: string;
  tenantId: string;
  projectId: string;
  filePath: string;
}

interface CsvRowCandidate {
  line: number;
  code: string;
  status: string | null;
  block: string | null;
  lotNumber: string | null;
  price: number | null;
  pricePerM2: number | null;
  areaM2: number | null;
  frontage: number | null;
  depth: number | null;
  sideLeft: number | null;
  sideRight: number | null;
  slope: string | null;
  notes: string | null;
  tags: string[] | null;
  raw: Record<string, string>;
}

interface CsvImportError {
  line: number;
  code?: string | null;
  message: string;
  raw?: Record<string, string> | null;
}

interface ImportCounters {
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
}

@Injectable()
export class LotsImportService implements OnModuleInit {
  private readonly logger = new Logger(LotsImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMqService: RabbitMqService
  ) {}

  async onModuleInit() {
    await this.rabbitMqService.createConsumer({
      queue: LOT_IMPORT_QUEUE,
      prefetch: 1,
      withDeadLetter: true,
      onMessage: async (payload: unknown) => {
        if (!this.isValidQueueJob(payload)) {
          throw new Error('Invalid lot import job payload');
        }
        await this.processQueuedImport(payload);
      }
    });

    this.logger.log('Lot CSV import consumer started');
  }

  async enqueueCsvImport(params: {
    tenantId: string;
    projectId: string;
    createdById?: string;
    fileName: string;
    filePath: string;
  }) {
    const { tenantId, projectId, createdById, fileName, filePath } = params;

    await this.ensureProjectHasLots(tenantId, projectId);

    const running = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "LotImportJob"
      WHERE "tenantId" = ${tenantId}
        AND "projectId" = ${projectId}
        AND status IN ('PENDING', 'PROCESSING')
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    if (running.length > 0) {
      throw new ConflictException(
        'Ja existe uma importacao em andamento para este projeto.'
      );
    }

    const importId = this.createImportId();
    const created = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO "LotImportJob" (
        id, "tenantId", "projectId", "createdById", "fileName", status,
        "totalRows", "processedRows", "successRows", "errorRows", "createdAt", "updatedAt"
      ) VALUES (
        ${importId}, ${tenantId}, ${projectId}, ${createdById ?? null}, ${fileName}, 'PENDING',
        0, 0, 0, 0, NOW(), NOW()
      )
      RETURNING id, "tenantId", "projectId", "createdById", "fileName", status,
        "totalRows", "processedRows", "successRows", "errorRows", message,
        "startedAt", "finishedAt", "createdAt", "updatedAt"
    `;

    await this.rabbitMqService.sendToQueue(
      LOT_IMPORT_QUEUE,
      {
        importId,
        tenantId,
        projectId,
        filePath
      } satisfies CsvImportQueueJob,
      { withDeadLetter: true }
    );

    return this.mapJob(created[0]);
  }

  async getImportStatus(tenantId: string, projectId: string, importId: string) {
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, "tenantId", "projectId", "createdById", "fileName", status,
        "totalRows", "processedRows", "successRows", "errorRows", message,
        "startedAt", "finishedAt", "createdAt", "updatedAt"
      FROM "LotImportJob"
      WHERE id = ${importId}
        AND "tenantId" = ${tenantId}
        AND "projectId" = ${projectId}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Importacao nao encontrada.');
    }

    const recentErrors = await this.prisma.$queryRaw<
      Array<Record<string, unknown>>
    >`
      SELECT id, line, code, message, raw, "createdAt"
      FROM "LotImportError"
      WHERE "importId" = ${importId}
      ORDER BY line ASC
      LIMIT 30
    `;

    return {
      ...this.mapJob(row),
      recentErrors: recentErrors.map(this.mapError),
      terminal: TERMINAL_IMPORT_STATUSES.has(String(row.status || ''))
    };
  }

  async getLatestImport(tenantId: string, projectId: string) {
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, "tenantId", "projectId", "createdById", "fileName", status,
        "totalRows", "processedRows", "successRows", "errorRows", message,
        "startedAt", "finishedAt", "createdAt", "updatedAt"
      FROM "LotImportJob"
      WHERE "tenantId" = ${tenantId}
        AND "projectId" = ${projectId}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      ...this.mapJob(row),
      terminal: TERMINAL_IMPORT_STATUSES.has(String(row.status || ''))
    };
  }

  async getImportErrors(
    tenantId: string,
    projectId: string,
    importId: string,
    limit = 500
  ) {
    await this.ensureImportOwnership(tenantId, projectId, importId);

    const safeLimit = Math.max(1, Math.min(5000, Number(limit) || 500));
    const errors = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, line, code, message, raw, "createdAt"
      FROM "LotImportError"
      WHERE "importId" = ${importId}
      ORDER BY line ASC
      LIMIT ${safeLimit}
    `;

    return errors.map(this.mapError);
  }

  private async processQueuedImport(job: CsvImportQueueJob) {
    const counters: ImportCounters = {
      totalRows: 0,
      processedRows: 0,
      successRows: 0,
      errorRows: 0
    };

    const errorsBuffer: CsvImportError[] = [];

    try {
      await this.updateImportState(job.importId, {
        status: 'PROCESSING',
        message: 'Processando arquivo CSV em lotes...',
        startedAtNow: true
      });

      if (!existsSync(job.filePath)) {
        throw new Error('Arquivo temporario da importacao nao foi encontrado.');
      }

      await this.processCsvFile(job, counters, errorsBuffer);

      if (errorsBuffer.length > 0) {
        await this.flushErrors(job.importId, errorsBuffer);
      }

      const finalStatus: ImportStatus =
        counters.errorRows > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';
      const message =
        finalStatus === 'COMPLETED'
          ? 'Importacao concluida com sucesso.'
          : 'Importacao concluida com erros. Revise o relatorio.';

      await this.updateImportState(job.importId, {
        status: finalStatus,
        counters,
        message,
        finishedAtNow: true
      });
    } catch (error: any) {
      this.logger.error(
        `Lot import failed (${job.importId})`,
        error?.stack || String(error)
      );

      if (errorsBuffer.length > 0) {
        await this.flushErrors(job.importId, errorsBuffer).catch(
          () => undefined
        );
      }

      await this.updateImportState(job.importId, {
        status: 'FAILED',
        counters,
        message: error?.message || 'Falha ao processar importacao.',
        finishedAtNow: true
      }).catch(() => undefined);

      throw error;
    } finally {
      await this.cleanupTempFile(job.filePath);
    }
  }

  private async processCsvFile(
    job: CsvImportQueueJob,
    counters: ImportCounters,
    errorsBuffer: CsvImportError[]
  ) {
    const stream = createReadStream(job.filePath, { encoding: 'utf8' });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    let headerMap: Map<string, number> | null = null;
    let delimiter = ',';
    let chunk: CsvRowCandidate[] = [];
    let lineNumber = 0;

    for await (const line of rl) {
      lineNumber += 1;
      if (!line.trim()) continue;

      if (!headerMap) {
        delimiter = this.detectDelimiter(line);
        const header = this.parseCsvLine(line, delimiter).map((c) =>
          this.normalizeHeader(c)
        );
        headerMap = new Map(header.map((key, index) => [key, index]));

        const hasCodeColumn = HEADER_ALIASES.code.some((alias) =>
          headerMap?.has(alias)
        );
        if (!hasCodeColumn) {
          throw new BadRequestException(
            'CSV invalido: cabecalho obrigatorio "codigo" nao encontrado.'
          );
        }
        continue;
      }

      counters.totalRows += 1;

      const cols = this.parseCsvLine(line, delimiter);
      const rowRaw = this.mapRawRow(cols, headerMap);
      const normalized = this.normalizeCsvRow(rowRaw, lineNumber);

      if (normalized.error) {
        counters.errorRows += 1;
        errorsBuffer.push(normalized.error);
      } else if (normalized.row) {
        chunk.push(normalized.row);
      }

      if (errorsBuffer.length >= DEFAULT_CHUNK_SIZE) {
        await this.flushErrors(job.importId, errorsBuffer);
      }

      if (chunk.length >= DEFAULT_CHUNK_SIZE) {
        await this.processChunk(job, chunk, counters, errorsBuffer);
        chunk = [];

        await this.updateImportState(job.importId, {
          counters,
          message: `Processadas ${counters.processedRows} linhas...`
        });
      }
    }

    if (chunk.length > 0) {
      await this.processChunk(job, chunk, counters, errorsBuffer);
      chunk = [];
    }

    await this.updateImportState(job.importId, {
      counters,
      message: `Arquivo lido. ${counters.processedRows} linhas processadas.`
    });
  }

  private async processChunk(
    job: CsvImportQueueJob,
    rows: CsvRowCandidate[],
    counters: ImportCounters,
    errorsBuffer: CsvImportError[]
  ) {
    if (rows.length === 0) return;

    const uniqueCodes = Array.from(
      new Set(rows.map((row) => this.normalizeCode(row.code)))
    );

    const mapElements = await this.prisma.$queryRaw<
      Array<{ id: string; code: string }>
    >`
      SELECT id, code
      FROM "MapElement"
      WHERE "tenantId" = ${job.tenantId}
        AND "projectId" = ${job.projectId}
        AND type = 'LOT'
        AND UPPER(TRIM(code)) IN (${Prisma.join(uniqueCodes)})
    `;

    const codeToElementId = new Map(
      mapElements.map((item) => [this.normalizeCode(item.code), item.id])
    );
    const upsertRows: Array<Record<string, unknown>> = [];

    for (const row of rows) {
      const codeKey = this.normalizeCode(row.code);
      const mapElementId = codeToElementId.get(codeKey);

      if (!mapElementId) {
        counters.errorRows += 1;
        errorsBuffer.push({
          line: row.line,
          code: row.code,
          message: `Codigo nao encontrado: ${this.formatInvalidValue(row.code)}. Use o mesmo codigo do lote criado na Planta Interativa (comparacao sem diferenciar maiusculas/minusculas).`,
          raw: row.raw
        });
        continue;
      }

      upsertRows.push({
        id: uuidv4(),
        tenantId: job.tenantId,
        projectId: job.projectId,
        mapElementId,
        status: row.status,
        block: row.block,
        lotNumber: row.lotNumber,
        price: row.price,
        pricePerM2: row.pricePerM2,
        areaM2: row.areaM2,
        frontage: row.frontage,
        depth: row.depth,
        sideLeft: row.sideLeft,
        sideRight: row.sideRight,
        slope: row.slope,
        notes: row.notes,
        tags: row.tags
      });
    }

    if (upsertRows.length > 0) {
      await this.bulkUpsertLotDetails(upsertRows);
    }

    counters.processedRows += rows.length;
    counters.successRows += upsertRows.length;
  }

  private async bulkUpsertLotDetails(rows: Array<Record<string, unknown>>) {
    const payload = JSON.stringify(rows);

    await this.prisma.$executeRawUnsafe(
      `
      WITH data AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS x(
          id text,
          "tenantId" text,
          "projectId" text,
          "mapElementId" text,
          status text,
          block text,
          "lotNumber" text,
          price numeric,
          "pricePerM2" numeric,
          "areaM2" double precision,
          frontage double precision,
          depth double precision,
          "sideLeft" double precision,
          "sideRight" double precision,
          slope text,
          notes text,
          tags jsonb
        )
      )
      INSERT INTO "LotDetails" (
        id,
        "tenantId",
        "projectId",
        "mapElementId",
        status,
        block,
        "lotNumber",
        price,
        "pricePerM2",
        "areaM2",
        frontage,
        depth,
        "sideLeft",
        "sideRight",
        slope,
        notes,
        tags,
        "createdAt",
        "updatedAt"
      )
      SELECT
        data.id,
        data."tenantId",
        data."projectId",
        data."mapElementId",
        COALESCE(NULLIF(data.status, ''), 'AVAILABLE')::"LotStatus",
        NULLIF(data.block, ''),
        NULLIF(data."lotNumber", ''),
        data.price,
        data."pricePerM2",
        data."areaM2",
        data.frontage,
        data.depth,
        data."sideLeft",
        data."sideRight",
        COALESCE(NULLIF(data.slope, ''), 'FLAT')::"SlopeType",
        NULLIF(data.notes, ''),
        COALESCE(
          (SELECT ARRAY(SELECT jsonb_array_elements_text(data.tags))),
          ARRAY[]::text[]
        ),
        NOW(),
        NOW()
      FROM data
      ON CONFLICT ("mapElementId")
      DO UPDATE SET
        status = COALESCE(EXCLUDED.status, "LotDetails".status),
        block = COALESCE(EXCLUDED.block, "LotDetails".block),
        "lotNumber" = COALESCE(EXCLUDED."lotNumber", "LotDetails"."lotNumber"),
        price = COALESCE(EXCLUDED.price, "LotDetails".price),
        "pricePerM2" = COALESCE(EXCLUDED."pricePerM2", "LotDetails"."pricePerM2"),
        "areaM2" = COALESCE(EXCLUDED."areaM2", "LotDetails"."areaM2"),
        frontage = COALESCE(EXCLUDED.frontage, "LotDetails".frontage),
        depth = COALESCE(EXCLUDED.depth, "LotDetails".depth),
        "sideLeft" = COALESCE(EXCLUDED."sideLeft", "LotDetails"."sideLeft"),
        "sideRight" = COALESCE(EXCLUDED."sideRight", "LotDetails"."sideRight"),
        slope = COALESCE(EXCLUDED.slope, "LotDetails".slope),
        notes = COALESCE(EXCLUDED.notes, "LotDetails".notes),
        tags = CASE
          WHEN array_length(EXCLUDED.tags, 1) IS NULL OR array_length(EXCLUDED.tags, 1) = 0 THEN "LotDetails".tags
          ELSE EXCLUDED.tags
        END,
        "updatedAt" = NOW();
      `,
      payload
    );
  }

  private async flushErrors(importId: string, buffer: CsvImportError[]) {
    if (buffer.length === 0) return;

    const payload = JSON.stringify(
      buffer.splice(0, buffer.length).map((error) => ({
        id: uuidv4(),
        importId,
        line: error.line,
        code: error.code ?? null,
        message: error.message,
        raw: error.raw ?? null
      }))
    );

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO "LotImportError" (id, "importId", line, code, message, raw, "createdAt")
      SELECT
        x.id,
        x."importId",
        x.line,
        x.code,
        x.message,
        x.raw,
        NOW()
      FROM jsonb_to_recordset($1::jsonb) AS x(
        id text,
        "importId" text,
        line integer,
        code text,
        message text,
        raw jsonb
      );
      `,
      payload
    );
  }

  private async updateImportState(
    importId: string,
    params: {
      status?: ImportStatus;
      message?: string;
      counters?: ImportCounters;
      startedAtNow?: boolean;
      finishedAtNow?: boolean;
    }
  ) {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (params.status) {
      values.push(params.status);
      updates.push(`status = $${values.length}::"LotImportStatus"`);
    }

    if (params.message !== undefined) {
      values.push(params.message);
      updates.push(`message = $${values.length}`);
    }

    if (params.counters) {
      values.push(params.counters.totalRows);
      updates.push(`"totalRows" = $${values.length}`);
      values.push(params.counters.processedRows);
      updates.push(`"processedRows" = $${values.length}`);
      values.push(params.counters.successRows);
      updates.push(`"successRows" = $${values.length}`);
      values.push(params.counters.errorRows);
      updates.push(`"errorRows" = $${values.length}`);
    }

    if (params.startedAtNow) {
      updates.push(`"startedAt" = NOW()`);
    }

    if (params.finishedAtNow) {
      updates.push(`"finishedAt" = NOW()`);
    }

    updates.push(`"updatedAt" = NOW()`);

    values.push(importId);

    await this.prisma.$executeRawUnsafe(
      `
      UPDATE "LotImportJob"
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      `,
      ...values
    );
  }

  private async ensureProjectHasLots(tenantId: string, projectId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "MapElement"
      WHERE "tenantId" = ${tenantId}
        AND "projectId" = ${projectId}
        AND type = 'LOT'
    `;

    const count = Number(rows[0]?.count || 0);
    if (count <= 0) {
      throw new BadRequestException(
        'So e permitido importar CSV quando os lotes ja foram criados no editor.'
      );
    }
  }

  private async ensureImportOwnership(
    tenantId: string,
    projectId: string,
    importId: string
  ) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "LotImportJob"
      WHERE id = ${importId}
        AND "tenantId" = ${tenantId}
        AND "projectId" = ${projectId}
      LIMIT 1
    `;

    if (!rows[0]) {
      throw new NotFoundException('Importacao nao encontrada.');
    }
  }

  private detectDelimiter(headerLine: string) {
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    const commaCount = (headerLine.match(/,/g) || []).length;
    return semicolonCount > commaCount ? ';' : ',';
  }

  private parseCsvLine(line: string, delimiter: string) {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }

      if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    result.push(current.trim());
    return result.map((value) => value.replace(/^\uFEFF/, '').trim());
  }

  private normalizeHeader(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  }

  private normalizeCode(value: string) {
    return String(value || '')
      .trim()
      .toUpperCase();
  }

  private mapRawRow(cols: string[], headerMap: Map<string, number>) {
    const row: Record<string, string> = {};

    for (const [key, index] of headerMap.entries()) {
      row[key] = cols[index] ?? '';
    }

    return row;
  }

  private normalizeCsvRow(
    raw: Record<string, string>,
    line: number
  ): { row?: CsvRowCandidate; error?: CsvImportError } {
    const codeRaw = this.readRawValue(raw, HEADER_ALIASES.code);
    const statusRaw = this.readRawValue(raw, HEADER_ALIASES.status);
    const slopeRaw = this.readRawValue(raw, HEADER_ALIASES.slope);
    const code = codeRaw.trim();

    if (!code) {
      return {
        error: {
          line,
          message:
            'Coluna obrigatoria "codigo" vazia. Informe o codigo do lote exatamente como na Planta Interativa (ex.: Q1-L01).',
          raw
        }
      };
    }

    if (this.hasDiacritics(code)) {
      return {
        error: {
          line,
          code,
          message: `Codigo invalido: ${this.formatInvalidValue(code)}. O codigo nao pode conter acentuacao. Exemplo esperado: Q1-L01.`,
          raw
        }
      };
    }

    const status = this.parseStatus(statusRaw);
    if (statusRaw.trim() && !status) {
      return {
        error: {
          line,
          code,
          message: `Status invalido: ${this.formatInvalidValue(statusRaw)}. Valores aceitos: DISPONIVEL, RESERVADO, VENDIDO (tambem aceita AVAILABLE, RESERVED, SOLD).`,
          raw
        }
      };
    }

    const slope = this.parseSlope(slopeRaw);
    if (slopeRaw.trim() && !slope) {
      return {
        error: {
          line,
          code,
          message: `Topografia invalida: ${this.formatInvalidValue(slopeRaw)}. Valores aceitos: PLANO, ACLIVE, DECLIVE (tambem aceita FLAT, UPHILL, DOWNHILL).`,
          raw
        }
      };
    }

    const parseNumberField = (value: string, fieldName: string) => {
      const parsed = this.parseNumber(value);
      if (parsed.invalid) {
        return {
          error: {
            line,
            code,
            message: `Valor invalido em ${fieldName}: ${this.formatInvalidValue(value)}. Use numero (ex.: 1500,50 ou 1500.50).`,
            raw
          }
        } as const;
      }
      return { value: parsed.value } as const;
    };

    const price = parseNumberField(
      this.readRawValue(raw, HEADER_ALIASES.price),
      'valor_total'
    );
    if ('error' in price) return price;

    const pricePerM2 = parseNumberField(
      this.readRawValue(raw, HEADER_ALIASES.pricePerM2),
      'valor_m2'
    );
    if ('error' in pricePerM2) return pricePerM2;

    const areaM2 = parseNumberField(
      this.readRawValue(raw, HEADER_ALIASES.areaM2),
      'area_m2'
    );
    if ('error' in areaM2) return areaM2;

    const frontage = parseNumberField(
      this.readRawValue(raw, HEADER_ALIASES.frontage),
      'frente'
    );
    if ('error' in frontage) return frontage;

    const depth = parseNumberField(
      this.readRawValue(raw, HEADER_ALIASES.depth),
      'fundo'
    );
    if ('error' in depth) return depth;

    const sideLeft = parseNumberField(
      this.readRawValue(raw, HEADER_ALIASES.sideLeft),
      'lateral_esquerda'
    );
    if ('error' in sideLeft) return sideLeft;

    const sideRight = parseNumberField(
      this.readRawValue(raw, HEADER_ALIASES.sideRight),
      'lateral_direita'
    );
    if ('error' in sideRight) return sideRight;

    const tags = this.parseTags(this.readRawValue(raw, HEADER_ALIASES.tags));

    return {
      row: {
        line,
        code,
        status,
        block: this.toNullableString(
          this.readRawValue(raw, HEADER_ALIASES.block)
        ),
        lotNumber: this.toNullableString(
          this.readRawValue(raw, HEADER_ALIASES.lotNumber)
        ),
        price: price.value,
        pricePerM2: pricePerM2.value,
        areaM2: areaM2.value,
        frontage: frontage.value,
        depth: depth.value,
        sideLeft: sideLeft.value,
        sideRight: sideRight.value,
        slope,
        notes: this.toNullableString(
          this.readRawValue(raw, HEADER_ALIASES.notes)
        ),
        tags,
        raw
      }
    };
  }

  private readRawValue(
    raw: Record<string, string>,
    aliases: readonly string[]
  ) {
    for (const key of aliases) {
      const value = raw[key];
      if (value !== undefined) {
        return value;
      }
    }
    return '';
  }

  private parseNumber(value: string): {
    value: number | null;
    invalid: boolean;
  } {
    const clean = String(value || '').trim();
    if (!clean) return { value: null, invalid: false };

    const normalized = clean.replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);

    if (!Number.isFinite(parsed)) {
      return { value: null, invalid: true };
    }

    return { value: parsed, invalid: false };
  }

  private parseStatus(value: string): string | null {
    const normalized = this.normalizeEnumValue(value);
    if (!normalized) return null;

    if (normalized === 'AVAILABLE' || normalized === 'DISPONIVEL')
      return 'AVAILABLE';
    if (normalized === 'RESERVED' || normalized === 'RESERVADO')
      return 'RESERVED';
    if (normalized === 'SOLD' || normalized === 'VENDIDO') return 'SOLD';
    return null;
  }

  private parseSlope(value: string): string | null {
    const normalized = this.normalizeEnumValue(value);
    if (!normalized) return null;

    if (normalized === 'FLAT' || normalized === 'PLANO') return 'FLAT';
    if (
      normalized === 'UPHILL' ||
      normalized === 'UP' ||
      normalized === 'ACLIVE'
    )
      return 'UPHILL';
    if (
      normalized === 'DOWNHILL' ||
      normalized === 'DOWN' ||
      normalized === 'DECLIVE'
    )
      return 'DOWNHILL';
    return null;
  }

  private normalizeEnumValue(value: string) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '');
  }

  private formatInvalidValue(value: string) {
    const clean = String(value || '').trim();
    if (!clean) return '[vazio]';
    return `"${clean}"`;
  }

  private hasDiacritics(value: string) {
    const clean = String(value || '');
    const withoutDiacritics = clean
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return clean !== withoutDiacritics;
  }

  private parseTags(value: string): string[] | null {
    const clean = String(value || '').trim();
    if (!clean) return null;

    const tags = clean
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean);

    return tags.length > 0 ? tags : null;
  }

  private toNullableString(value: string) {
    const clean = String(value || '').trim();
    return clean ? clean : null;
  }

  private mapJob(row: Record<string, unknown>) {
    return {
      id: String(row.id),
      tenantId: String(row.tenantId),
      projectId: String(row.projectId),
      createdById: row.createdById ? String(row.createdById) : null,
      fileName: String(row.fileName),
      status: String(row.status),
      totalRows: Number(row.totalRows || 0),
      processedRows: Number(row.processedRows || 0),
      successRows: Number(row.successRows || 0),
      errorRows: Number(row.errorRows || 0),
      message: row.message ? String(row.message) : null,
      startedAt: row.startedAt || null,
      finishedAt: row.finishedAt || null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private mapError = (row: Record<string, unknown>) => ({
    id: String(row.id),
    line: Number(row.line),
    code: row.code ? String(row.code) : null,
    message: String(row.message),
    raw: row.raw ?? null,
    createdAt: row.createdAt
  });

  private isValidQueueJob(payload: unknown): payload is CsvImportQueueJob {
    if (!payload || typeof payload !== 'object') return false;

    const job = payload as Record<string, unknown>;
    return (
      typeof job.importId === 'string' &&
      typeof job.tenantId === 'string' &&
      typeof job.projectId === 'string' &&
      typeof job.filePath === 'string'
    );
  }

  private async cleanupTempFile(filePath: string) {
    if (!filePath || !existsSync(filePath)) return;

    try {
      await unlinkAsync(filePath);
    } catch (error) {
      this.logger.warn(
        `Could not remove temp file ${filePath}: ${String(error)}`
      );
    }
  }

  private createImportId() {
    return `lotimp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
