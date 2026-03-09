<template>
  <div class="pub-page">
    <!-- Loading -->
    <div v-if="loading" class="pub-loading">
      <div class="loading-spinner"></div>
      <p>Carregando projeto...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="pub-error">
      <div class="pub-error-card card">
        <h2>Projeto não encontrado</h2>
        <p>{{ error }}</p>
        <NuxtLink to="/" class="v4-btn-primary" style="display: inline-block; margin-top: 1rem;">Voltar ao início</NuxtLink>
      </div>
    </div>

    <!-- Project -->
    <template v-else-if="project">
      <ProjectSideMenu
        :has-plant="!!project?.plantMap && isSectionVisible('plant_map')"
        :has-panorama="panoramas.length > 0 && isSectionVisible('panorama')"
        :has-info="hasInfo && isSectionVisible('info')"
        :has-lots="(project?.lotSummary?.available ?? 0) > 0 && isSectionVisible('lots')"
        :has-gallery="!!project.projectMedias?.length && isSectionVisible('gallery')"
        :has-location="(!!project.googleMapsUrl || !!project.address) && isSectionVisible('location')"
        :has-nearby="hasNearbyData && isSectionVisible('nearby')"
        :has-scheduling="schedulingConfig?.enabled && isSectionVisible('scheduling')"
      />

      <!-- ── Sections container (flex column, ordered by Page Builder) ── -->
      <div class="pub-page-body" @click.capture="onPreviewClick">

      <!-- Hero section -->
      <section
        id="inicio"
        v-if="isSectionVisible('hero')"
        class="v4-hero"
        :class="[{ 'has-banner': hasHeroBanner }, pbEditClass('hero')]"
        :style="{ order: getSectionOrder('hero'), ...pbSectionStyle('hero') }"
        data-section-id="hero"
      >
        <div v-if="hasHeroBanner" class="v4-hero-bg" :style="heroBackgroundStyle"></div>
        <div class="v4-hero-overlay" :style="getSectionConfig('hero').overlayColor ? { background: getSectionConfig('hero').overlayColor, opacity: getSectionConfig('hero').overlayOpacity ?? 0.5 } : {}"></div>

        <div class="v4-container">
          <div class="v4-hero-content" :class="`text-${getSectionConfig('hero').titleAlign || 'left'}`">
            <div class="v4-hero-text">
              <span class="v4-hero-tag">{{ project.tenant?.name || 'Vendas Iniciadas' }}</span>
              <EditableText tag="h1" :text="secTitle('hero', project.name)" :edit-mode="editMode" cls="v4-hero-title text-balance" @save="onTextUpdate('hero:title', $event)" />
              <EditableText v-if="secSubtitle('hero', project.description) || editMode" tag="p" :text="secSubtitle('hero', project.description)" :edit-mode="editMode" cls="v4-hero-desc text-balance" @save="onTextUpdate('hero:subtitle', $event)" />
              <div class="v4-hero-actions">
                <a v-if="getSectionConfig('hero').btnPrimaryText !== ''" href="#planta" class="v4-btn-primary v4-hero-btn" @click="tracking.trackClick('Botão: Ver Planta Interativa')">{{ getSectionConfig('hero').btnPrimaryText || 'Ver Planta Interativa' }}</a>
                <a v-if="schedulingConfig?.enabled" href="#agendamento" class="v4-btn-white v4-hero-btn" @click="tracking.trackClick('Botão: Agendar Visita')">{{ getSectionConfig('hero').btnSecondaryText || 'Agendar Visita' }}</a>
                <a href="#contato" class="v4-btn-white v4-hero-btn" @click="tracking.trackClick('Botão: Solicitar Informações')">{{ getSectionConfig('hero').btnTertiaryText || 'Solicitar informações' }}</a>
              </div>
            </div>

            <div v-if="getSectionConfig('hero').showStats !== false" class="v4-hero-stats">
              <div class="v4-stat-card">
                <span class="v4-stat-label">Lotes Disponíveis</span>
                <span class="v4-stat-value">{{ availableLots }}</span>
              </div>
              <div v-if="minArea" class="v4-stat-card">
                <span class="v4-stat-label">Área a partir de</span>
                <span class="v4-stat-value">{{ minArea }}<small>m²</small></span>
              </div>
              <div v-if="priceRange" class="v4-stat-card v4-stat-card--price">
                <span class="v4-stat-label">Preços a partir de</span>
                <span class="v4-stat-value">{{ priceRange }}</span>
                <div v-if="project.maxInstallments || project.paymentConditionsSummary" class="v4-stat-meta">
                  <span v-if="project.maxInstallments" class="v4-stat-installments">em até {{ project.maxInstallments }}x</span>
                  <p v-if="project.paymentConditionsSummary" class="v4-stat-summary">{{ project.paymentConditionsSummary }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Trust bar (follows hero in order) -->
      <div v-if="corretor && isSectionVisible('hero')" class="v4-trust-bar" :style="{ order: getSectionOrder('hero') }">
        <div class="v4-container">
          <div class="v4-trust-inner">
            <div class="v4-trust-person">
              <div class="v4-trust-avatar">
                <img v-if="corretor.profileImageUrl" :src="corretor.profileImageUrl" :alt="corretor.name" />
                <span v-else class="v4-avatar-placeholder">{{ corretor.name[0] }}</span>
              </div>
              <div class="v4-trust-info">
                <span class="v4-trust-label">Atendimento Exclusivo</span>
                <strong class="v4-trust-name">{{ corretor.name }}</strong>
              </div>
            </div>
            <div class="v4-trust-actions">
              <a v-if="corretor.phone" :href="`https://wa.me/${corretor.phone.replace(/\D/g,'')}`" target="_blank" class="v4-trust-btn v4-trust-btn--whatsapp" @click="tracking.trackWhatsappClick({ realtorName: corretor.name })">
                <span>WhatsApp</span>
              </a>
              <a href="#contato" class="v4-trust-btn v4-trust-btn--primary" @click="tracking.trackClick('CTA Flutuante: Tenho Interesse')">
                <span>Tenho Interesse</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Highlights & Info -->
      <section
        v-if="(hasInfo || editMode) && isSectionVisible('info')"
        class="v4-section"
        :class="pbEditClass('info')"
        id="info"
        :style="{ order: getSectionOrder('info'), ...pbSectionStyle('info') }"
        data-section-id="info"
      >
        <div class="v4-container">
          <div v-if="hasLocationHeader" class="v4-section-header center v4-description-header">
            <h2 v-if="locationTitle" class="v4-section-title">{{ locationTitle }}</h2>
            <p v-if="locationSubtitle" class="v4-section-subtitle">{{ locationSubtitle }}</p>
          </div>

          <!-- Text content if exists -->
          <div v-if="hasMeaningfulLocationText" class="v4-rich-content" v-html="formattedLocationText" style="margin-bottom: 80px;"></div>

          <!-- Sophisticated Infrastructure Grid (Based on image) -->
          <div v-if="infrastructureCategories.length" class="v4-infra-split">
            <div class="v4-infra-left">
              <h2 class="v4-infra-hero-text" v-html="project.highlightsTitle || 'Sua família<br>merece o melhor.'"></h2>
              <p class="v4-infra-sub-text">{{ project.highlightsSubtitle || 'Qualidade de vida, segurança e infraestrutura completa em um só lugar.' }}</p>
              <div class="v4-infra-divider"></div>
            </div>
            <div class="v4-infra-right">
              <div v-for="cat in infrastructureCategories" :key="cat.title" class="v4-infra-group">
                <h3 class="v4-infra-group-title">{{ cat.title }}</h3>
                <ul class="v4-infra-items-list">
                  <li v-for="it in cat.items" :key="it" class="v4-infra-list-item">
                    <span class="v4-infra-bullet">•</span>
                    {{ it }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Planta Interativa — section shows as soon as we know the project has a plant map;
           the actual hotspot data is fetched lazily when this section enters the viewport -->
      <section
        v-if="(project?.plantMap || editMode) && isSectionVisible('plant_map')"
        class="v4-section v4-section-alt"
        :class="pbEditClass('plant_map')"
        id="planta"
        :style="{ order: getSectionOrder('plant_map'), ...pbSectionStyle('plant_map') }"
        data-section-id="plant_map"
      >
        <div class="v4-container">
          <div class="v4-section-header center">
            <EditableText tag="h2" :text="secTitle('plant_map', 'Planta Interativa')" :edit-mode="editMode" cls="v4-section-title" @save="onTextUpdate('plant_map:title', $event)" />
            <EditableText tag="p" :text="secSubtitle('plant_map', 'Explore a implantação do loteamento. Clique nos pontos para mais informações.')" :edit-mode="editMode" cls="v4-section-subtitle" @save="onTextUpdate('plant_map:subtitle', $event)" />
          </div>
          <ClientOnly>
            <div class="v4-plant-map-shell" :class="{ 'is-interaction-disabled': !isPlantMapInteractive }" :style="{ height: (getSectionConfig('plant_map').mapHeight || 540) + 'px', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--v4-shadow-elevated)', position: 'relative' }">
              <PlantMapViewer
                v-if="plantMap"
                :plant-map="plantMap"
                :show-controls="true"
                :show-legend="true"
                :interactive="isPlantMapInteractive"
              />
              <div v-else-if="editMode" class="pb-section-placeholder" style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; background:#f8f9fa; border-radius:16px;">
                <i class="bi bi-grid-3x3" style="font-size:2.5rem; color:#aaa;" aria-hidden="true"></i>
                <p style="margin:0; font-size:14px; color:#888; text-align:center;">Nenhuma planta interativa criada.<br>Acesse a aba <strong>Planta</strong> para começar.</p>
              </div>
              <div v-else style="height:100%; background:#1a1a2e; display:flex; align-items:center; justify-content:center; color:#64748b;">
                <div class="loading-spinner"></div>
              </div>
              <div v-if="showPlantMapTouchCta && plantMap" class="v4-interaction-gate">
                <button type="button" class="v4-interaction-gate__btn" @click.stop.prevent="enablePlantMapInteraction">
                  Ver mapa interativo
                </button>
                <p class="v4-interaction-gate__hint">Ative para arrastar e dar zoom. Desative para voltar a rolar a pagina.</p>
              </div>
            </div>
            <template #fallback>
              <div style="height: 540px; border-radius:16px; background:#1a1a2e; display:flex; align-items:center; justify-content:center; color:#64748b;">
                <div class="loading-spinner"></div>
              </div>
            </template>
          </ClientOnly>
          <button
            v-if="showPlantMapDisableButton"
            class="v4-interaction-toggle"
            @click="disablePlantMapInteraction"
          >
            Desativar interacao do mapa
          </button>
        </div>
      </section>

      <!-- Panorama 360° -->
      <section
        v-if="(panoramas.length || editMode) && isSectionVisible('panorama')"
        class="v4-section"
        :class="pbEditClass('panorama')"
        id="panorama"
        :style="{ order: getSectionOrder('panorama'), ...pbSectionStyle('panorama') }"
        data-section-id="panorama"
      >
        <div class="v4-container">
          <div class="v4-section-header center">
            <EditableText tag="h2" :text="secTitle('panorama', 'Vista 360°')" :edit-mode="editMode" cls="v4-section-title" @save="onTextUpdate('panorama:title', $event)" />
            <EditableText tag="p" :text="secSubtitle('panorama', 'Explore o empreendimento e seus arredores com vista panorâmica.')" :edit-mode="editMode" cls="v4-section-subtitle" @save="onTextUpdate('panorama:subtitle', $event)" />
          </div>
          <ClientOnly>
            <div v-if="!panoramas.length && editMode" class="pb-section-placeholder" style="min-height:300px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; border-radius:16px;">
              <i class="bi bi-camera" style="font-size:2.5rem; color:#aaa;" aria-hidden="true"></i>
              <p style="margin:0; font-size:14px; color:#888; text-align:center;">Nenhum panorama 360° criado.<br>Acesse a aba <strong>Panorama</strong> para começar.</p>
            </div>
            <div
              v-for="pano in panoramas"
              :key="pano.id"
              class="v4-panorama-card"
              :class="{ 'is-interaction-disabled': !isPanoramaInteractive }"
            >
              <PanoramaViewer :panorama="pano" />
              <div v-if="showPanoramaTouchCta" class="v4-interaction-gate">
                <button type="button" class="v4-interaction-gate__btn" @click.stop.prevent="enablePanoramaInteraction">
                  Ver 360 interativo
                </button>
                <p class="v4-interaction-gate__hint">Ative para girar a vista 360. Desative para continuar rolando a pagina.</p>
              </div>
            </div>
            <template #fallback>
              <div class="v4-panorama-card v4-panorama-card--fallback">
                <div class="loading-spinner"></div>
              </div>
            </template>
          </ClientOnly>
          <button
            v-if="showPanoramaDisableButton"
            class="v4-interaction-toggle"
            @click="disablePanoramaInteraction"
          >
            Desativar interacao do 360
          </button>
        </div>
      </section>

      <!-- Video Presentation -->
      <section
        v-if="(project?.youtubeVideoUrl || editMode) && isSectionVisible('video')"
        class="v4-section v4-section-alt"
        :class="pbEditClass('video')"
        id="video-apresentacao"
        :style="{ order: getSectionOrder('video'), ...pbSectionStyle('video') }"
        data-section-id="video"
      >
        <div class="v4-container">
          <div class="v4-section-header center">
            <EditableText tag="h2" :text="secTitle('video', 'Apresentação')" :edit-mode="editMode" cls="v4-section-title" @save="onTextUpdate('video:title', $event)" />
            <EditableText tag="p" :text="secSubtitle('video', 'Assista ao vídeo e conheça cada detalhe do empreendimento.')" :edit-mode="editMode" cls="v4-section-subtitle" @save="onTextUpdate('video:subtitle', $event)" />
          </div>
          <div class="v4-video-wrapper">
            <iframe
              v-if="youtubeEmbedUrl"
              :src="youtubeEmbedUrl"
              width="100%" height="100%" frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
            <div v-else-if="editMode" class="pb-section-placeholder" style="height:100%; min-height:240px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px;">
              <i class="bi bi-youtube" style="font-size:2.5rem; color:#aaa;" aria-hidden="true"></i>
              <p style="margin:0; font-size:14px; color:#888; text-align:center;">Nenhum vídeo configurado.<br>Cole o link do YouTube no painel lateral.</p>
            </div>
            <a v-else :href="project.youtubeVideoUrl" target="_blank" class="v4-video-placeholder">
              <span>Assistir Vídeo no YouTube</span>
            </a>
          </div>
        </div>
      </section>

      
      <!-- New Traditional Highlights "Destaques" -->
      <section
        v-if="(hasTraditionalInfo || editMode) && isSectionVisible('traditional_highlights')"
        class="v4-section"
        :class="pbEditClass('traditional_highlights')"
        id="destaques"
        :style="{ order: getSectionOrder('traditional_highlights'), ...pbSectionStyle('traditional_highlights') }"
        data-section-id="traditional_highlights"
      >
        <div v-if="traditionalHighlights.length" class="v4-container">
          <div class="v4-destaques-grid-v2">
            <div class="v4-section-header center" style="margin-bottom: 56px;">
              <EditableText tag="h2" :text="secTitle('traditional_highlights', project.traditionalHighlightsTitle || 'Destaques')" :edit-mode="editMode" cls="v4-section-title" @save="onTextUpdate('traditional_highlights:title', $event)" />
              <EditableText tag="p" :text="secSubtitle('traditional_highlights', project.traditionalHighlightsSubtitle || 'Diferenciais pensados para o seu bem-estar.')" :edit-mode="editMode" cls="v4-section-subtitle" @save="onTextUpdate('traditional_highlights:subtitle', $event)" />
            </div>
            
            <div class="v4-destaques-items">
              <div v-for="h in traditionalHighlights" :key="h.label" class="v4-destaque-card-minimal">
                <div class="v4-destaque-marker-dot"></div>
                <div class="v4-destaque-info">
                  <h4 class="v4-destaque-title">{{ h.label }}</h4>
                  <p v-if="h.value" class="v4-destaque-detail">{{ h.value }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Available Lots Grid -->
      <section
        v-if="(project?.lotSummary?.available ?? 0) > 0 && isSectionVisible('lots')"
        class="v4-section v4-section-alt"
        :class="pbEditClass('lots')"
        id="lotes"
        :style="{ order: getSectionOrder('lots'), ...pbSectionStyle('lots') }"
        data-section-id="lots"
      >
        <div class="v4-container">
          <div class="v4-section-header">
            <EditableText tag="h2" :text="secTitle('lots', 'Lotes Disponíveis')" :edit-mode="editMode" cls="v4-section-title" @save="onTextUpdate('lots:title', $event)" />
            <EditableText tag="p" :text="secSubtitle('lots', 'Selecione uma opção abaixo para ver metragens e condições.')" :edit-mode="editMode" cls="v4-section-subtitle" @save="onTextUpdate('lots:subtitle', $event)" />
          </div>

          <div class="v4-lots-grid">
            <NuxtLink
              v-for="lot in project?.teaserLots || []"
              :key="lot.id"
              :to="lotPageUrl(lot)"
              class="v4-lot-card"
              @click="tracking.trackLotClick(lot.code || lot.name || lot.id, lot.id)"
            >
              <div class="v4-lot-card-header">
                <div class="v4-lot-id">
                  <span class="v4-lot-label">
                    <span v-if="lot.lotDetails?.block || lot.lotDetails?.lotNumber">
                      QUADRA {{ normalizeBlockLabel(lot.lotDetails?.block) }} · LOTE {{ lot.lotDetails.lotNumber || '---' }}
                    </span>
                    <span v-else>LOTE</span>
                  </span>
                  <span class="v4-lot-code">{{ lot.code || lot.name || lot.id }}</span>
                </div>
                <div class="v4-lot-status">Disponível</div>
              </div>
              
              <div class="v4-lot-card-body">
                <div class="v4-lot-info-row">
                  <span class="v4-info-item"><i class="bi bi-bounding-box" aria-hidden="true"></i> {{ lot.lotDetails?.areaM2 || '---' }} m²</span>
                  <span v-if="lot.lotDetails?.pricePerM2" class="v4-info-item"><i class="bi bi-cash-stack" aria-hidden="true"></i> {{ formatCurrencyToBrasilia(lot.lotDetails.pricePerM2) }} / m²</span>
                  <span v-else-if="lot.lotDetails?.frontage" class="v4-info-item">↔ {{ lot.lotDetails.frontage }}m frente</span>
                </div>
                <div v-if="lot.lotDetails?.price" class="v4-lot-price">
                  <span class="v4-price-label">Valor do investimento</span>
                  <span class="v4-price-value">{{ formatCurrencyToBrasilia(lot.lotDetails.price) }}</span>
                </div>
              </div>
              
              <div class="v4-lot-card-footer">
                <span>Ver detalhes do lote</span>
                <span class="v4-icon">→</span>
              </div>
            </NuxtLink>
          </div>

          <div v-if="(project?.lotSummary?.available ?? 0) > 6" style="margin-top: 56px; display: flex; justify-content: center;">
            <NuxtLink :to="unitsUrl" class="v4-btn-primary" style="min-width: 280px; text-decoration: none; text-align: center;" @click="tracking.trackClick('Botão: Ver todas unidades')">
              Ver todos os {{ project?.lotSummary?.available ?? 0 }} lotes disponíveis
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- Construction Progress -->
      <section
        v-if="(project?.constructionStatus?.length || editMode) && isSectionVisible('construction')"
        class="v4-section"
        :class="pbEditClass('construction')"
        id="obras"
        :style="{ order: getSectionOrder('construction'), ...pbSectionStyle('construction') }"
        data-section-id="construction"
      >
        <div class="v4-container">
          <div class="v4-section-header center">
            <EditableText tag="h2" :text="secTitle('construction', 'Acompanhamento de Obras')" :edit-mode="editMode" cls="v4-section-title" @save="onTextUpdate('construction:title', $event)" />
            <EditableText tag="p" :text="secSubtitle('construction', 'Acompanhe a evolução do projeto em tempo real.')" :edit-mode="editMode" cls="v4-section-subtitle" @save="onTextUpdate('construction:subtitle', $event)" />
          </div>
          
          <div class="v4-construction-grid">
            <div v-for="(item, i) in project.constructionStatus" :key="i" class="v4-construction-item">
              <div class="v4-construction-header">
                <span class="v4-construction-label">{{ item.label }}</span>
                <span class="v4-construction-percentage">{{ item.percentage }}%</span>
              </div>
              <div class="v4-progress-bar">
                <div class="v4-progress-fill" :style="{ width: item.percentage + '%' }"></div>
              </div>
            </div>
            <div v-if="!project.constructionStatus?.length && editMode" class="pb-section-placeholder" style="padding:40px; text-align:center;">
              <i class="bi bi-bar-chart-steps" style="font-size:2rem; color:#aaa; margin-bottom:8px;" aria-hidden="true"></i>
              <p style="margin:0; color:#888; font-size:14px;">Nenhuma etapa de obra cadastrada.<br>Adicione etapas no painel lateral.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Media gallery -->
      <section
        v-if="(project?.projectMedias?.length || editMode) && isSectionVisible('gallery')"
        class="v4-section v4-section-alt"
        :class="pbEditClass('gallery')"
        id="galeria"
        :style="{ order: getSectionOrder('gallery'), ...pbSectionStyle('gallery') }"
        data-section-id="gallery"
      >
        <div class="v4-container">
          <div class="v4-section-header">
            <EditableText tag="h2" :text="secTitle('gallery', 'Galeria de Fotos')" :edit-mode="editMode" cls="v4-section-title" @save="onTextUpdate('gallery:title', $event)" />
            <EditableText tag="p" :text="secSubtitle('gallery', 'Conheça os detalhes e a infraestrutura do empreendimento.')" :edit-mode="editMode" cls="v4-section-subtitle" @save="onTextUpdate('gallery:subtitle', $event)" />
          </div>

          <div class="v4-gallery-grid">
            <div
              v-for="(m, i) in project.projectMedias.slice(0, 8)"
              :key="m.id"
              class="v4-gallery-item"
              @click="openLightbox(Number(i))"
            >
              <img
                v-if="m.type === 'PHOTO'"
                :src="m.url"
                :alt="m.caption || 'Foto'"
                :loading="i < 4 ? 'eager' : 'lazy'"
                :fetchpriority="i < 2 ? 'high' : 'auto'"
                decoding="async"
              />
              <video v-else :src="m.url" preload="metadata" />
              <div class="v4-gallery-overlay">
                <span v-if="m.caption" class="v4-gallery-caption">{{ m.caption }}</span>
                <span class="v4-gallery-expand">↗</span>
              </div>
            </div>
            <div v-if="!project.projectMedias?.length && editMode" class="pb-section-placeholder" style="grid-column:1/-1; padding:48px 24px; text-align:center;">
              <i class="bi bi-images" style="font-size:2rem; color:#aaa; margin-bottom:8px;" aria-hidden="true"></i>
              <p style="margin:0; color:#888; font-size:14px;">Nenhuma foto ou vídeo na galeria.<br>Adicione mídia no painel lateral.</p>
            </div>
          </div>

          <div v-if="project.projectMedias.length > 9" style="margin-top: 56px; display: flex; justify-content: center;">
            <NuxtLink :to="galleryUrl" class="v4-btn-primary" style="min-width: 280px; text-decoration: none; text-align: center;" @click="tracking.trackClick('Botão: Abrir Galeria Completa')">
              Ver todos os {{ project.projectMedias.length }} arquivos de mídia
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- Endereço e Mapa -->
      <section
        v-if="((project?.googleMapsUrl || project?.address) || editMode) && isSectionVisible('location')"
        class="v4-section"
        :class="pbEditClass('location')"
        id="localizacao"
        :style="{ order: getSectionOrder('location'), ...pbSectionStyle('location') }"
        data-section-id="location"
      >
        <div class="v4-container">
          <div class="v4-section-header center">
            <EditableText tag="h2" :text="secTitle('location', 'Nossa Localização')" :edit-mode="editMode" cls="v4-section-title" @save="onTextUpdate('location:title', $event)" />
            <p v-if="project.address" class="v4-section-subtitle" style="max-width: 600px; margin: 0 auto;">{{ project.address }}</p>
          </div>

          <div v-if="googleMapsEmbedUrl" class="v4-map-wrapper" style="margin-top: 40px; border-radius: 16px; overflow: hidden; box-shadow: var(--v4-shadow-elevated);">
            <iframe 
              :src="googleMapsEmbedUrl" 
              width="100%" 
              height="450" 
              style="border:0; display: block;" 
              :allowfullscreen="true" 
              loading="lazy" 
              referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </section>

      <!-- Proximidades -->
      <div
        v-if="(projectSlug || editMode) && isSectionVisible('nearby')"
        :class="pbEditClass('nearby')"
        :style="{ order: getSectionOrder('nearby') }"
        data-section-id="nearby"
      >
        <LandingNearbyPlaces
          v-if="projectSlug"
          :project-slug="projectSlug"
          @update:visible="hasNearbyData = $event"
        />
        <div v-else-if="editMode" class="pb-section-placeholder">
          <i class="bi bi-pin-map" aria-hidden="true"></i> Proximidades — disponível após salvar o endereço
        </div>
      </div>

      <!-- Agendamento Section -->
      <section
        v-if="project && (schedulingConfig?.enabled || editMode) && isSectionVisible('scheduling')"
        class="v4-section"
        :class="pbEditClass('scheduling')"
        id="agendamento"
        :style="{ order: getSectionOrder('scheduling'), background: pbSectionStyle('scheduling').background || '#1d1d1f', color: pbSectionStyle('scheduling').color || 'white' }"
        data-section-id="scheduling"
      >
        <div class="v4-container">
          <div class="v4-schedule-row">
            <div class="v4-schedule-info">
              <h2 class="v4-section-title" :style="{ color: pbSectionStyle('scheduling').color || 'white' }">
                <EditableText tag="span" :text="secTitle('scheduling', 'Ficou interessado?')" :edit-mode="editMode" @save="onTextUpdate('scheduling:title', $event)" />
                <br>
                <EditableText tag="span" :text="secSubtitle('scheduling', 'Venha conhecer de perto.')" :edit-mode="editMode" @save="onTextUpdate('scheduling:subtitle', $event)" />
              </h2>
              <p class="v4-section-subtitle" style="color: #a1a1a6; max-width: 480px;">Nada supera a sensação de estar no local onde será construído o seu futuro. Agende uma visita guiada com nossos especialistas.</p>
              
              <div class="v4-perks">
                <div class="v4-perk-item">
                  <div class="v4-perk-content">
                    <strong style="color: white;">Atendimento VIP</strong>
                    <p style="color: #86868b;">Horário exclusivo reservado para você tirar todas as dúvidas sem pressa.</p>
                  </div>
                </div>
                <div class="v4-perk-item" style="margin-top: 24px;">
                  <div class="v4-perk-content">
                    <strong style="color: white;">Consultoria Especializada</strong>
                    <p style="color: #86868b;">Nossos consultores conhecem cada detalhe técnico do empreendimento.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="v4-schedule-cta" style="flex: 0 0 auto; text-align: center;">
              <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 50px; border-radius: 40px; backdrop-filter: blur(20px);">
                <div style="font-size: 40px; margin-bottom: 24px;"><i class="bi bi-calendar-event-fill" aria-hidden="true"></i></div>
                <h3>Agendar agora</h3>
                <p style="color: #86868b; margin-bottom: 32px; font-size: 15px;">Escolha o dia e horário de sua preferência.</p>
                <button @click="showSchedulingModal = true" class="v4-btn-primary" style="padding: 16px 40px; font-size: 17px; background: white; color: black;">
                  Ver disponibilidade
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Modal de Agendamento (Overlay) -->
      <div v-if="showSchedulingModal" class="v4-modal-overlay">
        <div class="v4-modal-content" style="max-width: 600px; position: relative;">
          <button @click="showSchedulingModal = false" class="v4-modal-close">×</button>
          <LandingPublicSchedulingForm :project-slug="project.slug" @success="showSchedulingModal = false" />
        </div>
      </div>

      <!-- Lead form -->
      <section
        v-if="isSectionVisible('cta')"
        class="v4-section"
        :class="pbEditClass('cta')"
        id="contato"
        :style="{ order: getSectionOrder('cta'), background: pbSectionStyle('cta').background || '#fbfbfd', paddingTop: '120px', paddingBottom: '120px' }"
        data-section-id="cta"
      >
        <div class="v4-container">
          <div class="v4-conversion-card-new">
            <div class="v4-conversion-content">
              <div class="v4-conversion-header-new">
                <div class="v4-badge-clean">
                  <span class="v4-pulse-blue"></span>
                  {{ getSectionConfig('cta').badge || 'Oportunidade única' }}
                </div>
                <EditableText tag="h2" :text="secTitle('cta', 'Garanta sua unidade agora')" :edit-mode="editMode" cls="v4-title-display" @save="onTextUpdate('cta:title', $event)" />
                <EditableText tag="p" :text="secSubtitle('cta', 'Restam poucas unidades disponíveis. Preencha o formulário e nossa equipe entrará em contato para tirar suas dúvidas.')" :edit-mode="editMode" cls="v4-subtitle-clean" @save="onTextUpdate('cta:subtitle', $event)" />
                
                <div v-if="(project?.lotSummary?.total ?? 0) > 0" class="v4-lot-badge-minimal">
                  <span class="v4-sparkle"><i class="bi bi-stars" aria-hidden="true"></i></span> <strong>{{ availableLots }}</strong> lotes disponíveis no momento
                </div>
              </div>

              <div class="v4-form-container-new">
                <div v-if="leadSuccess" class="v4-form-success-new">
                  <div class="v4-success-circle">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h3>Solicitação enviada!</h3>
                  <p>Recebemos seus dados e logo um consultor entrará em contato.</p>
                  <button @click="leadSuccess = false" class="v4-btn-back">Voltar</button>
                </div>
                
                <form v-else class="v4-form-modern" @submit.prevent="submitLead" ref="formRef">
                  <div class="v4-form-cols">
                    <div class="v4-input-group">
                      <label>Seu nome completo *</label>
                      <input v-model="leadForm.name" required placeholder="Ex: João Silva" />
                    </div>
                    <div class="v4-input-group">
                      <label>Telefone / WhatsApp *</label>
                      <input :value="leadForm.phone" @input="leadForm.phone = applyPhoneMask(($event.target as HTMLInputElement).value)" required placeholder="(00) 00000-0000" />
                    </div>
                  </div>

                  <div class="v4-input-group">
                    <label>E-mail *</label>
                    <input v-model="leadForm.email" type="email" required placeholder="seu@email.com" />
                  </div>

                  <div v-if="unifiedAvailableLots.length" class="v4-input-group">
                    <label>Tenho interesse no lote</label>
                    <div class="v4-select-wrapper">
                      <select v-model="leadForm.mapElementId">
                        <option value="">Não tenho preferência</option>
                        <option v-for="lot in unifiedAvailableLots" :key="lot.id" :value="lot.id">
                          {{ lot.code || lot.name || lot.id }} {{ lot.lotDetails?.areaM2 ? `— ${lot.lotDetails.areaM2} m²` : '' }}
                        </option>
                      </select>
                    </div>
                  </div>

                  <div class="v4-input-group">
                    <label>Mensagem (opcional)</label>
                    <textarea v-model="leadForm.message" rows="3" placeholder="Em que podemos te ajudar?"></textarea>
                  </div>

                  <div v-if="leadError" class="v4-form-error-msg">{{ leadError }}</div>
                  
                  <button type="submit" class="v4-btn-submit-modern" :disabled="submitting" @click="tracking.trackClick('Formulário: Submit')">
                    {{ submitting ? 'Enviando...' : 'Falar com um consultor' }}
                  </button>
                  <p class="v4-privacy-legal">Seus dados estão seguros conosco.</p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Legal Notice -->
      <section
        v-if="(project?.legalNotice || editMode) && isSectionVisible('legal_notice')"
        class="v4-legal-notice"
        :class="pbEditClass('legal_notice')"
        :style="{ order: getSectionOrder('legal_notice') }"
        data-section-id="legal_notice"
      >
        <div class="v4-container">
          <div class="v4-legal-inner">
            <div class="v4-legal-icon"><i class="bi bi-clipboard-check" aria-hidden="true"></i></div>
            <p class="v4-legal-text">{{ project.legalNotice }}</p>
          </div>
        </div>
      </section>

      <!-- Footer (always last) -->
      <footer class="v4-footer" style="order: 9999;">
        <div class="v4-container">
          <div class="v4-footer-inner">
            <!-- Logos: Realização e Propriedade -->
            <div v-if="project.logos?.length" class="v4-footer-realizacao">
              <span class="v4-footer-realizacao-label">Realização e Propriedade:</span>
              <div class="v4-footer-logos">
                <img
                  v-for="logo in project.logos"
                  :key="logo.id"
                  :src="logo.url"
                  :alt="logo.label || project.tenant.name"
                  class="v4-footer-logo"
                />
              </div>
            </div>

            <!-- Loteadora branding -->
            <div class="v4-footer-brand">
              <div class="v4-footer-company">
                <span class="v4-footer-tenant">{{ project.tenant?.name }}</span>
                <span v-if="project.tenant?.creci" class="v4-footer-creci">{{ project.tenant.creci }}</span>
              </div>
            </div>

            <!-- Contact info -->
            <div v-if="project.tenant?.phone || project.tenant?.publicEmail || project.tenant?.website" class="v4-footer-contact">
              <a
                v-if="project.tenant?.phone"
                :href="`https://wa.me/${project.tenant.phone.replace(/\D/g,'')}`"
                target="_blank"
                class="v4-footer-contact-item"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.557 4.122 1.526 5.852L0 24l6.335-1.508A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.013-1.38l-.36-.214-3.75.893.925-3.645-.235-.375A9.818 9.818 0 112 12 9.818 9.818 0 0112 21.818z"/></svg>
                <span>{{ project.tenant.phone }}</span>
              </a>
              <a
                v-if="project.tenant?.publicEmail"
                :href="`mailto:${project.tenant.publicEmail}`"
                class="v4-footer-contact-item"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <span>{{ project.tenant.publicEmail }}</span>
              </a>
              <a
                v-if="project.tenant?.website"
                :href="project.tenant.website"
                target="_blank"
                class="v4-footer-contact-item"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                <span>{{ project.tenant.website.replace(/^https?:\/\//, '') }}</span>
              </a>
            </div>

            <!-- Copyright -->
            <div class="v4-footer-copyright">
              <span>Loteamento {{ project.name }}</span>
              <span>© {{ getYearInBrasilia() }} — Todos os direitos reservados.</span>
            </div>
          </div>
        </div>
      </footer>

      <!-- ── Free sections (text, text+image, image block) from Page Builder ── -->
      <template v-for="sec in freeSections" :key="sec.id">
        <SectionText
          v-if="sec.type === 'text' && sec.visible"
          :config="sec.config"
          :style="{ order: sec.order }"
          :class="pbEditClass(sec.id)"
          :data-section-id="sec.id"
        />
        <SectionTextImage
          v-else-if="sec.type === 'text_image' && sec.visible"
          :config="sec.config"
          :style="{ order: sec.order }"
          :class="pbEditClass(sec.id)"
          :data-section-id="sec.id"
        />
        <SectionImageBlock
          v-else-if="sec.type === 'image_block' && sec.visible"
          :config="sec.config"
          :style="{ order: sec.order }"
          :class="pbEditClass(sec.id)"
          :data-section-id="sec.id"
        />
      </template>

      </div><!-- /pub-page-body -->

      <!-- Lightbox (outside flex flow) -->
      <div v-if="lightboxOpen" class="v4-lightbox" @click.self="lightboxOpen = false">
        <button class="v4-lightbox-close" @click="lightboxOpen = false">&times;</button>
        <button v-if="lightboxIdx > 0" class="v4-lightbox-btn v4-prev" @click="lightboxIdx--">&#10094;</button>
        <div class="v4-lightbox-content">
          <img v-if="lightboxMedia?.type === 'PHOTO'" :src="lightboxMedia.url" :alt="lightboxMedia.caption" />
          <video v-else :src="lightboxMedia?.url" controls autoplay />
          <div v-if="lightboxMedia?.caption" class="v4-lightbox-caption">{{ lightboxMedia.caption }}</div>
        </div>
        <button v-if="lightboxIdx < (project.projectMedias?.length || 1) - 1" class="v4-lightbox-btn v4-next" @click="lightboxIdx++">&#10095;</button>
      </div>

      <!-- Sticky mobile CTA -->
      <nav class="v4-sticky-nav">
        <a v-if="project?.plantMap" href="#planta" class="v4-nav-item">Planta</a>
        <a v-if="panoramas.length" href="#panorama" class="v4-nav-item">Panorama</a>
        <a v-if="(project?.lotSummary?.available ?? 0) > 0" href="#lotes" class="v4-nav-item">Unidades</a>
        <a href="#contato" class="v4-nav-item v4-nav-cta">TENHO INTERESSE</a>
      </nav>
      <!-- Floating Search CTA -->
      <div v-if="allAvailableTags.length > 0" class="v4-floating-cta">
        <button class="v4-cta-btn-animated" @click="() => { tracking.trackClick('CTA: Busca de Lotes Animado'); toggleFilterModal(); }">
          <div class="v4-cta-inner">
            <span class="v4-cta-icon-spark"><i class="bi bi-search" aria-hidden="true"></i></span>
            <span class="v4-cta-label">Busque o lote ideal com base nas suas preferências</span>
            <span class="v4-cta-arrow-icon">→</span>
          </div>
          <div class="v4-cta-glow"></div>
        </button>
      </div>

      <!-- Filter Selection Modal -->
      <Transition name="fade">
        <div v-if="isFilterModalOpen" class="v4-filter-modal-overlay">
          <div class="v4-filter-modal-card">
            <div class="v4-modal-header">
              <h3 class="v4-modal-title">Lote Ideal</h3>
              <button class="v4-modal-close" @click="toggleFilterModal">✕</button>
            </div>
            
            <div class="v4-modal-body">
              <p style="margin-bottom: 24px; color: #86868b; font-size: 15px;">Escolha as características que você deseja para o seu novo lote.</p>
              
              <span class="v4-modal-label">Características</span>
              <div class="v4-modal-tags">
                <button 
                  v-for="tag in allAvailableTags" 
                  :key="tag" 
                  class="v4-modal-tag"
                  :class="{ active: selectedFilterTags.includes(tag) }"
                  @click="toggleFilterTag(tag)"
                >
                  {{ tag }}
                </button>
              </div>

              <div class="v4-modal-options">
                <label class="v4-modal-option">
                  <input type="checkbox" v-model="exactMatchMode" />
                  <div class="v4-option-info">
                    <span class="v4-option-title">Correspondência Exata</span>
                    <span class="v4-option-desc">Mostrar apenas lotes que possuem todos os selos selecionados.</span>
                  </div>
                </label>
              </div>
            </div>

            <div class="v4-modal-footer">
              <button class="v4-btn-modal-search" @click="applyFiltersAndSearch">
                {{ selectedFilterTags.length ? `Ver ${filteredCount} unidades compatíveis` : 'Ver todas as unidades' }}
              </button>
              <button v-if="selectedFilterTags.length" class="v4-btn-modal-clear" @click="selectedFilterTags = []">
                Limpar seleção
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useTenantStore } from '~/stores/tenant'
import { useAiChatStore } from '~/stores/aiChat'
import { resolveSectionsLayout, getSectionStyle, type PageSection } from '~/utils/page-builder'
import SectionText from '~/components/sections/SectionText.vue'
import SectionTextImage from '~/components/sections/SectionTextImage.vue'
import SectionImageBlock from '~/components/sections/SectionImageBlock.vue'

const props = defineProps<{
  slug?: string
  id?: string
  /** Builder mode: pass project data directly (skips internal API fetch) */
  projectProp?: any
  /** Builder mode: pass sections array directly (overrides resolveSectionsLayout) */
  sectionsProp?: PageSection[]
  /** Builder mode: enables edit overlays and click-to-select */
  editMode?: boolean
  /** Builder mode: which section ID is currently selected */
  selectedId?: string | null
}>()

const emit = defineEmits<{
  (e: 'sectionClick', sectionId: string): void
  (e: 'textUpdate', key: string, val: string): void
}>()

const route = useRoute()
const tenantStore = useTenantStore()
const chatStore = useAiChatStore()
const isPreview = computed(() => !!props.id || !!route.query.previewId)
const previewId = computed(() => (props.id || route.query.previewId) as string)
const projectSlug = computed(() => (props.slug || route.params.slug || tenantStore.config?.project?.slug || '') as string)
const pathPrefix = computed(() => {
  if (isPreview.value) {
    return `/preview/${previewId.value}`
  }
  return projectSlug.value ? `/${projectSlug.value}` : ''
})
const { fetchPublic } = usePublicApi()
import { usePublicPlantMap } from '~/composables/plantMap/usePlantMapApi'
import type { PlantMap } from '~/composables/plantMap/types'
import PlantMapViewer from '~/components/plantMap/PlantMapViewer.vue'
import ProjectSideMenu from '~/components/common/ProjectSideMenu.vue'
import { usePublicPanorama } from '~/composables/panorama/usePanoramaApi'
import type { Panorama } from '~/composables/panorama/types'
import PanoramaViewer from '~/components/panorama/PanoramaViewer.vue'
import { useTracking } from '~/composables/useTracking'
import { useTrackingStore } from '~/stores/tracking'
import { formatCurrencyToBrasilia } from '~/utils/money'
const corretorCode = route.query.c || ''
const projectUrl = computed(() => {
  const base = pathPrefix.value || '/'
  return corretorCode ? `${base}${base.includes('?') ? '&' : '?'}c=${corretorCode}` : base
})
const unitsUrl = computed(() => {
  const base = `${pathPrefix.value}/unidades`
  return corretorCode ? `${base}${base.includes('?') ? '&' : '?'}c=${corretorCode}` : base
})
const galleryUrl = computed(() => {
  const base = `${pathPrefix.value}/galeria`
  return corretorCode ? `${base}${base.includes('?') ? '&' : '?'}c=${corretorCode}` : base
})

/** Convert any YouTube URL to embeddable format */
const youtubeEmbedUrl = computed(() => {
  const raw = project.value?.youtubeVideoUrl
  if (!raw) return ''
  // Already an embed URL
  if (raw.includes('/embed/')) return raw
  // Extract video ID from various YouTube URL formats
  let videoId = ''
  try {
    const url = new URL(raw)
    if (url.hostname === 'youtu.be') {
      videoId = url.pathname.slice(1)
    } else if (url.searchParams.has('v')) {
      videoId = url.searchParams.get('v') || ''
    } else if (url.pathname.startsWith('/embed/')) {
      videoId = url.pathname.replace('/embed/', '')
    }
  } catch {
    // Try regex as last resort
    const m = raw.match(/(?:v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/)
    if (m) videoId = m[1]
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : raw
})

/** Normalise any Google Maps URL / pasted iframe to an embeddable src */
const googleMapsEmbedUrl = computed(() => {
  const raw = project.value?.googleMapsUrl
  if (!raw) return ''

  // If user pasted an <iframe> tag, extract the src
  const iframeSrcMatch = raw.match(/src=["']([^"']+)["']/)
  const url = iframeSrcMatch ? iframeSrcMatch[1] : raw.trim()

  // Already a proper embed URL
  if (url.includes('/maps/embed')) return url

  // Ensure absolute URL
  const abs = url.startsWith('http') ? url : `https://${url}`

  // Convert Google Maps links to embed format
  try {
    const parsed = new URL(abs)
    const host = parsed.hostname.replace('www.', '')
    if (host.includes('google') && host.includes('map')) {
      // /maps/place/NAME/@lat,lng → use place query embed
      const placeMatch = parsed.pathname.match(/\/maps\/place\/([^/@]+)/)
      if (placeMatch) {
        return `https://www.google.com/maps/embed/v1/place?key=&q=${encodeURIComponent(placeMatch[1])}`
          .replace('key=&', '') // works without key for simple embeds when using /maps/embed?pb method
      }
      // If it has a 'pb' or 'data' param, convert to embed URL
      if (parsed.searchParams.has('pb') || parsed.pathname.includes('data=')) {
        return abs.replace('/maps/', '/maps/embed/')
          .replace('/maps/embed/place/', '/maps/embed/v1/place/')
      }
      // Generic: use the q param or the full URL as embed query
      const q = parsed.searchParams.get('q') || parsed.searchParams.get('query') || ''
      if (q) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`
      }
    }
  } catch {
    // ignore parse errors
  }

  // Fallback: try adding output=embed for general maps URLs
  if (abs.includes('google') && abs.includes('map')) {
    const sep = abs.includes('?') ? '&' : '?'
    return `${abs}${sep}output=embed`
  }

  return abs
})
const { success: toastSuccess } = useToast()
const tracking = useTracking()
const trackingStore = useTrackingStore()

const loading = ref(props.projectProp == null)
const showSchedulingModal = ref(false)
const error = ref('')
const project = ref<any>(null)

// Mirror projectProp into internal project ref (builder mode — no API fetch needed)
watch(() => props.projectProp, (val) => {
  if (val != null) project.value = val
}, { immediate: true })
const corretor = ref<any>(null)
const plantMap = ref<PlantMap | null>(null)
const { getPublicPlantMap } = usePublicPlantMap()
const panoramas = ref<Panorama[]>([])
const schedulingConfig = ref<any>(null)
const hasNearbyData = ref(false)
const { getPublicPanoramas } = usePublicPanorama()

const leadForm = ref({ name: '', email: '', phone: '', mapElementId: '', message: '' })
const { maskPhone, validateEmail, validatePhone, unmask } = useMasks()

watch(() => leadForm.value.phone, (v) => {
  if (v) leadForm.value.phone = maskPhone(v)
})

const submitting = ref(false)
const leadSuccess = ref(false)
const leadError = ref('')
const formRef = ref(null)

const normalizeBlockLabel = (value?: string | null) => {
  const block = String(value ?? '').trim()
  if (!block) return '---'

  const withoutPrefix = block.replace(/^quadra\s*/i, '').trim()
  return withoutPrefix || block
}

const isFilterModalOpen = ref(false)
const selectedFilterTags = ref<string[]>([])
const exactMatchMode = ref(false)

const allAvailableTags = computed(() => {
  const tags = new Set<string>()
  unifiedAvailableLots.value.forEach((l: any) => {
    if (l.lotDetails?.tags) {
      l.lotDetails.tags.forEach((t: string) => tags.add(t))
    }
  })
  return Array.from(tags).sort()
})

const filteredCount = computed(() => {
  if (selectedFilterTags.value.length === 0) return unifiedAvailableLots.value.length
  return unifiedAvailableLots.value.filter((l: any) => {
    const lotTags = l.lotDetails?.tags || []
    if (exactMatchMode.value) {
      return selectedFilterTags.value.every(t => lotTags.includes(t))
    }
    return selectedFilterTags.value.some(t => lotTags.includes(t))
  }).length
})

const toggleFilterModal = () => {
  isFilterModalOpen.value = !isFilterModalOpen.value
  if (process.client) {
    document.body.style.overflow = isFilterModalOpen.value ? 'hidden' : ''
  }
}

function handleModalKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (isFilterModalOpen.value) toggleFilterModal()
  if (showSchedulingModal.value) {
    showSchedulingModal.value = false
    if (process.client) document.body.style.overflow = ''
  }
}

watch(showSchedulingModal, (v) => {
  if (process.client) {
    document.body.style.overflow = v ? 'hidden' : ''
  }
})

const toggleFilterTag = (tag: string) => {
  const idx = selectedFilterTags.value.indexOf(tag)
  if (idx > -1) selectedFilterTags.value.splice(idx, 1)
  else selectedFilterTags.value.push(tag)
}

const applyFiltersAndSearch = () => {
  tracking.trackClick('Botão: Aplicar Filtros e Buscar', 'LIST_FILTER')

  const query: any = {}
  if (selectedFilterTags.value.length) {
    query.tags = selectedFilterTags.value.join(',')
  }
  if (exactMatchMode.value) {
    query.match = 'exact'
  }
  if (corretorCode) {
    query.c = corretorCode
  }
  
  isFilterModalOpen.value = false
  if (process.client) document.body.style.overflow = ''
  navigateTo({
    path: pathPrefix.value + '/unidades',
    query
  })
}

const lotsPage = ref(1)
const lotsTeaserCount = 6
const lotsPerPage = 12 // Used in pagination on units page if needed, but for index teaser we use 6

const lightboxOpen = ref(false)
const lightboxIdx = ref(0)
const lightboxMedia = computed(() => project.value?.projectMedias?.[lightboxIdx.value] ?? null)

const isTouchMobile = ref(false)
const plantMapInteractionEnabled = ref(false)
const panoramaInteractionEnabled = ref(false)

const isPlantMapInteractive = computed(() => !isTouchMobile.value || plantMapInteractionEnabled.value)
const isPanoramaInteractive = computed(() => !isTouchMobile.value || panoramaInteractionEnabled.value)
const showPlantMapTouchCta = computed(() => isTouchMobile.value && !plantMapInteractionEnabled.value)
const showPanoramaTouchCta = computed(() => isTouchMobile.value && !panoramaInteractionEnabled.value)
const showPlantMapDisableButton = computed(() => isTouchMobile.value && plantMapInteractionEnabled.value)
const showPanoramaDisableButton = computed(() => isTouchMobile.value && panoramaInteractionEnabled.value)

function detectTouchMobile() {
  if (!process.client) return
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches
  const isNarrowViewport = window.matchMedia('(max-width: 1024px)').matches
  isTouchMobile.value = isCoarsePointer && isNarrowViewport
}

function enablePlantMapInteraction() {
  plantMapInteractionEnabled.value = true
  tracking.trackClick('Mapa: Ativar interacao mobile', 'MAP_INTERACTION')
}

function disablePlantMapInteraction() {
  plantMapInteractionEnabled.value = false
}

function enablePanoramaInteraction() {
  panoramaInteractionEnabled.value = true
  tracking.trackClick('Panorama: Ativar interacao mobile', 'VIEW_360')
}

function disablePanoramaInteraction() {
  panoramaInteractionEnabled.value = false
}

/**
 * Standard Brazilian real estate area: (average width) * (average depth)
 * or weighted scale average for polygons.
 */
function calcContractArea(lot: any): number | null {
  const poly: Array<{x:number,y:number}> = lot.polygon ?? []
  if (poly.length < 2) return null
  
  const lengths = poly.map((p: any, i: number) => {
    const q = poly[(i + 1) % poly.length]!
    return Math.sqrt((q.x - p.x) ** 2 + (q.y - p.y) ** 2)
  })
  const sm: Array<{meters: number | null}> = lot.sideMetrics ?? []

  // Case: All 4 sides defined (most common and precise)
  const m = sm.map(s => s.meters)
  if (sm.length === 4 && m.every(v => v !== null && v > 0)) {
    return ((m[0]! + m[2]!) / 2) * ((m[1]! + m[3]!) / 2)
  }

  const scales: (number | null)[] = lengths.map((len: number, i: number) => {
    const mv = sm[i]?.meters
    return (mv != null && mv > 0 && len > 0) ? mv / len : null
  })

  const validScales = scales.filter((s): s is number => s !== null)
  const minRequired = Math.max(1, Math.ceil(sm.length * 0.5))
  if (validScales.length < minRequired) return null

  if (sm.length === 4) {
    const s0 = scales[0] ?? null, s1 = scales[1] ?? null, s2 = scales[2] ?? null, s3 = scales[3] ?? null
    const getAvg = (a: number | null, b: number | null) => {
      if (a != null && b != null) return (a + b) / 2
      return a ?? b ?? null
    }
    const sw = getAvg(s0, s2)
    const sd = getAvg(s1, s3)
    if (sw != null && sd != null) return (lot.area ?? 0) * sw * sd
  }

  const product = validScales.reduce((a, b) => a * b, 1)
  const geometricMean = Math.pow(product, 1 / validScales.length)
  return (lot.area ?? 0) * geometricMean * geometricMean
}

const highlights = computed(() => {
  const raw = project.value?.highlightsJson
  return Array.isArray(raw) ? raw : []
})

const infrastructureCategories = computed(() => {
  return highlights.value.filter(h => h.type === 'category')
})

const traditionalHighlights = computed(() => {
  return highlights.value.filter(h => h.type === 'highlight' || !h.type)
})

const extractLocationMeta = (raw: string) => {
  const source = raw || ''
  const titleMatch = source.match(/<[^>]*data-lotio-location-title=["']1["'][^>]*>([\s\S]*?)<\/[^>]+>/i)
  const subtitleMatch = source.match(/<[^>]*data-lotio-location-subtitle=["']1["'][^>]*>([\s\S]*?)<\/[^>]+>/i)

  const body = source
    .replace(/<[^>]*data-lotio-location-title=["']1["'][^>]*>[\s\S]*?<\/[^>]+>/gi, '')
    .replace(/<[^>]*data-lotio-location-subtitle=["']1["'][^>]*>[\s\S]*?<\/[^>]+>/gi, '')
    .trim()

  const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

  return {
    title: stripHtml(titleMatch?.[1] || ''),
    subtitle: stripHtml(subtitleMatch?.[1] || ''),
    body,
  }
}

const locationMeta = computed(() => extractLocationMeta(project.value?.locationText || ''))
const locationTitle = computed(() => locationMeta.value.title)
const locationSubtitle = computed(() => locationMeta.value.subtitle)
const hasLocationHeader = computed(() => !!(locationTitle.value || locationSubtitle.value))

const hasMeaningfulLocationText = computed(() => {
  const text = locationMeta.value.body || ''
  if (!text) return false
  return text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim().length > 0
})

const hasInfo = computed(() => {
  return !!(infrastructureCategories.value.length > 0 || hasMeaningfulLocationText.value || hasLocationHeader.value)
})

const hasTraditionalInfo = computed(() => {
  return traditionalHighlights.value.length > 0
})


const mapDataLots = computed(() => {
  const raw = project.value?.mapData
  if (!raw) return []
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!data.lots) return []
    if (Array.isArray(data.lots)) {
      return data.lots.map(([, l]: [any, any]) => l)
    }
    return Object.values(data.lots)
  } catch { return [] }
})

const hasMapData = computed(() => !!project.value?.mapData)

const unifiedAvailableLots = computed(() => {
  let list = []
  if (hasMapData.value) {
    const rawMapData = typeof project.value.mapData === 'string' ? JSON.parse(project.value.mapData) : project.value.mapData
    const PPM = Number(rawMapData.pixelsPerMeter) || 10

    list = mapDataLots.value
      .filter((l: any) => l.status === 'available')
      .map((l: any) => {
        const contractArea = calcContractArea(l)
        let finalAreaM2 = (Number(l.area) > 0 ? (Number(l.area) / (PPM * PPM)) : 0)
        
        if (l.manualAreaM2 != null) {
          finalAreaM2 = Number(l.manualAreaM2)
        } else if (contractArea !== null) {
          finalAreaM2 = contractArea
        }

        const finalFrontage = l.manualFrontage != null
          ? Number(l.manualFrontage)
          : (Number(l.frontage) > 0 ? (Number(l.frontage) / PPM) : 0)

        return {
          id: l.id,
          name: l.label,
          code: l.code,
          lotDetails: {
            areaM2: parseFloat(finalAreaM2.toFixed(2)),
            frontage: parseFloat(finalFrontage.toFixed(2)),
            price: l.price,
            status: 'AVAILABLE',
            tags: l.tags || [],
            block: l.block,
            lotNumber: l.lotNumber,
            pricePerM2: l.pricePerM2
          }
        }
      })
  } else {
    // mapElements no longer returned by findBySlug; use teaserLots (first 6 available)
    list = (project.value?.teaserLots || []).map((e: any) => ({
      id: e.id,
      name: e.name,
      code: e.code,
      lotDetails: {
        ...e.lotDetails,
        tags: e.lotDetails?.tags || []
      }
    }))
  }
  return list
})

const sanitizeRichTextTheme = (html: string) => {
  if (!html) return ''

  // Remove legacy <font> wrappers and color attributes that break the landing visual pattern.
  const withoutFontTags = html
    .replace(/<font\b[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
    .replace(/\scolor=(['"]).*?\1/gi, '')

  // Remove inline color/background declarations while preserving other style rules.
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

const formattedLocationText = computed(() => {
  const text = sanitizeRichTextTheme(locationMeta.value.body || '')
  if (!text) return ''
  
  // Se parece conter HTML estrutural gerado pelo editor, retorna como está e deixa o CSS cuidar dos espaçamentos
  if (text.includes('<p>') || text.includes('<div>') || text.includes('<ul>') || text.includes('<li>')) {
    return text
  }

  // Caso contrário, trata como texto puro (markdown simples ou rascunho sem HTML)
  // Converte quebras de linha em parágrafos, preservando linhas vazias como espaços
  return text
    .split('\n')
    .map((t: string) => `<p>${t.trim() || '&nbsp;'}</p>`)
    .join('')
})

const totalLots = computed(() => project.value?.lotSummary?.total ?? 0)
const availableLots = computed(() => project.value?.lotSummary?.available ?? 0)
const reservedLots = computed(() => project.value?.lotSummary?.reserved ?? 0)
const soldLots = computed(() => project.value?.lotSummary?.sold ?? 0)

const minArea = computed(() => {
  if (project.value?.startingArea) return project.value.startingArea
  const area = project.value?.lotSummary?.minArea
  return (area && area > 0) ? area : null
})

const priceRange = computed(() => {
  if (project.value?.startingPrice) {
    return formatCurrencyToBrasilia(project.value.startingPrice)
  }
  const min = project.value?.lotSummary?.minPrice
  return (min && min > 0) ? formatCurrencyToBrasilia(Number(min)) : null
})

const hasHeroBanner = computed(() => {
  return !!(
    project.value?.bannerImageUrl
    || project.value?.bannerImageTabletUrl
    || project.value?.bannerImageMobileUrl
  )
})

const heroBannerDesktopUrl = computed(() => {
  return project.value?.bannerImageUrl
    || project.value?.bannerImageTabletUrl
    || project.value?.bannerImageMobileUrl
    || ''
})

const heroBannerTabletUrl = computed(() => {
  return project.value?.bannerImageTabletUrl
    || heroBannerDesktopUrl.value
    || project.value?.bannerImageMobileUrl
    || ''
})

const heroBannerMobileUrl = computed(() => {
  return project.value?.bannerImageMobileUrl
    || heroBannerTabletUrl.value
    || heroBannerDesktopUrl.value
    || ''
})

const heroBackgroundStyle = computed(() => {
  const desktop = heroBannerDesktopUrl.value
  const tablet = heroBannerTabletUrl.value || desktop
  const mobile = heroBannerMobileUrl.value || tablet || desktop
  if (!desktop && !tablet && !mobile) return {}

  const cssUrl = (value: string) => `url(\"${String(value || '').replace(/\"/g, '\\\"')}\")`

  return {
    '--v4-hero-bg-desktop': cssUrl(desktop || tablet || mobile),
    '--v4-hero-bg-tablet': cssUrl(tablet || desktop || mobile),
    '--v4-hero-bg-mobile': cssUrl(mobile || tablet || desktop),
  }
})

const lotPageUrl = (lot: any) => {
  const code = lot.code || lot.name || lot.id
  const base = pathPrefix.value === '' 
    ? `/${encodeURIComponent(code)}` 
    : `${pathPrefix.value}/${encodeURIComponent(code)}`

  return corretorCode ? `${base}${base.includes('?') ? '&' : '?'}c=${corretorCode}` : base
}

onMounted(async () => {
  detectTouchMobile()
  window.addEventListener('resize', detectTouchMobile)
  window.addEventListener('keydown', handleModalKeyDown)

  // Builder mode: data is provided via projectProp — skip public API fetch
  if (props.projectProp) {
    loading.value = false
    // Still fetch panoramas (non-blocking) using the project ID
    if (props.projectProp.id) {
      getPublicPanoramas(props.projectProp.id, false).then((panos) => {
        panoramas.value = panos ?? []
      }).catch(() => {})
    }
    return
  }

  try {
    const baseUrl = isPreview.value ? `/p/preview/${previewId.value}` : `/p/${projectSlug.value}`

    const [p, c, s] = await Promise.allSettled([
      fetchPublic(baseUrl),
      corretorCode && !isPreview.value ? fetchPublic(`${baseUrl}/corretores/${corretorCode}`) : Promise.resolve(null),
      !isPreview.value ? fetchPublic(`${baseUrl}/scheduling/config`).catch(() => null) : Promise.resolve(null)
    ])
    if (p.status === 'fulfilled') {
      project.value = p.value
      chatStore.setProject(p.value)
      
      if (s.status === 'fulfilled' && s.value) {
        schedulingConfig.value = s.value
      }
      // Initialize tracking handled by middleware
      useHead({
        title: `Loteamento ${p.value.name} — ${p.value.tenant?.name}`,
        meta: [
          { name: 'description', content: p.value.description || '' },
          { name: 'theme-color', content: '#ffffff' }
        ]
      })
      // Fetch plant map lazily — only when the #planta section enters the viewport.
      // This avoids a heavy API call for users who never scroll to the map section.
      if (p.value.plantMap) {
        let plantMapLoaded = false
        const loadPlantMap = () => {
          if (plantMapLoaded) return
          plantMapLoaded = true
          getPublicPlantMap(p.value.id, isPreview.value).then((pm) => {
            plantMap.value = pm
          }).catch(() => {})
        }

        nextTick(() => {
          const plantSection = document.getElementById('planta')
          if (!plantSection || typeof IntersectionObserver === 'undefined') {
            // Fallback: load immediately if section not in DOM yet or no IO support
            loadPlantMap()
            return
          }
          const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
              loadPlantMap()
              observer.disconnect()
            }
          }, { rootMargin: '300px' })
          observer.observe(plantSection)
        })
      }
      // Fetch panoramas for this project (non-blocking)
      getPublicPanoramas(p.value.id, isPreview.value).then((panos) => {
        panoramas.value = panos ?? []
      }).catch(() => {})
      // NearbyPlaces component emits @update:visible for side menu
    }
    else error.value = (p.reason as any)?.message || 'Projeto não encontrado'
    if (c.status === 'fulfilled' && c.value) corretor.value = c.value
  } catch (e: any) {
    error.value = e.message || 'Projeto não encontrado'
  }
  loading.value = false
})

onUnmounted(() => {
  window.removeEventListener('resize', detectTouchMobile)
  window.removeEventListener('keydown', handleModalKeyDown)
  document.body.style.overflow = ''
})

async function submitLead() {
  if (!validatePhone(leadForm.value.phone)) {
    leadError.value = 'Telefone inválido (mínimo 10 dígitos)'
    return
  }
  if (!validateEmail(leadForm.value.email)) {
    leadError.value = 'E-mail inválido'
    return
  }

  submitting.value = true
  leadError.value = ''
  try {
    const body = {
      name: leadForm.value.name,
      email: leadForm.value.email,
      phone: unmask(leadForm.value.phone),
      mapElementId: leadForm.value.mapElementId || undefined,
      message: leadForm.value.message || undefined,
      realtorCode: corretorCode || undefined,
      sessionId: trackingStore.sessionId || undefined,
      aiChatTranscript: chatStore.getTranscript() || undefined,
    }
    await fetchPublic(`/p/${projectSlug.value}/leads`, {
      method: 'POST',
      body: JSON.stringify(body),
    })

    // Track Lead Submit
    tracking.trackLeadSubmit('FORM', { source: 'main_page' })

    leadSuccess.value = true
    toastSuccess('Formulário enviado com sucesso!')
    leadForm.value = { name: '', email: '', phone: '', mapElementId: '', message: '' }
    if (chatStore.hasConversation()) chatStore.clear()
  } catch (e: any) {
    leadError.value = e.message || 'Erro ao enviar'
  }
  submitting.value = false
}

function openLeadForm(el: any) {
  leadForm.value.mapElementId = el?.id || ''
  
  if (el?.label || el?.code) {
    leadForm.value.message = `Tenho interesse no lote ${el.label || el.code}`
  }
  document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })
}

function openLightbox(idx: number) {
  lightboxIdx.value = idx
  lightboxOpen.value = true
}

// ─── Page Builder ─────────────────────────────────────────────────────────

const sectionsLayout = computed<PageSection[]>(() => {
  // Builder mode: use the sections array passed directly from the builder
  if (props.sectionsProp) return props.sectionsProp
  if (!project.value) return []
  // Pass runtime data so defaults reflect what's really available
  const p = {
    ...project.value,
    plantMap: project.value.plantMap,
    panoramas: panoramas.value,
    schedulingConfig: schedulingConfig.value,
  }
  return resolveSectionsLayout(p)
})

const sortedSections = computed<PageSection[]>(() =>
  [...sectionsLayout.value].sort((a, b) => a.order - b.order)
)

/** Config for a specific section type (first match) */
function getSectionConfig(type: string): Record<string, any> {
  return sectionsLayout.value.find((s) => s.type === type)?.config ?? {}
}

/** CSS order value for a section */
function getSectionOrder(type: string): number {
  return sectionsLayout.value.find((s) => s.type === type)?.order ?? 999
}

/** Whether the section should render (explicit false → hidden) */
function isSectionVisible(type: string): boolean {
  const sec = sectionsLayout.value.find((s) => s.type === type)
  return sec ? sec.visible !== false : true
}

/** Inline style object from section config (bg, text color, padding) */
function pbSectionStyle(type: string): Record<string, string> {
  return getSectionStyle(getSectionConfig(type) as any)
}

/** Title / subtitle override helpers — fall back to project defaults */
function secTitle(type: string, fallback: string): string {
  return getSectionConfig(type).title || fallback
}
function secSubtitle(type: string, fallback: string): string {
  return getSectionConfig(type).subtitle || fallback
}

/** Text-align class from config */
function secAlignClass(type: string): string {
  const align = getSectionConfig(type).titleAlign
  if (!align || align === 'left') return ''
  if (align === 'center') return 'center'
  if (align === 'right') return 'right'
  return ''
}

// ─── Builder edit-mode helpers ─────────────────────────────────────────────

/**
 * Returns CSS class string for edit-mode hover/selection overlays.
 * sectionId is the section's unique ID (= type for widget sections).
 */
function pbEditClass(sectionId: string): string | null {
  if (!props.editMode) return null
  return props.selectedId === sectionId ? 'pb-editable pb-selected' : 'pb-editable'
}

/**
 * Delegated click handler attached to .pub-page-body in editMode.
 * Finds the nearest element with data-section-id, stops event propagation,
 * and emits sectionClick so the builder can select the section.
 */
function onPreviewClick(e: Event) {
  if (!props.editMode) return
  const target = e.target as HTMLElement
  const sectionEl = target.closest('[data-section-id]') as HTMLElement | null
  if (!sectionEl?.dataset.sectionId) return

  emit('sectionClick', sectionEl.dataset.sectionId)

  // For contenteditable text elements, let the click reach the element so the browser can focus it.
  // Only stop propagation for non-editable areas (where default click behavior isn't needed).
  if (!target.closest('[data-editable-text]')) {
    e.stopPropagation()
    e.preventDefault()
  }
}

/** Relay inline text edits from EditableText components up to the builder. */
function onTextUpdate(key: string, val: string) {
  emit('textUpdate', key, val)
}

/** Free sections (text, text_image, image_block) sorted by order */
const freeSections = computed<PageSection[]>(() =>
  sortedSections.value.filter((s) =>
    s.type === 'text' || s.type === 'text_image' || s.type === 'image_block'
  )
)
</script>

