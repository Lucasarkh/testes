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
            <NuxtLink to="/painel/projetos" class="btn btn-ghost btn-sm page-back-btn">
              <i class="bi bi-arrow-left-short back-nav-icon" aria-hidden="true"></i>
              <span class="back-nav-label">Projetos</span>
            </NuxtLink>
            <div style="width: 1px; height: 10px; background: rgba(255, 255, 255, 0.06);"></div>
            <span class="badge" :class="project.status === 'PUBLISHED' ? 'badge-success' : 'badge-neutral'" style="font-size: 0.6rem; letter-spacing: 0.05em; text-transform: uppercase;">
              {{ project.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho' }}
            </span>
            <span v-if="project.preLaunchEnabled" class="badge" style="font-size: 0.6rem; letter-spacing: 0.05em; text-transform: uppercase; background: rgba(245, 158, 11, 0.14); color: #fcd34d; border-color: rgba(245, 158, 11, 0.28);">
              Pré-lançamento
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
            class="btn btn-sm btn-primary topbar-action-btn"
            style="border-radius: 9999px; padding-left: 20px; padding-right: 20px; height: 38px;"
          >
            <span style="font-size: 1rem;"><i class="bi bi-globe2" aria-hidden="true"></i></span>
            <span>Ver Página Pública</span>
          </a>

          <NuxtLink
            v-else
            :to="`/preview/${project.id}`"
            target="_blank"
            class="btn btn-sm btn-primary"
            style="border-radius: 9999px; padding-left: 20px; padding-right: 20px; height: 38px;"
          >
            <span style="font-size: 1rem;"><i class="bi bi-eye-fill" aria-hidden="true"></i></span>
            <span>Link de Preview</span>
          </NuxtLink>

          <a
            v-if="plantMirrorPath"
            :href="plantMirrorPath"
            target="_blank"
            class="btn btn-sm btn-primary"
            style="border-radius: 9999px; padding-left: 20px; padding-right: 20px; height: 38px;"
          >
            <span style="font-size: 1rem;"><i class="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i></span>
            <span>Espelho da Planta</span>
          </a>

          <button
            v-if="plantMirrorAbsoluteUrl"
            class="btn btn-sm btn-primary"
            style="border-radius: 9999px; padding-left: 14px; padding-right: 14px; height: 38px;"
            @click="copyLink(plantMirrorAbsoluteUrl)"
            title="Copiar link do espelho da planta"
          >
            <span><i class="bi bi-clipboard-check" aria-hidden="true"></i></span>
          </button>

          <div style="width: 1px; height: 24px; background: rgba(255, 255, 255, 0.06);"></div>

          <div class="flex items-center gap-2">
            <button
              class="btn btn-sm"
              :style="project.preLaunchEnabled
                ? 'border-radius: 9999px; padding-left: 20px; padding-right: 20px; height: 38px; background: rgba(245, 158, 11, 0.14); border: 1px solid rgba(245, 158, 11, 0.28); color: #fcd34d;'
                : 'border-radius: 9999px; padding-left: 20px; padding-right: 20px; height: 38px; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--glass-border-subtle); color: var(--color-surface-100);'"
              :disabled="!authStore.canEdit || togglingPreLaunch || isArchivedProject"
              :title="!authStore.canEdit ? 'Disponível apenas para usuários com permissão de edição' : (isArchivedProject ? 'Projeto arquivado em modo somente leitura' : undefined)"
              @click="togglePreLaunchMode"
            >
              <span style="display: inline-flex; align-items: center; gap: 6px;">
                <i :class="project.preLaunchEnabled ? 'bi bi-stars' : 'bi bi-megaphone-fill'" aria-hidden="true"></i>
                <span>{{ togglingPreLaunch ? 'Salvando...' : (project.preLaunchEnabled ? 'Desativar Pré-lançamento' : 'Ativar Pré-lançamento') }}</span>
              </span>
            </button>

            <button 
              class="btn btn-sm btn-primary" 
              style="border-radius: 9999px; padding-left: 20px; padding-right: 20px; height: 38px;"
              :disabled="!authStore.canEdit"
              :title="!authStore.canEdit ? 'Disponível apenas para usuários com permissão de edição' : undefined"
              @click="togglePublish"
            >
              <span style="display: inline-flex; align-items: center; gap: 6px;">
                <i :class="project.status === 'PUBLISHED' ? 'bi bi-pause-circle-fill' : 'bi bi-broadcast-pin'" aria-hidden="true"></i>
                <span>{{ project.status === 'PUBLISHED' ? 'Parar Publicação' : 'Publicar Agora' }}</span>
              </span>
            </button>
            
            <button 
              class="btn btn-sm btn-danger" 
              style="border-radius: 9999px; padding-left: 16px; padding-right: 16px; height: 38px;"
              :disabled="!authStore.canEdit || isArchivedProject"
              :title="!authStore.canEdit ? 'Disponível apenas para usuários com permissão de edição' : (isArchivedProject ? 'Projeto arquivado em modo somente leitura' : undefined)"
              @click="confirmDelete"
            >
              <span><i class="bi bi-trash3-fill" aria-hidden="true"></i> Excluir</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="isArchivedProject" class="alert alert-warning archived-project-warning">
        Projeto arquivado em modo somente leitura. Publique o projeto para liberar edições.
      </div>

      <!-- Sidebar + Content Layout -->
      <div class="project-layout" :class="{ 'archived-readonly': isArchivedProject }">
        <aside class="project-sidebar">
          <div class="sidebar-tools">
            <p class="sidebar-tools-title">Editores</p>
            <NuxtLink :to="`/painel/projetos/${projectId}/planta`" class="sidebar-tool-link sidebar-tool-link--primary">
              <span class="sidebar-icon"><i class="bi bi-map" aria-hidden="true"></i></span>
              <span class="sidebar-label">Planta Interativa</span>
            </NuxtLink>
            <NuxtLink :to="`/painel/projetos/${projectId}/panorama`" class="sidebar-tool-link sidebar-tool-link--primary">
              <span class="sidebar-icon"><i class="bi bi-image-fill" aria-hidden="true"></i></span>
              <span class="sidebar-label">Panorama 360°</span>
            </NuxtLink>
            <NuxtLink :to="`/painel/projetos/${projectId}/pos-reserva`" class="sidebar-tool-link sidebar-tool-link--primary">
              <span class="sidebar-icon"><i class="bi bi-file-earmark-text-fill" aria-hidden="true"></i></span>
              <span class="sidebar-label">Reservas</span>
            </NuxtLink>
          </div>
          <nav class="sidebar-nav">
            <div v-for="group in sidebarGroups" :key="group.id" class="sidebar-group">
              <p class="sidebar-group-title">{{ group.label }}</p>
              <div class="sidebar-group-content">
                <template v-if="group.id === 'pagina-publica'">
                  <div v-for="s in group.items" :key="s.id" class="sidebar-public-row">
                    <button
                      class="sidebar-link sidebar-link--public"
                      :class="{ active: activeSection === s.id }"
                      @click="setActiveSection(s.id)"
                    >
                      <span class="sidebar-icon"><i :class="s.icon" aria-hidden="true"></i></span>
                      <span class="sidebar-label">{{ s.label }}</span>
                      <span v-if="isFixedPublicSection(s.id)" class="sidebar-fixed-chip">Fixo</span>
                    </button>

                    <div v-if="!isFixedPublicSection(s.id)" class="sidebar-public-actions">
                      <button
                        class="sidebar-toggle-btn"
                        type="button"
                        :disabled="!authStore.canEdit || savingPublicSectionOrder || !isPublicSectionConfigured(s.id)"
                        :title="!authStore.canEdit ? 'Disponível apenas para usuários com permissão de edição' : undefined"
                        @click="togglePublicSectionVisibility(s.id)"
                      >
                        {{ !isPublicSectionConfigured(s.id) ? 'Configurar' : (isPublicSectionEnabled(s.id) ? 'Ocultar' : 'Mostrar') }}
                      </button>

                      <button
                        class="sidebar-order-btn"
                        type="button"
                        :disabled="!authStore.canEdit || !canMovePublicSection(s.id, 'up') || savingPublicSectionOrder"
                        :title="!authStore.canEdit ? 'Disponível apenas para usuários com permissão de edição' : 'Mover para cima'"
                        @click="movePublicSection(s.id, 'up')"
                      >
                        <i class="bi bi-chevron-up" aria-hidden="true"></i>
                      </button>
                      <button
                        class="sidebar-order-btn"
                        type="button"
                        :disabled="!authStore.canEdit || !canMovePublicSection(s.id, 'down') || savingPublicSectionOrder"
                        :title="!authStore.canEdit ? 'Disponível apenas para usuários com permissão de edição' : 'Mover para baixo'"
                        @click="movePublicSection(s.id, 'down')"
                      >
                        <i class="bi bi-chevron-down" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                </template>

                <template v-else>
                  <button
                    v-for="s in group.items"
                    :key="s.id"
                    class="sidebar-link"
                    :class="{ active: activeSection === s.id }"
                    @click="setActiveSection(s.id)"
                  >
                    <span class="sidebar-icon"><i :class="s.icon" aria-hidden="true"></i></span>
                    <span class="sidebar-label">{{ s.label }}</span>
                  </button>
                </template>
              </div>
            </div>
          </nav>
        </aside>

        <main class="project-content">

      <!-- Configurações do Projeto -->
      <section v-if="activeSection === 'configuracoes' || activeSection === 'movimento-loteamento'" id="configuracoes" class="content-section">
        <div
          class="card"
          :style="{
            maxWidth: activeSection === 'movimento-loteamento' ? '1200px' : '600px',
            width: '100%'
          }"
        >
          <form @submit.prevent="saveSettings">
            <fieldset :disabled="!authStore.canEdit || isArchivedProject" style="border:0;padding:0;margin:0;min-inline-size:0;">
            <template v-if="activeSection === 'configuracoes'">
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

            <div class="form-group" style="margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--glass-border-subtle);">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px;">
                <div>
                  <label class="form-label" style="margin: 0;">Logo do Projeto (Open Graph)</label>
                  <p style="margin: 4px 0 0; color: var(--color-surface-500); font-size: 0.75rem;">
                    Este logo é exclusivo para compartilhamento (Open Graph). Nao afeta os logos de rodape.
                  </p>
                </div>

                <label v-if="authStore.canEdit" class="btn btn-primary btn-sm" style="cursor: pointer;">
                  {{ uploadingOgLogo ? 'Enviando...' : '+ Enviar Logo' }}
                  <input
                    type="file"
                    accept="image/*"
                    style="display:none"
                    @change="uploadProjectOgLogo"
                    :disabled="uploadingOgLogo"
                  />
                </label>
              </div>

              <div v-if="projectOgLogoUrl" style="display: flex; flex-wrap: wrap; gap: 10px;">
                <div
                  style="position: relative; width: 120px; height: 78px; border-radius: 8px; border: 1px solid var(--glass-border-subtle); background: var(--glass-bg-heavy); overflow: hidden; display: flex; align-items: center; justify-content: center;"
                >
                  <img :src="projectOgLogoUrl" :alt="project?.name || 'Logo Open Graph'" style="max-width: 100%; max-height: 100%; object-fit: contain; padding: 8px;" />
                  <span class="badge badge-success" style="position: absolute; left: 6px; bottom: 6px; font-size: 0.6rem;">Logo OG</span>
                  <button
                    v-if="authStore.canEdit"
                    type="button"
                    class="pub-remove-btn"
                    style="position: absolute; top: 6px; right: 6px;"
                    :disabled="removingOgLogo"
                    @click="removeProjectOgLogo"
                  >
                    {{ removingOgLogo ? '...' : '✕' }}
                  </button>
                </div>
              </div>

              <div v-else class="pub-empty" style="margin-top: 6px;">
                Nenhum logo enviado ainda.
              </div>
            </div>
            </template>

            <div v-if="activeSection === 'movimento-loteamento'" class="form-group">
              <label class="form-label" style="display:flex; align-items:center; gap:8px; margin-bottom: 10px;">
                <span><i class="bi bi-broadcast-pin" aria-hidden="true"></i></span>
                <span>Movimento do Loteamento (efeito stand de vendas)</span>
              </label>

              <label class="flex items-center" style="gap: 8px; margin-bottom: 12px; cursor:pointer;">
                <input v-model="salesMotionMasterEnabled" type="checkbox" style="width: 16px; height: 16px;" />
                <span style="font-size: 0.86rem; font-weight: 700;">Ativar movimento do loteamento</span>
              </label>

              <p class="text-muted" style="font-size: 0.78rem; margin-bottom: 12px;">
                {{ salesMotionMasterEnabled ? 'Ativo: mensagens de movimento podem aparecer no empreendimento e na página de lote.' : 'Desativado: nenhuma mensagem de movimento será exibida nas páginas públicas.' }}
              </p>

              <div :style="{ opacity: salesMotionMasterEnabled ? 1 : 0.55, pointerEvents: salesMotionMasterEnabled ? 'auto' : 'none' }">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 12px; align-items: start;">

              <div class="form-group" style="margin-bottom: 14px; padding: 12px; border: 1px solid var(--glass-border-subtle); border-radius: 10px;">
                <label class="form-label" style="display:flex; align-items:center; gap:8px; margin-bottom: 10px;">
                  <span><i class="bi bi-building" aria-hidden="true"></i></span>
                  <span>Mensagens da página do empreendimento</span>
                </label>

                <label class="flex items-center" style="gap: 8px; margin-bottom: 10px; cursor:pointer;">
                  <input v-model="editForm.salesMotionConfig.enterprise.enabled" type="checkbox" style="width: 16px; height: 16px;" />
                  <span style="font-size: 0.85rem; font-weight: 600;">Ativar avisos no empreendimento</span>
                </label>

                <div v-if="!editForm.salesMotionConfig.enterprise.showOnce" class="grid grid-cols-2 gap-3" style="margin-bottom: 10px;">
                  <div>
                    <label class="form-label">Intervalo mínimo (s)</label>
                    <input v-model.number="editForm.salesMotionConfig.enterprise.intervalSeconds" type="number" min="5" max="120" class="form-input" />
                  </div>
                  <div>
                    <label class="form-label">Máx. avisos/sessão</label>
                    <input v-model.number="editForm.salesMotionConfig.enterprise.maxNotices" type="number" min="1" max="20" class="form-input" />
                  </div>
                </div>

                <label class="flex items-center" style="gap: 8px; margin-bottom: 10px; cursor:pointer;">
                  <input v-model="editForm.salesMotionConfig.enterprise.showOnce" type="checkbox" style="width: 15px; height: 15px;" />
                  <span style="font-size: 0.8rem; font-weight: 600;">Exibição única por página</span>
                </label>

                <div class="form-group" style="margin-bottom: 8px;">
                  <div class="flex justify-between items-center" style="margin-bottom: 8px;">
                    <label class="form-label" style="margin-bottom: 0;">Textos configurados</label>
                    <button type="button" class="btn btn-ghost btn-sm" @click="addSalesMotionTemplate('enterprise')">+ Adicionar texto</button>
                  </div>

                  <div v-if="!editForm.salesMotionConfig.enterprise.templates.length" class="text-muted" style="font-size: 0.8rem; padding: 10px 12px; border: 1px dashed var(--glass-border-subtle); border-radius: 8px;">
                    Nenhum texto cadastrado. Adicione um texto para começar.
                  </div>

                  <div
                    v-for="(tpl, idx) in editForm.salesMotionConfig.enterprise.templates"
                    :key="tpl.id || idx"
                    style="margin-bottom: 8px; padding: 10px; border: 1px solid var(--glass-border-subtle); border-radius: 8px;"
                  >
                    <div class="flex justify-between items-center" style="margin-bottom: 6px;">
                      <label class="flex items-center" style="gap: 8px; margin: 0; cursor: pointer; font-size: 0.8rem; font-weight: 600;">
                        <input v-model="tpl.enabled" type="checkbox" style="width: 14px; height: 14px;" />
                        <span>{{ tpl.enabled ? 'Exibir este texto' : 'Oculto' }}</span>
                      </label>
                      <button type="button" class="btn btn-danger btn-sm" @click="removeSalesMotionTemplate('enterprise', Number(idx))">Remover</button>
                    </div>
                    <textarea
                      v-model="tpl.text"
                      @input="ensureSalesMotionTemplateRanges(tpl)"
                      class="form-textarea"
                      rows="2"
                      placeholder="Ex: {{viewsToday}} pessoas visualizaram este empreendimento hoje"
                    ></textarea>
                    <div v-if="salesMotionTemplateTokenList(tpl).length > 0" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--glass-border-subtle);">
                      <label class="flex items-center" style="gap: 8px; margin: 0 0 6px; cursor: pointer; font-size: 0.78rem; font-weight: 600;">
                        <input v-model="tpl.manualRangeEnabled" type="checkbox" style="width: 14px; height: 14px;" />
                        <span>Usar faixa manual</span>
                      </label>
                      <p class="text-muted" style="margin: 0 0 6px; font-size: 0.72rem;">
                        {{ tpl.manualRangeEnabled ? 'Manual ativo: o sistema usará os valores entre mínimo e máximo.' : 'Manual inativo: o sistema usa contagem automática (real/estimada pelos dados atuais).' }}
                      </p>
                    </div>
                    <div v-if="tpl.manualRangeEnabled && salesMotionTemplateTokenList(tpl).length > 0" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--glass-border-subtle);">
                      <p class="text-muted" style="margin: 0 0 6px; font-size: 0.72rem;">Faixa dos números dinâmicos deste texto</p>
                      <div class="grid grid-cols-3 gap-2">
                        <div v-for="token in salesMotionTemplateTokenList(tpl)" :key="`enterprise-${tpl.id || idx}-${token}`">
                          <label class="form-label" style="font-size: 0.7rem; margin-bottom: 4px;">{{ salesMotionTokenLabel(token) }}</label>
                          <div style="display:flex; gap: 6px;">
                            <input
                              class="form-input"
                              type="number"
                              :min="0"
                              :value="salesMotionTemplateRangeValue(tpl, token, 'min')"
                              @input="setSalesMotionTemplateRangeValue(tpl, token, 'min', ($event.target as HTMLInputElement).value)"
                              placeholder="mín"
                              style="height: 32px; font-size: 0.78rem;"
                            />
                            <input
                              class="form-input"
                              type="number"
                              :min="0"
                              :value="salesMotionTemplateRangeValue(tpl, token, 'max')"
                              @input="setSalesMotionTemplateRangeValue(tpl, token, 'max', ($event.target as HTMLInputElement).value)"
                              placeholder="máx"
                              style="height: 32px; font-size: 0.78rem;"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="text-muted" style="display:flex; flex-wrap:wrap; gap:8px; margin-top: 8px; font-size: 0.78rem;">
                  <span style="opacity: 0.9;">Placeholders:</span>
                  <CommonAppTooltip text="Quantidade estimada de pessoas que visualizaram hoje (valor dinâmico e suavizado)." position="top">
                    <span v-pre style="cursor: help; padding: 2px 8px; border: 1px dashed var(--glass-border-subtle); border-radius: 999px;">&#123;&#123;viewsToday&#125;&#125;</span>
                  </CommonAppTooltip>
                  <CommonAppTooltip text="Código/nome de lote ou unidade usado para simular uma reserva recente." position="top">
                    <span v-pre style="cursor: help; padding: 2px 8px; border: 1px dashed var(--glass-border-subtle); border-radius: 999px;">&#123;&#123;recentLot&#125;&#125;</span>
                  </CommonAppTooltip>
                  <CommonAppTooltip text="Volume estimado de visitas nas últimas 24h para o empreendimento." position="top">
                    <span v-pre style="cursor: help; padding: 2px 8px; border: 1px dashed var(--glass-border-subtle); border-radius: 999px;">&#123;&#123;visits24h&#125;&#125;</span>
                  </CommonAppTooltip>
                  <CommonAppTooltip text="Quantidade estimada de usuários navegando agora." position="top">
                    <span v-pre style="cursor: help; padding: 2px 8px; border: 1px dashed var(--glass-border-subtle); border-radius: 999px;">&#123;&#123;visitsNow&#125;&#125;</span>
                  </CommonAppTooltip>
                  <CommonAppTooltip text="Nome da seção atual de navegação (ex.: planta, lotes, contato)." position="top">
                    <span v-pre style="cursor: help; padding: 2px 8px; border: 1px dashed var(--glass-border-subtle); border-radius: 999px;">&#123;&#123;sectionLabel&#125;&#125;</span>
                  </CommonAppTooltip>
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 0; padding: 12px; border: 1px solid var(--glass-border-subtle); border-radius: 10px;">
                <label class="form-label" style="display:flex; align-items:center; gap:8px; margin-bottom: 10px;">
                  <span><i class="bi bi-pin-map" aria-hidden="true"></i></span>
                  <span>Mensagens da página do lote</span>
                </label>

                <label class="flex items-center" style="gap: 8px; margin-bottom: 10px; cursor:pointer;">
                  <input v-model="editForm.salesMotionConfig.lot.enabled" type="checkbox" style="width: 16px; height: 16px;" />
                  <span style="font-size: 0.85rem; font-weight: 600;">Ativar avisos na página de lote</span>
                </label>

                <div v-if="!editForm.salesMotionConfig.lot.showOnce" class="grid grid-cols-2 gap-3" style="margin-bottom: 10px;">
                  <div>
                    <label class="form-label">Intervalo mínimo (s)</label>
                    <input v-model.number="editForm.salesMotionConfig.lot.intervalSeconds" type="number" min="5" max="120" class="form-input" />
                  </div>
                  <div>
                    <label class="form-label">Máx. avisos/sessão</label>
                    <input v-model.number="editForm.salesMotionConfig.lot.maxNotices" type="number" min="1" max="20" class="form-input" />
                  </div>
                </div>

                <label class="flex items-center" style="gap: 8px; margin-bottom: 10px; cursor:pointer;">
                  <input v-model="editForm.salesMotionConfig.lot.showOnce" type="checkbox" style="width: 15px; height: 15px;" />
                  <span style="font-size: 0.8rem; font-weight: 600;">Exibição única por página</span>
                </label>

                <div class="form-group" style="margin-bottom: 8px;">
                  <div class="flex justify-between items-center" style="margin-bottom: 8px;">
                    <label class="form-label" style="margin-bottom: 0;">Textos configurados</label>
                    <button type="button" class="btn btn-ghost btn-sm" @click="addSalesMotionTemplate('lot')">+ Adicionar texto</button>
                  </div>

                  <div v-if="!editForm.salesMotionConfig.lot.templates.length" class="text-muted" style="font-size: 0.8rem; padding: 10px 12px; border: 1px dashed var(--glass-border-subtle); border-radius: 8px;">
                    Nenhum texto cadastrado. Adicione um texto para começar.
                  </div>

                  <div
                    v-for="(tpl, idx) in editForm.salesMotionConfig.lot.templates"
                    :key="tpl.id || idx"
                    style="margin-bottom: 8px; padding: 10px; border: 1px solid var(--glass-border-subtle); border-radius: 8px;"
                  >
                    <div class="flex justify-between items-center" style="margin-bottom: 6px;">
                      <label class="flex items-center" style="gap: 8px; margin: 0; cursor: pointer; font-size: 0.8rem; font-weight: 600;">
                        <input v-model="tpl.enabled" type="checkbox" style="width: 14px; height: 14px;" />
                        <span>{{ tpl.enabled ? 'Exibir este texto' : 'Oculto' }}</span>
                      </label>
                      <button type="button" class="btn btn-danger btn-sm" @click="removeSalesMotionTemplate('lot', Number(idx))">Remover</button>
                    </div>
                    <textarea
                      v-model="tpl.text"
                      @input="ensureSalesMotionTemplateRanges(tpl)"
                      class="form-textarea"
                      rows="2"
                      placeholder="Ex: {{viewsToday}} pessoas visualizaram este lote hoje"
                    ></textarea>
                    <div v-if="salesMotionTemplateTokenList(tpl).length > 0" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--glass-border-subtle);">
                      <label class="flex items-center" style="gap: 8px; margin: 0 0 6px; cursor: pointer; font-size: 0.78rem; font-weight: 600;">
                        <input v-model="tpl.manualRangeEnabled" type="checkbox" style="width: 14px; height: 14px;" />
                        <span>Usar faixa manual</span>
                      </label>
                      <p class="text-muted" style="margin: 0 0 6px; font-size: 0.72rem;">
                        {{ tpl.manualRangeEnabled ? 'Manual ativo: o sistema usará os valores entre mínimo e máximo.' : 'Manual inativo: o sistema usa contagem automática (real/estimada pelos dados atuais).' }}
                      </p>
                    </div>
                    <div v-if="tpl.manualRangeEnabled && salesMotionTemplateTokenList(tpl).length > 0" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--glass-border-subtle);">
                      <p class="text-muted" style="margin: 0 0 6px; font-size: 0.72rem;">Faixa dos números dinâmicos deste texto</p>
                      <div class="grid grid-cols-3 gap-2">
                        <div v-for="token in salesMotionTemplateTokenList(tpl)" :key="`lot-${tpl.id || idx}-${token}`">
                          <label class="form-label" style="font-size: 0.7rem; margin-bottom: 4px;">{{ salesMotionTokenLabel(token) }}</label>
                          <div style="display:flex; gap: 6px;">
                            <input
                              class="form-input"
                              type="number"
                              :min="0"
                              :value="salesMotionTemplateRangeValue(tpl, token, 'min')"
                              @input="setSalesMotionTemplateRangeValue(tpl, token, 'min', ($event.target as HTMLInputElement).value)"
                              placeholder="mín"
                              style="height: 32px; font-size: 0.78rem;"
                            />
                            <input
                              class="form-input"
                              type="number"
                              :min="0"
                              :value="salesMotionTemplateRangeValue(tpl, token, 'max')"
                              @input="setSalesMotionTemplateRangeValue(tpl, token, 'max', ($event.target as HTMLInputElement).value)"
                              placeholder="máx"
                              style="height: 32px; font-size: 0.78rem;"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="text-muted" style="display:flex; flex-wrap:wrap; gap:8px; margin-top: 8px; font-size: 0.78rem;">
                  <span style="opacity: 0.9;">Placeholders:</span>
                  <CommonAppTooltip text="Quantidade estimada de visualizações do lote no dia." position="top">
                    <span v-pre style="cursor: help; padding: 2px 8px; border: 1px dashed var(--glass-border-subtle); border-radius: 999px;">{{viewsToday}}</span>
                  </CommonAppTooltip>
                  <CommonAppTooltip text="Código/nome de lote usado para mensagem de reserva recente." position="top">
                    <span v-pre style="cursor: help; padding: 2px 8px; border: 1px dashed var(--glass-border-subtle); border-radius: 999px;">{{recentLot}}</span>
                  </CommonAppTooltip>
                  <CommonAppTooltip text="Volume estimado de visitas do loteamento nas últimas 24h." position="top">
                    <span v-pre style="cursor: help; padding: 2px 8px; border: 1px dashed var(--glass-border-subtle); border-radius: 999px;">{{visits24h}}</span>
                  </CommonAppTooltip>
                  <CommonAppTooltip text="Quantidade estimada de usuários navegando na página neste momento." position="top">
                    <span v-pre style="cursor: help; padding: 2px 8px; border: 1px dashed var(--glass-border-subtle); border-radius: 999px;">{{visitsNow}}</span>
                  </CommonAppTooltip>
                  <CommonAppTooltip text="Seção atual da página de lote (ex.: galeria, ficha técnica, simulador)." position="top">
                    <span v-pre style="cursor: help; padding: 2px 8px; border: 1px dashed var(--glass-border-subtle); border-radius: 999px;">{{sectionLabel}}</span>
                  </CommonAppTooltip>
                </div>
              </div>
              </div>
              </div>
            </div>
            <div v-if="settingsError" class="alert alert-error">{{ settingsError }}</div>
            <div v-if="settingsSaved" class="alert alert-success">Salvo com sucesso!</div>
            <button type="submit" class="btn btn-primary" :disabled="!authStore.canEdit || savingSettings || editSlugTaken" :title="!authStore.canEdit ? 'Disponível apenas para usuários com permissão de edição' : undefined">{{ savingSettings ? 'Salvando...' : 'Salvar' }}</button>
            </fieldset>
          </form>
        </div>
      </section>

      <!-- Pré-lançamento -->
      <section v-if="activeSection === 'pre-lancamento'" id="pre-lancamento" class="content-section">
        <div class="card" style="max-width: 800px;">
          <fieldset :disabled="!authStore.canEdit || isArchivedProject" style="border:0;padding:0;margin:0;min-inline-size:0;">
            <h3 style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span><i class="bi bi-stars" aria-hidden="true"></i></span> Pré-lançamento
            </h3>
            <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 24px;">
              Centralize aqui a operação de pré-lançamento do projeto, definindo se o site público capta interessados em fila ou já permite reserva direta nos lotes disponíveis.
            </p>

            <div class="form-group" style="display:flex; align-items:flex-start; gap: 12px; margin-bottom: 20px; background: rgba(59, 130, 246, 0.08); padding: 16px; border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.18);">
              <input type="checkbox" v-model="editForm.preLaunchEnabled" id="chkPreLaunchEnabled" style="width:20px; height:20px; cursor:pointer; margin-top: 2px;" />
              <div>
                <label for="chkPreLaunchEnabled" style="font-weight: 700; cursor:pointer; color: var(--color-surface-100); display: block; margin-bottom: 6px;">Ativar modo de pré-lançamento</label>
                <p class="text-muted" style="margin: 0; font-size: 0.8rem; line-height: 1.5;">
                  Quando ativo, o site público passa a operar com comunicação de exclusividade. Você pode escolher entre fila de preferência ou reserva direta para lotes disponíveis.
                </p>
              </div>
            </div>

            <div v-if="editForm.preLaunchEnabled" class="grid grid-cols-2 gap-6" style="margin-bottom: 20px;">
              <div class="form-group">
                <label class="form-label">Captura no pré-lançamento</label>
                <select v-model="editForm.preLaunchCaptureMode" class="form-input">
                  <option value="QUEUE">Fila de preferência</option>
                  <option value="RESERVATION">Reserva direta em lotes disponíveis</option>
                </select>
                <small class="text-muted">
                  Em reserva direta, lotes disponíveis seguem para pagamento/reserva e lotes já reservados abrem fila de preferência.
                </small>
              </div>
            </div>

            <div v-if="editForm.preLaunchEnabled" style="padding: 12px 16px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.18); border-radius: 10px; margin-bottom: 20px; font-size: 0.8rem; display: flex; align-items: flex-start; gap: 8px;">
              <span><i class="bi bi-stars" aria-hidden="true"></i></span>
              <span style="color: #047857;">
                {{ editForm.preLaunchCaptureMode === 'RESERVATION'
                  ? 'A comunicação pública passa a vender acesso antecipado. Lotes disponíveis podem ser reservados diretamente e lotes já reservados direcionam o cliente para a fila.'
                  : 'A reserva online e o pagamento ficam pausados no site público enquanto o pré-lançamento estiver ativo. As configurações comerciais são preservadas e voltam a valer ao desativar este modo.' }}
              </span>
            </div>

            <div v-if="editForm.preLaunchEnabled && editForm.preLaunchCaptureMode === 'RESERVATION' && activeConfigs.length === 0 && allConfigs.length > 0" style="padding: 12px 16px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.15); border-radius: 10px; margin-bottom: 20px; font-size: 0.8rem; display: flex; align-items: center; gap: 8px;">
              <span><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i></span>
              <span style="color: #d97706;">Nenhum gateway de pagamento habilitado para este projeto. Ative um em Pagamentos e Taxas para que a reserva direta funcione durante o pré-lançamento.</span>
            </div>

            <div style="background: var(--glass-bg-heavy); padding: 16px; border-radius: 8px; border: 1px solid var(--glass-border-subtle);">
              <h4 style="margin: 0 0 8px 0; font-size: 0.9rem; color: var(--color-surface-200);">Impacto operacional</h4>
              <p style="font-size: 0.8rem; margin: 0; color: var(--color-surface-200); line-height: 1.6;">
                Em modo fila, o checkout público fica suspenso e os interessados entram em lista de prioridade. Em modo reserva direta, a cobrança online continua disponível para lotes livres e os reservados passam a captar fila automaticamente.
              </p>
            </div>

            <div class="flex justify-end" style="margin-top: 20px;">
              <button class="btn btn-primary" @click="saveSettings" :disabled="!authStore.canEdit || savingSettings" :title="!authStore.canEdit ? 'Disponível apenas para usuários com permissão de edição' : undefined" style="min-width: 220px;">
                <span v-if="savingSettings">Salvando...</span>
                <span v-else style="display: inline-flex; align-items: center; gap: 6px;">
                  <i class="bi bi-floppy-fill" aria-hidden="true"></i>
                  <span>Salvar Pré-lançamento</span>
                </span>
              </button>
            </div>
          </fieldset>
        </div>
      </section>

      <!-- Pagamentos & Taxas -->
      <section v-if="activeSection === 'pagamentos'" id="pagamentos" class="content-section">
        <div class="card" style="max-width: 800px;">
          <fieldset :disabled="!authStore.canEdit || isArchivedProject" style="border:0;padding:0;margin:0;min-inline-size:0;">
          <h3><i class="bi bi-credit-card-2-front-fill" aria-hidden="true"></i> Ativar Gateways de Pagamento</h3>
          <p class="text-muted">Selecione abaixo quais perfis de pagamento globais você deseja habilitar para este projeto.</p>
          
          <div v-if="loadingPaymentOptions" class="flex justify-center p-8">
             <div class="loader"></div>
          </div>

          <div v-else-if="allConfigs.length === 0" class="empty-state" style="padding: 24px;">
            <div class="icon-blob mx-auto mb-4"><i class="bi bi-credit-card-2-front-fill" aria-hidden="true"></i></div>
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
              <span><i class="bi bi-ticket-perforated-fill" aria-hidden="true"></i></span> Taxa de Reserva Online
            </h3>
            <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 24px;">Configure o valor que o cliente deve pagar para reservar um lote online via cartão ou PIX.</p>

            <div v-if="editForm.preLaunchEnabled && editForm.preLaunchCaptureMode !== 'RESERVATION'" style="padding: 12px 16px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.18); border-radius: 10px; margin-bottom: 20px; font-size: 0.8rem; display: flex; align-items: center; gap: 8px;">
              <span><i class="bi bi-lock-fill" aria-hidden="true"></i></span>
              <span style="color: #60a5fa;">Os valores de reserva ficam preservados enquanto o pré-lançamento estiver em modo fila. Para editar essa operação, acesse a aba Pré-lançamento.</span>
            </div>

            <!-- Guard: no gateways active -->
            <div v-if="(!editForm.preLaunchEnabled || editForm.preLaunchCaptureMode === 'RESERVATION') && activeConfigs.length === 0 && allConfigs.length > 0" style="padding: 12px 16px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.15); border-radius: 10px; margin-bottom: 20px; font-size: 0.8rem; display: flex; align-items: center; gap: 8px;">
              <span><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i></span>
              <span style="color: #d97706;">Nenhum gateway de pagamento habilitado para este projeto. Ative um acima para que a reserva online funcione, inclusive no pré-lançamento com reserva direta.</span>
            </div>
            
            <div class="grid grid-cols-2 gap-6">
              <div class="form-group">
                <label class="form-label">Tipo de Cobrança</label>
                <select v-model="editForm.reservationFeeType" class="form-input" :disabled="editForm.preLaunchEnabled && editForm.preLaunchCaptureMode !== 'RESERVATION'">
                  <option value="FIXED">Valor Fixo (R$)</option>
                  <option value="PERCENTAGE">Porcentagem do Valor do Lote (%)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">
                  {{ editForm.reservationFeeType === 'FIXED' ? 'Valor da Reserva (R$)' : 'Porcentagem da Reserva (%)' }}
                </label>
                <input v-model.number="editForm.reservationFeeValue" type="number" step="0.01" class="form-input" :disabled="editForm.preLaunchEnabled && editForm.preLaunchCaptureMode !== 'RESERVATION'"
                       :placeholder="editForm.reservationFeeType === 'FIXED' ? 'Ex: 500.00' : 'Ex: 0.5'" />
                <small v-if="editForm.reservationFeeType === 'PERCENTAGE'" style="color: var(--color-surface-400); font-size: 0.75rem;">
                  Ex: 0.5 = 0,5% do valor total do lote.
                </small>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-6" style="margin-top: 16px;">
              <div class="form-group">
                <label class="form-label">Tempo de Expiração da Reserva (Horas)</label>
                <input v-model.number="editForm.reservationExpiryHours" type="number" class="form-input" :disabled="editForm.preLaunchEnabled && editForm.preLaunchCaptureMode !== 'RESERVATION'" placeholder="Ex: 24" />
                <small class="text-muted">Tempo que o lote ficará reservado aguardando confirmação (manual ou pagamento). Padrão: 24h.</small>
              </div>
            </div>
            
            <div class="flex justify-end" style="margin-top: 20px;">
              <button class="btn btn-primary" @click="saveSettings" :disabled="!authStore.canEdit || savingSettings" :title="!authStore.canEdit ? 'Disponível apenas para usuários com permissão de edição' : undefined" style="min-width: 200px;">
                <span v-if="savingSettings">Salvando...</span>
                <span v-else style="display: inline-flex; align-items: center; gap: 6px;">
                  <i class="bi bi-floppy-fill" aria-hidden="true"></i>
                  <span>Salvar Configuração Comercial</span>
                </span>
              </button>
            </div>
          </div>
          </fieldset>
        </div>
      </section>

      <!-- Assistente IA -->
      <section v-if="activeSection === 'assistente-ia'" id="assistente-ia" class="content-section">
        <div class="card" style="max-width: 600px;">
          <fieldset :disabled="!authStore.canEdit || isArchivedProject" style="border:0;padding:0;margin:0;min-inline-size:0;">
          <h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span><i class="bi bi-robot" aria-hidden="true"></i></span> Assistente de IA
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
              <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i> Você ainda não tem nenhuma configuração de IA cadastrada. <NuxtLink to="/painel/ai" style="color: #ef4444; font-weight: 700;">Clique aqui para criar</NuxtLink>.
            </div>

            <div v-else style="background: rgba(59, 130, 246, 0.08); color: #60a5fa; padding: 12px; border-radius: 8px; font-size: 0.85rem; margin-top: 12px; border: 1px solid rgba(59, 130, 246, 0.3);">
              ℹ️ A configuração da página Assistente IA será usada automaticamente neste projeto.
            </div>
          </div>

          <div class="flex justify-end" style="margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--glass-border-subtle);">
            <button class="btn btn-primary" @click="saveSettings" :disabled="!authStore.canEdit || savingSettings" :title="!authStore.canEdit ? 'Disponível apenas para usuários com permissão de edição' : undefined">
              <span v-if="savingSettings">Salvando...</span>
              <span v-else style="display: inline-flex; align-items: center; gap: 6px;">
                <i class="bi bi-floppy-fill" aria-hidden="true"></i>
                <span>Salvar Configurações de IA</span>
              </span>
            </button>
          </div>
          </fieldset>
        </div>
      </section>

      <!-- Agendamento de Visitas -->
      <section v-if="activeSection === 'pub-scheduling'" id="agendamento" class="content-section">
        <div class="card" style="max-width: 900px;">
          <fieldset :disabled="!authStore.canEdit || isArchivedProject" style="border:0;padding:0;margin:0;min-inline-size:0;">
          <div class="flex justify-between items-center" style="margin-bottom: 24px;">
            <div>
              <h3 style="margin:0; display: flex; align-items: center; gap: 8px;">
                <span><i class="bi bi-calendar-event-fill" aria-hidden="true"></i></span> Configurações de Agendamento de Visitas
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
                  <h5 style="margin-bottom: 12px; font-weight: 600;"><i class="bi bi-fork-knife" aria-hidden="true"></i> Intervalo de Almoço</h5>
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
                    <h5 style="margin:0; font-weight: 600;"><i class="bi bi-cup-hot-fill" aria-hidden="true"></i> Outras Pausas Curtas</h5>
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
                    <button @click="removeBreak(idx)" class="btn btn-xs btn-ghost btn-danger" style="padding: 0 4px;"><i class="bi bi-x" aria-hidden="true"></i></button>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end pt-8" style="border-top: 1px solid var(--glass-border-subtle); margin-top: 32px;">
              <!-- Guard: enabled but no days selected -->
              <div v-if="schedulingForm.enabled && schedulingForm.availableDays.length === 0" style="padding: 10px 14px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.15); border-radius: 8px; margin-right: auto; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
                <span><i class="bi bi-x-circle-fill" aria-hidden="true"></i></span>
                <span style="color: #f87171;">Selecione ao menos um dia da semana para habilitar o agendamento.</span>
              </div>
              <button class="btn btn-primary" @click="saveSchedulingSettings" :disabled="!authStore.canEdit || savingScheduling || (schedulingForm.enabled && schedulingForm.availableDays.length === 0)" :title="!authStore.canEdit ? 'Disponível apenas para usuários com permissão de edição' : undefined" style="min-width: 200px; height: 48px; border-radius: 12px;">
                <span v-if="savingScheduling">Salvando...</span>
                <span v-else style="display: inline-flex; align-items: center; gap: 6px;">
                  <i class="bi bi-floppy-fill" aria-hidden="true"></i>
                  <span>Salvar Configuração de Agenda</span>
                </span>
              </button>
            </div>
          </template>
          </fieldset>
        </div>
      </section>

      <!-- Simulação Financeira -->
      <section v-if="activeSection === 'financeiro'" id="financeiro" class="content-section">
      <fieldset :disabled="!authStore.canEdit || isArchivedProject" style="border:0;padding:0;margin:0;min-inline-size:0;">
      <div class="financing-layout-v4">
        <div class="card" style="flex: 1; max-width: 800px;">
          <h3 style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            <span><i class="bi bi-calculator-fill" aria-hidden="true"></i></span> Regras de Simulação Financeira
          </h3>
          <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 24px;">Configure as regras padrão para o simulador que aparece na página dos lotes.</p>

          <div class="form-group" style="display:flex; align-items:center; gap: 8px; margin-bottom: 32px; background: rgba(245, 158, 11, 0.1); padding: 16px; border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.3);">
            <input type="checkbox" v-model="editForm.showPaymentConditions" id="chkShowSimOnFinancing" style="width:20px; height:20px; cursor:pointer;" />
            <label for="chkShowSimOnFinancing" style="font-weight: 700; cursor:pointer; color: #fbbf24;"><i class="bi bi-check-circle-fill" aria-hidden="true"></i> Habilitar Simulador nas Páginas Públicas</label>
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
              <span v-if="savingSettings">Salvando...</span>
              <span v-else style="display: inline-flex; align-items: center; gap: 6px;">
                <i class="bi bi-floppy-fill" aria-hidden="true"></i>
                <span>Salvar Regras Financeiras</span>
              </span>
            </button>
          </div>
        </div>

        <!-- LIVE PREVIEW SIDEBAR -->
        <div class="financing-preview-sidebar">
          <div class="preview-header">
            <h4><i class="bi bi-eye-fill" aria-hidden="true"></i> Preview em Tempo Real</h4>
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
                <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i> {{ editForm?.financingDisclaimer || 'Simulação baseada nas regras vigentes. Sujeito à aprovação de crédito e alteração de taxas.' }}
              </div>
            </div>
          </div>
        </div>
      </div>
      </fieldset>
      </section>

      <!-- Lotes -->
      <section v-if="activeSection === 'lotes'" id="lotes" class="content-section">
        <div v-if="lots.length === 0" class="empty-state-container d-flex align-items-center justify-content-center py-5">
          <div class="card text-center p-5 rounded-5 max-w-500" style="backdrop-filter: blur(var(--glass-blur));">
            <div class="icon-blob mx-auto mb-4"><i class="bi bi-map" aria-hidden="true"></i></div>
            <h3 class="fw-bold mb-3">Nenhum elemento criado na planta</h3>
            <p class="mb-4 px-4">Adicione pontos (hotspots) na Planta Interativa para que apareçam aqui para edição detalhada.</p>
            <NuxtLink :to="`/painel/projetos/${projectId}/planta`" class="btn btn-primary btn-lg rounded-pill px-5">Ir para a Planta</NuxtLink>
          </div>
        </div>
        <div v-else class="table-wrapper">
          <div class="lot-import-card">
            <div class="lot-import-card__head">
              <div>
                <h4>Importacao de Lotes (CSV ou Excel)</h4>
                <p>Envie CSV, XLSX ou XLS. Se for Excel, convertemos automaticamente para CSV antes do envio.</p>
              </div>
              <div class="lot-import-card__actions" v-if="authStore.canEdit">
                <button class="btn btn-sm btn-outline" @click="downloadLotCsvTemplate">Baixar modelo</button>
                <button class="btn btn-sm btn-primary" :disabled="!authStore.canEdit || uploadingLotCsv || !!activeLotImportRunning" :title="!authStore.canEdit ? 'Disponível apenas para usuários com permissão de edição' : undefined" @click="openLotCsvPicker">
                  {{ uploadingLotCsv ? 'Enviando...' : 'Importar Arquivo' }}
                </button>
                <input ref="lotCsvInputRef" type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display: none" @change="handleLotCsvSelected" />
              </div>
            </div>

            <div class="lot-import-help">
              <p><strong>Formato recomendado:</strong> use o modelo e mantenha os nomes das colunas em português.</p>
              <p><strong>Valores aceitos:</strong> status = DISPONIVEL, RESERVADO ou VENDIDO | topografia = PLANO, ACLIVE ou DECLIVE.</p>
              <p><strong>Campos obrigatórios:</strong> apenas <code>codigo</code>. Campos como <code>tags</code> e <code>observações</code> são opcionais.</p>
              <p><strong>Observação:</strong> a coluna <code>codigo</code> precisa bater com o codigo do lote criado na Planta Interativa e nao pode ter acentuação.</p>
            </div>

            <div v-if="activeLotImport" class="lot-import-status">
              <div class="lot-import-status__row">
                <span>
                  <strong>Status:</strong>
                  {{ lotImportStatusLabel(activeLotImport.status) }}
                </span>
                <span>
                  <strong>Arquivo:</strong>
                  {{ activeLotImport.fileName }}
                </span>
              </div>
              <div class="lot-import-status__row">
                <span><strong>Total:</strong> {{ activeLotImport.totalRows || 0 }}</span>
                <span><strong>Sucesso:</strong> {{ activeLotImport.successRows || 0 }}</span>
                <span><strong>Erros:</strong> {{ activeLotImport.errorRows || 0 }}</span>
                <span><strong>Processadas:</strong> {{ activeLotImport.processedRows || 0 }}</span>
              </div>
              <div class="progress-bar" style="margin-top: 8px;">
                <div class="progress-bar-fill" :style="{ width: `${lotImportProgress}%` }"></div>
              </div>
              <p v-if="activeLotImport.message" class="lot-import-status__message">{{ activeLotImport.message }}</p>
              <div v-if="activeLotImport.errorRows > 0" style="margin-top: 10px;">
                <button class="btn btn-xs btn-outline" @click="downloadLotImportErrorsCsv">Baixar erros (CSV)</button>
              </div>
            </div>
          </div>

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
                     <button class="btn btn-sm btn-outline" @click="shareLot(l)">Compartilhar</button>
                     <button class="btn btn-sm btn-outline" @click="openLotQrModal(l)">QR Code</button>
                     <button v-if="l.status === 'RESERVED'" class="btn btn-sm btn-warning" @click="openReservationModal(l)">Abrir Reservas</button>
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
      <div v-if="viewingReservation" class="modal-overlay">
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
                <NuxtLink class="btn btn-primary btn-sm" :to="`/painel/projetos/${projectId}/pos-reserva`">
                  Ir para Reservas
                </NuxtLink>
              </div>
            </div>
            <div v-else class="text-center py-4 text-muted">Nenhum dado de reserva encontrado.</div>
          </div>
        </div>
      </div>

      <div v-if="lotQrModal" class="modal-overlay">
        <div class="modal" style="max-width: 480px;">
          <div class="modal-header" style="margin-bottom: 12px;">
            <h3>QR Code do Lote {{ lotQrModal.code }}</h3>
            <button class="modal-close" @click="lotQrModal = null">✕</button>
          </div>
          <div class="modal-body" style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
            <img :src="lotQrModal.qrCodeUrl" alt="QR Code do lote" style="width: min(320px, 85vw); border-radius: 10px; border: 1px solid var(--glass-border-subtle); background: #fff;" />
            <div style="font-size: 0.82rem; color: var(--color-surface-400); text-align: center;">
              {{ lotQrModal.shareText }}
            </div>
            <a :href="lotQrModal.publicPageUrl" target="_blank" style="font-size: 0.82rem; color: var(--color-primary-400); word-break: break-all; text-align: center;">
              {{ lotQrModal.publicPageUrl }}
            </a>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 8px;">
              <button class="btn btn-sm btn-outline" @click="copyLink(lotQrModal.publicPageUrl)">Copiar Link</button>
              <button class="btn btn-sm btn-outline" @click="downloadLotQr(lotQrModal)">Baixar QR</button>
              <button class="btn btn-sm btn-outline" @click="printLotQr(lotQrModal)">Imprimir QR</button>
              <a class="btn btn-sm btn-primary" :href="lotQrModal.publicPageUrl" target="_blank">Abrir Página</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Lot Edit Modal -->
      <div v-if="editingLot" class="modal-overlay">
        <div class="modal" style="max-width: 800px;">
          <div class="modal-header" style="margin-bottom: 16px;">
            <h3>Editar Lote: {{ editingLot.mapElement?.code || editingLot.id }}</h3>
            <button class="modal-close" @click="editingLot = null">✕</button>
          </div>
          <fieldset :disabled="!authStore.canEdit || isArchivedProject" style="border:0;padding:0;margin:0;min-inline-size:0;">
          
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
              <p style="font-size:0.7rem; color:var(--color-surface-500); margin-top:8px;">A frente do lote agora é definida no editor da planta, arrastando a seta no hotspot.</p>
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

          <hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--glass-border-subtle);" />

          <h4 style="margin-bottom: 12px;">Fotos do Lote</h4>
          <div v-if="lotMedias.length === 0" class="empty-state" style="padding: 16px; background: var(--glass-bg-heavy); border-radius: 12px;">
            <p>Nenhuma foto específica deste lote.</p>
          </div>
          <div v-else class="grid grid-cols-4" style="gap: 12px; margin-bottom: 16px;">
            <div v-for="m in lotMedias" :key="m.id" class="media-card-v4">
              <img
                :src="m.url"
                class="media-thumb-v4"
                loading="eager"
                decoding="async"
                @error="retryMediaPreviewLoad"
              />
              <button class="media-delete-btn-v4" @click="removeLotMedia(m.id)">✕</button>
            </div>
          </div>
          
          <label class="btn btn-secondary btn-sm" style="cursor:pointer; width: fit-content;">
            {{ uploadingLotMedia ? 'Enviando...' : '+ Adicionar Foto do Lote' }}
            <input type="file" accept="image/*" style="display:none" @change="uploadLotMediaFile" :disabled="uploadingLotMedia" />
          </label>

          <hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--glass-border-subtle);" />

          <h4 style="margin-bottom: 12px;"><i class="bi bi-image-fill" aria-hidden="true"></i> Panorama 360° do Lote</h4>
          <div v-if="lotForm.panoramaUrl" class="media-card-v4" style="max-width: 240px; margin-bottom: 16px;">
            <div class="relative group">
              <img
                :src="lotForm.panoramaUrl"
                class="media-thumb-v4"
                style="aspect-ratio: 2/1;"
                loading="eager"
                decoding="async"
                @error="retryMediaPreviewLoad"
              />
              <button class="media-delete-btn-v4" @click="clearLotPanoramaSelection">✕</button>
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
            <button class="btn btn-primary" style="background: var(--color-primary-600); color: #fff; border: none; font-weight: 600;" :disabled="!authStore.canEdit || savingLot" :title="!authStore.canEdit ? 'Disponível apenas para usuários com permissão de edição' : undefined" @click="saveLotDetails">
              {{ savingLot ? 'Salvando...' : 'Salvar Detalhes' }}
            </button>
          </div>
          </fieldset>
        </div>
      </div>


      <!-- Página Pública -->
      <section v-if="activeSection.startsWith('pub-')" id="pagina-publica" class="content-section pub-page">
        <fieldset :disabled="!authStore.canEdit || isArchivedProject" style="border:0;padding:0;margin:0;min-inline-size:0;">

        <!-- ── Banner & Vídeo (lado a lado) ── -->
        <div v-if="activeSection === 'pub-banner' || activeSection === 'pub-video'" class="pub-row pub-row--2col">
          <div v-if="activeSection === 'pub-banner'" class="pub-card">
            <h4 class="pub-card__title">Banner</h4>
            <p style="margin: 0 0 12px 0; color: var(--color-surface-500); font-size: 0.75rem;">
              Cada faixa de resolução usa um banner dedicado na página pública.
            </p>

            <div class="pub-banner-grid">
              <div class="pub-banner-item">
                <div class="pub-banner-item__head">
                  <strong>Desktop</strong>
                  <span>&gt; 1024px</span>
                </div>
                <div v-if="bannerUrlByDevice('desktop')" class="pub-banner-preview">
                  <img :src="bannerUrlByDevice('desktop')" alt="Banner desktop" />
                  <button v-if="authStore.canEdit" class="pub-card__overlay-btn" @click="removeBannerImage('desktop')">Remover</button>
                </div>
                <div v-else class="pub-banner-empty">Nenhum banner desktop</div>
                <label v-if="authStore.canEdit" class="pub-card__upload-btn">
                  {{ uploadingBannerDevice === 'desktop' ? 'Enviando...' : 'Enviar Desktop' }}
                  <input type="file" accept="image/*" style="display:none" @change="uploadBannerImage($event, 'desktop')" :disabled="!!uploadingBannerDevice" />
                </label>
              </div>

              <div class="pub-banner-item">
                <div class="pub-banner-item__head">
                  <strong>Tablet</strong>
                  <span>769px a 1024px</span>
                </div>
                <div v-if="bannerUrlByDevice('tablet')" class="pub-banner-preview">
                  <img :src="bannerUrlByDevice('tablet')" alt="Banner tablet" />
                  <button v-if="authStore.canEdit && project.bannerImageTabletUrl" class="pub-card__overlay-btn" @click="removeBannerImage('tablet')">Remover</button>
                </div>
                <div v-else class="pub-banner-empty">Usará banner desktop</div>
                <label v-if="authStore.canEdit" class="pub-card__upload-btn">
                  {{ uploadingBannerDevice === 'tablet' ? 'Enviando...' : 'Enviar Tablet' }}
                  <input type="file" accept="image/*" style="display:none" @change="uploadBannerImage($event, 'tablet')" :disabled="!!uploadingBannerDevice" />
                </label>
              </div>

              <div class="pub-banner-item">
                <div class="pub-banner-item__head">
                  <strong>Celular</strong>
                  <span>&lt;= 768px</span>
                </div>
                <div v-if="bannerUrlByDevice('mobile')" class="pub-banner-preview">
                  <img :src="bannerUrlByDevice('mobile')" alt="Banner mobile" />
                  <button v-if="authStore.canEdit && project.bannerImageMobileUrl" class="pub-card__overlay-btn" @click="removeBannerImage('mobile')">Remover</button>
                </div>
                <div v-else class="pub-banner-empty">Usará banner tablet/desktop</div>
                <label v-if="authStore.canEdit" class="pub-card__upload-btn">
                  {{ uploadingBannerDevice === 'mobile' ? 'Enviando...' : 'Enviar Celular' }}
                  <input type="file" accept="image/*" style="display:none" @change="uploadBannerImage($event, 'mobile')" :disabled="!!uploadingBannerDevice" />
                </label>
              </div>
            </div>
          </div>

          <div v-if="activeSection === 'pub-video'" class="pub-card">
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

        <div v-if="activeSection === 'pub-plant'" class="pub-card pub-card--compact">
          <h4 class="pub-card__title">Planta Interativa</h4>
          <p style="margin: 0 0 12px; color: var(--color-surface-400); font-size: 0.78rem;">
            A ordem desta seção na página pública pode ser alterada pelo menu lateral. O conteúdo é gerenciado no editor da planta.
          </p>
          <div style="display:flex; flex-wrap: wrap; gap: 8px;">
            <NuxtLink :to="`/painel/projetos/${projectId}/planta`" class="btn btn-primary btn-sm">
              Abrir Editor da Planta
            </NuxtLink>
          </div>
        </div>

        <div v-if="activeSection === 'pub-panorama'" class="pub-card pub-card--compact">
          <h4 class="pub-card__title">Panorama 360°</h4>
          <p style="margin: 0 0 12px; color: var(--color-surface-400); font-size: 0.78rem;">
            A posição do bloco 360° na página pública segue a ordem definida no menu. O conteúdo é gerenciado no editor de panorama.
          </p>
          <div style="display:flex; flex-wrap: wrap; gap: 8px;">
            <NuxtLink :to="`/painel/projetos/${projectId}/panorama`" class="btn btn-primary btn-sm">
              Abrir Editor de Panorama
            </NuxtLink>
          </div>
        </div>

        <!-- ── Logos de Rodapé ── -->
        <div v-if="activeSection === 'pub-logos'" class="pub-card pub-card--compact">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px;">
            <div>
              <h4 class="pub-card__title" style="margin: 0;">Logos de Rodapé</h4>
              <p style="margin: 4px 0 0 0; color: var(--color-surface-500); font-size: 0.75rem;">Realização e Propriedade exibidos neste projeto.</p>
            </div>

            <label v-if="authStore.canEdit" class="btn btn-primary btn-sm" style="cursor: pointer;">
              {{ uploadingFooterLogo ? 'Enviando...' : '+ Adicionar Logo' }}
              <input
                type="file"
                accept="image/*"
                style="display:none"
                @change="uploadFooterLogo"
                :disabled="uploadingFooterLogo"
              />
            </label>
          </div>

          <div v-if="projectFooterLogos.length" style="display: flex; flex-wrap: wrap; gap: 12px;">
            <div
              v-for="logo in projectFooterLogos"
              :key="logo.id"
              style="position: relative; width: 110px; height: 74px; border-radius: 8px; border: 1px solid var(--glass-border-subtle); background: var(--glass-bg-heavy); overflow: hidden; display: flex; align-items: center; justify-content: center;"
            >
              <img :src="logo.url" :alt="logo.label || project?.name || 'Logo'" style="max-width: 100%; max-height: 100%; object-fit: contain; padding: 8px;" />
              <button
                v-if="authStore.canEdit"
                type="button"
                class="pub-remove-btn"
                style="position: absolute; top: 6px; right: 6px;"
                :disabled="deletingFooterLogoId === logo.id"
                @click="deleteFooterLogo(logo.id)"
              >
                {{ deletingFooterLogoId === logo.id ? '...' : '✕' }}
              </button>
            </div>
          </div>

          <div v-else class="pub-empty">Nenhum logo de rodapé cadastrado para este projeto.</div>
        </div>

        <!-- ── Preços & Condições ── -->
        <div v-if="activeSection === 'pub-pricing'" class="pub-card pub-card--compact">
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

        <!-- ── Carrossel de Lotes ── -->
        <div v-if="activeSection === 'pub-lots-carousel'" class="pub-card pub-card--compact">
          <h4 class="pub-card__title">Carrossel de Lotes</h4>
          <p style="margin: 0 0 12px; color: var(--color-surface-400); font-size: 0.78rem;">
            Esta seção pública exibe um carrossel automático com lotes disponíveis. No editor de páginas ela é apenas ativável, desativável e reordenável.
          </p>

          <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px;">
            <div class="stat-chip">
              <span class="stat-chip-value">{{ lotStats.total }}</span>
              <span class="stat-chip-label">Total</span>
            </div>
            <div class="stat-chip stat-chip-success">
              <span class="stat-chip-value">{{ lotStats.available }}</span>
              <span class="stat-chip-label">Disponíveis</span>
            </div>
            <div class="stat-chip stat-chip-warning">
              <span class="stat-chip-value">{{ lotStats.reserved }}</span>
              <span class="stat-chip-label">Reservados</span>
            </div>
          </div>

          <div style="display:flex; flex-wrap: wrap; gap: 8px;">
            <button class="btn btn-primary btn-sm" @click="setActiveSection('lotes')">
              Ir para Gestão de Lotes
            </button>
            <NuxtLink :to="`/painel/projetos/${projectId}/planta`" class="btn btn-secondary btn-sm">
              Abrir Planta Interativa
            </NuxtLink>
          </div>
        </div>

        <!-- ── Lotes Disponíveis ── -->
        <div v-if="activeSection === 'pub-lots'" class="pub-card pub-card--compact">
          <h4 class="pub-card__title">Lotes Disponíveis</h4>
          <p style="margin: 0 0 12px; color: var(--color-surface-400); font-size: 0.78rem;">
            Esta seção pública é alimentada pelos lotes cadastrados e status da planta. Aqui você controla o conteúdo que aparece para o cliente.
          </p>

          <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px;">
            <div class="stat-chip">
              <span class="stat-chip-value">{{ lotStats.total }}</span>
              <span class="stat-chip-label">Total</span>
            </div>
            <div class="stat-chip stat-chip-success">
              <span class="stat-chip-value">{{ lotStats.available }}</span>
              <span class="stat-chip-label">Disponíveis</span>
            </div>
            <div class="stat-chip stat-chip-warning">
              <span class="stat-chip-value">{{ lotStats.reserved }}</span>
              <span class="stat-chip-label">Reservados</span>
            </div>
          </div>

          <div style="display:flex; flex-wrap: wrap; gap: 8px;">
            <button class="btn btn-primary btn-sm" @click="setActiveSection('lotes')">
              Ir para Gestão de Lotes
            </button>
            <NuxtLink :to="`/painel/projetos/${projectId}/planta`" class="btn btn-secondary btn-sm">
              Abrir Planta Interativa
            </NuxtLink>
          </div>
        </div>

        <!-- ── Acompanhamento de Obras ── -->
        <div v-if="activeSection === 'pub-construction'" class="pub-card">
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
        <div v-if="activeSection === 'pub-location' || activeSection === 'pub-nearby'" class="pub-row pub-row--2col">
          <div v-if="activeSection === 'pub-location'" class="pub-card">
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

          <div v-if="activeSection === 'pub-nearby'" class="pub-card">
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
                      <span style="font-size: 0.85rem;"><i :class="['bi', nearbyCategoryIcon(group.category)]" aria-hidden="true"></i></span>
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
        <div v-if="activeSection === 'pub-infra' || activeSection === 'pub-highlights'" class="pub-row pub-row--2col">
          <!-- Infraestrutura -->
          <div v-if="activeSection === 'pub-infra'" class="pub-card">
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
          <div v-if="activeSection === 'pub-highlights'" class="pub-card">
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
                <span style="color: #059669; font-size: 0.9rem;"><i :class="resolveHighlightIcon(h.icon)" aria-hidden="true"></i></span>
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
        <div v-if="activeSection === 'pub-description'" class="pub-card">
          <h4 class="pub-card__title">Texto Descritivo</h4>
          <div class="pub-sub-section" style="margin-bottom: 12px;">
            <span class="pub-sub-label">Título e subtítulo (opcionais)</span>
            <div class="form-group" style="margin-bottom: 8px;">
              <input v-model="pubInfoForm.locationTitle" class="form-input" placeholder="Ex: Sobre o empreendimento" />
            </div>
            <div class="form-group" style="margin: 0;">
              <input v-model="pubInfoForm.locationSubtitle" class="form-input" placeholder="Ex: Localização estratégica e excelente infraestrutura" />
            </div>
          </div>

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
        <div v-if="activeSection === 'pub-gallery'" class="pub-card">
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
            <div v-for="(m, i) in media" :key="m.id" class="media-card-v4" style="aspect-ratio: 1/1; width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid var(--glass-border-subtle);">
              <img
                v-if="m.type === 'PHOTO'"
                :src="m.url"
                class="media-thumb-v4"
                style="width: 100%; height: 100%; object-fit: cover; display: block;"
                :loading="i < 8 ? 'eager' : 'lazy'"
                :fetchpriority="i < 4 ? 'high' : 'auto'"
                decoding="async"
                @error="retryMediaPreviewLoad"
              />
              <video v-else :src="m.url" class="media-thumb-v4" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
              <div class="media-overlay-v4">
                <button v-if="authStore.canEdit" class="delete-btn-circ" title="Remover" @click="deleteMedia(m.id)">✕</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Informações Legais ── -->
        <div v-if="activeSection === 'pub-legal'" class="pub-card">
          <h4 class="pub-card__title">Informações Legais</h4>
          <p style="font-size: 0.75rem; color: var(--color-surface-400); margin: 0 0 12px;">Texto exibido no final da página pública. Ideal para dados de registro, aprovações e licenças.</p>
          <textarea v-model="pubInfoForm.legalNotice" class="form-textarea" rows="4" placeholder="Ex: Loteamento aprovado pela Prefeitura Municipal, através do Decreto n.º..." :disabled="!authStore.canEdit" style="font-size: 0.85rem; line-height: 1.5;"></textarea>

          <div v-if="authStore.canEdit" style="margin-top: 16px; display: flex; justify-content: flex-end;">
            <button class="btn btn-primary btn-sm" :disabled="savingPublicLegal" @click="savePublicLegalBlock">
              {{ savingPublicLegal ? 'Salvando...' : 'Salvar Informações Legais' }}
            </button>
          </div>
        </div>
        </fieldset>
      </section>



        </main>
      </div>
    </template>

    <div v-else class="error-state">Projeto não encontrado.</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

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
const isArchivedProject = computed(() => {
  const slug = String(project.value?.slug || '').toLowerCase()
  const name = String(project.value?.name || '').toLowerCase()
  return slug.startsWith('archived-') || name.startsWith('[arquivado]')
})
const mapElements = ref<any[]>([])
const lots = ref<any[]>([])
const lotsMeta = ref({ totalItems: 0, itemCount: 0, itemsPerPage: 50, totalPages: 0, currentPage: 1 })
const media = ref<Media[]>([])
const lotCsvInputRef = ref<HTMLInputElement | null>(null)
const uploadingLotCsv = ref(false)
const activeLotImport = ref<any>(null)
let lotImportPollTimer: ReturnType<typeof setInterval> | null = null

const lotStats = computed(() => {
  const total = lots.value.length
  const available = lots.value.filter((l: any) => l.status === 'AVAILABLE').length
  const reserved = lots.value.filter((l: any) => l.status === 'RESERVED').length
  const sold = lots.value.filter((l: any) => l.status === 'SOLD').length
  return { total, available, reserved, sold }
})

const activeLotImportRunning = computed(() => {
  const status = String(activeLotImport.value?.status || '')
  return status === 'PENDING' || status === 'PROCESSING'
})

const lotImportProgress = computed(() => {
  const total = Number(activeLotImport.value?.totalRows || 0)
  const processed = Number(activeLotImport.value?.processedRows || 0)
  if (!total) return 0
  return Math.min(100, Math.round((processed / total) * 100))
})
const activeSection = ref('configuracoes')
type BannerDevice = 'desktop' | 'tablet' | 'mobile'
const uploadingBannerDevice = ref<BannerDevice | null>(null)
const uploadingMedia = ref(false)
const savingSettings = ref(false)
const settingsError = ref('')
const settingsSaved = ref(false)
const togglingPreLaunch = ref(false)

const editingLot = ref<any>(null)
const lotQrModal = ref<null | {
  code: string
  publicPageUrl: string
  qrCodeUrl: string
  shareText: string
}>(null)

// Reservation modal state
const viewingReservation = ref<any>(null)
const reservationData = ref<any>(null)
const reservationLoading = ref(false)
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
  frontEdgeIndex: null as number | null,
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

const normalizeFrontEdgeIndex = (value: unknown, edgeCount: number) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || edgeCount < 1) return null
  return ((parsed % edgeCount) + edgeCount) % edgeCount
}

const lotFrontEdgeOptions = computed(() => {
  return editingLotSideMetrics.value.map((side: any, index: number) => ({
    index,
    label: `Aresta ${index + 1}`,
    metersText: side?.meters != null ? `${Number(side.meters).toFixed(2)} m` : '',
  }))
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
  const medias = Array.isArray(editingLot.value.medias) ? editingLot.value.medias : []
  const panoramaUrl = lotForm.value.panoramaUrl

  return medias.filter((m: any) => {
    const caption = String(m?.caption || '').toLowerCase()
    if (panoramaUrl && m?.url === panoramaUrl) return false
    if (caption.includes('lot_panorama_360') || caption.includes('panorama_360') || caption.includes('panorama 360')) return false
    return true
  })
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
    frontEdgeIndex: normalizeFrontEdgeIndex(lot.frontEdgeIndex ?? lot.mapElement?.metaJson?.frontEdgeIndex, Array.isArray(lot.sideMetricsJson) ? lot.sideMetricsJson.length : 0),
    conditionsText: Array.isArray(lot.conditionsJson) ? lot.conditionsJson.join('\n') : '',
    paymentConditions: lot.paymentConditions ? JSON.parse(JSON.stringify(lot.paymentConditions)) : null
  }
}

const saveLotDetails = async () => {
  if (!authStore.canEdit) return
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

    let updatedMapElement = editingLot.value.mapElement || null
    if (editingLot.value.mapElement?.id) {
      const nextFrontEdgeIndex = normalizeFrontEdgeIndex(lotForm.value.frontEdgeIndex, editingLotSideMetrics.value.length)
      const currentFrontEdgeIndex = normalizeFrontEdgeIndex(editingLot.value.mapElement?.metaJson?.frontEdgeIndex, editingLotSideMetrics.value.length)

      if (nextFrontEdgeIndex !== currentFrontEdgeIndex) {
        const nextMetaJson = { ...(editingLot.value.mapElement.metaJson || {}) }
        if (nextFrontEdgeIndex === null) delete nextMetaJson.frontEdgeIndex
        else nextMetaJson.frontEdgeIndex = nextFrontEdgeIndex

        updatedMapElement = await fetchApi(`/projects/${projectId}/map-elements/${editingLot.value.mapElement.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            id: editingLot.value.mapElement.id,
            type: editingLot.value.mapElement.type,
            name: editingLot.value.mapElement.name || undefined,
            code: editingLot.value.mapElement.code || undefined,
            geometryType: editingLot.value.mapElement.geometryType,
            geometryJson: editingLot.value.mapElement.geometryJson,
            styleJson: editingLot.value.mapElement.styleJson,
            metaJson: nextMetaJson,
          }),
        })

        const mapElementIndex = mapElements.value.findIndex((item: any) => item.id === updatedMapElement.id)
        if (mapElementIndex !== -1) {
          mapElements.value[mapElementIndex] = updatedMapElement
        }
      }
    }
    
    // Update local lots array
    const idx = lots.value.findIndex((l: any) => l.id === editingLot.value.id)
    if (idx !== -1) {
      lots.value[idx] = {
        ...lots.value[idx],
        ...updated,
        frontEdgeIndex: normalizeFrontEdgeIndex(lotForm.value.frontEdgeIndex, editingLotSideMetrics.value.length),
        ...(updatedMapElement ? { mapElement: updatedMapElement } : {}),
      }
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

const isLotPanoramaMedia = (media: any, fallbackUrls: Array<string | null | undefined> = []) => {
  const caption = String(media?.caption || '').toLowerCase()
  const url = String(media?.url || '').toLowerCase()
  const normalizedFallbackUrls = fallbackUrls
    .map((value) => String(value || '').trim())
    .filter(Boolean)

  if (normalizedFallbackUrls.includes(String(media?.url || '').trim())) return true
  if (caption.includes('lot_panorama_360') || caption.includes('panorama_360') || caption.includes('panorama-360') || caption.includes('panorama 360')) return true
  if (url.includes('panorama_360') || url.includes('panorama-360') || url.includes('/panorama/')) return true
  return false
}

const removePanoramaMediaFromDraft = (fallbackUrls: Array<string | null | undefined> = []) => {
  if (!Array.isArray(editingLot.value?.medias)) return
  editingLot.value.medias = editingLot.value.medias.filter((media: any) => !isLotPanoramaMedia(media, fallbackUrls))
}

const clearLotPanoramaSelection = () => {
  removePanoramaMediaFromDraft([lotForm.value.panoramaUrl])
  lotForm.value.panoramaUrl = null
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
    const previousPanoramaUrl = lotForm.value.panoramaUrl
    const fd = new FormData(); fd.append('file', file)
    // Tag panorama uploads so they can be reliably filtered from static galleries.
    const m = await uploadApi(`/projects/${projectId}/media?lotDetailsId=${editingLot.value.id}&caption=lot_panorama_360`, fd)

    if (!editingLot.value.medias) editingLot.value.medias = []
    editingLot.value.medias.unshift(m)

    // If a previous panorama was already selected, remove its media record to avoid stale gallery mixing.
    if (previousPanoramaUrl && Array.isArray(editingLot.value.medias)) {
      const previousMedia = editingLot.value.medias.find((item: any) => item?.url === previousPanoramaUrl)
      if (previousMedia?.id) {
        await fetchApi(`/projects/${projectId}/media/${previousMedia.id}`, { method: 'DELETE' }).catch(() => null)
        editingLot.value.medias = editingLot.value.medias.filter((item: any) => item?.id !== previousMedia.id)
      }
    }

    // Set the panoramaUrl to this media's URL
    lotForm.value.panoramaUrl = m.url
    toastSuccess('Imagem 360° enviada! Salve para concluir.')
  } catch (err) {
    toastFromError(err, 'Erro ao enviar imagem')
  }
  (e.target as HTMLInputElement).value = ''
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

const retryMediaPreviewLoad = (event: Event) => {
  const target = event.target as HTMLImageElement | null
  if (!target) return

  // Retry only once to avoid infinite loops when URL is truly invalid.
  if (target.dataset.retryOnce === '1') return
  target.dataset.retryOnce = '1'

  const current = target.currentSrc || target.src
  if (!current) return

  const separator = current.includes('?') ? '&' : '?'
  target.src = `${current}${separator}r=${Date.now()}`
}

const locationOrigin = computed(() => {
  if (typeof window !== 'undefined') return window.location.origin
  return ''
})

const publicUrl = computed(() => project.value ? `/${project.value.slug}` : null)

const lotAttributionUrl = (lot: any, source: 'qr_code' | 'share_button') => {
  const baseUrl = lotPublicPageUrl(lot)
  if (!baseUrl) return ''

  try {
    const url = new URL(baseUrl)
    const lotLabel = String(lot?.lotNumber || lot?.mapElement?.code || lot?.mapElement?.name || lot?.id || 'lote').trim()
    const campaignBase = String(project.value?.slug || projectId || 'projeto').trim().replace(/\s+/g, '-').toLowerCase()

    url.searchParams.set('utm_source', source)
    url.searchParams.set('utm_medium', source === 'qr_code' ? 'offline' : 'share')
    url.searchParams.set('utm_campaign', `project_${campaignBase}`)
    url.searchParams.set('utm_content', `lot_${lotLabel.replace(/\s+/g, '-').toLowerCase()}`)
    return url.toString()
  } catch {
    return baseUrl
  }
}

const lotPublicPageUrl = (lot: any) => {
  const backendUrl = String(lot?.publicPageUrl || '').trim()
  if (backendUrl) return backendUrl

  const code = lot?.mapElement?.code || lot?.mapElement?.name || lot?.lotNumber || lot?.id
  const slug = project.value?.slug
  if (!code || !slug) return ''

  const origin = window?.location?.origin || ''
  return `${origin}/${slug}/${encodeURIComponent(String(code))}`
}

const lotQrCodeUrl = (lot: any) => {
  const publicPageUrl = lotAttributionUrl(lot, 'qr_code')
  if (!publicPageUrl) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=768x768&data=${encodeURIComponent(publicPageUrl)}`
}

const lotShareText = (lot: any) => {
  const fromBackend = String(lot?.shareText || '').trim()
  if (fromBackend) return fromBackend

  const lotLabel = lot?.lotNumber || lot?.mapElement?.code || lot?.mapElement?.name || lot?.id
  const projectName = project.value?.name || 'este empreendimento'
  return `Saiba mais sobre o lote ${lotLabel} do ${projectName}`
}

const shareLot = async (lot: any) => {
  const url = lotAttributionUrl(lot, 'share_button')
  if (!url) {
    toastFromError(new Error('Nao foi possivel gerar o link publico deste lote.'))
    return
  }

  const lotLabel = lot?.lotNumber || lot?.mapElement?.code || lot?.mapElement?.name || lot?.id
  const title = `${project.value?.name || 'Empreendimento'} - Lote ${lotLabel}`
  const text = lotShareText(lot)

  if (navigator?.share) {
    try {
      await navigator.share({ title, text, url })
      return
    } catch {
      // Fallback para copiar em caso de cancelamento/erro.
    }
  }

  copyLink(url)
}

const openLotQrModal = (lot: any) => {
  const publicPageUrl = lotAttributionUrl(lot, 'qr_code')
  const qrCodeUrl = lotQrCodeUrl(lot)
  if (!publicPageUrl || !qrCodeUrl) {
    toastFromError(new Error('Nao foi possivel gerar o QR code deste lote.'))
    return
  }

  const code = String(lot?.lotNumber || lot?.mapElement?.code || lot?.mapElement?.name || lot?.id || '')
  lotQrModal.value = {
    code,
    publicPageUrl,
    qrCodeUrl,
    shareText: lotShareText(lot)
  }
}

const downloadLotQr = (payload: { code: string; qrCodeUrl: string }) => {
  const a = document.createElement('a')
  a.href = payload.qrCodeUrl
  a.download = `qr-lote-${payload.code || 'sem-codigo'}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

const printLotQr = (payload: {
  code: string
  qrCodeUrl: string
  publicPageUrl: string
  shareText: string
}) => {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=720')
  if (!win) {
    toastFromError(new Error('Nao foi possivel abrir a janela de impressao.'))
    return
  }

  const safeCode = String(payload.code || 'sem-codigo')
  const safeShareText = String(payload.shareText || '')
  const safePublicUrl = String(payload.publicPageUrl || '')
  const safeQrCode = String(payload.qrCodeUrl || '')

  win.document.write(`
    <html>
      <head>
        <title>QR do Lote ${safeCode}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
          .wrap { max-width: 560px; margin: 0 auto; text-align: center; }
          h1 { font-size: 24px; margin-bottom: 10px; }
          p { margin: 6px 0; }
          .qr { margin: 20px auto; width: 320px; height: 320px; border: 1px solid #d1d5db; border-radius: 12px; padding: 12px; box-sizing: border-box; }
          .qr img { width: 100%; height: 100%; object-fit: contain; }
          .url { font-size: 12px; color: #374151; word-break: break-all; }
          @media print { body { margin: 0; } .wrap { margin-top: 12mm; } }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>Lote ${safeCode}</h1>
          <p>${safeShareText}</p>
          <div class="qr"><img src="${safeQrCode}" alt="QR Code do lote ${safeCode}" /></div>
          <p class="url">${safePublicUrl}</p>
        </div>
        <script>
          window.onload = function () {
            window.print();
          };
        <\/script>
      </body>
    </html>
  `)
  win.document.close()
}
const plantMirrorPath = computed(() => {
  if (!project.value) return null
  if (project.value.status === 'PUBLISHED') return `/${project.value.slug}/espelho-planta`
  return `/preview/${project.value.id}/espelho-planta`
})
const plantMirrorAbsoluteUrl = computed(() => {
  if (!plantMirrorPath.value || !locationOrigin.value) return ''
  return `${locationOrigin.value}${plantMirrorPath.value}`
})

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
  if (!authStore.canEdit) return
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

const editForm = ref<any>({
  name: '',
  slug: '',
  description: '',
  showPaymentConditions: false,
  customDomain: '',
  preLaunchEnabled: false,
  preLaunchCaptureMode: 'QUEUE',
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
  paymentConditions: [] as any[],
  salesMotionConfig: {
    enterprise: {
      enabled: false,
      showOnce: false,
      intervalSeconds: 14,
      displaySeconds: 6,
      maxNotices: 5,
      templates: [
        { id: 'visitorsNow', text: '{{visitsNow}} pessoas estão vendo este loteamento', enabled: true },
      ] as any[],
    },
    lot: {
      enabled: false,
      showOnce: false,
      intervalSeconds: 14,
      displaySeconds: 6,
      maxNotices: 5,
      templates: [
        { id: 'visitorsNow', text: '{{visitsNow}} pessoas estao vendo esse lote', enabled: true },
      ] as any[],
    },
  }
})

const salesMotionTemplateDefaults = {
  enterprise: [
    { id: 'visitorsNow', text: '{{visitsNow}} pessoas estão vendo este loteamento', enabled: true },
  ],
  lot: [
    { id: 'visitorsNow', text: '{{visitsNow}} pessoas estao vendo esse lote', enabled: true },
  ]
} as const

type SalesMotionNumericToken = 'viewsToday' | 'visits24h' | 'visitsNow'
type SalesMotionTemplateRangeKey = 'min' | 'max'

const SALES_MOTION_NUMERIC_TOKENS: SalesMotionNumericToken[] = ['viewsToday', 'visits24h', 'visitsNow']

const SALES_MOTION_RANGE_DEFAULTS: Record<SalesMotionNumericToken, { min: number; max: number }> = {
  viewsToday: { min: 3, max: 40 },
  visits24h: { min: 12, max: 280 },
  visitsNow: { min: 2, max: 24 },
}

const SALES_MOTION_RANGE_LABELS: Record<SalesMotionNumericToken, string> = {
  viewsToday: 'viewsToday',
  visits24h: 'visits24h',
  visitsNow: 'visitsNow',
}

const salesMotionTemplateHasToken = (text: string, token: SalesMotionNumericToken) => {
  const regex = new RegExp(`{{\\s*${token}\\s*}}`, 'i')
  return regex.test(text)
}

const salesMotionTemplateTokenList = (tpl: any): SalesMotionNumericToken[] => {
  const text = String(tpl?.text || '')
  return SALES_MOTION_NUMERIC_TOKENS.filter((token) => salesMotionTemplateHasToken(text, token))
}

const normalizeSalesMotionTemplateRanges = (ranges: any, text: string) => {
  const tokens = SALES_MOTION_NUMERIC_TOKENS.filter((token) => salesMotionTemplateHasToken(text, token))
  const normalized: Partial<Record<SalesMotionNumericToken, { min: number; max: number }>> = {}

  for (const token of tokens) {
    const fallback = SALES_MOTION_RANGE_DEFAULTS[token]
    const rawMin = Number(ranges?.[token]?.min)
    const rawMax = Number(ranges?.[token]?.max)
    const min = Number.isFinite(rawMin) ? Math.max(0, Math.round(rawMin)) : fallback.min
    const maxCandidate = Number.isFinite(rawMax) ? Math.max(0, Math.round(rawMax)) : fallback.max
    const max = Math.max(min, maxCandidate)
    normalized[token] = { min, max }
  }

  return normalized
}

const ensureSalesMotionTemplateRanges = (tpl: any) => {
  const text = String(tpl?.text || '')
  tpl.ranges = normalizeSalesMotionTemplateRanges(tpl?.ranges, text)
}

const salesMotionTemplateRangeValue = (tpl: any, token: SalesMotionNumericToken, key: SalesMotionTemplateRangeKey) => {
  const fallback = SALES_MOTION_RANGE_DEFAULTS[token][key]
  return Number(tpl?.ranges?.[token]?.[key] ?? fallback)
}

const setSalesMotionTemplateRangeValue = (
  tpl: any,
  token: SalesMotionNumericToken,
  key: SalesMotionTemplateRangeKey,
  rawValue: string,
) => {
  ensureSalesMotionTemplateRanges(tpl)
  const parsed = Number(rawValue)
  const next = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : SALES_MOTION_RANGE_DEFAULTS[token][key]
  if (!tpl.ranges[token]) {
    tpl.ranges[token] = { ...SALES_MOTION_RANGE_DEFAULTS[token] }
  }
  tpl.ranges[token][key] = next
  const min = Number(tpl.ranges[token].min)
  const max = Number(tpl.ranges[token].max)
  if (min > max) {
    if (key === 'min') tpl.ranges[token].max = min
    else tpl.ranges[token].min = max
  }
}

const salesMotionTokenLabel = (token: SalesMotionNumericToken) => {
  return SALES_MOTION_RANGE_LABELS[token] || token
}

const createSalesMotionTemplate = (text = '') => ({
  id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  text,
  enabled: true,
  manualRangeEnabled: false,
  ranges: normalizeSalesMotionTemplateRanges({}, text),
})

const normalizeSalesMotionTemplateList = (
  source: any,
  fallback: Array<{ id: string; text: string; enabled: boolean }>
): any[] => {
  if (Array.isArray(source)) {
    const normalized = source
      .map((tpl: any, idx: number) => {
        if (typeof tpl === 'string') {
          return { id: `legacy_${idx + 1}`, text: tpl, enabled: true }
        }
        if (!tpl || typeof tpl !== 'object') return null
        return {
          id: String(tpl.id || `tpl_${idx + 1}`),
          text: String(tpl.text || ''),
          enabled: tpl.enabled !== false,
          manualRangeEnabled: tpl.manualRangeEnabled === true,
          ranges: normalizeSalesMotionTemplateRanges(tpl.ranges, String(tpl.text || '')),
        }
      })
      .filter((tpl: any) => tpl && tpl.text.trim().length > 0)

    if (normalized.length > 0) return normalized
  }

  if (source && typeof source === 'object') {
    const fromObject = Object.entries(source)
      .map(([key, value]) => ({
        id: String(key),
        text: String(value || ''),
        enabled: true,
        manualRangeEnabled: false,
        ranges: normalizeSalesMotionTemplateRanges({}, String(value || '')),
      }))
      .filter((tpl) => tpl.text.trim().length > 0)

    if (fromObject.length > 0) return fromObject
  }

  return fallback.map((tpl) => ({
    ...tpl,
    manualRangeEnabled: false,
    ranges: normalizeSalesMotionTemplateRanges((tpl as any).ranges, tpl.text),
  }))
}

const addSalesMotionTemplate = (context: 'enterprise' | 'lot') => {
  editForm.value.salesMotionConfig[context].templates.push(createSalesMotionTemplate())
}

const removeSalesMotionTemplate = (context: 'enterprise' | 'lot', idx: number | string) => {
  editForm.value.salesMotionConfig[context].templates.splice(Number(idx), 1)
}

const salesMotionMasterEnabled = computed({
  get: () => {
    const cfg = editForm.value.salesMotionConfig
    return !!(cfg.enterprise.enabled || cfg.lot.enabled)
  },
  set: (enabled: boolean) => {
    editForm.value.salesMotionConfig.enterprise.enabled = enabled
    editForm.value.salesMotionConfig.lot.enabled = enabled
  },
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

const stripHtml = (value?: string) => (value || '').replace(/<[^>]*>/g, '').trim()

const extractLocationMeta = (raw: string) => {
  const source = raw || ''
  const titleMatch = source.match(/<[^>]*data-lotio-location-title=["']1["'][^>]*>([\s\S]*?)<\/[^>]+>/i)
  const subtitleMatch = source.match(/<[^>]*data-lotio-location-subtitle=["']1["'][^>]*>([\s\S]*?)<\/[^>]+>/i)

  const body = source
    .replace(/<[^>]*data-lotio-location-title=["']1["'][^>]*>[\s\S]*?<\/[^>]+>/gi, '')
    .replace(/<[^>]*data-lotio-location-subtitle=["']1["'][^>]*>[\s\S]*?<\/[^>]+>/gi, '')
    .trim()

  return {
    title: stripHtml(titleMatch?.[1] || ''),
    subtitle: stripHtml(subtitleMatch?.[1] || ''),
    body,
  }
}

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const sanitizeLocationBody = (html: string) => {
  if (!html) return ''

  const withoutFontTags = html
    .replace(/<font\b[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
    .replace(/\scolor=(['"]).*?\1/gi, '')

  return withoutFontTags.replace(/\sstyle=(['"])(.*?)\1/gi, (_match, quote: string, css: string) => {
    const filtered = css
      .split(';')
      .map((rule: string) => rule.trim())
      .filter(Boolean)
      .filter((rule: string) => !/^color\s*:/i.test(rule) && !/^background(?:-color)?\s*:/i.test(rule))

    if (!filtered.length) return ''
    return ` style=${quote}${filtered.join('; ')}${quote}`
  })
}

const buildLocationTextPayload = () => {
  const title = (pubInfoForm.value.locationTitle || '').trim()
  const subtitle = (pubInfoForm.value.locationSubtitle || '').trim()
  const body = sanitizeLocationBody((pubInfoForm.value.locationText || '').trim())
  const parts: string[] = []

  if (title) {
    parts.push(`<h2 data-lotio-location-title="1">${escapeHtml(title)}</h2>`)
  }

  if (subtitle) {
    parts.push(`<p data-lotio-location-subtitle="1">${escapeHtml(subtitle)}</p>`)
  }

  if (body) {
    parts.push(body)
  }

  return parts.join('\n')
}

const pubInfoForm = ref({
  highlightsJson: [] as Highlight[],
  highlightsTitle: '',
  highlightsSubtitle: '',
  traditionalHighlightsTitle: '',
  traditionalHighlightsSubtitle: '',
  locationTitle: '',
  locationSubtitle: '',
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
const projectFooterLogos = ref<Array<{ id: string; url: string; label?: string | null; sortOrder?: number }>>([])
const projectOgLogoUrl = ref<string | null>(null)
const uploadingOgLogo = ref(false)
const removingOgLogo = ref(false)
const uploadingFooterLogo = ref(false)
const deletingFooterLogoId = ref<string | null>(null)
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
  school: 'bi-mortarboard-fill', supermarket: 'bi-cart-fill', pharmacy: 'bi-capsule', hospital: 'bi-hospital-fill',
  park: 'bi-tree-fill', restaurant: 'bi-fork-knife', gym: 'bi-activity', shopping_mall: 'bi-bag-fill',
}
const nearbyCategoryIcon = (cat: string) => NEARBY_ICONS[cat] || 'bi-geo-alt-fill'

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
  pubInfoForm.value.highlightsJson = [...pubInfoForm.value.highlightsJson, { type: 'highlight' as const, icon: 'bi-check-circle-fill', ...newHighlight.value }]
  newHighlight.value = { label: '', value: '' }
}

const resolveHighlightIcon = (icon?: string) => {
  if (icon && icon.startsWith('bi-')) return `bi ${icon}`
  return 'bi bi-check-circle-fill'
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
    highlightsJson: withPublicSectionOrderMeta(pubInfoForm.value.highlightsJson, publicSectionsOrder.value, publicSectionsDisabled.value),
    highlightsTitle: pubInfoForm.value.highlightsTitle,
    highlightsSubtitle: pubInfoForm.value.highlightsSubtitle,
    traditionalHighlightsTitle: pubInfoForm.value.traditionalHighlightsTitle,
    traditionalHighlightsSubtitle: pubInfoForm.value.traditionalHighlightsSubtitle,
    // Keep title/subtitle serialized within locationText to avoid backend schema changes.
    locationText: buildLocationTextPayload(),
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
  if (!authStore.canEdit) return
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

const uploadProjectOgLogo = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  uploadingOgLogo.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const updatedProject = await uploadApi(`/projects/${projectId}/og-logo`, fd)
    projectOgLogoUrl.value = updatedProject?.ogLogoUrl || null
    if (project.value) project.value.ogLogoUrl = projectOgLogoUrl.value
    toastSuccess('Logo Open Graph enviado!')
  } catch (err) {
    toastFromError(err, 'Erro ao enviar logo Open Graph')
  } finally {
    ;(e.target as HTMLInputElement).value = ''
    uploadingOgLogo.value = false
  }
}

const removeProjectOgLogo = async () => {
  removingOgLogo.value = true
  try {
    const updatedProject = await fetchApi(`/projects/${projectId}/og-logo`, {
      method: 'DELETE'
    })
    projectOgLogoUrl.value = updatedProject?.ogLogoUrl || null
    if (project.value) project.value.ogLogoUrl = projectOgLogoUrl.value
    toastSuccess('Logo Open Graph removido!')
  } catch (err) {
    toastFromError(err, 'Erro ao remover logo Open Graph')
  } finally {
    removingOgLogo.value = false
  }
}

const uploadFooterLogo = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  uploadingFooterLogo.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const logo = await uploadApi(`/projects/${projectId}/footer-logos`, fd)
    projectFooterLogos.value.push(logo)
    projectFooterLogos.value.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    toastSuccess('Logo de rodapé enviado!')
  } catch (err) {
    toastFromError(err, 'Erro ao enviar logo de rodapé')
  } finally {
    ;(e.target as HTMLInputElement).value = ''
    uploadingFooterLogo.value = false
  }
}

const deleteFooterLogo = async (logoId: string) => {
  deletingFooterLogoId.value = logoId
  try {
    await fetchApi(`/projects/${projectId}/footer-logos/${logoId}`, { method: 'DELETE' })
    projectFooterLogos.value = projectFooterLogos.value.filter(logo => logo.id !== logoId)
    toastSuccess('Logo removido!')
  } catch (err) {
    toastFromError(err, 'Erro ao remover logo de rodapé')
  } finally {
    deletingFooterLogoId.value = null
  }
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
type SidebarSectionItem = {
  id: string
  icon: string
  label: string
}

type SidebarGroup = {
  id: string
  label: string
  items: SidebarSectionItem[]
}

const PUBLIC_SECTION_ORDER_META_TYPE = '__lotio_public_section_order__'
const PUBLIC_SECTION_FIXED_TOP = 'pub-banner'
const PUBLIC_SECTION_FIXED_BOTTOM: string[] = ['pub-logos', 'pub-legal']

const PUBLIC_SECTION_CATALOG: SidebarSectionItem[] = [
  { id: 'pub-banner', icon: 'bi bi-card-image', label: 'Banner' },
  { id: 'pub-plant', icon: 'bi bi-map', label: 'Planta Interativa' },
  { id: 'pub-panorama', icon: 'bi bi-image-fill', label: 'Panorama 360°' },
  { id: 'pub-video', icon: 'bi bi-youtube', label: 'Vídeo de Apresentação' },
  { id: 'pub-lots-carousel', icon: 'bi bi-view-list', label: 'Carrossel de Lotes' },
  { id: 'pub-lots', icon: 'bi bi-grid-3x2-gap-fill', label: 'Lotes Disponíveis' },
  { id: 'pub-construction', icon: 'bi bi-hammer', label: 'Obras' },
  { id: 'pub-location', icon: 'bi bi-geo-alt-fill', label: 'Localização' },
  { id: 'pub-nearby', icon: 'bi bi-signpost-split-fill', label: 'Proximidades' },
  { id: 'pub-scheduling', icon: 'bi bi-calendar-event-fill', label: 'Agendamento' },
  { id: 'pub-infra', icon: 'bi bi-cone-striped', label: 'Infraestrutura' },
  { id: 'pub-highlights', icon: 'bi bi-stars', label: 'Destaques' },
  { id: 'pub-description', icon: 'bi bi-file-richtext-fill', label: 'Texto Descritivo' },
  { id: 'pub-gallery', icon: 'bi bi-images', label: 'Galeria de Mídia' },
  { id: 'pub-logos', icon: 'bi bi-building', label: 'Logos de Rodapé' },
  { id: 'pub-legal', icon: 'bi bi-shield-check', label: 'Informações Legais' },
]

const PUBLIC_SECTION_DEFAULT_ORDER = PUBLIC_SECTION_CATALOG.map(section => section.id)

const publicSectionsOrder = ref<string[]>([...PUBLIC_SECTION_DEFAULT_ORDER])
const publicSectionsDisabled = ref<string[]>([])
const savingPublicSectionOrder = ref(false)

const publicSectionById = new Map(PUBLIC_SECTION_CATALOG.map(section => [section.id, section]))

const normalizePublicSectionOrder = (orderCandidate: unknown) => {
  const incoming = Array.isArray(orderCandidate) ? orderCandidate.filter((item): item is string => typeof item === 'string') : []
  const knownSet = new Set(PUBLIC_SECTION_DEFAULT_ORDER)
  const seen = new Set<string>()
  const ordered = incoming.filter((id) => knownSet.has(id) && !seen.has(id) && seen.add(id))

  for (const id of PUBLIC_SECTION_DEFAULT_ORDER) {
    if (!seen.has(id)) ordered.push(id)
  }

  const fixedBottomSet = new Set(PUBLIC_SECTION_FIXED_BOTTOM)
  const withoutFixed = ordered.filter(id => id !== PUBLIC_SECTION_FIXED_TOP && !fixedBottomSet.has(id))
  return [PUBLIC_SECTION_FIXED_TOP, ...withoutFixed, ...PUBLIC_SECTION_FIXED_BOTTOM]
}

const splitHighlightsAndPublicOrderMeta = (source: unknown) => {
  const raw = Array.isArray(source) ? source : []
  let metaOrder: string[] | null = null
  let metaDisabled: string[] | null = null

  const highlights = raw.filter((item: any) => {
    if (item && typeof item === 'object' && item.type === PUBLIC_SECTION_ORDER_META_TYPE) {
      if (metaOrder === null) {
        metaOrder = normalizePublicSectionOrder(item.order)
      }
      if (metaDisabled === null) {
        metaDisabled = Array.isArray(item.disabled)
          ? item.disabled.filter((id: unknown): id is string => typeof id === 'string' && publicSectionById.has(id))
          : []
      }
      return false
    }
    return true
  })

  return {
    highlights,
    order: metaOrder ?? [...PUBLIC_SECTION_DEFAULT_ORDER],
    disabled: metaDisabled ?? [],
  }
}

const withPublicSectionOrderMeta = (highlights: unknown, order: string[], disabled: string[]) => {
  const pureHighlights = Array.isArray(highlights)
    ? highlights.filter((item: any) => !(item && typeof item === 'object' && item.type === PUBLIC_SECTION_ORDER_META_TYPE))
    : []

  const normalizedDisabled = Array.from(new Set(disabled.filter((id) => publicSectionById.has(id))))

  return [
    ...pureHighlights,
    {
      type: PUBLIC_SECTION_ORDER_META_TYPE,
      order: normalizePublicSectionOrder(order),
      disabled: normalizedDisabled,
    },
  ]
}

const publicPageSections = computed<SidebarSectionItem[]>(() => {
  const normalizedOrder = normalizePublicSectionOrder(publicSectionsOrder.value)
  return normalizedOrder
    .map((id) => publicSectionById.get(id))
    .filter((section): section is SidebarSectionItem => !!section)
})

const isFixedPublicSection = (sectionId: string) => {
  return sectionId === PUBLIC_SECTION_FIXED_TOP || PUBLIC_SECTION_FIXED_BOTTOM.includes(sectionId)
}

const canMovePublicSection = (sectionId: string, direction: 'up' | 'down') => {
  if (isFixedPublicSection(sectionId)) return false
  const ordered = normalizePublicSectionOrder(publicSectionsOrder.value)
  const idx = ordered.indexOf(sectionId)
  if (idx === -1) return false

  const minIndex = 1
  const maxIndex = ordered.length - 1 - PUBLIC_SECTION_FIXED_BOTTOM.length
  if (direction === 'up') return idx > minIndex
  return idx < maxIndex
}

const persistPublicSectionOrder = async () => {
  if (!project.value?.id) return
  savingPublicSectionOrder.value = true
  try {
    const highlightsWithMeta = withPublicSectionOrderMeta(pubInfoForm.value.highlightsJson, publicSectionsOrder.value, publicSectionsDisabled.value)
    project.value = await fetchApi(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ highlightsJson: highlightsWithMeta }),
    })
    const parsed = splitHighlightsAndPublicOrderMeta(highlightsWithMeta)
    pubInfoForm.value.highlightsJson = parsed.highlights as Highlight[]
    publicSectionsDisabled.value = parsed.disabled
    toastSuccess('Ordem das seções atualizada')
  } catch (e) {
    toastFromError(e, 'Erro ao atualizar ordem das seções')
  }
  savingPublicSectionOrder.value = false
}

const isPublicSectionEnabled = (sectionId: string) => {
  return !publicSectionsDisabled.value.includes(sectionId)
}

const hasBannerConfigured = computed(() => {
  return !!(project.value?.bannerImageUrl || project.value?.bannerImageTabletUrl || project.value?.bannerImageMobileUrl)
})

const hasPlantConfigured = computed(() => {
  return !!project.value?.mapData || mapElements.value.length > 0
})

const hasPanoramaConfigured = computed(() => {
  return lots.value.some((lot: any) => !!lot?.panoramaUrl)
})

const hasLotsConfigured = computed(() => {
  return lots.value.length > 0
})

const hasConstructionConfigured = computed(() => {
  return Array.isArray(pubInfoForm.value.constructionStatus) && pubInfoForm.value.constructionStatus.length > 0
})

const hasLocationConfigured = computed(() => {
  return !!(pubInfoForm.value.address?.trim() || pubInfoForm.value.googleMapsUrl?.trim())
})

const hasNearbyConfigured = computed(() => {
  return Array.isArray(nearbyStatus.value?.items) && nearbyStatus.value.items.length > 0
})

const hasSchedulingConfigured = computed(() => {
  return !!schedulingForm.value.enabled
})

const hasInfrastructureConfigured = computed(() => {
  return pubInfoForm.value.highlightsJson.some((item: any) => item?.type === 'category' && Array.isArray(item.items) && item.items.length > 0)
})

const hasHighlightsConfigured = computed(() => {
  return pubInfoForm.value.highlightsJson.some((item: any) => item?.type === 'highlight' && String(item?.label || '').trim().length > 0)
})

const hasDescriptionConfigured = computed(() => {
  const meta = extractLocationMeta(pubInfoForm.value.locationText || '')
  const hasBody = String(meta.body || '').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim().length > 0
  return !!(meta.title || meta.subtitle || hasBody)
})

const hasGalleryConfigured = computed(() => {
  return media.value.length > 0
})

const hasLogosConfigured = computed(() => {
  return projectFooterLogos.value.length > 0
})

const hasLegalConfigured = computed(() => {
  return !!pubInfoForm.value.legalNotice?.trim()
})

const isPublicSectionConfigured = (sectionId: string) => {
  switch (sectionId) {
    case 'pub-banner': return hasBannerConfigured.value
    case 'pub-plant': return hasPlantConfigured.value
    case 'pub-panorama': return hasPanoramaConfigured.value
    case 'pub-video': return !!pubInfoForm.value.youtubeVideoUrl?.trim()
    case 'pub-lots-carousel': return hasLotsConfigured.value
    case 'pub-lots': return hasLotsConfigured.value
    case 'pub-construction': return hasConstructionConfigured.value
    case 'pub-location': return hasLocationConfigured.value
    case 'pub-nearby': return hasNearbyConfigured.value
    case 'pub-scheduling': return hasSchedulingConfigured.value
    case 'pub-infra': return hasInfrastructureConfigured.value
    case 'pub-highlights': return hasHighlightsConfigured.value
    case 'pub-description': return hasDescriptionConfigured.value
    case 'pub-gallery': return hasGalleryConfigured.value
    case 'pub-logos': return hasLogosConfigured.value
    case 'pub-legal': return hasLegalConfigured.value
    default: return true
  }
}

const togglePublicSectionVisibility = async (sectionId: string) => {
  const current = new Set(publicSectionsDisabled.value)
  if (current.has(sectionId)) {
    current.delete(sectionId)
  } else {
    current.add(sectionId)
  }
  publicSectionsDisabled.value = Array.from(current)
  await persistPublicSectionOrder()
}

const movePublicSection = async (sectionId: string, direction: 'up' | 'down') => {
  if (!canMovePublicSection(sectionId, direction)) return

  const ordered = normalizePublicSectionOrder(publicSectionsOrder.value)
  const idx = ordered.indexOf(sectionId)
  const swapWith = direction === 'up' ? idx - 1 : idx + 1
  const current = ordered[idx]
  const target = ordered[swapWith]
  if (!current || !target) return
  ordered[idx] = target
  ordered[swapWith] = current
  publicSectionsOrder.value = ordered
  await persistPublicSectionOrder()
}

const configurationSections = computed<SidebarSectionItem[]>(() => {
  const sections: SidebarSectionItem[] = [
    { id: 'configuracoes', icon: 'bi bi-gear-fill', label: 'Dados Gerais' },
    { id: 'movimento-loteamento', icon: 'bi bi-broadcast-pin', label: 'Movimento do Loteamento' },
    { id: 'pre-lancamento', icon: 'bi bi-stars', label: 'Pré-lançamento' },
    { id: 'pub-pricing', icon: 'bi bi-cash-coin', label: 'Preços e Condições (Topo)' },
    { id: 'financeiro', icon: 'bi bi-calculator-fill', label: 'Simulação Financeira' },
  ]
  if (allConfigs.value.length > 0) {
    sections.push({ id: 'pagamentos', icon: 'bi bi-credit-card-2-front-fill', label: 'Pagamentos e Taxas' })
  }
  if (aiConfigs.value.length > 0) {
    sections.push({ id: 'assistente-ia', icon: 'bi bi-robot', label: 'Assistente IA' })
  }
  return sections
})

const sidebarGroups = computed<SidebarGroup[]>(() => ([
  {
    id: 'lotes',
    label: 'Gestão',
    items: [
      { id: 'lotes', icon: 'bi bi-geo-alt-fill', label: 'Lotes' },
    ],
  },
  {
    id: 'configuracoes',
    label: 'Configuração',
    items: configurationSections.value,
  },
  {
    id: 'pagina-publica',
    label: 'Página Pública',
    items: publicPageSections.value,
  },
]))

const sidebarSections = computed<SidebarSectionItem[]>(() => {
  return sidebarGroups.value.flatMap(group => group.items)
})

const normalizeSectionId = (sectionId: string) => {
  if (sectionId === 'pagina-publica') return 'pub-banner'
  if (sectionId === 'pub-hero-media') return 'pub-banner'
  if (sectionId === 'agendamento') return 'pub-scheduling'
  if (sectionId === 'pub-planta') return 'pub-plant'
  if (sectionId === 'pub-360') return 'pub-panorama'
  if (sectionId === 'pub-location-nearby') return 'pub-location'
  if (sectionId === 'pub-infra-highlights') return 'pub-infra'
  if (sectionId === 'pub-lot-list') return 'pub-lots'
  return sectionId
}

const routeSection = computed(() => {
  const sec = route.query.sec
  return typeof sec === 'string' ? sec : ''
})

const setActiveSection = (sectionId: string) => {
  activeSection.value = sectionId
}

watch(
  [sidebarSections, routeSection],
  ([sections, sec]) => {
    if (!sec) return
    const normalized = normalizeSectionId(sec)
    const exists = sections.some(s => s.id === normalized)
    if (exists && activeSection.value !== normalized) {
      activeSection.value = normalized
    }
  },
  { immediate: true },
)

watch(
  sidebarSections,
  (sections) => {
    const exists = sections.some(s => s.id === activeSection.value)
    if (!exists) {
      activeSection.value = 'configuracoes'
    }
  },
  { immediate: true },
)

watch(activeSection, (sec) => {
  if (route.query.sec === sec) return
  router.replace({
    query: {
      ...route.query,
      sec,
    },
  })
})

const lotBadge = (s: string) => ({ AVAILABLE: 'badge-success', RESERVED: 'badge-warning', SOLD: 'badge-danger' }[s] || 'badge-neutral')
const lotLabel = (s: string) => ({ AVAILABLE: 'Disponível', RESERVED: 'Reservado', SOLD: 'Vendido' }[s] || s)
const slopeLabel = (s: string) => ({ FLAT: 'Plano', UPHILL: 'Aclive', DOWNHILL: 'Declive' }[s] || s)

const formatCurrencyToBrasilia = (val: number | string) => {
  if (!val) return '---'
  const num = typeof val === 'string' ? parseFloat(val) : val
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
}

const lotImportStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING: 'Na fila',
    PROCESSING: 'Processando',
    COMPLETED: 'Concluida',
    COMPLETED_WITH_ERRORS: 'Concluida com erros',
    FAILED: 'Falhou',
  }
  return labels[status] || status || '—'
}

const stopLotImportPolling = () => {
  if (!lotImportPollTimer) return
  clearInterval(lotImportPollTimer)
  lotImportPollTimer = null
}

const startLotImportPolling = (importId: string) => {
  stopLotImportPolling()

  const poll = async () => {
    try {
      const status = await fetchApi(`/projects/${projectId}/lots/imports/${importId}`)
      activeLotImport.value = status

      if (status?.terminal) {
        stopLotImportPolling()
        await loadLotsPaginated(lotsMeta.value.currentPage)
        if (status.status === 'COMPLETED') {
          toastSuccess('Importacao finalizada com sucesso!')
        } else if (status.status === 'COMPLETED_WITH_ERRORS') {
          toastFromError(new Error('Importacao finalizada com erros. Baixe o relatorio para revisar.'))
        } else if (status.status === 'FAILED') {
          toastFromError(new Error(status.message || 'A importacao falhou.'))
        }
      }
    } catch (e) {
      stopLotImportPolling()
      toastFromError(e, 'Erro ao acompanhar importacao')
    }
  }

  poll()
  lotImportPollTimer = setInterval(poll, 2000)
}

const openLotCsvPicker = () => {
  if (!authStore.canEdit) return
  lotCsvInputRef.value?.click()
}

const isExcelFile = (file: File) => {
  const name = file.name.toLowerCase()
  const type = String(file.type || '').toLowerCase()
  return (
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    type.includes('spreadsheetml') ||
    type.includes('application/vnd.ms-excel')
  )
}

const convertExcelToCsvFile = async (file: File) => {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    throw new Error('Nao foi possivel ler a planilha. Verifique se ha uma aba com dados.')
  }

  const worksheet = workbook.Sheets[firstSheetName]
  if (!worksheet) {
    throw new Error('Nao foi possivel ler a aba principal da planilha.')
  }

  const csv = XLSX.utils.sheet_to_csv(worksheet, {
    FS: ';',
    RS: '\n',
    blankrows: false,
  })

  const safeName = file.name.replace(/\.(xlsx|xls)$/i, '') || 'importacao-lotes'
  return new File([csv], `${safeName}.csv`, { type: 'text/csv;charset=utf-8;' })
}

const handleLotCsvSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadingLotCsv.value = true
  try {
    let uploadFile: File = file
    if (isExcelFile(file)) {
      uploadFile = await convertExcelToCsvFile(file)
    }

    const formData = new FormData()
    formData.append('file', uploadFile, uploadFile.name)
    const job = await uploadApi(`/projects/${projectId}/lots/imports`, formData)
    activeLotImport.value = job
    startLotImportPolling(job.id)
    toastSuccess('Arquivo enviado. A importacao foi iniciada em segundo plano.')
  } catch (e) {
    toastFromError(e, 'Erro ao iniciar importacao')
  } finally {
    uploadingLotCsv.value = false
    input.value = ''
  }
}

const downloadLotCsvTemplate = () => {
  const lines = [
    'codigo;status;quadra;lote;area_m2;valor_total;valor_m2;frente;fundo;lateral_esquerda;lateral_direita;topografia;tags;observacoes',
    'Q1-L01;DISPONIVEL;Q1;01;300;120000;400;12;25;25;25;PLANO;"esquina;sol da manha";"Lote de esquina"',
    'Q1-L02;RESERVADO;Q1;02;280;98000;350;10;28;28;28;ACLIVE;"vista livre";""',
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `modelo-importacao-lotes-${projectId}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const downloadLotImportErrorsCsv = async () => {
  if (!activeLotImport.value?.id) return
  try {
    const errors = await fetchApi(`/projects/${projectId}/lots/imports/${activeLotImport.value.id}/errors?limit=5000`)
    const header = ['line', 'code', 'message']
    const rows = (errors || []).map((item: any) => [
      String(item.line ?? ''),
      String(item.code ?? ''),
      String(item.message ?? '').replace(/\n/g, ' '),
    ])

    const csv = [header, ...rows]
      .map((row: string[]) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `importacao-lotes-erros-${activeLotImport.value.id}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (e) {
    toastFromError(e, 'Erro ao baixar relatorio de erros')
  }
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
    const [p, els, resLots, md, latestImport] = await Promise.all([
      fetchApi(`/projects/${projectId}`),
      fetchApi(`/projects/${projectId}/map-elements`),
      fetchApi(`/projects/${projectId}/lots?page=1&limit=50`),
      fetchApi(`/projects/${projectId}/media`),
      fetchApi(`/projects/${projectId}/lots/imports/latest`).catch(() => null),
    ])
    project.value = p
    mapElements.value = els
    lots.value = resLots.data
    lotsMeta.value = resLots.meta
    media.value = md
    activeLotImport.value = latestImport
    if (latestImport && !latestImport.terminal) {
      startLotImportPolling(latestImport.id)
    }
    loadPaymentConfig()
    const salesMotionConfig = p.salesMotionConfig && typeof p.salesMotionConfig === 'object'
      ? p.salesMotionConfig
      : {}
    const enterpriseConfig = salesMotionConfig?.enterprise && typeof salesMotionConfig.enterprise === 'object'
      ? salesMotionConfig.enterprise
      : {}
    const lotConfig = salesMotionConfig?.lot && typeof salesMotionConfig.lot === 'object'
      ? salesMotionConfig.lot
      : {}

    const enterpriseTemplates = normalizeSalesMotionTemplateList(
      enterpriseConfig?.templates ?? salesMotionConfig?.templates,
      salesMotionTemplateDefaults.enterprise as any,
    )

    const lotTemplates = normalizeSalesMotionTemplateList(
      lotConfig?.templates ?? salesMotionConfig?.templates,
      salesMotionTemplateDefaults.lot as any,
    )

    editForm.value = {
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      showPaymentConditions: p.showPaymentConditions ?? false,
      customDomain: p.customDomain || '',
      preLaunchEnabled: p.preLaunchEnabled ?? false,
      preLaunchCaptureMode: p.preLaunchCaptureMode || 'QUEUE',
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
      paymentConditions: Array.isArray(p.paymentConditions) ? [...p.paymentConditions] : [],
      salesMotionConfig: {
        enterprise: {
          enabled: enterpriseConfig.enabled ?? salesMotionConfig.enabled ?? false,
          showOnce: enterpriseConfig.showOnce ?? salesMotionConfig.showOnce ?? false,
          intervalSeconds: Number(enterpriseConfig.intervalSeconds ?? salesMotionConfig.intervalSeconds ?? 14),
          displaySeconds: 6,
          maxNotices: Number(enterpriseConfig.maxNotices ?? salesMotionConfig.maxNotices ?? 5),
          templates: enterpriseTemplates,
        },
        lot: {
          enabled: lotConfig.enabled ?? salesMotionConfig.enabled ?? false,
          showOnce: lotConfig.showOnce ?? salesMotionConfig.showOnce ?? false,
          intervalSeconds: Number(lotConfig.intervalSeconds ?? salesMotionConfig.intervalSeconds ?? 14),
          displaySeconds: 6,
          maxNotices: Number(lotConfig.maxNotices ?? salesMotionConfig.maxNotices ?? 5),
          templates: lotTemplates,
        },
      }
    }
    originalSlug.value = p.slug
    loadAiConfigs()
    const parsedHighlightsAndOrder = splitHighlightsAndPublicOrderMeta(p.highlightsJson)
    publicSectionsOrder.value = parsedHighlightsAndOrder.order
    publicSectionsDisabled.value = parsedHighlightsAndOrder.disabled

    pubInfoForm.value = {
      highlightsJson: parsedHighlightsAndOrder.highlights as Highlight[],
      highlightsTitle: p.highlightsTitle || 'Sua família merece o melhor.',
      highlightsSubtitle: p.highlightsSubtitle || 'Qualidade de vida, segurança e infraestrutura completa em um só lugar.',
      traditionalHighlightsTitle: p.traditionalHighlightsTitle || 'Destaques',
      traditionalHighlightsSubtitle: p.traditionalHighlightsSubtitle || 'Diferenciais pensados para o seu bem-estar.',
      locationTitle: extractLocationMeta(p.locationText || '').title,
      locationSubtitle: extractLocationMeta(p.locationText || '').subtitle,
      locationText: extractLocationMeta(p.locationText || '').body,
      startingPrice: p.startingPrice,
      maxInstallments: p.maxInstallments,
      paymentConditionsSummary: p.paymentConditionsSummary || '',
      address: p.address || '',
      googleMapsUrl: p.googleMapsUrl || '',
      youtubeVideoUrl: p.youtubeVideoUrl || '',
      constructionStatus: Array.isArray(p.constructionStatus) ? p.constructionStatus : [],
      legalNotice: p.legalNotice || ''
    }
    projectFooterLogos.value = Array.isArray(p.logos) ? p.logos : []
    projectOgLogoUrl.value = p.ogLogoUrl || null
    initialEditorContent.value = extractLocationMeta(p.locationText || '').body || '<p></p>'
    // Load nearby status
    loadNearbyStatus()
  } catch (e) {
    error.value = 'Não foi possível carregar o projeto.'
    toastFromError(e, 'Erro ao carregar projeto')
  }
  loading.value = false
}

const togglePublish = async () => {
  if (!authStore.canEdit) return
  const action = project.value.status === 'PUBLISHED' ? 'unpublish' : 'publish'
  try {
    project.value = await fetchApi(`/projects/${projectId}/${action}`, { method: 'PATCH' })
    toastSuccess(action === 'publish' ? 'Projeto publicado!' : 'Projeto despublicado')
  } catch (e) {
    toastFromError(e, 'Erro ao alterar publicação')
  }
}

const togglePreLaunchMode = async () => {
  if (!authStore.canEdit || !project.value) return
  if (isArchivedProject.value) {
    toastFromError(new Error('Projeto arquivado está em modo somente leitura.'))
    return
  }

  togglingPreLaunch.value = true
  const nextValue = !(project.value.preLaunchEnabled === true)

  try {
    const updated = await fetchApi(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ preLaunchEnabled: nextValue })
    })

    project.value = updated
    editForm.value.preLaunchEnabled = updated.preLaunchEnabled ?? nextValue
    toastSuccess(nextValue ? 'Pré-lançamento ativado!' : 'Pré-lançamento desativado!')
  } catch (e) {
    toastFromError(e, 'Erro ao atualizar pré-lançamento')
  }

  togglingPreLaunch.value = false
}

const saveSettings = async () => {
  if (!authStore.canEdit) return
  if (isArchivedProject.value) {
    toastFromError(new Error('Projeto arquivado está em modo somente leitura.'))
    return
  }
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
      salesMotionConfig: {
        enterprise: {
          enabled: !!raw.salesMotionConfig?.enterprise?.enabled,
          showOnce: !!raw.salesMotionConfig?.enterprise?.showOnce,
          intervalSeconds: !!raw.salesMotionConfig?.enterprise?.showOnce
            ? 14
            : Math.max(5, Number(raw.salesMotionConfig?.enterprise?.intervalSeconds || 14)),
          displaySeconds: 6,
          maxNotices: !!raw.salesMotionConfig?.enterprise?.showOnce
            ? 1
            : Math.max(1, Number(raw.salesMotionConfig?.enterprise?.maxNotices || 5)),
          templates: (raw.salesMotionConfig?.enterprise?.templates || [])
            .map((tpl: any, idx: number) => ({
              id: String(tpl?.id || `enterprise_${idx + 1}`),
              text: String(tpl?.text || '').trim(),
              enabled: tpl?.enabled !== false,
              manualRangeEnabled: tpl?.manualRangeEnabled === true,
              ranges: normalizeSalesMotionTemplateRanges(tpl?.ranges, String(tpl?.text || '')),
            }))
            .filter((tpl: any) => tpl.text.length > 0),
        },
        lot: {
          enabled: !!raw.salesMotionConfig?.lot?.enabled,
          showOnce: !!raw.salesMotionConfig?.lot?.showOnce,
          intervalSeconds: !!raw.salesMotionConfig?.lot?.showOnce
            ? 14
            : Math.max(5, Number(raw.salesMotionConfig?.lot?.intervalSeconds || 14)),
          displaySeconds: 6,
          maxNotices: !!raw.salesMotionConfig?.lot?.showOnce
            ? 1
            : Math.max(1, Number(raw.salesMotionConfig?.lot?.maxNotices || 5)),
          templates: (raw.salesMotionConfig?.lot?.templates || [])
            .map((tpl: any, idx: number) => ({
              id: String(tpl?.id || `lot_${idx + 1}`),
              text: String(tpl?.text || '').trim(),
              enabled: tpl?.enabled !== false,
              manualRangeEnabled: tpl?.manualRangeEnabled === true,
              ranges: normalizeSalesMotionTemplateRanges(tpl?.ranges, String(tpl?.text || '')),
            }))
            .filter((tpl: any) => tpl.text.length > 0),
        },
      },
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
  if (!authStore.canEdit || isArchivedProject.value) return
  if (!confirm('Tem certeza que deseja excluir este projeto?')) return
  try {
    await fetchApi(`/projects/${projectId}`, { method: 'DELETE' })
    toastSuccess('Projeto excluído!')
    router.push('/painel/projetos')
  } catch (e) {
    toastFromError(e, 'Erro ao excluir projeto')
  }
}

const bannerUrlByDevice = (device: BannerDevice) => {
  if (!project.value) return ''
  if (device === 'mobile') return project.value.bannerImageMobileUrl || ''
  if (device === 'tablet') return project.value.bannerImageTabletUrl || ''
  return project.value.bannerImageUrl || ''
}

const uploadBannerImage = async (e: Event, device: BannerDevice = 'desktop') => {
  if (!authStore.canEdit) return
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingBannerDevice.value = device
  try {
    const fd = new FormData(); fd.append('file', file)
    project.value = await uploadApi(`/projects/${projectId}/banner-image?device=${device}`, fd)
    const deviceLabel = device === 'desktop' ? 'desktop' : device === 'tablet' ? 'tablet' : 'celular'
    toastSuccess(`Banner ${deviceLabel} enviado!`)
  } catch (err) {
    toastFromError(err, 'Erro ao enviar banner')
  }
  (e.target as HTMLInputElement).value = ''
  uploadingBannerDevice.value = null
}

const removeBannerImage = async (device: BannerDevice = 'desktop') => {
  if (!authStore.canEdit) return
  try {
    project.value = await fetchApi(`/projects/${projectId}/banner-image?device=${device}`, { method: 'DELETE' })
    const deviceLabel = device === 'desktop' ? 'desktop' : device === 'tablet' ? 'tablet' : 'celular'
    toastSuccess(`Banner ${deviceLabel} removido`)
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

onBeforeUnmount(() => {
  stopLotImportPolling()
})

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
  display: grid;
  grid-template-columns: minmax(250px, 310px) minmax(0, 1fr);
  gap: 24px;
  align-items: flex-start;
  min-height: calc(100vh - 180px);
}

.archived-project-warning {
  margin: -12px 0 16px;
}

.project-layout.archived-readonly {
  opacity: 0.78;
}

/* Archived mode: keep navigation available, disable only mutations */
.project-layout.archived-readonly .project-content :is(
  input,
  textarea,
  select,
  button,
  .btn,
  .toggle-switch label,
  [contenteditable="true"]
) {
  pointer-events: none !important;
  user-select: none;
}

.project-layout.archived-readonly .project-content :is(input, textarea, select) {
  opacity: 0.72;
}

.project-layout.archived-readonly .sidebar-public-actions,
.project-layout.archived-readonly .sidebar-public-actions button {
  pointer-events: none !important;
  opacity: 0.5;
}

.lot-import-card {
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid var(--glass-border-subtle);
  border-radius: 10px;
  background: var(--glass-bg-heavy);
}

.lot-import-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.lot-import-card__head h4 {
  margin: 0;
  font-size: 0.92rem;
  color: var(--color-surface-100);
}

.lot-import-card__head p {
  margin: 4px 0 0;
  font-size: 0.78rem;
  color: var(--color-surface-400);
}

.lot-import-card__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.lot-import-help {
  margin-top: 10px;
  padding: 10px;
  border-radius: 8px;
  border: 1px dashed var(--glass-border-subtle);
  background: rgba(255, 255, 255, 0.02);
}

.lot-import-help p {
  margin: 0;
  font-size: 0.74rem;
  color: var(--color-surface-300);
}

.lot-import-help p + p {
  margin-top: 6px;
}

.lot-import-status {
  margin-top: 12px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--glass-border-subtle);
  background: rgba(255, 255, 255, 0.03);
}

.lot-import-status__row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 0.76rem;
  color: var(--color-surface-300);
  margin-bottom: 4px;
}

.lot-import-status__message {
  margin: 8px 0 0;
  font-size: 0.75rem;
  color: var(--color-surface-400);
}

.project-sidebar {
  position: sticky;
  top: 16px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
  border-radius: 16px;
  backdrop-filter: blur(12px);
  max-height: calc(100vh - 28px);
  overflow-y: auto;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sidebar-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar-group-title {
  margin: 0;
  padding: 2px 2px 8px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-surface-400);
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.sidebar-group-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-public-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.sidebar-link--public {
  min-width: 0;
  width: 100%;
  padding-right: 10px;
}

.sidebar-link--public .sidebar-label {
  white-space: normal;
  overflow: visible;
  line-height: 1.2;
}

.sidebar-fixed-chip {
  margin-left: 6px;
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--color-surface-400);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid var(--glass-border-subtle);
  border-radius: 999px;
  padding: 2px 7px;
}

.sidebar-public-actions {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 4px;
  justify-content: flex-end;
  padding: 0;
}

.sidebar-toggle-btn {
  border: 1px solid rgba(16, 185, 129, 0.25);
  background: rgba(16, 185, 129, 0.08);
  color: var(--color-primary-300, #6ee7b7);
  border-radius: 999px;
  padding: 2px 8px;
  height: 21px;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  white-space: nowrap;
}

.sidebar-toggle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sidebar-order-btn {
  width: 20px;
  height: 20px;
  border: 1px solid var(--glass-border-subtle);
  background: var(--glass-bg-heavy);
  color: var(--color-surface-300);
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  transition: all 0.15s ease;
}

.sidebar-order-btn:hover:not(:disabled) {
  border-color: var(--color-primary-500);
  color: var(--color-primary-400, #34d399);
}

.sidebar-order-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
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
  background: rgba(16, 185, 129, 0.14);
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

.sidebar-tools {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar-tools-title {
  margin: 0;
  padding: 2px 2px 8px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-surface-300);
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.sidebar-tool-link {
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
  background: none;
  border: none;
}

.sidebar-tool-link--primary {
  border: none;
  background: none;
  color: inherit;
  font-weight: inherit;
}

.sidebar-tool-link:hover {
  background: var(--glass-bg-heavy);
  color: var(--color-surface-200);
}

.sidebar-tool-link.active {
  border: none;
  color: var(--color-primary-400, #34d399);
  background: rgba(16, 185, 129, 0.14);
  font-weight: 700;
}

.sidebar-tool-link .sidebar-icon {
  width: 20px;
  height: auto;
  border-radius: 0;
  display: inline-block;
  background: none;
  color: inherit;
}

.sidebar-tool-link:hover .sidebar-icon,
.sidebar-tool-link.active .sidebar-icon {
  background: none;
  color: inherit;
}

.project-content {
  flex: 1;
  min-width: 0;
  width: 100%;
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
    grid-template-columns: 1fr;
  }
  .project-sidebar {
    position: static;
    max-height: none;
    overflow: visible;
    gap: 10px;
    padding: 12px;
    border-radius: 12px;
  }
  .sidebar-nav {
    gap: 10px;
  }
  .sidebar-group-title {
    padding: 2px 2px 6px;
    font-size: 0.64rem;
  }
  .sidebar-tools-title {
    padding: 2px 2px 6px;
    font-size: 0.64rem;
  }
  .sidebar-group-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 4px;
  }
  .sidebar-public-row {
    display: block;
  }
  .sidebar-public-actions {
    display: none;
  }
  .sidebar-link {
    padding: 6px 10px;
    font-size: 0.75rem;
  }
  .sidebar-tools {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
  appearance: none;
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

.pub-banner-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  max-width: 820px;
}

.pub-banner-item {
  border: 1px solid var(--glass-border-subtle);
  border-radius: 10px;
  padding: 12px;
  background: var(--glass-bg-heavy);
}

.pub-banner-item__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.pub-banner-item__head strong {
  font-size: 0.84rem;
  color: var(--color-surface-200);
}

.pub-banner-item__head span {
  font-size: 0.72rem;
  color: var(--color-surface-500);
}

.pub-banner-preview {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--glass-border-subtle);
  aspect-ratio: 16 / 5;
  margin-bottom: 10px;
}

.pub-banner-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pub-banner-empty {
  border: 1px dashed var(--glass-border-subtle);
  background: var(--glass-bg);
  border-radius: 8px;
  padding: 16px 12px;
  margin-bottom: 10px;
  text-align: center;
  color: var(--color-surface-500);
  font-size: 0.74rem;
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
