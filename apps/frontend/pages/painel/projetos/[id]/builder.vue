<template>
  <div class="pb-builder" @keydown.esc="selectedSectionId = null" tabindex="-1">

    <!-- ── Header ──────────────────────────────────────────────────────── -->
    <header class="pb-header">
      <div class="pb-header-left">
        <NuxtLink :to="`/painel/projetos/${projectId}`" class="pb-back-btn">
          <i class="bi bi-arrow-left" aria-hidden="true"></i>
          <span>{{ project?.name || 'Voltar' }}</span>
        </NuxtLink>
        <div class="pb-header-divider"></div>
        <span class="pb-header-title">
          <i class="bi bi-grid-1x2-fill" aria-hidden="true"></i> Page Builder
        </span>
      </div>

      <div class="pb-header-center">
        <div class="pb-device-tabs">
          <button
            v-for="d in devices"
            :key="d.id"
            class="pb-device-btn"
            :class="{ active: previewDevice === d.id }"
            :title="d.label"
            @click="previewDevice = d.id"
          >
            <i :class="d.icon" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div class="pb-header-right">
        <span v-if="isDirty" class="pb-unsaved-pill">
          <i class="bi bi-circle-fill" style="font-size:6px;"></i>
          Não salvo
        </span>
        <a
          v-if="project?.status === 'PUBLISHED'"
          :href="`/${project.slug}`"
          target="_blank"
          class="pb-btn pb-btn-ghost"
        >
          <i class="bi bi-eye" aria-hidden="true"></i>
          Ver site
        </a>
        <button class="pb-btn pb-btn-primary" :disabled="saving" @click="saveLayout">
          <i class="bi bi-floppy-fill" aria-hidden="true"></i>
          {{ saving ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </header>

    <!-- ── 3-Column layout ─────────────────────────────────────────────── -->
    <div class="pb-layout">

      <!-- Left: Section list + Add free section ──────────────────────── -->
      <aside class="pb-sidebar-left">
        <!-- Add free sections -->
        <div class="pb-sidebar-section">
          <p class="pb-sidebar-label">Adicionar seção</p>
          <div class="pb-widget-list">
            <button
              v-for="w in FREE_SECTIONS"
              :key="w.type"
              class="pb-widget-item"
              @click="addFreeSection(w.type as SectionType)"
            >
              <i :class="`bi ${w.icon}`" aria-hidden="true"></i>
              <span>{{ w.label }}</span>
            </button>
          </div>
        </div>

        <!-- DnD section list -->
        <div class="pb-sidebar-section" style="margin-top: 16px;">
          <p class="pb-sidebar-label">Seções</p>
          <VueDraggable
            v-model="sections"
            :animation="200"
            handle=".pb-row-handle"
            ghost-class="pb-row-ghost"
            @end="onReorder"
          >
            <div
              v-for="sec in sections"
              :key="sec.id"
              class="pb-section-row"
              :class="{
                'pb-section-row--selected': selectedSectionId === sec.id,
                'pb-section-row--hidden': !sec.visible,
              }"
              @click.stop="selectSection(sec.id)"
            >
              <div class="pb-row-handle" title="Arrastar para reordenar">
                <i class="bi bi-grip-vertical" aria-hidden="true"></i>
              </div>
              <div class="pb-row-icon">
                <i :class="`bi ${getSectionMeta(sec.type)?.icon || 'bi-square'}`" aria-hidden="true"></i>
              </div>
              <div class="pb-row-label">{{ getSectionMeta(sec.type)?.label || sec.type }}</div>
              <div class="pb-row-actions">
                <button
                  class="pb-row-btn"
                  :title="sec.visible ? 'Ocultar' : 'Exibir'"
                  @click.stop="toggleVisibility(sec.id)"
                >
                  <i :class="sec.visible ? 'bi bi-eye-fill' : 'bi bi-eye-slash'" aria-hidden="true"></i>
                </button>
                <button
                  v-if="isFreeSection(sec.type)"
                  class="pb-row-btn pb-row-btn--danger"
                  title="Remover seção"
                  @click.stop="removeSection(sec.id)"
                >
                  <i class="bi bi-trash" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </VueDraggable>
        </div>
      </aside>

      <!-- Center: Live preview ─────────────────────────────────────────── -->
      <main class="pb-canvas" :class="`pb-canvas--${previewDevice}`">
        <div class="pb-canvas-inner">
          <div v-if="loading" class="pb-loading-state">
            <div class="loading-spinner"></div>
            <p>Carregando projeto...</p>
          </div>
          <ProjectLandingView
            v-else-if="project"
            :projectProp="project"
            :sectionsProp="sections"
            :editMode="true"
            :selectedId="selectedSectionId"
            @sectionClick="onSectionClick"
            @textUpdate="onTextUpdate"
          />
        </div>
      </main>

      <!-- Right: Properties panel ─────────────────────────────────────── -->
      <aside class="pb-sidebar-right">
        <div v-if="!selectedSection" class="pb-props-empty">
          <i class="bi bi-cursor-fill" aria-hidden="true" style="font-size: 32px; opacity: 0.2;"></i>
          <p>Clique em uma seção no preview ou na lista para editar.</p>
        </div>

        <template v-else>
          <!-- Section header -->
          <div class="pb-props-header">
            <i :class="`bi ${getSectionMeta(selectedSection.type)?.icon || 'bi-square'}`" aria-hidden="true"></i>
            <span>{{ getSectionMeta(selectedSection.type)?.label || selectedSection.type }}</span>
          </div>

          <!-- Tabs: only for widget sections -->
          <div v-if="!isFreeSection(selectedSection.type)" class="pb-tabs">
            <button
              class="pb-tab-btn"
              :class="{ active: activeTab === 'content' }"
              @click="activeTab = 'content'"
            >Conteúdo</button>
            <button
              class="pb-tab-btn"
              :class="{ active: activeTab === 'appearance' }"
              @click="activeTab = 'appearance'"
            >Aparência</button>
          </div>

          <div class="pb-props-body">

            <!-- ─────────────────────────────────────────────────────────
                 CONTENT TAB (widget sections only)
            ───────────────────────────────────────────────────────────── -->
            <template v-if="activeTab === 'content' && !isFreeSection(selectedSection.type)">

              <!-- HERO: banner upload -->
              <template v-if="selectedSection.type === 'hero'">
                <p class="pb-field-group-label">Banner de Fundo</p>
                <div class="pb-field">
                  <label class="pb-field-label">Desktop (&gt; 1024px)</label>
                  <div v-if="project.bannerImageUrl" class="pb-banner-preview">
                    <img :src="project.bannerImageUrl" alt="Banner desktop" />
                    <button class="pb-banner-remove" title="Remover" @click="removeBannerImage('desktop')">×</button>
                  </div>
                  <label class="pb-upload-btn">
                    <i class="bi bi-upload" aria-hidden="true"></i>
                    {{ uploadingBannerDevice === 'desktop' ? 'Enviando...' : 'Enviar imagem' }}
                    <input type="file" accept="image/*" style="display:none" :disabled="!!uploadingBannerDevice" @change="uploadBannerImage($event, 'desktop')" />
                  </label>
                </div>
                <div class="pb-field">
                  <label class="pb-field-label">Tablet (769px–1024px)</label>
                  <div v-if="project.bannerImageTabletUrl" class="pb-banner-preview">
                    <img :src="project.bannerImageTabletUrl" alt="Banner tablet" />
                    <button class="pb-banner-remove" @click="removeBannerImage('tablet')">×</button>
                  </div>
                  <label class="pb-upload-btn">
                    <i class="bi bi-upload" aria-hidden="true"></i>
                    {{ uploadingBannerDevice === 'tablet' ? 'Enviando...' : 'Enviar imagem' }}
                    <input type="file" accept="image/*" style="display:none" :disabled="!!uploadingBannerDevice" @change="uploadBannerImage($event, 'tablet')" />
                  </label>
                </div>
                <div class="pb-field">
                  <label class="pb-field-label">Mobile (≤ 768px)</label>
                  <div v-if="project.bannerImageMobileUrl" class="pb-banner-preview">
                    <img :src="project.bannerImageMobileUrl" alt="Banner mobile" />
                    <button class="pb-banner-remove" @click="removeBannerImage('mobile')">×</button>
                  </div>
                  <label class="pb-upload-btn">
                    <i class="bi bi-upload" aria-hidden="true"></i>
                    {{ uploadingBannerDevice === 'mobile' ? 'Enviando...' : 'Enviar imagem' }}
                    <input type="file" accept="image/*" style="display:none" :disabled="!!uploadingBannerDevice" @change="uploadBannerImage($event, 'mobile')" />
                  </label>
                </div>
              </template>

              <!-- INFO: description + highlights -->
              <template v-else-if="selectedSection.type === 'info'">
                <p class="pb-field-group-label">Texto Descritivo</p>
                <div class="pb-field">
                  <label class="pb-field-label">Título</label>
                  <input v-model="project.locationTitle" class="pb-field-input" placeholder="Sobre o empreendimento" @input="markDirty" />
                </div>
                <div class="pb-field">
                  <label class="pb-field-label">Subtítulo</label>
                  <input v-model="project.locationSubtitle" class="pb-field-input" placeholder="Localização estratégica..." @input="markDirty" />
                </div>
                <div class="pb-field">
                  <label class="pb-field-label">Conteúdo (HTML)</label>
                  <textarea v-model="project.locationText" class="pb-field-input pb-field-textarea" rows="5" placeholder="<p>Texto...</p>" @input="markDirty"></textarea>
                </div>
                <p class="pb-field-group-label" style="margin-top:12px;">Infraestrutura</p>
                <div class="pb-field">
                  <label class="pb-field-label">Título</label>
                  <input v-model="project.highlightsTitle" class="pb-field-input" placeholder="Sua família merece o melhor." @input="markDirty" />
                </div>
                <div class="pb-field">
                  <label class="pb-field-label">Subtítulo</label>
                  <input v-model="project.highlightsSubtitle" class="pb-field-input" placeholder="Qualidade de vida..." @input="markDirty" />
                </div>
                <button class="pb-save-content-btn" :disabled="savingContent" @click="saveContent(['locationTitle','locationSubtitle','locationText','highlightsTitle','highlightsSubtitle','highlightsJson'])">
                  {{ savingContent ? 'Salvando...' : 'Salvar conteúdo' }}
                </button>
              </template>

              <!-- TRADITIONAL HIGHLIGHTS: destaques -->
              <template v-else-if="selectedSection.type === 'traditional_highlights'">
                <p class="pb-field-group-label">Destaques</p>
                <div class="pb-field">
                  <label class="pb-field-label">Título</label>
                  <input v-model="project.traditionalHighlightsTitle" class="pb-field-input" placeholder="Destaques" @input="markDirty" />
                </div>
                <div class="pb-field">
                  <label class="pb-field-label">Subtítulo</label>
                  <input v-model="project.traditionalHighlightsSubtitle" class="pb-field-input" placeholder="Diferenciais pensados para..." @input="markDirty" />
                </div>
                <p class="pb-field-group-label" style="margin-top:8px;">Itens</p>
                <div v-for="(h, i) in traditionalHighlightItems" :key="i" class="pb-list-item">
                  <div class="pb-list-item-fields">
                    <input v-model="h.label" class="pb-field-input" placeholder="Label" @input="markDirty" />
                    <input v-model="h.value" class="pb-field-input" placeholder="Valor (opcional)" @input="markDirty" style="margin-top:4px;" />
                  </div>
                  <button class="pb-row-btn pb-row-btn--danger" @click="removeHighlight(i)">
                    <i class="bi bi-trash" aria-hidden="true"></i>
                  </button>
                </div>
                <button class="pb-add-item-btn" @click="addHighlight">+ Adicionar destaque</button>
                <button class="pb-save-content-btn" :disabled="savingContent" @click="saveContent(['traditionalHighlightsTitle','traditionalHighlightsSubtitle','highlightsJson'])">
                  {{ savingContent ? 'Salvando...' : 'Salvar destaques' }}
                </button>
              </template>

              <!-- VIDEO: youtube url -->
              <template v-else-if="selectedSection.type === 'video'">
                <p class="pb-field-group-label">Vídeo</p>
                <div class="pb-field">
                  <label class="pb-field-label">URL do YouTube</label>
                  <input v-model="project.youtubeVideoUrl" class="pb-field-input" placeholder="https://www.youtube.com/watch?v=..." @input="markDirty" />
                  <span class="pb-field-hint">Cole qualquer link do YouTube</span>
                </div>
                <button class="pb-save-content-btn" :disabled="savingContent" @click="saveContent(['youtubeVideoUrl'])">
                  {{ savingContent ? 'Salvando...' : 'Salvar' }}
                </button>
              </template>

              <!-- CONSTRUCTION: items -->
              <template v-else-if="selectedSection.type === 'construction'">
                <p class="pb-field-group-label">Etapas de Obras</p>
                <div v-for="(item, i) in constructionItems" :key="i" class="pb-list-item">
                  <div class="pb-list-item-fields" style="flex:1;">
                    <input v-model="item.label" class="pb-field-input" placeholder="Ex: Terraplanagem" @input="markDirty" />
                    <div class="pb-range-row" style="margin-top:6px;">
                      <input type="range" v-model.number="item.percentage" min="0" max="100" step="1" class="pb-range" @input="markDirty" />
                      <span class="pb-range-val">{{ item.percentage }}%</span>
                    </div>
                  </div>
                  <button class="pb-row-btn pb-row-btn--danger" style="margin-top:0; align-self:flex-start;" @click="removeConstructionItem(Number(i))">
                    <i class="bi bi-trash" aria-hidden="true"></i>
                  </button>
                </div>
                <button class="pb-add-item-btn" @click="addConstructionItem">+ Adicionar etapa</button>
                <button class="pb-save-content-btn" :disabled="savingContent" @click="saveContent(['constructionStatus'])">
                  {{ savingContent ? 'Salvando...' : 'Salvar obras' }}
                </button>
              </template>

              <!-- GALLERY: media upload -->
              <template v-else-if="selectedSection.type === 'gallery'">
                <p class="pb-field-group-label">Galeria de Mídia</p>
                <label class="pb-upload-btn" style="margin-bottom:12px;">
                  <i class="bi bi-upload" aria-hidden="true"></i>
                  {{ uploadingMedia ? 'Enviando...' : 'Adicionar foto/vídeo' }}
                  <input type="file" accept="image/*,video/*" multiple style="display:none" :disabled="uploadingMedia" @change="uploadGalleryMedia" />
                </label>
                <div class="pb-gallery-grid">
                  <div v-for="m in (project.projectMedias || [])" :key="m.id" class="pb-gallery-thumb">
                    <img v-if="m.type === 'PHOTO'" :src="m.url" alt="" />
                    <video v-else :src="m.url" />
                    <button class="pb-gallery-delete" title="Remover" @click="deleteMedia(m.id)">×</button>
                  </div>
                </div>
              </template>

              <!-- LOCATION -->
              <template v-else-if="selectedSection.type === 'location'">
                <p class="pb-field-group-label">Localização</p>
                <div class="pb-field">
                  <label class="pb-field-label">Endereço</label>
                  <input v-model="project.address" class="pb-field-input" placeholder="Av. Brasil, 1000 - Centro" @input="markDirty" />
                </div>
                <div class="pb-field">
                  <label class="pb-field-label">Google Maps (URL ou embed)</label>
                  <input v-model="project.googleMapsUrl" class="pb-field-input" placeholder="Link ou iframe do Google Maps" @input="markDirty" />
                </div>
                <button class="pb-save-content-btn" :disabled="savingContent" @click="saveContent(['address','googleMapsUrl'])">
                  {{ savingContent ? 'Salvando...' : 'Salvar localização' }}
                </button>
              </template>

              <!-- NEARBY -->
              <template v-else-if="selectedSection.type === 'nearby'">
                <p class="pb-field-group-label">Proximidades</p>
                <div class="pb-field">
                  <label class="pb-toggle-label">
                    <input type="checkbox" v-model="nearbyEnabled" @change="toggleNearby" />
                    <span>Ativar mapa de proximidades</span>
                  </label>
                </div>
                <div v-if="nearbyStatus" class="pb-field">
                  <p class="pb-field-hint">
                    Status: {{ nearbyStatus.status }} · {{ nearbyStatus.itemCount || 0 }} pontos encontrados
                  </p>
                </div>
                <button class="pb-save-content-btn" :disabled="nearbyRegenerating" @click="regenerateNearby">
                  <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
                  {{ nearbyRegenerating ? 'Gerando...' : 'Regerar proximidades' }}
                </button>
              </template>

              <!-- LEGAL NOTICE -->
              <template v-else-if="selectedSection.type === 'legal_notice'">
                <p class="pb-field-group-label">Aviso Legal</p>
                <div class="pb-field">
                  <label class="pb-field-label">Texto do aviso</label>
                  <textarea v-model="project.legalNotice" class="pb-field-input pb-field-textarea" rows="7" placeholder="Loteamento aprovado pela Prefeitura..." @input="markDirty"></textarea>
                </div>
                <button class="pb-save-content-btn" :disabled="savingContent" @click="saveContent(['legalNotice'])">
                  {{ savingContent ? 'Salvando...' : 'Salvar' }}
                </button>
              </template>

              <!-- PAYMENT CONDITIONS -->
              <template v-else-if="selectedSection.type === 'payment_conditions'">
                <p class="pb-field-group-label">Preços e Condições</p>
                <div class="pb-field">
                  <label class="pb-field-label">Preço inicial (R$)</label>
                  <input v-model.number="project.startingPrice" type="number" class="pb-field-input" placeholder="144000" @input="markDirty" />
                </div>
                <div class="pb-field">
                  <label class="pb-field-label">Máximo de parcelas</label>
                  <input v-model.number="project.maxInstallments" type="number" class="pb-field-input" placeholder="180" @input="markDirty" />
                </div>
                <div class="pb-field">
                  <label class="pb-field-label">Resumo das condições</label>
                  <input v-model="project.paymentConditionsSummary" class="pb-field-input" placeholder="Entrada em 6x, saldo em 120 meses." @input="markDirty" />
                </div>
                <button class="pb-save-content-btn" :disabled="savingContent" @click="saveContent(['startingPrice','maxInstallments','paymentConditionsSummary'])">
                  {{ savingContent ? 'Salvando...' : 'Salvar' }}
                </button>
              </template>

              <!-- Fallback for widget sections with no content tab -->
              <template v-else>
                <div style="padding: 24px 0; text-align: center;">
                  <p class="pb-field-hint">Sem configurações de conteúdo para esta seção.<br>Use a aba Aparência para personalizar.</p>
                </div>
              </template>
            </template>

            <!-- ─────────────────────────────────────────────────────────
                 APPEARANCE TAB (widget) + ALL FIELDS (free sections)
            ───────────────────────────────────────────────────────────── -->
            <template v-if="activeTab === 'appearance' || isFreeSection(selectedSection.type)">

              <!-- Free section: image upload (text_image + image_block) -->
              <template v-if="selectedSection.type === 'text_image' || selectedSection.type === 'image_block'">
                <p class="pb-field-group-label">Imagem</p>
                <div v-if="selectedSection.config.imageUrl" class="pb-banner-preview" style="margin-bottom:8px;">
                  <img :src="selectedSection.config.imageUrl" alt="Imagem" />
                  <button class="pb-banner-remove" @click="selectedSection.config.imageUrl = ''; markDirty()">×</button>
                </div>
                <label class="pb-upload-btn" style="margin-bottom:12px;">
                  <i class="bi bi-upload" aria-hidden="true"></i>
                  {{ uploadingSectionImage ? 'Enviando...' : 'Enviar imagem' }}
                  <input type="file" accept="image/*" style="display:none" :disabled="uploadingSectionImage" @change="uploadSectionImage" />
                </label>
                <div class="pb-field">
                  <label class="pb-field-label">Alt da imagem</label>
                  <input v-model="selectedSection.config.imageAlt" class="pb-field-input" placeholder="Descrição da imagem" @input="markDirty" />
                </div>
                <div v-if="selectedSection.type === 'text_image'" class="pb-field">
                  <label class="pb-field-label">Posição da imagem</label>
                  <div class="pb-align-btns">
                    <button v-for="pos in ['left','right']" :key="pos" class="pb-align-btn"
                      :class="{ active: (selectedSection.config.imagePosition || 'right') === pos }"
                      @click="selectedSection.config.imagePosition = pos; markDirty()">
                      {{ pos === 'left' ? 'Esquerda' : 'Direita' }}
                    </button>
                  </div>
                </div>
                <div v-if="selectedSection.type === 'image_block'" class="pb-field">
                  <label class="pb-field-label">Largura</label>
                  <div class="pb-align-btns">
                    <button v-for="w in ['narrow','normal','wide','full']" :key="w" class="pb-align-btn"
                      :class="{ active: (selectedSection.config.width || 'normal') === w }"
                      @click="selectedSection.config.width = w; markDirty()">
                      {{ { narrow:'Estr.', normal:'Normal', wide:'Larg.', full:'Full' }[w] }}
                    </button>
                  </div>
                </div>
                <div v-if="selectedSection.type === 'image_block'" class="pb-field">
                  <label class="pb-field-label">Legenda</label>
                  <input v-model="selectedSection.config.caption" class="pb-field-input" placeholder="Legenda opcional" @input="markDirty" />
                </div>
                <div v-if="selectedSection.type === 'image_block'" class="pb-field">
                  <label class="pb-field-label">Link (opcional)</label>
                  <input v-model="selectedSection.config.linkUrl" class="pb-field-input" placeholder="https://..." @input="markDirty" />
                </div>
              </template>

              <!-- Common: Title / Subtitle / Align -->
              <template v-if="hasField(selectedSection.type, 'title')">
                <p v-if="isFreeSection(selectedSection.type)" class="pb-field-group-label">Texto</p>
                <div class="pb-field">
                  <label class="pb-field-label">Título</label>
                  <input v-model="selectedSection.config.title" class="pb-field-input" :placeholder="titlePlaceholder(selectedSection.type)" @input="markDirty" />
                </div>
              </template>

              <template v-if="hasField(selectedSection.type, 'subtitle')">
                <div class="pb-field">
                  <label class="pb-field-label">Subtítulo</label>
                  <textarea v-model="selectedSection.config.subtitle" class="pb-field-input pb-field-textarea" rows="2" placeholder="Subtítulo..." @input="markDirty"></textarea>
                </div>
              </template>

              <template v-if="hasField(selectedSection.type, 'titleAlign')">
                <div class="pb-field">
                  <label class="pb-field-label">Alinhamento do título</label>
                  <div class="pb-align-btns">
                    <button v-for="a in ['left','center','right']" :key="a" class="pb-align-btn"
                      :class="{ active: (selectedSection.config.titleAlign || 'left') === a }"
                      @click="setAlign(a)">
                      <i :class="`bi bi-text-${a}`" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              </template>

              <!-- Free: content HTML textarea -->
              <template v-if="selectedSection.type === 'text' || selectedSection.type === 'text_image'">
                <div class="pb-field">
                  <label class="pb-field-label">Conteúdo (HTML)</label>
                  <textarea v-model="selectedSection.config.content" class="pb-field-input pb-field-textarea" rows="6" placeholder="<p>Seu texto aqui...</p>" @input="markDirty"></textarea>
                </div>
              </template>

              <!-- Hero-specific: buttons + overlay -->
              <template v-if="selectedSection.type === 'hero'">
                <p class="pb-field-group-label">Botões</p>
                <div class="pb-field">
                  <label class="pb-field-label">Botão 1</label>
                  <input v-model="selectedSection.config.btnPrimaryText" class="pb-field-input" placeholder="Ver Planta Interativa" @input="markDirty" />
                </div>
                <div class="pb-field">
                  <label class="pb-field-label">Botão 2</label>
                  <input v-model="selectedSection.config.btnSecondaryText" class="pb-field-input" placeholder="Agendar Visita" @input="markDirty" />
                </div>
                <div class="pb-field">
                  <label class="pb-field-label">Botão 3</label>
                  <input v-model="selectedSection.config.btnTertiaryText" class="pb-field-input" placeholder="Solicitar informações" @input="markDirty" />
                </div>
                <p class="pb-field-group-label">Overlay</p>
                <div class="pb-field">
                  <label class="pb-field-label">Cor do overlay</label>
                  <div class="pb-color-row">
                    <input type="color" v-model="selectedSection.config.overlayColor" class="pb-color-input" @input="markDirty" />
                    <input v-model="selectedSection.config.overlayColor" class="pb-field-input" placeholder="#000000" @input="markDirty" />
                  </div>
                </div>
                <div class="pb-field">
                  <label class="pb-field-label">Opacidade ({{ selectedSection.config.overlayOpacity ?? 0.5 }})</label>
                  <input type="range" v-model.number="selectedSection.config.overlayOpacity" min="0" max="1" step="0.05" class="pb-range" @input="markDirty" />
                </div>
                <div class="pb-field">
                  <label class="pb-toggle-label">
                    <input type="checkbox"
                      :checked="selectedSection.config.showStats !== false"
                      @change="selectedSection.config.showStats = ($event.target as HTMLInputElement).checked; markDirty()" />
                    <span>Mostrar estatísticas no hero</span>
                  </label>
                </div>
              </template>

              <!-- CTA: badge -->
              <template v-if="selectedSection.type === 'cta'">
                <div class="pb-field">
                  <label class="pb-field-label">Etiqueta</label>
                  <input v-model="selectedSection.config.badge" class="pb-field-input" placeholder="Oportunidade única" @input="markDirty" />
                </div>
              </template>

              <!-- plant_map: height -->
              <template v-if="selectedSection.type === 'plant_map'">
                <div class="pb-field">
                  <label class="pb-field-label">Altura do mapa (px)</label>
                  <input v-model.number="selectedSection.config.mapHeight" type="number" class="pb-field-input" min="300" max="900" step="10" @input="markDirty" />
                </div>
              </template>

              <!-- gallery: columns -->
              <template v-if="selectedSection.type === 'gallery'">
                <div class="pb-field">
                  <label class="pb-field-label">Colunas</label>
                  <div class="pb-align-btns">
                    <button v-for="c in [2, 3, 4]" :key="c" class="pb-align-btn"
                      :class="{ active: (selectedSection.config.columns || 3) === c }"
                      @click="selectedSection.config.columns = c; markDirty()">{{ c }}</button>
                  </div>
                </div>
              </template>

              <!-- text: titleSize + contentAlign -->
              <template v-if="selectedSection.type === 'text'">
                <div class="pb-field">
                  <label class="pb-field-label">Tamanho do título</label>
                  <div class="pb-align-btns">
                    <button v-for="s in ['sm','md','lg','xl']" :key="s" class="pb-align-btn"
                      :class="{ active: (selectedSection.config.titleSize || 'lg') === s }"
                      @click="selectedSection.config.titleSize = s; markDirty()">{{ s.toUpperCase() }}</button>
                  </div>
                </div>
                <div class="pb-field">
                  <label class="pb-field-label">Alinhamento do conteúdo</label>
                  <div class="pb-align-btns">
                    <button v-for="a in ['left','center','right']" :key="a" class="pb-align-btn"
                      :class="{ active: (selectedSection.config.contentAlign || 'center') === a }"
                      @click="selectedSection.config.contentAlign = a; markDirty()">
                      <i :class="`bi bi-text-${a}`" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              </template>

              <!-- ── Background / Text color ──────────────────────────── -->
              <p class="pb-field-group-label" style="margin-top: 16px;">Fundo</p>
              <div class="pb-field">
                <label class="pb-field-label">Cor de fundo</label>
                <div class="pb-color-row">
                  <input type="color" v-model="selectedSection.config.bgColor" class="pb-color-input" @input="onBgColorChange" />
                  <input v-model="selectedSection.config.bgColor" class="pb-field-input" placeholder="#rrggbb" @input="onBgColorChange" />
                  <button v-if="selectedSection.config.bgColor" class="pb-clear-btn" @click="selectedSection.config.bgColor = undefined; markDirty()">×</button>
                </div>
              </div>
              <div class="pb-field">
                <label class="pb-field-label">Gradiente CSS</label>
                <input v-model="selectedSection.config.bgGradient" class="pb-field-input" placeholder="linear-gradient(135deg,#0071e3,#00c3ff)" @input="markDirty" />
              </div>
              <div class="pb-field">
                <label class="pb-field-label">Cor do texto</label>
                <div class="pb-color-row">
                  <input type="color" v-model="selectedSection.config.textColor" class="pb-color-input" @input="markDirty" />
                  <input v-model="selectedSection.config.textColor" class="pb-field-input" placeholder="#rrggbb" @input="markDirty" />
                  <button v-if="selectedSection.config.textColor" class="pb-clear-btn" @click="selectedSection.config.textColor = undefined; markDirty()">×</button>
                </div>
              </div>

              <!-- ── Spacing ──────────────────────────────────────────── -->
              <p class="pb-field-group-label">Espaçamento</p>
              <div class="pb-field">
                <label class="pb-field-label">Padding topo</label>
                <div class="pb-align-btns">
                  <button v-for="p in paddingOptions" :key="p.value" class="pb-align-btn"
                    :class="{ active: (selectedSection.config.paddingTop || 'lg') === p.value }"
                    @click="selectedSection.config.paddingTop = p.value; markDirty()">{{ p.label }}</button>
                </div>
              </div>
              <div class="pb-field">
                <label class="pb-field-label">Padding base</label>
                <div class="pb-align-btns">
                  <button v-for="p in paddingOptions" :key="p.value" class="pb-align-btn"
                    :class="{ active: (selectedSection.config.paddingBottom || 'lg') === p.value }"
                    @click="selectedSection.config.paddingBottom = p.value; markDirty()">{{ p.label }}</button>
                </div>
              </div>
            </template>

          </div><!-- /pb-props-body -->
        </template>
      </aside>
    </div><!-- /pb-layout -->
  </div><!-- /pb-builder -->
</template>

<script setup lang="ts">
definePageMeta({ layout: 'editor' })

import { VueDraggable } from 'vue-draggable-plus'
import {
  resolveSectionsLayout,
  reorderSections,
  generateSectionId,
  SECTION_META,
  FREE_SECTIONS,
  DEFAULT_CONFIGS,
  type PageSection,
  type SectionType,
} from '~/utils/page-builder'
import { useApi } from '~/composables/useApi'
import ProjectLandingView from '~/components/ProjectLandingView.vue'

// ─── Route / API ────────────────────────────────────────────────────────────

const route = useRoute()
const { fetchApi, uploadApi } = useApi()
const { success: toastSuccess, error: toastError } = useToast()
const projectId = computed(() => route.params.id as string)

// ─── State ───────────────────────────────────────────────────────────────────

const loading = ref(true)
const saving = ref(false)
const savingContent = ref(false)
const isDirty = ref(false)
const project = ref<any>(null)
const sections = ref<PageSection[]>([])
const selectedSectionId = ref<string | null>(null)
const activeTab = ref<'content' | 'appearance'>('content')

// Nearby
const nearbyEnabled = ref(false)
const nearbyStatus = ref<any>(null)
const nearbyRegenerating = ref(false)

// Upload states
const uploadingBannerDevice = ref<string | null>(null)
const uploadingMedia = ref(false)
const uploadingSectionImage = ref(false)

const selectedSection = computed<PageSection | null>(() =>
  sections.value.find((s) => s.id === selectedSectionId.value) ?? null
)

// ─── Device preview ──────────────────────────────────────────────────────────

const devices: { id: 'desktop' | 'tablet' | 'mobile'; label: string; icon: string }[] = [
  { id: 'desktop', label: 'Desktop', icon: 'bi bi-display' },
  { id: 'tablet',  label: 'Tablet',  icon: 'bi bi-tablet' },
  { id: 'mobile',  label: 'Mobile',  icon: 'bi bi-phone' },
]
const previewDevice = ref<'desktop' | 'tablet' | 'mobile'>('desktop')

// ─── Options ─────────────────────────────────────────────────────────────────

const paddingOptions = [
  { value: 'none', label: 'Nenhum' },
  { value: 'sm',   label: 'P' },
  { value: 'md',   label: 'M' },
  { value: 'lg',   label: 'G' },
  { value: 'xl',   label: 'XG' },
]

// ─── Reactive arrays for construction / highlights ────────────────────────────

const traditionalHighlightItems = computed({
  get: () => {
    const raw = project.value?.highlightsJson
    if (!Array.isArray(raw)) return []
    return raw.filter((h: any) => h.type === 'highlight' || !h.type)
  },
  set: (val: any[]) => {
    const raw = project.value?.highlightsJson
    const cats = Array.isArray(raw) ? raw.filter((h: any) => h.type === 'category') : []
    if (project.value) project.value.highlightsJson = [...cats, ...val]
  },
})

const constructionItems = computed({
  get: () => project.value?.constructionStatus ?? [],
  set: (val: any[]) => { if (project.value) project.value.constructionStatus = val },
})

function addHighlight() {
  const raw = project.value?.highlightsJson
  const list = Array.isArray(raw) ? [...raw] : []
  list.push({ type: 'highlight', label: '', value: '' })
  if (project.value) project.value.highlightsJson = list
  markDirty()
}

function removeHighlight(i: number) {
  const items = [...traditionalHighlightItems.value]
  items.splice(i, 1)
  traditionalHighlightItems.value = items
  markDirty()
}

function addConstructionItem() {
  const list = [...(project.value?.constructionStatus ?? [])]
  list.push({ label: '', percentage: 0 })
  if (project.value) project.value.constructionStatus = list
  markDirty()
}

function removeConstructionItem(i: number) {
  const list = [...(project.value?.constructionStatus ?? [])]
  list.splice(i, 1)
  if (project.value) project.value.constructionStatus = list
  markDirty()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSectionMeta(type: SectionType) {
  return SECTION_META.find((m) => m.type === type)
}

function isFreeSection(type: SectionType): boolean {
  return type === 'text' || type === 'text_image' || type === 'image_block'
}

function hasField(type: SectionType, field: string): boolean {
  const noTitle: SectionType[]    = ['legal_notice', 'image_block']
  const noSubtitle: SectionType[] = ['legal_notice', 'image_block', 'construction', 'hero']
  const noAlign: SectionType[]    = ['legal_notice', 'image_block', 'hero']
  if (field === 'title')      return !noTitle.includes(type)
  if (field === 'subtitle')   return !noSubtitle.includes(type)
  if (field === 'titleAlign') return !noAlign.includes(type)
  return false
}

function titlePlaceholder(type: SectionType): string {
  const map: Partial<Record<SectionType, string>> = {
    hero: 'Nome do projeto', info: 'Infraestrutura', plant_map: 'Planta Interativa',
    panorama: 'Vista 360°', video: 'Apresentação', traditional_highlights: 'Destaques',
    lots: 'Lotes Disponíveis', construction: 'Acompanhamento de Obras', gallery: 'Galeria de Fotos',
    location: 'Nossa Localização', nearby: 'Proximidades', scheduling: 'Ficou interessado?',
    cta: 'Garanta sua unidade agora', payment_conditions: 'Condições de Pagamento',
    text: 'Título do bloco...', text_image: 'Título da seção...',
  }
  return map[type] || 'Título...'
}

function selectSection(id: string) {
  selectedSectionId.value = id
  const sec = sections.value.find((s) => s.id === id)
  // Default to content tab for widget sections, appearance for free sections
  if (sec && !isFreeSection(sec.type)) activeTab.value = 'content'
}

function onSectionClick(sectionId: string) {
  selectSection(sectionId)
}

function onTextUpdate(key: string, val: string) {
  const colonIdx = key.indexOf(':')
  const scope = key.slice(0, colonIdx)
  const field = key.slice(colonIdx + 1)

  if (scope === 'project') {
    if (project.value) {
      ;(project.value as Record<string, unknown>)[field] = val
      markDirty()
    }
    return
  }

  const sec = sections.value.find((s) => s.id === scope || s.type === scope)
  if (sec) {
    sec.config[field] = val
    markDirty()
  }
}

function toggleVisibility(id: string) {
  const sec = sections.value.find((s) => s.id === id)
  if (sec) { sec.visible = !sec.visible; markDirty() }
}

function setAlign(align: string) {
  if (selectedSection.value) { selectedSection.value.config.titleAlign = align as any; markDirty() }
}

function onBgColorChange() {
  if (selectedSection.value) { selectedSection.value.config.bgGradient = undefined; markDirty() }
}

function onReorder() {
  sections.value = reorderSections(sections.value)
  markDirty()
}

function markDirty() { isDirty.value = true }

function addFreeSection(type: SectionType) {
  const id = generateSectionId(type)
  const maxOrder = sections.value.length
    ? Math.max(...sections.value.map((s) => s.order)) + 1
    : 0
  sections.value.push({ id, type, order: maxOrder, visible: true, config: { ...DEFAULT_CONFIGS[type] } })
  selectedSectionId.value = id
  markDirty()
}

function removeSection(id: string) {
  sections.value = sections.value.filter((s) => s.id !== id)
  if (selectedSectionId.value === id) selectedSectionId.value = null
  markDirty()
}

// ─── Save content fields (project data) ─────────────────────────────────────

async function saveContent(fields: string[]) {
  savingContent.value = true
  try {
    const body: Record<string, any> = {}
    for (const f of fields) body[f] = project.value?.[f]
    const updated = await fetchApi(`/projects/${projectId.value}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    if (updated) Object.assign(project.value, updated)
    toastSuccess('Conteúdo salvo!')
  } catch (e: any) {
    toastError('Erro ao salvar: ' + (e.message || ''))
  }
  savingContent.value = false
}

// ─── Banner upload ────────────────────────────────────────────────────────────

async function uploadBannerImage(e: Event, device: 'desktop' | 'tablet' | 'mobile') {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingBannerDevice.value = device
  try {
    const fd = new FormData()
    fd.append('file', file)
    const updated = await uploadApi(`/projects/${projectId.value}/banner-image?device=${device}`, fd)
    if (updated) Object.assign(project.value, updated)
    toastSuccess('Banner atualizado!')
  } catch {
    toastError('Erro ao enviar banner.')
  }
  uploadingBannerDevice.value = null
  ;(e.target as HTMLInputElement).value = ''
}

async function removeBannerImage(device: 'desktop' | 'tablet' | 'mobile') {
  const fieldMap: Record<'desktop' | 'tablet' | 'mobile', string> = {
    desktop: 'bannerImageUrl',
    tablet: 'bannerImageTabletUrl',
    mobile: 'bannerImageMobileUrl',
  }
  if (project.value) project.value[fieldMap[device]] = null
  await saveContent([fieldMap[device]])
}

// ─── Gallery media ─────────────────────────────────────────────────────────────

async function uploadGalleryMedia(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  uploadingMedia.value = true
  try {
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      const m = await uploadApi(`/projects/${projectId.value}/media`, fd)
      if (!project.value.projectMedias) project.value.projectMedias = []
      project.value.projectMedias.unshift(m)
    }
    toastSuccess('Mídia adicionada!')
  } catch {
    toastError('Erro ao enviar mídia.')
  }
  uploadingMedia.value = false
  ;(e.target as HTMLInputElement).value = ''
}

async function deleteMedia(id: string) {
  if (!confirm('Remover esta mídia?')) return
  try {
    await fetchApi(`/projects/${projectId.value}/media/${id}`, { method: 'DELETE' })
    project.value.projectMedias = (project.value.projectMedias ?? []).filter((m: any) => m.id !== id)
    toastSuccess('Mídia removida.')
  } catch {
    toastError('Erro ao remover.')
  }
}

// ─── Free section image upload ────────────────────────────────────────────────

async function uploadSectionImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !selectedSection.value) return
  uploadingSectionImage.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const m = await uploadApi(`/projects/${projectId.value}/media`, fd)
    selectedSection.value.config.imageUrl = m.url
    markDirty()
    toastSuccess('Imagem enviada!')
  } catch {
    toastError('Erro ao enviar imagem.')
  }
  uploadingSectionImage.value = false
  ;(e.target as HTMLInputElement).value = ''
}

// ─── Nearby ───────────────────────────────────────────────────────────────────

async function toggleNearby() {
  try {
    await fetchApi(`/nearby/${project.value.id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: nearbyEnabled.value }),
    })
    toastSuccess(nearbyEnabled.value ? 'Proximidades ativadas.' : 'Proximidades desativadas.')
  } catch {
    toastError('Erro ao alterar proximidades.')
  }
}

async function regenerateNearby() {
  nearbyRegenerating.value = true
  try {
    await fetchApi(`/nearby/${project.value.id}/generate`, { method: 'POST' })
    toastSuccess('Geração iniciada. Aguarde alguns segundos.')
    setTimeout(() => loadNearbyStatus().catch(() => {}), 5000)
  } catch {
    toastError('Erro ao gerar proximidades.')
  }
  nearbyRegenerating.value = false
}

async function loadNearbyStatus() {
  try {
    nearbyStatus.value = await fetchApi(`/nearby/${project.value.id}/status`)
    nearbyEnabled.value = nearbyStatus.value?.enabled ?? project.value?.nearbyEnabled ?? false
  } catch { /* ignore */ }
}

// ─── Load project ─────────────────────────────────────────────────────────────

async function loadProject() {
  loading.value = true
  try {
    const data = await fetchApi(`/projects/${projectId.value}`)
    project.value = data
    sections.value = resolveSectionsLayout(data)
    nearbyEnabled.value = data.nearbyEnabled ?? false
    loadNearbyStatus().catch(() => {})
  } catch (e) {
    console.error('Failed to load project', e)
  }
  loading.value = false
}

// ─── Save layout (sectionsLayout only) ───────────────────────────────────────

async function saveLayout() {
  saving.value = true
  try {
    await fetchApi(`/projects/${projectId.value}`, {
      method: 'PATCH',
      body: JSON.stringify({ sectionsLayout: reorderSections(sections.value) }),
    })
    isDirty.value = false
    toastSuccess('Layout salvo!')
  } catch (e: any) {
    toastError('Erro ao salvar: ' + (e.message || ''))
  }
  saving.value = false
}

// ─── Route guard ──────────────────────────────────────────────────────────────

onBeforeRouteLeave((_to, _from, next) => {
  if (isDirty.value) {
    const ok = confirm('Você tem alterações não salvas. Deseja sair mesmo assim?')
    if (!ok) return
  }
  next()
})

onMounted(loadProject)
</script>

<style scoped>
/* ─── Overall layout ───────────────────────────────────────────── */

.pb-builder {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-surface-950);
  color: var(--color-surface-50);
  overflow: hidden;
}

/* ─── Header ─────────────────────────────────────────────────── */

.pb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 56px;
  border-bottom: 1px solid var(--color-surface-700);
  background: var(--color-surface-900);
  flex-shrink: 0;
  gap: 12px;
}

.pb-header-left  { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.pb-header-center { display: flex; justify-content: center; }
.pb-header-right { display: flex; align-items: center; gap: 8px; flex: 1; justify-content: flex-end; }

.pb-back-btn {
  display: flex; align-items: center; gap: 6px;
  color: var(--color-surface-300); text-decoration: none;
  font-size: 13px; font-weight: 500; transition: color 0.15s;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;
}
.pb-back-btn:hover { color: var(--color-surface-50); }

.pb-header-divider { width: 1px; height: 20px; background: var(--color-surface-700); flex-shrink: 0; }

.pb-header-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 600; color: var(--color-surface-200); white-space: nowrap;
}

.pb-unsaved-pill {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; color: var(--color-warning, #f59e0b);
  background: rgba(245,158,11,0.1); padding: 3px 8px;
  border-radius: 20px; white-space: nowrap;
}

/* Device tabs */
.pb-device-tabs {
  display: flex; background: var(--color-surface-800); border-radius: 8px; padding: 3px; gap: 2px;
}
.pb-device-btn {
  background: none; border: none; color: var(--color-surface-400);
  padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.15s;
}
.pb-device-btn.active { background: var(--color-surface-600); color: var(--color-surface-50); }

/* Header action buttons */
.pb-btn {
  display: flex; align-items: center; gap: 6px; padding: 7px 14px;
  border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s;
}
.pb-btn-ghost {
  background: transparent; border: 1px solid var(--color-surface-600);
  color: var(--color-surface-200); text-decoration: none;
}
.pb-btn-ghost:hover { background: var(--color-surface-700); color: var(--color-surface-50); }
.pb-btn-primary { background: var(--color-primary-600); color: white; }
.pb-btn-primary:hover:not(:disabled) { background: var(--color-primary-500); }
.pb-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* ─── 3-Column layout ────────────────────────────────────────── */

.pb-layout {
  display: grid;
  grid-template-columns: 220px 1fr 300px;
  flex: 1;
  overflow: hidden;
}

/* ─── Left sidebar ───────────────────────────────────────────── */

.pb-sidebar-left {
  background: var(--color-surface-900);
  border-right: 1px solid var(--color-surface-700);
  overflow-y: auto;
  padding: 14px;
}

.pb-sidebar-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--color-surface-400); margin-bottom: 8px;
}
.pb-sidebar-section { margin-bottom: 12px; }

.pb-widget-list { display: flex; flex-direction: column; gap: 3px; }
.pb-widget-item {
  display: flex; align-items: center; gap: 7px; padding: 6px 8px;
  border-radius: 6px; background: var(--color-surface-800);
  border: 1px solid var(--color-surface-700); color: var(--color-surface-200);
  font-size: 11.5px; cursor: pointer; text-align: left; transition: all 0.15s;
}
.pb-widget-item:hover { background: var(--color-surface-700); color: var(--color-surface-50); }

/* Section rows in left panel */
.pb-section-row {
  display: flex; align-items: center; gap: 6px; padding: 7px 8px;
  border-radius: 6px; cursor: pointer; margin-bottom: 2px;
  border: 1px solid transparent; transition: all 0.15s;
}
.pb-section-row:hover { background: var(--color-surface-800); }
.pb-section-row--selected {
  background: rgba(var(--color-primary-rgb, 0,135,90), 0.12);
  border-color: var(--color-primary-600);
}
.pb-section-row--hidden { opacity: 0.4; }

.pb-row-handle {
  color: var(--color-surface-500); cursor: grab; flex-shrink: 0;
  padding: 0 2px; font-size: 13px; line-height: 1;
}
.pb-row-handle:active { cursor: grabbing; }
.pb-row-ghost { opacity: 0.4; background: var(--color-surface-700); }

.pb-row-icon { color: var(--color-surface-400); font-size: 12px; flex-shrink: 0; }
.pb-row-label { font-size: 11.5px; color: var(--color-surface-200); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pb-row-actions { display: flex; gap: 3px; flex-shrink: 0; }
.pb-row-btn {
  background: none; border: none; color: var(--color-surface-400);
  cursor: pointer; padding: 3px 5px; border-radius: 4px; font-size: 12px; transition: all 0.15s;
}
.pb-row-btn:hover { color: var(--color-surface-50); background: var(--color-surface-700); }
.pb-row-btn--danger:hover { color: var(--color-error, #ef4444); background: rgba(239,68,68,0.1); }

/* ─── Center: Live preview canvas ────────────────────────────── */

.pb-canvas {
  background: #e8e8e8;
  overflow-y: auto;
  position: relative;
}

.pb-canvas-inner {
  background: white;
  min-height: 100%;
}

/* Device width variants — apply to the canvas inner */
.pb-canvas--desktop .pb-canvas-inner { max-width: 100%; }
.pb-canvas--tablet .pb-canvas-inner  { max-width: 768px; margin: 24px auto; box-shadow: 0 2px 24px rgba(0,0,0,0.15); }
.pb-canvas--mobile .pb-canvas-inner  { max-width: 390px; margin: 24px auto; box-shadow: 0 2px 24px rgba(0,0,0,0.15); }

.pb-loading-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 300px; gap: 12px; color: var(--color-surface-400);
}

/* ─── Right sidebar ──────────────────────────────────────────── */

.pb-sidebar-right {
  background: var(--color-surface-900);
  border-left: 1px solid var(--color-surface-700);
  overflow-y: auto;
}

.pb-props-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 200px; gap: 12px; padding: 24px; text-align: center;
}
.pb-props-empty p { font-size: 13px; color: var(--color-surface-400); }

.pb-props-header {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 16px; border-bottom: 1px solid var(--color-surface-700);
  font-size: 13px; font-weight: 600; color: var(--color-surface-100);
}

/* Tabs */
.pb-tabs {
  display: flex; border-bottom: 1px solid var(--color-surface-700);
}
.pb-tab-btn {
  flex: 1; padding: 10px 0; background: none; border: none; cursor: pointer;
  font-size: 12px; font-weight: 500; color: var(--color-surface-400);
  border-bottom: 2px solid transparent; transition: all 0.15s; margin-bottom: -1px;
}
.pb-tab-btn.active { color: var(--color-primary-400); border-bottom-color: var(--color-primary-400); }

.pb-props-body { padding: 14px 16px; }

/* ─── Field styles ───────────────────────────────────────────── */

.pb-field { margin-bottom: 12px; }
.pb-field-group-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--color-surface-400);
  margin: 0 0 8px 0;
}
.pb-field-label { display: block; font-size: 11.5px; color: var(--color-surface-300); margin-bottom: 4px; }
.pb-field-hint  { display: block; font-size: 11px; color: var(--color-surface-500); margin-top: 4px; }

.pb-field-input {
  width: 100%; padding: 6px 9px; background: var(--color-surface-800);
  border: 1px solid var(--color-surface-600); border-radius: 6px;
  color: var(--color-surface-50); font-size: 12px; box-sizing: border-box;
  outline: none; transition: border-color 0.15s;
}
.pb-field-input:focus { border-color: var(--color-primary-500); }
.pb-field-textarea { resize: vertical; min-height: 70px; font-family: monospace; }

.pb-align-btns { display: flex; gap: 4px; flex-wrap: wrap; }
.pb-align-btn {
  padding: 5px 10px; background: var(--color-surface-800);
  border: 1px solid var(--color-surface-600); border-radius: 5px;
  color: var(--color-surface-300); font-size: 11.5px; cursor: pointer;
  transition: all 0.15s;
}
.pb-align-btn.active {
  background: var(--color-primary-600); border-color: var(--color-primary-500); color: white;
}

.pb-color-row { display: flex; gap: 6px; align-items: center; }
.pb-color-input { width: 34px; height: 32px; padding: 2px; border-radius: 5px; border: 1px solid var(--color-surface-600); cursor: pointer; background: var(--color-surface-800); flex-shrink: 0; }
.pb-clear-btn { background: none; border: none; color: var(--color-surface-400); cursor: pointer; font-size: 16px; padding: 0 4px; line-height: 1; }
.pb-clear-btn:hover { color: var(--color-error, #ef4444); }

.pb-range { width: 100%; accent-color: var(--color-primary-500); }
.pb-range-row { display: flex; align-items: center; gap: 8px; }
.pb-range-val { font-size: 11px; color: var(--color-surface-300); white-space: nowrap; }

.pb-toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; color: var(--color-surface-200); }

/* ─── Upload / Banner ────────────────────────────────────────── */

.pb-upload-btn {
  display: flex; align-items: center; gap: 6px; justify-content: center;
  padding: 8px 12px; border-radius: 7px; cursor: pointer; font-size: 12px;
  background: var(--color-surface-800); border: 1px dashed var(--color-surface-500);
  color: var(--color-surface-300); transition: all 0.15s; width: 100%; box-sizing: border-box;
}
.pb-upload-btn:hover { background: var(--color-surface-700); border-color: var(--color-primary-500); color: var(--color-primary-400); }

.pb-banner-preview {
  position: relative; margin-bottom: 8px; border-radius: 6px; overflow: hidden; max-height: 80px;
  background: var(--color-surface-800);
}
.pb-banner-preview img {
  width: 100%; height: 80px; object-fit: cover; display: block;
}
.pb-banner-remove {
  position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.7); color: white;
  border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center; line-height: 1;
}

/* ─── Gallery ────────────────────────────────────────────────── */

.pb-gallery-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 8px;
}
.pb-gallery-thumb {
  position: relative; border-radius: 5px; overflow: hidden;
  background: var(--color-surface-800); aspect-ratio: 1;
}
.pb-gallery-thumb img, .pb-gallery-thumb video {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.pb-gallery-delete {
  position: absolute; top: 3px; right: 3px; background: rgba(0,0,0,0.75); color: white;
  border: none; border-radius: 50%; width: 18px; height: 18px; cursor: pointer;
  font-size: 13px; display: flex; align-items: center; justify-content: center; line-height: 1;
}

/* ─── Content lists (construction / highlights) ──────────────── */

.pb-list-item {
  display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start;
  padding: 8px; background: var(--color-surface-800); border-radius: 6px;
  border: 1px solid var(--color-surface-700);
}
.pb-list-item-fields { flex: 1; }

.pb-save-content-btn {
  width: 100%; padding: 8px; margin-top: 12px;
  background: var(--color-primary-600); border: none; border-radius: 7px;
  color: white; font-size: 12px; font-weight: 500; cursor: pointer; transition: background 0.15s;
}
.pb-save-content-btn:hover:not(:disabled) { background: var(--color-primary-500); }
.pb-save-content-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.pb-add-item-btn {
  width: 100%; padding: 7px; background: var(--color-surface-800);
  border: 1px dashed var(--color-surface-500); border-radius: 6px;
  color: var(--color-surface-300); font-size: 12px; cursor: pointer; transition: all 0.15s; margin-bottom: 4px;
}
.pb-add-item-btn:hover { border-color: var(--color-primary-500); color: var(--color-primary-400); }
</style>
