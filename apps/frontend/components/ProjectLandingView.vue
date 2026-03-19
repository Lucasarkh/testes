<template>
  <div class="pub-page">
    <!-- Error -->
    <div v-if="error && !project" class="pub-error">
      <div class="pub-error-card card">
        <h2>Projeto não encontrado</h2>
        <p>{{ error }}</p>
        <NuxtLink to="/" class="v4-btn-primary" style="display: inline-flex; align-items: center; gap: 8px; margin-top: 1rem;"><i class="bi bi-arrow-left-short back-nav-icon" aria-hidden="true"></i><span class="back-nav-label">Voltar ao início</span></NuxtLink>
      </div>
    </div>

    <!-- Project -->
    <template v-else-if="project">
      <ProjectSideMenu
        :items="publicSideMenuItems"
      />

      <!-- Hero section -->
      <section id="inicio" class="v4-hero" :class="{ 'has-banner': hasHeroBanner }">
        <div v-if="hasHeroBanner" class="v4-hero-bg" :style="heroBackgroundStyle"></div>
        <div class="v4-hero-overlay"></div>

        <div class="v4-container">
          <div class="v4-hero-content">
            <div class="v4-hero-text">
              <span class="v4-hero-tag">{{ heroTagLabel }}</span>
              <h1 class="v4-hero-title text-balance">{{ project.name }}</h1>
              <p v-if="project.description" class="v4-hero-desc text-balance">{{ project.description }}</p>
              <div class="v4-hero-actions">
                <a href="#planta" class="v4-btn-primary v4-hero-btn" @click="tracking.trackClick('Botão: Ver Planta Interativa')">Ver Planta Interativa</a>
                <NuxtLink to="/sou-cliente" class="v4-btn-white v4-hero-btn" @click="tracking.trackClick('Botão: Sou Cliente')">Sou cliente</NuxtLink>
                <a v-if="schedulingConfig?.enabled" href="#agendamento" class="v4-btn-white v4-hero-btn" @click="tracking.trackClick('Botão: Agendar Visita')">Agendar Visita</a>
                <a href="#contato" class="v4-btn-white v4-hero-btn" @click="tracking.trackClick(heroContactTrackingLabel)">{{ heroContactLabel }}</a>
              </div>
            </div>

            <div class="v4-hero-stats">
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

      <div v-if="showPreLaunchBar" class="v4-prelaunch-bar">
        <button
          type="button"
          class="v4-prelaunch-dismiss"
          aria-label="Fechar aviso de pré-lançamento"
          @click="dismissPreLaunchBar"
        >
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
        <div class="v4-container">
          <div class="v4-prelaunch-inner">
            <div class="v4-prelaunch-copy">
              <span class="v4-prelaunch-kicker">Pré-lançamento</span>
              <strong class="v4-prelaunch-title">Acesso antecipado exclusivo e fila de preferência liberados</strong>
              <p class="v4-prelaunch-text">
                Entre na fila agora para receber atendimento prioritário, condições antecipadas e aviso antes da abertura oficial.
                <span v-if="corretor">Seu atendimento com corretor exclusivo continua normalmente logo abaixo.</span>
              </p>
            </div>
            <div class="v4-prelaunch-actions">
              <a href="#contato" class="v4-prelaunch-btn" @click="tracking.trackClick(preLaunchBarTrackingLabel)">
                {{ preLaunchBarCtaLabel }}
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Trust bar -->
      <div v-if="corretor" class="v4-trust-bar" :class="{ 'v4-trust-bar--with-prelaunch': showPreLaunchBar }">
        <div class="v4-container">
          <div class="v4-trust-inner">
            <div class="v4-trust-person">
              <div class="v4-trust-avatar">
                <img v-if="corretor.photoUrl || corretor.profileImageUrl || corretor.avatarUrl" :src="corretor.photoUrl || corretor.profileImageUrl || corretor.avatarUrl" :alt="corretor.name" />
                <span v-else class="v4-avatar-placeholder">{{ corretor.name[0] }}</span>
              </div>
              <div class="v4-trust-info">
                <span class="v4-trust-label">Atendimento Exclusivo</span>
                <strong class="v4-trust-name">{{ corretor.name }}</strong>
                <span v-if="corretor.creci" class="v4-trust-creci">CRECI {{ corretor.creci }}</span>
              </div>
            </div>
            <div class="v4-trust-actions">
              <a v-if="corretor.phone" :href="`https://wa.me/${corretor.phone.replace(/\D/g,'')}`" target="_blank" class="v4-trust-btn v4-trust-btn--whatsapp" @click="tracking.trackWhatsappClick({ realtorName: corretor.name })">
                <span>WhatsApp</span>
              </a>
              <a href="#contato" class="v4-trust-btn v4-trust-btn--primary" @click="tracking.trackClick(trustBarTrackingLabel)">
                <span>{{ primaryInterestLabel }}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <Transition name="v4-sales-motion-fade">
        <div v-if="currentSalesNotice" class="v4-sales-motion-toast" aria-live="polite" aria-atomic="true">
          <span class="v4-sales-motion-dot"></span>
          <span>{{ currentSalesNotice }}</span>
        </div>
      </Transition>

      <!-- Texto Descritivo -->
      <section v-if="showDescriptionBlock" class="v4-section" id="info" :style="publicSectionStyle('pub-description')">
        <div class="v4-container">
          <div v-if="hasLocationHeader" class="v4-section-header center v4-description-header">
            <h2 v-if="locationTitle" class="v4-section-title">{{ locationTitle }}</h2>
            <p v-if="locationSubtitle" class="v4-section-subtitle">{{ locationSubtitle }}</p>
          </div>

          <div v-if="hasMeaningfulLocationText" class="v4-rich-content" v-html="formattedLocationText" style="margin-bottom: 80px;"></div>
        </div>
      </section>

      <!-- Infraestrutura -->
      <section v-if="showInfrastructureBlock && infrastructureCategories.length" class="v4-section" id="infraestrutura" :style="publicSectionStyle('pub-infra')">
        <div class="v4-container">
          <div class="v4-infra-split">
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
      <section v-if="project?.plantMap && isPublicSectionEnabled('pub-plant')" class="v4-section v4-section-alt" id="planta" :style="publicSectionStyle('pub-plant')">
        <div class="v4-container">
          <div class="v4-section-header center">
            <h2 class="v4-section-title">Planta Interativa</h2>
            <p class="v4-section-subtitle">Explore a implantação do loteamento. Clique nos pontos para mais informações.</p>
          </div>
          <ClientOnly>
            <div class="v4-plant-map-shell" :class="{ 'is-interaction-disabled': !isPlantMapInteractive }" style="height: 540px; border-radius: 16px; overflow: hidden; box-shadow: var(--v4-shadow-elevated); position: relative;">
              <PlantMapViewer
                v-if="plantMap"
                :plant-map="plantMap"
                :show-controls="true"
                :show-legend="true"
                :interactive="isPlantMapInteractive"
              />
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
      <section v-if="panoramas.length && isPublicSectionEnabled('pub-panorama')" class="v4-section" id="panorama" :style="publicSectionStyle('pub-panorama')">
        <div class="v4-container">
          <div class="v4-section-header center">
            <h2 class="v4-section-title">Vista 360°</h2>
            <p class="v4-section-subtitle">Explore o empreendimento e seus arredores com vista panorâmica.</p>
          </div>
          <ClientOnly>
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
      <section v-if="project.youtubeVideoUrl && isPublicSectionEnabled('pub-video')" class="v4-section v4-section-alt" id="video-apresentacao" :style="publicSectionStyle('pub-video')">
        <div class="v4-container">
          <div class="v4-section-header center">
            <h2 class="v4-section-title">Apresentação</h2>
            <p class="v4-section-subtitle">Assista ao vídeo e conheça cada detalhe do empreendimento.</p>
          </div>
          <div class="v4-video-wrapper">
            <iframe 
              v-if="youtubeEmbedUrl"
              :src="youtubeEmbedUrl" 
              width="100%" height="100%" frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen
            ></iframe>
            <a v-else :href="project.youtubeVideoUrl" target="_blank" class="v4-video-placeholder">
              <span>Assistir Vídeo no YouTube</span>
            </a>
          </div>
        </div>
      </section>

      
      <!-- New Traditional Highlights "Destaques" -->
      <section v-if="hasTraditionalInfo && isPublicSectionEnabled('pub-highlights')" class="v4-section" id="destaques" :style="publicSectionStyle('pub-highlights')">
        <div v-if="traditionalHighlights.length" class="v4-container">
          <div class="v4-destaques-grid-v2">
            <div class="v4-section-header center" style="margin-bottom: 56px;">
              <h2 class="v4-section-title">{{ project.traditionalHighlightsTitle || 'Destaques' }}</h2>
              <p class="v4-section-subtitle">{{ project.traditionalHighlightsSubtitle || 'Diferenciais pensados para o seu bem-estar.' }}</p>
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

      <!-- Available Lots Carousel -->
      <section v-if="(project?.lotSummary?.available ?? 0) > 0 && isPublicSectionEnabled('pub-lots-carousel')" class="v4-section v4-section-alt" id="carrossel-lotes" :style="publicSectionStyle('pub-lots-carousel')">
        <div class="v4-container">
          <div class="v4-section-header v4-lots-carousel-header">
            <h2 class="v4-section-title"></h2>
            <p class="v4-section-subtitle"></p>
          <div class="v4-lots-carousel-header-content">
            <h2 class="v4-section-title">Explore as Melhores Oportunidades</h2>
            <p class="v4-section-subtitle">Encontre o lote ideal com as características que você busca.</p>
          </div>
          </div>
        </div>

        <ClientOnly>
          <div class="v4-lots-carousel-bleed">
            <Swiper
              class="v4-lots-swiper"
              :modules="lotCarouselModules"
              :autoplay="lotCarouselAutoplay"
              :breakpoints="lotCarouselBreakpoints"
              :grab-cursor="true"
              :loop="availableLotsCarouselShouldLoop"
              :slides-per-view="1.85"
              :space-between="16"
              :speed="520"
              :watch-overflow="true"
              @swiper="handleAvailableLotsSwiper"
              @slideChange="handleAvailableLotsSlideChange"
            >
              <SwiperSlide v-for="lot in displayedAvailableLots" :key="availableLotSlideKey(lot)">
                <NuxtLink
                  :to="lotPageUrl(lot)"
                  class="v4-lot-card v4-lot-card--compact"
                  @click="tracking.trackLotClick(lot.code || lot.name || lot.id, lot.id)"
                >
                  <div class="v4-lot-card-header v4-lot-card-header--compact">
                    <div class="v4-lot-id v4-lot-id--compact">
                      <span v-if="resolveLandingLotSecondaryLabel(lot)" class="v4-lot-label">{{ resolveLandingLotSecondaryLabel(lot) }}</span>
                      <span class="v4-lot-code v4-lot-code--compact">{{ resolveLandingLotDisplayName(lot) }}</span>
                    </div>
                    <div class="v4-lot-status">Disponível</div>
                  </div>

                  <div v-if="formatLandingLotMeta(lot)" class="v4-lot-mini-meta">
                    <span>{{ formatLandingLotMeta(lot) }}</span>
                  </div>

                  <div class="v4-lot-mini-stats">
                    <div class="v4-lot-mini-stat">
                      <span class="v4-lot-mini-stat-label">Tamanho total</span>
                      <strong>{{ formatLandingLotArea(lot) }}</strong>
                    </div>
                    <div class="v4-lot-mini-stat">
                      <span class="v4-lot-mini-stat-label">Valor total</span>
                      <strong>{{ formatLandingLotPrice(lot) }}</strong>
                    </div>
                  </div>

                  <div class="v4-lot-card-footer v4-lot-card-footer--compact">Detalhes <span class="v4-icon">→</span></div>
                </NuxtLink>
              </SwiperSlide>
            </Swiper>
          </div>
          <template #fallback>
            <div class="v4-lots-carousel-bleed">
              <div class="v4-lots-carousel-fallback">
                <NuxtLink
                  v-for="lot in displayedAvailableLots.slice(0, 6)"
                  :key="availableLotSlideKey(lot)"
                  :to="lotPageUrl(lot)"
                  class="v4-lot-card v4-lot-card--compact v4-lot-card--fallback"
                  @click="tracking.trackLotClick(lot.code || lot.name || lot.id, lot.id)"
                >
                  <div class="v4-lot-card-header v4-lot-card-header--compact">
                    <div class="v4-lot-id v4-lot-id--compact">
                      <span v-if="resolveLandingLotSecondaryLabel(lot)" class="v4-lot-label">{{ resolveLandingLotSecondaryLabel(lot) }}</span>
                      <span class="v4-lot-code v4-lot-code--compact">{{ resolveLandingLotDisplayName(lot) }}</span>
                    </div>
                    <div class="v4-lot-status">Disponível</div>
                  </div>
                  <div v-if="formatLandingLotMeta(lot)" class="v4-lot-mini-meta">
                    <span>{{ formatLandingLotMeta(lot) }}</span>
                  </div>
                  <div class="v4-lot-mini-stats">
                    <div class="v4-lot-mini-stat">
                      <span class="v4-lot-mini-stat-label">Tamanho total</span>
                      <strong>{{ formatLandingLotArea(lot) }}</strong>
                    </div>
                    <div class="v4-lot-mini-stat">
                      <span class="v4-lot-mini-stat-label">Valor total</span>
                      <strong>{{ formatLandingLotPrice(lot) }}</strong>
                    </div>
                  </div>
                </NuxtLink>
              </div>
            </div>
          </template>
        </ClientOnly>

        <div class="v4-container">
          <div class="v4-lots-carousel-footer">
            <span v-if="availableLotsCarouselLoading && availableLotsCarouselHasMore" class="v4-lots-carousel-status">
              Carregando mais unidades...
            </span>
            <span v-else-if="availableLotsCarouselError && !displayedAvailableLots.length" class="v4-lots-carousel-status v4-lots-carousel-status--error">
              {{ availableLotsCarouselError }}
            </span>

            <div v-if="(project?.lotSummary?.available ?? 0) > 6" class="v4-lots-carousel-cta">
              <NuxtLink :to="unitsUrl" class="v4-btn-primary v4-lots-carousel-cta-btn" @click="tracking.trackClick('Botão: Ver todas unidades')">
                Ver todos os {{ project?.lotSummary?.available ?? 0 }} lotes disponíveis
              </NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <!-- Available Lots Grid -->
      <section v-if="(project?.lotSummary?.available ?? 0) > 0 && isPublicSectionEnabled('pub-lots')" class="v4-section v4-section-alt" id="lotes" :style="publicSectionStyle('pub-lots')">
        <div class="v4-container">
          <div class="v4-section-header">
            <h2 class="v4-section-title">Nossas Unidades</h2>
            <p class="v4-section-subtitle">Selecione uma opção abaixo para ver metragens e condições.</p>
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
                  <span v-if="resolveLandingLotSecondaryLabel(lot)" class="v4-lot-label">{{ resolveLandingLotSecondaryLabel(lot) }}</span>
                  <span v-else class="v4-lot-label">Unidade disponível</span>
                  <span class="v4-lot-code">{{ resolveLandingLotDisplayName(lot) }}</span>
                </div>
                <div class="v4-lot-status">Disponível</div>
              </div>
              
              <div class="v4-lot-card-body">
                <div class="v4-lot-info-row">
                  <span class="v4-info-item"><i class="bi bi-bounding-box" aria-hidden="true"></i> {{ formatLandingLotArea(lot) }}</span>
                  <span v-if="lot.lotDetails?.pricePerM2" class="v4-info-item"><i class="bi bi-cash-stack" aria-hidden="true"></i> {{ formatCurrencyToBrasilia(lot.lotDetails.pricePerM2) }} / m²</span>
                  <span v-else-if="lot.lotDetails?.frontage" class="v4-info-item">↔ {{ lot.lotDetails.frontage }}m frente</span>
                </div>
                <div class="v4-lot-price">
                  <span class="v4-price-label">Valor do investimento</span>
                  <span class="v4-price-value">{{ formatLandingLotPrice(lot) }}</span>
                </div>
              </div>
              
              <div class="v4-lot-card-footer">
                <span>Ver detalhes do lote</span>
                <span class="v4-icon">→</span>
              </div>
            </NuxtLink>
          </div>

          <div v-if="(project?.lotSummary?.available ?? 0) > 6" class="v4-lots-grid-cta">
            <NuxtLink :to="unitsUrl" class="v4-btn-primary v4-lots-carousel-cta-btn" @click="tracking.trackClick('Botão: Ver todas unidades')">
              Ver todos os {{ project?.lotSummary?.available ?? 0 }} lotes disponíveis
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- Construction Progress -->
      <section v-if="project.constructionStatus && project.constructionStatus.length && isPublicSectionEnabled('pub-construction')" class="v4-section" id="obras" :style="publicSectionStyle('pub-construction')">
        <div class="v4-container">
          <div class="v4-section-header center">
            <h2 class="v4-section-title">Acompanhamento de Obras</h2>
            <p class="v4-section-subtitle">Acompanhe a evolução do projeto em tempo real.</p>
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
          </div>
        </div>
      </section>

      <!-- Media gallery -->
      <section v-if="project.projectMedias?.length && isPublicSectionEnabled('pub-gallery')" class="v4-section v4-section-alt" id="galeria" :style="publicSectionStyle('pub-gallery')">
        <div class="v4-container">
          <div class="v4-section-header">
            <h2 class="v4-section-title">Galeria de Fotos</h2>
            <p class="v4-section-subtitle">Conheça os detalhes e a infraestrutura do empreendimento.</p>
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
                :loading="Number(i) < 4 ? 'eager' : 'lazy'"
                :fetchpriority="Number(i) < 2 ? 'high' : 'auto'"
                decoding="async"
              />
              <video v-else :src="m.url" preload="metadata" />
              <div class="v4-gallery-overlay">
                <span v-if="m.caption" class="v4-gallery-caption">{{ m.caption }}</span>
                <span class="v4-gallery-expand">↗</span>
              </div>
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
      <section v-if="(project.googleMapsUrl || project.address) && isPublicSectionEnabled('pub-location')" class="v4-section" id="localizacao" :style="publicSectionStyle('pub-location')">
        <div class="v4-container">
          <div class="v4-section-header center">
            <h2 class="v4-section-title">Nossa Localização</h2>
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
      <div v-if="projectSlug && isPublicSectionEnabled('pub-nearby')" :style="publicSectionStyle('pub-nearby')">
        <LandingNearbyPlaces :project-slug="projectSlug" @update:visible="hasNearbyData = $event" />
      </div>

      <!-- Agendamento Section -->
      <section
        v-if="project && schedulingConfig?.enabled && isPublicSectionEnabled('pub-scheduling')"
        class="v4-section"
        id="agendamento"
        :style="{ ...publicSectionStyle('pub-scheduling'), background: '#1d1d1f', color: 'white' }"
      >
        <div class="v4-container">
          <div class="v4-schedule-row">
            <div class="v4-schedule-info">
              <h2 class="v4-section-title" style="color: white;">Ficou interessado?<br>Venha conhecer de perto.</h2>
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
      <section v-if="isPublicSectionEnabled('pub-contact')" class="v4-section" id="contato" :style="{ ...publicSectionStyle('pub-contact'), background: '#fbfbfd', padding: '120px 0' }">
        <div class="v4-container">
          <div class="v4-conversion-card-new">
            <div class="v4-conversion-content">
              <div class="v4-conversion-header-new">
                <div class="v4-badge-clean">
                  <span class="v4-pulse-blue"></span>
                  {{ conversionBadgeText }}
                </div>
                <h2 class="v4-title-display">{{ conversionTitle }}</h2>
                <p class="v4-subtitle-clean">{{ conversionSubtitle }}</p>
                
                <div v-if="(project?.lotSummary?.total ?? 0) > 0" class="v4-lot-badge-minimal">
                  <span class="v4-sparkle"><i class="bi bi-stars" aria-hidden="true"></i></span> {{ conversionAvailabilityText }}
                </div>
              </div>

              <div class="v4-form-container-new">
                <div v-if="leadSuccess" class="v4-form-success-new">
                  <div class="v4-success-circle">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h3>{{ leadSuccessTitle }}</h3>
                  <p>{{ leadSuccessMessage }}</p>
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
                    <textarea v-model="leadForm.message" rows="3" :placeholder="leadMessagePlaceholder"></textarea>
                  </div>

                  <label class="v4-form-checkbox">
                    <input v-model="leadForm.acceptTerms" type="checkbox" required />
                    <span>{{ leadTermsLabel }}</span>
                  </label>

                  <div v-if="leadError" class="v4-form-error-msg">{{ leadError }}</div>
                  
                  <button type="submit" class="v4-btn-submit-modern" :disabled="submitting" @click="tracking.trackClick(formSubmitTrackingLabel)">
                    {{ submitting ? 'Enviando...' : leadSubmitButtonLabel }}
                  </button>
                  <p class="v4-privacy-legal">Seus dados estão seguros conosco.</p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Legal Notice -->
      <section v-if="project.legalNotice && isPublicSectionEnabled('pub-legal')" class="v4-legal-notice">
        <div class="v4-container">
          <div class="v4-legal-inner">
            <div class="v4-legal-icon"><i class="bi bi-clipboard-check" aria-hidden="true"></i></div>
            <p class="v4-legal-text">{{ project.legalNotice }}</p>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="v4-footer">
        <div class="v4-container">
          <div class="v4-footer-inner">
            <!-- Logos: Realização e Propriedade -->
            <div v-if="project.logos?.length && isPublicSectionEnabled('pub-logos')" class="v4-footer-realizacao">
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

      <CommonMediaLightbox
        v-model="lightboxOpen"
        :items="project.projectMedias || []"
        :initial-index="lightboxIdx"
      />

      <!-- Sticky mobile CTA -->
      <nav class="v4-sticky-nav">
        <a v-if="project?.plantMap" href="#planta" class="v4-nav-item">Planta</a>
        <a v-if="panoramas.length" href="#panorama" class="v4-nav-item">Panorama</a>
        <a v-if="(project?.lotSummary?.available ?? 0) > 0" href="#lotes" class="v4-nav-item">Unidades</a>
        <a href="#contato" class="v4-nav-item v4-nav-cta">{{ stickyInterestLabel }}</a>
      </nav>

      <Transition name="fade">
        <div
          v-if="showPreferenceOnboarding"
          ref="onboardingOverlayRef"
          class="v4-onboarding-overlay"
          @click.self="dismissPreferenceOnboarding"
        >
          <div ref="onboardingCardRef" class="v4-onboarding-shell">
            <span class="v4-onboarding-orb v4-onboarding-orb--one"></span>
            <span class="v4-onboarding-orb v4-onboarding-orb--two"></span>
            <span class="v4-onboarding-orb v4-onboarding-orb--three"></span>

            <div class="v4-onboarding-head" data-onboarding-animate>
              <div class="v4-onboarding-head-top">
                <div class="v4-onboarding-head-row">
                  <span class="v4-onboarding-step-label">{{ onboardingStepCaption }}</span>
                  <span class="v4-onboarding-mini-note">Leva menos de 30 segundos</span>
                </div>
                <button class="v4-onboarding-dismiss" @click="dismissPreferenceOnboarding">Não agora</button>
              </div>
              <div class="v4-onboarding-progress">
                <span ref="onboardingProgressFillRef"></span>
              </div>
            </div>

            <div ref="onboardingContentRef" class="v4-onboarding-content">
              <template v-if="onboardingCurrentStepKey === 'intro'">
                <div class="v4-onboarding-intro-grid">
                  <div class="v4-onboarding-copy" data-step-animate>
                    <h3>Vamos personalizar sua experiência</h3>
                    <p>
                      Responda algumas perguntas rápidas e eu te levo direto para as unidades com mais aderência ao que você procura.
                    </p>
                    <div class="v4-onboarding-summary-strip">
                      <span class="v4-onboarding-summary-pill">objetivo da busca</span>
                      <span class="v4-onboarding-summary-pill">metragem ideal</span>
                      <span class="v4-onboarding-summary-pill">faixa de investimento</span>
                      <span class="v4-onboarding-summary-pill">atributos do lote</span>
                    </div>
                  </div>

                  <div class="v4-onboarding-intro-visual" data-step-animate>
                    <div class="v4-onboarding-preview-card v4-onboarding-preview-card--primary">
                      <span class="v4-onboarding-preview-label">Busca guiada</span>
                      <strong>Escolhas simples, resultado direto.</strong>
                      <p>Sem formulários longos. Só respostas rápidas para abrir a busca certa.</p>
                    </div>
                    <div class="v4-onboarding-preview-stack">
                      <div class="v4-onboarding-preview-card">
                        <span class="v4-onboarding-preview-dot"></span>
                        <div>
                          <strong>{{ formatAreaValue(areaRangeBounds.min) }} ate {{ formatAreaValue(areaRangeBounds.max) }}</strong>
                          <p>Range guiado pela metragem real das unidades disponíveis.</p>
                        </div>
                      </div>
                      <div class="v4-onboarding-preview-card">
                        <span class="v4-onboarding-preview-dot"></span>
                        <div>
                          <strong>{{ formatCurrencyToBrasilia(priceRangeBounds.min) }} ate {{ formatCurrencyToBrasilia(priceRangeBounds.max) }}</strong>
                          <p>Faixa de investimento baseada no estoque atual do empreendimento.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <template v-else-if="onboardingCurrentStepKey === 'intent'">
                <div class="v4-onboarding-step-panel">
                  <div class="v4-onboarding-copy" data-step-animate>
                    <h3>O que você está buscando neste momento?</h3>
                    <p>Essa é a primeira leitura que vou usar para contextualizar sua busca e medir a intenção principal do interesse.</p>
                  </div>

                  <div class="v4-onboarding-summary-card" data-step-animate>
                    <span class="v4-onboarding-summary-title">Objetivo atual</span>
                    <div class="v4-onboarding-summary-chips">
                      <span class="v4-onboarding-chip" :class="{ 'is-empty': !searchIntent }">
                        {{ searchIntent ? getLotSearchIntentLabel(searchIntent) : 'Selecione o objetivo principal' }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="v4-onboarding-tag-cloud" data-step-animate>
                  <button
                    v-for="option in LOT_SEARCH_INTENT_OPTIONS"
                    :key="option.value"
                    class="v4-onboarding-tag"
                    :class="{ active: searchIntent === option.value }"
                    @click="searchIntent = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </template>

              <template v-else-if="onboardingCurrentStepKey === 'area'">
                <div class="v4-onboarding-step-panel">
                  <div class="v4-onboarding-copy" data-step-animate>
                    <h3>Qual tamanho de terreno faz mais sentido para você?</h3>
                    <p>Escolha uma faixa para priorizar as unidades com a metragem mais próxima do seu plano.</p>
                  </div>

                  <div class="v4-onboarding-summary-card" data-step-animate>
                    <span class="v4-onboarding-summary-title">Resumo até aqui</span>
                    <div class="v4-onboarding-summary-chips">
                      <span class="v4-onboarding-chip" :class="{ 'is-empty': !searchIntent }">
                        {{ searchIntent ? getLotSearchIntentLabel(searchIntent) : 'Objetivo ainda não definido' }}
                      </span>
                      <span class="v4-onboarding-chip" :class="{ 'is-empty': onboardingAreaRangeLabel === 'Qualquer faixa' }">
                        {{ onboardingAreaRangeLabel === 'Qualquer faixa' ? 'Sem metragem definida ainda' : onboardingAreaRangeLabel }}
                      </span>
                      <span class="v4-onboarding-chip is-empty">{{ onboardingPriceRangeLabel === 'Qualquer faixa' ? 'Sem faixa de valor' : onboardingPriceRangeLabel }}</span>
                    </div>
                  </div>
                </div>

                <div class="v4-smart-range-card v4-smart-range-card--guided" data-step-animate>
                  <div class="v4-smart-range-head">
                    <div>
                      <span class="v4-smart-range-label">Faixa de metragem</span>
                      <strong>{{ onboardingAreaRangeLabel }}</strong>
                    </div>
                    <span class="v4-smart-range-hint">Passos de {{ areaRangeStep }} m²</span>
                  </div>

                  <div class="v4-dual-range">
                    <div class="v4-dual-range-track" :style="onboardingAreaTrackStyle"></div>
                    <input class="v4-dual-range-input" type="range" :min="areaRangeBounds.min" :max="areaRangeBounds.max" :step="areaRangeStep" :value="currentOnboardingAreaRange.min" @input="updateOnboardingAreaMin(Number(($event.target as HTMLInputElement).value))" />
                    <input class="v4-dual-range-input" type="range" :min="areaRangeBounds.min" :max="areaRangeBounds.max" :step="areaRangeStep" :value="currentOnboardingAreaRange.max" @input="updateOnboardingAreaMax(Number(($event.target as HTMLInputElement).value))" />
                  </div>

                  <div class="v4-smart-range-values">
                    <div class="v4-smart-range-pill">
                      <span>Min</span>
                      <strong>{{ formatAreaValue(currentOnboardingAreaRange.min) }}</strong>
                    </div>
                    <div class="v4-smart-range-pill">
                      <span>Max</span>
                      <strong>{{ formatAreaValue(currentOnboardingAreaRange.max) }}</strong>
                    </div>
                  </div>
                </div>
              </template>

              <template v-else-if="onboardingCurrentStepKey === 'price'">
                <div class="v4-onboarding-step-panel">
                  <div class="v4-onboarding-copy" data-step-animate>
                    <h3>Em qual faixa de valor você quer concentrar a busca?</h3>
                    <p>Isso ajuda a abrir resultados mais próximos da sua realidade de investimento logo no primeiro clique.</p>
                  </div>

                  <div class="v4-onboarding-summary-card" data-step-animate>
                    <span class="v4-onboarding-summary-title">Resumo até aqui</span>
                    <div class="v4-onboarding-summary-chips">
                      <span class="v4-onboarding-chip" :class="{ 'is-empty': !searchIntent }">
                        {{ searchIntent ? getLotSearchIntentLabel(searchIntent) : 'Objetivo ainda não definido' }}
                      </span>
                      <span class="v4-onboarding-chip" :class="{ 'is-empty': onboardingAreaRangeLabel === 'Qualquer faixa' }">
                        {{ onboardingAreaRangeLabel === 'Qualquer faixa' ? 'Sem metragem definida ainda' : onboardingAreaRangeLabel }}
                      </span>
                      <span class="v4-onboarding-chip" :class="{ 'is-empty': onboardingPriceRangeLabel === 'Qualquer faixa' }">
                        {{ onboardingPriceRangeLabel === 'Qualquer faixa' ? 'Sem faixa de valor' : onboardingPriceRangeLabel }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="v4-smart-range-card v4-smart-range-card--guided" data-step-animate>
                  <div class="v4-smart-range-head">
                    <div>
                      <span class="v4-smart-range-label">Faixa de investimento</span>
                      <strong>{{ onboardingPriceRangeLabel }}</strong>
                    </div>
                    <span class="v4-smart-range-hint">Passos de {{ formatCurrencyToBrasilia(priceRangeStep) }}</span>
                  </div>

                  <div class="v4-dual-range">
                    <div class="v4-dual-range-track" :style="onboardingPriceTrackStyle"></div>
                    <input class="v4-dual-range-input" type="range" :min="priceRangeBounds.min" :max="priceRangeBounds.max" :step="priceRangeStep" :value="currentOnboardingPriceRange.min" @input="updateOnboardingPriceMin(Number(($event.target as HTMLInputElement).value))" />
                    <input class="v4-dual-range-input" type="range" :min="priceRangeBounds.min" :max="priceRangeBounds.max" :step="priceRangeStep" :value="currentOnboardingPriceRange.max" @input="updateOnboardingPriceMax(Number(($event.target as HTMLInputElement).value))" />
                  </div>

                  <div class="v4-smart-range-values">
                    <div class="v4-smart-range-pill">
                      <span>Min</span>
                      <strong>{{ formatCurrencyToBrasilia(currentOnboardingPriceRange.min) }}</strong>
                    </div>
                    <div class="v4-smart-range-pill">
                      <span>Max</span>
                      <strong>{{ formatCurrencyToBrasilia(currentOnboardingPriceRange.max) }}</strong>
                    </div>
                  </div>
                </div>
              </template>

              <template v-else-if="onboardingCurrentStepKey === 'tags'">
                <div class="v4-onboarding-step-panel">
                  <div class="v4-onboarding-copy" data-step-animate>
                    <h3>Existe algum atributo que pesa mais na sua decisão?</h3>
                    <p>Você pode marcar vários. Se não escolher nenhum, eu mostro as melhores oportunidades sem travar a busca.</p>
                  </div>

                  <div class="v4-onboarding-summary-card" data-step-animate>
                    <span class="v4-onboarding-summary-title">O que já ficou definido</span>
                    <div class="v4-onboarding-summary-chips">
                      <span class="v4-onboarding-chip" :class="{ 'is-empty': !searchIntent }">
                        {{ searchIntent ? getLotSearchIntentLabel(searchIntent) : 'Objetivo ainda não definido' }}
                      </span>
                      <span class="v4-onboarding-chip" :class="{ 'is-empty': onboardingAreaRangeLabel === 'Qualquer faixa' }">
                        {{ onboardingAreaRangeLabel === 'Qualquer faixa' ? 'Metragem livre' : onboardingAreaRangeLabel }}
                      </span>
                      <span class="v4-onboarding-chip" :class="{ 'is-empty': onboardingPriceRangeLabel === 'Qualquer faixa' }">
                        {{ onboardingPriceRangeLabel === 'Qualquer faixa' ? 'Valor livre' : onboardingPriceRangeLabel }}
                      </span>
                      <span class="v4-onboarding-chip" :class="{ 'is-empty': !onboardingSelectedTags.length }">
                        {{ onboardingSelectedTags.length ? `${onboardingSelectedTags.length} atributos selecionados` : 'Sem atributo obrigatório' }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="v4-onboarding-tag-cloud" data-step-animate>
                  <button
                    v-for="tag in allAvailableTags"
                    :key="tag"
                    class="v4-onboarding-tag"
                    :class="{ active: onboardingSelectedTags.includes(tag) }"
                    @click="toggleOnboardingTag(tag)"
                  >
                    {{ tag }}
                  </button>
                </div>
              </template>
            </div>

            <div class="v4-onboarding-footer" data-onboarding-animate>
              <div class="v4-onboarding-footer-copy">
                <strong>{{ onboardingSearchPreviewHeadline }}</strong>
                <span>{{ onboardingSearchPreviewBody }}</span>
              </div>

              <div class="v4-onboarding-footer-actions">
                <button
                  v-if="onboardingStepIndex > 0"
                  class="v4-onboarding-btn v4-onboarding-btn--ghost"
                  @click="goToPreviousOnboardingStep"
                >
                  Voltar
                </button>
                <button
                  class="v4-onboarding-btn v4-onboarding-btn--primary"
                  @click="handleOnboardingPrimaryAction"
                >
                  {{ onboardingPrimaryCtaLabel }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Floating Search CTA -->
      <div v-if="preferenceSearchAvailable" class="v4-floating-cta">
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

              <span class="v4-modal-label">O que você está buscando?</span>
              <div class="v4-modal-tags" style="margin-bottom: 24px;">
                <button
                  v-for="option in LOT_SEARCH_INTENT_OPTIONS"
                  :key="option.value"
                  class="v4-modal-tag"
                  :class="{ active: searchIntent === option.value }"
                  @click="searchIntent = option.value"
                >
                  {{ option.label }}
                </button>
              </div>

              <template v-if="allAvailableTags.length">
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
              </template>

              <span class="v4-modal-label">Busca Inteligente</span>
              <div class="v4-smart-grid">
                <div class="v4-smart-range-card v4-smart-range-card--modal v4-smart-grid-span-2">
                  <div class="v4-smart-range-head">
                    <div>
                      <span class="v4-smart-range-label">Faixa de área</span>
                      <strong>{{ smartAreaRangeLabel }}</strong>
                    </div>
                    <span class="v4-smart-range-hint">Disponível de {{ formatAreaValue(areaRangeBounds.min) }} a {{ formatAreaValue(areaRangeBounds.max) }}</span>
                  </div>

                  <div class="v4-dual-range">
                    <div class="v4-dual-range-track" :style="smartAreaTrackStyle"></div>
                    <input class="v4-dual-range-input" type="range" :min="areaRangeBounds.min" :max="areaRangeBounds.max" :step="areaRangeStep" :value="currentSmartAreaRange.min" @input="updateSmartAreaMin(Number(($event.target as HTMLInputElement).value))" />
                    <input class="v4-dual-range-input" type="range" :min="areaRangeBounds.min" :max="areaRangeBounds.max" :step="areaRangeStep" :value="currentSmartAreaRange.max" @input="updateSmartAreaMax(Number(($event.target as HTMLInputElement).value))" />
                  </div>

                  <div class="v4-smart-range-values">
                    <div class="v4-smart-range-pill">
                      <span>Min</span>
                      <strong>{{ formatAreaValue(currentSmartAreaRange.min) }}</strong>
                    </div>
                    <div class="v4-smart-range-pill">
                      <span>Max</span>
                      <strong>{{ formatAreaValue(currentSmartAreaRange.max) }}</strong>
                    </div>
                  </div>
                </div>

                <div class="v4-smart-range-card v4-smart-range-card--modal v4-smart-grid-span-2">
                  <div class="v4-smart-range-head">
                    <div>
                      <span class="v4-smart-range-label">Faixa de valor</span>
                      <strong>{{ smartPriceRangeLabel }}</strong>
                    </div>
                    <span class="v4-smart-range-hint">Disponível de {{ formatCurrencyToBrasilia(priceRangeBounds.min) }} a {{ formatCurrencyToBrasilia(priceRangeBounds.max) }}</span>
                  </div>

                  <div class="v4-dual-range">
                    <div class="v4-dual-range-track" :style="smartPriceTrackStyle"></div>
                    <input class="v4-dual-range-input" type="range" :min="priceRangeBounds.min" :max="priceRangeBounds.max" :step="priceRangeStep" :value="currentSmartPriceRange.min" @input="updateSmartPriceMin(Number(($event.target as HTMLInputElement).value))" />
                    <input class="v4-dual-range-input" type="range" :min="priceRangeBounds.min" :max="priceRangeBounds.max" :step="priceRangeStep" :value="currentSmartPriceRange.max" @input="updateSmartPriceMax(Number(($event.target as HTMLInputElement).value))" />
                  </div>

                  <div class="v4-smart-range-values">
                    <div class="v4-smart-range-pill">
                      <span>Min</span>
                      <strong>{{ formatCurrencyToBrasilia(currentSmartPriceRange.min) }}</strong>
                    </div>
                    <div class="v4-smart-range-pill">
                      <span>Max</span>
                      <strong>{{ formatCurrencyToBrasilia(currentSmartPriceRange.max) }}</strong>
                    </div>
                  </div>
                </div>

                <label class="v4-smart-field">
                  <span>Teto de valor por m² (R$)</span>
                  <input v-model="smartSearchForm.maxPricePerM2" type="number" min="0" step="10" placeholder="Ex: 650" />
                </label>
                <label class="v4-smart-field">
                  <span>Largura mínima (m)</span>
                  <input v-model="smartSearchForm.minFrontage" type="number" min="0" step="0.1" placeholder="Ex: 10" />
                </label>
                <label class="v4-smart-field">
                  <span>Altura mínima (m)</span>
                  <input v-model="smartSearchForm.minDepth" type="number" min="0" step="0.1" placeholder="Ex: 25" />
                </label>
              </div>

              <div class="v4-modal-options">
                <label class="v4-modal-option">
                  <input type="checkbox" v-model="exactMatchMode" />
                  <div class="v4-option-info">
                    <span class="v4-option-title">Correspondência Exata</span>
                    <span class="v4-option-desc">Mostrar apenas lotes que possuem todos os selos selecionados.</span>
                  </div>
                </label>
                <label class="v4-modal-option">
                  <input type="checkbox" v-model="smartSearchForm.sortByLowestPricePerM2" />
                  <div class="v4-option-info">
                    <span class="v4-option-title">Priorizar menor valor de m²</span>
                    <span class="v4-option-desc">Ordena os resultados do mais barato por m² para o mais caro.</span>
                  </div>
                </label>
              </div>
            </div>

            <div class="v4-modal-footer">
              <button class="v4-btn-modal-search" @click="applyFiltersAndSearch">
                {{ hasAnySmartFilter || selectedFilterTags.length ? `Ver ${filteredCount} unidades compatíveis` : 'Ver todas as unidades' }}
              </button>
              <button v-if="hasAnySmartFilter || selectedFilterTags.length" class="v4-btn-modal-clear" @click="resetIdealLotFilters">
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
import { gsap } from 'gsap'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { A11y, Autoplay } from 'swiper/modules'
import type { Swiper as SwiperInstance } from 'swiper'
import 'swiper/css'

import { useTenantStore } from '~/stores/tenant'
import { useAiChatStore } from '~/stores/aiChat'

const props = defineProps<{
  slug?: string
  id?: string
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
import { LOT_SEARCH_INTENT_OPTIONS, getLotSearchIntentLabel, normalizeLotSearchIntent, type LotSearchIntent } from '~/utils/lotSearchIntent'
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
        return `https://www.google.com/maps/embed/v1/place?key=&q=${encodeURIComponent(placeMatch[1] || '')}`
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

const showSchedulingModal = ref(false)
const error = ref('')
const project = ref<any>(null)
const corretor = ref<any>(null)
const plantMap = ref<PlantMap | null>(null)
const { getPublicPlantMap } = usePublicPlantMap()
const panoramas = ref<Panorama[]>([])
const schedulingConfig = ref<any>(null)
const hasNearbyData = ref(false)
const { getPublicPanoramas } = usePublicPanorama()
const currentSalesNotice = ref('')
const salesMotionHideTimerId = ref<number | null>(null)
const salesMotionInitialTimerId = ref<number | null>(null)
const salesMotionShownCount = ref(0)
const salesMotionLastShownAt = ref(0)
const salesMotionLastViews = ref(0)
const salesMotionLastVisits = ref(0)
const salesMotionReachedMilestones = ref<number[]>([])
const AVAILABLE_LOTS_BATCH_SIZE = 10
const lotCarouselModules = [A11y, Autoplay]
const lotCarouselAutoplay = {
  delay: 2000,
  disableOnInteraction: false,
  pauseOnMouseEnter: true,
}
const lotCarouselBreakpoints = {
  480: { slidesPerView: 2.4, spaceBetween: 16 },
  768: { slidesPerView: 3.6, spaceBetween: 18 },
  1024: { slidesPerView: 5, spaceBetween: 20 },
  1280: { slidesPerView: 6.2, spaceBetween: 20 },
  1536: { slidesPerView: 7, spaceBetween: 22 },
}
const availableLotsCarouselItems = ref<any[]>([])
const availableLotsCarouselPage = ref(0)
const availableLotsCarouselTotal = ref(0)
const availableLotsCarouselLoading = ref(false)
const availableLotsCarouselError = ref('')
const availableLotsSwiper = ref<SwiperInstance | null>(null)

const leadForm = ref({ name: '', email: '', phone: '', mapElementId: '', message: '', acceptTerms: false })
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

const normalizeLotIdentifier = (value?: string | null) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const availableLotSlideKey = (lot: any) => String(lot?.id || lot?.code || lot?.name || '')

const normalizeLandingLot = (lot: any) => ({
  id: lot?.id,
  name: lot?.name || lot?.code || 'Lote disponível',
  code: lot?.code || lot?.name || lot?.id,
  lotDetails: {
    ...(lot?.lotDetails || {}),
    status: String(lot?.lotDetails?.status || 'AVAILABLE').toUpperCase(),
    tags: Array.isArray(lot?.lotDetails?.tags) ? lot.lotDetails.tags : [],
  },
})

const resolveLandingLotDisplayName = (lot: any) => {
  const name = String(lot?.name || '').trim()
  const code = String(lot?.code || '').trim()
  const lotNumber = String(lot?.lotDetails?.lotNumber || '').trim()

  if (name && normalizeLotIdentifier(name) !== normalizeLotIdentifier(code)) return name
  if (lotNumber) return `Lote ${lotNumber}`
  if (code) return code
  if (name) return name
  return 'Lote disponível'
}

const resolveLandingLotSecondaryLabel = (lot: any) => {
  const code = String(lot?.code || '').trim()
  const displayName = resolveLandingLotDisplayName(lot)

  if (code && normalizeLotIdentifier(code) !== normalizeLotIdentifier(displayName)) {
    return code
  }

  return ''
}

const formatLandingLotMeta = (lot: any) => {
  const parts: string[] = []
  const block = normalizeBlockLabel(lot?.lotDetails?.block)
  const lotNumber = String(lot?.lotDetails?.lotNumber || '').trim()

  if (block !== '---') parts.push(`Quadra ${block}`)
  if (lotNumber) parts.push(`Lote ${lotNumber}`)

  return parts.length ? parts.join(' · ') : ''
}

const mergeLandingLots = (current: any[], incoming: any[]) => {
  const merged = new Map<string, any>()

  for (const lot of [...current, ...incoming]) {
    const key = availableLotSlideKey(lot)
    if (!key || merged.has(key)) continue
    merged.set(key, normalizeLandingLot(lot))
  }

  return Array.from(merged.values())
}

const resolveLandingLotAreaValue = (lot: any) => {
  const candidates = [
    lot?.lotDetails?.areaM2,
    lot?.lotDetails?.totalAreaM2,
    lot?.areaM2,
    lot?.area,
  ]

  for (const candidate of candidates) {
    const area = Number(candidate)
    if (Number.isFinite(area) && area > 0) return area
  }

  return null
}

const resolveLandingLotPriceValue = (lot: any) => {
  const directCandidates = [
    lot?.lotDetails?.price,
    lot?.lotDetails?.totalPrice,
    lot?.price,
  ]

  for (const candidate of directCandidates) {
    const price = Number(candidate)
    if (Number.isFinite(price) && price > 0) return price
  }

  const area = resolveLandingLotAreaValue(lot)
  const pricePerM2Candidates = [lot?.lotDetails?.pricePerM2, lot?.pricePerM2]

  for (const candidate of pricePerM2Candidates) {
    const pricePerM2 = Number(candidate)
    if (Number.isFinite(pricePerM2) && pricePerM2 > 0 && area) {
      return pricePerM2 * area
    }
  }

  return null
}

const formatLandingLotArea = (lot: any) => {
  const area = resolveLandingLotAreaValue(lot) ?? Number.NaN
  if (!Number.isFinite(area) || area <= 0) return 'Sob consulta'

  return `${area.toLocaleString('pt-BR', { minimumFractionDigits: area % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })} m²`
}

const formatLandingLotPrice = (lot: any) => {
  const price = resolveLandingLotPriceValue(lot) ?? Number.NaN
  if (!Number.isFinite(price) || price <= 0) return 'Sob consulta'
  return formatCurrencyToBrasilia(price)
}

type IdealLotCriteria = {
  searchIntent: LotSearchIntent | null
  selectedTags: string[]
  exactMatch: boolean
  minArea: unknown
  maxArea: unknown
  minPrice: unknown
  maxPrice: unknown
  maxPricePerM2: unknown
  minFrontage: unknown
  minDepth: unknown
  sortByLowestPricePerM2: boolean
}

const isFilterModalOpen = ref(false)
const selectedFilterTags = ref<string[]>([])
const exactMatchMode = ref(false)
const searchIntent = ref<LotSearchIntent | ''>(normalizeLotSearchIntent(route.query.searchIntent))
const smartSearchForm = ref({
  minArea: '',
  maxArea: '',
  minPrice: '',
  maxPrice: '',
  maxPricePerM2: '',
  minFrontage: '',
  minDepth: '',
  sortByLowestPricePerM2: false
})

const showPreferenceOnboarding = ref(false)
const onboardingStepIndex = ref(0)
const onboardingSelectedTags = ref<string[]>([])
const onboardingAreaMin = ref<number | null>(null)
const onboardingAreaMax = ref<number | null>(null)
const onboardingPriceMin = ref<number | null>(null)
const onboardingPriceMax = ref<number | null>(null)
const onboardingOverlayRef = ref<HTMLElement | null>(null)
const onboardingCardRef = ref<HTMLElement | null>(null)
const onboardingContentRef = ref<HTMLElement | null>(null)
const onboardingProgressFillRef = ref<HTMLElement | null>(null)
const preferenceOnboardingTimerId = ref<number | null>(null)

const syncBodyScrollLock = () => {
  if (!process.client) return
  const shouldLock = isFilterModalOpen.value || showSchedulingModal.value || showPreferenceOnboarding.value
  document.body.style.overflow = shouldLock ? 'hidden' : ''
}

const parseSmartNumber = (value: unknown) => {
  if (value == null) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const normalized = String(value).trim()
  if (!normalized) return null

  const parsed = Number(normalized.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

const hasAnySmartFilter = computed(() => {
  const f = smartSearchForm.value
  return !!(
    searchIntent.value ||
    f.minArea ||
    f.maxArea ||
    f.minPrice ||
    f.maxPrice ||
    f.maxPricePerM2 ||
    f.minFrontage ||
    f.minDepth ||
    f.sortByLowestPricePerM2
  )
})

const allAvailableTags = computed(() => {
  const tags = new Set<string>()
  unifiedAvailableLots.value.forEach((l: any) => {
    if (l.lotDetails?.tags) {
      l.lotDetails.tags.forEach((t: string) => tags.add(t))
    }
  })
  return Array.from(tags).sort()
})

const preferenceSearchAvailable = computed(() => unifiedAvailableLots.value.length > 0)

const preferenceOnboardingStorageKey = computed(() => {
  const projectKey = String(project.value?.id || projectSlug.value || previewId.value || 'unknown')
  return `lotio:preference-onboarding:${projectKey}`
})

const buildModalCriteria = (): IdealLotCriteria => ({
  searchIntent: searchIntent.value || null,
  selectedTags: [...selectedFilterTags.value],
  exactMatch: exactMatchMode.value,
  minArea: smartSearchForm.value.minArea,
  maxArea: smartSearchForm.value.maxArea,
  minPrice: smartSearchForm.value.minPrice,
  maxPrice: smartSearchForm.value.maxPrice,
  maxPricePerM2: smartSearchForm.value.maxPricePerM2,
  minFrontage: smartSearchForm.value.minFrontage,
  minDepth: smartSearchForm.value.minDepth,
  sortByLowestPricePerM2: smartSearchForm.value.sortByLowestPricePerM2,
})

const matchesPreferenceRange = (rawValue: number | null | undefined, minimum?: number | null, maximum?: number | null) => {
  if (rawValue == null || Number.isNaN(rawValue)) return false
  if (minimum != null && rawValue < minimum) return false
  if (maximum != null && rawValue > maximum) return false
  return true
}

const getPreferenceMatchScore = (lot: any, criteria: IdealLotCriteria) => {
  const details = lot?.lotDetails || {}
  const areaM2 = Number(details.areaM2)
  const price = Number(details.price)
  const pricePerM2 = Number(details.pricePerM2)
  const frontage = Number(details.frontage)
  const depth = Number(details.depth)

  const minArea = parseSmartNumber(criteria.minArea)
  const maxArea = parseSmartNumber(criteria.maxArea)
  const minPrice = parseSmartNumber(criteria.minPrice)
  const maxPrice = parseSmartNumber(criteria.maxPrice)
  const maxPricePerM2 = parseSmartNumber(criteria.maxPricePerM2)
  const minFrontage = parseSmartNumber(criteria.minFrontage)
  const minDepth = parseSmartNumber(criteria.minDepth)

  let score = 0
  const lotTags = details.tags || []
  if (criteria.selectedTags.length > 0) {
    const tagMatched = criteria.exactMatch
      ? criteria.selectedTags.every(tag => lotTags.includes(tag))
      : criteria.selectedTags.some(tag => lotTags.includes(tag))

    if (tagMatched) {
      score += criteria.exactMatch ? Math.max(2, criteria.selectedTags.length) : 2
    }
  }

  if ((minArea != null || maxArea != null) && matchesPreferenceRange(Number.isFinite(areaM2) ? areaM2 : null, minArea, maxArea)) score += 1
  if ((minPrice != null || maxPrice != null) && matchesPreferenceRange(Number.isFinite(price) ? price : null, minPrice, maxPrice)) score += 1
  if (maxPricePerM2 != null && matchesPreferenceRange(Number.isFinite(pricePerM2) ? pricePerM2 : null, null, maxPricePerM2)) score += 1
  if (minFrontage != null && matchesPreferenceRange(Number.isFinite(frontage) ? frontage : null, minFrontage, null)) score += 1
  if (minDepth != null && matchesPreferenceRange(Number.isFinite(depth) ? depth : null, minDepth, null)) score += 1

  return score
}

const countLotsByCriteria = (criteria: IdealLotCriteria) => {
  const hasAnyCriteria = Boolean(
    criteria.searchIntent ||
    criteria.selectedTags.length ||
    parseSmartNumber(criteria.minArea) != null ||
    parseSmartNumber(criteria.maxArea) != null ||
    parseSmartNumber(criteria.minPrice) != null ||
    parseSmartNumber(criteria.maxPrice) != null ||
    parseSmartNumber(criteria.maxPricePerM2) != null ||
    parseSmartNumber(criteria.minFrontage) != null ||
    parseSmartNumber(criteria.minDepth) != null
  )

  return unifiedAvailableLots.value.filter((lot: any) => !hasAnyCriteria || getPreferenceMatchScore(lot, criteria) > 0).length
}

const buildQueryFromCriteria = (criteria: IdealLotCriteria) => {
  const query: Record<string, string> = {}

  if (criteria.searchIntent) {
    query.searchIntent = criteria.searchIntent
  }
  if (criteria.selectedTags.length) {
    query.tags = criteria.selectedTags.join(',')
  }
  if (criteria.exactMatch) {
    query.matchMode = 'exact'
  }

  const minArea = parseSmartNumber(criteria.minArea)
  const maxArea = parseSmartNumber(criteria.maxArea)
  const minPrice = parseSmartNumber(criteria.minPrice)
  const maxPrice = parseSmartNumber(criteria.maxPrice)
  const maxPricePerM2 = parseSmartNumber(criteria.maxPricePerM2)
  const minFrontage = parseSmartNumber(criteria.minFrontage)
  const minDepth = parseSmartNumber(criteria.minDepth)

  if (minArea != null) query.minArea = String(minArea)
  if (maxArea != null) query.maxArea = String(maxArea)
  if (minPrice != null) query.minPrice = String(minPrice)
  if (maxPrice != null) query.maxPrice = String(maxPrice)
  if (maxPricePerM2 != null) query.maxPricePerM2 = String(maxPricePerM2)
  if (minFrontage != null) query.minFrontage = String(minFrontage)
  if (minDepth != null) query.minDepth = String(minDepth)
  if (criteria.sortByLowestPricePerM2) {
    query.sortBy = 'pricePerM2Asc'
  }

  query.smartMode = 'preference'

  if (corretorCode) {
    query.c = String(corretorCode)
  }

  return query
}

type SearchTrackingSource = 'timed_onboarding' | 'smart_modal'

const buildSearchTrackingMetadata = (criteria: IdealLotCriteria, source: SearchTrackingSource) => {
  const resultCount = countLotsByCriteria(criteria)
  const selectedIntent = criteria.searchIntent || null
  return {
    source,
    intent: selectedIntent,
    intentLabel: selectedIntent ? getLotSearchIntentLabel(selectedIntent) : null,
    resultCount,
    smartMode: 'preference',
    selectedTags: [...criteria.selectedTags],
    selectedTagsCount: criteria.selectedTags.length,
    exactMatch: criteria.exactMatch,
    sortByLowestPricePerM2: criteria.sortByLowestPricePerM2,
    filters: {
      minArea: parseSmartNumber(criteria.minArea),
      maxArea: parseSmartNumber(criteria.maxArea),
      minPrice: parseSmartNumber(criteria.minPrice),
      maxPrice: parseSmartNumber(criteria.maxPrice),
      maxPricePerM2: parseSmartNumber(criteria.maxPricePerM2),
      minFrontage: parseSmartNumber(criteria.minFrontage),
      minDepth: parseSmartNumber(criteria.minDepth),
    },
  }
}

const trackSearchSubmission = async (criteria: IdealLotCriteria, source: SearchTrackingSource) => {
  const label = source === 'timed_onboarding' ? 'Busca guiada 7s' : 'Busca inteligente modal'
  await tracking.trackEvent({
    type: 'TOOL_USE',
    category: 'LOT_SEARCH',
    action: 'SUBMIT',
    label,
    metadata: buildSearchTrackingMetadata(criteria, source),
  })
}

const navigateToIdealLots = async (criteria: IdealLotCriteria, source: SearchTrackingSource) => {
  await trackSearchSubmission(criteria, source)
  isFilterModalOpen.value = false
  showPreferenceOnboarding.value = false
  syncBodyScrollLock()

  await navigateTo({
    path: pathPrefix.value + '/unidades',
    query: buildQueryFromCriteria(criteria),
  })
}

const getFiniteSortedValues = (values: unknown[]) => {
  return values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)
}

const buildRangeBounds = (values: number[], fallbackMin: number, fallbackMax: number) => {
  const minimum = values[0] ?? fallbackMin
  const maximum = values[values.length - 1] ?? fallbackMax
  return {
    min: Math.min(minimum, maximum),
    max: Math.max(minimum, maximum),
  }
}

const getRangeStep = (spread: number, type: 'area' | 'price') => {
  if (type === 'area') {
    if (spread <= 150) return 10
    if (spread <= 400) return 25
    if (spread <= 900) return 50
    return 100
  }

  if (spread <= 200000) return 10000
  if (spread <= 600000) return 25000
  if (spread <= 1200000) return 50000
  return 100000
}

const normalizeStepValue = (value: number, bounds: { min: number; max: number }, step: number) => {
  const clamped = Math.max(bounds.min, Math.min(bounds.max, value))
  const snapped = bounds.min + Math.round((clamped - bounds.min) / step) * step
  return Math.max(bounds.min, Math.min(bounds.max, snapped))
}

const buildSliderRangeStyle = (min: number, max: number, bounds: { min: number; max: number }) => {
  const spread = Math.max(1, bounds.max - bounds.min)
  const start = ((min - bounds.min) / spread) * 100
  const end = ((max - bounds.min) / spread) * 100
  return {
    background: `linear-gradient(90deg, rgba(148, 163, 184, 0.28) 0%, rgba(148, 163, 184, 0.28) ${start}%, rgba(0, 113, 227, 0.94) ${start}%, rgba(0, 153, 255, 0.94) ${end}%, rgba(148, 163, 184, 0.28) ${end}%, rgba(148, 163, 184, 0.28) 100%)`,
  }
}

const formatAreaValue = (value: number) => `${Math.round(value)} m²`

const formatSmartRangeLabel = (min: number, max: number, bounds: { min: number; max: number }, formatter: (value: number) => string) => {
  const atFullRange = min === bounds.min && max === bounds.max
  if (atFullRange) return 'Qualquer faixa'
  if (min === max) return formatter(min)
  if (min === bounds.min) return `Até ${formatter(max)}`
  if (max === bounds.max) return `A partir de ${formatter(min)}`
  return `${formatter(min)} a ${formatter(max)}`
}

const availableAreaValues = computed(() => {
  return getFiniteSortedValues(unifiedAvailableLots.value.map((lot: any) => lot?.lotDetails?.areaM2))
})

const availablePriceValues = computed(() => {
  return getFiniteSortedValues(unifiedAvailableLots.value.map((lot: any) => lot?.lotDetails?.price))
})

const areaRangeBounds = computed(() => buildRangeBounds(availableAreaValues.value, 250, 500))
const priceRangeBounds = computed(() => buildRangeBounds(availablePriceValues.value, 150000, 350000))
const areaRangeStep = computed(() => getRangeStep(areaRangeBounds.value.max - areaRangeBounds.value.min, 'area'))
const priceRangeStep = computed(() => getRangeStep(priceRangeBounds.value.max - priceRangeBounds.value.min, 'price'))

const currentSmartAreaRange = computed(() => ({
  min: parseSmartNumber(smartSearchForm.value.minArea) ?? areaRangeBounds.value.min,
  max: parseSmartNumber(smartSearchForm.value.maxArea) ?? areaRangeBounds.value.max,
}))

const currentSmartPriceRange = computed(() => ({
  min: parseSmartNumber(smartSearchForm.value.minPrice) ?? priceRangeBounds.value.min,
  max: parseSmartNumber(smartSearchForm.value.maxPrice) ?? priceRangeBounds.value.max,
}))

const currentOnboardingAreaRange = computed(() => ({
  min: onboardingAreaMin.value ?? areaRangeBounds.value.min,
  max: onboardingAreaMax.value ?? areaRangeBounds.value.max,
}))

const currentOnboardingPriceRange = computed(() => ({
  min: onboardingPriceMin.value ?? priceRangeBounds.value.min,
  max: onboardingPriceMax.value ?? priceRangeBounds.value.max,
}))

const smartAreaRangeLabel = computed(() => {
  return formatSmartRangeLabel(currentSmartAreaRange.value.min, currentSmartAreaRange.value.max, areaRangeBounds.value, formatAreaValue)
})

const smartPriceRangeLabel = computed(() => {
  return formatSmartRangeLabel(currentSmartPriceRange.value.min, currentSmartPriceRange.value.max, priceRangeBounds.value, formatCurrencyToBrasilia)
})

const onboardingAreaRangeLabel = computed(() => {
  return formatSmartRangeLabel(currentOnboardingAreaRange.value.min, currentOnboardingAreaRange.value.max, areaRangeBounds.value, formatAreaValue)
})

const onboardingPriceRangeLabel = computed(() => {
  return formatSmartRangeLabel(currentOnboardingPriceRange.value.min, currentOnboardingPriceRange.value.max, priceRangeBounds.value, formatCurrencyToBrasilia)
})

const smartAreaTrackStyle = computed(() => buildSliderRangeStyle(currentSmartAreaRange.value.min, currentSmartAreaRange.value.max, areaRangeBounds.value))
const smartPriceTrackStyle = computed(() => buildSliderRangeStyle(currentSmartPriceRange.value.min, currentSmartPriceRange.value.max, priceRangeBounds.value))
const onboardingAreaTrackStyle = computed(() => buildSliderRangeStyle(currentOnboardingAreaRange.value.min, currentOnboardingAreaRange.value.max, areaRangeBounds.value))
const onboardingPriceTrackStyle = computed(() => buildSliderRangeStyle(currentOnboardingPriceRange.value.min, currentOnboardingPriceRange.value.max, priceRangeBounds.value))

const syncSmartAreaRange = (nextMin: number, nextMax: number) => {
  const min = normalizeStepValue(nextMin, areaRangeBounds.value, areaRangeStep.value)
  const max = normalizeStepValue(nextMax, areaRangeBounds.value, areaRangeStep.value)
  const orderedMin = Math.min(min, max)
  const orderedMax = Math.max(min, max)

  smartSearchForm.value.minArea = orderedMin === areaRangeBounds.value.min ? '' : String(orderedMin)
  smartSearchForm.value.maxArea = orderedMax === areaRangeBounds.value.max ? '' : String(orderedMax)
}

const syncSmartPriceRange = (nextMin: number, nextMax: number) => {
  const min = normalizeStepValue(nextMin, priceRangeBounds.value, priceRangeStep.value)
  const max = normalizeStepValue(nextMax, priceRangeBounds.value, priceRangeStep.value)
  const orderedMin = Math.min(min, max)
  const orderedMax = Math.max(min, max)

  smartSearchForm.value.minPrice = orderedMin === priceRangeBounds.value.min ? '' : String(orderedMin)
  smartSearchForm.value.maxPrice = orderedMax === priceRangeBounds.value.max ? '' : String(orderedMax)
}

const updateSmartAreaMin = (value: number) => {
  syncSmartAreaRange(value, currentSmartAreaRange.value.max)
}

const updateSmartAreaMax = (value: number) => {
  syncSmartAreaRange(currentSmartAreaRange.value.min, value)
}

const updateSmartPriceMin = (value: number) => {
  syncSmartPriceRange(value, currentSmartPriceRange.value.max)
}

const updateSmartPriceMax = (value: number) => {
  syncSmartPriceRange(currentSmartPriceRange.value.min, value)
}

const syncOnboardingAreaRange = (nextMin: number, nextMax: number) => {
  const min = normalizeStepValue(nextMin, areaRangeBounds.value, areaRangeStep.value)
  const max = normalizeStepValue(nextMax, areaRangeBounds.value, areaRangeStep.value)
  onboardingAreaMin.value = Math.min(min, max)
  onboardingAreaMax.value = Math.max(min, max)
}

const syncOnboardingPriceRange = (nextMin: number, nextMax: number) => {
  const min = normalizeStepValue(nextMin, priceRangeBounds.value, priceRangeStep.value)
  const max = normalizeStepValue(nextMax, priceRangeBounds.value, priceRangeStep.value)
  onboardingPriceMin.value = Math.min(min, max)
  onboardingPriceMax.value = Math.max(min, max)
}

const updateOnboardingAreaMin = (value: number) => {
  syncOnboardingAreaRange(value, currentOnboardingAreaRange.value.max)
}

const updateOnboardingAreaMax = (value: number) => {
  syncOnboardingAreaRange(currentOnboardingAreaRange.value.min, value)
}

const updateOnboardingPriceMin = (value: number) => {
  syncOnboardingPriceRange(value, currentOnboardingPriceRange.value.max)
}

const updateOnboardingPriceMax = (value: number) => {
  syncOnboardingPriceRange(currentOnboardingPriceRange.value.min, value)
}

const onboardingSteps = computed(() => {
  const base = ['intro', 'intent', 'area', 'price']
  if (allAvailableTags.value.length > 0) base.push('tags')
  return base
})

const onboardingCurrentStepKey = computed(() => onboardingSteps.value[onboardingStepIndex.value] || 'intro')
const onboardingStepCaption = computed(() => `Passo ${onboardingStepIndex.value + 1} de ${onboardingSteps.value.length}`)
const onboardingProgressPercent = computed(() => ((onboardingStepIndex.value + 1) / onboardingSteps.value.length) * 100)

const onboardingCriteria = computed<IdealLotCriteria>(() => ({
  searchIntent: searchIntent.value || null,
  selectedTags: [...onboardingSelectedTags.value],
  exactMatch: false,
  minArea: currentOnboardingAreaRange.value.min === areaRangeBounds.value.min ? null : currentOnboardingAreaRange.value.min,
  maxArea: currentOnboardingAreaRange.value.max === areaRangeBounds.value.max ? null : currentOnboardingAreaRange.value.max,
  minPrice: currentOnboardingPriceRange.value.min === priceRangeBounds.value.min ? null : currentOnboardingPriceRange.value.min,
  maxPrice: currentOnboardingPriceRange.value.max === priceRangeBounds.value.max ? null : currentOnboardingPriceRange.value.max,
  maxPricePerM2: null,
  minFrontage: null,
  minDepth: null,
  sortByLowestPricePerM2: false,
}))

const onboardingRelaxedCriteria = computed(() => {
  const criteria = onboardingCriteria.value
  if (countLotsByCriteria(criteria) > 0) return criteria

  if (criteria.selectedTags.length > 0) {
    const relaxed = { ...criteria, selectedTags: [] }
    if (countLotsByCriteria(relaxed) > 0) return relaxed
  }

  return criteria
})

const onboardingSearchCount = computed(() => countLotsByCriteria(onboardingRelaxedCriteria.value))

const onboardingPrimaryCtaLabel = computed(() => {
  if (onboardingCurrentStepKey.value === 'intro') return 'Começar agora'
  if (onboardingStepIndex.value < onboardingSteps.value.length - 1) return 'Continuar'
  if (onboardingSearchCount.value > 0) return `Ver ${onboardingSearchCount.value} opções`
  return 'Abrir busca inteligente'
})

const onboardingSearchPreviewHeadline = computed(() => {
  if (onboardingCurrentStepKey.value === 'intro') {
    return 'Você entra na busca já com contexto.'
  }
  if (onboardingSearchCount.value > 0) {
    return `${onboardingSearchCount.value} unidades já combinam com o que você selecionou.`
  }
  return 'Se não houver combinação exata, a busca abre pronta para refinamento.'
})

const onboardingSearchPreviewBody = computed(() => {
  if (onboardingCurrentStepKey.value === 'intro') {
    return 'A ideia é reduzir atrito no primeiro acesso e te levar direto para uma shortlist melhor.'
  }
  if (onboardingCurrentStepKey.value === 'intent' && searchIntent.value) {
    return `Vou usar ${getLotSearchIntentLabel(searchIntent.value).toLowerCase()} como contexto da sua busca e registrar isso para melhorar a leitura das métricas.`
  }
  if (onboardingSelectedTags.value.length > 0 && onboardingSearchCount.value > 0) {
    return 'Quando um atributo fica restritivo demais, eu alivio essa camada para evitar uma tela vazia.'
  }
  return 'Depois, a busca completa continua disponível para você refinar tudo manualmente.'
})

const resetPreferenceOnboarding = () => {
  onboardingStepIndex.value = 0
  searchIntent.value = ''
  onboardingSelectedTags.value = []
  onboardingAreaMin.value = null
  onboardingAreaMax.value = null
  onboardingPriceMin.value = null
  onboardingPriceMax.value = null
}

const markPreferenceOnboardingAsSeen = (reason: 'dismissed' | 'completed') => {
  if (!process.client) return
  try {
    window.localStorage.setItem(preferenceOnboardingStorageKey.value, JSON.stringify({ reason, seenAt: Date.now() }))
  } catch {
    // Ignore storage failures on the guided onboarding.
  }
}

const toggleOnboardingTag = (tag: string) => {
  const index = onboardingSelectedTags.value.indexOf(tag)
  if (index >= 0) onboardingSelectedTags.value.splice(index, 1)
  else onboardingSelectedTags.value.push(tag)
}

const animatePreferenceOnboardingStep = () => {
  if (!process.client || !showPreferenceOnboarding.value) return

  nextTick(() => {
    const content = onboardingContentRef.value
    if (!content) return

    const targets = Array.from(content.querySelectorAll('[data-step-animate]'))
    if (targets.length) {
      gsap.killTweensOf(targets)
      gsap.fromTo(
        targets,
        { opacity: 0, y: 20, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.42, stagger: 0.06, ease: 'power3.out' },
      )
    }

    if (onboardingProgressFillRef.value) {
      gsap.to(onboardingProgressFillRef.value, {
        width: `${onboardingProgressPercent.value}%`,
        duration: 0.45,
        ease: 'power2.out',
      })
    }
  })
}

const animatePreferenceOnboardingOpen = () => {
  if (!process.client) return

  nextTick(() => {
    const overlay = onboardingOverlayRef.value
    const card = onboardingCardRef.value
    if (!overlay || !card) return

    const ornamental = Array.from(card.querySelectorAll('.v4-onboarding-orb'))
    const chrome = Array.from(card.querySelectorAll('[data-onboarding-animate]'))

    gsap.killTweensOf([overlay, card, ...ornamental, ...chrome])
    gsap.set(overlay, { opacity: 0 })
    gsap.set(card, { opacity: 0, y: 40, scale: 0.96, transformPerspective: 900, rotateX: 4 })
    gsap.set(ornamental, { opacity: 0, scale: 0.72 })
    gsap.set(chrome, { opacity: 0, y: 18 })

    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .to(overlay, { opacity: 1, duration: 0.24 })
      .to(card, { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 0.58, ease: 'expo.out' }, 0)
      .to(ornamental, { opacity: 1, scale: 1, duration: 0.7, stagger: 0.06, ease: 'back.out(1.6)' }, 0.08)
      .to(chrome, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05 }, 0.16)

    animatePreferenceOnboardingStep()
  })
}

const dismissPreferenceOnboarding = () => {
  void tracking.trackEvent({
    type: 'TOOL_USE',
    category: 'LOT_SEARCH',
    action: 'DISMISS',
    label: 'Busca guiada 7s',
    metadata: {
      source: 'timed_onboarding',
      intent: searchIntent.value || null,
      intentLabel: searchIntent.value ? getLotSearchIntentLabel(searchIntent.value) : null,
      step: onboardingCurrentStepKey.value,
    },
  })
  showPreferenceOnboarding.value = false
  markPreferenceOnboardingAsSeen('dismissed')
  syncBodyScrollLock()
}

const openPreferenceOnboardingIfNeeded = () => {
  if (!process.client || !preferenceSearchAvailable.value) return

  try {
    if (window.localStorage.getItem(preferenceOnboardingStorageKey.value)) return
  } catch {
    return
  }

  if (preferenceOnboardingTimerId.value !== null) {
    window.clearTimeout(preferenceOnboardingTimerId.value)
  }

  preferenceOnboardingTimerId.value = window.setTimeout(() => {
    resetPreferenceOnboarding()
    showPreferenceOnboarding.value = true
    void tracking.trackEvent({
      type: 'TOOL_USE',
      category: 'LOT_SEARCH',
      action: 'IMPRESSION',
      label: 'Busca guiada 7s',
      metadata: {
        source: 'timed_onboarding',
      },
    })
  }, 7000)
}

const goToPreviousOnboardingStep = () => {
  onboardingStepIndex.value = Math.max(0, onboardingStepIndex.value - 1)
}

const handleOnboardingPrimaryAction = () => {
  if (onboardingStepIndex.value < onboardingSteps.value.length - 1) {
    onboardingStepIndex.value += 1
    return
  }

  markPreferenceOnboardingAsSeen('completed')
  navigateToIdealLots(onboardingRelaxedCriteria.value, 'timed_onboarding')
}

const filteredCount = computed(() => {
  return countLotsByCriteria(buildModalCriteria())
})

const toggleFilterModal = () => {
  isFilterModalOpen.value = !isFilterModalOpen.value
  syncBodyScrollLock()
}

function handleModalKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (showPreferenceOnboarding.value) {
    dismissPreferenceOnboarding()
    return
  }
  if (isFilterModalOpen.value) toggleFilterModal()
  if (showSchedulingModal.value) {
    showSchedulingModal.value = false
    syncBodyScrollLock()
  }
}

watch(showSchedulingModal, (v) => {
  if (v && showPreferenceOnboarding.value) {
    dismissPreferenceOnboarding()
  }
  syncBodyScrollLock()
})

const toggleFilterTag = (tag: string) => {
  const idx = selectedFilterTags.value.indexOf(tag)
  if (idx > -1) selectedFilterTags.value.splice(idx, 1)
  else selectedFilterTags.value.push(tag)
}

const resetIdealLotFilters = () => {
  searchIntent.value = ''
  selectedFilterTags.value = []
  exactMatchMode.value = false
  smartSearchForm.value = {
    minArea: '',
    maxArea: '',
    minPrice: '',
    maxPrice: '',
    maxPricePerM2: '',
    minFrontage: '',
    minDepth: '',
    sortByLowestPricePerM2: false
  }
}

const applyFiltersAndSearch = () => {
  tracking.trackClick('Botão: Aplicar Filtros e Buscar', 'LIST_FILTER')
  navigateToIdealLots(buildModalCriteria(), 'smart_modal')
}

const lotsPage = ref(1)
const lotsTeaserCount = 6
const lotsPerPage = 12 // Used in pagination on units page if needed, but for index teaser we use 6

const lightboxOpen = ref(false)
const lightboxIdx = ref(0)

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

const PUBLIC_SECTION_ORDER_META_TYPE = '__lotio_public_section_order__'
const LANDING_REORDERABLE_SECTIONS = [
  'pub-banner',
  'pub-plant',
  'pub-panorama',
  'pub-video',
  'pub-lots-carousel',
  'pub-lots',
  'pub-construction',
  'pub-location',
  'pub-nearby',
  'pub-scheduling',
  'pub-infra',
  'pub-highlights',
  'pub-description',
  'pub-gallery',
  'pub-contact',
]

const normalizeLandingSectionOrder = (candidate: unknown) => {
  const incoming = Array.isArray(candidate) ? candidate.filter((item): item is string => typeof item === 'string') : []
  const knownSet = new Set(LANDING_REORDERABLE_SECTIONS)
  const seen = new Set<string>()
  const ordered = incoming.filter((id) => knownSet.has(id) && !seen.has(id) && seen.add(id))

  for (const id of LANDING_REORDERABLE_SECTIONS) {
    if (!seen.has(id)) ordered.push(id)
  }

  return ordered
}

const publicSectionOrder = computed(() => {
  const meta = highlights.value.find((item: any) => item?.type === PUBLIC_SECTION_ORDER_META_TYPE)
  return normalizeLandingSectionOrder(meta?.order)
})

const disabledPublicSections = computed(() => {
  const meta = highlights.value.find((item: any) => item?.type === PUBLIC_SECTION_ORDER_META_TYPE)
  if (!Array.isArray(meta?.disabled)) return new Set<string>()
  return new Set(meta.disabled.filter((id: unknown): id is string => typeof id === 'string'))
})

const isPublicSectionEnabled = (sectionId: string) => {
  return !disabledPublicSections.value.has(sectionId)
}

const publicSectionOrderIndex = computed(() => {
  return new Map(publicSectionOrder.value.map((id, idx) => [id, idx + 1]))
})

const publicSectionStyle = (sectionId: string) => {
  return { order: String(publicSectionOrderIndex.value.get(sectionId) ?? 999) }
}

const PUBLIC_SIDE_MENU_SECTION_MAP = [
  { sectionId: 'pub-banner', id: 'inicio', label: 'INICIO' },
  { sectionId: 'pub-description', id: 'info', label: 'INFO' },
  { sectionId: 'pub-infra', id: 'infraestrutura', label: 'INFRA' },
  { sectionId: 'pub-plant', id: 'planta', label: 'PLANTA' },
  { sectionId: 'pub-panorama', id: 'panorama', label: '360°' },
  { sectionId: 'pub-video', id: 'video-apresentacao', label: 'VIDEO' },
  { sectionId: 'pub-highlights', id: 'destaques', label: 'DESTAQUES' },
  { sectionId: 'pub-lots-carousel', id: 'carrossel-lotes', label: 'CARROSSEL' },
  { sectionId: 'pub-lots', id: 'lotes', label: 'UNIDADES' },
  { sectionId: 'pub-construction', id: 'obras', label: 'OBRAS' },
  { sectionId: 'pub-gallery', id: 'galeria', label: 'GALERIA' },
  { sectionId: 'pub-location', id: 'localizacao', label: 'LOCAL' },
  { sectionId: 'pub-nearby', id: 'proximidades', label: 'PROX.' },
  { sectionId: 'pub-scheduling', id: 'agendamento', label: 'AGENDAR' },
  { sectionId: 'pub-contact', id: 'contato', label: 'CONTATO' },
] as const

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

const showDescriptionBlock = computed(() => {
  return isPublicSectionEnabled('pub-description') && (hasMeaningfulLocationText.value || hasLocationHeader.value)
})

const showInfrastructureBlock = computed(() => {
  return isPublicSectionEnabled('pub-infra') && infrastructureCategories.value.length > 0
})

const hasInfo = computed(() => {
  return !!(showDescriptionBlock.value || showInfrastructureBlock.value)
})

const hasTraditionalInfo = computed(() => {
  return traditionalHighlights.value.length > 0
})

const publicSideMenuVisibility = computed<Record<string, boolean>>(() => ({
  'pub-banner': true,
  'pub-description': showDescriptionBlock.value,
  'pub-infra': showInfrastructureBlock.value,
  'pub-plant': !!project.value?.plantMap && isPublicSectionEnabled('pub-plant'),
  'pub-panorama': panoramas.value.length > 0 && isPublicSectionEnabled('pub-panorama'),
  'pub-video': !!project.value?.youtubeVideoUrl && isPublicSectionEnabled('pub-video'),
  'pub-highlights': hasTraditionalInfo.value && isPublicSectionEnabled('pub-highlights'),
  'pub-lots-carousel': (project.value?.lotSummary?.available ?? 0) > 0 && isPublicSectionEnabled('pub-lots-carousel'),
  'pub-lots': (project.value?.lotSummary?.available ?? 0) > 0 && isPublicSectionEnabled('pub-lots'),
  'pub-construction': !!project.value?.constructionStatus?.length && isPublicSectionEnabled('pub-construction'),
  'pub-gallery': !!project.value?.projectMedias?.length && isPublicSectionEnabled('pub-gallery'),
  'pub-location': !!(project.value?.googleMapsUrl || project.value?.address) && isPublicSectionEnabled('pub-location'),
  'pub-nearby': hasNearbyData.value && isPublicSectionEnabled('pub-nearby'),
  'pub-scheduling': !!(project.value && schedulingConfig.value?.enabled && isPublicSectionEnabled('pub-scheduling')),
  'pub-contact': isPublicSectionEnabled('pub-contact'),
}))

const publicSideMenuItems = computed(() => {
  return publicSectionOrder.value
    .map((sectionId) => PUBLIC_SIDE_MENU_SECTION_MAP.find((item) => item.sectionId === sectionId))
    .filter((item): item is typeof PUBLIC_SIDE_MENU_SECTION_MAP[number] => !!item)
    .filter((item) => publicSideMenuVisibility.value[item.sectionId])
    .map(({ id, label }) => ({ id, label }))
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

const seedAvailableLotsCarousel = () => {
  const seeded = (unifiedAvailableLots.value || [])
    .map((lot: any) => normalizeLandingLot(lot))
    .filter((lot: any) => lot.lotDetails?.status === 'AVAILABLE')

  availableLotsCarouselItems.value = mergeLandingLots([], seeded)
  availableLotsCarouselPage.value = 0
  availableLotsCarouselTotal.value = Math.max(project.value?.lotSummary?.available ?? 0, availableLotsCarouselItems.value.length)
  availableLotsCarouselError.value = ''
}

const displayedAvailableLots = computed(() => {
  if (availableLotsCarouselItems.value.length > 0) {
    return availableLotsCarouselItems.value
  }

  return (unifiedAvailableLots.value || [])
    .map((lot: any) => normalizeLandingLot(lot))
    .filter((lot: any) => lot.lotDetails?.status === 'AVAILABLE')
})

const availableLotsCarouselHasMore = computed(() => {
  if (isPreview.value) return false
  const total = Math.max(availableLotsCarouselTotal.value, project.value?.lotSummary?.available ?? 0)
  return displayedAvailableLots.value.length < total
})

const availableLotsCarouselShouldLoop = computed(() => displayedAvailableLots.value.length >= 5)

const handleAvailableLotsSwiper = (instance: SwiperInstance) => {
  availableLotsSwiper.value = instance
}

const loadMoreAvailableLots = async (force = false) => {
  if (isPreview.value || !projectSlug.value || availableLotsCarouselLoading.value) return

  const knownTotal = Math.max(availableLotsCarouselTotal.value, project.value?.lotSummary?.available ?? 0)
  if (!force && knownTotal > 0 && availableLotsCarouselItems.value.length >= knownTotal) return

  const nextPage = availableLotsCarouselPage.value + 1
  availableLotsCarouselLoading.value = true

  try {
    const response = await fetchPublic(`/p/${projectSlug.value}/lots?limit=${AVAILABLE_LOTS_BATCH_SIZE}&page=${nextPage}`)
    const incomingLots = Array.isArray(response?.data)
      ? response.data
          .map((lot: any) => normalizeLandingLot(lot))
          .filter((lot: any) => lot.lotDetails?.status === 'AVAILABLE')
      : []

    availableLotsCarouselItems.value = mergeLandingLots(availableLotsCarouselItems.value, incomingLots)
    availableLotsCarouselPage.value = nextPage
    availableLotsCarouselTotal.value = Math.max(
      Number(response?.total || 0),
      knownTotal,
      availableLotsCarouselItems.value.length,
    )
    availableLotsCarouselError.value = ''
  } catch (fetchError: any) {
    availableLotsCarouselError.value = fetchError?.message || 'Erro ao carregar lotes disponíveis'
  } finally {
    availableLotsCarouselLoading.value = false
  }
}

const handleAvailableLotsSlideChange = (instance: SwiperInstance) => {
  const currentIndex = Number.isFinite(instance.realIndex) ? instance.realIndex : instance.activeIndex
  const remaining = displayedAvailableLots.value.length - currentIndex - 1

  if (remaining <= 3) {
    void loadMoreAvailableLots()
  }
}

const initializeAvailableLotsCarousel = () => {
  seedAvailableLotsCarousel()

  if (!isPreview.value) {
    void loadMoreAvailableLots(true)
  }
}

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
const isPreLaunchMode = computed(() => project.value?.preLaunchEnabled === true)
const preLaunchBarDismissed = ref(false)
const showPreLaunchBar = computed(() => isPreLaunchMode.value && !preLaunchBarDismissed.value)

function dismissPreLaunchBar() {
  preLaunchBarDismissed.value = true
  tracking.trackClick('Barra Fixa: Fechar aviso mobile', 'PRE_LAUNCH')
}

const heroTagLabel = computed(() =>
  isPreLaunchMode.value ? 'PRÉ-LANÇAMENTO · ACESSO ANTECIPADO EXCLUSIVO' : project.value?.tenant?.name || 'Vendas Iniciadas'
)

const primaryInterestLabel = computed(() =>
  isPreLaunchMode.value ? 'Entrar na fila de preferência' : 'Tenho Interesse'
)

const heroContactLabel = computed(() =>
  isPreLaunchMode.value ? 'Entrar na fila de preferência' : 'Solicitar informações'
)

const stickyInterestLabel = computed(() =>
  isPreLaunchMode.value ? 'ENTRAR NA FILA' : 'TENHO INTERESSE'
)

const preLaunchBarCtaLabel = computed(() =>
  isPreLaunchMode.value ? 'Entrar na fila de preferência' : 'Solicitar informações'
)

const conversionBadgeText = computed(() =>
  isPreLaunchMode.value ? 'PRÉ-LANÇAMENTO · ACESSO ANTECIPADO EXCLUSIVO' : 'Oportunidade única'
)

const conversionTitle = computed(() =>
  isPreLaunchMode.value ? 'Entre na fila do pré-lançamento' : 'Garanta sua unidade agora'
)

const conversionSubtitle = computed(() =>
  isPreLaunchMode.value
    ? 'Cadastre-se para receber atendimento prioritário, novidades em primeira mão e acesso antecipado às condições especiais deste lançamento.'
    : 'Restam poucas unidades disponíveis. Preencha o formulário e nossa equipe entrará em contato para tirar suas dúvidas.'
)

const conversionAvailabilityText = computed(() =>
  isPreLaunchMode.value
    ? `${availableLots.value} lotes elegíveis para a fila de preferência`
    : `${availableLots.value} lotes disponíveis no momento`
)

const leadSuccessTitle = computed(() =>
  isPreLaunchMode.value ? 'Seu acesso antecipado está confirmado!' : 'Solicitação enviada!'
)

const leadSuccessMessage = computed(() =>
  isPreLaunchMode.value
    ? 'Recebemos seu cadastro com prioridade. Você entrou na fila de preferência e um consultor vai falar com você antes da abertura oficial para apresentar o lançamento e as condições exclusivas.'
    : 'Recebemos seus dados e logo um consultor entrará em contato.'
)

const leadSubmitButtonLabel = computed(() =>
  isPreLaunchMode.value ? 'Entrar na fila de preferência' : 'Falar com um consultor'
)

const leadMessagePlaceholder = computed(() =>
  isPreLaunchMode.value
    ? 'Conte se busca um lote específico ou quer receber a abertura em primeira mão.'
    : 'Em que podemos te ajudar?'
)

const leadTermsLabel = computed(() =>
  isPreLaunchMode.value
    ? 'Aceito os termos de pré-lançamento e políticas de privacidade e estou ciente de que meu cadastro entrará na fila de preferência do empreendimento.'
    : 'Aceito os termos de atendimento e políticas de privacidade para receber contato sobre este empreendimento.'
)

const heroContactTrackingLabel = computed(() =>
  isPreLaunchMode.value ? 'Botão: Entrar na Fila de Preferencia' : 'Botão: Solicitar Informações'
)

const trustBarTrackingLabel = computed(() =>
  isPreLaunchMode.value ? 'CTA Flutuante: Fila de Preferencia' : 'CTA Flutuante: Tenho Interesse'
)

const preLaunchBarTrackingLabel = computed(() =>
  isPreLaunchMode.value ? 'Barra Fixa: Entrar na Fila de Preferencia' : 'Barra Fixa: Solicitar Informacoes'
)

const formSubmitTrackingLabel = computed(() =>
  isPreLaunchMode.value ? 'Formulário: Entrar na Fila de Preferencia' : 'Formulário: Submit'
)

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

const salesMotionConfig = computed(() => {
  const root = project.value?.salesMotionConfig || {}
  const cfg = root?.enterprise && typeof root.enterprise === 'object' ? root.enterprise : root
  const rawTemplates = cfg?.templates
  const rawDisplayMode = String(cfg.displayMode || cfg.frequency || '').toLowerCase()
  const showOnce = cfg.showOnce === true
    || rawDisplayMode === 'single'
    || rawDisplayMode === 'once'
    || rawDisplayMode === 'one-shot'
    || rawDisplayMode === 'oneshot'

  const defaultTemplates = [
    { id: 'visitorsNow', text: '{{visitsNow}} pessoas estão vendo este loteamento', enabled: true },
  ]

  const templates = Array.isArray(rawTemplates)
    ? rawTemplates
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
            ranges: tpl.ranges && typeof tpl.ranges === 'object' ? tpl.ranges : undefined,
          }
        })
        .filter((tpl: any) => tpl && tpl.text.trim().length > 0)
    : rawTemplates && typeof rawTemplates === 'object'
      ? Object.entries(rawTemplates)
            .map(([key, value]) => ({ id: String(key), text: String(value || ''), enabled: true, manualRangeEnabled: false, ranges: undefined }))
          .filter((tpl) => tpl.text.trim().length > 0)
      : defaultTemplates

  return {
    enabled: !!cfg.enabled,
    intervalSeconds: Math.max(5, Number(cfg.intervalSeconds ?? 14)),
    displaySeconds: 6,
    maxNotices: showOnce ? 1 : Math.max(1, Number(cfg.maxNotices ?? 5)),
    showOnce,
    templates,
  }
})

type SalesMotionNumericToken = 'viewsToday' | 'visits24h' | 'visitsNow'

type SalesMotionSessionState = {
  values?: Partial<Record<SalesMotionNumericToken, number>>
  recentLot?: string
  updatedAt?: number
}

const salesMotionRangeFallback: Record<SalesMotionNumericToken, { min: number; max: number }> = {
  viewsToday: { min: 3, max: 40 },
  visits24h: { min: 12, max: 260 },
  visitsNow: { min: 2, max: 22 },
}

const salesMotionSessionStorageKey = computed(() => {
  const projectKey = String(project.value?.id || projectSlug.value || previewId.value || 'unknown')
  return `lotio:sales-motion:landing:${projectKey}`
})

const readSalesMotionSessionState = (): SalesMotionSessionState => {
  if (!process.client) return {}
  try {
    const raw = window.sessionStorage.getItem(salesMotionSessionStorageKey.value)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const writeSalesMotionSessionState = (patch: Partial<SalesMotionSessionState>) => {
  if (!process.client) return
  try {
    const current = readSalesMotionSessionState()
    const merged: SalesMotionSessionState = {
      ...current,
      ...patch,
      values: {
        ...(current.values || {}),
        ...(patch.values || {}),
      },
      updatedAt: Date.now(),
    }
    window.sessionStorage.setItem(salesMotionSessionStorageKey.value, JSON.stringify(merged))
  } catch {
    // Ignore session persistence failures
  }
}

const resolveSalesMotionRange = (
  tpl: any,
  token: SalesMotionNumericToken,
  automatic: { min: number; max: number },
) => {
  if (tpl?.manualRangeEnabled !== true) {
    return {
      min: Math.max(0, Math.round(automatic.min)),
      max: Math.max(Math.max(0, Math.round(automatic.min)), Math.round(automatic.max)),
    }
  }

  const fallback = salesMotionRangeFallback[token]
  const rawMin = Number(tpl?.ranges?.[token]?.min)
  const rawMax = Number(tpl?.ranges?.[token]?.max)
  const min = Number.isFinite(rawMin) ? Math.max(0, Math.round(rawMin)) : fallback.min
  const maxCandidate = Number.isFinite(rawMax) ? Math.max(0, Math.round(rawMax)) : fallback.max
  const max = Math.max(min, maxCandidate)
  return { min, max }
}

const salesMotionSampleData = computed(() => {
  const lotCode = unifiedAvailableLots.value[0]?.code || project.value?.teaserLots?.[0]?.code || '24'
  const baseViews = Math.max(3, Math.min(28, Math.round((availableLots.value || 1) * 1.2)))
  const baseVisits = Math.max(12, Math.min(220, Math.round((totalLots.value || 10) * 2.8)))
  return {
    viewsToday: baseViews,
    recentLot: lotCode,
    visits24h: baseVisits,
  }
})

const salesMotionLotPool = computed(() => {
  const values = [
    ...(unifiedAvailableLots.value || []).map((l: any) => l?.code || l?.name),
    ...((project.value?.teaserLots || []) as any[]).map((l: any) => l?.code || l?.name),
  ]
  return Array.from(new Set(values.filter(Boolean)))
})

const salesMotionSectionLabelByProgress = (progress: number) => {
  if (progress >= 80) return 'contato'
  if (progress >= 60) return 'lotes'
  if (progress >= 40) return 'detalhes do projeto'
  return 'planta'
}

const nextSmoothInt = (
  base: number,
  lastRef: { value: number },
  min: number,
  max: number,
  varianceRatio = 0.08,
) => {
  const safeBase = Math.max(min, Math.min(max, Math.round(base)))
  const prev = lastRef.value || safeBase
  const step = Math.max(1, Math.round(safeBase * varianceRatio))
  const raw = prev + Math.round((Math.random() * (step * 2)) - step)
  const clamped = Math.max(min, Math.min(max, raw))
  lastRef.value = clamped
  return clamped
}

const clearSalesMotionTimers = () => {
  if (!process.client) return
  if (salesMotionInitialTimerId.value !== null) {
    window.clearTimeout(salesMotionInitialTimerId.value)
    salesMotionInitialTimerId.value = null
  }
  if (salesMotionHideTimerId.value !== null) {
    window.clearTimeout(salesMotionHideTimerId.value)
    salesMotionHideTimerId.value = null
  }
}

const buildSalesMotionNotice = (reason: 'initial' | 'scroll', progress = 0) => {
  const config = salesMotionConfig.value
  const baseData = salesMotionSampleData.value
  const lotPool = salesMotionLotPool.value
  const sessionState = readSalesMotionSessionState()
  const isLotSpecificTemplate = (tpl: any) => {
    const text = String(tpl?.text || '').toLowerCase()
    return (
      text.includes('este lote')
      || text.includes('neste lote')
      || text.includes('pagina de lote')
      || text.includes('página de lote')
      || text.includes('detalhes do lote')
      || text.startsWith('lote {{recentlot}}')
    )
  }

  const activeTemplates = (config.templates || [])
    .filter((tpl: any) => tpl?.enabled !== false)

  const enterpriseOnlyTemplates = activeTemplates.filter((tpl: any) => !isLotSpecificTemplate(tpl))
  const sourceTemplates = enterpriseOnlyTemplates.length > 0 ? enterpriseOnlyTemplates : activeTemplates

  const fillTemplate = (tpl: any) => {
    const text = String(tpl?.text || '')
    const automaticViewsRange = {
      min: Math.max(1, Math.round(baseData.viewsToday * 0.7)),
      max: Math.max(2, Math.round(baseData.viewsToday * 1.3)),
    }
    const automaticVisitsRange = {
      min: Math.max(1, Math.round(baseData.visits24h * 0.75)),
      max: Math.max(2, Math.round(baseData.visits24h * 1.25)),
    }
    const automaticNowRange = {
      min: Math.max(1, Math.round(Math.max(2, baseData.viewsToday * 0.6) * 0.7)),
      max: Math.max(2, Math.round(Math.max(2, baseData.viewsToday * 0.6) * 1.25)),
    }

    const viewsRange = resolveSalesMotionRange(tpl, 'viewsToday', automaticViewsRange)
    const visitsRange = resolveSalesMotionRange(tpl, 'visits24h', automaticVisitsRange)
    const nowRange = resolveSalesMotionRange(tpl, 'visitsNow', automaticNowRange)
    const views = nextSmoothInt(baseData.viewsToday, salesMotionLastViews, viewsRange.min, viewsRange.max)
    const visits = nextSmoothInt(baseData.visits24h, salesMotionLastVisits, visitsRange.min, visitsRange.max)
    const nowUsers = nextSmoothInt(Math.max(2, Math.round(baseData.viewsToday * 0.6)), salesMotionLastViews, nowRange.min, nowRange.max, 0.12)
    const lotFromSession = String(sessionState.recentLot || '').trim()
    const hasLotFromSession = lotFromSession && lotPool.includes(lotFromSession)
    const lot = hasLotFromSession
      ? lotFromSession
      : (lotPool.length > 0 ? lotPool[0] : baseData.recentLot)

    writeSalesMotionSessionState({
      recentLot: lot,
      values: {
        viewsToday: views,
        visits24h: visits,
        visitsNow: nowUsers,
      },
    })

    return text
      .replace(/{{\s*viewsToday\s*}}/g, String(views))
      .replace(/{{\s*recentLot\s*}}/g, String(lot))
      .replace(/{{\s*visits24h\s*}}/g, String(visits))
      .replace(/{{\s*visitsNow\s*}}/g, String(nowUsers))
      .replace(/{{\s*sectionLabel\s*}}/g, String(salesMotionSectionLabelByProgress(progress)))
  }

  const options = sourceTemplates
    .map((tpl: any) => fillTemplate(tpl))
    .filter(Boolean)

  if (reason === 'scroll') {
    const contextual = sourceTemplates
      .filter((tpl: any) => {
        const text = String(tpl?.text || '')
        return text.includes('{{sectionLabel}}') || text.includes('{{visitsNow}}')
      })
      .map((tpl: any) => fillTemplate(tpl))
      .filter(Boolean)

    const source = contextual.length > 0 ? contextual : options
    return source[Math.floor(Math.random() * source.length)] || ''
  }

  return options[Math.floor(Math.random() * options.length)] || ''
}

const salesMotionTemplatesSignature = computed(() =>
  JSON.stringify((salesMotionConfig.value.templates || []).map((tpl: any) => ({
    id: tpl.id,
    text: tpl.text,
    enabled: tpl.enabled,
    manualRangeEnabled: tpl.manualRangeEnabled,
    ranges: tpl.ranges,
  }))),
)

const showNextSalesNotice = (reason: 'initial' | 'scroll', progress = 0) => {
  if (!process.client) return
  const config = salesMotionConfig.value
  const minGapMs = config.showOnce ? 0 : Math.max(2000, config.intervalSeconds * 1000)
  if (!config.enabled) return
  if (salesMotionShownCount.value >= config.maxNotices) {
    clearSalesMotionTimers()
    currentSalesNotice.value = ''
    return
  }

  const now = Date.now()
  if (currentSalesNotice.value) return
  if (!config.showOnce && now - salesMotionLastShownAt.value < minGapMs) return

  const message = buildSalesMotionNotice(reason, progress)
  if (!message) return

  currentSalesNotice.value = message
  salesMotionShownCount.value += 1
  salesMotionLastShownAt.value = now

  if (salesMotionHideTimerId.value !== null) {
    window.clearTimeout(salesMotionHideTimerId.value)
  }
  salesMotionHideTimerId.value = window.setTimeout(() => {
    currentSalesNotice.value = ''
  }, config.displaySeconds * 1000)
}

const startSalesMotion = () => {
  if (!process.client) return
  clearSalesMotionTimers()
  currentSalesNotice.value = ''
  salesMotionShownCount.value = 0
  salesMotionLastShownAt.value = 0
  salesMotionReachedMilestones.value = []
  const sessionState = readSalesMotionSessionState()
  const sessionViews = Number(sessionState.values?.viewsToday)
  const sessionVisits = Number(sessionState.values?.visits24h)
  salesMotionLastViews.value = Number.isFinite(sessionViews) ? sessionViews : 0
  salesMotionLastVisits.value = Number.isFinite(sessionVisits) ? sessionVisits : 0

  const config = salesMotionConfig.value
  if (!config.enabled) return

  salesMotionInitialTimerId.value = window.setTimeout(() => {
    showNextSalesNotice('initial', 0)
  }, 1800)
}

const handleSalesMotionNavigation = () => {
  if (!process.client) return
  if (!salesMotionConfig.value.enabled) return
  if (salesMotionConfig.value.showOnce) return
  if (salesMotionShownCount.value >= salesMotionConfig.value.maxNotices) return

  const doc = document.documentElement
  const scrollTop = window.scrollY || doc.scrollTop || 0
  const maxScrollable = Math.max(1, (doc.scrollHeight || 0) - window.innerHeight)
  const progress = Math.round((scrollTop / maxScrollable) * 100)
  const milestones = [18, 42, 68, 86]

  const nextMilestone = milestones.find((m) => progress >= m && !salesMotionReachedMilestones.value.includes(m))
  if (!nextMilestone) return

  salesMotionReachedMilestones.value = [...salesMotionReachedMilestones.value, nextMilestone]
  showNextSalesNotice('scroll', progress)
}

const hasHeroBanner = computed(() => {
  if (!isPublicSectionEnabled('pub-banner')) return false
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
  window.addEventListener('scroll', handleSalesMotionNavigation, { passive: true })

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
      initializeAvailableLotsCarousel()
      
      if (s.status === 'fulfilled' && s.value) {
        schedulingConfig.value = s.value
      }
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
            const firstEntry = entries[0]
            if (firstEntry?.isIntersecting) {
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
      openPreferenceOnboardingIfNeeded()
    }
    else error.value = (p.reason as any)?.message || 'Projeto não encontrado'
    if (c.status === 'fulfilled' && c.value) corretor.value = c.value
  } catch (e: any) {
    error.value = e.message || 'Projeto não encontrado'
  }
  startSalesMotion()
})

watch(
  () => displayedAvailableLots.value.length,
  async () => {
    await nextTick()
    if (!availableLotsSwiper.value || availableLotsSwiper.value.destroyed) return
    availableLotsSwiper.value.update()
  },
)

watch(
  () => [
    salesMotionConfig.value.enabled,
    salesMotionConfig.value.showOnce,
    salesMotionConfig.value.intervalSeconds,
    salesMotionConfig.value.displaySeconds,
    salesMotionConfig.value.maxNotices,
    salesMotionTemplatesSignature.value,
  ],
  () => {
    startSalesMotion()
  },
)

watch(showPreferenceOnboarding, (isOpen) => {
  syncBodyScrollLock()
  if (isOpen) {
    animatePreferenceOnboardingOpen()
  }
})

watch(onboardingStepIndex, () => {
  animatePreferenceOnboardingStep()
})

onUnmounted(() => {
  clearSalesMotionTimers()
  if (preferenceOnboardingTimerId.value !== null) {
    window.clearTimeout(preferenceOnboardingTimerId.value)
    preferenceOnboardingTimerId.value = null
  }
  window.removeEventListener('resize', detectTouchMobile)
  window.removeEventListener('keydown', handleModalKeyDown)
  window.removeEventListener('scroll', handleSalesMotionNavigation)
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
  if (!leadForm.value.acceptTerms) {
    leadError.value = 'Você precisa aceitar os termos'
    return
  }

  submitting.value = true
  leadError.value = ''
  try {
    const selectedLot = unifiedAvailableLots.value.find((lot: any) => lot.id === leadForm.value.mapElementId)
    const selectedLotLabel = selectedLot?.code || selectedLot?.name || selectedLot?.id
    const defaultMessage = leadForm.value.message || (
      isPreLaunchMode.value
        ? selectedLotLabel
          ? `PRE-LANCAMENTO: Quero entrar na fila de preferência do lote ${selectedLotLabel}`
          : 'PRE-LANCAMENTO: Quero entrar na fila de preferência deste empreendimento.'
        : selectedLotLabel
          ? `Tenho interesse no lote ${selectedLotLabel}`
          : undefined
    )

    const body = {
      name: leadForm.value.name,
      email: leadForm.value.email,
      phone: unmask(leadForm.value.phone),
      mapElementId: leadForm.value.mapElementId || undefined,
      message: defaultMessage,
      realtorCode: corretorCode || undefined,
      visitorId: trackingStore.visitorId || undefined,
      sessionId: trackingStore.sessionId || undefined,
      aiChatTranscript: chatStore.getTranscript() || undefined,
    }
    await fetchPublic(`/p/${projectSlug.value}/leads`, {
      method: 'POST',
      body: JSON.stringify(body),
    })

    // Track Lead Submit
    tracking.trackLeadSubmit('FORM', { source: isPreLaunchMode.value ? 'pre_launch_queue' : 'main_page' })

    leadSuccess.value = true
    toastSuccess(isPreLaunchMode.value ? 'Você entrou na fila de preferência!' : 'Formulário enviado com sucesso!')
    leadForm.value = { name: '', email: '', phone: '', mapElementId: '', message: '', acceptTerms: false }
    if (chatStore.hasConversation()) chatStore.clear()
  } catch (e: any) {
    leadError.value = e.message || 'Erro ao enviar'
  }
  submitting.value = false
}

function openLeadForm(el: any) {
  leadForm.value.mapElementId = el?.id || ''
  
  if (el?.label || el?.code) {
    leadForm.value.message = isPreLaunchMode.value
      ? `Quero entrar na fila de preferência do lote ${el.label || el.code}`
      : `Tenho interesse no lote ${el.label || el.code}`
  }
  document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })
}

function openLightbox(idx: number) {
  lightboxIdx.value = idx
  lightboxOpen.value = true
}
</script>

<style scoped>
/* V4 Design System Tokens - Apple/Samsung Inspired */
:global(:root) {
  --v4-primary: #0071e3; /* Apple Blue */
  --v4-primary-hover: #0077ed;
  --v4-bg: #ffffff;
  --v4-bg-alt: #f5f5f7; /* Apple secondary bg */
  --v4-text: #1d1d1f; /* Apple Text */
  --v4-text-muted: #86868b;
  --v4-border: #d2d2d7;
  --v4-radius-lg: 18px; /* Refined, not bubbly */
  --v4-radius-md: 12px;
  --v4-radius-sm: 8px;
  --v4-shadow-soft: 0 4px 24px rgba(0,0,0,0.04);
  --v4-shadow-elevated: 0 20px 40px rgba(0,0,0,0.08);

  /* New mobile-specific tokens */
  --v4-mobile-padding: 20px;
  --v4-section-spacing-mobile: 48px;
  --v4-section-column-gap-mobile: 24px;
  
  /* Section Delimitation Tokens */
  --v4-hairline: 1px solid rgba(0, 0, 0, 0.08);
  --v4-hairline-dark: 1px solid rgba(255, 255, 255, 0.1);
}

/* Base Layout */
.pub-page {
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: var(--v4-text);
  background: var(--v4-bg);
  line-height: 1.47059;
  font-weight: 400;
  letter-spacing: -0.022em;
  -webkit-font-smoothing: antialiased;
  /* Prevent margin collapse at the page level */
  padding-top: 0.1px;
}

.v4-container {
  max-width: 1040px; /* More focused container like Apple */
  margin: 0 auto;
  padding: 0 40px; /* Increased desktop padding for symmetry */
}

@media (max-width: 768px) {
  .v4-container { padding: 0 var(--v4-mobile-padding); }
}

/* Spacing & Sections */
.v4-section {
  padding: 72px 0; /* Consistent desk padding */
  position: relative;
  border-bottom: var(--v4-hairline); /* Apple style hairline separator */
}

@media (max-width: 768px) {
  .v4-section { padding: 64px 0; } /* Consistent mobile padding */
}

/* Fix for nested element margins leaking into section paddings */
.v4-section > .v4-container > *:first-child {
  margin-top: 0 !important;
}

.v4-section > .v4-container > *:last-child {
  margin-bottom: 0 !important;
}

/* Specific section variations for delimitation */
.v4-section:last-of-type { border-bottom: none; }

.v4-section-alt {
  background: var(--v4-bg-alt);
}

.v4-section-header {
  margin-bottom: 56px;
}

@media (max-width: 768px) {
  .v4-section-header { margin-bottom: 32px; }
}

.v4-section-header.center {
  margin-inline: auto;
  text-align: center;
}

.v4-section-title {
  font-size: 40px;
  font-weight: 600;
  letter-spacing: -0.003em;
  line-height: 1.1;
  margin-bottom: 12px;
}

@media (max-width: 768px) {
  .v4-section-title { font-size: 28px; margin-bottom: 12px; }
}

.v4-section-subtitle {
  font-size: 21px;
  line-height: 1.38105;
  color: var(--v4-text-muted);
  font-weight: 400;
}

.v4-description-header {
  margin-bottom: 24px;
}

.v4-rich-content {
  font-size: 19px;
  line-height: 1.6;
  color: var(--v4-text);
  max-width: 800px;
  margin: 0 auto 32px; /* Margin bottom for text wrap, matches header's vibe */
}

/* Ensure spacing between rich content elements */
.v4-rich-content :deep(p), .v4-rich-content p,
.v4-rich-content :deep(div), .v4-rich-content div {
  margin-bottom: 20px;
}

.v4-rich-content :deep(ul), .v4-rich-content ul {
  padding-left: 24px;
  margin-bottom: 20px;
  list-style-type: disc;
}

.v4-rich-content :deep(li), .v4-rich-content li {
  margin-bottom: 8px;
}

.v4-rich-content :deep(strong), .v4-rich-content strong, 
.v4-rich-content :deep(b), .v4-rich-content b {
  font-weight: 700;
  color: #000;
}
.v4-schedule-cta h3 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #fff;
}
.v4-pulse {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: var(--v4-primary);
  border-radius: 50%;
  margin-right: 8px;
  box-shadow: 0 0 0 rgba(0, 113, 227, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 113, 227, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0, 113, 227, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 113, 227, 0); }
}

.v4-sales-motion-toast {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 22px;
  z-index: 200;
  max-width: 360px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(10, 15, 13, 0.86);
  color: #eafff3;
  font-size: 0.84rem;
  font-weight: 600;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.36);
  backdrop-filter: blur(10px);
}

.v4-sales-motion-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
  background: #22c55e;
  box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.15);
}

.v4-sales-motion-fade-enter-active,
.v4-sales-motion-fade-leave-active {
  transition: all 0.22s ease;
}

.v4-sales-motion-fade-enter-from,
.v4-sales-motion-fade-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

/* Floating Search CTA */
.v4-floating-cta {
  position: fixed;
  bottom: 40px;
  right: 24px;
  z-index: 1000;
  max-width: calc(100vw - 48px);
}

@media (max-width: 768px) {
  .v4-sales-motion-toast {
    left: 50%;
    transform: translateX(-50%);
    width: min(90vw, 360px);
    top: calc(env(safe-area-inset-top, 0px) + 10px);
    bottom: auto;
    max-width: none;
    padding: 9px 12px;
    border-radius: 10px;
    font-size: 0.74rem;
    background: rgba(10, 15, 13, 0.74);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
  }

  .v4-floating-cta {
    bottom: 100px; 
    right: 16px;
    max-width: 60px;
  }
}

.v4-cta-btn-animated {
  display: block;
  text-decoration: none;
  background: white;
  padding: 2px; /* For animated border */
  border-radius: 100px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  transition: transform 0.3s;
  border: none;
  cursor: pointer;
}

@media (max-width: 768px) {
  .v4-cta-btn-animated { 
    border-radius: 50%;
    width: 60px;
    height: 60px;
    padding: 2px;
  }
}

.v4-cta-btn-animated:hover {
  transform: translateY(-4px) scale(1.02);
}

/* Animated Border Effect */
.v4-cta-btn-animated::before {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(
    transparent, 
    var(--v4-primary), 
    #00c3ff, 
    var(--v4-primary), 
    transparent 30%
  );
  animation: rotate-border 4s linear infinite;
  z-index: 1;
}

@keyframes rotate-border {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.v4-cta-inner {
  position: relative;
  z-index: 2;
  background: white;
  border-radius: 100px;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .v4-cta-inner {
    padding: 12px;
    border-radius: 50%;
    aspect-ratio: 1;
    justify-content: center;
    width: 56px;
    height: 56px;
  }
}

.v4-cta-icon-spark { font-size: 18px; }

@media (max-width: 768px) {
  .v4-cta-icon-spark { font-size: 24px; margin: 0; }
}

.v4-cta-label { font-size: 14px; font-weight: 600; color: var(--v4-text); letter-spacing: -0.01em; }

@media (max-width: 768px) {
  .v4-cta-label { display: none; }
}

.v4-cta-arrow-icon { color: var(--v4-primary); font-weight: 700; transition: transform 0.2s; }

@media (max-width: 768px) {
  .v4-cta-arrow-icon { display: none; }
}

.v4-cta-btn-animated:hover .v4-cta-arrow-icon {
  transform: translateX(4px);
}

.v4-onboarding-overlay {
  position: fixed;
  inset: 0;
  z-index: 9100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(0, 113, 227, 0.18), transparent 28%),
    radial-gradient(circle at bottom right, rgba(73, 182, 255, 0.14), transparent 24%),
    rgba(6, 14, 24, 0.68);
  backdrop-filter: blur(18px);
}

.v4-onboarding-shell {
  position: relative;
  width: min(100%, 980px);
  max-height: min(92dvh, 860px);
  border-radius: 32px;
  overflow: hidden;
  padding: 28px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.55);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(245, 247, 250, 0.92)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(239, 243, 248, 0.88));
  box-shadow: 0 32px 90px rgba(4, 20, 35, 0.36);
}

.v4-onboarding-orb {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  opacity: 0.65;
  filter: blur(2px);
  animation: v4-onboarding-float 10s ease-in-out infinite;
}

.v4-onboarding-orb--one {
  width: 220px;
  height: 220px;
  top: -78px;
  right: -36px;
  background: radial-gradient(circle, rgba(0, 113, 227, 0.18), rgba(0, 113, 227, 0.02) 70%);
}

.v4-onboarding-orb--two {
  width: 140px;
  height: 140px;
  left: -46px;
  bottom: 72px;
  background: radial-gradient(circle, rgba(103, 184, 255, 0.18), rgba(103, 184, 255, 0.01) 72%);
  animation-delay: -2s;
}

.v4-onboarding-orb--three {
  width: 120px;
  height: 120px;
  right: 28%;
  bottom: -44px;
  background: radial-gradient(circle, rgba(29, 29, 31, 0.1), transparent 70%);
  animation-delay: -4s;
}

.v4-onboarding-dismiss {
  position: relative;
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.8);
  color: #4a4a50;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
}

.v4-onboarding-head,
.v4-onboarding-content,
.v4-onboarding-footer {
  position: relative;
  z-index: 1;
}

.v4-onboarding-head {
  display: grid;
  gap: 14px;
  margin-bottom: 26px;
}

.v4-onboarding-head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.v4-onboarding-head-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.v4-onboarding-kicker,
.v4-onboarding-step-label {
  display: block;
}

.v4-onboarding-kicker {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--v4-primary);
  margin-bottom: 6px;
}

.v4-onboarding-step-label,
.v4-onboarding-mini-note {
  color: #6b7280;
  font-size: 14px;
  font-weight: 600;
}

.v4-onboarding-progress {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(17, 24, 39, 0.08);
}

.v4-onboarding-progress > span {
  display: block;
  width: 0;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0071e3, #59b4ff);
  box-shadow: 0 0 18px rgba(0, 113, 227, 0.22);
}

.v4-onboarding-content {
  min-height: 420px;
  overflow-y: auto;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(134, 134, 139, 0.45) transparent;
}

.v4-onboarding-content::-webkit-scrollbar {
  width: 8px;
}

.v4-onboarding-content::-webkit-scrollbar-track {
  background: transparent;
}

.v4-onboarding-content::-webkit-scrollbar-thumb {
  background: rgba(134, 134, 139, 0.45);
  border-radius: 999px;
}

.v4-onboarding-intro-grid,
.v4-onboarding-step-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 24px;
  align-items: start;
}

.v4-onboarding-copy h3 {
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 0.98;
  letter-spacing: -0.04em;
  margin: 0 0 16px;
  color: #121417;
}

.v4-onboarding-copy p {
  max-width: 580px;
  margin: 0;
  font-size: 17px;
  line-height: 1.6;
  color: #5b6470;
}

.v4-onboarding-summary-strip,
.v4-onboarding-summary-chips,
.v4-onboarding-tag-cloud,
.v4-onboarding-footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.v4-onboarding-summary-strip {
  margin-top: 22px;
}

.v4-onboarding-summary-pill,
.v4-onboarding-chip {
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.v4-onboarding-summary-pill {
  background: rgba(0, 113, 227, 0.09);
  color: var(--v4-primary);
}

.v4-onboarding-chip {
  background: rgba(15, 23, 42, 0.06);
  color: #1f2937;
}

.v4-onboarding-chip.is-empty {
  background: rgba(148, 163, 184, 0.14);
  color: #64748b;
}

.v4-onboarding-intro-visual,
.v4-onboarding-summary-card {
  border-radius: 28px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.2);
  backdrop-filter: blur(12px);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
}

.v4-onboarding-preview-stack {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}

.v4-onboarding-preview-card {
  border-radius: 22px;
  padding: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(245, 247, 250, 0.9));
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.v4-onboarding-preview-card--primary {
  background: linear-gradient(135deg, rgba(0, 113, 227, 0.1), rgba(255, 255, 255, 0.96));
}

.v4-onboarding-preview-label,
.v4-onboarding-summary-title {
  display: block;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #64748b;
}

.v4-onboarding-preview-card strong {
  display: block;
  margin-bottom: 8px;
  font-size: 18px;
  line-height: 1.2;
  color: #101828;
}

.v4-onboarding-preview-card p {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: #5b6470;
}

.v4-onboarding-preview-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, #0071e3, #59b4ff);
  box-shadow: 0 0 0 8px rgba(0, 113, 227, 0.09);
  flex-shrink: 0;
}

.v4-onboarding-preview-stack .v4-onboarding-preview-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.v4-smart-range-card {
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.88);
  padding: 18px;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.06);
}

.v4-smart-range-card--guided {
  margin-top: 22px;
}

.v4-smart-range-card--modal {
  background: #fbfbfd;
}

.v4-smart-grid-span-2 {
  grid-column: span 2;
}

.v4-smart-range-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.v4-smart-range-label,
.v4-smart-range-hint {
  display: block;
}

.v4-smart-range-label {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}

.v4-smart-range-head strong {
  font-size: 20px;
  line-height: 1.2;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.v4-smart-range-hint {
  font-size: 12px;
  line-height: 1.4;
  color: #64748b;
  text-align: right;
}

.v4-dual-range {
  position: relative;
  height: 34px;
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}

.v4-dual-range-track {
  position: absolute;
  inset: 50% 0 auto;
  transform: translateY(-50%);
  height: 8px;
  border-radius: 999px;
  pointer-events: none;
}

.v4-dual-range-input {
  position: absolute;
  inset: 0;
  width: 100%;
  margin: 0;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
  pointer-events: none;
}

.v4-dual-range-input::-webkit-slider-runnable-track {
  height: 8px;
  background: transparent;
}

.v4-dual-range-input::-moz-range-track {
  height: 8px;
  background: transparent;
}

.v4-dual-range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #0071e3;
  border: 4px solid #fff;
  box-shadow: 0 8px 20px rgba(0, 113, 227, 0.28);
  pointer-events: auto;
  cursor: pointer;
  margin-top: -7px;
}

.v4-dual-range-input::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #0071e3;
  border: 4px solid #fff;
  box-shadow: 0 8px 20px rgba(0, 113, 227, 0.28);
  pointer-events: auto;
  cursor: pointer;
}

.v4-smart-range-values {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.v4-smart-range-pill {
  border-radius: 16px;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.05);
}

.v4-smart-range-pill span,
.v4-smart-range-pill strong {
  display: block;
}

.v4-smart-range-pill span {
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
}

.v4-smart-range-pill strong {
  font-size: 14px;
  line-height: 1.3;
  color: #0f172a;
}

.v4-onboarding-options-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 22px;
}

.v4-onboarding-option {
  position: relative;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 22px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.78);
  text-align: left;
  cursor: pointer;
  transition: transform 0.24s ease, border-color 0.24s ease, box-shadow 0.24s ease, background 0.24s ease;
}

.v4-onboarding-option:hover {
  transform: translateY(-3px);
  border-color: rgba(0, 113, 227, 0.26);
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.08);
}

.v4-onboarding-option.active {
  border-color: rgba(0, 113, 227, 0.55);
  background: linear-gradient(180deg, rgba(0, 113, 227, 0.08), rgba(255, 255, 255, 0.96));
  box-shadow: 0 18px 40px rgba(0, 113, 227, 0.14);
}

.v4-onboarding-option strong,
.v4-onboarding-option span {
  display: block;
}

.v4-onboarding-option strong {
  font-size: 20px;
  line-height: 1.12;
  letter-spacing: -0.03em;
  color: #111827;
  margin-bottom: 10px;
}

.v4-onboarding-option span {
  font-size: 14px;
  line-height: 1.55;
  color: #64748b;
}

.v4-onboarding-option-badge {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  margin-bottom: 14px;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: #1f2937 !important;
  font-size: 12px !important;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.v4-onboarding-tag-cloud {
  margin-top: 22px;
}

.v4-onboarding-tag {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 999px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.78);
  color: #1f2937;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.22s ease;
}

.v4-onboarding-tag:hover,
.v4-onboarding-tag.active {
  border-color: rgba(0, 113, 227, 0.48);
  background: rgba(0, 113, 227, 0.1);
  color: var(--v4-primary);
}

.v4-onboarding-footer {
  margin-top: 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.v4-onboarding-footer-copy {
  display: grid;
  gap: 6px;
  max-width: 480px;
}

.v4-onboarding-footer-copy strong {
  font-size: 15px;
  line-height: 1.3;
  color: #101828;
}

.v4-onboarding-footer-copy span {
  font-size: 13px;
  line-height: 1.55;
  color: #64748b;
}

.v4-onboarding-btn {
  border: none;
  border-radius: 16px;
  padding: 15px 20px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease, background 0.2s ease;
}

.v4-onboarding-btn:hover {
  transform: translateY(-1px);
}

.v4-onboarding-btn--ghost {
  background: rgba(15, 23, 42, 0.06);
  color: #1f2937;
}

.v4-onboarding-btn--primary {
  background: linear-gradient(135deg, #0071e3, #0099ff);
  color: #fff;
  min-width: 220px;
  box-shadow: 0 18px 36px rgba(0, 113, 227, 0.24);
}

@keyframes v4-onboarding-float {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(0, -10px, 0) scale(1.04); }
}

@media (max-width: 768px) {
  .v4-onboarding-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .v4-onboarding-shell {
    width: 100%;
    max-height: min(88dvh, 760px);
    border-radius: 24px 24px 0 0;
    padding: 16px 14px 14px;
  }

  .v4-onboarding-dismiss {
    align-self: flex-start;
    padding: 9px 12px;
    font-size: 12px;
  }

  .v4-onboarding-head {
    margin-bottom: 16px;
    gap: 12px;
  }

  .v4-onboarding-head-top,
  .v4-onboarding-head-row,
  .v4-onboarding-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .v4-onboarding-head-row {
    gap: 8px;
  }

  .v4-onboarding-intro-grid,
  .v4-onboarding-step-panel,
  .v4-onboarding-options-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .v4-onboarding-content {
    min-height: auto;
    padding-right: 2px;
  }

  .v4-onboarding-copy h3 {
    font-size: 1.85rem;
    line-height: 1.02;
    margin-bottom: 12px;
  }

  .v4-onboarding-copy p {
    font-size: 14px;
    line-height: 1.5;
  }

  .v4-onboarding-summary-strip {
    gap: 8px;
    margin-top: 16px;
  }

  .v4-onboarding-summary-pill,
  .v4-onboarding-chip {
    padding: 8px 11px;
    font-size: 12px;
  }

  .v4-onboarding-intro-visual {
    display: none;
  }

  .v4-onboarding-summary-card {
    padding: 14px;
  }

  .v4-smart-grid-span-2 {
    grid-column: span 1;
  }

  .v4-smart-range-card {
    padding: 14px;
    border-radius: 18px;
  }

  .v4-smart-range-head {
    flex-direction: column;
    gap: 8px;
    margin-bottom: 14px;
  }

  .v4-smart-range-head strong {
    font-size: 17px;
  }

  .v4-smart-range-hint {
    text-align: left;
  }

  .v4-smart-range-values {
    gap: 8px;
  }

  .v4-smart-range-pill {
    padding: 10px 12px;
  }

  .v4-dual-range-input::-webkit-slider-thumb {
    width: 20px;
    height: 20px;
    margin-top: -6px;
  }

  .v4-dual-range-input::-moz-range-thumb {
    width: 20px;
    height: 20px;
  }

  .v4-onboarding-option {
    padding: 16px;
    border-radius: 18px;
  }

  .v4-onboarding-option strong {
    font-size: 18px;
    margin-bottom: 8px;
  }

  .v4-onboarding-option span {
    font-size: 13px;
    line-height: 1.45;
  }

  .v4-onboarding-option-badge {
    margin-bottom: 10px;
  }

  .v4-onboarding-tag-cloud {
    gap: 8px;
    margin-top: 16px;
  }

  .v4-onboarding-tag {
    padding: 10px 12px;
    font-size: 13px;
  }

  .v4-onboarding-footer {
    margin-top: 14px;
    padding-top: 14px;
    gap: 12px;
  }

  .v4-onboarding-footer-copy strong {
    font-size: 14px;
  }

  .v4-onboarding-footer-copy span {
    font-size: 12px;
    line-height: 1.45;
  }

  .v4-onboarding-footer-actions {
    width: 100%;
    gap: 10px;
  }

  .v4-onboarding-btn {
    width: 100%;
    padding: 14px 16px;
    border-radius: 14px;
    font-size: 14px;
  }
}

/* Modal Search Styles */
.v4-filter-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  z-index: 9000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 12px;
}

@media (min-width: 769px) {
  .v4-filter-modal-overlay {
    align-items: center;
    padding: 28px;
  }
}

.v4-filter-modal-card {
  background: white;
  width: min(100%, 760px);
  border-radius: 28px 28px 0 0;
  padding: 24px 20px 20px;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.12);
  max-height: calc(100dvh - 24px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  animation: modal-slide-up 0.35s cubic-bezier(0.165, 0.84, 0.44, 1);
}

@media (min-width: 769px) {
  .v4-filter-modal-card {
    border-radius: 28px;
    padding: 30px;
    max-height: min(90dvh, 920px);
    box-shadow: 0 30px 60px rgba(0,0,0,0.15);
    animation: modal-appear 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  }
}

@keyframes modal-slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes modal-appear {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.v4-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-shrink: 0;
}
.v4-modal-title { font-size: 24px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; }
.v4-modal-close {
  background: #f5f5f7;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #86868b;
  transition: all 0.2s;
  flex-shrink: 0;
}
.v4-modal-close:hover { background: #e8e8ed; color: #1d1d1f; }

.v4-modal-body {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 16px;
  padding-right: 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(134, 134, 139, 0.55) transparent;
}

.v4-modal-body::-webkit-scrollbar {
  width: 8px;
}

.v4-modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.v4-modal-body::-webkit-scrollbar-thumb {
  background: rgba(134, 134, 139, 0.45);
  border-radius: 999px;
}

.v4-modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(134, 134, 139, 0.72);
}
.v4-modal-label { font-size: 13px; font-weight: 700; color: #86868b; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 16px; }

.v4-modal-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
}

.v4-smart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .v4-smart-grid {
    grid-template-columns: 1fr;
  }
}

.v4-smart-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.v4-smart-field span {
  font-size: 12px;
  font-weight: 600;
  color: #6e6e73;
}

.v4-smart-field input {
  border: 1px solid #d2d2d7;
  border-radius: 12px;
  padding: 11px 12px;
  font-size: 14px;
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.v4-smart-field input:focus {
  outline: none;
  border-color: #0071e3;
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.15);
}

.v4-modal-tag {
  background: #f5f5f7;
  border: 1px solid transparent;
  padding: 10px 18px;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #d2d2d7;
}
.v4-modal-tag:hover { background: #e8e8ed; }
.v4-modal-tag.active { background: #0071e3; color: white; border-color: #0071e3; }

.v4-modal-options {
  background: #f5f5f7;
  padding: 16px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.v4-modal-option {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.v4-modal-option input[type="checkbox"] { width: 20px; height: 20px; cursor: pointer; }
.v4-option-info { display: flex; flex-direction: column; }
.v4-option-title { font-size: 14px; font-weight: 600; color: #1d1d1f; }
.v4-option-desc { font-size: 12px; color: #86868b; }

.v4-modal-footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
  border-top: 1px solid #ececf0;
  padding-top: 14px;
  background: #fff;
}
.v4-btn-modal-search {
  background: #0071e3;
  color: white;
  border: none;
  padding: 16px;
  border-radius: 14px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.v4-btn-modal-search:hover { background: #0077ed; transform: scale(1.02); }
.v4-btn-modal-clear {
  background: transparent;
  color: #0071e3;
  border: none;
  padding: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

@media (max-width: 768px) {
  .v4-filter-modal-overlay {
    padding: 0;
  }

  .v4-filter-modal-card {
    width: 100%;
    border-radius: 24px 24px 0 0;
    max-height: 90dvh;
    padding: 20px 16px 16px;
  }

  .v4-modal-header {
    margin-bottom: 16px;
  }

  .v4-modal-title {
    font-size: 28px;
  }

  .v4-modal-body {
    padding-right: 6px;
    margin-bottom: 12px;
  }
}

/* Fade animation */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.v4-cta-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(0, 113, 227, 0.1), transparent);
  z-index: 0;
  pointer-events: none;
}

/* Navigation & Hero */
.v4-hero {
  position: relative;
  background: #000;
  color: white;
  overflow: hidden;
  min-height: 85vh;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 0 0 0;
}

.v4-hero-bg {
  position: absolute;
  inset: 0;
  background-image: var(--v4-hero-bg-desktop);
  background-size: cover;
  background-position: center;
  z-index: 1;
  opacity: 1;
  transition: all 0.5s ease;
}

@media (max-width: 1024px) {
  .v4-hero-bg {
    background-image: var(--v4-hero-bg-tablet, var(--v4-hero-bg-desktop));
  }
}

@media (max-width: 768px) {
  .v4-hero-bg {
    background-image: var(--v4-hero-bg-mobile, var(--v4-hero-bg-tablet, var(--v4-hero-bg-desktop)));
  }
}

.v4-hero.has-banner .v4-hero-bg {
  filter: brightness(0.9);
  transform: none;
}

.v4-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.15) 100%);
  z-index: 2;
}

.v4-hero.has-banner .v4-hero-overlay {
  background: linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.1) 70%, transparent 100%);
}

.v4-hero-content {
  position: relative;
  z-index: 3;
  width: 100%;
  padding: 48px 0 56px;
  display: flex;
  align-items: flex-end;
  gap: 48px;
}

.v4-hero-text {
  flex: 1;
  min-width: 0;
}

.v4-hero-tag {
  display: inline-block;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 16px;
  background: var(--v4-primary);
  padding: 6px 16px;
  border-radius: 100px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
}

.v4-hero-title {
  font-size: clamp(32px, 6vw, 64px);
  font-weight: 700;
  text-wrap: pretty;
  line-height: 1;
  margin-bottom: 20px;
  color: #ffffff;
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
  text-transform: uppercase;
}

.v4-hero-desc {
  font-size: clamp(15px, 2vw, 18px);
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 28px;
  max-width: 560px;
  line-height: 1.5;
}

/* Hero Stats — vertical stack on the right */
.v4-hero-stats {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-left: 40px;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 8px;
}

.v4-stat-card {
  text-align: left;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.v4-stat-label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
  font-weight: 700;
}

.v4-stat-value {
  font-size: 40px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
  letter-spacing: -0.02em;
}

.v4-stat-value small {
  font-size: 0.55em;
  font-weight: 500;
  opacity: 0.8;
  vertical-align: middle;
}

.v4-stat-meta {
  margin-top: 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
  max-width: 200px;
}

.v4-stat-installments {
  font-weight: 700;
  color: #32d74b;
  display: block;
  font-size: 16px;
  margin-bottom: 4px;
}

.v4-stat-summary {
  margin-top: 2px;
  opacity: 0.8;
  color: #fff;
}

.v4-hero-actions {
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

/* Buttons */
.v4-btn-primary {
  background: var(--v4-primary);
  color: white;
  padding: 12px 28px;
  border-radius: 100px;
  font-weight: 500;
  font-size: 17px;
  text-decoration: none;
  transition: background 0.3s;
}

.v4-btn-white {
  background: white;
  color: #1d1d1f;
  padding: 12px 28px;
  border-radius: 100px;
  font-weight: 500;
  font-size: 17px;
  text-decoration: none;
  transition: all 0.3s;
  box-shadow: 0 4px 14px rgba(0,0,0,0.15);
}

.v4-btn-primary:hover { background: var(--v4-primary-hover); transform: translateY(-1px); }
.v4-btn-white:hover { background: #f5f5f7; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.2); }

/* Trust Bar */
.v4-prelaunch-bar {
  position: sticky;
  top: 0;
  z-index: 110;
  padding: 10px 0;
  background:
    linear-gradient(90deg, rgba(6, 78, 59, 0.94), rgba(3, 105, 161, 0.94)),
    rgba(7, 12, 20, 0.92);
  color: #ecfeff;
  border-bottom: 1px solid rgba(255,255,255,0.14);
  box-shadow: 0 10px 34px rgba(2, 6, 23, 0.18);
  backdrop-filter: saturate(180%) blur(18px);
}

.v4-prelaunch-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.v4-prelaunch-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.v4-prelaunch-kicker {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(236, 254, 255, 0.82);
}

.v4-prelaunch-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  color: #fff;
}

.v4-prelaunch-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(236, 254, 255, 0.86);
}

.v4-prelaunch-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.v4-prelaunch-dismiss {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  right: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.v4-prelaunch-dismiss:hover {
  background: rgba(255, 255, 255, 0.16);
}

.v4-prelaunch-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 20px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.18);
  transition: all 0.22s ease;
}

.v4-prelaunch-btn:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 24px rgba(2, 6, 23, 0.16);
}

.v4-plant-map-actions {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.v4-plant-map-btn {
  min-width: 280px;
  text-decoration: none;
  text-align: center;
}

.v4-trust-bar {
  background: rgba(255, 255, 255, 0.85); /* Slightly more transparent */
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(0,0,0,0.05); /* Softer border */
  padding: 12px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 30px rgba(0,0,0,0.03);
}

.v4-trust-bar--with-prelaunch {
  top: 106px;
}

.v4-trust-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.v4-trust-person {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.v4-trust-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background: #f5f5f7;
  border: 1px solid var(--v4-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.v4-trust-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.v4-avatar-placeholder {
  line-height: 1;
  font-size: 18px;
  font-weight: 700;
  color: var(--v4-primary);
  text-transform: uppercase;
}

.v4-trust-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.v4-trust-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--v4-text-muted);
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}

.v4-trust-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--v4-text);
}

.v4-trust-creci {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--v4-text-muted);
  overflow-wrap: anywhere;
}

.v4-trust-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  min-width: 0;
}

.v4-trust-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  transition: all 0.2s;
}

.v4-trust-btn--whatsapp { background: #25d366; color: white; }
.v4-trust-btn--primary { background: var(--v4-primary); color: white; }

/* Infrastructure Split Layout (Sophisticated) */
.v4-infra-split {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}
@media (min-width: 992px) {
  .v4-infra-split { grid-template-columns: 1fr 1.5fr; gap: 100px; }
}

.v4-infra-hero-text {
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 700;
  line-height: 1.1;
  color: var(--v4-text);
  margin-bottom: 24px;
  letter-spacing: -0.02em;
}

@media (max-width: 768px) {
  .v4-infra-hero-text {
    font-size: 28px;
    margin-bottom: 16px;
    text-align: center;
  }
}

.v4-infra-sub-text {
  font-size: 19px;
  color: var(--v4-text-muted);
  line-height: 1.4;
  margin-bottom: 40px;
}

@media (max-width: 768px) {
  .v4-infra-sub-text {
    font-size: 16px;
    text-align: center;
    margin-bottom: 24px;
  }
}

.v4-infra-divider {
  width: 60px;
  height: 4px;
  background: var(--v4-primary);
  border-radius: 2px;
}

@media (max-width: 768px) {
  .v4-infra-divider {
    margin: 0 auto 32px;
  }
}

.v4-infra-right {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 40px;
}

@media (max-width: 768px) {
  .v4-infra-right {
    gap: 32px;
    grid-template-columns: 1fr;
  }
}

.v4-infra-group-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--v4-text);
  margin-bottom: 20px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.8;
}

@media (max-width: 768px) {
  .v4-infra-group-title {
    margin-bottom: 12px;
    font-size: 13px;
  }
}

.v4-infra-items-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.v4-infra-list-item {
  font-size: 16px;
  color: var(--v4-text-muted);
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
  line-height: 1.4;
}

.v4-infra-bullet {
  color: var(--v4-primary);
  font-weight: bold;
}

/* Traditional Highlights Grid v2 (Destaques) */
.v4-destaques-grid-v2 {
  max-width: 1000px;
  margin: 0 auto;
}

.v4-destaques-items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 40px 60px;
}

.v4-destaque-card-minimal {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.v4-destaque-marker-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--v4-primary);
  margin-top: 10px;
  flex-shrink: 0;
}

.v4-destaque-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.v4-destaque-title {
  font-size: 20px;
  font-weight: 500;
  color: var(--v4-text);
  margin: 0;
  letter-spacing: -0.01em;
}

.v4-destaque-detail {
  font-size: 16px;
  color: var(--v4-text-muted);
  line-height: 1.4;
  margin: 0;
}

@media (max-width: 768px) {
  .v4-destaques-items {
    grid-template-columns: 1fr;
    gap: 30px;
  }
}

/* Video Presentation */
.v4-video-wrapper {
  max-width: 800px;
  margin: 0 auto;
  aspect-ratio: 16/9;
  border-radius: 24px;
  overflow: hidden;
  background: black;
  box-shadow: var(--v4-shadow-elevated);
}
.v4-video-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111;
  color: white;
  text-decoration: none;
  font-weight: 600;
  gap: 12px;
}
.v4-video-placeholder:hover { background: #222; }

.v4-interaction-gate {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.45);
  text-align: center;
}

.v4-interaction-gate__btn {
  border: none;
  background: #ffffff;
  color: #111827;
  font-weight: 700;
  font-size: 14px;
  padding: 10px 16px;
  border-radius: 999px;
  cursor: pointer;
}

.v4-interaction-gate__hint {
  margin: 0;
  color: #e5e7eb;
  font-size: 12px;
  line-height: 1.35;
  max-width: 280px;
}

.v4-interaction-toggle {
  margin-top: 12px;
  border: 1px solid var(--v4-border);
  background: #fff;
  color: var(--v4-text-muted);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.v4-panorama-card {
  position: relative;
  height: clamp(260px, 56.25vw, 540px);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--v4-shadow-elevated);
  margin-bottom: 24px;
}

.v4-panorama-card.is-interaction-disabled :deep(.panorama-viewer) {
  pointer-events: none;
}

.v4-panorama-card--fallback {
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

@media (max-width: 768px) {
  .v4-panorama-card {
    height: clamp(220px, 56vw, 320px);
    margin-bottom: 16px;
  }
}

/* Construction Progress */
.v4-construction-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  max-width: 1000px;
  margin: 40px auto 0;
}
@media (min-width: 768px) {
  .v4-construction-grid { grid-template-columns: 1fr 1fr; gap: 40px; }
}

.v4-construction-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.v4-construction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.v4-construction-label { font-size: 17px; font-weight: 600; color: var(--v4-text); }
.v4-construction-percentage { font-size: 15px; font-weight: 700; color: var(--v4-primary); }

.v4-progress-bar {
  width: 100%;
  height: 12px;
  background: var(--v4-bg-alt);
  border-radius: 6px;
  overflow: hidden;
}
.v4-progress-fill {
  height: 100%;
  background: var(--v4-primary);
  border-radius: 6px;
  transition: width 1s cubic-bezier(0.165, 0.84, 0.44, 1);
}

/* Rich Content */
.v4-rich-content {
  font-size: 19px;
  line-height: 1.6;
  color: var(--v4-text);
  max-width: 800px;
  margin: 0 auto 60px;
  text-align: center;
}
.v4-rich-content :deep(p) { margin-bottom: 1.2rem; }
.v4-rich-content :deep(strong), .v4-rich-content :deep(b) { color: var(--v4-text); font-weight: 700; }

@media (max-width: 768px) {
  .v4-rich-content { font-size: 17px; padding: 0 20px; }
}

/* Map Container */
.v4-map-container {
  background: white;
  border-radius: var(--v4-radius-lg);
  overflow: hidden;
  box-shadow: var(--v4-shadow-soft);
  border: 1px solid var(--v4-border);
}

.v4-map-legend {
  padding: 24px;
  border-bottom: 1px solid var(--v4-border);
  display: flex;
  justify-content: center;
  gap: 32px;
}

.v4-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--v4-text-muted);
}

.v4-legend-item .dot { width: 8px; height: 8px; border-radius: 50%; }
.v4-legend-item .dot.available { background: #32d74b; } /* Apple Green */
.v4-legend-item .dot.reserved { background: #ff9f0a; } /* Apple Orange */
.v4-legend-item .dot.sold { background: #ff453a; } /* Apple Red */

.v4-map-viewport {
  background: #fafafa;
  min-height: 500px;
}

/* Lots Grid */
.v4-lots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .v4-lots-grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}

.v4-lots-carousel-header {
  margin-bottom: 40px;
  justify-content: center;
  text-align: center;
}

.v4-lots-carousel-header .v4-section-title {
  width: 100%;
  text-align: center;
}

@media (max-width: 768px) {
  .v4-lots-carousel-header {
    margin-bottom: 24px;
  }
}

.v4-lots-carousel-bleed {
  width: 100%;
  margin: 24px 0;
  padding: 4px 0 6px;
  position: relative;
}

.v4-lots-carousel-bleed::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 32px;
  background: linear-gradient(to right, transparent, var(--v4-section-alt-bg, #f7f8fb));
  pointer-events: none;
  z-index: 2;
}

.v4-lots-swiper {
  padding: 0 24px 4px;
}

.v4-lots-swiper :deep(.swiper-slide) {
  height: auto;
}

.v4-lots-carousel-fallback {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 0 24px 4px;
  scrollbar-width: none;
}

.v4-lots-carousel-fallback::-webkit-scrollbar {
  display: none;
}

.v4-lot-card--compact {
  min-height: 148px;
  padding: 16px 16px 14px;
  gap: 10px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid #eef1f5;
}

.v4-lot-card--fallback {
  min-width: min(48vw, 200px);
  flex: 0 0 min(48vw, 200px);
}

.v4-lot-card-header--compact {
  margin-bottom: 2px;
  gap: 8px;
  align-items: flex-start;
}

.v4-lot-id--compact {
  gap: 4px;
  min-width: 0;
}

.v4-lot-code--compact {
  font-size: 22px;
  line-height: 1.15;
  letter-spacing: -0.035em;
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  overflow-wrap: anywhere;
}

.v4-lot-mini-meta {
  font-size: 10px;
  font-weight: 600;
  color: var(--v4-text-muted);
  min-height: 0;
  line-height: 1.4;
  margin-top: 2px;
}

.v4-lot-mini-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.v4-lot-mini-stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 7px 10px;
  border-radius: 10px;
  background: #f7f8fb;
}

.v4-lot-mini-stat-label {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--v4-text-muted);
  line-height: 1.3;
}

.v4-lot-mini-stat strong {
  font-size: 12px;
  line-height: 1.3;
  color: var(--v4-text);
}

.v4-lot-card-footer--compact {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid #eef1f5;
  font-size: 11.5px;
  justify-content: space-between;
}

.v4-lots-carousel-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 48px;
  text-align: center;
}

.v4-lots-carousel-status {
  font-size: 13px;
  font-weight: 600;
  color: var(--v4-text-muted);
  width: 100%;
  text-align: center;
}

.v4-lots-carousel-status--error {
  color: #c43d2f;
}

.v4-lots-carousel-cta,
.v4-lots-grid-cta {
  display: flex;
  justify-content: center;
  width: 100%;
}

.v4-lots-grid-cta {
  margin-top: 56px;
}

.v4-lots-carousel-cta-btn {
  min-width: 280px;
  text-decoration: none;
  text-align: center;
}

.v4-lot-card {
  background: white;
  border-radius: var(--v4-radius-lg);
  padding: 32px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #f2f2f2;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

@media (max-width: 768px) {
  .v4-lots-swiper {
    padding: 0 12px 4px;
  }

  .v4-lots-carousel-fallback {
    padding: 0 12px 4px;
  }

  .v4-lot-card--compact {
    min-height: 136px;
    padding: 14px 13px 12px;
  }

  .v4-lot-code--compact {
    font-size: 20px;
    line-height: 1.15;
  }

  .v4-lot-mini-meta {
    font-size: 9px;
    min-height: 0;
  }

  .v4-lot-mini-stats {
    gap: 6px;
  }

  .v4-lot-mini-stat {
    padding: 6px 8px;
  }

  .v4-lot-mini-stat strong {
    font-size: 11px;
  }

  .v4-lots-carousel-footer {
    margin-top: 32px;
  }

  .v4-lots-carousel-cta-btn {
    width: 100%;
    min-width: 0;
  }

  .v4-lot-card {
    padding: 16px;
    border-radius: 16px;
    gap: 8px;
  }
}

.v4-lot-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: color-mix(in srgb, var(--v4-primary) 50%, transparent);
}

.v4-lot-card-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: flex-start;
  margin-bottom: 20px; 
}

@media (max-width: 768px) {
  .v4-lot-card-header {
    margin-bottom: 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

.v4-lot-id {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.v4-lot-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--v4-text-muted);
  letter-spacing: 0.08em;
  line-height: 1.2;
}

@media (max-width: 768px) {
  .v4-lot-label { font-size: 9px; }
}

.v4-lot-code { 
  font-size: 26px; 
  font-weight: 700; 
  line-height: 1.05;
  letter-spacing: -0.03em; 
  color: var(--v4-text); 
}

@media (max-width: 768px) {
  .v4-lot-code { font-size: 18px; line-height: 1.2; }
}

.v4-lot-status {
  font-size: 9px;
  font-weight: 600;
  color: #3a9d6a;
  background: rgba(34, 153, 90, 0.06);
  border: 1px solid rgba(34, 153, 90, 0.10);
  padding: 4px 8px;
  border-radius: 100px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .v4-lot-status {
    font-size: 8px;
    padding: 3px 7px;
    position: static;
    align-self: flex-start;
  }
}

.v4-lot-info-row { 
  display: flex; 
  gap: 20px; 
  margin-bottom: 20px; 
  color: var(--v4-text-muted); 
  font-size: 15px;
  align-items: center;
}

@media (max-width: 768px) {
  .v4-lot-info-row { 
    gap: 8px; 
    font-size: 12px; 
    margin-bottom: 8px; 
    flex-direction: column; 
    align-items: flex-start; 
  }
}

.v4-lot-price { 
  display: flex;
  flex-direction: column;
  margin-top: auto;
  border-top: 1px solid #f5f5f7;
  padding-top: 20px;
}

@media (max-width: 768px) {
  .v4-lot-price { padding-top: 12px; margin-top: 4px; }
}

.v4-price-label { font-size: 12px; color: var(--v4-text-muted); }

@media (max-width: 768px) {
  .v4-price-label { font-size: 9px; margin-bottom: 2px; display: block; }
}

.v4-price-value { font-size: 20px; font-weight: 600; color: var(--v4-text); }

@media (max-width: 768px) {
  .v4-price-value { font-size: 15px; }
}

.v4-lot-card-footer { 
  margin-top: 20px;
  font-size: 15px;
  color: var(--v4-primary);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@media (max-width: 768px) {
  .v4-lot-card-footer { display: none; }
}

/* Final Conversion Card Modern */
.v4-conversion-card-new {
  background: white;
  border-radius: 40px;
  max-width: 1000px;
  margin: 0 auto;
  box-shadow: 0 40px 100px rgba(0,0,0,0.06);
  border: 1px solid #d2d2d7;
  overflow: hidden;
}

.v4-conversion-content {
  display: flex;
  min-height: 600px;
}

@media (max-width: 900px) {
  .v4-conversion-content { flex-direction: column; }
  .v4-conversion-card-new { border-radius: 24px; }
}

.v4-conversion-header-new {
  flex: 1;
  background: #fbfbfd;
  padding: 80px 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

@media (max-width: 900px) {
  .v4-conversion-header-new {
    background: #1d1d1f; /* Dark background like the example */
    color: white;
    text-align: center;
    padding: 60px 24px;
    align-items: center;
  }
}

.v4-form-container-new {
  flex: 1.2;
  padding: 80px 60px;
}

@media (max-width: 900px) {
  .v4-conversion-header-new { padding: 48px 32px; }
  .v4-form-container-new { 
    padding: 40px 20px; 
    background: white;
  }
}

.v4-badge-clean {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #0071e3;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 24px;
}

@media (max-width: 900px) {
  .v4-badge-clean {
    color: #40a9ff;
    margin-bottom: 16px;
  }
}

.v4-title-display {
  font-size: 44px;
  font-weight: 600;
  line-height: 1.1;
  color: #1d1d1f;
  margin-bottom: 20px;
  letter-spacing: -0.02em;
}

@media (max-width: 900px) {
  .v4-title-display {
    font-size: 32px;
    color: white;
    margin-bottom: 16px;
  }
}

.v4-subtitle-clean {
  font-size: 19px;
  line-height: 1.5;
  color: #86868b;
  margin-bottom: 40px;
}

@media (max-width: 900px) {
  .v4-subtitle-clean {
    font-size: 16px;
    color: rgba(255,255,255,0.7);
    margin-bottom: 32px;
  }
}

.v4-lot-badge-minimal {
  margin-top: auto;
  background: white;
  border: 1px solid #d2d2d7;
  padding: 16px 24px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  color: #1d1d1f;
}

@media (max-width: 900px) {
  .v4-lot-badge-minimal {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.1);
    color: white;
    font-size: 14px;
    padding: 12px 20px;
  }
}

.v4-form-modern {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.v4-form-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 600px) {
  .v4-form-cols { grid-template-columns: 1fr; }
}

.v4-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.v4-input-group label {
  font-size: 12px;
  font-weight: 600;
  color: #86868b;
  margin-left: 2px;
}

.v4-input-group input, 
.v4-input-group select, 
.v4-input-group textarea {
  width: 100%;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #d2d2d7;
  border-radius: 12px;
  font-size: 17px;
  color: #1d1d1f;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.v4-input-group input:focus, 
.v4-input-group select:focus, 
.v4-input-group textarea:focus {
  outline: none;
  border-color: #0071e3;
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.08);
}

.v4-btn-submit-modern {
  width: 100%;
  background: #0071e3;
  color: white;
  border: none;
  padding: 18px;
  border-radius: 14px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 12px;
}

.v4-btn-submit-modern:hover { background: #0077ed; transform: translateY(-1px); }
.v4-btn-submit-modern:active { transform: translateY(0); }

.v4-privacy-legal {
  text-align: center;
  font-size: 13px;
  color: #86868b;
  margin-top: 16px;
}

.v4-form-error-msg {
  background: #fff1f0;
  color: #df1125;
  padding: 12px;
  border-radius: 10px;
  font-size: 14px;
  text-align: center;
}

.v4-form-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #6e6e73;
  font-size: 13px;
  line-height: 1.45;
}

.v4-form-checkbox input {
  width: 18px;
  height: 18px;
  margin-top: 1px;
  flex: 0 0 auto;
}

.v4-form-success-new { text-align: center; padding: 40px 0; }
.v4-success-circle { width: 64px; height: 64px; background: #e6f7ed; color: #008a32; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
.v4-success-circle svg { width: 32px; height: 32px; }
.v4-btn-back { background: #f5f5f7; border: none; padding: 12px 32px; border-radius: 10px; cursor: pointer; margin-top: 24px; font-weight: 600; }

/* Gallery */
.v4-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-auto-rows: 180px;
  gap: 12px;
}

.v4-gallery-item {
  position: relative;
  border-radius: var(--v4-radius-md);
  overflow: hidden;
  cursor: pointer;
  background: var(--v4-bg-alt);
  border: 1px solid var(--v4-border);
}

@media (max-width: 768px) {
  .v4-gallery-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 160px;
  }
}

.v4-gallery-item img, .v4-gallery-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.v4-gallery-item:hover img, .v4-gallery-item:hover video {
  transform: scale(1.05);
}

.v4-gallery-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(0,0,0,0.4) 0%, transparent 60%);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px;
  opacity: 0;
  transition: opacity 0.3s;
}

.v4-gallery-item:hover .v4-gallery-overlay {
  opacity: 1;
}

.v4-gallery-caption {
  color: white;
  font-size: 15px;
  font-weight: 500;
}

.v4-gallery-expand {
  color: white;
  font-size: 20px;
}

/* Form Styles */
.v4-conversion-form-wrapper { 
  background: white; 
  border-radius: 18px; 
  padding: 40px; 
  border: 1px solid #d2d2d7;
  box-shadow: var(--v4-shadow-elevated);
}

.v4-form-title { font-size: 24px; font-weight: 600; margin-bottom: 32px; text-align: center; }

.v4-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 768px) { .v4-form-grid { grid-template-columns: 1fr; gap: 0; } }

.v4-form-group { margin-bottom: 24px; }
.v4-form-group label { display: block; font-size: 12px; font-weight: 600; color: #86868b; margin-bottom: 8px; }
.v4-form-group input, .v4-form-group select, .v4-form-group textarea {
  width: 100%; padding: 14px 16px; border: 1px solid #d2d2d7; border-radius: 12px; font-family: inherit; font-size: 17px; color: #1d1d1f; background: #fafafa;
}
.v4-form-group input:focus { outline: none; border-color: var(--v4-primary); background: white; }

.v4-btn-submit {
  width: 100%; background: var(--v4-primary); color: white; border: none; padding: 16px; border-radius: 12px; font-size: 17px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: background 0.2s;
}
.v4-btn-submit:hover { background: var(--v4-primary-hover); }

/* Legal Notice */
.v4-legal-notice {
  order: 4900;
  padding: 40px 0;
  background: var(--v4-bg-alt);
  border-top: 1px solid var(--v4-border);
}
.v4-legal-inner {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 28px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--v4-border);
  border-radius: 12px;
}
.v4-legal-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}
.v4-legal-text {
  font-size: 12px;
  line-height: 1.7;
  color: var(--v4-text-muted);
  margin: 0;
  white-space: pre-line;
}

/* Footer */
.v4-footer { order: 5000; padding: 60px 0; border-top: 1px solid var(--v4-border); background: var(--v4-bg-alt); }
.v4-footer-inner { display: flex; flex-direction: column; gap: 28px; }

.v4-footer-realizacao { display: flex; flex-direction: column; gap: 12px; }
.v4-footer-realizacao-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--v4-text-muted); }
.v4-footer-logos { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
.v4-footer-logo { height: 120px; max-width: 140px; object-fit: contain; opacity: 0.9; }

.v4-footer-brand { display: flex; align-items: center; gap: 16px; }
.v4-footer-company { display: flex; flex-direction: column; gap: 4px; }
.v4-footer-tenant { font-weight: 700; font-size: 18px; color: var(--v4-text); display: block; }
.v4-footer-creci { font-size: 12px; color: var(--v4-text-muted); display: block; letter-spacing: 0.02em; }

.v4-footer-contact { display: flex; flex-wrap: wrap; gap: 20px; }
.v4-footer-contact-item {
  display: inline-flex; align-items: center; gap: 7px;
  color: var(--v4-text-secondary); font-size: 14px; text-decoration: none;
  transition: color 150ms;
}
.v4-footer-contact-item:hover { color: var(--v4-text); }
.v4-footer-contact-item svg { flex-shrink: 0; opacity: 0.7; }

.v4-footer-copyright {
  display: flex; flex-direction: column; gap: 4px;
  border-top: 1px solid var(--v4-border); padding-top: 20px;
  font-size: 12px; color: var(--v4-text-muted);
}

/* Sticky mobile CTA */
.v4-sticky-nav {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(29, 29, 31, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  padding: 6px;
  border-radius: 100px;
  display: none;
  align-items: center;
  gap: 4px;
  width: auto;
  min-width: 320px;
  max-width: 92vw;
  z-index: 1000;
  box-shadow: 0 12px 30px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.08);
}

@media (max-width: 768px) {
  .v4-prelaunch-bar {
    position: static;
    padding: 12px 0 10px;
  }

  .v4-prelaunch-inner {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .v4-prelaunch-title {
    font-size: 15px;
  }

  .v4-prelaunch-text {
    font-size: 12px;
  }

  .v4-prelaunch-btn {
    width: 100%;
    min-height: 48px;
  }

  .v4-prelaunch-actions {
    flex-direction: column-reverse;
    align-items: stretch;
    width: 100%;
  }

  .v4-prelaunch-dismiss {
    top: 8px;
    transform: initial;
    right: 12px;
    width: 36px;
    height: 36px;
  }

  .v4-prelaunch-copy {
    padding-right: 44px;
  }

  .v4-plant-map-btn {
    width: 100%;
    min-width: 0;
  }

  .v4-sticky-nav {
    display: flex;
    bottom: 20px;
    min-width: 280px;
    padding: 4px;
    gap: 2px;
  }
}

.v4-nav-item {
  color: white; text-decoration: none; font-size: 13px; font-weight: 500; padding: 10px 18px; border-radius: 100px; transition: all 0.2s;
}

@media (max-width: 768px) {
  .v4-nav-item { font-size: 11px; padding: 8px 10px; }
}

.v4-nav-cta { background: var(--v4-primary); flex: 1; text-align: center; font-weight: 600; }

@media (max-width: 768px) {
  .v4-nav-cta { padding: 8px 12px; font-size: 12px; white-space: nowrap; }
}

@keyframes spinner { to { transform: rotate(360deg); } }
.loading-spinner { width: 32px; height: 32px; border: 3px solid rgba(0, 113, 227, 0.1); border-top-color: var(--v4-primary); border-radius: 50%; animation: spinner 1s linear infinite; }

/* Responsive tweaks and improvements */
@media (max-width: 768px) {
  .v4-hero {
    min-height: 580px;
    align-items: flex-end;
  }

  .v4-hero-content {
    flex-direction: column;
    align-items: stretch;
    gap: 20px;
    padding: 22px 0 32px;
  }

  .v4-hero-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .v4-hero-tag { margin-bottom: 12px; }
  .v4-hero-title { font-size: 34px; margin-bottom: 10px; }
  .v4-hero-desc { font-size: 15px; margin-bottom: 16px; max-width: 34ch; }

  .v4-hero-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    border-left: none;
    border-top: 1px solid rgba(255,255,255,0.15);
    padding-left: 0;
    padding-top: 14px;
    gap: 14px 12px;
    width: 100%;
    margin-bottom: 0;
  }

  .v4-stat-card {
    min-width: 0;
    align-items: center;
    text-align: center;
    width: 100%;
  }

  .v4-stat-card--price { grid-column: 1 / -1; }
  .v4-stat-label { font-size: 9px; }
  .v4-stat-value { font-size: 34px; }
  .v4-stat-meta { display: none; }

  .v4-hero-actions {
    flex-direction: column;
    width: 100%;
    gap: 10px;
    max-width: 340px;
  }

  .v4-hero-btn,
  .v4-btn-primary,
  .v4-btn-white {
    width: 100%;
    text-align: center;
    font-size: 16px;
    padding: 13px 16px;
  }
  
  .v4-trust-bar { padding: 8px 0; }
  .v4-trust-bar--with-prelaunch { top: 0; }
  .v4-trust-label { font-size: 10px; }
  .v4-trust-name { font-size: 14px; }
  .v4-trust-creci { font-size: 11px; }
  .v4-trust-btn { width: 100%; min-height: 44px; padding: 10px 12px; font-size: 11px; font-weight: 700; white-space: normal; border-radius: 10px; }
  .v4-trust-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; width: 100%; }
  .v4-trust-actions > *:only-child { grid-column: 1 / -1; }
  .v4-trust-inner { flex-direction: column; align-items: stretch; gap: 10px; }
  .v4-trust-person { gap: 8px; }
  .v4-trust-avatar { width: 36px; height: 36px; }
  .v4-avatar-placeholder { font-size: 14px; }
  .v4-conversion-form-wrapper { padding: 20px 4px; border-radius: 12px; }
}

/* Success Message Improvements */
.v4-form-success {
  text-align: center;
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  animation: v4-fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.v4-success-icon {
  width: 72px;
  height: 72px;
  background: #32d74b;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin-bottom: 24px;
  box-shadow: 0 12px 24px rgba(50, 215, 75, 0.25);
  position: relative;
}

.v4-success-icon::after {
  content: "";
  position: absolute;
  inset: -8px;
  border: 2px solid #32d74b;
  border-radius: 50%;
  opacity: 0.3;
  animation: v4-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.v4-form-success h3 {
  font-size: 28px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 12px;
  letter-spacing: -0.02em;
}

.v4-form-success p {
  font-size: 17px;
  line-height: 1.5;
  color: #86868b;
  max-width: 280px;
  margin: 0 auto;
}

@keyframes v4-fade-in {
  from { opacity: 0; transform: scale(0.95) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes v4-ping {
  75%, 100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

.v4-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  overflow-y: auto;
}

@media (min-width: 769px) {
  .v4-modal-overlay {
    align-items: center;
    padding: 24px;
  }
}

.v4-modal-content {
  background: white;
  border-radius: 32px 32px 0 0;
  width: 100%;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.3);
  max-height: 92dvh;
  overflow-y: auto;
}

@media (min-width: 769px) {
  .v4-modal-content {
    border-radius: 32px;
    max-width: 600px;
    max-height: 90dvh;
    box-shadow: 0 30px 60px rgba(0,0,0,0.4);
  }
}

.v4-modal-content .v4-modal-close {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0,0,0,0.05);
  border: none;
  font-size: 24px;
  cursor: pointer;
  z-index: 1;
}

/* Agendamento Section Styles */
.v4-schedule-row {
  display: flex;
  align-items: center;
  margin-top: 40px;
  justify-content: space-between;
  gap: 80px;
  padding: 60px 0;
}

@media (max-width: 992px) {
  .v4-schedule-row {
    flex-direction: column;
    text-align: center;
    gap: 32px;
    padding: 0;
  }
}

.v4-schedule-info {
  flex: 1;
}

.v4-schedule-card {
  flex: 1;
  width: 100%;
  max-width: 500px;
}

.v4-perks {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 48px;
  border-left: 2px solid #333;
  padding-left: 32px;
}

@media (max-width: 992px) {
  .v4-perks {
    border-left: none;
    padding-left: 0;
  }
}

.v4-perk-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.v4-perk-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.v4-perk-icon--red { background: #fee2e2; color: #dc2626; }
.v4-perk-icon--blue { background: #dbeafe; color: #2563eb; }

.v4-perk-content strong {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
}

.v4-perk-content p {
  font-size: 14px;
  color: #86868b;
  margin: 0;
}
</style>
