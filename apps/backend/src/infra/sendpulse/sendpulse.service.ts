import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

interface SendPulseTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

@Injectable()
export class SendPulseService implements OnModuleInit {
  private readonly logger = new Logger(SendPulseService.name);
  private readonly client: AxiosInstance;
  private readonly apiBaseUrl = 'https://api.sendpulse.com';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private tokenRefreshPromise: Promise<string> | null = null;

  constructor(private configService: ConfigService) {
    this.client = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 30000
    });

    this.clientId = this.configService.get<string>('SENDPULSE_CLIENT_ID') || '';
    this.clientSecret =
      this.configService.get<string>('SENDPULSE_CLIENT_SECRET') || '';
    this.fromEmail =
      this.configService.get<string>('SENDPULSE_FROM_EMAIL') ||
      'suporte@lotio.com.br';
    this.fromName =
      this.configService.get<string>('SENDPULSE_FROM_NAME') || 'Lotio';
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://app.lotio.com.br';
  }

  onModuleInit() {
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        'SendPulse credentials (SENDPULSE_CLIENT_ID / SENDPULSE_CLIENT_SECRET) not configured. Email sending will fail.'
      );
    }
    if (!this.configService.get<string>('FRONTEND_URL')) {
      this.logger.warn(
        'FRONTEND_URL not configured. Email links will use fallback URL.'
      );
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // Prevent concurrent token refresh requests
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this.refreshToken();
    try {
      return await this.tokenRefreshPromise;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  private async refreshToken(): Promise<string> {
    try {
      const response = await this.client.post<SendPulseTokenResponse>(
        '/oauth/access_token',
        {
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt =
        Date.now() + (response.data.expires_in - 300) * 1000;

      return this.accessToken;
    } catch (error: any) {
      this.logger.error('Failed to get SendPulse access token:', error.message);
      throw error;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

    try {
      const token = await this.getAccessToken();
      const htmlContent = options.html || '';
      const textContent = options.text || this.stripHtml(options.html) || '';

      const emailData = {
        email: {
          subject: options.subject,
          from: {
            name: this.fromName,
            email: this.fromEmail
          },
          to: toAddresses.map((email) => ({
            email,
            name: email.split('@')[0]
          })),
          html: Buffer.from(htmlContent).toString('base64'),
          text: Buffer.from(textContent).toString('base64'),
          ...(options.replyTo && { reply_to: options.replyTo })
        }
      };

      await this.client.post('/smtp/emails', emailData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      this.logger.log(
        `Email sent to ${toAddresses.join(', ')}: ${options.subject}`
      );
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to send email to ${toAddresses.join(', ')}:`,
        error.response?.data || error.message
      );
      throw error;
    }
  }

  private stripHtml(html?: string): string {
    if (!html) return '';
    return html
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getBaseTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lotio</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .email-card { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
    .header { background-color: #2563eb; padding: 40px 24px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.025em; }
    .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px; }
    .content { padding: 40px 32px; }
    .content h2 { color: #0f172a; font-size: 24px; font-weight: 700; margin: 0 0 20px; }
    .content p { color: #475569; margin: 0 0 20px; font-size: 16px; }
    .btn { display: inline-block; padding: 16px 32px; background-color: #2563eb; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; }
    .info-box { background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #2563eb; }
    .footer { text-align: center; padding: 32px; color: #94a3b8; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-card">
      <div class="header">
        <h1>Lotio</h1>
        <p>Gestão Inteligente de Loteamentos</p>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Lotio. Todos os direitos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  async sendWelcomeTenantEmail(
    to: string,
    userName: string,
    tenantName: string
  ): Promise<boolean> {
    const safeUserName = this.escapeHtml(userName);
    const safeTenantName = this.escapeHtml(tenantName);

    const html = this.getBaseTemplate(`
      <h2>Seja bem-vindo(a), ${safeUserName}!</h2>
      <p>É um prazer ter a <strong>${safeTenantName}</strong> conosco na plataforma Lotio.</p>
      <p>Agora você tem acesso a todas as ferramentas para gerenciar seus empreendimentos, mapas e leads de forma integrada e profissional.</p>
      <div class="info-box">
        <p><strong>Destaques da plataforma:</strong></p>
        <ul style="margin: 10px 0; color: #475569;">
          <li>Visualização interativa de mapas</li>
          <li>Gestão de estoque em tempo real</li>
          <li>Controle de leads e campanhas</li>
          <li>Links exclusivos para corretores</li>
        </ul>
      </div>
      <p style="text-align: center; margin-top: 32px;">
        <a href="${this.frontendUrl}/login" class="btn">Acessar Painel da Loteadora</a>
      </p>
    `);

    return this.sendEmail({
      to,
      subject: `Bem-vindo à Lotio - ${safeTenantName}`,
      html
    });
  }

  async sendWelcomeRealtorEmail(
    to: string,
    userName: string
  ): Promise<boolean> {
    const safeUserName = this.escapeHtml(userName);

    const html = this.getBaseTemplate(`
      <h2>Olá, ${safeUserName}!</h2>
      <p>Você acaba de ganhar acesso à plataforma Lotio para consultar a disponibilidade e informações dos empreendimentos.</p>
      <p>Com seu acesso de corretor, você poderá visualizar mapas interativos, preços e gerar links personalizados para seus clientes.</p>
      <p style="text-align: center; margin-top: 32px;">
        <a href="${this.frontendUrl}/login" class="btn">Acessar Painel do Corretor</a>
      </p>
      <p style="margin-top: 24px; font-size: 14px;">Boas vendas!</p>
    `);

    return this.sendEmail({
      to,
      subject: 'Bem-vindo à Lotio - Acesso do Corretor',
      html
    });
  }

  async sendPasswordResetEmail(
    to: string,
    userName: string,
    resetToken: string
  ): Promise<boolean> {
    const resetUrl = `${this.frontendUrl}/redefinir-senha?token=${encodeURIComponent(resetToken)}`;
    const safeUserName = this.escapeHtml(userName);

    const html = this.getBaseTemplate(`
      <h2>Recuperação de senha</h2>
      <p>Olá, <strong>${safeUserName}</strong>,</p>
      <p>Recebemos uma solicitação para redefinir a sua senha no Lotio. Se foi você, clique no botão abaixo para criar uma nova senha:</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" class="btn">Redefinir Senha</a>
      </p>
      <div class="info-box">
        <p style="font-size: 14px; margin: 0;">Este link é válido por 1 hora. Se você não solicitou a alteração, pode ignorar este e-mail com segurança.</p>
      </div>
      <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
        Caso o botão não funcione, copie o link abaixo:<br>${resetUrl}
      </p>
    `);

    return this.sendEmail({
      to,
      subject: 'Recuperação de Senha - Lotio',
      html
    });
  }

  async sendInviteEmail(
    to: string,
    token: string,
    role: string,
    email: string
  ): Promise<boolean> {
    const inviteUrl = `${this.frontendUrl}/aceitar-convite?token=${encodeURIComponent(token)}`;
    const roleMap: Record<string, string> = {
      ADMIN: 'Administrador',
      TENANT_ADMIN: 'Gestor da Loteadora',
      LOTEADORA: 'Gestor da Loteadora',
      IMOBILIARIA: 'Gestor da Imobiliária',
      REALTOR_ADMIN: 'Gestor da Imobiliária',
      CORRETOR: 'Corretor de Imóveis',
      REALTOR: 'Corretor de Imóveis'
    };

    const roleName = roleMap[role] || 'Usuário';

    const html = this.getBaseTemplate(`
      <h2>Olá! Você foi convidado para o Lotio</h2>
      <p>Você foi convidado para participar da plataforma de Gestão de Loteamentos como <strong>${roleName}</strong>.</p>
      <p>Com sua conta, você poderá acessar os empreendimentos e ferramentas exclusivas da plataforma.</p>
      <div class="info-box">
        <p style="margin: 0; font-size: 14px;">Para aceitar o convite e configurar seu perfil, clique no botão abaixo:</p>
      </div>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${inviteUrl}" class="btn">Aceitar Convite e Acessar</a>
      </p>
      <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
        Caso o botão não funcione, copie o link abaixo:<br>${inviteUrl}
      </p>
    `);

    return this.sendEmail({
      to,
      subject: 'Convite para Lotio - Nova Conta',
      html
    });
  }

  async sendTwoFactorEmail(
    to: string,
    userName: string,
    code: string
  ): Promise<boolean> {
    const safeUserName = this.escapeHtml(userName);

    const html = this.getBaseTemplate(`
      <h2>Código de Verificação</h2>
      <p>Olá, <strong>${safeUserName}</strong>,</p>
      <p>Seu código de autenticação em duas etapas para acessar o Lotio é:</p>
      <div style="text-align: center; margin: 32px 0;">
        <span style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2563eb; background: #f1f5f9; padding: 16px 32px; border-radius: 8px;">${code}</span>
      </div>
      <div class="info-box">
        <p style="font-size: 14px; margin: 0;">Este código é válido por 10 minutos. Se você não tentou fazer login, altere sua senha imediatamente.</p>
      </div>
    `);

    return this.sendEmail({
      to,
      subject: 'Código de Verificação - Lotio',
      html
    });
  }

  async sendSystemNotificationEmail(
    to: string,
    userName: string,
    title: string,
    message: string
  ): Promise<boolean> {
    const safeUserName = this.escapeHtml(userName);
    const safeTitle = this.escapeHtml(title);
    const safeMessage = this.escapeHtml(message);

    const html = this.getBaseTemplate(`
      <h2>${safeTitle}</h2>
      <p>Olá, <strong>${safeUserName}</strong>,</p>
      <p>${safeMessage}</p>
      <div class="info-box">
        <p style="font-size: 14px; margin: 0;">Esta é uma mensagem official da equipe Lotio. Acesse o painel para mais detalhes.</p>
      </div>
    `);

    return this.sendEmail({ to, subject: `${safeTitle} — Lotio`, html });
  }
}
