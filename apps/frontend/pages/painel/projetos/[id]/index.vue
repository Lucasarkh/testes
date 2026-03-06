<template>
  <div>
    <div v-if="loading" class="loading-state"><div class="loading-spinner"></div></div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-primary" style="margin-top: 16px;" @click="loadProject">Tentar novamente</button>
    </div>

    <template v-else-if="project">
      <div class="page-header" style="border-bottom: 1px solid var(--glass-border-subtle); padding-bottom: 24px; margin-bottom: 32px;">
        <div style="flex: 1;">
          <div class="flex items-center gap-2" style="margin-bottom: 4px;">
            <NuxtLink to="/painel/projetos" class="btn btn-sm" style="padding-left: 0; color: var(--color-surface-200);">← Projetos</NuxtLink>
            <div style="width: 1px; height: 10px; background: rgba(255, 255, 255, 0.06);"></div>
            <span class="badge" :class="project.status === 'PUBLISHED' ? 'badge-success' : 'badge-neutral'" style="font-size: 0.6rem; letter-spacing: 0.05em; text-transform: uppercase;">
              {{ project.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho' }}
            </span>
          </div>
          <h1 style="margin: 0; font-size: 1.75rem; letter-spacing: -0.02em;">{{ project.name }}</h1>
          <p style="margin: 0; color: var(--color-surface-400); font-weight: 500;">{{ project.description || 'Sem descrição' }}</p>

          <!-- Quick Stats -->
          <div v-if="lots.length > 0" class="project-stats-bar">
            <div class="stat-chip">
              <span class="stat-chip-value">{{ lotStats.total }}</span>
              <span class="stat-chip-label">Lotes</span>
            </div>
            <div class="stat-chip stat-chip-success">
              <span class="stat-chip-value">{{ lotStats.available }}</span>
              <span class="stat-chip-label">Disponíveis</span>
            </div>
            <div class="stat-chip stat-chip-warning">
              <span class="stat-chip-value">{{ lotStats.reserved }}</span>
              <span class="stat-chip-label">Reservados</span>
            </div>
            <div class="stat-chip stat-chip-danger">
              <span class="stat-chip-value">{{ lotStats.sold }}</span>
              <span class="stat-chip-label">Vendidos</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <a
            v-if="project.status === 'PUBLISHED'"
            :href="`/${project.slug}`"
            target="_blank"
            class="btn btn-sm btn-primary"
            style="border-radius: 9999px; padding-left: 20px; padding-right: 20px; height: 38px;"
          >
            <span style="font-size: 1rem;">🌐</span>
            <span>Ver Página Pública</span>
          </a>

          <NuxtLink
            v-else
            :to="`/preview/${project.id}`"
            target="_blank"
            class="btn btn-sm btn-secondary"
            style="border-radius: 9999px; padding-left: 20px; padding-right: 20px; height: 38px;"
          >
            <span style="font-size: 1rem;">👀</span>
            <span>Link de Preview</span>
          </NuxtLink>

          <div style="width: 1px; height: 24px; background: rgba(255, 255, 255, 0.06);"></div>

          <div class="flex items-center gap-2">
            <button 
              v-if="authStore.canEdit" 
              class="btn btn-sm" 
              :class="project.status === 'PUBLISHED' ? 'btn-secondary' : 'btn-success'" 
              style="border-radius: 9999px; padding-left: 20px; padding-right: 20px; height: 38px;"
              @click="togglePublish"
            >
              <span>{{ project.status === 'PUBLISHED' ? '⏸️ Parar Publicação' : '📡 Publicar Agora' }}</span>
            </button>
            
            <button 
              v-if="authStore.canEdit" 
              class="btn btn-sm btn-danger" 
              style="border-radius: 9999px; padding-left: 16px; padding-right: 16px; height: 38px;"
              @click="confirmDelete"
            >
              <span>🗑️ Excluir</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Sidebar + Content Layout -->
      <div class="project-layout">
        <aside class="project-sidebar">
          <nav class="sidebar-nav">
            <button v-for="s in sidebarSections" :key="s.id" class="sidebar-link" :class="{ active: activeSection === s.id }" @click="activeSection = s.id">
              <span class="sidebar-icon">{{ s.icon }}</span>
              <span class="sidebar-label">{{ s.label }}</span>
            </button>
          </nav>
          <div class="sidebar-divider"></div>
          <div class="sidebar-tools">
            <NuxtLink :to="`/painel/projetos/${projectId}/planta`" class="sidebar-tool-link">
              <span class="sidebar-icon">🗺️</span>
              <span class="sidebar-label">Planta Interativa</span>
            </NuxtLink>
            <NuxtLink :to="`/painel/projetos/${projectId}/panorama`" class="sidebar-tool-link">
              <span class="sidebar-icon">🌄</span>
              <span class="sidebar-label">Panorama 360°</span>
            </NuxtLink>
          </div>
        </aside>

        <main class="project-content">

      <!-- Configurações do Projeto -->
      <section v-if="activeSection === 'configuracoes'" id="configuracoes" class="content-section">
        <div class="card" style="max-width: 600px;">
          <form @submit.prevent="saveSettings">
            <div class="form-group">
              <label class="form-label">Nome</label>
              <input v-model="editForm.name" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Slug</label>
              <input v-model="editForm.slug" class="form-input" :class="{ 'input-error': editSlugTaken }" required />
              <small v-if="editSlugTaken" style="color:var(--error-color, #ef4444); font-size:0.75rem">Este slug já está em uso por outro projeto!</small>
              <small v-else style="color:var(--color-surface-400); font-size:0.75rem">URL pública: /{{ editForm.slug || '...' }}</small>
            </div>
            <div class="form-group">
              <label class="form-label">Descrição</label>
              <textarea v-model="editForm.description" class="form-textarea" rows="3"></textarea>
            </div>
            <div v-if="authStore.isSysAdmin" class="form-group">
              <label class="form-label">Domínio Customizado (Somente SysAdmin)</label>
              <input v-model="editForm.customDomain" class="form-input" placeholder="ex: vendas.meu-loteamento.com" />
              <small class="text-muted">Informe o domínio completo ou subdomínio que aponta para cá.</small>
            </div>
            <div v-if="settingsError" class="alert alert-error">{{ settingsError }}</div>
            <div v-if="settingsSaved" class="alert alert-success">Salvo com sucesso!</div>
            <button type="submit" class="btn btn-primary" :disabled="savingSettings || editSlugTaken">{{ savingSettings ? 'Salvando...' : 'Salvar' }}</button>
          </form>
        </div>
      </section>

      <!-- Pagamentos & Taxas -->
      <section v-if="activeSection === 'pagamentos'" id="pagamentos" class="content-section">
        <div class="card" style="max-width: 800px;">
          <h3>💳 Ativar Gateways de Pagamento</h3>
          <p class="text-muted">Selecione abaixo quais perfis de pagamento globais você deseja habilitar para este projeto.</p>
          
          <div v-if="loadingPaymentOptions" class="flex justify-center p-8">
             <div class="loader"></div>
          </div>

          <div v-else-if="allConfigs.length === 0" class="empty-state" style="padding: 24px;">
            <div class="icon-blob mx-auto mb-4">💳</div>
            <p>Nenhum perfil de pagamento configurado globalmente.</p>
            <NuxtLink to="/painel/pagamentos" class="btn btn-primary btn-sm rounded-pill px-4">Criar Primeiro Perfil</NuxtLink>
          </div>

          <div v-else class="grid gap-4" style="margin-top: 24px;">
            <div v-for="config in allConfigs" :key="config.id" 
                 class="flex items-center justify-between p-4 border rounded-lg"
                 :style="{ borderColor: isConfigActive(config.id) ? 'var(--color-primary-500)' : 'var(--glass-border-subtle)', background: isConfigActive(config.id) ? 'rgba(16, 185, 129, 0.1)' : 'var(--glass-bg)' }">
              <div class="flex items-center gap-3">
                <div class="provider-badge-sm" :class="config.provider.toLowerCase()">{{ config.provider }}</div>
                <div>
                  <div style="font-weight: 600;">{{ config.name }}</div>
                  <div style="font-size: 0.75rem; color: var(--color-surface-400);">ID: {{ config.id.split('-')[0] }}...</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span style="font-size: 0.8rem; font-weight: 600;" :style="{ color: isConfigActive(config.id) ? 'var(--color-primary-500)' : 'var(--color-surface-500)' }">
                  {{ isConfigActive(config.id) ? 'Habilitado' : 'Desabilitado' }}
                </span>
                <div class="toggle-switch">
                  <input type="checkbox" :checked="isConfigActive(config.id)" @change="toggleGateway(config.id, !isConfigActive(config.id))" :id="'config-'+config.id" />
                  <label :for="'config-'+config.id"></label>
                </div>
              </div>
            </div>
          </div>

          <div style="background: var(--glass-bg-heavy); padding: 16px; border-radius: 8px; margin-top: 32px; border: 1px solid var(--glass-border-subtle);">
            <h4 style="margin: 0 0 8px 0; font-size: 0.9rem; color: var(--color-surface-200);">Como funciona?</h4>
            <p style="font-size: 0.8rem; margin: 0; color: var(--color-surface-200); line-height: 1.5;">
              As chaves e credenciais são gerenciadas na página global de <b>Pagamentos</b>. 
              Aqui você apenas decide qual conta receberá os pagamentos deste projeto específico. 
              Se múltiplos gateways forem habilitados, o sistema usará o primeiro ativo.
            </p>
          </div>

          <!-- Reservation Fee Config -->
          <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--glass-border-subtle);">
            <h3 style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span>🎟️</span> Taxa de Reserva Online
            </h3>
            <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 24px;">Configure o valor que o cliente deve pagar para reservar um lote online via cartão ou PIX.</p>

            <!-- Guard: no gateways active -->
            <div v-if="activeConfigs.length === 0 && allConfigs.length > 0" style="padding: 12px 16px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.15); border-radius: 10px; margin-bottom: 20px; font-size: 0.8rem; display: flex; align-items: center; gap: 8px;">
              <span>⚠️</span>
              <span style="color: #d97706;">Nenhum gateway de pagamento habilitado para este projeto. Ative um acima para que a reserva online funcione.</span>
            </div>
            
            <div class="grid grid-cols-2 gap-6">
              <div class="form-group">
                <label class="form-label">Tipo de Cobrança</label>
                <select v-model="editForm.reservationFeeType" class="form-input">
                  <option value="FIXED">Valor Fixo (R$)</option>
                  <option value="PERCENTAGE">Porcentagem do Valor do Lote (%)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">
                  {{ editForm.reservationFeeType === 'FIXED' ? 'Valor da Reserva (R$)' : 'Porcentagem da Reserva (%)' }}
                </label>
                <input v-model.number="editForm.reservationFeeValue" type="number" step="0.01" class="form-input" 
                       :placeholder="editForm.reservationFeeType === 'FIXED' ? 'Ex: 500.00' : 'Ex: 0.5'" />
                <small v-if="editForm.reservationFeeType === 'PERCENTAGE'" style="color: var(--color-surface-400); font-size: 0.75rem;">
                  Ex: 0.5 = 0,5% do valor total do lote.
                </small>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-6" style="margin-top: 16px;">
              <div class="form-group">
                <label class="form-label">Tempo de Expiração da Reserva (Horas)</label>
                <input v-model.number="editForm.reservationExpiryHours" type="number" class="form-input" placeholder="Ex: 24" />
                <small class="text-muted">Tempo que o lote ficará reservado aguardando confirmação (manual ou pagamento). Padrão: 24h.</small>
              </div>
            </div>
            
            <div class="flex justify-end" style="margin-top: 20px;">
              <button class="btn btn-primary" @click="saveSettings" :disabled="savingSettings" style="min-width: 200px;">
                {{ savingSettings ? 'Salvando...' : '💾 Salvar Configuração de Taxa' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Assistente IA -->
      <section v-if="activeSection === 'assistente-ia'" id="assistente-ia" class="content-section">
        <div class="card" style="max-width: 600px;">
          <h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span>🤖</span> Assistente de IA
          </h3>
          <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 24px;">
            Habilite um assistente virtual para ajudar clientes interessados. A IA responderá perguntas sobre lotes, disponibilidade e preços de acordo com os dados deste projeto.
          </p>

          <div class="form-group" style="display:flex; align-items:center; gap: 8px; margin-bottom: 24px;">
            <input type="checkbox" v-model="editForm.aiEnabled" id="chkAiEnabled" style="width:20px; height:20px; cursor:pointer;" />
            <label for="chkAiEnabled" style="font-weight: 600; cursor:pointer;">Ativar assistente de IA para este projeto</label>
          </div>

          <div v-if="editForm.aiEnabled">
            <div class="form-group">
              <label class="form-label">Configuração de IA</label>
              <div class="form-input" style="display:flex; align-items:center; min-height: 42px; color: var(--color-surface-200);">
                {{ activeAiConfigLabel || 'A configuração será vinculada automaticamente ao salvar.' }}
              </div>
              <small class="text-muted">As configurações de modelos e chaves de API são feitas na página <NuxtLink to="/painel/ai">Assistente IA</NuxtLink>.</small>
            </div>
            
            <div v-if="aiConfigs.length === 0" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 12px; border-radius: 8px; font-size: 0.85rem; margin-top: 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
              ⚠️ Você ainda não tem nenhuma configuração de IA cadastrada. <NuxtLink to="/painel/ai" style="color: #ef4444; font-weight: 700;">Clique aqui para criar</NuxtLink>.
            </div>

            <div v-else style="background: rgba(59, 130, 246, 0.08); color: #60a5fa; padding: 12px; border-radius: 8px; font-size: 0.85rem; margin-top: 12px; border: 1px solid rgba(59, 130, 246, 0.3);">
              ℹ️ A configuração da página Assistente IA será usada automaticamente neste projeto.
            </div>
          </div>

          <div class="flex justify-end" style="margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--glass-border-subtle);">
            <button class="btn btn-primary" @click="saveSettings" :disabled="savingSettings">
              {{ savingSettings ? 'Salvando...' : '💾 Salvar Configurações de IA' }}
            </button>
          </div>
        </div>
      </section>

      <!-- Agendamento de Visitas -->
      <section v-if="activeSection === 'agendamento'" id="agendamento" class="content-section">
        <div class="card" style="max-width: 900px;">
          <div class="flex justify-between items-center" style="margin-bottom: 24px;">
            <div>
              <h3 style="margin:0; display: flex; align-items: center; gap: 8px;">
                <span>📅</span> Configurações de Agendamento de Visitas
              </h3>
              <p class="text-muted" style="font-size: 0.85rem; margin-top: 4px;">Defina os horários e regras para que clientes agendem visitas ao empreendimento.</p>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" v-model="schedulingForm.enabled" id="chkSchedEnabled" />
              <label for="chkSchedEnabled"></label>
            </div>
          </div>

          <div v-if="loadingScheduling" class="flex justify-center p-8">
            <div class="loader"></div>
          </div>

          <template v-else>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <!-- Horários Base -->
              <div style="background: var(--glass-bg-heavy); padding: 24px; border-radius: 12px; border: 1px solid var(--glass-border-subtle);">
                <h4 style="margin-bottom: 20px; font-size: 0.9rem; text-transform: uppercase; color: var(--color-surface-400); letter-spacing: 0.5px;">Atendimento Base</h4>
                
                <div class="grid grid-cols-2 gap-4">
                  <div class="form-group">
                    <label class="form-label">Início do Expediente</label>
                    <input v-model="schedulingForm.startTime" type="time" class="form-input" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Fim do Expediente</label>
                    <input v-model="schedulingForm.endTime" type="time" class="form-input" />
                  </div>
                </div>

                <div class="form-group" style="margin-top: 12px;">
                  <label class="form-label">Intervalo entre Visitas (minutos)</label>
                  <select v-model.number="schedulingForm.scheduleInterval" class="form-input">
                    <option :value="15">15 minutos</option>
                    <option :value="30">30 minutos</option>
                    <option :value="45">45 minutos</option>
                    <option :value="60">1 hora</option>
                    <option :value="90">1 hora e 30 min</option>
                    <option :value="120">2 horas</option>
                  </select>
                </div>

                <div class="form-group" style="margin-top: 12px;">
                  <label class="form-label">Visitas Simultâneas (Limite por horário)</label>
                  <input v-model.number="schedulingForm.maxSimultaneous" type="number" min="1" class="form-input" placeholder="Ex: 1" />
                  <small class="text-muted">Quantos corretores podem atender no mesmo horário.</small>
                </div>
              </div>

              <!-- Dias Disponíveis -->
              <div style="background: var(--glass-bg); padding: 24px; border-radius: 12px; border: 1px solid var(--glass-border-subtle);">
                <h4 style="margin-bottom: 20px; font-size: 0.9rem; text-transform: uppercase; color: var(--color-surface-400); letter-spacing: 0.5px;">Dias da Semana</h4>
                <div class="grid grid-cols-1 gap-2">
                  <label v-for="day in [
                    {k: 'MON', label: 'Segunda-feira'}, 
                    {k: 'TUE', label: 'Terça-feira'}, 
                    {k: 'WED', label: 'Quarta-feira'}, 
                    {k: 'THU', label: 'Quinta-feira'}, 
                    {k: 'FRI', label: 'Sexta-feira'}, 
                    {k: 'SAT', label: 'Sábado'}, 
                    {k: 'SUN', label: 'Domingo'}
                  ]" :key="day.k" class="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                    <input type="checkbox" :value="day.k" v-model="schedulingForm.availableDays" class="w-4 h-4 cursor-pointer" />
                    <span style="font-size: 0.9rem; font-weight: 500;">{{ day.label }}</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Intervals & Breaks -->
            <div style="margin-top: 24px;">
              <h4 style="margin-bottom: 20px; font-size: 0.9rem; text-transform: uppercase; color: var(--color-surface-400); letter-spacing: 0.5px;">Intervalos e Pausas</h4>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Almoço -->
                <div style="padding: 20px; border: 1px dashed var(--color-surface-600); border-radius: 12px;">
                  <h5 style="margin-bottom: 12px; font-weight: 600;">🍽️ Intervalo de Almoço</h5>
                  <div class="grid grid-cols-2 gap-4">
                    <div class="form-group">
                      <label class="form-label" style="font-size: 0.75rem;">Início</label>
                      <input v-model="schedulingForm.lunchStart" type="time" class="form-input" />
                    </div>
                    <div class="form-group">
                      <label class="form-label" style="font-size: 0.75rem;">Fim</label>
                      <input v-model="schedulingForm.lunchEnd" type="time" class="form-input" />
                    </div>
                  </div>
                  <small class="text-muted">Horários bloqueados diariamente.</small>
                </div>

                <!-- Custom Breaks -->
                <div style="padding: 20px; border: 1px dashed var(--color-surface-600); border-radius: 12px;">
                  <div class="flex justify-between items-center" style="margin-bottom: 12px;">
                    <h5 style="margin:0; font-weight: 600;">☕ Outras Pausas Curtas</h5>
                    <button @click="addBreak" class="btn btn-xs btn-ghost">+ Adicionar</button>
                  </div>
                  
                  <div v-if="schedulingForm.breaks.length === 0" class="text-center py-4 text-muted" style="font-size: 0.8rem;">
                    Nenhuma outra pausa configurada.
                  </div>

                  <div v-for="(b, idx) in schedulingForm.breaks" :key="idx" 
                       style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; background: var(--glass-bg-heavy); padding: 8px; border-radius: 8px;">
                    <input v-model="b.name" placeholder="Motivo" class="form-input btn-xs" style="flex: 2" />
                    <input v-model="b.start" type="time" class="form-input btn-xs" style="flex: 1" />
                    <span style="font-size: 10px; color: var(--color-surface-500);">até</span>
                    <input v-model="b.end" type="time" class="form-input btn-xs" style="flex: 1" />
                    <button @click="removeBreak(idx)" class="btn btn-xs btn-ghost btn-danger" style="padding: 0 4px;">✕</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end pt-8" style="border-top: 1px solid var(--glass-border-subtle); margin-top: 32px;">
              <!-- Guard: enabled but no days selected -->
              <div v-if="schedulingForm.enabled && schedulingForm.availableDays.length === 0" style="padding: 10px 14px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.15); border-radius: 8px; margin-right: auto; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
                <span>❌</span>
                <span style="color: #f87171;">Selecione ao menos um dia da semana para habilitar o agendamento.</span>
              </div>
              <button class="btn btn-primary" @click="saveSchedulingSettings" :disabled="savingScheduling || (schedulingForm.enabled && schedulingForm.availableDays.length === 0)" style="min-width: 200px; height: 48px; border-radius: 12px;">
                {{ savingScheduling ? 'Salvando...' : '💾 Salvar Configuração de Agenda' }}
              </button>
            </div>
          </template>
        </div>
      </section>

      <!-- Simulação Financeira -->
      <section v-if="activeSection === 'financeiro'" id="financeiro" class="content-section">
      <div class="financing-layout-v4">
        <div class="card" style="flex: 1; max-width: 800px;">
          <h3 style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            <span>🧮</span> Regras de Simulação Financeira
          </h3>
          <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 24px;">Configure as regras padrão para o simulador que aparece na página dos lotes.</p>

          <div class="form-group" style="display:flex; align-items:center; gap: 8px; margin-bottom: 32px; background: rgba(245, 158, 11, 0.1); padding: 16px; border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.3);">
            <input type="checkbox" v-model="editForm.showPaymentConditions" id="chkShowSimOnFinancing" style="width:20px; height:20px; cursor:pointer;" />
            <label for="chkShowSimOnFinancing" style="font-weight: 700; cursor:pointer; color: #fbbf24;">✅ Habilitar Simulador nas Páginas Públicas</label>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div class="form-group">
              <label class="form-label">Entrada Mínima (%)</label>
              <input v-model.number="editForm.minDownPaymentPercent" type="number" class="form-input" placeholder="Ex: 10" />
            </div>
            <div class="form-group">
              <label class="form-label">Entrada Mínima Fixa (R$)</label>
              <input v-model.number="editForm.minDownPaymentValue" type="number" class="form-input" placeholder="Ex: 15000" />
              <small class="text-muted">Se preenchido, o sistema usará o maior entre % e Valor Fixo.</small>
            </div>
            <div class="form-group">
              <label class="form-label">Número Máximo de Parcelas</label>
              <input v-model.number="editForm.maxInstallments" type="number" class="form-input" placeholder="Ex: 180" />
            </div>
            <div class="form-group">
              <label class="form-label">Taxa de Juros Mensal (%)</label>
              <input v-model.number="editForm.monthlyInterestRate" type="number" step="0.01" class="form-input" placeholder="Ex: 0.9" />
            </div>
            <div class="form-group">
              <label class="form-label">Indexador de Correção</label>
              <input v-model="editForm.indexer" class="form-input" placeholder="Ex: IGP-M, IPCA..." />
            </div>
            <div class="form-group">
              <label class="form-label">Parcelas Intermediárias (Balões)</label>
              <div style="display:flex; align-items:center; gap: 8px; height: 42px;">
                <input type="checkbox" v-model="editForm.allowIntermediary" id="chkInter" style="width:18px; height:18px; cursor:pointer;" />
                <label for="chkInter" style="margin:0; cursor:pointer; font-weight:600;">Permitir cálculo de balões anuais</label>
              </div>
            </div>
          </div>

          <div class="form-group" style="margin-top: 16px;">
            <label class="form-label">Aviso Legal (Disclaimer)</label>
            <textarea v-model="editForm.financingDisclaimer" class="form-textarea" rows="2"></textarea>
            <small class="text-muted">Aparecerá abaixo do resultado da simulação.</small>
          </div>

          <div class="flex justify-end" style="margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--glass-border-subtle);">
            <button class="btn btn-primary" @click="saveSettings" :disabled="savingSettings" style="min-width: 200px;">
              {{ savingSettings ? 'Salvando...' : '💾 Salvar Regras Financeiras' }}
            </button>
          </div>
        </div>

        <!-- LIVE PREVIEW SIDEBAR -->
        <div class="financing-preview-sidebar">
          <div class="preview-header">
            <h4>👀 Preview em Tempo Real</h4>
            <p>Assim é como o simulador aparece na página pública</p>
          </div>

          <div class="simulator-card-v4">
            <div class="sim-header" style="background: rgba(96, 165, 250, 0.08);">
              <div class="h-item">
                <span class="l" style="font-weight: 700; color: var(--v4-primary);">Valor do Lote (Simulado)</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 1.5rem; font-weight: 800; color: var(--v4-primary);">R$</span>
                  <input v-model.number="previewLotPrice" type="number" step="1000" style="font-size: 1.5rem; font-weight: 800; color: var(--v4-primary); border: none; background: transparent; padding: 0; outline: none; width: 100%;" />
                </div>
                <small style="color: var(--v4-primary); font-weight: 500; opacity: 0.8;">Digite aqui o valor para testar a simulação</small>
              </div>
            </div>

            <div class="sim-body">
              <!-- Down Payment Selection -->
              <div class="input-group-v4">
                <div class="ig-label">Quanto deseja dar de entrada?</div>
                <div class="ig-flex">
                  <div class="ig-field" style="flex: 2;">
                    <span class="ig-curr">R$</span>
                    <input v-model.number="previewDownPayment" type="number" step="0.01" @input="updatePercentFromDownPaymentPreview" class="ig-input" :min="minDownPaymentValueForPreview" />
                  </div>
                  <div class="ig-field" style="flex: 1;">
                    <input v-model.number="previewDownPaymentPercent" type="number" step="0.1" class="ig-input" />
                    <span class="ig-curr">%</span>
                  </div>
                </div>
                <small class="ig-hint">Entrada mínima: {{ formatCurrencyToBrasilia(minDownPaymentValueForPreview) }} ({{ editForm?.minDownPaymentPercent || 10 }}%)</small>
              </div>

              <!-- Installments Slider -->
              <div class="input-group-v4" style="margin-top: 32px;">
                <div class="ig-label">Número de Parcelas: <strong>{{ previewMonths }} meses</strong></div>
                <div class="slider-wrapper">
                  <input 
                    type="range" 
                    v-model.number="previewMonths" 
                    min="12" 
                    :max="editForm.maxInstallments || 180" 
                    step="12"
                    class="range-slider-v4"
                  />
                  <div class="slider-labels">
                    <span>12x</span>
                    <span>{{ Math.round((editForm.maxInstallments || 180) / 2) }}x</span>
                    <span>{{ editForm.maxInstallments || 180 }}x</span>
                  </div>
                </div>
              </div>

              <!-- Result -->
              <div class="sim-result-v4">
                <div class="r-label">Primeira Parcela Estimada</div>
                <div class="r-value" style="font-size: 2rem;">{{ formatCurrencyToBrasilia(previewResult) }}</div>
                <div class="r-detail">
                  <span v-if="editForm?.monthlyInterestRate > 0">
                    Juros: {{ editForm.monthlyInterestRate }}% am ({{ annualInterestRateEffective.toFixed(2) }}% aa) + {{ editForm.indexer || 'IGP-M' }}
                  </span>
                  <span v-else>Sem juros + {{ editForm.indexer || 'IGP-M' }}</span>
                </div>

                <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(96, 165, 250, 0.15); font-size: 0.85rem; color: rgba(255, 255, 255, 0.7);">
                  <div style="display:flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>Total do Investimento:</span>
                    <strong>{{ formatCurrencyToBrasilia(previewTotalInvested) }}</strong>
                  </div>
                  <div style="display:flex; justify-content: space-between;" v-if="previewTotalInterest > 0">
                    <span>Custo Total de Juros:</span>
                    <strong>{{ formatCurrencyToBrasilia(previewTotalInterest) }}</strong>
                  </div>
                </div>
              </div>

              <div class="sim-disclaimer-v4">
                ⚠️ {{ editForm?.financingDisclaimer || 'Simulação baseada nas regras vigentes. Sujeito à aprovação de crédito e alteração de taxas.' }}
              </div>
            </div>
          </div>
        </div>
      </div>
      </section>

      <!-- Lotes -->
      <section v-if="activeSection === 'lotes'" id="lotes" class="content-section">
        <div v-if="lots.length === 0" class="empty-state-container d-flex align-items-center justify-content-center py-5">
          <div class="card text-center p-5 rounded-5 max-w-500" style="backdrop-filter: blur(var(--glass-blur));">
            <div class="icon-blob mx-auto mb-4">🗺️</div>
            <h3 class="fw-bold mb-3">Nenhum elemento criado na planta</h3>
            <p class="mb-4 px-4">Adicione pontos (hotspots) na Planta Interativa para que apareçam aqui para edição detalhada.</p>
            <NuxtLink :to="`/painel/projetos/${projectId}/planta`" class="btn btn-primary btn-lg rounded-pill px-5">Ir para a Planta</NuxtLink>
          </div>
        </div>
        <div v-else class="table-wrapper">
          <div style="padding: 12px 16px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; margin-bottom: 16px; font-size: 0.85rem; color: #fbbf24; display: flex; align-items: center; gap: 8px;">
            <span>ℹ️</span>
            Todos os pontos criados na Planta Interativa aparecem nesta lista para que você adicione fotos, preços e dados do contrato.
          </div>
          <table>
            <thead>
              <tr><th>Quadra/Lote</th><th>Status</th><th>Valor M²</th><th>Total</th><th>Entrada/Ato</th><th>Área</th><th v-if="authStore.canEdit">Ações</th></tr>
            </thead>
            <tbody>
              <tr v-for="l in lots" :key="l.id">
                <td>
                   <div style="font-weight: 700; color: var(--color-surface-100);">{{ l.block || '' }} {{ l.lotNumber || (l.mapElement?.code || '—') }}</div>
                   <div style="font-size: 0.7rem; color: var(--color-surface-500); display: flex; align-items: center; gap: 4px;">
                     <span class="badge badge-neutral" style="font-size: 8px; padding: 1px 4px; border-radius: 4px;">{{ l.mapElement?.type === 'LOT' ? 'Lote' : 'Ponto' }}</span>
                     <span>{{ l.mapElement?.code }}</span>
                   </div>
                </td>
                <td>
                  <span class="badge" :class="lotBadge(l.status)">{{ lotLabel(l.status) }}</span>
                </td>
                <td style="font-weight: 500;">{{ l.pricePerM2 ? formatCurrencyToBrasilia(l.pricePerM2) : '—' }}</td>
                <td style="font-weight: 700;">{{ l.price ? formatCurrencyToBrasilia(l.price) : '—' }}</td>
                <td style="font-weight: 600; color: var(--color-success);">
                  {{ l.price ? formatCurrencyToBrasilia(Number(l.price) * (project?.minDownPaymentPercent / 100 || 0.1)) : '—' }}
                </td>
                <td style="font-weight: 500;">{{ l.areaM2 ? `${l.areaM2.toFixed(2)} m²` : '—' }}</td>
                <td v-if="authStore.canEdit">
                  <div class="flex gap-2">
                     <button class="btn btn-sm btn-dark" style="background: var(--glass-bg-heavy); color: #fff; border: none;" @click="openEditLot(l)">Editar Dados</button>
                     <button v-if="l.status === 'RESERVED'" class="btn btn-sm btn-warning" @click="openReservationModal(l)">Ver Reserva</button>
                     <a v-if="publicUrl && l.mapElement" :href="`/${project.slug}/${l.mapElement.code}`" target="_blank" class="btn btn-sm btn-outline">Ver Página</a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <CommonPagination :meta="lotsMeta" @change="loadLotsPaginated" />
        </div>
      </section>

      <!-- Reservation Details Modal -->
      <div v-if="viewingReservation" class="modal-overlay" @click.self="viewingReservation = null">
        <div class="modal" style="max-width: 520px;">
          <div class="modal-header" style="margin-bottom: 16px;">
            <h3>Reserva — {{ viewingReservation.mapElement?.code }}</h3>
            <button class="modal-close" @click="viewingReservation = null">✕</button>
          </div>
          <div class="modal-body">
            <div v-if="reservationLoading" class="text-center py-4">Carregando...</div>
            <div v-else-if="reservationData">
              <div class="reservation-section">
                <p class="reservation-section-label">Lead</p>
                <p><strong>Nome:</strong> {{ reservationData.name }}</p>
                <p><strong>E-mail:</strong> {{ reservationData.email || '—' }}</p>
                <p><strong>Telefone:</strong> {{ reservationData.phone || '—' }}</p>
                <p><strong>CPF:</strong> {{ reservationData.cpf || '—' }}</p>
              </div>
              <div class="reservation-section">
                <p class="reservation-section-label">Corretor</p>
                <p><strong>Nome:</strong> {{ reservationData.realtorLink?.name || '—' }}</p>
                <p><strong>Código:</strong> {{ reservationData.realtorLink?.code || '—' }}</p>
                <p v-if="reservationData.realtorLink?.imobiliaria"><strong>Imobiliária:</strong> {{ reservationData.realtorLink.imobiliaria }}</p>
              </div>
              <div class="reservation-section">
                <p class="reservation-section-label">Datas & Condições</p>
                <p><strong>Reservado em:</strong> {{ reservationData.createdAt ? formatDateTimeToBrasilia(reservationData.createdAt) : '—' }}</p>
                <p v-if="project?.reservationExpiryHours && reservationData.createdAt">
                  <strong>Expira em:</strong> {{ reservationExpiry(reservationData.createdAt) }}
                </p>
                <p v-if="project?.reservationFeeValue">
                  <strong>Taxa de Reserva:</strong>
                  {{ project.reservationFeeType === 'PERCENTAGE'
                    ? `${project.reservationFeeValue}%`
                    : formatCurrencyToBrasilia(project.reservationFeeValue) }}
                </p>
              </div>
              <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px; padding-top:16px; border-top: 1px solid var(--glass-border-subtle);">
                <button class="btn btn-ghost btn-sm" @click="viewingReservation = null">Fechar</button>
                <button class="btn btn-danger btn-sm" :disabled="reservationActing" @click="handleReservationAction('RELEASE')">
                  {{ reservationActing ? '...' : 'Liberar Lote' }}
                </button>
                <button class="btn btn-success btn-sm" :disabled="reservationActing" @click="handleReservationAction('WON')">
                  {{ reservationActing ? '...' : 'Confirmar Venda' }}
                </button>
              </div>
            </div>
            <div v-else class="text-center py-4 text-muted">Nenhum dado de reserva encontrado.</div>
          </div>
        </div>
      </div>

      <!-- Lot Edit Modal -->
      <div v-if="editingLot" class="modal-overlay" @click.self="editingLot = null">
        <div class="modal" style="max-width: 800px;">
          <div class="modal-header" style="margin-bottom: 16px;">
            <h3>Editar Lote: {{ editingLot.mapElement?.code || editingLot.id }}</h3>
            <button class="modal-close" @click="editingLot = null">✕</button>
          </div>
          
          <div class="grid grid-cols-2" style="gap: 16px; margin-top: 16px;">
            <div class="form-group">
              <label class="form-label">Quadra</label>
              <input v-model="lotForm.block" class="form-input" placeholder="Ex: Quadra B" />
            </div>
            <div class="form-group">
              <label class="form-label">Lote nº</label>
              <input v-model="lotForm.lotNumber" class="form-input" placeholder="Ex: 31" />
            </div>
          </div>

          <div class="grid grid-cols-3" style="gap: 16px; margin-top: 16px;">
            <div class="form-group">
              <label class="form-label">Status</label>
              <select v-model="lotForm.status" class="form-input">
                <option value="AVAILABLE">Disponível</option>
                <option value="RESERVED">Reservado</option>
                <option value="SOLD">Vendido</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Valor do M² (R$)</label>
              <input v-model.number="lotForm.pricePerM2" type="number" step="0.01" class="form-input" placeholder="0.00" @input="calculatePriceFromM2" />
            </div>
            <div class="form-group">
              <label class="form-label">Preço Total (R$)</label>
              <input v-model.number="lotForm.price" type="number" step="0.01" class="form-input" placeholder="0.00" @input="calculateM2FromPrice" />
            </div>
          </div>

          <div style="margin-top: 16px;">
            <h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 12px;">Medidas para Contrato</h4>
            <div v-if="lotContractArea !== null" style="background: rgba(59, 130, 246, 0.1); border:1px solid rgba(59, 130, 246, 0.3); border-radius:6px; padding:8px 14px; margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.75rem; font-weight:700; color:#3b82f6; text-transform:uppercase; letter-spacing:0.3px;">Área Calculada</span>
              <span style="font-size:0.95rem; font-weight:700; color: #60a5fa;">{{ lotContractArea.toFixed(2) }} m²</span>
            </div>
            <!-- Per-side metrics from map editor -->
            <div v-if="editingLotSideMetrics.length > 0" style="margin-bottom: 12px;">
              <div style="font-size:0.7rem; font-weight:700; color:var(--color-surface-400); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Lados do Lote (do editor)</div>
              <div style="display:flex; flex-wrap:wrap; gap:6px;">
                <div v-for="(s, i) in editingLotSideMetrics" :key="i" style="background: var(--glass-bg-heavy); border:1px solid var(--glass-border-subtle); border-radius:6px; padding:4px 10px; display:flex; align-items:center; gap:8px;">
                  <span style="font-size:0.75rem; color:var(--color-surface-400);">{{ s.label }}</span>
                  <span v-if="s.meters != null" style="font-size:0.875rem; font-weight:600; color:var(--color-surface-100);">{{ Number(s.meters).toFixed(2) }} m</span>
                  <span v-else style="font-size:0.75rem; color:var(--color-surface-500); font-style:italic;">—</span>
                </div>
              </div>
              <p style="font-size:0.7rem; color:var(--color-surface-500); margin-top:4px;">Edite no editor de mapas para alterar os lados.</p>
            </div>
            <div class="grid grid-cols-2" style="gap: 12px;">
              <div class="form-group" style="margin:0">
                <label class="form-label">Frente (m)</label>
                <input v-model.number="lotForm.frontage" type="number" step="0.01" class="form-input" placeholder="Ex: 10.00" />
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label">Lado Esquerdo (m)</label>
                <input v-model.number="lotForm.sideLeft" type="number" step="0.01" class="form-input" placeholder="Ex: 25.00" />
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label">Fundo (m) <small style="color:var(--color-surface-500)">se diferente da frente</small></label>
                <input v-model.number="lotForm.depth" type="number" step="0.01" class="form-input" placeholder="= Frente" />
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label">Lado Direito (m) <small style="color:var(--color-surface-500)">se diferente</small></label>
                <input v-model.number="lotForm.sideRight" type="number" step="0.01" class="form-input" placeholder="= Lado Esq." />
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label">Inclinação</label>
                <select v-model="lotForm.slope" class="form-input">
                  <option value="FLAT">Plano</option>
                  <option value="UPHILL">Aclive</option>
                  <option value="DOWNHILL">Declive</option>
                </select>
              </div>
            </div>
          </div>

          <div style="margin-top: 24px; margin-bottom: 24px;">
            <h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 12px;">Selos Customizados</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
              <div v-for="(tag, idx) in (lotForm.tags || [])" :key="idx" 
                   style="background: rgba(59, 130, 246, 0.1); color: #60a5fa; padding: 3px 10px; border-radius: 99px; font-size: 0.7rem; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                {{ tag }}
                <span @click="lotForm.tags.splice(idx, 1)" style="cursor: pointer; opacity: 0.6; font-size: 0.8rem;">✕</span>
              </div>
              <div v-if="!(lotForm.tags?.length)" style="color: var(--color-surface-500); font-size: 0.75rem;">Nenhum selo cadastrado.</div>
            </div>
            
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <input v-model="newTag" @keyup.enter="addTag" type="text" class="form-input btn-sm" style="flex: 1; height: 32px; font-size: 0.85rem;" placeholder="Novo selo (ex: sol da manhã)..." />
              <button @click="addTag" class="btn btn-sm btn-secondary" style="height: 32px; padding: 0 12px; font-size: 0.85rem;">Adicionar</button>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button v-for="suggestion in ['sol da manhã', 'esquina', 'vista livre', 'próximo à portaria', 'fundo para área verde']" 
                      :key="suggestion"
                      @click="addSuggestedTag(suggestion)"
                      class="btn btn-xs btn-outline"
                      style="font-size: 9px; padding: 2px 6px; color: var(--color-surface-400); border-color: var(--glass-border);">
                + {{ suggestion }}
              </button>
            </div>
          </div>

          <div class="form-group" style="margin-top: 24px;">
            <label class="form-label">Notas / Descrição</label>
            <textarea v-model="lotForm.notes" class="form-textarea" rows="3" placeholder="Informações adicionais do lote..."></textarea>
          </div>

          <div class="form-group" style="border-top: 1px dashed var(--glass-border-subtle); padding-top: 16px; margin-top: 16px;">
            <div class="flex justify-between items-center" style="margin-bottom: 8px;">
              <label class="form-label" style="margin:0">Tabela de Financiamento</label>
              <button v-if="!lotForm.paymentConditions" class="btn btn-sm btn-ghost" @click="initPaymentConditionsInForm">+ Habilitar Tabela</button>
              <button v-else class="btn btn-sm btn-ghost btn-danger" @click="lotForm.paymentConditions = null">Remover Tabela</button>
            </div>

            <template v-if="lotForm.paymentConditions">
              <div class="grid grid-cols-2" style="gap: 12px; background: var(--glass-bg-heavy); padding: 16px; border-radius: 8px; border: 1px solid var(--glass-border-subtle);">
                <div class="form-group" style="margin:0">
                  <label class="form-label">Setor / Localização</label>
                  <input v-model="lotForm.paymentConditions.setor" class="form-input" placeholder="Ex: Setor 6" />
                </div>
                <div class="form-group" style="margin:0">
                  <label class="form-label">Ato (R$)</label>
                  <input v-model.number="lotForm.paymentConditions.ato" type="number" step="0.01" class="form-input" placeholder="0.00" />
                </div>
                <div class="form-group" style="margin:0">
                  <label class="form-label">Entrada (Qtd Parcelas)</label>
                  <input v-model.number="lotForm.paymentConditions.entrada.count" type="number" class="form-input" placeholder="Ex: 6" />
                </div>
                <div class="form-group" style="margin:0">
                  <label class="form-label">Entrada Total (R$)</label>
                  <input v-model.number="lotForm.paymentConditions.entrada.total" type="number" step="0.01" class="form-input" placeholder="0.00" />
                </div>
                <div class="form-group" style="margin:0">
                  <label class="form-label">Saldo do Saldo (R$)</label>
                  <input v-model.number="lotForm.paymentConditions.saldo" type="number" step="0.01" class="form-input" placeholder="0.00" />
                </div>
              </div>

              <div style="margin-top: 16px;">
                <label class="form-label">Parcelas Mensais</label>
                <div v-for="(p, i) in lotForm.paymentConditions.parcelas" :key="i" class="flex gap-2 items-center" style="margin-bottom: 4px;">
                  <input v-model.number="p.months" type="number" class="form-input" style="width: 80px;" placeholder="Meses" />
                  <span style="font-size: 0.8rem; color: var(--color-surface-500);">vezes de</span>
                  <input v-model.number="p.amount" type="number" step="0.01" class="form-input flex-1" placeholder="R$ 0.00" />
                  <button class="btn btn-sm" style="padding: 4px;" @click="removeParcelaInForm(Number(i))">✕</button>
                </div>
                <button class="btn btn-sm btn-outline" style="width:100%; margin-top: 8px;" @click="addParcelaInForm">+ Adicionar Parcela</button>
              </div>

              <div class="form-group" style="margin-top: 16px;">
                <label class="form-label">Observações da Tabela (uma por linha)</label>
                <textarea 
                  :value="lotForm.paymentConditions.observacoes?.join('\n')" 
                  @input="lotForm.paymentConditions.observacoes = ($event.target as HTMLTextAreaElement).value.split('\n')"
                  class="form-textarea" 
                  rows="3" 
                  placeholder="Observações legais..."
                ></textarea>
              </div>
            </template>
          </div>

          <hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--glass-border-subtle);" />

          <h4 style="margin-bottom: 12px;">Fotos do Lote</h4>
          <div v-if="lotMedias.length === 0" class="empty-state" style="padding: 16px; background: var(--glass-bg-heavy); border-radius: 12px;">
            <p>Nenhuma foto específica deste lote.</p>
          </div>
          <div v-else class="grid grid-cols-4" style="gap: 12px; margin-bottom: 16px;">
            <div v-for="m in lotMedias" :key="m.id" class="media-card-v4">
              <img :src="m.url" class="media-thumb-v4" />
              <button class="media-delete-btn-v4" @click="removeLotMedia(m.id)">✕</button>
            </div>
          </div>
          
          <label class="btn btn-secondary btn-sm" style="cursor:pointer; width: fit-content;">
            {{ uploadingLotMedia ? 'Enviando...' : '+ Adicionar Foto do Lote' }}
            <input type="file" accept="image/*" style="display:none" @change="uploadLotMediaFile" :disabled="uploadingLotMedia" />
          </label>

          <hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--glass-border-subtle);" />

          <h4 style="margin-bottom: 12px;">🌄 Panorama 360° do Lote</h4>
          <div v-if="lotForm.panoramaUrl" class="media-card-v4" style="max-width: 240px; margin-bottom: 16px;">
            <div class="relative group">
              <img :src="lotForm.panoramaUrl" class="media-thumb-v4" style="aspect-ratio: 2/1;" />
              <button class="media-delete-btn-v4" @click="lotForm.panoramaUrl = null">✕</button>
              <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none">
                <span class="text-white text-xs font-bold">Vista 360° Ativa</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state" style="padding: 16px; background: var(--glass-bg-heavy); border-radius: 12px; margin-bottom: 16px;">
            <p>Nenhuma imagem 360° enviada para este lote.</p>
          </div>
          
          <label class="btn btn-secondary btn-sm" style="cursor:pointer; width: fit-content;">
            {{ uploadingPanorama ? 'Enviando...' : (lotForm.panoramaUrl ? 'Alterar Imagem 360°' : '+ Adicionar Imagem 360°') }}
            <input type="file" accept="image/*" style="display:none" @change="uploadLotPanoramaFile" :disabled="uploadingPanorama" />
          </label>

          <div class="modal-actions" style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px;">
            <button class="btn btn-secondary" style="background: var(--glass-bg-heavy); color: var(--color-surface-200); border: 1px solid var(--glass-border-subtle);" @click="editingLot = null">Cancelar</button>
            <button class="btn btn-primary" style="background: var(--color-primary-600); color: #fff; border: none; font-weight: 600;" :disabled="savingLot" @click="saveLotDetails">
              {{ savingLot ? 'Salvando...' : 'Salvar Detalhes' }}
            </button>
          </div>
        </div>
      </div>


      <!-- Página Pública -->
      <section v-if="activeSection === 'pagina-publica'" id="pagina-publica" class="content-section pub-page">

        <!-- ── Banner & Vídeo (lado a lado) ── -->
        <div class="pub-row pub-row--2col">
          <div class="pub-card">
            <h4 class="pub-card__title">Banner</h4>
            <div v-if="project.bannerImageUrl" style="position: relative; border-radius: 10px; overflow: hidden; border: 1px solid var(--glass-border-subtle); aspect-ratio: 16/6;">
              <img :src="project.bannerImageUrl" alt="Banner" style="width: 100%; height: 100%; object-fit: cover;" />
              <button v-if="authStore.canEdit" class="pub-card__overlay-btn" @click="removeBannerImage">Remover</button>
            </div>
            <div v-else style="border: 2px dashed var(--glass-border-subtle); background: var(--glass-bg-heavy); border-radius: 10px; padding: 32px; text-align: center;">
              <p style="color: var(--color-surface-500); font-size: 0.8rem; margin: 0;">Nenhum banner configurado</p>
            </div>
            <label v-if="authStore.canEdit" class="pub-card__upload-btn">
              {{ uploadingBanner ? 'Enviando...' : 'Enviar Banner' }}
              <input type="file" accept="image/*" style="display:none" @change="uploadBannerImage" :disabled="uploadingBanner" />
            </label>
          </div>

          <div class="pub-card">
            <h4 class="pub-card__title">Vídeo de Apresentação</h4>
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Link do YouTube</label>
              <input v-model="pubInfoForm.youtubeVideoUrl" class="form-input" placeholder="https://www.youtube.com/embed/..." :disabled="!authStore.canEdit" />
              <small style="color: var(--color-surface-500); font-size: 0.7rem;">Cole a URL embed do YouTube.</small>
            </div>
            <div v-if="pubInfoForm.youtubeVideoUrl" style="margin-top: 16px; border-radius: 10px; overflow: hidden; border: 1px solid var(--glass-border-subtle); aspect-ratio: 16/9;">
              <iframe v-if="pubInfoForm.youtubeVideoUrl.includes('embed/')" :src="pubInfoForm.youtubeVideoUrl" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>
              <div v-else style="padding: 20px; text-align: center; background: var(--glass-bg-heavy); color: var(--color-surface-500); height: 100%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">
                Preview disponível ao usar link /embed/.
              </div>
            </div>
            <div v-if="authStore.canEdit" style="margin-top: 16px; display: flex; justify-content: flex-end;">
              <button class="btn btn-primary btn-sm" :disabled="savingPublicVideo" @click="savePublicVideoBlock">
                {{ savingPublicVideo ? 'Salvando...' : 'Salvar Vídeo' }}
              </button>
            </div>
          </div>
        </div>

        <!-- ── Preços & Condições ── -->
        <div class="pub-card pub-card--compact">
          <h4 class="pub-card__title">Preços e Condições</h4>
          <div class="pub-row pub-row--3col" style="margin-bottom: 0;">
            <div class="form-group" style="margin:0;">
              <label class="form-label">A partir de (R$)</label>
              <input v-model="pubInfoForm.startingPrice" type="number" step="0.01" class="form-input" placeholder="144000" :disabled="!authStore.canEdit" />
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label">Parcelamento (Vezes)</label>
              <input v-model="pubInfoForm.maxInstallments" type="number" class="form-input" placeholder="180" :disabled="!authStore.canEdit" />
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label">Resumo das Condições</label>
              <input v-model="pubInfoForm.paymentConditionsSummary" class="form-input" placeholder="Entrada facilitada em 6x e saldo em 120 meses." :disabled="!authStore.canEdit" />
            </div>
          </div>
          <div v-if="authStore.canEdit" style="margin-top: 16px; display: flex; justify-content: flex-end;">
            <button class="btn btn-primary btn-sm" :disabled="savingPublicPricing" @click="savePublicPricingBlock">
              {{ savingPublicPricing ? 'Salvando...' : 'Salvar Preços e Condições' }}
            </button>
          </div>
        </div>

        <!-- ── Acompanhamento de Obras ── -->
        <div class="pub-card">
          <h4 class="pub-card__title">Acompanhamento de Obras</h4>

          <div v-if="pubInfoForm.constructionStatus.length === 0" class="pub-empty">
            Nenhuma etapa cadastrada. Adicione etapas para exibir o progresso da obra na página pública.
          </div>

          <div v-else class="pub-works-grid">
            <div v-for="(item, i) in pubInfoForm.constructionStatus" :key="i" class="pub-work-item">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 600; font-size: 0.8rem;">{{ item.label }}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 700; color: var(--color-success); font-size: 0.8rem;">{{ item.percentage }}%</span>
                  <button v-if="authStore.canEdit" class="pub-remove-btn" @click="removeWorkStage(i)">✕</button>
                </div>
              </div>
              <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden;">
                <div :style="{ width: item.percentage + '%' }" style="height: 100%; background: var(--color-success); transition: width 0.3s ease;"></div>
              </div>
            </div>
          </div>

          <div v-if="authStore.canEdit" class="pub-inline-form" style="margin-top: 16px;">
            <input v-model="newWorkStage.label" class="form-input" placeholder="Nome da etapa..." style="flex: 1;" />
            <input v-model.number="newWorkStage.percentage" type="number" min="0" max="100" class="form-input" placeholder="%" style="width: 80px;" />
            <button class="btn btn-primary btn-sm" @click="addWorkStage">Adicionar</button>
          </div>

          <div v-if="authStore.canEdit" style="margin-top: 16px; display: flex; justify-content: flex-end;">
            <button class="btn btn-primary btn-sm" :disabled="savingPublicConstruction" @click="savePublicConstructionBlock">
              {{ savingPublicConstruction ? 'Salvando...' : 'Salvar Acompanhamento' }}
            </button>
          </div>
        </div>

        <!-- ── Localização & Proximidades ── -->
        <div class="pub-row pub-row--2col">
          <div class="pub-card">
            <h4 class="pub-card__title">Localização</h4>
            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label">Endereço</label>
              <input v-model="pubInfoForm.address" class="form-input" placeholder="Av. Brasil, 1000 - Centro" :disabled="!authStore.canEdit" />
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Link Google Maps</label>
              <input v-model="pubInfoForm.googleMapsUrl" class="form-input" placeholder="Link ou Embed URL" :disabled="!authStore.canEdit" />
            </div>

            <div v-if="authStore.canEdit" style="margin-top: 16px; display: flex; justify-content: flex-end;">
              <button class="btn btn-primary btn-sm" :disabled="savingPublicLocation" @click="savePublicLocationBlock">
                {{ savingPublicLocation ? 'Salvando...' : 'Salvar Localização' }}
              </button>
            </div>
          </div>

          <div class="pub-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h4 class="pub-card__title" style="margin: 0;">Proximidades</h4>
              <div v-if="hasSavedAddress" class="toggle-switch" title="Exibir na página pública">
                <input type="checkbox" id="nearby-toggle" v-model="nearbyEnabled" @change="toggleNearby" :disabled="!authStore.canEdit" />
                <label for="nearby-toggle"></label>
              </div>
            </div>

            <div v-if="!hasSavedAddress" class="pub-notice pub-notice--warn">
              Salve um endereço no bloco de Localização para habilitar as proximidades.
            </div>

            <template v-else>
              <div v-if="nearbyStatus" style="margin-bottom: 12px;">
                <div v-if="nearbyStatus.status === 'ok' && nearbyStatus.itemCount > 0" class="pub-notice pub-notice--ok">
                  {{ nearbyStatus.itemCount }} locais encontrados
                  <span v-if="nearbyEnabled"> · visível no site</span>
                  <span v-else> · oculto</span>
                </div>
                <div v-else-if="nearbyStatus.status === 'error'" class="pub-notice pub-notice--error">
                  {{ nearbyStatus.errorMessage || 'Erro ao gerar' }}
                </div>
                <div v-else class="pub-notice pub-notice--neutral">
                  Proximidades ainda não geradas
                </div>
              </div>

              <button class="btn btn-secondary btn-sm" style="width: 100%;" @click="regenerateNearby" :disabled="!authStore.canEdit || nearbyRegenerating">
                <span v-if="nearbyRegenerating">Gerando...</span>
                <span v-else-if="nearbyStatus?.status === 'ok' && nearbyStatus?.itemCount > 0">Regerar Proximidades</span>
                <span v-else>Gerar Proximidades</span>
              </button>

              <!-- Collapsible nearby list -->
              <div v-if="nearbyStatus?.items?.length" style="margin-top: 12px;">
                <button class="pub-collapse-toggle" @click="nearbyListExpanded = !nearbyListExpanded">
                  {{ nearbyListExpanded ? '▾ Ocultar detalhes' : '▸ Ver ' + nearbyStatus.itemCount + ' locais encontrados' }}
                </button>
                <div v-if="nearbyListExpanded" class="pub-nearby-list">
                  <div v-for="group in nearbyGrouped" :key="group.category" style="margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; padding: 4px 0;">
                      <span style="font-size: 0.85rem;">{{ nearbyCategoryIcon(group.category) }}</span>
                      <span style="font-size: 0.72rem; font-weight: 700; color: var(--color-surface-200);">{{ group.categoryLabel }}</span>
                      <span style="font-size: 0.6rem; color: var(--color-surface-500);">({{ group.items.length }})</span>
                    </div>
                    <div v-for="item in group.items" :key="item.id || item.name" class="pub-nearby-item" :style="{ opacity: item.visible === false ? 0.45 : 1, background: item.visible === false ? 'rgba(255,0,0,0.04)' : 'rgba(255,255,255,0.02)' }">
                      <div v-if="authStore.canEdit" style="flex-shrink: 0; margin-right: 6px;">
                        <input type="checkbox" :checked="item.visible !== false" @change="toggleNearbyItemVisibility(item)" style="cursor: pointer; accent-color: var(--color-success);" title="Mostrar/ocultar na página pública" />
                      </div>
                      <span class="pub-nearby-item__name">{{ item.name }}</span>
                      <span class="pub-nearby-item__dist">{{ item.distanceLabel }}</span>
                      <a :href="item.routeUrl" target="_blank" rel="noopener" class="pub-nearby-item__link">Rota ↗</a>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- ── Infraestrutura & Destaques ── -->
        <div class="pub-row pub-row--2col">
          <!-- Infraestrutura -->
          <div class="pub-card">
            <h4 class="pub-card__title">Infraestrutura</h4>

            <div class="pub-sub-section">
              <span class="pub-sub-label">Títulos da seção no site</span>
              <div class="form-group" style="margin-bottom: 8px;">
                <input v-model="pubInfoForm.highlightsTitle" class="form-input" placeholder="Sua família merece o melhor." />
              </div>
              <div class="form-group" style="margin: 0;">
                <input v-model="pubInfoForm.highlightsSubtitle" class="form-input" placeholder="Qualidade de vida, segurança..." />
              </div>
            </div>

            <div v-if="pubInfoForm.highlightsJson.filter(h => h.type === 'category').length">
              <div v-for="(cat, idx) in pubInfoForm.highlightsJson" :key="idx" v-show="cat.type === 'category'" class="pub-infra-cat">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <strong style="font-size: 0.85rem; color: var(--color-surface-100);">{{ cat.title }}</strong>
                  <button v-if="authStore.canEdit" class="pub-remove-btn" @click="removeHighlight(idx)">✕</button>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
                  <div v-for="(it, itIdx) in cat.items" :key="itIdx" class="infra-badge-v4">
                    {{ it }}
                    <span v-if="authStore.canEdit" class="infra-badge-remove" @click="removeInfraItem(idx, itIdx)">✕</span>
                  </div>
                </div>
                <div v-if="authStore.canEdit" class="pub-inline-form">
                  <input v-model="infraItemInputs[idx]" @keyup.enter="addInfraItem(idx)" class="form-input" placeholder="Adicionar item..." style="flex: 1;" />
                  <button class="btn btn-dark btn-sm" style="padding: 0 14px;" @click="addInfraItem(idx)">+</button>
                </div>
              </div>
            </div>

            <div v-if="authStore.canEdit" class="pub-sub-section" style="margin-top: 16px;">
              <span class="pub-sub-label">Nova Categoria</span>
              <div class="pub-inline-form">
                <input v-model="newInfraCategory" class="form-input" placeholder="Ex: Equipamentos" style="flex: 1;" />
                <button class="btn btn-primary btn-sm" @click="addInfraCategory">Criar</button>
              </div>
            </div>

            <div v-if="authStore.canEdit" style="margin-top: 16px; display: flex; justify-content: flex-end;">
              <button class="btn btn-primary btn-sm" :disabled="savingPublicHighlights" @click="savePublicHighlightsBlock">
                {{ savingPublicHighlights ? 'Salvando...' : 'Salvar Infraestrutura' }}
              </button>
            </div>
          </div>

          <!-- Destaques -->
          <div class="pub-card">
            <h4 class="pub-card__title">Destaques</h4>

            <div class="pub-sub-section">
              <span class="pub-sub-label">Títulos da seção no site</span>
              <div class="form-group" style="margin-bottom: 8px;">
                <input v-model="pubInfoForm.traditionalHighlightsTitle" class="form-input" placeholder="Destaques" />
              </div>
              <div class="form-group" style="margin: 0;">
                <input v-model="pubInfoForm.traditionalHighlightsSubtitle" class="form-input" placeholder="Diferenciais pensados para..." />
              </div>
            </div>

            <div v-if="pubInfoForm.highlightsJson.filter(h => h.type === 'highlight' || !h.type).length" style="display: flex; flex-direction: column; gap: 8px; margin-top: 16px;">
              <div v-for="(h, idx) in pubInfoForm.highlightsJson" :key="idx" v-show="h.type === 'highlight' || !h.type" class="pub-highlight-item">
                <span style="color: #059669; font-size: 0.9rem;">{{ h.icon || '✅' }}</span>
                <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  <strong style="font-size: 0.8rem;">{{ h.label }}</strong>
                  <span style="font-size: 0.72rem; color: var(--color-surface-400); margin-left: 4px;">{{ h.value }}</span>
                </div>
                <button v-if="authStore.canEdit" class="pub-remove-btn" @click="removeHighlight(idx)">✕</button>
              </div>
            </div>

            <div v-if="authStore.canEdit" class="pub-sub-section" style="margin-top: 16px;">
              <span class="pub-sub-label">Novo Diferencial</span>
              <div class="pub-inline-form">
                <input v-model="newHighlight.label" class="form-input" placeholder="Rótulo (ex: Segurança)" style="flex: 1;" />
                <input v-model="newHighlight.value" class="form-input" placeholder="Detalhe (ex: 24h)" style="flex: 1;" />
                <button class="btn btn-primary btn-sm" @click="addHighlight">Adicionar</button>
              </div>
            </div>

            <div v-if="authStore.canEdit" style="margin-top: 16px; display: flex; justify-content: flex-end;">
              <button class="btn btn-primary btn-sm" :disabled="savingPublicHighlights" @click="savePublicHighlightsBlock">
                {{ savingPublicHighlights ? 'Salvando...' : 'Salvar Destaques' }}
              </button>
            </div>
          </div>
        </div>

        <!-- ── Texto Descritivo ── -->
        <div class="pub-card">
          <h4 class="pub-card__title">Texto Descritivo</h4>
          <div class="form-group" style="margin: 0;">
            <div v-if="authStore.canEdit" class="flex gap-2" style="margin-bottom: 8px;">
              <button class="btn btn-xs btn-outline" @click.prevent="execCommand('bold')"><b>B</b></button>
              <button class="btn btn-xs btn-outline" @click.prevent="execCommand('italic')"><i>I</i></button>
              <button class="btn btn-xs btn-outline" @click.prevent="execCommand('insertUnorderedList')">• Lista</button>
            </div>
            <div
              ref="richEditor"
              contenteditable="true"
              class="form-textarea rich-editor-v4"
              :class="{ 'disabled': !authStore.canEdit }"
              @input="updateFromEditor"
              @blur="updateFromEditor"
              v-html="initialEditorContent"
              style="min-height: 200px; padding: 16px; line-height: 1.6; border-radius: 8px; font-size: 0.85rem; background: var(--glass-bg); border: 1px solid var(--glass-border); overflow-y: auto;"
            ></div>
          </div>

          <div v-if="authStore.canEdit" style="margin-top: 16px; display: flex; justify-content: flex-end;">
            <button class="btn btn-primary btn-sm" :disabled="savingPublicDescription" @click="savePublicDescriptionBlock">
              {{ savingPublicDescription ? 'Salvando...' : 'Salvar Texto Descritivo' }}
            </button>
          </div>
        </div>

        <!-- ── Galeria de Mídia ── -->
        <div class="pub-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 class="pub-card__title" style="margin: 0;">Galeria de Mídia</h4>
            <label v-if="authStore.canEdit" class="btn btn-primary btn-sm" style="cursor: pointer;">
              {{ uploadingMedia ? 'Enviando...' : '+ Adicionar' }}
              <input type="file" accept="image/*,video/*" style="display:none" @change="uploadMediaFile" :disabled="uploadingMedia" />
            </label>
          </div>

          <div v-if="media.length === 0" class="pub-empty">
            Nenhuma foto ou vídeo na galeria.
          </div>
          <div v-else style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px;">
            <div v-for="m in media" :key="m.id" class="media-card-v4" style="aspect-ratio: 1/1; width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid var(--glass-border-subtle);">
              <img v-if="m.type === 'PHOTO'" :src="m.url" class="media-thumb-v4" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
              <video v-else :src="m.url" class="media-thumb-v4" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
              <div class="media-overlay-v4">
                <button v-if="authStore.canEdit" class="delete-btn-circ" title="Remover" @click="deleteMedia(m.id)">✕</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Informações Legais ── -->
        <div class="pub-card">
          <h4 class="pub-card__title">Informações Legais</h4>
          <p style="font-size: 0.75rem; color: var(--color-surface-400); margin: 0 0 12px;">Texto exibido no final da página pública. Ideal para dados de registro, aprovações e licenças.</p>
          <textarea v-model="pubInfoForm.legalNotice" class="form-textarea" rows="4" placeholder="Ex: Loteamento aprovado pela Prefeitura Municipal, através do Decreto n.º..." :disabled="!authStore.canEdit" style="font-size: 0.85rem; line-height: 1.5;"></textarea>

          <div v-if="authStore.canEdit" style="margin-top: 16px; display: flex; justify-content: flex-end;">
            <button class="btn btn-primary btn-sm" :disabled="savingPublicLegal" @click="savePublicLegalBlock">
              {{ savingPublicLegal ? 'Salvando...' : 'Salvar Informações Legais' }}
            </button>
          </div>
        </div>
      </section>



        </main>
      </div>
    </template>

    <div v-else class="error-state">Projeto não encontrado.</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

interface Media {
  id: string;
  url: string;
  type: 'PHOTO' | 'VIDEO';
}

interface Highlight {
  type?: 'category' | 'highlight';
  title?: string;
  items?: string[];
  label?: string;
  value?: string;
  icon?: string;
}

interface Corretor {
  id: string;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  creci?: string;
  photoUrl?: string;
  enabled: boolean;
  notes?: string;
  _count?: { leads: number };
}

interface PaymentConfig {
  id: string;
  name: string;
  provider: string;
  isEnabledForProject: boolean;
}

interface AiConfig {
  id: string;
  name: string;
  model: string;
}

const route = useRoute()
const router = useRouter()
const { fetchApi, uploadApi } = useApi()
const authStore = useAuthStore()
const { success: toastSuccess, fromError: toastFromError } = useToast()

const projectId = route.params.id as string
const loading = ref(true)
const error = ref('')
const project = ref<any>(null)
const mapElements = ref<any[]>([])
const lots = ref<any[]>([])
const lotsMeta = ref({ totalItems: 0, itemCount: 0, itemsPerPage: 50, totalPages: 0, currentPage: 1 })
const media = ref<Media[]>([])

const lotStats = computed(() => {
  const total = lots.value.length
  const available = lots.value.filter((l: any) => l.status === 'AVAILABLE').length
  const reserved = lots.value.filter((l: any) => l.status === 'RESERVED').length
  const sold = lots.value.filter((l: any) => l.status === 'SOLD').length
  return { total, available, reserved, sold }
})
const activeSection = ref('configuracoes')
const uploadingBanner = ref(false)
const uploadingMedia = ref(false)
const savingSettings = ref(false)
const settingsError = ref('')
const settingsSaved = ref(false)

const editingLot = ref<any>(null)

// Reservation modal state
const viewingReservation = ref<any>(null)
const reservationData = ref<any>(null)
const reservationLoading = ref(false)
const reservationActing = ref(false)

const openReservationModal = async (lot: any) => {
  viewingReservation.value = lot
  reservationData.value = null
  reservationLoading.value = true
  try {
    const res = await fetchApi(`/leads?projectId=${projectId}&mapElementId=${lot.mapElementId}&status=RESERVATION&limit=1`)
    reservationData.value = res?.data?.[0] ?? null
  } catch {
    reservationData.value = null
  } finally {
    reservationLoading.value = false
  }
}

const reservationExpiry = (createdAt: string) => {
  if (!project.value?.reservationExpiryHours) return '—'
  const expiry = new Date(new Date(createdAt).getTime() + project.value.reservationExpiryHours * 3600000)
  return formatDateTimeToBrasilia(expiry.toISOString())
}

const handleReservationAction = async (newStatus: 'WON' | 'CANCELLED' | 'RELEASE') => {
  if (!reservationData.value) return
  reservationActing.value = true
  try {
    if (newStatus === 'RELEASE') {
      // Step 1: free the lot without touching the lead status
      await fetchApi(`/projects/${projectId}/lots/${viewingReservation.value.mapElementId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'AVAILABLE' }),
      })
      // Step 2: keep lead alive by moving it back to NEGOTIATING
      await fetchApi(`/leads/${reservationData.value.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'NEGOTIATING' }),
      })
    } else {
      await fetchApi(`/leads/${reservationData.value.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
    }
    viewingReservation.value = null
    reservationData.value = null
    await loadLotsPaginated(lotsMeta.value.currentPage)
    toastSuccess(newStatus === 'WON' ? 'Venda confirmada!' : 'Lote liberado com sucesso.')
  } catch (e: any) {
    toastFromError(e)
  } finally {
    reservationActing.value = false
  }
}

const newTag = ref('')
const lotForm = ref({
  status: 'AVAILABLE',
  block: '',
  lotNumber: '',
  price: null as number | null,
  pricePerM2: null as number | null,
  areaM2: null as number | null,
  frontage: null as number | null,
  depth: null as number | null,
  sideLeft: null as number | null,
  sideRight: null as number | null,
  slope: 'FLAT',
  panoramaUrl: null as string | null,
  notes: '',
  tags: [] as string[],
  conditionsText: '',
  paymentConditions: null as any
})

const addTag = () => {
  if (!newTag.value) return
  if (!lotForm.value.tags) lotForm.value.tags = []
  if (!lotForm.value.tags.includes(newTag.value.trim().toLowerCase())) {
    lotForm.value.tags.push(newTag.value.trim().toLowerCase())
  }
  newTag.value = ''
}

const addSuggestedTag = (tag: string) => {
  if (!lotForm.value.tags) lotForm.value.tags = []
  if (!lotForm.value.tags.includes(tag.toLowerCase())) {
    lotForm.value.tags.push(tag.toLowerCase())
  }
}

const savingLot = ref(false)
const uploadingLotMedia = ref(false)
const uploadingPanorama = ref(false)

const editingLotSideMetrics = computed(() => {
  const raw = editingLot.value?.sideMetricsJson
  if (!Array.isArray(raw) || raw.length === 0) return []
  return raw
})

const lotContractArea = computed(() => {
  const f = lotForm.value.frontage
  if (!f) return null
  const back = lotForm.value.depth ?? f   // fundo (back width) defaults to frente
  const sideL = lotForm.value.sideLeft
  if (!sideL) return null
  const sideR = lotForm.value.sideRight ?? sideL
  return ((f + back) / 2) * ((sideL + sideR) / 2)
})

const lotMedias = computed(() => {
  if (!editingLot.value) return []
  return editingLot.value.medias || []
})

const calculatePriceFromM2 = () => {
  const area = lotForm.value.areaM2 || lotContractArea.value
  if (area && lotForm.value.pricePerM2) {
    lotForm.value.price = Math.round(area * lotForm.value.pricePerM2 * 100) / 100
  }
}

const calculateM2FromPrice = () => {
  const area = lotForm.value.areaM2 || lotContractArea.value
  if (area && lotForm.value.price) {
    lotForm.value.pricePerM2 = Math.round((lotForm.value.price / area) * 100) / 100
  }
}

watch(() => lotContractArea.value, (newArea) => {
  if (newArea && lotForm.value.pricePerM2) {
    lotForm.value.price = Math.round(newArea * lotForm.value.pricePerM2 * 100) / 100
  } else if (newArea && lotForm.value.price) {
    lotForm.value.pricePerM2 = Math.round((lotForm.value.price / newArea) * 100) / 100
  }
})

const openEditLot = (lot: any) => {
  editingLot.value = lot
  lotForm.value = { 
    status: lot.status, 
    block: lot.block || '',
    lotNumber: lot.lotNumber || '',
    price: lot.price ? Number(lot.price) : null, 
    pricePerM2: lot.pricePerM2 ? Number(lot.pricePerM2) : null,
    areaM2: lot.areaM2, 
    frontage: lot.frontage, 
    depth: lot.depth,
    sideLeft: lot.sideLeft ?? null,
    sideRight: lot.sideRight ?? null,
    slope: lot.slope, 
    panoramaUrl: lot.panoramaUrl || null,
    notes: lot.notes || '',
    tags: Array.isArray(lot.tags) ? [...lot.tags] : [],
    conditionsText: Array.isArray(lot.conditionsJson) ? lot.conditionsJson.join('\n') : '',
    paymentConditions: lot.paymentConditions ? JSON.parse(JSON.stringify(lot.paymentConditions)) : null
  }
}

const saveLotDetails = async () => {
  if (!editingLot.value) return
  savingLot.value = true
  try {
    const calc = lotContractArea.value
    const toNum = (v: any) => v != null ? Number(v) : undefined
    const payload: Record<string, any> = {
      status: lotForm.value.status,
      block: lotForm.value.block || undefined,
      lotNumber: lotForm.value.lotNumber || undefined,
      price: toNum(lotForm.value.price),
      pricePerM2: toNum(lotForm.value.pricePerM2),
      frontage: toNum(lotForm.value.frontage),
      depth: toNum(lotForm.value.depth),
      sideLeft: toNum(lotForm.value.sideLeft),
      sideRight: toNum(lotForm.value.sideRight),
      slope: lotForm.value.slope,
      panoramaUrl: lotForm.value.panoramaUrl || null,
      notes: lotForm.value.notes || undefined,
      tags: lotForm.value.tags,
      paymentConditions: lotForm.value.paymentConditions || undefined,
    }
    // Only override areaM2 when the panel's trapezoid formula produces a result;
    // otherwise let the map editor's last computed value in the DB stand.
    if (calc !== null) {
      payload.areaM2 = Math.round(calc * 100) / 100
    }

    const updated = await fetchApi(`/projects/${projectId}/lots/${editingLot.value.mapElementId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    
    // Update local lots array
    const idx = lots.value.findIndex((l: any) => l.id === editingLot.value.id)
    if (idx !== -1) {
      lots.value[idx] = { ...lots.value[idx], ...updated }
    }
    
    toastSuccess('Detalhes do lote salvos!')
    editingLot.value = null
  } catch (e: any) {
    toastFromError(e, 'Erro ao salvar detalhes do lote')
  }
  savingLot.value = false
}

// ─── Payment Condition Helpers ──────────────────────────
const initPaymentConditionsInForm = () => {
  lotForm.value.paymentConditions = {
    setor: 'Setor 6',
    ato: 0,
    entrada: { count: 6, total: 0 },
    saldo: 0,
    parcelas: [
      { months: 12, amount: 0 },
      { months: 24, amount: 0 },
      { months: 36, amount: 0 },
      { months: 48, amount: 0 },
      { months: 60, amount: 0 },
      { months: 84, amount: 0 },
      { months: 96, amount: 0 },
      { months: 120, amount: 0 },
      { months: 180, amount: 0 },
      { months: 204, amount: 0 },
      { months: 240, amount: 0 }
    ],
    observacoes: [
      'O valor do ato refere-se a intermediação imobiliária.',
      'A 1ª parcela da entrada terá seu vencimento em até 30 dias.',
      'Pagamento das parcelas mensais inicia-se após pagamento da entrada.',
      'Planos com juros de 12.6825% a.a. sob o regime de amortização da tabela PRICE.',
      'As parcelas do saldo devedor serão reajustadas monetariamente pelo IGP-M FGV anual.',
      'Ao final do financiamento, será apurado eventual valor residual (IGP-M FGV) sobre o último período.',
      'Tabela sujeita à alteração de preço sem aviso prévio.'
    ]
  }
}

const addParcelaInForm = () => {
  if (!lotForm.value.paymentConditions) return
  if (!lotForm.value.paymentConditions.parcelas) lotForm.value.paymentConditions.parcelas = []
  const last = lotForm.value.paymentConditions.parcelas[lotForm.value.paymentConditions.parcelas.length - 1]
  lotForm.value.paymentConditions.parcelas.push({ months: (last?.months || 0) + 12, amount: 0 })
}

const removeParcelaInForm = (idx: number) => {
  lotForm.value.paymentConditions.parcelas.splice(idx, 1)
}

const uploadLotMediaFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !editingLot.value) return
  uploadingLotMedia.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    const m = await uploadApi(`/projects/${projectId}/media?lotDetailsId=${editingLot.value.id}`, fd)
    
    // Update locally
    if (!editingLot.value.medias) editingLot.value.medias = []
    editingLot.value.medias.unshift(m)
    
    toastSuccess('Foto do lote enviada!')
  } catch (err) {
    toastFromError(err, 'Erro ao enviar foto')
  }
  (e.target as HTMLInputElement).value = ''
  uploadingLotMedia.value = false
}

const uploadLotPanoramaFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !editingLot.value) return
  uploadingPanorama.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    // Upload it as media for this lot
    const m = await uploadApi(`/projects/${projectId}/media?lotDetailsId=${editingLot.value.id}`, fd)
    // Set the panoramaUrl to this media's URL
    lotForm.value.panoramaUrl = m.url
    toastSuccess('Imagem 360° enviada! Salve para concluir.')
  } catch (err) {
    toastFromError(err, 'Erro ao enviar imagem')
  }
  (e.target as HTMLInputElement).value = ''
  uploadingPanorama.value = false
}

const removeLotMedia = async (id: string) => {
  if (!confirm('Excluir foto do lote?')) return
  try {
    await fetchApi(`/projects/${projectId}/media/${id}`, { method: 'DELETE' })
    if (editingLot.value.medias) {
      editingLot.value.medias = editingLot.value.medias.filter((m: any) => m.id !== id)
    }
    toastSuccess('Foto excluída')
  } catch (e) {
    toastFromError(e, 'Erro ao excluir foto')
  }
}

const locationOrigin = computed(() => {
  if (typeof window !== 'undefined') return window.location.origin
  return ''
})

const publicUrl = computed(() => project.value ? `/${project.value.slug}` : null)

const schedulingForm = ref({
  enabled: false,
  scheduleInterval: 60,
  availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'] as string[],
  startTime: '08:00',
  endTime: '18:00',
  maxSimultaneous: 1,
  lunchStart: '',
  lunchEnd: '',
  breaks: [] as any[]
})
const loadingScheduling = ref(false)
const savingScheduling = ref(false)

const loadSchedulingConfig = async () => {
  loadingScheduling.value = true
  try {
    const config = await fetchApi(`/scheduling/config/${projectId}`)
    schedulingForm.value = {
      enabled: config.enabled ?? false,
      scheduleInterval: config.scheduleInterval ?? 60,
      availableDays: Array.isArray(config.availableDays) ? config.availableDays : ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      startTime: config.startTime || '08:00',
      endTime: config.endTime || '18:00',
      maxSimultaneous: config.maxSimultaneous ?? 1,
      lunchStart: config.lunchStart || '',
      lunchEnd: config.lunchEnd || '',
      breaks: Array.isArray(config.breaks) ? config.breaks : []
    }
  } catch (e) {
    console.error('Error loading scheduling config', e)
  }
  loadingScheduling.value = false
}

const saveSchedulingSettings = async () => {
  savingScheduling.value = true
  try {
    const payload = {
      ...schedulingForm.value,
      scheduleInterval: Number(schedulingForm.value.scheduleInterval),
      maxSimultaneous: Number(schedulingForm.value.maxSimultaneous),
    }
    await fetchApi(`/scheduling/config/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
    toastSuccess('Configurações de agendamento salvas!')
  } catch (e) {
    toastFromError(e, 'Erro ao salvar agendamento')
  }
  savingScheduling.value = false
}

const addBreak = () => {
  schedulingForm.value.breaks.push({ name: '', start: '', end: '' })
}
const removeBreak = (idx: number) => {
  schedulingForm.value.breaks.splice(idx, 1)
}

const editForm = ref({
  name: '',
  slug: '',
  description: '',
  showPaymentConditions: false,
  customDomain: '',
  reservationFeeType: 'FIXED',
  reservationFeeValue: 500,
  reservationExpiryHours: 24,
  minDownPaymentPercent: 10,
  minDownPaymentValue: 0,
  maxInstallments: 180,
  monthlyInterestRate: 0.9,
  indexer: 'IGP-M',
  allowIntermediary: false,
  financingDisclaimer: 'Simulação baseada nas regras vigentes. Sujeito à aprovação de crédito e alteração de taxas.',
  aiEnabled: false,
  aiConfigId: '',
  paymentConditions: [] as any[]
})

// ── Slug validation for edit ─────────────────────────────
const editSlugTaken = ref(false)
let editSlugTimeout: any = null
const originalSlug = ref('')

watch(() => editForm.value.slug, (newSlug) => {
  if (!newSlug || newSlug === originalSlug.value) {
    editSlugTaken.value = false
    return
  }
  clearTimeout(editSlugTimeout)
  editSlugTimeout = setTimeout(async () => {
    try {
      const { available } = await fetchApi(`/projects/check-slug/${newSlug}?excludeId=${projectId}`)
      editSlugTaken.value = !available
    } catch { editSlugTaken.value = false }
  }, 500)
})

// ── Live Preview Logic ──────────────────────────────────
const previewDownPayment = ref(0)
const previewMonths = ref(120)
const previewLotPrice = ref(200000)

const minDownPaymentValueForPreview = computed(() => {
  const percentVal = (previewLotPrice.value * (editForm.value.minDownPaymentPercent || 0)) / 100
  const fixedVal = editForm.value.minDownPaymentValue || 0
  return Math.max(percentVal, fixedVal)
})

watch(() => editForm.value.minDownPaymentPercent, () => {
  if (previewDownPayment.value < minDownPaymentValueForPreview.value) {
    previewDownPayment.value = minDownPaymentValueForPreview.value
  }
}, { immediate: true })

watch(previewLotPrice, () => {
  if (previewDownPayment.value < minDownPaymentValueForPreview.value) {
    previewDownPayment.value = minDownPaymentValueForPreview.value
  }
})

const previewResult = computed(() => {
  const price = previewLotPrice.value
  const down = previewDownPayment.value
  const months = previewMonths.value
  const rate = (editForm.value.monthlyInterestRate || 0) / 100
  
  const amount = price - down
  if (amount <= 0) return 0
  
  if (rate === 0) return amount / months
  
  // Amortização PRICE formula: PMT = P * (i * (1 + i)^n) / ((1 + i)^n - 1)
  const pmt = amount * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1)
  return pmt
})

const previewTotalInvested = computed(() => {
  const down = previewDownPayment.value || 0
  return down + (previewResult.value * previewMonths.value)
})

const previewTotalInterest = computed(() => {
  return previewTotalInvested.value - previewLotPrice.value
})

const annualInterestRateEffective = computed(() => {
  const i = (editForm.value.monthlyInterestRate || 0) / 100
  if (i === 0) return 0
  return (Math.pow(1 + i, 12) - 1) * 100
})

const updatePercentFromDownPaymentPreview = () => {
  if (previewDownPayment.value < minDownPaymentValueForPreview.value) {
    previewDownPayment.value = minDownPaymentValueForPreview.value
  }
}

const previewDownPaymentPercent = computed({
  get: () => {
    if (!previewLotPrice.value) return 0
    return Math.round((previewDownPayment.value / previewLotPrice.value * 100) * 10) / 10
  },
  set: (val) => {
    previewDownPayment.value = (previewLotPrice.value * val) / 100
    if (previewDownPayment.value < minDownPaymentValueForPreview.value) {
      previewDownPayment.value = minDownPaymentValueForPreview.value
    }
  }
})
// ─────────────────────────────────────────────────────────

// ── Public info (highlights + location) ──────────────────
const richEditor = ref<HTMLElement | null>(null);
const initialEditorContent = ref('');

const execCommand = (cmd: string, val = '') => {
  document.execCommand(cmd, false, val);
  updateFromEditor();
};

const updateFromEditor = () => {
  if (richEditor.value) {
    pubInfoForm.value.locationText = richEditor.value.innerHTML;
  }
};

const pubInfoForm = ref({
  highlightsJson: [] as Highlight[],
  highlightsTitle: '',
  highlightsSubtitle: '',
  traditionalHighlightsTitle: '',
  traditionalHighlightsSubtitle: '',
  locationText: '',
  startingPrice: null as number | null,
  maxInstallments: null as number | null,
  paymentConditionsSummary: '',
  address: '',
  googleMapsUrl: '',
  youtubeVideoUrl: '',
  constructionStatus: [] as { label: string, percentage: number }[],
  legalNotice: ''
})
const savingPublicVideo = ref(false)
const savingPublicPricing = ref(false)
const savingPublicConstruction = ref(false)
const savingPublicLocation = ref(false)
const savingPublicHighlights = ref(false)
const savingPublicDescription = ref(false)
const savingPublicLegal = ref(false)
const newHighlight = ref({ label: '', value: '' })
const newWorkStage = ref({ label: '', percentage: 0 })

// ── Nearby Places ─────────────────────────────────────────
const hasSavedAddress = computed(() => !!project.value?.address?.trim())
const nearbyEnabled = ref(true)
const nearbyListExpanded = ref(false)
const nearbyStatus = ref<any>(null)
const nearbyRegenerating = ref(false)

const NEARBY_ICONS: Record<string, string> = {
  school: '🎓', supermarket: '🛒', pharmacy: '💊', hospital: '🏥',
  park: '🌳', restaurant: '🍽️', gym: '🏋️', shopping_mall: '🛍️',
}
const nearbyCategoryIcon = (cat: string) => NEARBY_ICONS[cat] || '📍'

const nearbyGrouped = computed(() => {
  const items = nearbyStatus.value?.items || []
  const groups: Record<string, { category: string; categoryLabel: string; items: any[] }> = {}
  for (const item of items) {
    if (!groups[item.category]) {
      groups[item.category] = { category: item.category, categoryLabel: item.categoryLabel, items: [] }
    }
    groups[item.category]!.items.push(item)
  }
  return Object.values(groups)
})

const loadNearbyStatus = async () => {
  if (!project.value?.id || !project.value?.address?.trim()) {
    nearbyStatus.value = null
    nearbyEnabled.value = true
    nearbyListExpanded.value = false
    return
  }
  try {
    nearbyStatus.value = await fetchApi(`/nearby/${project.value.id}/status`)
    nearbyEnabled.value = nearbyStatus.value?.enabled ?? true
  } catch { /* silent */ }
}

const toggleNearby = async () => {
  if (!project.value?.id) return
  try {
    await fetchApi(`/nearby/${project.value.id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: nearbyEnabled.value })
    })
    toastSuccess(nearbyEnabled.value ? 'Proximidades ativadas' : 'Proximidades desativadas')
  } catch (e: any) { toastFromError(e, 'Erro ao alterar proximidades') }
}

const regenerateNearby = async () => {
  if (!project.value?.id) return
  nearbyRegenerating.value = true
  try {
    await fetchApi(`/nearby/${project.value.id}/generate`, { method: 'POST' })
    toastSuccess('Geração de proximidades iniciada!')
    // Poll status after a delay
    setTimeout(async () => {
      await loadNearbyStatus()
      nearbyRegenerating.value = false
    }, 5000)
  } catch (e: any) {
    toastFromError(e, 'Erro ao regerar proximidades')
    nearbyRegenerating.value = false
  }
}

const toggleNearbyItemVisibility = async (item: any) => {
  const newVisible = item.visible === false ? true : false
  try {
    await fetchApi(`/nearby/item/${item.id}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ visible: newVisible })
    })
    item.visible = newVisible
    toastSuccess(newVisible ? 'Local visível na página pública' : 'Local oculto da página pública')
  } catch (e: any) {
    toastFromError(e, 'Erro ao alterar visibilidade')
  }
}

// Infraestrutura Categorizada
const newInfraCategory = ref('')
const infraItemInputs = ref<Record<number, string>>({}) // Unique input for each category
const addingItemsToCategory = ref<number | null>(null)

const addInfraCategory = () => {
  if (!newInfraCategory.value) return
  pubInfoForm.value.highlightsJson = [...pubInfoForm.value.highlightsJson, { 
    type: 'category', 
    title: newInfraCategory.value, 
    items: [] 
  }]
  newInfraCategory.value = ''
}

const addInfraItem = (catIdx: number) => {
  const value = infraItemInputs.value[catIdx]
  if (!value) return
  
  const cat = pubInfoForm.value.highlightsJson[catIdx]
  if (cat && cat.type === 'category') {
    if (!cat.items) cat.items = []
    cat.items.push(value)
    infraItemInputs.value[catIdx] = '' // Clear only this specific input
  }
}

const removeInfraItem = (catIdx: number, itemIdx: number) => {
  const cat = pubInfoForm.value.highlightsJson[catIdx]
  if (cat && cat.type === 'category' && cat.items) {
    cat.items.splice(itemIdx, 1)
  }
}

const addHighlight = () => {
  if (!newHighlight.value.label) return
  pubInfoForm.value.highlightsJson = [...pubInfoForm.value.highlightsJson, { type: 'highlight' as const, icon: '✅', ...newHighlight.value }]
  newHighlight.value = { label: '', value: '' }
}
const removeHighlight = (i: number) => {
  pubInfoForm.value.highlightsJson = pubInfoForm.value.highlightsJson.filter((_, idx) => idx !== i)
}

const addWorkStage = () => {
  if (!newWorkStage.value.label) return
  pubInfoForm.value.constructionStatus = [...pubInfoForm.value.constructionStatus, { ...newWorkStage.value }]
  newWorkStage.value = { label: '', percentage: 0 }
}
const removeWorkStage = (i: number) => {
  pubInfoForm.value.constructionStatus = pubInfoForm.value.constructionStatus.filter((_, idx) => idx !== i)
}

type PublicBlockField =
  | 'highlightsJson'
  | 'highlightsTitle'
  | 'highlightsSubtitle'
  | 'traditionalHighlightsTitle'
  | 'traditionalHighlightsSubtitle'
  | 'locationText'
  | 'startingPrice'
  | 'maxInstallments'
  | 'paymentConditionsSummary'
  | 'address'
  | 'googleMapsUrl'
  | 'youtubeVideoUrl'
  | 'constructionStatus'
  | 'legalNotice'

const buildPublicInfoPayload = () => {
  let mapUrl = pubInfoForm.value.googleMapsUrl || ''
  if (mapUrl.includes('<iframe')) {
    const match = mapUrl.match(/src=["'](.+?)["']/)
    if (match && match[1]) mapUrl = match[1]
  }

  let ytUrl = pubInfoForm.value.youtubeVideoUrl || ''
  if (ytUrl.includes('youtube.com/watch?v=')) {
    ytUrl = ytUrl.replace('watch?v=', 'embed/')
  } else if (ytUrl.includes('youtu.be/')) {
    ytUrl = ytUrl.replace('youtu.be/', 'www.youtube.com/embed/')
  }

  return {
    highlightsJson: pubInfoForm.value.highlightsJson,
    highlightsTitle: pubInfoForm.value.highlightsTitle,
    highlightsSubtitle: pubInfoForm.value.highlightsSubtitle,
    traditionalHighlightsTitle: pubInfoForm.value.traditionalHighlightsTitle,
    traditionalHighlightsSubtitle: pubInfoForm.value.traditionalHighlightsSubtitle,
    locationText: pubInfoForm.value.locationText,
    startingPrice: pubInfoForm.value.startingPrice ? Number(pubInfoForm.value.startingPrice) : null,
    maxInstallments: pubInfoForm.value.maxInstallments ? Number(pubInfoForm.value.maxInstallments) : null,
    paymentConditionsSummary: pubInfoForm.value.paymentConditionsSummary || null,
    address: pubInfoForm.value.address || null,
    googleMapsUrl: mapUrl || null,
    youtubeVideoUrl: ytUrl || null,
    constructionStatus: pubInfoForm.value.constructionStatus,
    legalNotice: pubInfoForm.value.legalNotice || null,
  }
}

const savePublicInfoBlock = async (
  fields: PublicBlockField[],
  savingRef: { value: boolean },
  successMessage: string,
  errorMessage: string,
  afterSave?: () => Promise<void> | void,
) => {
  savingRef.value = true
  try {
    const fullPayload = buildPublicInfoPayload()
    const payload: Record<string, any> = {}
    for (const field of fields) {
      payload[field] = fullPayload[field]
    }

    project.value = await fetchApi(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    toastSuccess(successMessage)
    if (afterSave) {
      await afterSave()
    }
  } catch (e) {
    toastFromError(e, errorMessage)
  }
  savingRef.value = false
}

const savePublicVideoBlock = async () => {
  await savePublicInfoBlock(
    ['youtubeVideoUrl'],
    savingPublicVideo,
    'Vídeo salvo!',
    'Erro ao salvar vídeo',
  )
}

const savePublicPricingBlock = async () => {
  await savePublicInfoBlock(
    ['startingPrice', 'maxInstallments', 'paymentConditionsSummary'],
    savingPublicPricing,
    'Preços e condições salvos!',
    'Erro ao salvar preços e condições',
  )
}

const savePublicConstructionBlock = async () => {
  await savePublicInfoBlock(
    ['constructionStatus'],
    savingPublicConstruction,
    'Acompanhamento salvo!',
    'Erro ao salvar acompanhamento',
  )
}

const savePublicLocationBlock = async () => {
  await savePublicInfoBlock(
    ['address', 'googleMapsUrl'],
    savingPublicLocation,
    'Localização salva!',
    'Erro ao salvar localização',
    async () => {
      await loadNearbyStatus()
    },
  )
}

const savePublicHighlightsBlock = async () => {
  await savePublicInfoBlock(
    [
      'highlightsJson',
      'highlightsTitle',
      'highlightsSubtitle',
      'traditionalHighlightsTitle',
      'traditionalHighlightsSubtitle',
    ],
    savingPublicHighlights,
    'Infraestrutura e destaques salvos!',
    'Erro ao salvar infraestrutura e destaques',
  )
}

const savePublicDescriptionBlock = async () => {
  await savePublicInfoBlock(
    ['locationText'],
    savingPublicDescription,
    'Texto descritivo salvo!',
    'Erro ao salvar texto descritivo',
  )
}

const savePublicLegalBlock = async () => {
  await savePublicInfoBlock(
    ['legalNotice'],
    savingPublicLegal,
    'Informações legais salvas!',
    'Erro ao salvar informações legais',
  )
}

// ── Corretores ────────────────────────────────────────────
const corretores = ref<Corretor[]>([])
const loadingCorretores = ref(false)
const showNewCorretor = ref(false)
const creatingCorretor = ref(false)
const corretorForm = ref({ name: '', phone: '', email: '', code: '', creci: '', enabled: true, notes: '' })
const corretorError = ref('')
const emailError = ref('')
const codeError = ref('')
const emailAvailable = ref(false)
const codeAvailable = ref(false)
const emailLoading = ref(false)
const codeLoading = ref(false)
const slugManuallyEdited = ref(false)

let emailDebounceTimer: any = null
let codeDebounceTimer: any = null

watch(() => corretorForm.value.email, (email) => {
  emailError.value = ''
  emailAvailable.value = false
  if (!email || !email.includes('@')) return
  
  clearTimeout(emailDebounceTimer)
  emailDebounceTimer = setTimeout(async () => {
    emailLoading.value = true
    try {
      const res = await fetchApi(`/realtor-links/check-email?email=${email}`)
      if (!res.available) {
        emailError.value = 'Já existe um usuário com este email.'
      } else {
        emailAvailable.value = true
      }
    } catch {
      // Ignora erro na verificação
    } finally {
      emailLoading.value = false
    }
  }, 600)
})

watch(() => corretorForm.value.code, (code) => {
  codeError.value = ''
  codeAvailable.value = false
  if (!code) return
  
  clearTimeout(codeDebounceTimer)
  codeDebounceTimer = setTimeout(async () => {
    codeLoading.value = true
    try {
      const res = await fetchApi(`/realtor-links/check-code?code=${code}`)
      if (!res.available) {
        codeError.value = 'Este código já está sendo usado por outro corretor.'
      } else {
        codeAvailable.value = true
      }
    } catch {
      // Ignora erro na verificação
    } finally {
      codeLoading.value = false
    }
  }, 600)
})

function onNameInput() {
  if (!slugManuallyEdited.value) {
    corretorForm.value.code = corretorForm.value.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}

const loadCorretores = async () => {
  loadingCorretores.value = true
  try {
    corretores.value = await fetchApi(`/realtor-links?projectId=${projectId}`)
  } catch (e) { toastFromError(e, 'Erro ao carregar corretores') }
  loadingCorretores.value = false
}

const createCorretor = async () => {
  if (emailError.value || codeError.value) {
    toastFromError(new Error('Corrija os erros no formulário antes de salvar'))
    return
  }

  creatingCorretor.value = true; corretorError.value = ''
  try {
    const c = await fetchApi('/realtor-links', {
      method: 'POST',
      body: JSON.stringify({ ...corretorForm.value, projectIds: [projectId] }),
    })
    corretores.value.unshift(c)
    showNewCorretor.value = false
    corretorForm.value = { name: '', phone: '', email: '', code: '', creci: '', enabled: true, notes: '' }
    slugManuallyEdited.value = false
    emailError.value = ''
    codeError.value = ''
    emailAvailable.value = false
    codeAvailable.value = false
    toastSuccess('Corretor criado!')
  } catch (e: any) {
    corretorError.value = e.message || 'Erro ao criar'
    toastFromError(e, 'Erro ao criar corretor')
  }
  creatingCorretor.value = false
}

const toggleCorretor = async (c: Corretor) => {
  try {
    const updated = await fetchApi(`/realtor-links/${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !c.enabled }),
    })
    Object.assign(c, updated)
  } catch (e: any) { toastFromError(e, 'Erro ao atualizar corretor') }
}

const deleteCorretor = async (c: Corretor) => {
  if (!confirm(`Excluir corretor "${c.name}"?`)) return
  try {
    await fetchApi(`/realtor-links/${c.id}`, { method: 'DELETE' })
    corretores.value = corretores.value.filter(x => x.id !== c.id)
    toastSuccess('Corretor excluído')
  } catch (e: any) { toastFromError(e, 'Erro ao excluir corretor') }
}

const corretorLotLink = (c: Corretor, lotCode?: string) => {
  if (!publicUrl.value) return ''
  return `${window?.location?.origin || ''}${publicUrl.value}?c=${c.code}${lotCode ? `#lote-${lotCode}` : ''}`
}

const copyLink = (text: string) => {
  navigator.clipboard.writeText(text)
  toastSuccess('Link copiado!')
}

// ── Payment Configuration ────────────────────────────────
const allConfigs = ref<PaymentConfig[]>([])
const activeConfigs = ref<PaymentConfig[]>([])
const loadingPaymentOptions = ref(false)

const loadPaymentConfig = async () => {
  loadingPaymentOptions.value = true
  try {
    // We get the list of all gateways with their enablement status for this project
    const configs = await fetchApi(`/admin/payment-config/project/${projectId}`)
    allConfigs.value = configs || []

    // activeConfigs is used for the UI to know which ones are toggled on
    activeConfigs.value = (allConfigs.value || []).filter(c => c.isEnabledForProject)
  } catch (e) {
    console.error('Error loading payment configs', e)
  } finally {
    loadingPaymentOptions.value = false
  }
}

const isConfigActive = (configId: string) => {
  return activeConfigs.value.some(c => c.id === configId)
}

const toggleGateway = async (configId: string, active: boolean) => {
  try {
    await fetchApi(`/admin/payment-config/project/${projectId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ gatewayId: configId, enabled: active })
    })
    
    if (active) {
      const config = allConfigs.value.find(c => (c as any).id === configId)
      if (config) activeConfigs.value.push(config)
    } else {
      activeConfigs.value = activeConfigs.value.filter(c => (c as any).id !== configId)
    }
    
    toastSuccess('Gateway alterado para o projeto')
  } catch (e) {
    toastFromError(e, 'Erro ao alternar gateway')
  }
}
// ─────────────────────────────────────────────────────────

// ── AI Configuration ─────────────────────────────────────
const aiConfigs = ref<AiConfig[]>([])
const resolveAiConfigId = () => {
  if (editForm.value.aiConfigId) return editForm.value.aiConfigId
  return aiConfigs.value[0]?.id || ''
}

const activeAiConfigLabel = computed(() => {
  const aiConfigId = resolveAiConfigId()
  if (!aiConfigId) return ''
  const selected = aiConfigs.value.find(c => c.id === aiConfigId)
  return selected ? `${selected.name} (${selected.model})` : ''
})

const loadAiConfigs = async () => {
  try {
    const res = await fetchApi('/ai/configs')
    aiConfigs.value = res || []

    if (editForm.value.aiEnabled && !editForm.value.aiConfigId && aiConfigs.value.length > 0) {
      const firstConfig = aiConfigs.value[0]
      if (firstConfig) {
        editForm.value.aiConfigId = firstConfig.id
      }
    }
  } catch (e) {
    console.error('Error loading AI configs', e)
  }
}

watch(
  [() => editForm.value.aiEnabled, () => aiConfigs.value.length],
  ([enabled]) => {
    if (enabled && !editForm.value.aiConfigId && aiConfigs.value.length > 0) {
      const firstConfig = aiConfigs.value[0]
      if (firstConfig) {
        editForm.value.aiConfigId = firstConfig.id
      }
    }
  }
)
// ─────────────────────────────────────────────────────────

// ── Tabs ─────────────────────────────────────────────────
const sidebarSections = computed(() => {
  const sections = [
    { id: 'configuracoes', icon: '⚙️', label: 'Configurações' },
    { id: 'lotes', icon: '📍', label: 'Lotes' },
    { id: 'pagina-publica', icon: '📄', label: 'Página Pública' },
    { id: 'financeiro', icon: '🧮', label: 'Simulação Financeira' },
    { id: 'agendamento', icon: '📅', label: 'Agendamento' },
  ]
  // Only show Pagamentos if there are global payment configs available
  if (allConfigs.value.length > 0) {
    sections.push({ id: 'pagamentos', icon: '💳', label: 'Pagamentos & Taxas' })
  }
  // Only show Assistente IA if there are AI configs available
  if (aiConfigs.value.length > 0) {
    sections.push({ id: 'assistente-ia', icon: '🤖', label: 'Assistente IA' })
  }
  return sections
})

const lotBadge = (s: string) => ({ AVAILABLE: 'badge-success', RESERVED: 'badge-warning', SOLD: 'badge-danger' }[s] || 'badge-neutral')
const lotLabel = (s: string) => ({ AVAILABLE: 'Disponível', RESERVED: 'Reservado', SOLD: 'Vendido' }[s] || s)
const slopeLabel = (s: string) => ({ FLAT: 'Plano', UPHILL: 'Aclive', DOWNHILL: 'Declive' }[s] || s)

const formatCurrencyToBrasilia = (val: number | string) => {
  if (!val) return '---'
  const num = typeof val === 'string' ? parseFloat(val) : val
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
}

const loadLotsPaginated = async (page = 1) => {
  try {
    const res = await fetchApi(`/projects/${projectId}/lots?page=${page}&limit=50`)
    lots.value = res.data
    lotsMeta.value = res.meta
  } catch (e) {
    toastFromError(e, 'Erro ao carregar lotes')
  }
}

const loadProject = async () => {
  loading.value = true
  error.value = ''
  try {
    const [p, els, resLots, md] = await Promise.all([
      fetchApi(`/projects/${projectId}`),
      fetchApi(`/projects/${projectId}/map-elements`),
      fetchApi(`/projects/${projectId}/lots?page=1&limit=50`),
      fetchApi(`/projects/${projectId}/media`),
    ])
    project.value = p
    mapElements.value = els
    lots.value = resLots.data
    lotsMeta.value = resLots.meta
    media.value = md
    loadPaymentConfig()
    editForm.value = {
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      showPaymentConditions: p.showPaymentConditions ?? false,
      customDomain: p.customDomain || '',
      reservationFeeType: p.reservationFeeType || 'FIXED',
      reservationFeeValue: p.reservationFeeValue ?? 500,
      reservationExpiryHours: p.reservationExpiryHours ?? 24,
      minDownPaymentPercent: p.minDownPaymentPercent ?? 10,
      minDownPaymentValue: p.minDownPaymentValue ?? 0,
      monthlyInterestRate: p.monthlyInterestRate ?? 0.9,
      indexer: p.indexer || 'IGP-M',
      allowIntermediary: p.allowIntermediary ?? false,
      financingDisclaimer: p.financingDisclaimer || 'Simulação baseada nas regras vigentes. Sujeito à aprovação de crédito e alteração de taxas.',
      aiEnabled: p.aiEnabled ?? false,
      aiConfigId: p.aiConfigId || '',
      maxInstallments: p.maxInstallments ?? 180,
      paymentConditions: Array.isArray(p.paymentConditions) ? [...p.paymentConditions] : []
    }
    originalSlug.value = p.slug
    loadAiConfigs()
    pubInfoForm.value = {
      highlightsJson: Array.isArray(p.highlightsJson) ? p.highlightsJson : [],
      highlightsTitle: p.highlightsTitle || 'Sua família merece o melhor.',
      highlightsSubtitle: p.highlightsSubtitle || 'Qualidade de vida, segurança e infraestrutura completa em um só lugar.',
      traditionalHighlightsTitle: p.traditionalHighlightsTitle || 'Destaques',
      traditionalHighlightsSubtitle: p.traditionalHighlightsSubtitle || 'Diferenciais pensados para o seu bem-estar.',
      locationText: p.locationText || '',
      startingPrice: p.startingPrice,
      maxInstallments: p.maxInstallments,
      paymentConditionsSummary: p.paymentConditionsSummary || '',
      address: p.address || '',
      googleMapsUrl: p.googleMapsUrl || '',
      youtubeVideoUrl: p.youtubeVideoUrl || '',
      constructionStatus: Array.isArray(p.constructionStatus) ? p.constructionStatus : [],
      legalNotice: p.legalNotice || ''
    }
    initialEditorContent.value = p.locationText || '<p></p>'
    // Load nearby status
    loadNearbyStatus()
  } catch (e) {
    error.value = 'Não foi possível carregar o projeto.'
    toastFromError(e, 'Erro ao carregar projeto')
  }
  loading.value = false
}

const togglePublish = async () => {
  const action = project.value.status === 'PUBLISHED' ? 'unpublish' : 'publish'
  try {
    project.value = await fetchApi(`/projects/${projectId}/${action}`, { method: 'PATCH' })
    toastSuccess(action === 'publish' ? 'Projeto publicado!' : 'Projeto despublicado')
  } catch (e) {
    toastFromError(e, 'Erro ao alterar publicação')
  }
}

const saveSettings = async () => {
  if (editSlugTaken.value) {
    settingsError.value = 'Este slug já está em uso por outro projeto!'
    return
  }
  savingSettings.value = true; settingsError.value = ''; settingsSaved.value = false
  try {
    // Exclude paymentConditions (not in UpdateProjectDto)
    const { paymentConditions: _pc, ...raw } = editForm.value

    if (raw.aiEnabled) {
      raw.aiConfigId = resolveAiConfigId()
      if (!raw.aiConfigId) {
        settingsError.value = 'Nenhuma configuração de IA foi encontrada. Crie uma em Assistente IA antes de ativar para este projeto.'
        savingSettings.value = false
        return
      }
    }

    // Coerce numeric fields to ensure they're numbers, not strings
    const settingsPayload = {
      ...raw,
      reservationFeeValue: raw.reservationFeeValue != null ? Number(raw.reservationFeeValue) : undefined,
      reservationExpiryHours: raw.reservationExpiryHours != null ? Number(raw.reservationExpiryHours) : undefined,
      minDownPaymentPercent: raw.minDownPaymentPercent != null ? Number(raw.minDownPaymentPercent) : undefined,
      minDownPaymentValue: raw.minDownPaymentValue != null ? Number(raw.minDownPaymentValue) : undefined,
      monthlyInterestRate: raw.monthlyInterestRate != null ? Number(raw.monthlyInterestRate) : undefined,
      maxInstallments: raw.maxInstallments != null ? Number(raw.maxInstallments) : undefined,
    }
    project.value = await fetchApi(`/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(settingsPayload) })
    settingsSaved.value = true
    toastSuccess('Configurações salvas!')
    setTimeout(() => settingsSaved.value = false, 2000)
  } catch (e: any) {
    settingsError.value = e.message
    toastFromError(e, 'Erro ao salvar configurações')
  }
  savingSettings.value = false
}

const confirmDelete = async () => {
  if (!confirm('Tem certeza que deseja excluir este projeto?')) return
  try {
    await fetchApi(`/projects/${projectId}`, { method: 'DELETE' })
    toastSuccess('Projeto excluído!')
    router.push('/painel/projetos')
  } catch (e) {
    toastFromError(e, 'Erro ao excluir projeto')
  }
}

const uploadBannerImage = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingBanner.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    project.value = await uploadApi(`/projects/${projectId}/banner-image`, fd)
    toastSuccess('Banner do projeto enviado!')
  } catch (err) {
    toastFromError(err, 'Erro ao enviar banner')
  }
  (e.target as HTMLInputElement).value = ''
  uploadingBanner.value = false
}

const removeBannerImage = async () => {
  try {
    project.value = await fetchApi(`/projects/${projectId}/banner-image`, { method: 'DELETE' })
    toastSuccess('Banner removido')
  } catch (e: any) {
    toastFromError(e, 'Erro ao remover banner')
  }
}

const uploadMediaFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingMedia.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    const m = await uploadApi(`/projects/${projectId}/media`, fd)
    media.value.unshift(m)
    toastSuccess('Mídia enviada!')
  } catch (err) {
    toastFromError(err, 'Erro ao enviar mídia')
  }
  (e.target as HTMLInputElement).value = ''
  uploadingMedia.value = false
}

const deleteMedia = async (id: string) => {
  if (!confirm('Excluir esta mídia?')) return
  try {
    await fetchApi(`/projects/${projectId}/media/${id}`, { method: 'DELETE' })
    media.value = media.value.filter(m => m.id !== id)
    toastSuccess('Mídia excluída')
  } catch (e: any) {
    toastFromError(e, 'Erro ao excluir mídia')
  }
}

onMounted(async () => {
  await loadProject()
  await loadSchedulingConfig()
  if (typeof document !== 'undefined') {
    document.execCommand('defaultParagraphSeparator', false, 'p');
  }
})
</script>

<style scoped>
/* ─── Project Layout: Sidebar + Content ──────────────── */
.project-layout {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  min-height: calc(100vh - 200px);
}

.project-sidebar {
  position: sticky;
  top: 24px;
  flex: 0 0 220px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
  border-radius: 16px;
  backdrop-filter: blur(12px);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  color: var(--color-surface-400);
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  font-family: inherit;
}

.sidebar-link:hover {
  background: var(--glass-bg-heavy);
  color: var(--color-surface-200);
}

.sidebar-link.active {
  background: rgba(16, 185, 129, 0.12);
  color: var(--color-primary-400, #34d399);
  font-weight: 700;
}

.sidebar-icon {
  font-size: 1rem;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.sidebar-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-divider {
  height: 1px;
  background: var(--glass-border-subtle);
  margin: 4px 0;
}

.sidebar-tools {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-tool-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  color: var(--color-surface-300);
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: 600;
  transition: all 0.2s;
  background: var(--glass-bg-heavy);
  border: 1px solid var(--glass-border-subtle);
}

.sidebar-tool-link:hover {
  border-color: var(--color-primary-500);
  color: var(--color-primary-400, #34d399);
  transform: translateX(2px);
}

.project-content {
  flex: 1;
  min-width: 0;
}

.content-section {
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 1024px) {
  .project-layout {
    flex-direction: column;
  }
  .project-sidebar {
    position: static;
    flex: none;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 6px;
    padding: 12px;
    border-radius: 12px;
  }
  .sidebar-nav {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px;
  }
  .sidebar-link {
    padding: 6px 10px;
    font-size: 0.75rem;
  }
  .sidebar-divider {
    display: none;
  }
  .sidebar-tools {
    flex-direction: row;
    gap: 4px;
  }
  .sidebar-tool-link {
    padding: 6px 10px;
    font-size: 0.75rem;
  }
}

/* ─── Existing Styles ──────────────────────────────────── */
.media-card-v4 {
  position: relative; border-radius: 12px; overflow: hidden; border: 1px solid var(--glass-border-subtle); background: var(--glass-bg-heavy); transition: all 0.2s; aspect-ratio: 16/10;
}
.media-card-v4:hover { border-color: var(--color-primary-500); transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
.media-thumb-v4 { width: 100%; height: 100%; object-fit: cover; display: block; }

.media-delete-btn-v4 { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border-radius: 50%; border: none; background: rgba(255, 30, 0, 0.1); color: #ff3b30; font-size: 14px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.media-delete-btn-v4:hover { background: #ff3b30; color: white; transform: scale(1.1); }

/* Overlays para a Galeria */
.media-overlay-v4 { position: absolute; inset: 0; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; opacity: 0; transition: opacity 0.2s; background: linear-gradient(to top, rgba(0,0,0,0.4), transparent); }
.media-card-v4:hover .media-overlay-v4 { opacity: 1; }
.media-type-pill { background: var(--glass-bg-heavy); color: var(--color-surface-50); padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; width: fit-content; }
.delete-btn-circ { width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--glass-bg); color: #ff3b30; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; margin-left: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
.delete-btn-circ:hover { background: #ff3b30; color: white; transform: rotate(90deg); }

.media-card {
  border: 1px solid var(--glass-border-subtle); border-radius: 8px; overflow: hidden; background: var(--glass-bg);
}
.media-thumb { width: 100%; height: 160px; object-fit: cover; display: block; }
.media-info { padding: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem; color: var(--color-surface-200); }

.rich-editor-v4 {
  background: var(--glass-bg) !important;
  color: var(--color-surface-100);
  border: 1px solid var(--glass-border) !important;
  transition: all 0.2s;
  outline: none;
}
.rich-editor-v4:focus {
  border-color: var(--color-primary-500) !important;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1) !important;
}
.rich-editor-v4.disabled {
  background: var(--glass-bg-heavy) !important;
  pointer-events: none;
  opacity: 0.7;
}
.rich-editor-v4 :deep(p), .rich-editor-v4 p, .rich-editor-v4 :deep(div), .rich-editor-v4 div { margin-bottom: 0.75rem; }
.rich-editor-v4 :deep(ul), .rich-editor-v4 ul { padding-left: 1.5rem; margin-bottom: 1rem; list-style-type: disc; }
.rich-editor-v4 :deep(li), .rich-editor-v4 li { margin-bottom: 0.25rem; }
.rich-editor-v4 :deep(b), .rich-editor-v4 b, .rich-editor-v4 :deep(strong), .rich-editor-v4 strong { font-weight: 700; color: var(--color-surface-50); }

.provider-badge-sm {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 800;
  color: white;
  text-transform: uppercase;
}
.provider-badge-sm.stripe { background: #635bff; }
.provider-badge-sm.asaas { background: #0062ff; }
.provider-badge-sm.mercado_pago { background: #009ee3; }
.provider-badge-sm.pagar_me { background: #3c5af4; }
.provider-badge-sm.pagseguro { background: #3fb43f; }

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--color-surface-600);
  transition: .4s;
  border-radius: 24px;
}
.toggle-switch label:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: var(--glass-bg);
  transition: .4s;
  border-radius: 50%;
}
.toggle-switch input:checked + label {
  background-color: var(--color-primary-500);
}
.toggle-switch input:checked + label:before {
  transform: translateX(20px);
}

.form-input.is-valid {
  border-color: #10b981 !important;
  padding-right: 32px;
}
.form-input.is-valid:focus {
  border-color: #10b981 !important;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1) !important;
}
.form-input.is-invalid {
  border-color: #ef4444 !important;
}

/* Financing Layout */
.financing-layout-v4 {
  display: flex;
  gap: 40px;
  align-items: flex-start;
}
@media (max-width: 1200px) {
  .financing-layout-v4 { flex-direction: column; }
  .financing-preview-sidebar { width: 100% !important; flex: none !important; position: static !important; }
}
.financing-preview-sidebar {
  flex: 0 0 380px;
  position: sticky;
  top: 20px;
}
.preview-header {
  margin-bottom: 20px;
}
.preview-header h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-surface-100);
}
.preview-header p {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: var(--color-surface-400);
}

/* Simulator V4 Styles (Panel dark theme) */
:root {
  --v4-primary: #60a5fa;
  --v4-primary-light: rgba(96, 165, 250, 0.08);
  --v4-border: rgba(255, 255, 255, 0.12);
  --v4-text: #f5f5f7;
  --v4-text-muted: rgba(255, 255, 255, 0.55);
}

.simulator-card-v4 {
  background: var(--glass-bg);
  border-radius: 24px;
  border: 1px solid var(--v4-border);
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.3);
}
.sim-header {
  padding: 24px;
  background: var(--glass-bg-heavy);
  border-bottom: 1px solid var(--v4-border);
}
.sim-header .h-item { display: flex; flex-direction: column; gap: 4px; padding: 0; }
.sim-header .l { font-size: 12px; color: var(--v4-text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
.sim-header .v { font-weight: 700; color: var(--v4-primary); }

.sim-body { padding: 24px; }

.input-group-v4 { display: flex; flex-direction: column; gap: 8px; }
.ig-label { font-size: 14px; font-weight: 600; color: var(--v4-text); }
.ig-flex { display: flex; gap: 8px; }
.ig-field { 
  display: flex; 
  align-items: center; 
  background: var(--glass-bg-heavy); 
  border: 1px solid rgba(255, 255, 255, 0.1); 
  border-radius: 10px; 
  padding: 0 12px;
  flex: 1;
}
.ig-curr { font-size: 12px; font-weight: 700; color: rgba(255, 255, 255, 0.55); }
.ig-input { 
  border: none !important; 
  background: transparent !important; 
  width: 100% !important; 
  padding: 10px 6px !important; 
  font-size: 16px !important; 
  font-weight: 700 !important; 
  color: var(--v4-text) !important; 
  outline: none !important;
  box-shadow: none !important;
  height: auto !important;
}
.ig-hint { font-size: 12px; color: rgba(255, 255, 255, 0.55); margin-top: 2px; }

.range-slider-v4 {
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.12);
  outline: none;
  margin: 15px 0;
}
.range-slider-v4::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--v4-primary);
  cursor: pointer;
  border: 3px solid white;
  box-shadow: 0 2px 6px rgba(0,0,0,0.4);
}

.slider-labels { display: flex; justify-content: space-between; font-size: 11px; color: rgba(255, 255, 255, 0.55); font-weight: 600; }

.sim-result-v4 {
  margin-top: 30px;
  background: var(--v4-primary-light);
  padding: 24px;
  border-radius: 16px;
  text-align: center;
  border: 1px solid rgba(96, 165, 250, 0.15);
}
.r-label { font-size: 13px; font-weight: 600; color: var(--v4-primary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
.r-value { font-weight: 800; color: var(--v4-primary); letter-spacing: -1px; }
.r-detail { font-size: 12px; color: var(--v4-primary); opacity: 0.8; font-weight: 600; margin-top: 4px; }

.sim-disclaimer-v4 {
  margin-top: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.5;
  text-align: center;
}

/* Standardized Remove Buttons */
.btn-remove-v4 {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ff3b30; /* Apple Red */
  border: 2px solid white;
  color: white;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  font-size: 12px;
  transition: all 0.2s;
  z-index: 10;
}
.btn-remove-v4:hover {
  transform: scale(1.1);
  background: #d70015;
}

/* Infrastructure Badges */
.infra-badge-v4 {
  background: var(--glass-bg-heavy);
  color: var(--color-surface-50);
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 0.8125rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.infra-badge-remove {
  cursor: pointer;
  width: 18px;
  height: 18px;
  background: rgba(255, 255, 255, 0.15);
  color: var(--color-surface-50);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.2s;
}
.infra-badge-remove:hover {
  background: #ff3b30;
  color: white;
}

/* Fix for button contrast issues */
.btn-sm.btn-secondary {
  background: var(--glass-bg-heavy) !important;
  color: #fff !important;
  border: none !important;
}

.modal-actions .btn-secondary {
  background: var(--glass-bg-heavy) !important;
  color: var(--color-surface-100) !important;
  border: 1px solid var(--glass-border) !important;
}

.modal-actions .btn-primary {
  background: #3b82f6 !important;
  color: #fff !important;
  border: none !important;
}

/* Project Stats Bar */
.project-stats-bar {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: var(--glass-bg-heavy);
  border-radius: 8px;
  border: 1px solid var(--glass-border-subtle);
  font-size: 0.75rem;
}

.stat-chip-value {
  font-weight: 800;
  color: var(--color-surface-100);
}

.stat-chip-label {
  color: var(--color-surface-400);
  font-weight: 500;
}

.stat-chip-success .stat-chip-value { color: #10b981; }
.stat-chip-warning .stat-chip-value { color: #f59e0b; }
.stat-chip-danger .stat-chip-value { color: #ef4444; }

/* ── Página Pública layout ── */
.pub-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pub-row {
  display: grid;
  gap: 20px;
}
.pub-row--2col {
  grid-template-columns: 1fr 1fr;
}
.pub-row--3col {
  grid-template-columns: 1fr 1fr 1fr;
}

.pub-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
  border-radius: 12px;
  padding: 20px;
}
.pub-card--compact {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
  border-radius: 12px;
  padding: 20px;
}

.pub-card__title {
  margin: 0 0 16px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-surface-200);
  letter-spacing: -0.01em;
}

.pub-card__overlay-btn {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0,0,0,0.75);
  color: #ef4444;
  border: 1px solid rgba(239,68,68,0.3);
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.72rem;
  cursor: pointer;
  backdrop-filter: blur(4px);
}
.pub-card__overlay-btn:hover {
  background: rgba(239,68,68,0.2);
}

.pub-card__upload-btn {
  display: inline-block;
  margin-top: 12px;
  padding: 6px 16px;
  background: var(--glass-bg-heavy);
  border: 1px solid var(--glass-border-subtle);
  color: var(--color-surface-200);
  font-size: 0.8rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.pub-card__upload-btn:hover {
  background: rgba(255,255,255,0.08);
}

/* Empty / notices */
.pub-empty {
  padding: 24px 16px;
  text-align: center;
  font-size: 0.8rem;
  color: var(--color-surface-500);
  background: var(--glass-bg-heavy);
  border-radius: 8px;
}

.pub-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.78rem;
  line-height: 1.4;
}
.pub-notice--warn {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.15);
  color: #d97706;
}
.pub-notice--ok {
  background: rgba(16, 185, 129, 0.08);
  color: var(--color-surface-400);
}
.pub-notice--error {
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
}
.pub-notice--neutral {
  background: rgba(107, 114, 128, 0.08);
  color: var(--color-surface-400);
}

/* Work stages */
.pub-works-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pub-work-item {
  background: var(--glass-bg-heavy);
  border: 1px solid var(--glass-border-subtle);
  border-radius: 8px;
  padding: 12px 14px;
}

/* Inline forms */
.pub-inline-form {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Sub-sections */
.pub-sub-section {
  background: var(--glass-bg-heavy);
  border-radius: 8px;
  padding: 14px;
  border: 1px solid var(--glass-border-subtle);
  margin-bottom: 16px;
}
.pub-sub-label {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-surface-500);
  letter-spacing: 0.04em;
  margin-bottom: 10px;
}

/* Infra categories */
.pub-infra-cat {
  background: var(--glass-bg-heavy);
  border: 1px solid var(--glass-border-subtle);
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;
}

/* Highlights list */
.pub-highlight-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--glass-border-subtle);
  border-radius: 8px;
  background: var(--glass-bg);
}

/* Remove button */
.pub-remove-btn {
  background: transparent;
  border: none;
  color: var(--color-surface-500);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
}
.pub-remove-btn:hover {
  color: #ef4444;
  background: rgba(239,68,68,0.1);
}

/* Collapsible nearby */
.pub-collapse-toggle {
  background: none;
  border: none;
  color: var(--color-surface-400);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 4px 0;
  transition: color 0.15s;
}
.pub-collapse-toggle:hover {
  color: var(--color-surface-200);
}
.pub-nearby-list {
  margin-top: 8px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--glass-border-subtle);
  border-radius: 8px;
  padding: 10px;
  background: var(--glass-bg-heavy);
}
.pub-nearby-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  font-size: 0.72rem;
  border-radius: 4px;
}
.pub-nearby-item__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-surface-300);
}
.pub-nearby-item__dist {
  color: var(--color-surface-500);
  white-space: nowrap;
  font-size: 0.68rem;
}
.pub-nearby-item__link {
  color: #60a5fa;
  font-size: 0.66rem;
  text-decoration: none;
  white-space: nowrap;
}
.pub-nearby-item__link:hover {
  text-decoration: underline;
}

/* Save bar */
.pub-save-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  padding-top: 20px;
  border-top: 1px solid var(--glass-border-subtle);
}

/* Responsive */
@media (max-width: 900px) {
  .pub-row--2col,
  .pub-row--3col {
    grid-template-columns: 1fr;
  }
}

.reservation-section { margin-bottom: 16px; }
.reservation-section p { font-size: 0.875rem; margin-bottom: 4px; }
.reservation-section-label { font-size: 0.6875rem; text-transform: uppercase; color: var(--color-surface-400); font-weight: 600; margin-bottom: 8px !important; letter-spacing: 0.05em; }
</style>
