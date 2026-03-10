<template>
  <div class="pub-page">
    <!-- Loading -->
    <div v-if="loading" class="pub-loading">
      <div class="loading-spinner"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="pub-error">
      <div class="pub-error-card card">
        <h2>Lote não encontrado</h2>
        <p>{{ error }}</p>
        <NuxtLink :to="projectUrl" class="btn btn-primary" style="margin-top: 16px;">
          ← Ver Loteamento
        </NuxtLink>
      </div>
    </div>

    <!-- Lot page -->
    <template v-else-if="lot">
      <header class="lot-header-v4">
        <div class="header-inner">
          <NuxtLink :to="projectUrl" class="back-link-v4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span>Voltar ao Masterplan</span>
          </NuxtLink>
          <div class="project-tags">
            <span class="tag-tenant">{{ project?.tenant?.name }}</span>
            <span class="tag-pname">{{ project?.name }}</span>
          </div>
        </div>
      </header>

      <Transition name="v4-sales-motion-fade">
        <div v-if="currentSalesNotice" class="v4-sales-motion-toast" aria-live="polite" aria-atomic="true">
          <span class="v4-sales-motion-dot"></span>
          <span>{{ currentSalesNotice }}</span>
        </div>
      </Transition>

      <div class="layout-v4-main">
        <!-- Persistent Side Navigation Guide -->
        <aside class="side-navigation-guide">
          <div class="nav-stack">
            <a href="#hero" class="nav-dot" :class="{ 'is-active': activeSection === 'hero' }" title="Início">
              <span class="dot"></span>
              <span class="label">Início</span>
            </a>
            <a v-if="galleryMedias.length" href="#galeria" class="nav-dot" :class="{ 'is-active': activeSection === 'galeria' }" title="Galeria">
              <span class="dot"></span>
              <span class="label">Galeria</span>
            </a>
            <a v-if="lotPlantMap" href="#localizacao" class="nav-dot" :class="{ 'is-active': activeSection === 'localizacao' }" title="Localização">
              <span class="dot"></span>
              <span class="label">Planta</span>
            </a>
            <a v-if="lotPanorama" href="#vista-360" class="nav-dot" :class="{ 'is-active': activeSection === 'vista-360' }" title="Vista 360°">
              <span class="dot"></span>
              <span class="label">360°</span>
            </a>
            <a v-if="details?.areaM2 || details?.frontage || details?.depth || details?.sideLeft || details?.sideRight || details?.slope || details?.notes" href="#ficha" class="nav-dot" :class="{ 'is-active': activeSection === 'ficha' }" title="Ficha Técnica">
              <span class="dot"></span>
              <span class="label">Ficha</span>
            </a>
            <a v-if="details?.paymentConditions" href="#financiamento" class="nav-dot" :class="{ 'is-active': activeSection === 'financiamento' }" title="Financiamento">
              <span class="dot"></span>
              <span class="label">Tabela</span>
            </a>
            <a v-if="project?.showPaymentConditions" href="#simulador" class="nav-dot" :class="{ 'is-active': activeSection === 'simulador' }" title="Simulador">
              <span class="dot"></span>
              <span class="label">Simular</span>
            </a>
          </div>
        </aside>

        <div class="main-content-flow-v4">
          <div class="page-container-v4 split-view">
            <!-- Main Content Area -->
            <main class="content-col">
              <!-- Hero / Title -->
              <section id="hero" class="hero-v4">
                <div class="hero-header-row">
                  <div class="hero-main-info">
                    <h1 class="lot-code-title">
                      <span v-if="details?.block" style="color: var(--v4-text-muted); font-weight: 500; margin-right: 8px;">{{ details.block }}</span>
                      <span>{{ details?.lotNumber || lot?.name || lot?.code }}</span>
                    </h1>
                    
                    <div v-if="details?.tags?.length" class="lot-seals-v4">
                      <span v-for="tag in details?.tags" :key="tag" class="seal-pill">
                        {{ tag }}
                      </span>
                    </div>
                  </div>

                  <div v-if="(details?.price || details?.paymentConditions?.price)" class="hero-price-box">
                    <div class="hp-status-tag" :class="details?.status">
                      {{ statusLabel }}
                    </div>
                    <span class="hp-label">Investimento</span>
                    <span class="hp-value">{{ formatCurrencyToBrasilia(details?.price || details?.paymentConditions?.price) }}</span>
                  </div>
                </div>

                <div class="quick-metrics-v4">
                  <div class="q-item" v-if="details?.block || details?.lotNumber || details?.paymentConditions?.setor">
                    <span class="q-val">{{ details?.block ? `${details.block} ${details.lotNumber || ''}` : details?.paymentConditions?.setor }}</span>
                    <span class="q-unit">Quadra / Lote</span>
                  </div>
                  <div class="q-item" v-if="details?.areaM2">
                    <span class="q-val">{{ details?.areaM2 }}</span>
                    <span class="q-unit">m² totais</span>
                  </div>
                  <div class="q-item" v-if="details?.pricePerM2">
                    <span class="q-val">{{ formatCurrencyToBrasilia(details?.pricePerM2) }}</span>
                    <span class="q-unit">valor do m²</span>
                  </div>
                  <div class="q-item" v-if="details?.slope">
                    <span class="q-val">{{ slopeLabel(details?.slope) }}</span>
                    <span class="q-unit">topografia</span>
                  </div>
                </div>
              </section>

            <!-- Gallery -->
            <section v-if="galleryMedias.length" id="galeria" class="section-v4">
              <div class="section-title-v4">
                <h2>Galeria de Imagens</h2>
                <div class="title-line"></div>
              </div>
              
              <div class="gallery-v4">
                <div v-for="(m, i) in galleryMedias" :key="i" 
                  class="gallery-tile" 
                  :class="{ 'main': i === 0 }"
                  @click="() => { openLightbox(Number(i)); tracking.trackClick('Galeria: Abrir Foto', 'GALLERY'); }">
                  <img
                    v-if="m.type === 'PHOTO'"
                    :src="m.url"
                    :loading="Number(i) < 4 ? 'eager' : 'lazy'"
                    :fetchpriority="Number(i) < 2 ? 'high' : 'auto'"
                    decoding="async"
                  />
                  <div v-else class="video-preview-v4">
                    <video :src="m.url" preload="metadata"></video>
                    <div class="play-btn">▶</div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Location Map -->
            <section v-if="lotPlantMap" id="localizacao" class="section-v4">
              <div class="section-title-v4">
                <h2>Localização no Loteamento</h2>
                <div class="title-line"></div>
              </div>
              <div class="lot-plant-map-frame">
                <ClientOnly>
                  <PlantMapViewer
                    :plant-map="lotPlantMap"
                    :show-controls="true"
                    :show-legend="false"
                    :interactive="isPlantMapInteractive"
                    :focus-lot-code="lot?.code"
                  />
                  <template #fallback>
                    <div class="loading-state-pm">Carregando planta...</div>
                  </template>
                </ClientOnly>
                <div v-if="showPlantMapTouchCta" class="interaction-gate-v4">
                  <button type="button" class="interaction-gate-v4__btn" @click.stop.prevent="enablePlantMapInteraction">
                    Ver mapa interativo
                  </button>
                  <p class="interaction-gate-v4__hint">Ative para arrastar e dar zoom. Desative para voltar a rolar a pagina.</p>
                </div>
              </div>
              <button
                v-if="showPlantMapDisableButton"
                class="interaction-toggle-v4"
                @click="disablePlantMapInteraction"
              >
                Desativar interacao do mapa
              </button>
              <p style="margin-top: 16px; color: var(--v4-text-muted); font-size: 14px; text-align: center;">
                Localização exata do lote dentro do empreendimento.
              </p>
            </section>

            <!-- 360 View -->
            <section v-if="lotPanorama" id="vista-360" class="section-v4">
              <div class="section-title-v4">
                <h2>Vista 360° do Lote</h2>
                <div class="title-line"></div>
              </div>
              <div class="panorama-container-v4" 
                   :class="{ 'is-interaction-disabled': !isPanoramaInteractive }"
                   @click="tracking.trackClick('Panorama: Interação 360', 'VIEW_360')">
                <PanoramaViewer :panorama="lotPanorama" />
                <div v-if="showPanoramaTouchCta" class="interaction-gate-v4">
                  <button type="button" class="interaction-gate-v4__btn" @click.stop.prevent="enablePanoramaInteraction">
                    Ver 360 interativo
                  </button>
                  <p class="interaction-gate-v4__hint">Ative para girar a vista 360. Desative para continuar rolando a pagina.</p>
                </div>
              </div>
              <button
                v-if="showPanoramaDisableButton"
                class="interaction-toggle-v4"
                @click="disablePanoramaInteraction"
              >
                Desativar interacao do 360
              </button>
            </section>

            <!-- Specification -->
            <section v-if="details?.areaM2 || details?.frontage || details?.depth || details?.sideLeft || details?.sideRight || details?.slope || details?.notes" id="ficha" class="section-v4">
              <div class="section-title-v4">
                <h2>Ficha Técnica Detalhada</h2>
                <div class="title-line"></div>
              </div>
              
              <div class="specs-grid-v4">
                <div class="spec-entry" v-if="details?.block">
                  <span class="s-label">Quadra</span>
                  <span class="s-value">{{ details?.block }}</span>
                </div>
                <div class="spec-entry" v-if="details?.lotNumber">
                  <span class="s-label">Lote nº</span>
                  <span class="s-value">{{ details?.lotNumber }}</span>
                </div>
                <div class="spec-entry" v-if="details?.areaM2">
                  <span class="s-label">Área Escriturada</span>
                  <span class="s-value">{{ details?.areaM2 }} m²</span>
                </div>
                <div class="spec-entry" v-if="details?.pricePerM2">
                  <span class="s-label">Valor do m²</span>
                  <span class="s-value">{{ formatCurrencyToBrasilia(details?.pricePerM2) }}</span>
                </div>
                <div class="spec-entry" v-if="details?.frontage">
                  <span class="s-label">Testada (Frente)</span>
                  <span class="s-value">{{ details?.frontage }} m</span>
                </div>
                <div class="spec-entry" v-if="details?.depth">
                  <span class="s-label">Profundidade</span>
                  <span class="s-value">{{ details?.depth }} m</span>
                </div>
                <div class="spec-entry" v-if="details?.sideLeft">
                  <span class="s-label">Lateral Esquerda</span>
                  <span class="s-value">{{ details?.sideLeft }} m</span>
                </div>
                <div class="spec-entry" v-if="details?.sideRight">
                  <span class="s-label">Lateral Direita</span>
                  <span class="s-value">{{ details?.sideRight }} m</span>
                </div>
                <div class="spec-entry" v-if="details?.slope">
                  <span class="s-label">Perfil do Terreno</span>
                  <span class="s-value">{{ slopeLabel(details?.slope) }}</span>
                </div>
              </div>

              <div v-if="details?.notes" class="notes-box-v4">
                <div class="box-header">Notas e Descrição</div>
                <div class="box-body">{{ details?.notes }}</div>
              </div>
            </section>

            <!-- Simulator Section -->
            <section v-if="project?.showPaymentConditions" id="simulador" class="section-v4">
              <div class="section-title-v4">
                <h2>Simulador Financeiro</h2>
                <div class="title-line"></div>
              </div>

              <div class="simulator-card-v4">
                <div class="sim-header">
                  <div class="h-item">
                    <span class="l">Valor do Lote</span>
                    <span class="v" style="font-size: 1.5rem; color: var(--color-primary-500);">{{ formatCurrencyToBrasilia(details?.price || 0) }}</span>
                  </div>
                </div>

                <div class="sim-body">
                  <!-- Down Payment Selection -->
                  <div class="input-group-v4">
                    <div class="ig-label">Quanto deseja dar de entrada?</div>
                    <div class="ig-flex">
                      <div class="ig-field" style="flex: 2;">
                        <span class="ig-curr">R$</span>
                        <input v-model.number="simDownPayment" type="number" step="0.01" @input="() => { updatePercentFromDownPayment(); tracking.trackClick('Simulador: Valor Entrada', 'FINANCE'); }" class="ig-input" :min="minDownPaymentValue" />
                      </div>
                      <div class="ig-field" style="flex: 1;">
                        <input v-model.number="simDownPaymentPercent" type="number" step="0.1" @input="() => { updateDownPaymentFromPercent(); tracking.trackClick('Simulador: Porcentagem Entrada', 'FINANCE'); }" class="ig-input" />
                        <span class="ig-curr">%</span>
                      </div>
                    </div>
                    <small class="ig-hint">Entrada mínima: {{ formatCurrencyToBrasilia(minDownPaymentValue) }} ({{ project?.minDownPaymentPercent || 10 }}%)</small>
                  </div>

                  <!-- Installments Slider -->
                  <div class="input-group-v4" style="margin-top: 32px;">
                    <div class="ig-label">Número de Parcelas: <strong>{{ simMonths }} meses</strong></div>
                    <div class="slider-wrapper">
                      <input 
                        type="range" 
                        v-model.number="simMonths" 
                        min="12" 
                        :max="maxInstallments" 
                        step="12"
                        class="range-slider-v4"
                        @change="tracking.trackClick('Simulador: Parcelamento Meses', 'FINANCE')"
                      />
                      <div class="slider-labels">
                        <span>12x</span>
                        <span>{{ Math.round(maxInstallments / 2) }}x</span>
                        <span>{{ maxInstallments }}x</span>
                      </div>
                    </div>
                  </div>

                  <!-- Result -->
                  <div class="sim-result-v4">
                    <div class="r-label">Primeira Parcela Estimada</div>
                    <div class="r-value">{{ formatCurrencyToBrasilia(simResult) }}</div>
                    <div class="r-detail">
                      <span v-if="project?.monthlyInterestRate > 0">
                        Juros: {{ project.monthlyInterestRate }}% am ({{ annualInterestRateEffective.toFixed(2) }}% aa efetivo) + {{ project.indexer || 'IGP-M' }}
                      </span>
                      <span v-else>Sem juros + {{ project.indexer || 'IGP-M' }}</span>
                    </div>

                    <div class="sim-summary-v4" v-if="simMonths > 1">
                      <div class="summary-item">
                        <span class="s-l">Investimento Total (Simulado):</span>
                        <span class="s-v">{{ formatCurrencyToBrasilia(simTotalInvested) }}</span>
                      </div>
                      <div class="summary-item" v-if="simTotalInterest > 0">
                        <span class="s-l">Custo de Financiamento (Juros):</span>
                        <span class="s-v">{{ formatCurrencyToBrasilia(simTotalInterest) }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="sim-disclaimer-v4">
                    <i class="bi bi-megaphone-fill" aria-hidden="true"></i> <strong>Importante:</strong> Este é um simulador informativo. As parcelas serão reajustadas mensalmente pelo <strong>{{ project.indexer || 'IGP-M' }}</strong>. 
                    {{ project?.financingDisclaimer || 'Simulação baseada nas regras vigentes. Sujeito à aprovação de crédito e alteração de taxas.' }}
                  </div>
                </div>
              </div>
            </section>

            <!-- Finance -->
            <section v-if="details?.paymentConditions" id="financiamento" class="section-v4">
              <div class="section-title-v4">
                <h2>Condições de Aquisição</h2>
                <div class="title-line"></div>
              </div>

              <div class="finance-card-v4">
                <div class="finance-header">
                  <div class="h-item">
                    <span class="l">Valor do Lote</span>
                    <span class="v">R$ {{ (details?.price || details?.paymentConditions?.price)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                  </div>
                </div>

                <div class="finance-body">
                  <!-- Ato (Single) -->
                  <div v-if="details?.paymentConditions?.ato" class="plan-group">
                    <div class="group-label">Ato</div>
                    <div class="plans-grid">
                      <div class="plan-pill">
                        <span class="p-qty">Pagamento à vista</span>
                        <span class="p-val">R$ {{ details?.paymentConditions?.ato?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Atos / Sinal (List - compatibility) -->
                  <div v-if="details?.paymentConditions?.atos && !details?.paymentConditions?.ato" class="plan-group">
                    <div class="group-label">Ato</div>
                    <div class="plans-grid">
                      <template v-if="Array.isArray(details?.paymentConditions?.atos)">
                        <div v-for="(p, idx) in details?.paymentConditions?.atos" :key="'ato'+idx" class="plan-pill">
                          <span class="p-qty">{{ p.count }}x ato</span>
                          <span class="p-val">R$ {{ (p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                        </div>
                      </template>
                      <div v-else-if="details?.paymentConditions?.atos?.count > 0" class="plan-pill">
                        <span class="p-qty">{{ details?.paymentConditions?.atos?.count }}x ato</span>
                        <span class="p-val">R$ {{ ((details?.paymentConditions?.atos?.total || 0) / (details?.paymentConditions?.atos?.count || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Entradas -->
                  <div v-if="details?.paymentConditions?.entrada || details?.paymentConditions?.entradas" class="plan-group">
                    <div class="group-label">Entrada</div>
                    <div class="plans-grid">
                      <template v-if="Array.isArray(details?.paymentConditions?.entradas)">
                        <div v-for="(p, idx) in details?.paymentConditions?.entradas" :key="'ent'+idx" class="plan-pill">
                          <span class="p-qty">{{ p.count }}x entrada</span>
                          <span class="p-val">R$ {{ (p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                        </div>
                      </template>
                      <div v-else-if="details?.paymentConditions?.entrada?.count > 0" class="plan-pill">
                        <span class="p-qty">{{ details?.paymentConditions?.entrada?.count }}x entrada</span>
                        <span class="p-val">R$ {{ ((details?.paymentConditions?.entrada?.total || 0) / (details?.paymentConditions?.entrada?.count || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Parcelas -->
                  <div v-if="(details?.paymentConditions?.parcelas || details?.paymentConditions?.installments)?.length" class="plan-group">
                    <div class="group-label">Parcelas Mensais</div>
                    <div class="plans-grid">
                      <div v-for="(plan, idx) in (details?.paymentConditions?.parcelas || details?.paymentConditions?.installments)" :key="'par'+idx" class="plan-pill">
                        <span class="p-qty">{{ plan.months || plan.count || plan.qty }}x mensais</span>
                        <span class="p-val">R$ {{ (plan.amount || plan.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Saldo do Saldo -->
                  <div v-if="details?.paymentConditions?.saldo" class="plan-group">
                    <div class="group-label">Saldo Final (Financiado)</div>
                    <div class="plans-grid">
                      <div class="plan-pill">
                        <span class="p-qty">Saldo residual</span>
                        <span class="p-val">R$ {{ details?.paymentConditions?.saldo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Reforços / Balões -->
                  <div v-if="details?.paymentConditions?.intermediarias || details?.paymentConditions?.balloons" class="plan-group">
                    <div class="group-label">Reforços / Balões</div>
                    <div class="plans-grid">
                      <template v-if="Array.isArray(details?.paymentConditions?.intermediarias || details?.paymentConditions?.balloons)">
                        <div v-for="(b, idx) in (details?.paymentConditions?.intermediarias || details?.paymentConditions?.balloons)" :key="'bal'+idx" class="plan-pill balloon">
                          <span class="p-qty">{{ b.count }}x reforços</span>
                          <span class="p-val">R$ {{ (b.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                        </div>
                      </template>
                      <div v-else-if="details?.paymentConditions?.intermediarias?.count > 0" class="plan-pill balloon">
                        <span class="p-qty">{{ details?.paymentConditions?.intermediarias?.count }}x reforços</span>
                        <span class="p-val">R$ {{ ((details?.paymentConditions?.intermediarias?.total || 0) / (details?.paymentConditions?.intermediarias?.count || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="details?.paymentConditions?.observacoes?.length || (details?.paymentConditions?.notes && details?.paymentConditions?.notes !== '')" class="finance-note">
                  <svg width="18" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-top: 2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <div class="note-content">
                    <template v-if="Array.isArray(details?.paymentConditions?.observacoes)">
                      <p v-for="(obs, i) in details?.paymentConditions?.observacoes" :key="i">{{ obs }}</p>
                    </template>
                    <p v-else>{{ details?.paymentConditions?.notes || details?.paymentConditions?.observacoes }}</p>
                  </div>
                </div>
              </div>
            </section>
          </main>

          <!-- Sidebar (Sticky Conversion) -->
          <aside class="sidebar-col">
            <div class="sticky-conversion-card">
              <!-- Broker Profile -->
              <div class="broker-info-v4" v-if="corretor">
                <div class="b-avatar">
                  <img v-if="corretor.avatarUrl" :src="corretor.avatarUrl" :alt="corretor.name" />
                  <div v-else class="b-initial">{{ corretor.name?.charAt(0) }}</div>
                </div>
                <div class="b-text">
                  <span class="b-label">Seu consultor</span>
                  <span class="b-name">{{ corretor.name }}</span>
                </div>
              </div>

              <!-- Reservation / Lead Form -->
              <div id="contato" class="lead-form-v4">
                <div v-if="project?.paymentGateways?.length > 0 && details?.status === 'AVAILABLE'" class="booking-section-v4">
                  <div v-if="!bookingMode" class="booking-intro">
                    <div class="h-reserve-v4">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      <span>Reserva Online Garantida</span>
                    </div>
                    <p>Reserve este lote agora mesmo e garanta sua unidade.</p>
                    <button @click="() => { bookingMode = true; tracking.trackClick('Botão: Abrir Reserva Online', 'CONVERSION'); }" class="cta-reserve-v4">
                      Reservar Lote
                    </button>
                    <div class="reserve-fee">
                      Taxa de reserva: {{ formatCurrencyToBrasilia(reservationFeeValue) }}
                    </div>
                    <p class="reserve-disclaimer">*Sujeito a análise de crédito da loteadora responsável pelo empreendimento.</p>
                  </div>

                  <div v-else class="booking-form-v4">
                    <div class="booking-header">
                      <button @click="bookingMode = false" class="back-link">← Cancelar</button>
                      <h4>Dados da Reserva</h4>
                    </div>
                    <form @submit.prevent="submitReservation" class="form-v4">
                      <div class="f-field">
                        <input v-model="reservationForm.name" type="text" placeholder="Nome Completo" required />
                      </div>
                      <div class="f-field">
                        <input v-model="reservationForm.email" type="email" placeholder="E-mail" required />
                      </div>
                      <div class="f-field">
                        <input v-model="reservationForm.phone" type="tel" placeholder="WhatsApp" required />
                      </div>
                      <div class="f-field">
                        <input v-model="reservationForm.cpf" type="text" placeholder="CPF" required />
                      </div>
                      <div class="f-checkbox">
                        <input v-model="reservationForm.acceptTerms" type="checkbox" id="terms" required />
                        <label for="terms">Aceito os termos de reserva e politicas de privacidade e estou ciente de que a reserva esta sujeita a analise de credito da loteadora.</label>
                      </div>
                      <div v-if="bookingError" class="f-error">{{ bookingError }}</div>
                      <button type="submit" class="cta-submit-booking-v4" :disabled="bookingLoading">
                        {{ bookingLoading ? 'Processando...' : 'Ir para Pagamento' }}
                      </button>
                    </form>
                  </div>
                </div>

                <div class="form-header-v4">
                  <h3>Tenho Interesse</h3>
                  <p>Tire todas as suas dúvidas ou agende uma visita no local.</p>
                </div>

                <form v-if="!leadSuccess" @submit.prevent="submitLead" class="form-v4">
                  <div class="f-field">
                    <input v-model="leadForm.name" type="text" placeholder="Nome" required />
                  </div>
                  <div class="f-field">
                    <input v-model="leadForm.phone" type="tel" placeholder="WhatsApp" required />
                  </div>
                  <div class="f-field">
                    <input v-model="leadForm.email" type="email" placeholder="E-mail" required />
                  </div>
                  <div v-if="leadError" class="f-error">{{ leadError }}</div>
                  <button type="submit" class="cta-submit-v4" :disabled="submitting">
                    {{ submitting ? 'Enviando...' : 'Quero Detalhes' }}
                  </button>
                  
                  <template v-if="corretor">
                    <div class="form-divider-v4">ou</div>
                    <a :href="`https://wa.me/${corretor.phone?.replace(/\D/g, '') || project?.contactPhone?.replace(/\D/g, '')}`" 
                       target="_blank" class="wa-btn-v4"
                       @click="tracking.trackWhatsappClick({ lotCode, realtorName: corretor.name })">
                      Conversar via WhatsApp
                    </a>
                  </template>
                </form>

                <div v-else class="form-success-v4">
                  <div class="success-animation-v4">
                    <div class="success-circle-v4">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <path d="M20 6L9 17L4 12" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </div>
                  </div>
                  <h4>Solicitação Enviada!</h4>
                  <p>O corretor entrará em contato em breve via WhatsApp ou e-mail.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <!-- Footer / Others -->
        <footer class="v4-footer">
          <div class="page-container-v4">
            <div v-if="otherLots.length" class="other-assets-v4">
              <div class="assets-header-v4">
                <h3>Outras Oportunidades</h3>
                <NuxtLink :to="projectUrl">Ver todos no mapa</NuxtLink>
              </div>

              <div class="other-lots-filters-v4">
                <input
                  v-model="otherLotsSearchQuery"
                  type="text"
                  class="other-lots-search-v4"
                  placeholder="Buscar por codigo, quadra ou lote"
                />
                <div v-if="otherLotsAvailableTags.length" class="other-lots-tags-v4">
                  <button
                    v-for="tag in otherLotsAvailableTags"
                    :key="tag"
                    type="button"
                    class="other-lots-tag-v4"
                    :class="{ 'is-active': selectedOtherLotsTags.includes(tag) }"
                    @click="toggleOtherLotsTag(tag)"
                  >
                    {{ tag }}
                  </button>
                  <button
                    v-if="selectedOtherLotsTags.length || otherLotsSearchQuery"
                    type="button"
                    class="other-lots-clear-v4"
                    @click="clearOtherLotsFilters"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div class="assets-grid-v4">
                <NuxtLink v-for="l in filteredOtherLots.slice(0, 8)" :key="l.id" :to="otherLotUrl(l)" class="asset-card-v4">
                  <div class="a-code">{{ (l.code || l.name || l.id).toString().toLowerCase().includes('lote') ? '' : 'Lote ' }}{{ l.code || l.name || l.id }}</div>
                  <div class="a-area">{{ l.lotDetails?.areaM2 ? `${l.lotDetails.areaM2} m²` : '—' }}</div>
                  <div class="a-price" v-if="l.lotDetails?.price">{{ formatCurrencyToBrasilia(l.lotDetails.price) }}</div>
                </NuxtLink>
              </div>
              <p v-if="!filteredOtherLots.length" class="other-lots-empty-v4">
                Nenhum lote encontrado com os filtros atuais.
              </p>
            </div>

            <div v-if="project" class="v4-footer-inner">
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
      </div>
    </div>

      <!-- Lightbox (Keep original logic) -->
      <div v-if="lightboxOpen" class="v4-lightbox" @click.self="lightboxOpen = false">
        <button class="v4-lightbox-close" @click="lightboxOpen = false">&times;</button>

        <button v-if="lightboxIdx > 0" class="v4-lightbox-btn v4-prev" @click="lightboxIdx--">&#10094;</button>

        <div class="v4-lightbox-content">
          <img v-if="lightboxMedia?.type === 'PHOTO'" :src="lightboxMedia.url" :alt="lightboxMedia.caption" />
          <video v-else :src="lightboxMedia?.url" controls autoplay />
          <div v-if="lightboxMedia?.caption" class="v4-lightbox-caption">{{ lightboxMedia.caption }}</div>
        </div>

        <button v-if="lightboxIdx < (galleryMedias.length || 1) - 1" class="v4-lightbox-btn v4-next" @click="lightboxIdx++">&#10095;</button>
      </div>

      <nav class="v4-sticky-nav">
        <a v-if="lotPlantMap" href="#localizacao" class="v4-nav-item">Planta</a>
        <a v-if="lotPanorama" href="#vista-360" class="v4-nav-item">Panorama</a>
        <NuxtLink :to="unitsUrl" class="v4-nav-item">Unidades</NuxtLink>
        <a href="#contato" class="v4-nav-item v4-nav-cta">TENHO INTERESSE</a>
      </nav>

      <div v-if="idealLotAvailableTags.length > 0" class="v4-floating-cta">
        <button class="v4-cta-btn-animated" @click="() => { tracking.trackClick('CTA Flutuante Lote: Encontrar Lote Ideal'); toggleIdealLotModal() }">
          <div class="v4-cta-inner">
            <span class="v4-cta-icon-spark"><i class="bi bi-search" aria-hidden="true"></i></span>
            <span class="v4-cta-label">Encontrar lote ideal</span>
            <span class="v4-cta-arrow-icon">→</span>
          </div>
          <div class="v4-cta-glow"></div>
        </button>
      </div>

      <!-- Ideal Lot Filter Modal -->
      <Transition name="fade-lot-modal">
        <div v-if="isIdealLotModalOpen" class="v4-filter-modal-overlay">
          <div class="v4-filter-modal-card">
            <div class="v4-modal-header">
              <h3 class="v4-modal-title">Lote Ideal</h3>
              <button class="v4-modal-close" @click="toggleIdealLotModal">✕</button>
            </div>
            <div class="v4-modal-body">
              <p style="margin-bottom: 24px; color: #86868b; font-size: 15px;">Escolha as características para encontrar o seu lote ideal.</p>
              <span class="v4-modal-label">Características</span>
              <div class="v4-modal-tags">
                <button
                  v-for="tag in idealLotAvailableTags"
                  :key="tag"
                  class="v4-modal-tag"
                  :class="{ active: idealLotSelectedTags.includes(tag) }"
                  @click="toggleIdealLotTag(tag)"
                >
                  {{ tag }}
                </button>
              </div>
              <div class="v4-modal-options">
                <label class="v4-modal-option">
                  <input type="checkbox" v-model="idealLotExactMatch" />
                  <div class="v4-option-info">
                    <span class="v4-option-title">Correspondência Exata</span>
                    <span class="v4-option-desc">Mostrar apenas lotes com todos os selos selecionados.</span>
                  </div>
                </label>
              </div>
            </div>
            <div class="v4-modal-footer">
              <button class="v4-btn-modal-search" @click="applyIdealLotFilters">
                {{ idealLotSelectedTags.length ? `Ver ${idealLotFilteredCount} unidades compatíveis` : 'Ver todas as unidades' }}
              </button>
              <button v-if="idealLotSelectedTags.length" class="v4-btn-modal-clear" @click="idealLotSelectedTags = []">
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useTenantStore } from '~/stores/tenant'
import { useAiChatStore } from '~/stores/aiChat'
import { getTodayInBrasilia, getYearInBrasilia } from '~/utils/date'
import { formatCurrencyToBrasilia } from '~/utils/money'
import PanoramaViewer from '~/components/panorama/PanoramaViewer.vue'
import PlantMapViewer from '~/components/plantMap/PlantMapViewer.vue'
import { usePublicPlantMap } from '~/composables/plantMap/usePlantMapApi'
import type { Panorama } from '~/composables/panorama/types'
import type { PlantMap } from '~/composables/plantMap/types'

const props = defineProps<{
  slug?: string
  lotCode?: string
  id?: string
}>()

const route = useRoute()
const tenantStore = useTenantStore()
const chatStore = useAiChatStore()
const { fetchPublic } = usePublicApi()
const { success: toastSuccess } = useToast()
const tracking = useTracking()
const trackingStore = useTrackingStore()

const projectSlug = computed(() => (tenantStore.config?.project?.slug || props.slug || route.params.slug || '') as string)
const isPreview = computed(() => !!props.id || !!route.query.previewId)
const previewId = computed(() => (props.id || route.query.previewId) as string)
const pathPrefix = computed(() => {
  if (isPreview.value) {
    return `/preview/${previewId.value}`
  }
  return projectSlug.value ? `/${projectSlug.value}` : ''
})
const lotCode = computed(() => {
  if (props.lotCode) return props.lotCode;
  if (route.params.code) return decodeURIComponent(route.params.code as string);

  return '';
})
const corretorCode = (route.query.c as string) || ''

const loading = ref(true)
const error = ref('')
const project = ref<any>(null)
const corretor = ref<any>(null)
const plantMap = ref<PlantMap | null>(null)
const publicLotCandidates = ref<any[]>([])
const { getPublicPlantMap } = usePublicPlantMap()
const currentSalesNotice = ref('')
const salesMotionHideTimerId = ref<number | null>(null)
const salesMotionInitialTimerId = ref<number | null>(null)
const salesMotionShownCount = ref(0)
const salesMotionLastShownAt = ref(0)
const salesMotionLastViews = ref(0)
const salesMotionLastVisits = ref(0)
const salesMotionSeenSections = ref<string[]>([])
const salesMotionReachedMilestones = ref<number[]>([])

const normalizeLotIdentifier = (value?: string | null) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const isSameLotIdentifier = (a?: string | null, b?: string | null) =>
  !!normalizeLotIdentifier(a) && normalizeLotIdentifier(a) === normalizeLotIdentifier(b)

const lotPlantMap = computed(() => {
  if (!plantMap.value || !lot.value) return null
  
  // Find the hotspot that points to this lot
  // Try matching by id first, then by code
  const lotId = lot.value.id
  const lotLabel = lot.value.code || lot.value.name
  
  const relevantHotspots = plantMap.value.hotspots.filter(h => 
    h.linkId === lotId || (h.label && h.label === lotLabel)
  )

  return {
    ...plantMap.value,
    hotspots: relevantHotspots.length ? relevantHotspots : []
  }
})

const lotPanorama = computed(() => {
  if (!panoramaImageUrl.value) return null
  return {
    id: 'lot-panorama',
    tenantId: project.value?.tenantId || '',
    projectId: project.value?.id || '',
    title: 'Vista do Lote',
    projection: 'EQUIRECTANGULAR',
    published: true,
    sunPathAngleDeg: 0,
    sunPathLabelEnabled: false,
    showImplantation: false,
    snapshots: [{
      id: 'lot-snap',
      panoramaId: 'lot-panorama',
      imageUrl: panoramaImageUrl.value,
      label: 'Vista 360°',
      sortOrder: 0,
      createdAt: getTodayInBrasilia(),
      updatedAt: getTodayInBrasilia(),
    }],
    beacons: [],
    createdAt: getTodayInBrasilia(),
    updatedAt: getTodayInBrasilia(),
  } as Panorama
})

const projectUrl = computed(() => {
  const base = pathPrefix.value || '/'
  return corretorCode ? `${base}${base.includes('?') ? '&' : '?'}c=${corretorCode}` : base
})

const unitsUrl = computed(() => {
  const base = `${pathPrefix.value}/unidades`
  return corretorCode ? `${base}${base.includes('?') ? '&' : '?'}c=${corretorCode}` : base
})

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

const allProjectLots = computed(() => {
  if (!project.value) return []
  const mapData = (project.value as any).mapData 
    ? (typeof (project.value as any).mapData === 'string' ? JSON.parse((project.value as any).mapData) : (project.value as any).mapData)
    : null
  
  const fromElements = ((project.value as any).mapElements || []).map((e: any) => ({
    id: e.id,
    code: e.code || e.name || e.id
  }))

  const fromMapData = mapData ? (Array.isArray(mapData.lots)
    ? mapData.lots.map(([, l]: [any, any]) => ({ id: l.id, code: l.code || l.label || l.id }))
    : (mapData.lots ? Object.values(mapData.lots).map((l: any) => ({ id: l.id, code: l.code || l.label || l.id })) : [])) : []

  const fromTeaser = ((project.value as any).teaserLots || []).map((l: any) => ({
    id: l.id,
    code: l.code || l.name || l.id,
  }))

  const fromPublicLots = (publicLotCandidates.value || []).map((l: any) => ({
    id: l.id,
    code: l.code || l.name || l.id,
  }))
    
  return [...fromElements, ...fromMapData, ...fromTeaser, ...fromPublicLots]
})

const lot = computed(() => {
  if (!project.value) return null
  
  const mapData = (project.value as any).mapData 
    ? (typeof (project.value as any).mapData === 'string' ? JSON.parse((project.value as any).mapData) : (project.value as any).mapData)
    : null
  const PPM = mapData?.pixelsPerMeter || (project.value as any).pixelsPerMeter || 10

  // 1. Try relational mapElements (standard way)
  // Match by code or ID, and allow any type that has pages (standardized for Hotspots)
  const fromElements = (project.value as any).mapElements?.find((e: any) => (
    isSameLotIdentifier(e.code, lotCode.value)
    || isSameLotIdentifier(e.name, lotCode.value)
    || isSameLotIdentifier(e.id, lotCode.value)
  ))
  if (fromElements) return fromElements

  // 2. Try JSON mapData (flexible way)
  if (mapData) {
    try {
      const data = mapData
      const lotsArr: any[] = Array.isArray(data.lots)
        ? data.lots.map(([, l]: [string, any]) => l)
        : (data.lots ? Object.values(data.lots) : [])
      const found = lotsArr.find((l: any) =>
        isSameLotIdentifier(l.code, lotCode.value)
        || isSameLotIdentifier(l.id, lotCode.value)
        || isSameLotIdentifier(l.label, lotCode.value)
      )
      
      if (found) {
        const publicCandidate = (publicLotCandidates.value || []).find((l: any) =>
          isSameLotIdentifier(l.code, found.code)
          || isSameLotIdentifier(l.name, found.label)
          || isSameLotIdentifier(l.id, found.id)
        )
        const publicDetails = publicCandidate?.lotDetails || null

        // Area priority: Manual > Side metrics (contract) > Drawing (pixel)
        const contractArea = calcContractArea(found)
        let finalAreaM2 = (Number(found.area) > 0 ? (Number(found.area) / (PPM * PPM)) : 0)
        
        if (found.manualAreaM2 != null) {
          finalAreaM2 = Number(found.manualAreaM2)
        } else if (contractArea !== null) {
          finalAreaM2 = contractArea
        }

        // Frontage priority: Manual > Drawing (pixel)
        const finalFrontage = found.manualFrontage != null
          ? Number(found.manualFrontage)
          : (Number(found.frontage) > 0 ? (Number(found.frontage) / PPM) : 0)

        // Synthesize a structure similar to MapElement + LotDetails
        return {
          id: found.id,
          code: found.code || found.label || found.id,
          name: found.label || found.code || 'Lote',
          lotDetails: {
            status: (publicDetails?.status || found.status || 'available').toString().toUpperCase(),
            price: publicDetails?.price ?? found.price ?? null,
            areaM2: publicDetails?.areaM2 ?? parseFloat(finalAreaM2.toFixed(2)),
            frontage: publicDetails?.frontage ?? parseFloat(finalFrontage.toFixed(2)),
            depth: publicDetails?.depth ?? found.manualBack ?? found.depth ?? null,
            sideLeft: publicDetails?.sideLeft ?? found.sideLeft ?? null,
            sideRight: publicDetails?.sideRight ?? found.sideRight ?? null,
            sideMetricsJson: publicDetails?.sideMetricsJson ?? found.sideMetrics ?? [],
            slope: publicDetails?.slope ?? found.slope ?? 'FLAT',
            notes: publicDetails?.notes ?? found.notes ?? '',
            tags: publicDetails?.tags ?? found.tags ?? [],
            block: publicDetails?.block ?? found.block ?? null,
            lotNumber: publicDetails?.lotNumber ?? found.lotNumber ?? null,
            pricePerM2: publicDetails?.pricePerM2 ?? found.pricePerM2 ?? null,
            conditionsJson: publicDetails?.conditionsJson ?? found.conditionsJson ?? [],
            paymentConditions:
              publicDetails?.paymentConditions
              ?? ((typeof found.paymentConditions === 'string' ? JSON.parse(found.paymentConditions) : found.paymentConditions) || null),
            panoramaUrl: publicDetails?.panoramaUrl ?? found.panoramaUrl ?? null,
            medias: Array.isArray(publicDetails?.medias) ? publicDetails.medias : []
          }
        }
      }
    } catch (e) { console.error('Error parsing mapData in lot page', e) }
  }

  // 3. Public lots endpoint fallback (new lightweight public payloads)
  const fromPublicLots = (publicLotCandidates.value || []).find((l: any) =>
    isSameLotIdentifier(l.code, lotCode.value)
    || isSameLotIdentifier(l.name, lotCode.value)
    || isSameLotIdentifier(l.id, lotCode.value)
  )
  if (fromPublicLots) {
    return {
      id: fromPublicLots.id,
      code: fromPublicLots.code || fromPublicLots.name || fromPublicLots.id,
      name: fromPublicLots.name || fromPublicLots.code || 'Lote',
      lotDetails: fromPublicLots.lotDetails || null,
    }
  }

  return null
})

const details = computed(() => lot.value?.lotDetails || null)

const PANORAMA_MEDIA_TAGS = ['lot_panorama_360', 'panorama_360', 'panorama-360', 'panorama 360']

const isPanoramaMedia = (media: any) => {
  const caption = String(media?.caption || '').toLowerCase()
  const url = String(media?.url || '').toLowerCase()

  if (PANORAMA_MEDIA_TAGS.some(tag => caption.includes(tag))) return true
  if (url.includes('panorama_360') || url.includes('panorama-360') || url.includes('/panorama/')) return true
  return false
}

const panoramaImageUrl = computed(() => {
  if (details.value?.panoramaUrl) return details.value.panoramaUrl

  const medias = Array.isArray(details.value?.medias) ? details.value.medias : []
  const taggedPanorama = medias.find((m: any) => isPanoramaMedia(m))
  return taggedPanorama?.url || null
})

const galleryMedias = computed(() => {
  const medias = Array.isArray(details.value?.medias) ? details.value.medias : []
  const explicitPanoramaUrl = details.value?.panoramaUrl || null
  const panoramaUrl = panoramaImageUrl.value

  return medias.filter((m: any) => {
    if (!m?.url) return false
    if (explicitPanoramaUrl && m.url === explicitPanoramaUrl) return false
    if (panoramaUrl && m.url === panoramaUrl) return false
    if (isPanoramaMedia(m)) return false
    return true
  })
})

const reservationFeeValue = computed(() => {
  if (!project.value) return 500
  const baseValue = project.value.reservationFeeValue || 500
  const price = details.value?.price || 0
  if (project.value.reservationFeeType === 'PERCENTAGE' && price > 0) {
    return (price * (baseValue / 100))
  }
  return baseValue
})

const lotSideMetrics = computed(() => {
  const raw = details.value?.sideMetricsJson
  if (!Array.isArray(raw) || raw.length === 0) return []
  return raw
})

const statusClass = computed(() => {
  const map: Record<string, string> = {
    AVAILABLE: 'status-available',
    RESERVED: 'status-reserved',
    SOLD: 'status-sold',
  }
  return map[details.value?.status || 'AVAILABLE'] || 'status-available'
})

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    AVAILABLE: 'Disponível',
    RESERVED: 'Reservado',
    SOLD: 'Vendido',
  }
  return map[details.value?.status || 'AVAILABLE'] || 'Disponível'
})

const salesMotionConfig = computed(() => {
  const root = project.value?.salesMotionConfig || {}
  const cfg = root?.lot && typeof root.lot === 'object' ? root.lot : root
  const rawTemplates = cfg?.templates

  const defaultTemplates = [
    { id: 'viewsToday', text: '{{viewsToday}} pessoas visualizaram este lote hoje', enabled: true },
    { id: 'recentReservation', text: 'Lote {{recentLot}} foi reservado recentemente', enabled: true },
    { id: 'visits24h', text: '{{visits24h}} pessoas visitaram este loteamento nas últimas 24h', enabled: true },
    { id: 'visitorsNow', text: '{{visitsNow}} visitantes estão navegando nesta página neste momento', enabled: true },
    { id: 'sectionNow', text: '{{visitsNow}} pessoas chegaram na seção de {{sectionLabel}} agora', enabled: true },
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
    displaySeconds: Math.max(3, Number(cfg.displaySeconds ?? 6)),
    maxNotices: Math.max(1, Number(cfg.maxNotices ?? 5)),
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
  visits24h: { min: 12, max: 280 },
  visitsNow: { min: 2, max: 24 },
}

const salesMotionSessionStorageKey = computed(() => {
  const projectKey = String(project.value?.id || projectSlug.value || previewId.value || 'unknown')
  const lotKey = String(lot.value?.id || lot.value?.code || lotCode.value || 'unknown')
  return `lotio:sales-motion:lot:${projectKey}:${lotKey}`
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

const salesMotionLotPool = computed(() => {
  const values = (allProjectLots.value || []).map((l: any) => l?.code || l?.name).filter(Boolean)
  return Array.from(new Set(values))
})

const nextSmoothInt = (
  base: number,
  lastRef: { value: number },
  min: number,
  max: number,
  varianceRatio = 0.09,
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

const buildSalesMotionNotice = (reason: 'initial' | 'scroll' | 'section', sectionId?: string) => {
  const cfg = salesMotionConfig.value
  const baseViews = Math.max(4, Math.min(34, Math.round((allProjectAvailableLots.value.length || 8) * 0.9)))
  const baseVisits = Math.max(16, Math.min(260, Math.round((allProjectLots.value.length || 15) * 3.1)))
  const pool = salesMotionLotPool.value
  const sessionState = readSalesMotionSessionState()
  const sectionMap: Record<string, string> = {
    galeria: 'galeria',
    localizacao: 'planta',
    'vista-360': 'vista 360',
    ficha: 'ficha técnica',
    simulador: 'simulador',
    financiamento: 'tabela de pagamento',
  }
  const sectionLabel = sectionId ? (sectionMap[sectionId] || 'detalhes do lote') : 'detalhes do lote'

  const fillTemplate = (tpl: any) => {
    const text = String(tpl?.text || '')
    const automaticViewsRange = {
      min: Math.max(1, Math.round(baseViews * 0.7)),
      max: Math.max(2, Math.round(baseViews * 1.3)),
    }
    const automaticVisitsRange = {
      min: Math.max(1, Math.round(baseVisits * 0.75)),
      max: Math.max(2, Math.round(baseVisits * 1.25)),
    }
    const automaticNowRange = {
      min: Math.max(1, Math.round(Math.max(2, baseViews * 0.6) * 0.7)),
      max: Math.max(2, Math.round(Math.max(2, baseViews * 0.6) * 1.25)),
    }

    const viewsRange = resolveSalesMotionRange(tpl, 'viewsToday', automaticViewsRange)
    const visitsRange = resolveSalesMotionRange(tpl, 'visits24h', automaticVisitsRange)
    const nowRange = resolveSalesMotionRange(tpl, 'visitsNow', automaticNowRange)
    const views = nextSmoothInt(baseViews, salesMotionLastViews, viewsRange.min, viewsRange.max)
    const visits = nextSmoothInt(baseVisits, salesMotionLastVisits, visitsRange.min, visitsRange.max)
    const nowUsers = nextSmoothInt(Math.max(2, Math.round(baseViews * 0.6)), salesMotionLastViews, nowRange.min, nowRange.max, 0.13)
    const lotFromSession = String(sessionState.recentLot || '').trim()
    const hasLotFromSession = lotFromSession && pool.includes(lotFromSession)
    const randomLot = hasLotFromSession
      ? lotFromSession
      : (pool.length > 0 ? pool[0] : (lot.value?.code || '24'))

    writeSalesMotionSessionState({
      recentLot: randomLot,
      values: {
        viewsToday: views,
        visits24h: visits,
        visitsNow: nowUsers,
      },
    })

    return text
      .replace(/{{\s*viewsToday\s*}}/g, String(views))
      .replace(/{{\s*recentLot\s*}}/g, String(randomLot))
      .replace(/{{\s*visits24h\s*}}/g, String(visits))
      .replace(/{{\s*visitsNow\s*}}/g, String(nowUsers))
      .replace(/{{\s*sectionLabel\s*}}/g, String(sectionLabel))
  }

  const options = (cfg.templates || [])
    .filter((tpl: any) => tpl?.enabled !== false)
    .map((tpl: any) => fillTemplate(tpl))
    .filter(Boolean)

  if (reason === 'section' && sectionId) {
    const contextual = (cfg.templates || [])
      .filter((tpl: any) => tpl?.enabled !== false)
      .filter((tpl: any) => String(tpl?.text || '').includes('{{sectionLabel}}'))
      .map((tpl: any) => fillTemplate(tpl))
      .filter(Boolean)
    const source = contextual.length > 0 ? contextual : options
    return source[Math.floor(Math.random() * source.length)] || ''
  }

  if (reason === 'scroll') {
    const contextual = (cfg.templates || [])
      .filter((tpl: any) => tpl?.enabled !== false)
      .filter((tpl: any) => String(tpl?.text || '').includes('{{visitsNow}}'))
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

const showNextSalesNotice = (reason: 'initial' | 'scroll' | 'section', sectionId?: string) => {
  if (!process.client) return
  const cfg = salesMotionConfig.value
  const minGapMs = Math.max(2000, cfg.intervalSeconds * 1000)
  if (!cfg.enabled) return
  if (salesMotionShownCount.value >= cfg.maxNotices) {
    clearSalesMotionTimers()
    currentSalesNotice.value = ''
    return
  }

  const now = Date.now()
  if (currentSalesNotice.value) return
  if (now - salesMotionLastShownAt.value < minGapMs) return

  const message = buildSalesMotionNotice(reason, sectionId)
  if (!message) return

  currentSalesNotice.value = message
  salesMotionShownCount.value += 1
  salesMotionLastShownAt.value = now

  if (salesMotionHideTimerId.value !== null) {
    window.clearTimeout(salesMotionHideTimerId.value)
  }
  salesMotionHideTimerId.value = window.setTimeout(() => {
    currentSalesNotice.value = ''
  }, cfg.displaySeconds * 1000)
}

const startSalesMotion = () => {
  if (!process.client) return
  clearSalesMotionTimers()
  currentSalesNotice.value = ''
  salesMotionShownCount.value = 0
  salesMotionLastShownAt.value = 0
  const sessionState = readSalesMotionSessionState()
  const sessionViews = Number(sessionState.values?.viewsToday)
  const sessionVisits = Number(sessionState.values?.visits24h)
  salesMotionLastViews.value = Number.isFinite(sessionViews) ? sessionViews : 0
  salesMotionLastVisits.value = Number.isFinite(sessionVisits) ? sessionVisits : 0
  salesMotionSeenSections.value = []
  salesMotionReachedMilestones.value = []

  if (!salesMotionConfig.value.enabled) return

  salesMotionInitialTimerId.value = window.setTimeout(() => {
    showNextSalesNotice('initial')
  }, 1900)
}

const handleSalesMotionByProgress = () => {
  if (!process.client) return
  if (!salesMotionConfig.value.enabled) return
  if (salesMotionShownCount.value >= salesMotionConfig.value.maxNotices) return

  const doc = document.documentElement
  const scrollTop = window.scrollY || doc.scrollTop || 0
  const maxScrollable = Math.max(1, (doc.scrollHeight || 0) - window.innerHeight)
  const progress = Math.round((scrollTop / maxScrollable) * 100)
  const milestones = [20, 45, 70, 88]
  const nextMilestone = milestones.find((m) => progress >= m && !salesMotionReachedMilestones.value.includes(m))
  if (!nextMilestone) return

  salesMotionReachedMilestones.value = [...salesMotionReachedMilestones.value, nextMilestone]
  showNextSalesNotice('scroll')
}

const slopeLabel = (s: string) => {
  const map: Record<string, string> = { 
    FLAT: 'Plano', 
    UPHILL: 'Aclive', 
    DOWNHILL: 'Declive',
    UP: 'Aclive',
    DOWN: 'Declive'
  }
  return map[s] || s
}

const otherLots = computed(() => {
  if (!project.value) return []

  let mapData: any = null
  try {
    mapData = (project.value as any).mapData
      ? (typeof (project.value as any).mapData === 'string'
        ? JSON.parse((project.value as any).mapData)
        : (project.value as any).mapData)
      : null
  } catch {
    mapData = null
  }

  const fromElements = ((project.value as any).mapElements || [])
    .filter((e: any) => e.type === 'LOT')
    .map((e: any) => ({
      id: e.id,
      code: e.code || e.name || e.id,
      name: e.name || e.code || 'Lote',
      lotDetails: e.lotDetails || {},
    }))

  const fromMapData = mapData
    ? (Array.isArray(mapData.lots)
      ? mapData.lots.map(([, l]: [any, any]) => l)
      : (mapData.lots ? Object.values(mapData.lots) : []))
        .map((l: any) => ({
          id: l.id,
          code: l.code || l.label || l.id,
          name: l.label || l.code || 'Lote',
          lotDetails: {
            status: (l.status || 'AVAILABLE').toString().toUpperCase(),
            areaM2: l.manualAreaM2 ?? null,
            price: l.price ?? null,
          },
        }))
    : []

  const fromTeaser = (((project.value as any).teaserLots || []) as any[])
    .map((l: any) => ({
      id: l.id,
      code: l.code || l.name || l.id,
      name: l.name || l.code || 'Lote',
      lotDetails: {
        ...(l.lotDetails || {}),
        status: ((l.lotDetails?.status || 'AVAILABLE') as string).toUpperCase(),
      },
    }))

  const fromPublicLots = ((publicLotCandidates.value || []) as any[])
    .map((l: any) => ({
      id: l.id,
      code: l.code || l.name || l.id,
      name: l.name || l.code || 'Lote',
      lotDetails: {
        ...(l.lotDetails || {}),
        status: ((l.lotDetails?.status || 'AVAILABLE') as string).toUpperCase(),
      },
    }))

  const currentLotCode = normalizeLotIdentifier(lot.value?.code)
    || normalizeLotIdentifier(lot.value?.name)
    || normalizeLotIdentifier(lot.value?.id)
  const currentLotId = normalizeLotIdentifier(lot.value?.id)

  const merged = [...fromElements, ...fromMapData, ...fromTeaser, ...fromPublicLots]
  const deduped = new Map<string, any>()

  for (const item of merged) {
    const idKey = normalizeLotIdentifier(item.id)
    const codeKey = normalizeLotIdentifier(item.code || item.name)
    const key = idKey || codeKey
    if (!key) continue

    if (!deduped.has(key)) {
      deduped.set(key, item)
      continue
    }

    const prev = deduped.get(key)
    // Prefer richer entries that have explicit lotDetails values.
    const prevScore = Number(!!prev?.lotDetails?.price) + Number(!!prev?.lotDetails?.areaM2)
    const nextScore = Number(!!item?.lotDetails?.price) + Number(!!item?.lotDetails?.areaM2)
    if (nextScore >= prevScore) {
      deduped.set(key, { ...prev, ...item, lotDetails: { ...(prev?.lotDetails || {}), ...(item?.lotDetails || {}) } })
    }
  }

  return Array.from(deduped.values())
    .filter((e: any) => {
      const idMatch = normalizeLotIdentifier(e.id) && normalizeLotIdentifier(e.id) === currentLotId
      const codeMatch = normalizeLotIdentifier(e.code || e.name) && normalizeLotIdentifier(e.code || e.name) === currentLotCode
      if (idMatch || codeMatch) return false

      return (e.lotDetails?.status || 'AVAILABLE').toUpperCase() === 'AVAILABLE'
    })
})

const otherLotsSearchQuery = ref('')
const selectedOtherLotsTags = ref<string[]>([])

const allProjectAvailableLots = computed(() => {
  return allProjectLots.value.filter((item: any) => {
    return String(item?.lotDetails?.status || 'AVAILABLE').toUpperCase() === 'AVAILABLE'
  })
})

const idealLotAvailableTags = computed(() => {
  const tagSet = new Set<string>()

  for (const item of allProjectAvailableLots.value) {
    const tags = Array.isArray(item?.lotDetails?.tags) ? item.lotDetails.tags : []
    for (const rawTag of tags) {
      const tag = String(rawTag || '').trim()
      if (tag) tagSet.add(tag)
    }
  }

  return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'pt-BR'))
})

const otherLotsAvailableTags = computed(() => {
  const tagSet = new Set<string>()

  for (const item of otherLots.value) {
    const tags = Array.isArray(item?.lotDetails?.tags) ? item.lotDetails.tags : []
    for (const rawTag of tags) {
      const tag = String(rawTag || '').trim()
      if (tag) tagSet.add(tag)
    }
  }

  return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'pt-BR'))
})

const filteredOtherLots = computed(() => {
  const term = otherLotsSearchQuery.value.trim().toLowerCase()

  return otherLots.value.filter((item: any) => {
    const code = String(item?.code || item?.name || item?.id || '').toLowerCase()
    const block = String(item?.lotDetails?.block || '').toLowerCase()
    const lotNumber = String(item?.lotDetails?.lotNumber || '').toLowerCase()
    const tags = Array.isArray(item?.lotDetails?.tags) ? item.lotDetails.tags.map((t: any) => String(t)) : []

    const textMatch = !term
      || code.includes(term)
      || block.includes(term)
      || lotNumber.includes(term)
      || tags.some((tag: string) => tag.toLowerCase().includes(term))

    const tagsMatch = selectedOtherLotsTags.value.length === 0
      || selectedOtherLotsTags.value.some(selected => tags.includes(selected))

    return textMatch && tagsMatch
  })
})

function toggleOtherLotsTag(tag: string) {
  if (selectedOtherLotsTags.value.includes(tag)) {
    selectedOtherLotsTags.value = selectedOtherLotsTags.value.filter(t => t !== tag)
    return
  }
  selectedOtherLotsTags.value = [...selectedOtherLotsTags.value, tag]
}

function clearOtherLotsFilters() {
  otherLotsSearchQuery.value = ''
  selectedOtherLotsTags.value = []
}

// Ideal Lot Modal
const isIdealLotModalOpen = ref(false)
const idealLotSelectedTags = ref<string[]>([])
const idealLotExactMatch = ref(false)

const idealLotFilteredCount = computed(() => {
  if (idealLotSelectedTags.value.length === 0) return allProjectAvailableLots.value.length
  return allProjectAvailableLots.value.filter((l: any) => {
    const lotTags: string[] = l.lotDetails?.tags || []
    if (idealLotExactMatch.value) {
      return idealLotSelectedTags.value.every(t => lotTags.includes(t))
    }
    return idealLotSelectedTags.value.some(t => lotTags.includes(t))
  }).length
})

function toggleIdealLotModal() {
  isIdealLotModalOpen.value = !isIdealLotModalOpen.value
  if (process.client) {
    document.body.style.overflow = isIdealLotModalOpen.value ? 'hidden' : ''
  }
}

function toggleIdealLotTag(tag: string) {
  const idx = idealLotSelectedTags.value.indexOf(tag)
  if (idx > -1) idealLotSelectedTags.value.splice(idx, 1)
  else idealLotSelectedTags.value.push(tag)
}

function applyIdealLotFilters() {
  tracking.trackClick('Botão: Aplicar Filtros Lote Ideal', 'LIST_FILTER')
  const query: Record<string, string> = {}
  if (idealLotSelectedTags.value.length) {
    query.tags = idealLotSelectedTags.value.join(',')
  }
  if (idealLotExactMatch.value) {
    query.match = 'exact'
  }
  if (corretorCode) {
    query.c = corretorCode
  }
  isIdealLotModalOpen.value = false
  if (process.client) document.body.style.overflow = ''
  navigateTo({ path: pathPrefix.value + '/unidades', query })
}

function handleModalKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isIdealLotModalOpen.value) toggleIdealLotModal()
}

const otherLotUrl = (l: any) => {
  const code = l.code || l.name || l.id
  const base = pathPrefix.value === '' 
    ? `/${encodeURIComponent(code)}` 
    : `${pathPrefix.value}/${encodeURIComponent(code)}`
  return corretorCode ? `${base}${base.includes('?') ? '&' : '?'}c=${corretorCode}` : base
}

const leadForm = ref({ name: '', email: '', phone: '', message: '' })
const gateLeadForm = ref({ name: '', phone: '' })

const { maskPhone, maskCpf, validateEmail, validatePhone, validateCpf, unmask } = useMasks()

const submitting = ref(false)
const submittingGate = ref(false)
const leadSuccess = ref(false)
const leadError = ref('')
const financeUnlocked = ref(false)

const bookingMode = ref(false)
const reservationForm = ref({
  name: '',
  email: '',
  phone: '',
  cpf: '',
  acceptTerms: false
})
const bookingError = ref('')
const bookingLoading = ref(false)

// ── Simulator ───────────────────────────────────────────
const simMonths = ref(120)
const simDownPayment = ref(0)
const simDownPaymentPercent = ref(10)

const minDownPaymentValue = computed(() => {
  if (!project.value || !details.value?.price) return 0
  const perc = project.value.minDownPaymentPercent || 10
  const fixed = project.value.minDownPaymentValue || 0
  const calc = (details.value.price * (perc / 100))
  return Math.max(calc, fixed)
})

const maxInstallments = computed(() => project.value?.maxInstallments || 180)

const simResult = computed(() => {
  if (!details.value?.price || !project.value) return 0
  
  const totalValue = details.value.price
  const downPayment = Math.max(simDownPayment.value, minDownPaymentValue.value)
  const pv = totalValue - downPayment
  const n = simMonths.value
  const i = (project.value.monthlyInterestRate || 0) / 100
  
  if (pv <= 0) return 0
  if (i === 0) return pv / n
  
  // Price Table Formula: PMT = PV * (i * (1+i)^n) / ((1+i)^n - 1)
  const pmt = pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
  return pmt
})

const simTotalInvested = computed(() => {
  const downPayment = Math.max(simDownPayment.value, minDownPaymentValue.value)
  const installmentsTotal = simResult.value * simMonths.value
  return downPayment + installmentsTotal
})

const simTotalInterest = computed(() => {
  if (!details.value?.price) return 0
  return Math.max(0, simTotalInvested.value - details.value.price)
})

const annualInterestRateEffective = computed(() => {
  const i = (project.value?.monthlyInterestRate || 0) / 100
  if (i === 0) return 0
  return (Math.pow(1 + i, 12) - 1) * 100
})

const updateDownPaymentFromPercent = () => {
  if (!details.value?.price) return
  simDownPayment.value = (details.value.price * (simDownPaymentPercent.value / 100))
}

const updatePercentFromDownPayment = () => {
  if (!details.value?.price) return
  simDownPaymentPercent.value = Number(((simDownPayment.value / details.value.price) * 100).toFixed(1))
}

watch(() => details.value?.price, (val) => {
  if (val) {
    simDownPaymentPercent.value = project.value?.minDownPaymentPercent || 10
    updateDownPaymentFromPercent()
  }
}, { immediate: true })

watch(() => project.value, (val) => {
  if (val && details.value?.price) {
    simDownPaymentPercent.value = val.minDownPaymentPercent || 10
    updateDownPaymentFromPercent()
  }
}, { immediate: true })

watch(() => simMonths.value, (v) => { if (v) simMonths.value = Math.min(v, maxInstallments.value) })

watch(() => leadForm.value.phone, (v) => { if (v) leadForm.value.phone = maskPhone(v) })
watch(() => gateLeadForm.value.phone, (v) => { if (v) gateLeadForm.value.phone = maskPhone(v) })
watch(() => reservationForm.value.phone, (v) => { if (v) reservationForm.value.phone = maskPhone(v) })
watch(() => reservationForm.value.cpf, (v) => { if (v) reservationForm.value.cpf = maskCpf(v) })

const lightboxOpen = ref(false)
const lightboxIdx = ref(0)
const lightboxMedia = computed(() => galleryMedias.value?.[lightboxIdx.value] ?? null)

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

const activeSection = ref('hero')

const handleScroll = () => {
  const sections = ['hero', 'galeria', 'localizacao', 'vista-360', 'ficha', 'simulador', 'financiamento']
  for (const sectionId of [...sections].reverse()) {
    const el = document.getElementById(sectionId)
    if (el) {
      const rect = el.getBoundingClientRect()
      if (rect.top <= 150) {
        activeSection.value = sectionId
        break
      }
    }
  }
  handleSalesMotionByProgress()
}

watch(activeSection, (section) => {
  if (!salesMotionConfig.value.enabled) return
  if (section === 'hero') return
  if (salesMotionSeenSections.value.includes(section)) return
  salesMotionSeenSections.value = [...salesMotionSeenSections.value, section]
  showNextSalesNotice('section', section)
})

function openLightbox(idx: number) {
  lightboxIdx.value = idx
  lightboxOpen.value = true
}

onMounted(async () => {
  detectTouchMobile()
  window.addEventListener('resize', detectTouchMobile)
  window.addEventListener('scroll', handleScroll)
  window.addEventListener('keydown', handleModalKeyDown)
  handleScroll()
  
  try {
    const baseUrl = isPreview.value ? `/p/preview/${previewId.value}` : `/p/${projectSlug.value}`
    const searchParam = encodeURIComponent(lotCode.value || '')
    const [p, c] = await Promise.allSettled([
      fetchPublic(baseUrl),
      corretorCode && !isPreview.value ? fetchPublic(`/p/${projectSlug.value}/corretores/${corretorCode}`) : Promise.resolve(null),
    ])

    if (!isPreview.value && lotCode.value) {
      try {
        // Load a wider candidate set so we can render "Outras Oportunidades"
        // even when project payloads don't include mapElements/mapData.
        const [allLotsResponse, searchedLotResponse] = await Promise.allSettled([
          fetchPublic(`/p/${projectSlug.value}/lots?limit=100&page=1`),
          fetchPublic(`/p/${projectSlug.value}/lots?search=${searchParam}&limit=20&page=1`),
        ])

        const allLots = allLotsResponse.status === 'fulfilled' && Array.isArray(allLotsResponse.value?.data)
          ? allLotsResponse.value.data
          : []
        const searchedLots = searchedLotResponse.status === 'fulfilled' && Array.isArray(searchedLotResponse.value?.data)
          ? searchedLotResponse.value.data
          : []

        const byId = new Map<string, any>()
        for (const item of [...allLots, ...searchedLots]) {
          const key = String(item?.id || item?.code || item?.name || '')
          if (!key) continue
          if (!byId.has(key)) byId.set(key, item)
        }
        publicLotCandidates.value = Array.from(byId.values())
      } catch {
        publicLotCandidates.value = []
      }
    }
    
    if (p.status === 'fulfilled') {
      project.value = p.value
      chatStore.setProject(p.value)
      
      // Initialize tracking handled by global middleware

      // NEW: Fetch plant map using project id once we have it
      getPublicPlantMap(p.value.id, isPreview.value).then((pm) => {
        if (pm && pm.hotspots) {
          pm.hotspots = pm.hotspots.map(h => {
            if (h.linkType === 'LOTE_PAGE' && h.linkId) {
              const found = (allProjectLots.value as any[]).find(l => l.id === h.linkId);
              if (found) {
                 (h as any).code = found.code;
              }
            }
            return h;
          })
        }
        plantMap.value = pm
      }).catch(e => console.error('Error fetching plant map on lot page', e))
    } else {
      error.value = (p.reason as any)?.message || 'Loteamento não encontrado'
    }

    if (c.status === 'fulfilled' && c.value) {
      corretor.value = c.value
    }
  } catch (e: any) {
    error.value = e.message || 'Erro ao carregar dados'
  }
  
  loading.value = false
  startSalesMotion()

  // After load, validate lot exists
  if (!loading.value && project.value && !lot.value) {
    error.value = 'Lote não encontrado neste loteamento.'
  }
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
  window.removeEventListener('scroll', handleScroll)
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
    const body: any = {
      name: leadForm.value.name,
      email: leadForm.value.email,
      phone: unmask(leadForm.value.phone),
      mapElementId: lot.value?.id,
      message: leadForm.value.message || `Quero mais informações sobre o lote ${lotCode.value}`,
      realtorCode: corretorCode || undefined,
      sessionId: trackingStore.sessionId || undefined,
      aiChatTranscript: chatStore.getTranscript() || undefined,
    }
    const baseUrl = isPreview.value ? `/p/preview/${previewId.value}` : `/p/${projectSlug.value}`
    await fetchPublic(`${baseUrl}/leads`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    
    // Track Lead Submit
    tracking.trackLeadSubmit('FORM', { lotCode: lotCode.value, source: 'full_form' })
    
    leadSuccess.value = true
    financeUnlocked.value = true
    toastSuccess('Formulário enviado! Entraremos em contato.')
    if (chatStore.hasConversation()) chatStore.clear()
  } catch (e: any) {
    leadError.value = e.message || 'Erro ao enviar'
  }
  submitting.value = false
}

async function submitGateLead() {
  if (!validatePhone(gateLeadForm.value.phone)) {
    toastSuccess('Telefone inválido (mínimo 10 dígitos)') // use generic for fast gate
    return
  }

  submittingGate.value = true
  try {
    const body: any = {
      name: gateLeadForm.value.name,
      phone: unmask(gateLeadForm.value.phone),
      mapElementId: lot.value?.id,
      message: `Liberou a tabela de preços do lote ${lotCode.value}`,
      realtorCode: corretorCode || undefined,
      sessionId: trackingStore.sessionId || undefined,
      aiChatTranscript: chatStore.getTranscript() || undefined,
    }
    await fetchPublic(`/p/${projectSlug.value}/leads`, {
      method: 'POST',
      body: JSON.stringify(body),
    })

    // Track Lead Submit
    tracking.trackLeadSubmit('FORM', { lotCode: lotCode.value, source: 'gate_form' })

    financeUnlocked.value = true
    toastSuccess('Tabela liberada com sucesso!')
    if (chatStore.hasConversation()) chatStore.clear()
  } catch (e: any) {
    toastSuccess('Tabela liberada!') // Fallback success to not block user
    financeUnlocked.value = true
  }
  submittingGate.value = false
}

async function submitReservation() {
  if (!validateCpf(reservationForm.value.cpf)) {
    bookingError.value = 'CPF inválido'
    return
  }
  if (!validatePhone(reservationForm.value.phone)) {
    bookingError.value = 'Telefone inválido'
    return
  }
  if (!validateEmail(reservationForm.value.email)) {
    bookingError.value = 'E-mail inválido'
    return
  }
  if (!reservationForm.value.acceptTerms) {
    bookingError.value = 'Você precisa aceitar os termos'
    return
  }

  bookingLoading.value = true
  bookingError.value = ''
  try {
    // 1. Create Lead first
    const leadBody: any = {
      name: reservationForm.value.name,
      email: reservationForm.value.email,
      phone: unmask(reservationForm.value.phone),
      cpf: unmask(reservationForm.value.cpf),
      mapElementId: lot.value?.id,
      message: `RESERVA ONLINE: Intenção de compra do lote ${lotCode.value}`,
      realtorCode: corretorCode || undefined,
      sessionId: trackingStore.sessionId || undefined,
      aiChatTranscript: chatStore.getTranscript() || undefined,
    }
    
    const leadRes = await fetchPublic(`/p/${projectSlug.value}/leads`, {
      method: 'POST',
      body: JSON.stringify(leadBody),
    })

    // 2. Start Payment
    const paymentRes = await fetchPublic(`/payment/reserve`, {
      method: 'POST',
      body: JSON.stringify({
        leadId: leadRes.id,
        amount: reservationFeeValue.value,
        baseUrl: window.location.origin
      }),
    })

    if (paymentRes.checkoutUrl) {
      window.location.href = paymentRes.checkoutUrl
    } else {
      throw new Error('Erro ao gerar link de pagamento')
    }
  } catch (e: any) {
    bookingError.value = e.message || 'Erro ao processar reserva'
  }
  bookingLoading.value = false
}
</script>

<style scoped>
/* ─── V4 Apple-Inspired Style ─── */
:global(:root) {
  --v4-primary: #0071e3;
  --v4-primary-hover: #0077ed;
  --v4-bg: #ffffff;
  --v4-bg-alt: #f5f5f7;
  --v4-text: #1d1d1f;
  --v4-text-muted: #86868b;
  --v4-border: #d2d2d7;
  --v4-radius-lg: 18px;
  --v4-radius-md: 12px;
}

.pub-page { 
  background: var(--v4-bg-alt); 
  color: var(--v4-text); 
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  max-width: 100vw;
}

.pub-page * {
  box-sizing: border-box;
}

/* Header V4 */
.lot-header-v4 {
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--v4-border);
  padding: 12px 0;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-inner {
  max-width: 1300px;
  margin: 0 auto;
  padding: 0 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.back-link-v4 {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--v4-text-muted);
  text-decoration: none;
  font-weight: 500;
  font-size: 14px;
  transition: color 0.2s;
  flex-shrink: 0;
}
.back-link-v4:hover { color: var(--v4-primary); }

.project-tags {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  flex: 1;
  min-width: 0;
}
.tag-tenant {
  color: var(--v4-text-muted);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tag-pname {
  color: var(--v4-text);
  padding: 4px 10px;
  background: rgba(0,0,0,0.05);
  border-radius: 6px;
  min-width: 0;
  max-width: 58%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Main Layout V4 */
.layout-v4-main {
  position: relative;
  display: flex;
  min-height: calc(100vh - 60px);
  overflow: clip;
}

.main-content-flow-v4 {
  flex: 1;
  min-width: 0;
}

/* Vertical Nav Guide */
.side-navigation-guide {
  position: fixed; 
  top: 50%;
  transform: translateY(-50%);
  left: 30px;
  width: 70px; 
  display: flex; 
  flex-direction: column; 
  padding: 24px 0;
  background: white; 
  border-radius: 50px; 
  border: 1px solid var(--v4-border); 
  z-index: 150; 
  box-shadow: 0 4px 20px rgba(0,0,0,0.04);
}
@media (max-width: 1100px) { .side-navigation-guide { display: none; } }

.nav-stack { display: flex; flex-direction: column; position: relative; width: 100%; align-items: center; }
.nav-dot { display: flex; flex-direction: column; align-items: center; text-decoration: none; width: 100%; padding: 12px 0; transition: all 0.3s; }
.nav-dot .dot { width: 8px; height: 8px; border-radius: 50%; background: #d2d2d7; transition: all 0.3s; }
.nav-dot .label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #86868b; margin-top: 8px; }
.nav-dot:hover .dot, .nav-dot.is-active .dot { background: var(--v4-primary); transform: scale(1.2); }
.nav-dot:hover .label, .nav-dot.is-active .label { color: var(--v4-primary); }

/* Split View Grid */
.page-container-v4 { max-width: 1400px; margin: 0 auto; padding: 0 24px; }
.split-view { display: grid; grid-template-columns: 1fr 320px; gap: 32px; padding-top: 40px; padding-bottom: 80px; }
@media (max-width: 1200px) { .split-view { grid-template-columns: 1fr; } }

/* Hero V4 */
.hero-v4 {
  position: relative;
  background: white; padding: 48px; border-radius: var(--v4-radius-lg); margin-bottom: 32px; border: 1px solid var(--v4-border); box-shadow: 0 4px 24px rgba(0,0,0,0.02);
}
.hero-header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 32px; margin-bottom: 32px; }
.lot-code-title { font-size: 56px; font-weight: 700; margin: 0; color: var(--v4-text); line-height: 1.1; letter-spacing: -0.03em; }

.hero-price-box { 
  display: flex; 
  flex-direction: column; 
  align-items: flex-end; 
  text-align: right; 
  background: #f8fafc; 
  padding: 24px; 
  border-radius: 20px; 
  border: 1px solid #e2e8f0;
}
.hp-status-tag { 
  font-size: 12px; font-weight: 700; text-transform: uppercase; padding: 4px 12px; border-radius: 100px; margin-bottom: 12px;
  background: #32d74b; color: white;
}
.hp-status-tag.RESERVED { background: #ff9f0a; }
.hp-status-tag.SOLD { background: #ff453a; }
.hp-label { font-size: 13px; color: var(--v4-text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.hp-value { font-size: 36px; font-weight: 800; color: var(--v4-primary); letter-spacing: -1px; margin-top: 4px; }

/* Seals / Tags */
.lot-seals-v4 { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.seal-pill { 
  background: #f0f7ff; 
  color: #0071e3; 
  padding: 6px 14px; 
  border-radius: 100px; 
  font-size: 13px; 
  font-weight: 600; 
  text-transform: capitalize;
  border: 1px solid #d0e7ff;
}

.quick-metrics-v4 { display: flex; gap: 48px; }
.q-item { display: flex; flex-direction: column; }
.q-val { font-size: 28px; font-weight: 600; color: var(--v4-text); }
.q-unit { font-size: 12px; font-weight: 600; color: var(--v4-text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }

/* Section Generic V4 */
.section-v4 {
  background: white; padding: 40px; border-radius: var(--v4-radius-lg); margin-bottom: 24px; border: 1px solid var(--v4-border);
}
.section-title-v4 { margin-bottom: 24px; display: flex; align-items: center; gap: 24px; }
.section-title-v4 h2 { font-size: 28px; font-weight: 600; color: var(--v4-text); margin: 0; letter-spacing: -0.01em; }
.title-line { flex: 1; height: 1px; background: var(--v4-border); }

/* Gallery V4 */
.gallery-v4 { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 160px; gap: 12px; }
.gallery-tile { border-radius: 12px; overflow: hidden; cursor: pointer; position: relative; background: #f5f5f7; }
.gallery-tile.main { grid-column: span 2; grid-row: span 2; }
.gallery-tile img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
.gallery-tile:hover img { transform: scale(1.05); }

/* Specs Grid V4 */
.specs-grid-v4 { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.spec-entry { background: #f5f5f7; padding: 24px; border-radius: 16px; display: flex; flex-direction: column; gap: 4px; }
.spec-entry .s-label { font-size: 11px; font-weight: 600; color: var(--v4-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.spec-entry .s-value { font-size: 20px; font-weight: 600; color: var(--v4-text); }

.notes-box-v4 { margin-top: 32px; background: #f5f5f7; border-radius: 16px; overflow: hidden; border: 1px solid var(--v4-border); }
.box-header { padding: 12px 24px; background: white; border-bottom: 1px solid var(--v4-border); color: var(--v4-text); font-weight: 600; font-size: 14px; }
.box-body { padding: 24px; font-size: 16px; line-height: 1.5; color: var(--v4-text); }

/* Finance V4 */
.finance-card-v4 { border: 1px solid var(--v4-border); border-radius: 20px; overflow: hidden; background: white; box-shadow: none; }
.h-item { padding: 40px; display: flex; flex-direction: column; }
.h-item .l { font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; color: var(--v4-text-muted); }
.h-item .v { font-size: 40px; font-weight: 600; color: var(--v4-text); }

.finance-body { padding: 0 40px 40px; }
.plan-group { margin-bottom: 48px; border-top: 1px solid var(--v4-border); padding-top: 32px; }
.group-label { font-size: 19px; font-weight: 600; color: var(--v4-text); margin-bottom: 24px; }
.plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.plan-pill {
  background: #f5f5f7; padding: 20px 24px; border-radius: 14px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;
}
.plan-pill:hover { background: #e8e8ed; }
.p-qty { font-weight: 500; font-size: 16px; color: var(--v4-text); }
.p-val { font-weight: 600; color: var(--v4-text); font-size: 17px; }

.finance-note { padding: 24px 40px; background: #fafafa; display: flex; align-items: flex-start; gap: 16px; color: var(--v4-text-muted); font-size: 14px; border-top: 1px solid var(--v4-border); }

/* Sidebar V4 */
.sticky-conversion-card { 
  position: sticky; 
  top: 80px; 
  z-index: 10; 
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  padding-right: 4px;
}
.sticky-conversion-card::-webkit-scrollbar { width: 4px; }
.sticky-conversion-card::-webkit-scrollbar-thumb { background: #d2d2d7; border-radius: 10px; }

.lead-form-v4 { background: white; padding: 24px; border-radius: 20px; border: 1px solid var(--v4-border); box-shadow: 0 20px 40px rgba(0,0,0,0.06); }
.form-header-v4 h3 { font-size: 20px; font-weight: 600; color: var(--v4-text); margin-bottom: 8px; }
.form-header-v4 p { font-size: 14px; color: var(--v4-text-muted); margin-bottom: 20px; }

.booking-section-v4 {
  background: #f5faff;
  border: 1px solid #cce4ff;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}
.h-reserve-v4 { display: flex; align-items: center; gap: 8px; color: var(--v4-primary); font-weight: 600; font-size: 15px; margin-bottom: 8px; }
.booking-intro p { font-size: 14px; color: #4b5563; margin-bottom: 16px; line-height: 1.4; }
.cta-reserve-v4 { width: 100%; padding: 12px; background: var(--v4-primary); color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 15px; cursor: pointer; transition: all 0.2s; }
.reserve-fee { font-size: 12px; color: var(--v4-text-muted); text-align: center; margin-top: 8px; }
.reserve-disclaimer { font-size: 11px; color: var(--v4-text-muted); text-align: center; margin-top: 6px; line-height: 1.3; }
.f-field { margin-bottom: 12px; }
.f-field input { width: 100%; padding: 14px 16px; border-radius: 10px; border: 1px solid var(--v4-border); background: #f5f5f7; font-size: 16px; transition: all 0.2s; }
.f-field input:focus { border-color: var(--v4-primary); outline: none; background: white; }
.f-error {
  color: #ff453a;
  font-size: 13px;
  margin-top: -8px;
  margin-bottom: 12px;
  text-align: center;
  font-weight: 500;
}
.cta-submit-v4 { width: 100%; padding: 16px; background: var(--v4-primary); color: white; border: none; border-radius: 12px; font-weight: 600; font-size: 17px; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
.cta-submit-v4:hover { background: var(--v4-primary-hover); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 113, 227, 0.2); }

/* Broker Info V4 */
.broker-info-v4 { 
  margin-bottom: 16px; 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  background: white; 
  padding: 14px; 
  border-radius: 16px; 
  border: 1px solid var(--v4-border); 
}
.b-avatar { 
  width: 44px; height: 44px; border-radius: 50%; overflow: hidden; 
  background: #f5f5f7; display: flex; align-items: center; justify-content: center; flex-shrink: 0; 
  border: 1px solid var(--v4-border);
}
.b-avatar img { width: 100%; height: 100%; object-fit: cover; }
.b-initial { font-weight: 700; color: var(--v4-primary); font-size: 18px; }
.b-text { display: flex; flex-direction: column; }
.b-label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: var(--v4-text-muted); letter-spacing: 0.5px; }
.b-name { font-size: 15px; font-weight: 700; color: var(--v4-text); line-height: 1.2; }

.form-divider-v4 { text-align: center; font-size: 13px; color: var(--v4-text-muted); margin: 12px 0; }
.wa-btn-v4 { 
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: #25d366;
  color: white;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 15px;
  transition: all 0.2s;
}
.wa-btn-v4:hover { background: #20b858; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37, 211, 102, 0.2); }
.v4-footer { padding: 80px 0; background: var(--v4-bg-alt); border-top: 1px solid var(--v4-border); }
.v4-footer-inner { display: flex; justify-content: space-between; align-items: flex-end; }
@media (max-width: 768px) { .v4-footer-inner { flex-direction: column; align-items: flex-start; gap: 24px; } }
.v4-footer-tenant { font-weight: 600; font-size: 17px; margin-bottom: 4px; display: block; }
.v4-footer-project { font-size: 14px; color: var(--v4-text-muted); }
.v4-footer-copyright { font-size: 12px; color: var(--v4-text-muted); }
.v4-footer { padding: 32px 0;}
.other-assets-v4 { width: 100%; position: relative; margin-bottom: 60px; padding-bottom: 60px; border-bottom: 1px solid var(--v4-border); }
.assets-header-v4 { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 32px; }
.assets-header-v4 h3 { font-size: 24px; font-weight: 600; margin: 0; letter-spacing: -0.02em; }
.assets-header-v4 a { font-size: 14px; font-weight: 600; color: var(--v4-primary); text-decoration: none; }

.other-lots-filters-v4 {
  margin-bottom: 18px;
}

.other-lots-search-v4 {
  width: 100%;
  max-width: 420px;
  border: 1px solid var(--v4-border);
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--v4-text);
  background: #fff;
}

.other-lots-search-v4:focus {
  outline: none;
  border-color: var(--v4-primary);
}

.other-lots-tags-v4 {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.other-lots-tag-v4,
.other-lots-clear-v4 {
  border: 1px solid var(--v4-border);
  border-radius: 999px;
  background: #fff;
  color: var(--v4-text-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  cursor: pointer;
}

.other-lots-tag-v4.is-active {
  border-color: var(--v4-primary);
  color: var(--v4-primary);
  background: #eef6ff;
}

.other-lots-clear-v4 {
  border-style: dashed;
}

.other-lots-empty-v4 {
  margin-top: 12px;
  font-size: 13px;
  color: var(--v4-text-muted);
}

.assets-grid-v4 { 
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.asset-card-v4 { 
  background: #f5f5f7; 
  padding: 24px; 
  border-radius: 20px; 
  border: 1px solid var(--v4-border); 
  text-decoration: none; 
  color: inherit; 
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
}

.asset-card-v4:hover { 
  background: white; 
  transform: translateY(-4px); 
  box-shadow: 0 12px 24px rgba(0,0,0,0.06); 
  border-color: var(--v4-primary); 
}

.a-code { font-size: 17px; font-weight: 700; color: var(--v4-text); }
.a-area { font-size: 14px; color: var(--v4-text-muted); font-weight: 500; }
.a-price { font-size: 18px; font-weight: 700; color: var(--v4-primary); margin-top: 8px; }

/* Simulator Styles */
.simulator-card-v4 {
  background: white;
  border-radius: 24px;
  border: 1px solid var(--v4-border);
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.04);
}
.sim-header {
  padding: 32px;
  background: #f8fafc;
  border-bottom: 1px solid var(--v4-border);
}
.sim-header .h-item { display: flex; flex-direction: column; gap: 4px; }
.sim-header .l { font-size: 14px; color: var(--v4-text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }

.sim-body { padding: 32px; }

.input-group-v4 { display: flex; flex-direction: column; gap: 12px; }
.ig-label { font-size: 16px; font-weight: 600; color: var(--v4-text); }
.ig-flex { display: flex; gap: 12px; flex-wrap: wrap; }
.ig-field { 
  display: flex; 
  align-items: center; 
  background: #f1f5f9; 
  border: 1px solid #e2e8f0; 
  border-radius: 12px; 
  padding: 0 16px;
  transition: all 0.2s;
  flex: 1;
  min-width: 120px;
}
.ig-field:focus-within { border-color: var(--v4-primary); background: white; box-shadow: 0 0 0 4px rgba(var(--v4-primary-rgb), 0.1); }
.ig-curr { font-size: 14px; font-weight: 700; color: #64748b; }
.ig-input { 
  border: none; 
  background: transparent; 
  width: 100%; 
  padding: 12px 8px; 
  font-size: 18px; 
  font-weight: 700; 
  color: var(--v4-text); 
  outline: none;
}
/* Hide arrows in number input */
.ig-input::-webkit-outer-spin-button, .ig-input::-webkit-inner-spin-button { -webkit-appearance: none; appearance: none; margin: 0; }

.ig-hint { font-size: 13px; color: #64748b; margin-top: 4px; }

.range-slider-v4 {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #e2e8f0;
  outline: none;
  margin: 20px 0;
}
.range-slider-v4::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--v4-primary);
  cursor: pointer;
  border: 4px solid white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  transition: transform 0.2s;
}
.range-slider-v4::-webkit-slider-thumb:hover { transform: scale(1.1); }

.slider-labels { display: flex; justify-content: space-between; font-size: 13px; color: #64748b; font-weight: 600; }

.sim-result-v4 {
  margin-top: 40px;
  background: var(--v4-primary-light);
  padding: 32px;
  border-radius: 20px;
  text-align: center;
  border: 1px solid rgba(var(--v4-primary-rgb), 0.1);
}
.r-label { font-size: 15px; font-weight: 600; color: var(--v4-primary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
.r-value { font-size: 42px; font-weight: 800; color: var(--v4-primary); letter-spacing: -1px; overflow-wrap: break-word; }
.r-detail { font-size: 14px; color: var(--v4-primary); opacity: 0.8; font-weight: 600; margin-top: 8px; }

.sim-summary-v4 {
  margin-top: 24px;
  border-top: 1px solid var(--v4-border);
  padding-top: 16px;
}
.summary-item { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: var(--v4-text-muted); }
.summary-item .s-l { font-weight: 500; }
.summary-item .s-v { font-weight: 700; color: var(--v4-text); }

.sim-disclaimer-v4 {
  margin-top: 24px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
  padding: 0 8px;
  text-align: center;
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
.v4-lightbox-caption { margin-top: 10px; color: rgba(255,255,255,0.92); font-size: 14px; text-align: center; }

.lot-plant-map-frame {
  height: 500px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--v4-border);
  position: relative;
}

.interaction-gate-v4 {
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

.interaction-gate-v4__btn {
  border: none;
  background: #ffffff;
  color: #111827;
  font-weight: 700;
  font-size: 14px;
  padding: 10px 16px;
  border-radius: 999px;
  cursor: pointer;
}

.interaction-gate-v4__hint {
  margin: 0;
  color: #e5e7eb;
  font-size: 12px;
  line-height: 1.35;
  max-width: 280px;
}

.interaction-toggle-v4 {
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

.panorama-container-v4 {
  position: relative;
  width: 100%;
  height: clamp(280px, 56.25vw, 600px);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--v4-border);
}

.panorama-container-v4.is-interaction-disabled :deep(.panorama-viewer) {
  pointer-events: none;
}

.v4-sticky-nav {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(29, 29, 31, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  padding: 4px;
  border-radius: 100px;
  display: none;
  align-items: center;
  gap: 2px;
  width: auto;
  min-width: 280px;
  max-width: 92vw;
  z-index: 1000;
  box-shadow: 0 12px 30px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.08);
}

.v4-nav-item {
  color: white;
  text-decoration: none;
  font-size: 11px;
  font-weight: 500;
  padding: 8px 10px;
  border-radius: 100px;
  transition: all 0.2s;
  white-space: nowrap;
}

.v4-nav-cta {
  background: var(--v4-primary);
  flex: 1;
  text-align: center;
  font-weight: 600;
  padding: 8px 12px;
  font-size: 12px;
}

.v4-floating-cta {
  position: fixed;
  bottom: 98px;
  right: 16px;
  z-index: 1000;
}

.v4-sales-motion-toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  z-index: 1001;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: min(92vw, 680px);
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.96);
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.v4-sales-motion-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #16a34a;
  box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.18);
  flex: 0 0 auto;
}

.v4-sales-motion-fade-enter-active,
.v4-sales-motion-fade-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.v4-sales-motion-fade-enter-from,
.v4-sales-motion-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

.v4-cta-btn-animated {
  display: block;
  text-decoration: none;
  background: white;
  padding: 2px;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
}

.v4-cta-btn-animated::before {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(transparent, var(--v4-primary), #00c3ff, var(--v4-primary), transparent 30%);
  animation: rotate-border 4s linear infinite;
  z-index: 1;
}

.v4-cta-inner {
  position: relative;
  z-index: 2;
  background: white;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.v4-cta-icon-spark { font-size: 24px; }
.v4-cta-label, .v4-cta-arrow-icon, .v4-cta-glow { display: none; }

@keyframes rotate-border {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .v4-sticky-nav { display: flex; }

  .v4-sales-motion-toast {
    bottom: 132px;
    max-width: calc(100vw - 24px);
    padding: 10px 12px;
    font-size: 12px;
    border-radius: 14px;
    text-align: center;
  }

  .other-assets-v4 { margin-bottom: 32px; padding-bottom: 0; } 
  .hero-v4, .section-v4 { padding: 20px; border-radius: 20px; }
  .hero-header-row { flex-direction: column; align-items: flex-start; gap: 24px; margin-bottom: 32px; }
  .lot-code-title { font-size: 32px; }
  .hero-price-box { width: 100%; align-items: flex-start; text-align: left; padding: 20px; }
  .hp-value { font-size: 26px; }

  .quick-metrics-v4 { 
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 24px;
    width: 100%;
  }
  .q-val { font-size: 18px; }
  .q-unit { font-size: 10px; }
  
  .split-view { padding: 20px 16px 40px; gap: 0; }
  
  .r-value { font-size: 26px !important; letter-spacing: -0.5px; word-break: break-all; }
  .r-label { font-size: 13px; }
  .sim-result-v4 { padding: 20px 12px; margin-top: 24px; }
  .sim-body, .sim-header { padding: 20px 16px; }
  .ig-input { font-size: 16px; }
  
  .sticky-conversion-card { 
    position: static; 
    max-height: none; 
    overflow: visible; 
    padding: 0;
  }
  
  .lot-header-v4 { 
    padding: 8px 0; 
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .header-inner { padding: 0 14px; gap: 8px; }
  .back-link-v4 span { display: none; }
  .back-link-v4::after { content: "Ver Todos"; margin-left: 4px; }
  
  .project-tags { gap: 4px; font-size: 10px; }
  .tag-tenant { display: none; }
  .tag-pname { padding: 3px 8px; max-width: 100%; }

  .section-title-v4 { margin-bottom: 24px; gap: 12px; }
  .section-title-v4 h2 { font-size: 20px; }

  .panorama-container-v4 {
    height: clamp(220px, 56vw, 320px);
  }

  .lot-plant-map-frame {
    height: 420px;
  }
  
  .gallery-v4 { grid-template-columns: 1fr 1fr; grid-auto-rows: 140px; }
  
  .spec-entry { padding: 16px; }
  .spec-entry .s-value { font-size: 17px; }
  
  .finance-body { padding: 0 20px 24px; }
  .h-item { padding: 24px 20px; }
  .h-item .v { font-size: 28px; }
  .plan-group { margin-bottom: 24px; padding-top: 20px; }
  .group-label { font-size: 16px; margin-bottom: 16px; }
  .plans-grid { grid-template-columns: 1fr; }
  .plan-pill { padding: 14px 18px; }
  
  .lead-form-v4 { padding: 24px 20px; border-radius: 20px; }
  .form-header-v4 h3 { font-size: 20px; }

  .assets-grid-v4 { grid-template-columns: repeat(2, 1fr) !important; gap: 8px; }
  .asset-card-v4 { padding: 12px; border-radius: 14px; gap: 4px; }
  .a-code { font-size: 13px; }
  .a-area { font-size: 11px; }
  .a-price { font-size: 14px; margin-top: 2px; }
}

@media (min-width: 769px) {
  .v4-floating-cta { display: none; }
}

/* Booking & Reservation Styles */
.booking-section-v4 {
  background: rgba(0, 113, 227, 0.05);
  border: 1px solid rgba(0, 113, 227, 0.2);
  border-radius: var(--v4-radius-md);
  padding: 20px;
  margin-bottom: 24px;
}

.h-reserve-v4 {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--v4-primary);
  font-weight: 600;
  margin-bottom: 12px;
}

.cta-reserve-v4 {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: var(--v4-primary);
  color: white;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  margin-top: 12px;
  transition: all 0.2s ease;
}

.cta-reserve-v4:hover {
  background: var(--v4-primary-hover);
}

.reserve-fee {
  text-align: center;
  font-size: 12px;
  color: var(--v4-text-muted);
  margin-top: 8px;
}

.reserve-disclaimer {
  text-align: center;
  font-size: 11px;
  color: var(--v4-text-muted);
  margin-top: 6px;
  line-height: 1.3;
}

.booking-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.booking-header h4 {
  margin: 0;
  font-size: 16px;
}

.booking-header .back-link {
  background: none;
  border: none;
  color: var(--v4-primary);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}

.cta-submit-booking-v4 {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: #28a745;
  color: white;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  margin-top: 16px;
  transition: all 0.2s ease;
}

.cta-submit-booking-v4:hover {
  background: #218838;
}

.f-checkbox {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  color: var(--v4-text-muted);
  margin-top: 12px;
}

.f-checkbox input {
  margin-top: 3px;
}

/* Ideal Lot Filter Modal */
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
  animation: lot-slide-up 0.35s cubic-bezier(0.165, 0.84, 0.44, 1);
}

@media (min-width: 769px) {
  .v4-filter-modal-card {
    border-radius: 28px;
    padding: 40px;
    max-height: 90dvh;
    box-shadow: 0 30px 60px rgba(0,0,0,0.15);
    animation: lot-modal-appear 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  }
}

@keyframes lot-slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes lot-modal-appear {
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
  border: 1px solid #d2d2d7;
  padding: 10px 18px;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.v4-modal-tag:hover { background: #e8e8ed; }
.v4-modal-tag.active { background: #0071e3; color: white; border-color: #0071e3; }

.v4-modal-options {
  background: #f5f5f7;
  padding: 16px;
  border-radius: 16px;
}
.v4-modal-option { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.v4-modal-option input[type="checkbox"] { width: 20px; height: 20px; cursor: pointer; }
.v4-option-info { display: flex; flex-direction: column; }
.v4-option-title { font-size: 14px; font-weight: 600; color: #1d1d1f; }
.v4-option-desc { font-size: 12px; color: #86868b; }

.v4-modal-footer { display: flex; flex-direction: column; gap: 12px; flex-shrink: 0; }

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

.fade-lot-modal-enter-active, .fade-lot-modal-leave-active { transition: opacity 0.3s; }
.fade-lot-modal-enter-from, .fade-lot-modal-leave-to { opacity: 0; }
</style>

