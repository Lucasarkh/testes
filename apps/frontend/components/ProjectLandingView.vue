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
        :has-plant="!!plantMap"
        :has-panorama="panoramas.length > 0" 
        :has-info="hasInfo"
        :has-lots="unifiedAvailableLots.length > 0"
        :has-gallery="!!project.projectMedias?.length"
        :has-location="!!project.googleMapsUrl || !!project.address"
        :has-scheduling="schedulingConfig?.enabled"
      />

      <!-- Hero section -->
      <section id="inicio" class="v4-hero" :class="{ 'has-banner': !!project.bannerImageUrl }">
        <div v-if="project.bannerImageUrl" class="v4-hero-bg" :style="{ backgroundImage: `url(${project.bannerImageUrl})` }"></div>
        <div class="v4-hero-overlay"></div>
        
        <div class="v4-container">
          <div class="v4-hero-content">
            <span class="v4-hero-tag">{{ project.tenant?.name || 'Vendas Iniciadas' }}</span>
            <h1 class="v4-hero-title text-balance">{{ project.name }}</h1>
            <p v-if="project.description" class="v4-hero-desc text-balance">{{ project.description }}</p>
            
            <div class="v4-hero-stats">
              <div class="v4-stat-card">
                <span class="v4-stat-label">Lotes Disponíveis</span>
                <span class="v4-stat-value">{{ availableLots }}</span>
              </div>
              <div v-if="minArea" class="v4-stat-card">
                <span class="v4-stat-label">Área a partir de</span>
                <span class="v4-stat-value">{{ minArea }}m²</span>
              </div>
              <div v-if="priceRange" class="v4-stat-card">
                <span class="v4-stat-label">Preços a partir de</span>
                <span class="v4-stat-value">R$ {{ priceRange }}</span>
                <div v-if="project.maxInstallments || project.paymentConditionsSummary" class="v4-stat-meta">
                  <span v-if="project.maxInstallments" class="v4-stat-installments">em até {{ project.maxInstallments }}x</span>
                  <p v-if="project.paymentConditionsSummary" class="v4-stat-summary">{{ project.paymentConditionsSummary }}</p>
                </div>
              </div>
            </div>

            <div class="v4-hero-actions">
              <a href="#planta" class="v4-btn-primary" @click="tracking.trackClick('Botão: Ver Planta Interativa')">Ver Planta Interativa</a>
              <a v-if="schedulingConfig?.enabled" href="#agendamento" class="v4-btn-white" @click="tracking.trackClick('Botão: Agendar Visita')">Agendar Visita</a>
              <a href="#contato" class="v4-btn-white" @click="tracking.trackClick('Botão: Solicitar Informações')">Solicitar informações</a>
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

      <!-- Highlights & Info -->
      <section v-if="hasInfo" class="v4-section" id="info">
        <div class="v4-container">
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

      <!-- Planta Interativa -->
      <section v-if="plantMap" class="v4-section v4-section-alt" id="planta">
        <div class="v4-container">
          <div class="v4-section-header center">
            <h2 class="v4-section-title">Planta Interativa</h2>
            <p class="v4-section-subtitle">Explore a implantação do loteamento. Clique nos pontos para mais informações.</p>
          </div>
          <ClientOnly>
            <div style="height: 540px; border-radius: 16px; overflow: hidden; box-shadow: var(--v4-shadow-elevated);">
              <PlantMapViewer
                :plant-map="plantMap"
                :show-controls="true"
                :show-legend="true"
              />
            </div>
            <template #fallback>
              <div style="height: 540px; border-radius:16px; background:#1a1a2e; display:flex; align-items:center; justify-content:center; color:#64748b;">
                <div class="loading-spinner"></div>
              </div>
            </template>
          </ClientOnly>
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
              style="height: 540px; border-radius: 16px; overflow: hidden; box-shadow: var(--v4-shadow-elevated); margin-bottom: 24px;"
            >
              <PanoramaViewer :panorama="pano" />
            </div>
            <template #fallback>
              <div style="height: 540px; border-radius:16px; background:#111; display:flex; align-items:center; justify-content:center; color:#64748b;">
                <div class="loading-spinner"></div>
              </div>
            </template>
          </ClientOnly>
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
      <section v-if="unifiedAvailableLots.length" class="v4-section v4-section-alt" id="lotes">
        <div class="v4-container">
          <div class="v4-section-header">
            <h2 class="v4-section-title">Lotes Disponíveis</h2>
            <p class="v4-section-subtitle">Selecione uma opção abaixo para ver metragens e condições.</p>
          </div>

          <div class="v4-lots-grid">
            <NuxtLink 
              v-for="lot in unifiedAvailableLots.slice(0, 6)" 
              :key="lot.id" 
              :to="lotPageUrl(lot)" 
              class="v4-lot-card"
              @click="tracking.trackLotClick(lot.code || lot.name || lot.id, lot.id)"
            >
              <div class="v4-lot-card-header">
                <div class="v4-lot-id">
                  <span class="v4-lot-label">
                    <span v-if="lot.lotDetails?.block || lot.lotDetails?.lotNumber">
                      QUADRA {{ lot.lotDetails.block || '---' }} · LOTE {{ lot.lotDetails.lotNumber || '---' }}
                    </span>
                    <span v-else>LOTE</span>
                  </span>
                  <span class="v4-lot-code">{{ lot.code || lot.name || lot.id }}</span>
                </div>
                <div class="v4-lot-status">Disponível</div>
              </div>
              
              <div class="v4-lot-card-body">
                <div class="v4-lot-info-row">
                  <span class="v4-info-item">📐 {{ lot.lotDetails?.areaM2 || '---' }} m²</span>
                  <span v-if="lot.lotDetails?.pricePerM2" class="v4-info-item">💰 R$ {{ lot.lotDetails.pricePerM2.toLocaleString('pt-BR') }} / m²</span>
                  <span v-else-if="lot.lotDetails?.frontage" class="v4-info-item">↔ {{ lot.lotDetails.frontage }}m frente</span>
                </div>
                <div v-if="lot.lotDetails?.price" class="v4-lot-price">
                  <span class="v4-price-label">Valor do investimento</span>
                  <span class="v4-price-value">R$ {{ lot.lotDetails.price.toLocaleString('pt-BR') }}</span>
                </div>
              </div>
              
              <div class="v4-lot-card-footer">
                <span>Ver detalhes do lote</span>
                <span class="v4-icon">→</span>
              </div>
            </NuxtLink>
          </div>

          <div v-if="unifiedAvailableLots.length > 6" style="margin-top: 56px; display: flex; justify-content: center;">
            <NuxtLink :to="unitsUrl" class="v4-btn-primary" style="min-width: 280px; text-decoration: none; text-align: center;" @click="tracking.trackClick('Botão: Ver todas unidades')">
              Ver todos os {{ unifiedAvailableLots.length }} lotes disponíveis
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
              <img v-if="m.type === 'PHOTO'" :src="m.url" :alt="m.caption || 'Foto'" referrerpolicy="no-referrer" />
              <video v-else :src="m.url" referrerpolicy="no-referrer" />
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
                <div style="font-size: 40px; margin-bottom: 24px;">📅</div>
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
      <div v-if="showSchedulingModal" class="v4-modal-overlay" @click.self="showSchedulingModal = false">
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
                
                <div v-if="lotElements.length" class="v4-lot-badge-minimal">
                  <span class="v4-sparkle">✨</span> <strong>{{ availableLots }}</strong> lotes disponíveis no momento
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
                      <input v-model="leadForm.phone" v-maska="'(##) #####-####'" required placeholder="(00) 00000-0000" />
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

      <!-- Footer -->
      <footer class="v4-footer">
        <div class="v4-container">
          <div class="v4-footer-inner">
            <div class="v4-footer-brand">
              <span class="v4-footer-tenant">{{ project.tenant?.name }}</span>
              <span class="v4-footer-project">Loteamento {{ project.name }}</span>
            </div>
            <div class="v4-footer-copyright">
              © {{ getYearInBrasilia() }} — Todos os direitos reservados.
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
        <a v-if="plantMap" href="#planta" class="v4-nav-item">Planta</a>
        <a v-if="panoramas.length" href="#panorama" class="v4-nav-item">Panorama</a>
        <a v-if="unifiedAvailableLots.length" href="#lotes" class="v4-nav-item">Unidades</a>
        <a href="#contato" class="v4-nav-item v4-nav-cta">TENHO INTERESSE</a>
      </nav>
      <!-- Floating Search CTA -->
      <div v-if="allAvailableTags.length > 0" class="v4-floating-cta">
        <button class="v4-cta-btn-animated" @click="() => { tracking.trackClick('CTA: Busca de Lotes Animado'); toggleFilterModal(); }">
          <div class="v4-cta-inner">
            <span class="v4-cta-icon-spark">✨</span>
            <span class="v4-cta-label">Busque o lote ideal com base nas suas preferências</span>
            <span class="v4-cta-arrow-icon">→</span>
          </div>
          <div class="v4-cta-glow"></div>
        </button>
      </div>

      <!-- Filter Selection Modal -->
      <Transition name="fade">
        <div v-if="isFilterModalOpen" class="v4-filter-modal-overlay" @click.self="toggleFilterModal">
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
  const host = process.client ? window.location.host : ''
  const isMainDomain = host.includes('lotio.com.br') || host.includes('localhost:3000')
  return isMainDomain ? `/${projectSlug.value}` : ''
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
}

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

const hasMeaningfulLocationText = computed(() => {
  const text = project.value?.locationText || ''
  if (!text) return false
  return text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim().length > 0
})

const hasInfo = computed(() => {
  return !!(infrastructureCategories.value.length > 0 || hasMeaningfulLocationText.value)
})

const hasTraditionalInfo = computed(() => {
  return traditionalHighlights.value.length > 0
})

const lotElements = computed(() => (project.value?.mapElements || []).filter((e: any) => e.type === 'LOT'))
const availableLotElements = computed(() => lotElements.value.filter((e: any) => (e.lotDetails?.status || 'AVAILABLE') === 'AVAILABLE'))

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
    list = availableLotElements.value.map((e: any) => ({
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

const formattedLocationText = computed(() => {
  const text = project.value?.locationText || ''
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

const totalLots = computed(() => {
  if (hasMapData.value) return mapDataLots.value.length
  return lotElements.value.length
})
const availableLots = computed(() => {
  if (hasMapData.value) return mapDataLots.value.filter((l: any) => l.status === 'available').length
  return availableLotElements.value.length
})
const reservedLots = computed(() => {
  if (hasMapData.value) return mapDataLots.value.filter((l: any) => l.status === 'reserved').length
  return lotElements.value.filter((e: any) => e.lotDetails?.status === 'RESERVED').length
})
const soldLots = computed(() => {
  if (hasMapData.value) return mapDataLots.value.filter((l: any) => l.status === 'sold').length
  return lotElements.value.filter((e: any) => e.lotDetails?.status === 'SOLD').length
})

const minArea = computed(() => {
  if (project.value?.startingArea) return project.value.startingArea
  
  const areas = unifiedAvailableLots.value
    .map((l: any) => l.lotDetails?.areaM2)
    .filter((a: number | null): a is number => a !== null && a > 0)
  
  if (!areas.length) return null
  return Math.min(...areas)
})

const priceRange = computed(() => {
  if (project.value?.startingPrice) {
    return project.value.startingPrice.toLocaleString('pt-BR')
  }

  let prices: number[] = []
  if (hasMapData.value) {
    prices = mapDataLots.value
      .filter((l: any) => l.status === 'available' && l.price)
      .map((l: any) => Number(l.price))
  } else {
    prices = availableLotElements.value
      .map((e: any) => Number(e.lotDetails?.price))
      .filter(Boolean)
  }
  if (!prices.length) return null
  const min = Math.min(...prices)
  return min.toLocaleString('pt-BR')
})

const lotPageUrl = (lot: any) => {
  const code = lot.code || lot.name || lot.id
  const base = pathPrefix.value === '' 
    ? `/${encodeURIComponent(code)}` 
    : `${pathPrefix.value}/${encodeURIComponent(code)}`

  return corretorCode ? `${base}${base.includes('?') ? '&' : '?'}c=${corretorCode}` : base
}

onMounted(async () => {
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
      // Fetch plant map for this project (non-blocking)
      getPublicPlantMap(p.value.id, isPreview.value).then((pm) => {
        if (pm && pm.hotspots) {
          pm.hotspots = pm.hotspots.map(h => {
            if (h.linkType === 'LOTE_PAGE' && h.linkId) {
              const lotModel = (unifiedAvailableLots.value as any[]).find(l => l.id === h.linkId);
              if (lotModel) {
                 (h as any).code = lotModel.code || lotModel.name;
              }
            }
            return h;
          })
        }
        plantMap.value = pm
      }).catch(() => {})
      // Fetch panoramas for this project (non-blocking)
      getPublicPanoramas(p.value.id, isPreview.value).then((panos) => {
        panoramas.value = panos ?? []
      }).catch(() => {})
    }
    else error.value = (p.reason as any)?.message || 'Projeto não encontrado'
    if (c.status === 'fulfilled' && c.value) corretor.value = c.value
  } catch (e: any) {
    error.value = e.message || 'Projeto não encontrado'
  }
  loading.value = false
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

/* Floating Search CTA */
.v4-floating-cta {
  position: fixed;
  bottom: 40px;
  right: 24px;
  z-index: 1000;
  max-width: calc(100vw - 48px);
}

@media (max-width: 768px) {
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
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.v4-filter-modal-card {
  background: white;
  width: 100%;
  max-width: 500px;
  border-radius: 28px;
  padding: 40px;
  box-shadow: 0 30px 60px rgba(0,0,0,0.15);
  animation: modal-appear 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
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
}
.v4-modal-close:hover { background: #e8e8ed; color: #1d1d1f; }

.v4-modal-body { margin-bottom: 32px; }
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
  min-height: 85vh; /* Premium height */
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 0;
}

.v4-hero-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  z-index: 1;
  opacity: 1;
  transition: all 0.5s ease;
}

.v4-hero.has-banner .v4-hero-bg {
  filter: brightness(0.85); /* Maintain clarity, just tone down highlights */
  transform: none;
}

.v4-hero-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.2);
  z-index: 2;
}

.v4-hero.has-banner .v4-hero-overlay {
  /* Subtle vignette that doesn't hide info, but grounds the text */
  background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.6) 100%);
}

.v4-hero-content {
  position: relative;
  z-index: 3;
  padding: 40px 24px;
  max-width: 900px;
  margin: 0 auto;
  /* Glassmorphic content plate for extreme legibility over busy images without blurring the BG */
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 32px;
}

.v4-hero-tag {
  display: inline-block;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 24px;
  background: var(--v4-primary); /* Use primary color to pop against image */
  padding: 6px 16px;
  border-radius: 100px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
}

.v4-hero-title {
  font-size: clamp(38px, 8vw, 72px); /* Slightly more balanced */
  font-weight: 700;
  text-wrap: pretty;
  line-height: 1;
  margin-bottom: 48px;
  color: #ffffff;
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
  text-transform: uppercase;
}

.v4-hero-desc {
  font-size: clamp(17px, 3vw, 20px);
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 32px;
  max-width: 640px;
  margin-inline: auto;
  line-height: 1.5;
}

/* Hero Stats Card */
.v4-hero-stats {
  display: flex;
  justify-content: center;
  gap: 56px;
  margin: 0 auto 48px;
  flex-wrap: wrap;
  padding: 0;
  background: transparent;
  border: none;
}

.v4-stat-card {
  text-align: center;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.v4-stat-label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
  font-weight: 700;
}

.v4-stat-value {
  font-size: 52px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
  letter-spacing: -0.02em;
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
  justify-content: center;
  gap: 16px;
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
  color: var(--v4-text-muted);
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
  .v4-lot-card-header { margin-bottom: 12px; }
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
    position: absolute;
    top: 12px;
    right: 12px;
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

/* Footer */
.v4-footer { padding: 80px 0; border-top: 1px solid var(--v4-border); background: var(--v4-bg-alt); }
.v4-footer-tenant { font-weight: 600; font-size: 17px; margin-bottom: 4px; display: block; }
.v4-footer-copyright { font-size: 12px; color: var(--v4-text-muted); }

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
  .v4-hero { min-height: 480px; padding: 40px 0; }
  .v4-hero-content { 
    padding: 32px 16px; 
    text-align: center; 
    border-radius: 20px; 
    margin: 0 12px;
  }
  .v4-hero-title { font-size: 32px; margin-bottom: 24px; }
  
  .v4-hero-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 24px;
    padding: 0 4px;
  }
  .v4-stat-card { min-width: 0; gap: 4px; }
  .v4-stat-label { font-size: 9px; margin-bottom: 2px; -webkit-line-clamp: 1; display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; }
  .v4-stat-value { font-size: 24px; }
  .v4-stat-meta { display: none; }
  
  .v4-hero-actions { flex-direction: column; width: 100%; gap: 12px; }
  .v4-btn-primary, .v4-btn-white { width: 100%; text-align: center; font-size: 16px; padding: 14px; }
  
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
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.v4-modal-content {
  background: white;
  border-radius: 32px;
  width: 100%;
  box-shadow: 0 30px 60px rgba(0,0,0,0.4);
}

.v4-modal-close {
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
