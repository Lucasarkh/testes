<template>
  <div class="legal-page">
    <div class="legal-container">
      <NuxtLink to="/" class="back-home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"></polyline></svg>
        Voltar para Home
      </NuxtLink>

      <div class="legal-header">
        <img src="/img/logo.svg" alt="Lotio" class="legal-logo" />
        <h1>Política de Privacidade</h1>
        <p class="legal-version">Versão 1.1 — Última atualização: 05 de março de 2026</p>
      </div>

      <div class="legal-content">

        <section>
          <h2>1. INTRODUÇÃO</h2>
          <p>1.1. A presente Política de Privacidade ("Política") descreve como a <strong>LOTIO TECNOLOGIA LTDA.</strong> ("Lotio", "nós", "nosso") coleta, utiliza, armazena, compartilha e protege os dados pessoais dos usuários ("Usuário", "Contratante", "você") da Plataforma Lotio.</p>
          <p>1.2. Esta Política é parte integrante dos <NuxtLink to="/termos-de-uso">Termos de Uso</NuxtLink> da Plataforma e foi elaborada em conformidade com:</p>
          <ul>
            <li>Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018);</li>
            <li>Marco Civil da Internet (Lei nº 12.965/2014) e seu Regulamento (Decreto nº 8.771/2016);</li>
            <li>Código de Defesa do Consumidor (Lei nº 8.078/1990);</li>
            <li>Regulamento Geral sobre a Proteção de Dados — GDPR (Regulamento UE 2016/679), no que aplicável.</li>
          </ul>
          <p>1.3. Ao utilizar a Plataforma Lotio, o Usuário declara ciência e consentimento com as práticas descritas nesta Política.</p>
        </section>

        <section>
          <h2>2. CONTROLADOR E ENCARREGADO DE DADOS</h2>
          <p>2.1. Para fins da LGPD:</p>
          <ul>
            <li><strong>Controlador:</strong> LOTIO TECNOLOGIA LTDA., CNPJ [CNPJ], com sede em [endereço].</li>
            <li><strong>Encarregado de Dados (DPO):</strong> [Nome do DPO], acessível pelo e-mail dpo@lotio.com.br.</li>
          </ul>
          <p>2.2. Em relação aos dados de leads, visitantes e clientes inseridos pelo Contratante na Plataforma, a Lotio atua como <strong>Operadora de Dados</strong>, cabendo ao Contratante a qualidade de <strong>Controlador</strong> perante seus próprios titulares.</p>
          <p>2.3. A analise de credito de leads e clientes para fins de reserva, proposta ou venda de lotes e de responsabilidade exclusiva da loteadora/Contratante, que define os criterios e decide sobre aprovacao ou reprovacao. Nessa etapa, a Lotio atua apenas como fornecedora de infraestrutura tecnologica.</p>
        </section>

        <section>
          <h2>3. DADOS PESSOAIS COLETADOS</h2>
          <p>3.1. <strong>Dados de cadastro do Usuário:</strong></p>
          <ul>
            <li>Nome completo;</li>
            <li>Endereço de e-mail;</li>
            <li>Senha (armazenada exclusivamente em formato hash criptográfico bcrypt);</li>
            <li>Papel/função na Plataforma (SYSADMIN, LOTEADORA, IMOBILIÁRIA, CORRETOR);</li>
            <li>Identificador do Tenant (empresa/organização);</li>
            <li>Identificador de Agência (quando aplicável);</li>
            <li>CRECI (quando aplicável a corretores e imobiliárias).</li>
          </ul>

          <p>3.2. <strong>Dados de leads e clientes (inseridos pelo Contratante):</strong></p>
          <ul>
            <li>Nome, e-mail, telefone, CPF, RG, data de nascimento;</li>
            <li>Endereço e dados complementares;</li>
            <li>Documentos anexados;</li>
            <li>Histórico de interações, status do lead e registros de pagamento;</li>
            <li>Transcrição de interações com assistente virtual e resumo da conversa, quando houver aceite específico no chatbot;</li>
            <li>Dados de atribuição de origem (UTM, fonte, campanhas).</li>
          </ul>

          <p>3.3. <strong>Dados de navegação e rastreamento:</strong></p>
          <ul>
            <li>Endereço IP;</li>
            <li>User-Agent do navegador;</li>
            <li>Páginas visitadas, tempo de permanência e eventos de interação;</li>
            <li>Dados de geolocalização aproximada (derivados do IP);</li>
            <li>Identificadores de sessão;</li>
            <li>Dados de referência (referer, UTM parameters).</li>
          </ul>

          <p>3.4. <strong>Dados de aceite de termos:</strong></p>
          <ul>
            <li>Identificador do usuário;</li>
            <li>Versão dos documentos aceitos;</li>
            <li>Data e hora do aceite (timestamp com fuso horário);</li>
            <li>Endereço IP no momento do aceite;</li>
            <li>User-Agent do navegador no momento do aceite.</li>
            <li>Registro de aceite específico para uso do chatbot com armazenamento de resumo da conversa.</li>
          </ul>

          <p>3.5. <strong>Dados de cobrança e assinatura:</strong></p>
          <ul>
            <li>Identificador de cliente no Stripe (quando aplicável);</li>
            <li>E-mail de cobrança;</li>
            <li>Status da assinatura e histórico de faturas.</li>
          </ul>
        </section>

        <section>
          <h2>4. FINALIDADES DO TRATAMENTO</h2>
          <p>4.1. Os dados pessoais são tratados para as seguintes finalidades:</p>
          <table class="legal-table">
            <thead>
              <tr>
                <th>Finalidade</th>
                <th>Base Legal (LGPD)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Criação e gestão de conta de usuário</td>
                <td>Execução de contrato (art. 7º, V)</td>
              </tr>
              <tr>
                <td>Autenticação e segurança (login, 2FA)</td>
                <td>Execução de contrato (art. 7º, V)</td>
              </tr>
              <tr>
                <td>Prestação do serviço SaaS contratado</td>
                <td>Execução de contrato (art. 7º, V)</td>
              </tr>
              <tr>
                <td>Processamento de cobrança e faturamento</td>
                <td>Execução de contrato (art. 7º, V)</td>
              </tr>
              <tr>
                <td>Comunicações transacionais (e-mails de sistema)</td>
                <td>Execução de contrato (art. 7º, V)</td>
              </tr>
              <tr>
                <td>Analytics e métricas de desempenho</td>
                <td>Legítimo interesse (art. 7º, IX)</td>
              </tr>
              <tr>
                <td>Melhoria contínua da Plataforma</td>
                <td>Legítimo interesse (art. 7º, IX)</td>
              </tr>
              <tr>
                <td>Registro de transcrição e resumo de conversa com assistente virtual para continuidade de atendimento</td>
                <td>Consentimento (art. 7º, I)</td>
              </tr>
              <tr>
                <td>Rastreamento de sessões em sites de projetos</td>
                <td>Legítimo interesse (art. 7º, IX)</td>
              </tr>
              <tr>
                <td>Registro de aceite de termos e consentimentos</td>
                <td>Cumprimento de obrigação legal (art. 7º, II)</td>
              </tr>
              <tr>
                <td>Prevenção de fraude e segurança cibernética</td>
                <td>Legítimo interesse (art. 7º, IX)</td>
              </tr>
              <tr>
                <td>Cumprimento de obrigações legais e regulatórias</td>
                <td>Cumprimento de obrigação legal (art. 7º, II)</td>
              </tr>
              <tr>
                <td>Exercício regular de direitos em processos judiciais</td>
                <td>Exercício regular de direitos (art. 7º, VI)</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>5. COMPARTILHAMENTO DE DADOS</h2>
          <p>5.1. A Lotio poderá compartilhar dados pessoais com:</p>
          <ul>
            <li><strong>a) Provedores de infraestrutura:</strong> Serviços de hospedagem em nuvem, bancos de dados, CDN, para operação da Plataforma;</li>
            <li><strong>b) Gateways de pagamento:</strong> Stripe, Mercado Pago, PagSeguro, Asaas, Pagar.me — exclusivamente para processamento de cobranças da assinatura da Lotio. As integrações de pagamento do Contratante são geridas diretamente por ele;</li>
            <li><strong>c) Provedores de e-mail:</strong> Para envio de e-mails transacionais (confirmação de conta, 2FA, notificações);</li>
            <li><strong>d) Provedores de IA:</strong> Quando o Contratante utilizar módulos de IA com suas próprias chaves de API. Os dados enviados aos provedores de IA são de responsabilidade do Contratante;</li>
            <li><strong>e) Provedores de mensageria:</strong> Quando o Contratante utilizar canais como WhatsApp/WhatsApp Business Platform ou integrações equivalentes para atendimento de leads. Nesses casos, dados de contato e conteudo de mensagens podem ser processados pelo respectivo provedor terceiro, conforme seus proprios termos e politicas;</li>
            <li><strong>f) Autoridades públicas:</strong> Quando houver obrigação legal, determinação judicial ou requisição administrativa legítima;</li>
            <li><strong>g) Auditores e consultores:</strong> Para cumprimento de obrigações legais e regulatórias, sob obrigação de sigilo.</li>
          </ul>
          <p>5.2. A Lotio <strong>não comercializa, aluga ou compartilha</strong> dados pessoais com terceiros para fins de marketing ou publicidade.</p>
          <p>5.3. O uso de canais de mensageria de terceiros para atendimento (incluindo WhatsApp) depende de politicas e disponibilidade desses provedores, podendo ocorrer interferencias, atrasos, pausas, bloqueios ou desativacoes fora da governanca direta da Lotio.</p>
          <p>5.4. Imagens, textos, videos, documentos comerciais e demais conteudos publicados nos empreendimentos sao fornecidos pela loteadora/Contratante, que responde integralmente pela legalidade, veracidade e adequacao desses materiais.</p>
        </section>

        <section>
          <h2>6. ARMAZENAMENTO E SEGURANÇA</h2>
          <p>6.1. Os dados pessoais são armazenados em servidores seguros com as seguintes medidas de proteção:</p>
          <ul>
            <li>Criptografia de senhas com algoritmo bcrypt (hash irreversível);</li>
            <li>Comunicação via HTTPS/TLS em todas as transmissões;</li>
            <li>Controle de acesso baseado em papéis (RBAC);</li>
            <li>Arquitetura multi-tenant com isolamento lógico de dados;</li>
            <li>Tokens JWT com expiração configurada (8 horas para acesso, 7 dias para refresh);</li>
            <li>Refresh tokens armazenados em formato hash;</li>
            <li>Autenticação de dois fatores (2FA) opcional;</li>
            <li>Rate limiting (throttling) para proteção contra ataques de força bruta;</li>
            <li>Backups regulares com criptografia;</li>
            <li>Monitoramento contínuo de segurança.</li>
          </ul>
          <p>6.2. Os dados são armazenados em infraestrutura de nuvem localizada no Brasil ou em jurisdições que ofereçam nível adequado de proteção de dados, nos termos do artigo 33 da LGPD.</p>
        </section>

        <section>
          <h2>7. RETENÇÃO DE DADOS</h2>
          <p>7.1. Os dados pessoais são retidos conforme os seguintes critérios:</p>
          <table class="legal-table">
            <thead>
              <tr>
                <th>Tipo de Dado</th>
                <th>Período de Retenção</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Dados de conta de usuário</td>
                <td>Enquanto a conta estiver ativa + 30 dias após cancelamento</td>
              </tr>
              <tr>
                <td>Dados de leads e clientes</td>
                <td>Enquanto o Tenant estiver ativo + 60 dias para exportação</td>
              </tr>
              <tr>
                <td>Dados de rastreamento/sessões</td>
                <td>24 meses a partir da coleta</td>
              </tr>
              <tr>
                <td>Transcrição e resumo de conversa com assistente virtual</td>
                <td>24 meses a partir do registro, salvo exclusão antecipada por solicitação válida</td>
              </tr>
              <tr>
                <td>Registros de aceite de termos</td>
                <td>5 anos após o encerramento da conta (obrigação legal)</td>
              </tr>
              <tr>
                <td>Logs de acesso</td>
                <td>6 meses (art. 15 do Marco Civil da Internet)</td>
              </tr>
              <tr>
                <td>Dados de cobrança/faturas</td>
                <td>5 anos (obrigação tributária e fiscal)</td>
              </tr>
              <tr>
                <td>Dados para exercício regular de direitos</td>
                <td>Até prescrição da pretensão (até 10 anos, conforme o caso)</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>8. DIREITOS DO TITULAR</h2>
          <p>8.1. Nos termos dos artigos 17 a 22 da LGPD, o titular de dados pessoais tem direito a:</p>
          <ul>
            <li><strong>a)</strong> Confirmação da existência de tratamento;</li>
            <li><strong>b)</strong> Acesso aos dados;</li>
            <li><strong>c)</strong> Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li><strong>d)</strong> Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade;</li>
            <li><strong>e)</strong> Portabilidade dos dados a outro fornecedor;</li>
            <li><strong>f)</strong> Eliminação dos dados pessoais tratados com consentimento;</li>
            <li><strong>g)</strong> Informação sobre entidades com as quais os dados foram compartilhados;</li>
            <li><strong>h)</strong> Informação sobre a possibilidade de não fornecer consentimento e suas consequências;</li>
            <li><strong>i)</strong> Revogação do consentimento.</li>
          </ul>
          <p>8.2. As solicitações deverão ser encaminhadas ao Encarregado de Dados (DPO) pelo e-mail <strong>dpo@lotio.com.br</strong> e serão atendidas no prazo de 15 (quinze) dias úteis, conforme previsto na LGPD.</p>
          <p>8.3. A Lotio poderá solicitar a verificação de identidade do solicitante para garantir a segurança do processo.</p>
          <p>8.4. <strong>Importante:</strong> No caso de dados de leads e clientes inseridos pelo Contratante na Plataforma, a Lotio atua como Operadora. Os titulares desses dados devem direcionar suas solicitações diretamente ao Contratante (Controlador), que poderá utilizar a Plataforma para atender as requisições.</p>
        </section>

        <section>
          <h2>9. COOKIES E TECNOLOGIAS DE RASTREAMENTO</h2>
          <p>9.1. A Plataforma utiliza as seguintes tecnologias:</p>
          <ul>
            <li><strong>Cookies essenciais:</strong> Necessários para o funcionamento da Plataforma (autenticação, sessão);</li>
            <li><strong>Local Storage:</strong> Armazenamento de tokens de acesso e preferências do usuário;</li>
            <li><strong>Rastreamento de sessão:</strong> Coleta de dados de navegação nos sites de projetos publicados.</li>
          </ul>
          <p>9.2. O Contratante é responsável por implementar banners de consentimento de cookies em seus sites de projetos publicados, quando exigido pela legislação aplicável.</p>
        </section>

        <section>
          <h2>10. TRANSFERÊNCIA INTERNACIONAL DE DADOS</h2>
          <p>10.1. Alguns provedores utilizados pela Plataforma podem estar localizados fora do Brasil. Nestes casos, a transferência internacional de dados ocorrerá em conformidade com o artigo 33 da LGPD, mediante:</p>
          <ul>
            <li>Contratação de provedores em países com nível adequado de proteção reconhecido pela ANPD;</li>
            <li>Cláusulas contratuais específicas que garantem a proteção dos dados;</li>
            <li>Adoção de medidas técnicas e organizacionais adequadas.</li>
          </ul>
        </section>

        <section>
          <h2>11. DADOS DE MENORES</h2>
          <p>11.1. A Plataforma Lotio é destinada a usuários maiores de 18 (dezoito) anos. Não coletamos intencionalmente dados de menores de idade.</p>
          <p>11.2. Caso tomemos ciência de coleta inadvertida de dados de menores, providenciaremos sua eliminação imediata.</p>
        </section>

        <section>
          <h2>12. INCIDENTES DE SEGURANÇA</h2>
          <p>12.1. Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, a Lotio:</p>
          <ul>
            <li><strong>a)</strong> Comunicará a Autoridade Nacional de Proteção de Dados (ANPD) no prazo regulamentar;</li>
            <li><strong>b)</strong> Comunicará os titulares afetados, descrevendo a natureza do incidente, os dados afetados e as medidas adotadas;</li>
            <li><strong>c)</strong> Adotará medidas técnicas para mitigar os efeitos do incidente.</li>
          </ul>
        </section>

        <section>
          <h2>13. ALTERAÇÕES NA POLÍTICA</h2>
          <p>13.1. Esta Política poderá ser atualizada periodicamente. As alterações serão comunicadas por e-mail e/ou notificação na Plataforma com antecedência mínima de 15 (quinze) dias.</p>
          <p>13.2. A versão vigente estará sempre disponível nesta página.</p>
          <p>13.3. O uso continuado da Plataforma após a comunicação das alterações constitui aceitação da nova Política.</p>
        </section>

        <section class="legal-contact">
          <h2>14. CONTATO</h2>
          <p>Para exercer seus direitos como titular de dados ou esclarecer dúvidas sobre esta Política:</p>
          <p><strong>Encarregado de Dados (DPO):</strong> dpo@lotio.com.br</p>
          <p><strong>Suporte geral:</strong> contato@lotio.com.br</p>
          <p>A Lotio se compromete a responder todas as solicitações dentro do prazo legal de 15 (quinze) dias úteis.</p>
        </section>

      </div>

      <div class="legal-footer">
        <p>© {{ new Date().getFullYear() }} Lotio Tecnologia. Todos os direitos reservados.</p>
        <div class="legal-links">
          <NuxtLink to="/termos-de-uso">Termos de Uso</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'public'
})

useHead({
  title: 'Política de Privacidade — Lotio'
})
</script>

<style scoped>
.legal-page {
  min-height: 100vh;
  background: var(--gray-50, #f8fafc);
  padding: 2rem 1rem;
}

.legal-container {
  max-width: 860px;
  margin: 0 auto;
  background: white;
  border-radius: var(--radius-xl, 16px);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,.1));
  padding: 3rem;
  border: 1px solid var(--gray-200, #e2e8f0);
}

.back-home {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--gray-500, #64748b);
  text-decoration: none;
  font-size: 0.875rem;
  margin-bottom: 2rem;
  transition: color 0.2s;
}

.back-home:hover {
  color: var(--primary, #2563eb);
}

.legal-header {
  text-align: center;
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid var(--gray-100, #f1f5f9);
}

.legal-logo {
  height: 40px;
  margin-bottom: 1.5rem;
}

.legal-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--gray-900, #0f172a);
  margin: 0 0 0.5rem;
}

.legal-version {
  font-size: 0.875rem;
  color: var(--gray-500, #64748b);
}

.legal-content section {
  margin-bottom: 2rem;
}

.legal-content h2 {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--gray-800, #1e293b);
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--gray-100, #f1f5f9);
}

.legal-content p {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--gray-700, #334155);
  margin-bottom: 0.75rem;
  text-align: justify;
}

.legal-content ul {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

.legal-content li {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--gray-700, #334155);
  margin-bottom: 0.5rem;
}

.legal-content a {
  color: var(--primary, #2563eb);
  text-decoration: none;
  font-weight: 500;
}

.legal-content a:hover {
  text-decoration: underline;
}

.legal-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.875rem;
}

.legal-table th,
.legal-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border: 1px solid var(--gray-200, #e2e8f0);
  color: var(--gray-700, #334155);
}

.legal-table th {
  background: var(--gray-50, #f8fafc);
  font-weight: 600;
  color: var(--gray-800, #1e293b);
}

.legal-table tr:hover {
  background: var(--gray-50, #f8fafc);
}

.legal-contact {
  background: var(--gray-50, #f8fafc);
  padding: 1.5rem;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--gray-200, #e2e8f0);
}

.legal-footer {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 2px solid var(--gray-100, #f1f5f9);
  text-align: center;
}

.legal-footer p {
  font-size: 0.8125rem;
  color: var(--gray-500, #64748b);
  margin-bottom: 0.5rem;
}

.legal-links {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
}

.legal-links a {
  font-size: 0.8125rem;
  color: var(--primary, #2563eb);
  text-decoration: none;
}

.legal-links a:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .legal-container {
    padding: 1.5rem;
  }
  .legal-header h1 {
    font-size: 1.5rem;
  }
  .legal-table {
    font-size: 0.8125rem;
  }
  .legal-table th,
  .legal-table td {
    padding: 0.5rem;
  }
}
</style>
