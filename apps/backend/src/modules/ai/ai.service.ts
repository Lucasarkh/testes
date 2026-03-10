import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';
import { EncryptionService } from '@common/encryption/ecryption.service';
import { ChatDto } from './dto/chat.dto';
import OpenAI from 'openai';
import axios from 'axios';
import { CreateAiConfigDto, UpdateAiConfigDto } from './dto/ai-config.dto';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from '@modules/notifications/notifications.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly maxUserMessageLength = 500;
  private readonly maxContextLots = 180;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly encryption: EncryptionService
  ) {}

  async chat(dto: ChatDto, tenantId: string) {
    if (!dto.projectId) {
      throw new BadRequestException('Project ID is required for chat');
    }

    if (dto.message && dto.message.length > this.maxUserMessageLength) {
      throw new BadRequestException(
        'Mensagem muito longa. Por favor, seja mais breve.'
      );
    }

    return this.processChat(
      dto.projectId,
      tenantId,
      this.normalizeUserMessage(dto.message)
    );
  }

  async chatPublic(projectSlug: string, dto: ChatDto) {
    if (dto.message && dto.message.length > this.maxUserMessageLength) {
      throw new BadRequestException(
        'Sua mensagem está muito longa. Tente resumir seu pedido.'
      );
    }

    const project = await (this.prisma as any).project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, tenantId: true }
    });

    if (!project) {
      this.logger.warn(`Public project not found for slug: ${projectSlug}`);
      throw new NotFoundException('Project not found');
    }

    return this.processChat(
      project.id,
      project.tenantId,
      this.normalizeUserMessage(dto.message)
    );
  }

  private async processChat(
    projectId: string,
    tenantId: string,
    message: string
  ) {
    const hints = this.extractSearchHints(message);

    if (hints.isFinancialIntent) {
      return {
        message:
          'Eu nao consigo realizar simulacoes financeiras ou informar condicoes detalhadas de parcelamento. No entanto, voce encontrara um SIMULADOR completo na pagina de cada lote para fazer sua simulacao personalizada.'
      };
    }

    const project = await (this.prisma as any).project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        aiConfig: true
      }
    });

    if (!project) {
      this.logger.warn(`Project not found: ${projectId}`);
      throw new NotFoundException('Project not found');
    }

    let aiConfig = project.aiConfig;

    // Auto-detect a tenant-level AI config when the project is not explicitly activated
    // or linked in the panel, prioritizing configs with custom system prompt.
    if (!project.aiEnabled || !aiConfig) {
      const fallbackConfig = await this.findTenantAutoAiConfig(tenantId);
      if (fallbackConfig) {
        aiConfig = fallbackConfig;
        this.logger.log(
          `AI auto-detected for project: ${project.name} using config: ${aiConfig.name}`
        );
      }
    }

    if (!aiConfig) {
      this.logger.warn(`No AI Config available for project: ${project.name}`);
      throw new BadRequestException(
        'AI configuration is missing for this project. Please configure a prompt in AI settings.'
      );
    }

    if (!aiConfig.apiKey) {
      this.logger.warn(`API Key is missing in AI Config: ${aiConfig.name}`);
      throw new BadRequestException('AI API Key is not configured');
    }

    // Decrypt the apiKey for in-memory use — never returned to the client.
    const decryptedApiKey = this.encryption.decrypt(aiConfig.apiKey);
    if (!decryptedApiKey) {
      this.logger.error(
        `Failed to decrypt API Key for AI Config: ${aiConfig.name}`
      );
      throw new BadRequestException(
        'AI API Key could not be decrypted. Please re-configure it.'
      );
    }

    const contextBundle = await this.getProjectContext(
      project.id,
      tenantId,
      hints
    );

    const systemPrompt = `
      ESTAS SÃO AS INFORMAÇÕES DO PROJETO:
      Nome do Loteamento: ${project.name}
      Descrição: ${project.description || 'N/A'}
      Endereço: ${project.address || 'N/A'}
      Resumo dos lotes: ${contextBundle.summary}
      
      LOTES DISPONÍVEIS E DETALHES (LISTA DE REFERÊNCIA):
      ${contextBundle.context}

      DIRETRIZES DE FILTRAGEM (PRECISÃO EXTREMA):
      1. FILTRAGEM POR TAGS (DIFERENCIAL): O campo "Tags" contém as únicas características especiais confirmadas daquele lote. Se o usuário buscar por "sol da manhã", "esquina", ou QUALQUER característica, você DEVE verificar se esse termo exato está presente na lista de Tags do lote na LISTA DE REFERÊNCIA.
      2. PROIBIDO CHUTAR OU SUPOR: Se o termo buscado (ex: "sol da manhã") NÃO estiver na lista de Tags de um lote, você NÃO PODE recomendar esse lote para essa característica. É STRICTLY FORBIDDEN (Rigorosamente proibido) apresentar um lote como tendo uma característica se ela não estiver listada nas tags.
      3. QUALIDADE > QUANTIDADE: É muito melhor retornar apenas um lote (ou até nenhum) se ele for o único que realmente atende aos critérios, do que retornar vários lotes onde alguns são "chutes". O usuário confia na sua precisão.
      4. SE NADA COMBINAR: Se após filtrar rigorosamente nenhum lote possuir a tag desejada, você deve dizer claramente: "Infelizmente não encontrei lotes com a característica [Característica do Usuário] nos dados atuais. Posso te mostrar outras excelentes opções disponíveis?" e então listar algumas opções gerais (como lotes planos ou melhor custo-benefício).
      5. STATUS E DISPONIBILIDADE: Priorize sempre lotes com Status: "Disponível". Lotes "Vendidos" só devem ser citados se o usuário pedir um lote específico pelo código que já foi vendido.

      DIRETRIZES DE RESPOSTA E FORMATAÇÃO:
      1. Se encontrar um ou mais lotes que atendam ao que o usuário busca, use este formato:
         - Primeiro faça um pequeno resumo ou introdução em texto.
         - Depois, para cada lote selecionado, use EXATAMENTE este bloco especial (um card por lote):
         :::LOT_CARD
         {
           "code": "CÓDIGO_DO_LOTE",
           "status": "STATUS_PELA_REFERÊNCIA",
           "area": "ÁREA_PELA_REFERÊNCIA",
           "price": "PREÇO_PELA_REFERÊNCIA",
           "topography": "TOPOGRAFIA_PELA_REFERÊNCIA",
           "tags": ["Tag Real 1", "Tag Real 2"]
         }
         :::
         Importante: 
         - O conteúdo entre :::LOT_CARD e ::: deve ser um JSON válido. 
         - O campo "tags" dentro do JSON deve conter APENAS as tags que o lote realmente possui na LISTA DE REFERÊNCIA.
         - Limite sua resposta a no máximo 5 (cinco) cards de lotes por vez para não sobrecarregar o usuário. Se houver mais opções, mencione que existem e peça para o usuário ser mais específico ou ver a lista completa.
         - Ao final da resposta (após os cards), você deve sempre perguntar se o usuário deseja ser levado para a página do lote ou para a listagem completa.
         - Se o usuário demonstrou interesse em valores ou pagamentos, reforce SEMPRE a existência do simulador na página do lote.
      2. Seja muito preciso com a TOPOGRAFIA: use apenas "Plano", "Aclive" ou "Declive". Jamais use termos técnicos em inglês como "UPHILL".

      PROIBIÇÃO DE CONDIÇÕES FINANCEIRAS E SIMULAÇÕES:
      1. Você NUNCA deve falar sobre condições de pagamento, parcelamento, taxas de juros ou realizar qualquer tipo de simulação financeira.
      2. SEMPRE que o usuário perguntar sobre valores de parcelas, entrada, financiamento ou como funciona o pagamento, você DEVE responder obrigatoriamente: "Eu não consigo realizar simulações financeiras ou informar condições detalhadas de parcelamento. No entanto, você encontrará um SIMULADOR completo na página de cada lote para fazer sua simulação personalizada."
      3. Incentive ativamente o usuário a clicar no card do lote para abrir os detalhes e utilizar o simulador disponível na página do lote.

      DIRETRIZES DE SEGURANÇA (TRAVAS EXTREMAS):
      1. Você deve agir EXCLUSIVAMENTE como atendente deste empreendimento (${project.name}).
      2. Responda APENAS perguntas sobre lotes, disponibilidade, preços (valor total) e características do loteamento.
      3. NUNCA realize simulações de financiamento. Se solicitado, encaminhe para o simulador na página do lote como descrito acima.
      4. Se o usuário perguntar sobre QUALQUER assunto fora deste contexto, você deve recusar educadamente.
      5. Se não encontrar a informação específica nos dados fornecidos, diga que não localizou mas que um consultor humano pode ajudar.
    `;

    // Append optional custom prompt from loteadora — AFTER all mandatory safety rails.
    // These are additional personality, tone, or contextual instructions.
    // They cannot override any security directive above.
    const fullSystemPrompt = aiConfig.systemPrompt
      ? `${systemPrompt}\n\n      INSTRUÇÕES ADICIONAIS DO LOTEAMENTO (Personalização):\n      ${aiConfig.systemPrompt}`
      : systemPrompt;

    try {
      const provider = (aiConfig.provider || 'OPENAI').toUpperCase();
      const modelName =
        aiConfig.model ||
        (provider === 'OPENAI'
          ? 'gpt-4o-mini'
          : provider === 'ANTHROPIC'
            ? 'claude-3-5-sonnet-20240620'
            : 'gemini-1.5-flash');

      this.logger.log(`Calling ${provider} (Model: ${modelName})`);

      if (provider === 'OPENAI') {
        const openai = new OpenAI({ apiKey: decryptedApiKey });
        const response = await openai.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: fullSystemPrompt },
            { role: 'user', content: message }
          ],
          temperature: aiConfig.temperature ?? 0.0,
          max_tokens: aiConfig.maxTokens || 1000
        });
        return {
          message: this.normalizeAiResponse(response.choices[0].message.content)
        };
      }

      if (provider === 'ANTHROPIC') {
        const anthropicResp = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: modelName,
            max_tokens: aiConfig.maxTokens || 1000,
            system: fullSystemPrompt,
            messages: [{ role: 'user', content: message }],
            temperature: aiConfig.temperature ?? 0.0
          },
          {
            headers: {
              'x-api-key': decryptedApiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            }
          }
        );
        return {
          message: this.normalizeAiResponse(anthropicResp.data.content[0].text)
        };
      }

      if (provider === 'GOOGLE') {
        const googleResp = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${decryptedApiKey}`,
          {
            contents: [
              {
                role: 'user',
                parts: [{ text: `${fullSystemPrompt}\n\nUsuário: ${message}` }]
              }
            ],
            generationConfig: {
              temperature: aiConfig.temperature ?? 0.0,
              maxOutputTokens: aiConfig.maxTokens || 1000
            }
          }
        );
        return {
          message: this.normalizeAiResponse(
            googleResp.data.candidates[0].content.parts[0].text
          )
        };
      }

      throw new BadRequestException('Provider não suportado.');
    } catch (error) {
      this.logger.error(
        'Error while processing AI chat',
        error?.stack || error?.message
      );

      if (this.isQuotaExceededError(error)) {
        await this.handleAiQuotaExceeded(
          project.id,
          tenantId,
          project.name,
          aiConfig,
          error
        );
        throw new BadRequestException(
          'A IA foi desativada automaticamente por limite de cota da chave configurada. Nossa equipe da loteadora foi notificada no painel para ajustar a configuracao.'
        );
      }

      throw new BadRequestException(
        'Houve um erro ao processar sua solicitacao com a IA. Tente novamente em instantes.'
      );
    }
  }

  private async getProjectContext(
    projectId: string,
    tenantId: string,
    hints: { codes: string[]; keywords: string[] }
  ): Promise<{ context: string; summary: string }> {
    const baseWhere = { projectId, tenantId };

    const [statusGroups, availableAgg] = await Promise.all([
      (this.prisma as any).lotDetails.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { _all: true }
      }),
      (this.prisma as any).lotDetails.aggregate({
        where: { ...baseWhere, status: 'AVAILABLE' },
        _min: { price: true, areaM2: true },
        _max: { price: true, areaM2: true }
      })
    ]);

    const targetedOr: any[] = [];

    if (hints.codes.length) {
      targetedOr.push({ mapElement: { code: { in: hints.codes } } });
      targetedOr.push({ mapElement: { name: { in: hints.codes } } });
    }

    for (const keyword of hints.keywords.slice(0, 8)) {
      targetedOr.push({ tags: { has: keyword } });
      targetedOr.push({
        mapElement: {
          code: { contains: keyword, mode: 'insensitive' as const }
        }
      });
      targetedOr.push({
        mapElement: {
          name: { contains: keyword, mode: 'insensitive' as const }
        }
      });
    }

    const [targetedLots, fallbackLots] = await Promise.all([
      (this.prisma as any).lotDetails.findMany({
        where: {
          ...baseWhere,
          status: 'AVAILABLE',
          ...(targetedOr.length ? { OR: targetedOr } : {})
        },
        include: { mapElement: true },
        take: 80,
        orderBy: [{ mapElement: { code: 'asc' } }]
      }),
      (this.prisma as any).lotDetails.findMany({
        where: {
          ...baseWhere,
          status: 'AVAILABLE'
        },
        include: { mapElement: true },
        take: this.maxContextLots,
        orderBy: [{ mapElement: { code: 'asc' } }]
      })
    ]);

    const merged = new Map<string, any>();
    [...targetedLots, ...fallbackLots].forEach((lot) => {
      if (merged.size < this.maxContextLots) merged.set(lot.id, lot);
    });

    const lots = Array.from(merged.values());

    if (lots.length === 0) {
      return {
        summary: 'Sem lotes cadastrados para este empreendimento.',
        context: 'Nao ha informacoes de lotes cadastrados.'
      };
    }

    const statusMap = {
      AVAILABLE: 'Disponível',
      RESERVED: 'Reservado',
      SOLD: 'Vendido'
    };

    const slopeMap = {
      FLAT: 'Plano',
      UPHILL: 'Aclive',
      DOWNHILL: 'Declive'
    };

    const summary = this.buildLotSummary(
      statusGroups,
      availableAgg,
      lots.length
    );

    return {
      summary,
      context: lots
        .map((lot) => {
          const code = lot.mapElement?.code || lot.mapElement?.name || 'S/N';
          const status = statusMap[lot.status] || lot.status;
          const area = lot.areaM2 ? `${lot.areaM2}m²` : 'Não informada';
          const price = lot.price
            ? `R$ ${Number(lot.price).toLocaleString('pt-BR')}`
            : 'Sob consulta';
          const tags =
            lot.tags && lot.tags.length
              ? `[${lot.tags.join(', ')}]`
              : '[Nenhuma]';
          const topography = slopeMap[lot.slope] || 'Plano';

          return `Lote: ${code} | Status: ${status} | Área: ${area} | Preço: ${price} | Tags: ${tags} | Topografia: ${topography}`;
        })
        .join('\n')
    };
  }

  private buildLotSummary(
    statusGroups: any[],
    availableAgg: any,
    contextLotsCount: number
  ): string {
    const counts = statusGroups.reduce(
      (acc: Record<string, number>, row: any) => {
        acc[row.status] = row._count?._all || 0;
        return acc;
      },
      {}
    );

    const minPrice = availableAgg?._min?.price
      ? `R$ ${Number(availableAgg._min.price).toLocaleString('pt-BR')}`
      : 'N/A';
    const maxPrice = availableAgg?._max?.price
      ? `R$ ${Number(availableAgg._max.price).toLocaleString('pt-BR')}`
      : 'N/A';
    const minArea = availableAgg?._min?.areaM2
      ? `${Number(availableAgg._min.areaM2).toLocaleString('pt-BR')}m²`
      : 'N/A';
    const maxArea = availableAgg?._max?.areaM2
      ? `${Number(availableAgg._max.areaM2).toLocaleString('pt-BR')}m²`
      : 'N/A';

    return [
      `Disponiveis: ${counts.AVAILABLE || 0}`,
      `Reservados: ${counts.RESERVED || 0}`,
      `Vendidos: ${counts.SOLD || 0}`,
      `Faixa de preco (disponiveis): ${minPrice} ate ${maxPrice}`,
      `Faixa de area (disponiveis): ${minArea} ate ${maxArea}`,
      `Lotes enviados para contexto: ${contextLotsCount}`
    ].join(' | ');
  }

  private extractSearchHints(message: string): {
    codes: string[];
    keywords: string[];
    isFinancialIntent: boolean;
  } {
    const normalized = this.normalizeForSearch(message);
    const codeMatches = (
      message.match(/\b[A-Za-z]{0,3}\d{1,4}[A-Za-z]?\b/g) || []
    )
      .map((code) => code.toUpperCase())
      .slice(0, 8);

    const stopwords = new Set([
      'de',
      'do',
      'da',
      'dos',
      'das',
      'um',
      'uma',
      'uns',
      'umas',
      'para',
      'com',
      'sem',
      'que',
      'qual',
      'quais',
      'por',
      'em',
      'no',
      'na',
      'nos',
      'nas',
      'eu',
      'me',
      'minha',
      'meu',
      'quero',
      'gostaria',
      'tem',
      'temos',
      'lote',
      'lotes',
      'loteamento',
      'projeto',
      'sobre'
    ]);

    const keywords = normalized
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3 && !stopwords.has(token))
      .slice(0, 12);

    const isFinancialIntent =
      /(parcela|parcelamento|financiamento|juros|entrada|simulacao|simular|amortizacao|mensal)/.test(
        normalized
      );

    return {
      codes: Array.from(new Set(codeMatches)),
      keywords: Array.from(new Set(keywords)),
      isFinancialIntent
    };
  }

  private normalizeForSearch(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private normalizeUserMessage(value: string): string {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  private normalizeAiResponse(value: string | null | undefined): string {
    const cleaned = (value || '').replace(/\s{3,}/g, '\n\n').trim();
    if (!cleaned) {
      return 'Nao consegui montar uma resposta valida agora. Tente novamente em instantes.';
    }
    return cleaned.slice(0, 5000);
  }

  private async findTenantAutoAiConfig(tenantId: string) {
    const withPrompt = await (this.prisma as any).aiConfig.findFirst({
      where: {
        tenantId,
        isActive: true,
        apiKey: { not: null },
        systemPrompt: { not: null }
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (withPrompt?.systemPrompt?.trim()) return withPrompt;

    return (this.prisma as any).aiConfig.findFirst({
      where: {
        tenantId,
        isActive: true,
        apiKey: { not: null }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  private isQuotaExceededError(error: any): boolean {
    const status = error?.status || error?.response?.status;
    const text = String(
      error?.message ||
        error?.error?.message ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        ''
    ).toLowerCase();

    const hasQuotaSignal =
      text.includes('quota') ||
      text.includes('insufficient_quota') ||
      text.includes('billing') ||
      text.includes('exceeded your current quota') ||
      text.includes('resource has been exhausted') ||
      text.includes('rate limit exceeded');

    return status === 429 && hasQuotaSignal;
  }

  private async handleAiQuotaExceeded(
    projectId: string,
    tenantId: string,
    projectName: string,
    aiConfig: any,
    error: any
  ) {
    try {
      const [disabledConfig, disabledProjects] = await Promise.all([
        (this.prisma as any).aiConfig.updateMany({
          where: { id: aiConfig.id, tenantId, isActive: true },
          data: { isActive: false }
        }),
        (this.prisma as any).project.updateMany({
          where: { tenantId, aiConfigId: aiConfig.id, aiEnabled: true },
          data: { aiEnabled: false }
        })
      ]);

      // Avoid spamming panel notifications when the config is already disabled.
      if (!disabledConfig?.count) return;

      const provider = String(aiConfig.provider || 'openai').toUpperCase();
      const details = String(
        error?.message ||
          error?.response?.data?.error?.message ||
          'Quota exceeded'
      ).slice(0, 300);

      await this.notifications.notifyTenantLoteadoras(
        tenantId,
        NotificationType.SYSTEM,
        'IA desativada automaticamente por cota',
        `A configuracao de IA "${aiConfig.name}" (${provider}) foi desativada automaticamente apos erro de cota/quota no projeto "${projectName}". Projetos afetados: ${disabledProjects?.count || 0}. Detalhe tecnico: ${details}`,
        '/painel/ai',
        {
          reason: 'AI_QUOTA_EXCEEDED',
          projectId,
          projectName,
          aiConfigId: aiConfig.id,
          aiConfigName: aiConfig.name,
          provider
        }
      );
    } catch (handlerError) {
      this.logger.error(
        'Failed to auto-disable AI after quota error',
        handlerError?.stack || handlerError?.message
      );
    }
  }

  // Admin Config Management
  async listConfigs(tenantId: string) {
    const configs = await (this.prisma as any).aiConfig.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    return configs.map((cfg: any) => ({
      ...cfg,
      apiKey: cfg.apiKey ? '********' : null
    }));
  }

  async createConfig(tenantId: string, dto: CreateAiConfigDto) {
    return (this.prisma as any).aiConfig.create({
      data: {
        ...dto,
        // Encrypt the apiKey before persisting — only the encrypted blob is stored.
        apiKey: dto.apiKey?.trim()
          ? this.encryption.encrypt(dto.apiKey.trim())
          : null,
        provider: dto.provider?.toLowerCase(),
        tenantId
      }
    });
  }

  async updateConfig(id: string, tenantId: string, dto: UpdateAiConfigDto) {
    const updateData: any = {
      ...dto,
      provider: dto.provider?.toLowerCase()
    };

    if (dto.apiKey !== undefined) {
      const key = dto.apiKey?.trim();
      if (key && !/^\*+$/.test(key)) {
        // Encrypt before persisting — never store the plaintext key.
        updateData.apiKey = this.encryption.encrypt(key);
      } else {
        delete updateData.apiKey;
      }
    }

    return (this.prisma as any).aiConfig.updateMany({
      where: { id, tenantId },
      data: updateData
    });
  }

  async deleteConfig(id: string, tenantId: string) {
    return (this.prisma as any).aiConfig.deleteMany({
      where: { id, tenantId }
    });
  }
}
