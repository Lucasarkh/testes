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
        :has-plant="!!project?.plantMap"
        :has-panorama="panoramas.length > 0"
        :has-info="hasInfo"
        :has-lots="(project?.lotSummary?.available ?? 0) > 0"
        :has-gallery="!!project.projectMedias?.length"
        :has-location="!!project.googleMapsUrl || !!project.address"
        :has-nearby="hasNearbyData"
        :has-scheduling="schedulingConfig?.enabled"
      />

      <!-- Hero section -->
      <section id="inicio" class="v4-hero" :class="{ 'has-banner': hasHeroBanner }">
        <div v-if="hasHeroBanner" class="v4-hero-bg" :style="heroBackgroundStyle"></div>
        <div class="v4-hero-overlay"></div>

        <div class="v4-container">
          <div class="v4-hero-content">
            <div class="v4-hero-text">
              <span class="v4-hero-tag">{{ project.tenant?.name || 'Vendas Iniciadas' }}</span>
              <h1 class="v4-hero-title text-balance">{{ project.name }}</h1>
              <p v-if="project.description" class="v4-hero-desc text-balance">{{ project.description }}</p>
              <div class="v4-hero-actions">
                <a href="#planta" class="v4-btn-primary v4-hero-btn" @click="tracking.trackClick('Botão: Ver Planta Interativa')">Ver Planta Interativa</a>
                <a v-if="schedulingConfig?.enabled" href="#agendamento" class="v4-btn-white v4-hero-btn" @click="tracking.trackClick('Botão: Agendar Visita')">Agendar Visita</a>
                <a href="#contato" class="v4-btn-white v4-hero-btn" @click="tracking.trackClick('Botão: Solicitar Informações')">Solicitar informações</a>
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

      <!-- Trust bar -->
      <div v-if="corretor" class="v4-trust-bar">
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

      <Transition name="v4-sales-motion-fade">
        <div v-if="currentSalesNotice" class="v4-sales-motion-toast" aria-live="polite" aria-atomic="true">
          <span class="v4-sales-motion-dot"></span>
          <span>{{ currentSalesNotice }}</span>
        </div>
      </Transition>

      <!-- Highlights & Info -->
      <section v-if="hasInfo" class="v4-section" id="info">
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
      <section v-if="project?.plantMap" class="v4-section v4-section-alt" id="planta">
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
      <section v-if="panoramas.length" class="v4-section" id="panorama">
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
      <section v-if="project.youtubeVideoUrl" class="v4-section v4-section-alt" id="video-apresentacao">
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
      <section v-if="hasTraditionalInfo" class="v4-section" id="info">
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

      <!-- Available Lots Grid -->
      <section v-if="(project?.lotSummary?.available ?? 0) > 0" class="v4-section v4-section-alt" id="lotes">
        <div class="v4-container">
          <div class="v4-section-header">
            <h2 class="v4-section-title">Lotes Disponíveis</h2>
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
      <section v-if="project.constructionStatus && project.constructionStatus.length" class="v4-section" id="obras">
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
      <section v-if="project.projectMedias?.length" class="v4-section v4-section-alt" id="galeria">
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
          </div>

          <div v-if="project.projectMedias.length > 9" style="margin-top: 56px; display: flex; justify-content: center;">
            <NuxtLink :to="galleryUrl" class="v4-btn-primary" style="min-width: 280px; text-decoration: none; text-align: center;" @click="tracking.trackClick('Botão: Abrir Galeria Completa')">
              Ver todos os {{ project.projectMedias.length }} arquivos de mídia
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- Endereço e Mapa -->
      <section v-if="project.googleMapsUrl || project.address" class="v4-section" id="localizacao">
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
      <LandingNearbyPlaces v-if="projectSlug" :project-slug="projectSlug" @update:visible="hasNearbyData = $event" />

      <!-- Agendamento Section -->
      <section v-if="project && schedulingConfig?.enabled" class="v4-section" id="agendamento" style="background: #1d1d1f; color: white;">
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
      <section class="v4-section" id="contato" style="background: #fbfbfd; padding: 120px 0;">
        <div class="v4-container">
          <div class="v4-conversion-card-new">
            <div class="v4-conversion-content">
              <div class="v4-conversion-header-new">
                <div class="v4-badge-clean">
                  <span class="v4-pulse-blue"></span>
                  Oportunidade única
                </div>
                <h2 class="v4-title-display">Garanta sua unidade agora</h2>
                <p class="v4-subtitle-clean">Restam poucas unidades disponíveis. Preencha o formulário e nossa equipe entrará em contato para tirar suas dúvidas.</p>
                
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
      <section v-if="project.legalNotice" class="v4-legal-notice">
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

      <!-- Lightbox -->
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

const loading = ref(true)
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

const salesMotionConfig = computed(() => {
  const root = project.value?.salesMotionConfig || {}
  const cfg = root?.enterprise && typeof root.enterprise === 'object' ? root.enterprise : root
  const rawTemplates = cfg?.templates

  const defaultTemplates = [
    { id: 'viewsToday', text: '{{viewsToday}} pessoas visualizaram este empreendimento hoje', enabled: true },
    { id: 'recentReservation', text: 'Unidade {{recentLot}} foi reservada recentemente', enabled: true },
    { id: 'visits24h', text: '{{visits24h}} pessoas visitaram este empreendimento nas últimas 24h', enabled: true },
    { id: 'visitorsNow', text: '{{visitsNow}} pessoas estão navegando na seção de {{sectionLabel}} agora', enabled: true },
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
          }
        })
        .filter((tpl: any) => tpl && tpl.text.trim().length > 0)
    : rawTemplates && typeof rawTemplates === 'object'
      ? Object.entries(rawTemplates)
          .map(([key, value]) => ({ id: String(key), text: String(value || ''), enabled: true }))
          .filter((tpl) => tpl.text.trim().length > 0)
      : defaultTemplates

  return {
    enabled: !!cfg.enabled,
    intervalSeconds: Math.max(5, Number(cfg.intervalSeconds ?? 14)),
    displaySeconds: Math.max(3, Number(cfg.displaySeconds ?? 6)),
    maxNotices: Math.max(1, Number(cfg.maxNotices ?? 5)),
    templates,
  }
})

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
  const views = nextSmoothInt(baseData.viewsToday, salesMotionLastViews, 3, 40)
  const visits = nextSmoothInt(baseData.visits24h, salesMotionLastVisits, 12, 260)
  const nowUsers = nextSmoothInt(Math.max(2, Math.round(baseData.viewsToday * 0.6)), salesMotionLastViews, 2, 22, 0.12)
  const lot = lotPool.length > 0
    ? lotPool[Math.floor(Math.random() * lotPool.length)]
    : baseData.recentLot

  const fillTemplate = (tpl: string) => tpl
    .replace(/{{\s*viewsToday\s*}}/g, String(views))
    .replace(/{{\s*recentLot\s*}}/g, String(lot))
    .replace(/{{\s*visits24h\s*}}/g, String(visits))
    .replace(/{{\s*visitsNow\s*}}/g, String(nowUsers))
    .replace(/{{\s*sectionLabel\s*}}/g, String(salesMotionSectionLabelByProgress(progress)))

  const options = (config.templates || [])
    .filter((tpl: any) => tpl?.enabled !== false)
    .map((tpl: any) => fillTemplate(String(tpl?.text || '')))
    .filter(Boolean)

  if (reason === 'scroll') {
    const contextual = (config.templates || [])
      .filter((tpl: any) => tpl?.enabled !== false)
      .map((tpl: any) => String(tpl?.text || ''))
      .filter((text: string) => text.includes('{{sectionLabel}}') || text.includes('{{visitsNow}}'))
      .map((text: string) => fillTemplate(text))
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
  }))),
)

const showNextSalesNotice = (reason: 'initial' | 'scroll', progress = 0) => {
  if (!process.client) return
  const config = salesMotionConfig.value
  const minGapMs = Math.max(2000, config.intervalSeconds * 1000)
  if (!config.enabled) return
  if (salesMotionShownCount.value >= config.maxNotices) {
    clearSalesMotionTimers()
    currentSalesNotice.value = ''
    return
  }

  const now = Date.now()
  if (currentSalesNotice.value) return
  if (now - salesMotionLastShownAt.value < minGapMs) return

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
  salesMotionLastViews.value = 0
  salesMotionLastVisits.value = 0

  const config = salesMotionConfig.value
  if (!config.enabled) return

  salesMotionInitialTimerId.value = window.setTimeout(() => {
    showNextSalesNotice('initial', 0)
  }, 1800)
}

const handleSalesMotionNavigation = () => {
  if (!process.client) return
  if (!salesMotionConfig.value.enabled) return
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
  startSalesMotion()
})

watch(
  () => [
    salesMotionConfig.value.enabled,
    salesMotionConfig.value.intervalSeconds,
    salesMotionConfig.value.displaySeconds,
    salesMotionConfig.value.maxNotices,
    salesMotionTemplatesSignature.value,
  ],
  () => {
    startSalesMotion()
  },
)

onUnmounted(() => {
  clearSalesMotionTimers()
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
  padding: 100px 0; /* Consistent desk padding */
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
  max-width: 800px;
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
    width: min(92vw, 420px);
    bottom: 164px;
    max-width: none;
    font-size: 0.8rem;
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
  padding: 0;
}

@media (min-width: 769px) {
  .v4-filter-modal-overlay {
    align-items: center;
    padding: 24px;
  }
}

.v4-filter-modal-card {
  background: white;
  width: 100%;
  max-width: 500px;
  border-radius: 28px 28px 0 0;
  padding: 32px 24px 40px;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.12);
  max-height: 85dvh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
  animation: modal-slide-up 0.35s cubic-bezier(0.165, 0.84, 0.44, 1);
}

@media (min-width: 769px) {
  .v4-filter-modal-card {
    border-radius: 28px;
    padding: 40px;
    max-height: 90dvh;
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

.v4-modal-body { flex: 1; overflow-y: auto; margin-bottom: 24px; }
.v4-modal-label { font-size: 13px; font-weight: 700; color: #86868b; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 16px; }

.v4-modal-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
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

.v4-trust-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.v4-trust-person {
  display: flex;
  align-items: center;
  gap: 16px;
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

.v4-trust-actions {
  display: flex;
  gap: 8px;
}

.v4-trust-btn {
  padding: 10px 20px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
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
  text-align: left;
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
  .v4-lot-card {
    padding: 16px;
    border-radius: 16px;
    gap: 8px;
  }
}

.v4-lot-card:hover { 
  box-shadow: var(--v4-shadow-elevated);
  transform: translateY(-4px);
  border-color: var(--v4-primary);
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
  letter-spacing: 0.1em;
}

@media (max-width: 768px) {
  .v4-lot-label { font-size: 9px; }
}

.v4-lot-code { 
  font-size: 26px; 
  font-weight: 700; 
  letter-spacing: -0.02em; 
  color: var(--v4-text); 
}

@media (max-width: 768px) {
  .v4-lot-code { font-size: 18px; line-height: 1.2; }
}

.v4-lot-status { 
  font-size: 11px; 
  font-weight: 700; 
  color: #32d74b;
  background: rgba(50, 215, 75, 0.1);
  padding: 6px 14px;
  border-radius: 100px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@media (max-width: 768px) {
  .v4-lot-status { 
    font-size: 8px;
    padding: 4px 8px;
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
.v4-footer { padding: 60px 0; border-top: 1px solid var(--v4-border); background: var(--v4-bg-alt); }
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

/* Lightbox V4 */
.v4-lightbox { position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,0.95); display: flex; align-items: center; justify-content: center; }
.v4-lightbox-btn { position: absolute; background: none; border: none; color: white; font-size: 40px; cursor: pointer; padding: 20px; opacity: 0.5; transition: 0.2s; }
.v4-lightbox-btn:hover { opacity: 1; }
.v4-prev { left: 20px; }
.v4-next { right: 20px; }
.v4-lightbox-close { position: absolute; top: 20px; right: 20px; background: none; border: none; color: white; font-size: 32px; cursor: pointer; z-index: 2100; }
.v4-lightbox-content { max-width: 90%; max-height: 80%; }
.v4-lightbox-content img, .v4-lightbox-content video { max-width: 100%; max-height: 100%; border-radius: 12px; }

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
  .v4-trust-label { font-size: 10px; }
  .v4-trust-name { font-size: 14px; }
  .v4-trust-btn { padding: 8px 12px; font-size: 11px; font-weight: 700; white-space: nowrap; border-radius: 8px; }
  .v4-trust-actions { gap: 4px; }
  .v4-trust-inner { gap: 12px; }
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
