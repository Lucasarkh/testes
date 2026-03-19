<template>
  <section id="plant-lots-manager" class="plm">
    <div class="plm__header">
      <div>
        <span class="plm__eyebrow">Configuracao centralizada</span>
        <h2 class="plm__title">Lotes da Planta Interativa</h2>
        <p class="plm__subtitle">
          Os spots criados na planta entram aqui para configuracao detalhada, com a mesma paginacao e o mesmo modal de edicao dos lotes.
        </p>
      </div>

      <button class="btn btn-sm btn-outline" :disabled="loadingLots" @click="refreshLots()">
        {{ loadingLots ? 'Atualizando...' : 'Atualizar lista' }}
      </button>
    </div>

    <div v-if="loadingLots" class="loading-state plm__loading">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="lots.length === 0" class="card plm__empty">
      <div class="icon-blob"><i class="bi bi-map" aria-hidden="true"></i></div>
      <h3>Nenhum lote criado ainda</h3>
      <p>Clique na planta para criar spots do tipo lote. Assim que forem criados, eles aparecem aqui para configuracao detalhada.</p>
    </div>

    <template v-else>
      <div class="lot-import-card">
        <div class="lot-import-card__head">
          <div>
            <h4>Importacao de Lotes (CSV ou Excel)</h4>
            <p>Envie CSV, XLSX ou XLS. Se for Excel, convertemos automaticamente para CSV antes do envio.</p>
          </div>
          <div class="lot-import-card__actions" v-if="authStore.canEdit">
            <button class="btn btn-sm btn-outline" @click="downloadLotCsvTemplate">Baixar modelo</button>
            <button
              class="btn btn-sm btn-primary"
              :disabled="!authStore.canEdit || uploadingLotCsv || !!activeLotImportRunning"
              :title="!authStore.canEdit ? 'Disponivel apenas para usuarios com permissao de edicao' : undefined"
              @click="openLotCsvPicker"
            >
              {{ uploadingLotCsv ? 'Enviando...' : 'Importar Arquivo' }}
            </button>
            <input
              ref="lotCsvInputRef"
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style="display: none"
              @change="handleLotCsvSelected"
            />
          </div>
        </div>

        <div class="lot-import-help">
          <p><strong>Formato recomendado:</strong> use o modelo e mantenha os nomes das colunas em portugues.</p>
          <p><strong>Valores aceitos:</strong> status = DISPONIVEL, RESERVADO ou VENDIDO | topografia = PLANO, ACLIVE ou DECLIVE.</p>
          <p><strong>Campos obrigatorios:</strong> apenas <code>codigo</code>. Campos como <code>tags</code> e <code>observacoes</code> sao opcionais.</p>
          <p><strong>Observacao:</strong> a coluna <code>codigo</code> precisa bater com o codigo do lote criado na planta e nao pode ter acentuacao.</p>
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

      <div class="plm__notice">
        <span>ℹ️</span>
        Todos os pontos criados na Planta Interativa aparecem nesta lista para que voce adicione fotos, precos e dados do contrato.
      </div>

      <div class="plm__toolbar">
        <div class="plm__toolbar-search">
          <input
            v-model="lotSearch"
            class="form-input"
            placeholder="Buscar por quadra, lote, codigo ou status"
          />
        </div>
        <label class="plm__toggle">
          <input v-model="groupLotsByBlock" type="checkbox" />
          Agrupar por quadra
        </label>
      </div>

      <div class="table-wrapper plm__table-wrap">
        <table>
          <thead>
            <tr>
              <th>Quadra/Lote</th>
              <th>Status</th>
              <th>Valor M²</th>
              <th>Total</th>
              <th>Entrada/Ato</th>
              <th>Area</th>
              <th v-if="authStore.canEdit">Acoes</th>
            </tr>
          </thead>
          <tbody v-for="group in groupedLots" :key="group.key">
            <tr v-if="groupLotsByBlock" class="plm__group-row">
              <td :colspan="authStore.canEdit ? 7 : 6">
                <div class="plm__group-title">{{ group.label }} <span>({{ group.items.length }})</span></div>
              </td>
            </tr>
            <tr v-for="l in group.items" :key="l.id">
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
                {{ l.price ? formatCurrencyToBrasilia(Number(l.price) * downPaymentFactor) : '—' }}
              </td>
              <td style="font-weight: 500;">{{ l.areaM2 ? `${l.areaM2.toFixed(2)} m²` : '—' }}</td>
              <td v-if="authStore.canEdit">
                <div class="flex gap-2 plm__actions">
                  <button class="btn btn-sm btn-dark" style="background: var(--glass-bg-heavy); color: #fff; border: none;" @click="openEditLot(l)">Editar Dados</button>
                  <button class="btn btn-sm btn-outline" :disabled="duplicatingLotId === l.id" @click="duplicateLot(l)">{{ duplicatingLotId === l.id ? 'Duplicando...' : 'Duplicar' }}</button>
                  <button class="btn btn-sm btn-outline" @click="shareLot(l)">Compartilhar</button>
                  <button class="btn btn-sm btn-outline" @click="openLotQrModal(l)">QR Code</button>
                  <button v-if="l.status === 'RESERVED'" class="btn btn-sm btn-warning" @click="openReservationModal(l)">Abrir Reservas</button>
                  <a v-if="lotPublicPageUrl(l)" :href="lotPublicPageUrl(l)" target="_blank" class="btn btn-sm btn-outline">Ver Pagina</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <CommonPagination :meta="lotsMeta" @change="loadLotsPaginated" />
      </div>
    </template>

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
              <p><strong>Codigo:</strong> {{ reservationData.realtorLink?.code || '—' }}</p>
              <p v-if="reservationData.realtorLink?.imobiliaria"><strong>Imobiliaria:</strong> {{ reservationData.realtorLink.imobiliaria }}</p>
            </div>
            <div class="reservation-section">
              <p class="reservation-section-label">Datas & Condicoes</p>
              <p><strong>Reservado em:</strong> {{ reservationData.createdAt ? formatDateTimeToBrasilia(reservationData.createdAt) : '—' }}</p>
              <p v-if="projectValue?.reservationExpiryHours && reservationData.createdAt">
                <strong>Expira em:</strong> {{ reservationExpiry(reservationData.createdAt) }}
              </p>
              <p v-if="projectValue?.reservationFeeValue">
                <strong>Taxa de Reserva:</strong>
                {{ projectValue.reservationFeeType === 'PERCENTAGE'
                  ? `${projectValue.reservationFeeValue}%`
                  : formatCurrencyToBrasilia(projectValue.reservationFeeValue) }}
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
            <a class="btn btn-sm btn-primary" :href="lotQrModal.publicPageUrl" target="_blank">Abrir Pagina</a>
          </div>
        </div>
      </div>
    </div>

    <div v-if="editingLot" class="modal-overlay lot-edit-overlay">
      <div class="modal lot-edit-modal" style="max-width: 960px;">
        <div class="modal-header lot-edit-modal__header">
          <div>
            <span class="lot-edit-modal__eyebrow">Editor de lote</span>
            <h3>Editar Lote: {{ editingLot.mapElement?.code || editingLot.id }}</h3>
            <p class="lot-edit-modal__subtitle">Ajuste dados comerciais, galeria e panorama 360 com visual mais limpo e leitura mais forte.</p>
            <div class="lot-edit-modal__code-row">
              <span class="lot-edit-modal__code-label">Codigo do lote</span>
              <span class="lot-edit-modal__code-value">{{ editingLot.mapElement?.code || '—' }}</span>
            </div>
          </div>
          <button class="modal-close lot-edit-modal__close" @click="closeEditingLot">✕</button>
        </div>
        <fieldset class="lot-edit-modal__fieldset" :disabled="!authStore.canEdit || isArchivedProject">
          <div class="grid grid-cols-2" style="gap: 16px; margin-top: 16px;">
            <div class="form-group">
              <label class="form-label">Codigo do lote</label>
              <input :value="editingLot.mapElement?.code || '—'" class="form-input" readonly />
            </div>
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
                <option value="AVAILABLE">Disponivel</option>
                <option value="RESERVED">Reservado</option>
                <option value="SOLD">Vendido</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Valor do M² (R$)</label>
              <input v-model.number="lotForm.pricePerM2" type="number" step="0.01" class="form-input" placeholder="0.00" @input="calculatePriceFromM2" />
            </div>
            <div class="form-group">
              <label class="form-label">Preco Total (R$)</label>
              <input v-model.number="lotForm.price" type="number" step="0.01" class="form-input" placeholder="0.00" @input="calculateM2FromPrice" />
            </div>
          </div>

          <div style="margin-top: 16px;">
            <h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 12px;">Medidas para Contrato</h4>
            <div v-if="lotContractArea !== null" style="background: rgba(59, 130, 246, 0.1); border:1px solid rgba(59, 130, 246, 0.3); border-radius:6px; padding:8px 14px; margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.75rem; font-weight:700; color:#3b82f6; text-transform:uppercase; letter-spacing:0.3px;">Area Calculada</span>
              <span style="font-size:0.95rem; font-weight:700; color: #60a5fa;">{{ lotContractArea.toFixed(2) }} m²</span>
            </div>
            <div v-if="editingLotSideMetrics.length > 0" style="margin-bottom: 12px;">
              <div style="font-size:0.7rem; font-weight:700; color:var(--color-surface-400); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Lados do Lote (do editor)</div>
              <div style="display:flex; flex-wrap:wrap; gap:6px;">
                <div v-for="(s, i) in editingLotSideMetrics" :key="i" style="background: var(--glass-bg-heavy); border:1px solid var(--glass-border-subtle); border-radius:6px; padding:4px 10px; display:flex; align-items:center; gap:8px;">
                  <span style="font-size:0.75rem; color:var(--color-surface-400);">{{ s.label }}</span>
                  <span v-if="s.meters != null" style="font-size:0.875rem; font-weight:600; color:var(--color-surface-100);">{{ Number(s.meters).toFixed(2) }} m</span>
                  <span v-else style="font-size:0.75rem; color:var(--color-surface-500); font-style:italic;">—</span>
                </div>
              </div>
              <p style="font-size:0.7rem; color:var(--color-surface-500); margin-top:8px;">A frente do lote agora e definida no editor da planta, arrastando a seta no hotspot.</p>
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
                <label class="form-label">Fundo (m) <small>se diferente da frente</small></label>
                <input v-model.number="lotForm.depth" type="number" step="0.01" class="form-input" placeholder="= Frente" />
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label">Lado Direito (m) <small>se diferente</small></label>
                <input v-model.number="lotForm.sideRight" type="number" step="0.01" class="form-input" placeholder="= Lado Esq." />
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label">Inclinacao</label>
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
              <div
                v-for="(tag, idx) in (lotForm.tags || [])"
                :key="idx"
                style="background: rgba(59, 130, 246, 0.1); color: #60a5fa; padding: 3px 10px; border-radius: 99px; font-size: 0.7rem; font-weight: 600; display: flex; align-items: center; gap: 4px;"
              >
                {{ tag }}
                <span @click="lotForm.tags.splice(idx, 1)" style="cursor: pointer; opacity: 0.6; font-size: 0.8rem;">✕</span>
              </div>
              <div v-if="!(lotForm.tags?.length)" style="font-size: 0.75rem;">Nenhum selo cadastrado.</div>
            </div>

            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <input v-model="newTag" @keyup.enter="addTag" type="text" class="form-input btn-sm" style="flex: 1; height: 32px; font-size: 0.85rem;" placeholder="Novo selo (ex: sol da manha)..." />
              <button @click="addTag" class="btn btn-sm btn-secondary" style="height: 32px; padding: 0 12px; font-size: 0.85rem;">Adicionar</button>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button
                v-for="suggestion in ['sol da manha', 'esquina', 'vista livre', 'proximo a portaria', 'fundo para area verde']"
                :key="suggestion"
                @click="addSuggestedTag(suggestion)"
                class="btn btn-xs btn-outline"
                style="font-size: 9px; padding: 4px 6px; border-color: #fff;"
              >
                + {{ suggestion }}
              </button>
            </div>
          </div>

          <div class="form-group" style="margin-top: 24px;">
            <label class="form-label">Notas / Descricao</label>
            <textarea v-model="lotForm.notes" class="form-textarea" rows="3" placeholder="Informacoes adicionais do lote..."></textarea>
          </div>

          <hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--glass-border-subtle);" />

          <section class="lot-edit-section">
            <div class="lot-edit-section__head">
              <div>
                <h4 style="margin-bottom: 12px;">Fotos do Lote</h4>
                <p class="lot-edit-section__hint">Envie uma ou varias imagens da galeria deste lote de uma vez.</p>
              </div>
              <span class="lot-edit-section__badge">{{ lotMedias.length }} {{ lotMedias.length === 1 ? 'imagem' : 'imagens' }}</span>
            </div>
            <div v-if="lotMedias.length === 0" class="empty-state lot-edit-empty" style="padding: 16px; background: var(--glass-bg-heavy); border-radius: 12px; margin-bottom: 16px;">
              <p>Nenhuma foto especifica deste lote.</p>
            </div>
            <div v-else class="grid grid-cols-4 lot-edit-gallery-grid" style="gap: 12px; margin-bottom: 16px;">
              <div v-for="m in lotMedias" :key="m.id" class="media-card-v4">
                <img :src="m.url" class="media-thumb-v4" loading="eager" decoding="async" @error="retryMediaPreviewLoad" />
                <button class="media-delete-btn-v4" @click="removeLotMedia(m.id)">✕</button>
              </div>
            </div>

            <label class="btn btn-secondary btn-sm lot-edit-upload-btn" style="cursor:pointer; width: fit-content;">
              {{ lotMediaUploadLabel }}
              <input type="file" accept="image/*" multiple style="display:none" @change="uploadLotMediaFile" :disabled="uploadingLotMedia" />
            </label>
          </section>

          <hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--glass-border-subtle);" />

          <section class="lot-edit-section lot-edit-section--panorama">
            <div class="lot-edit-section__head">
              <div>
                <h4 style="margin-bottom: 12px;"><i class="bi bi-image-fill" aria-hidden="true"></i> Panorama 360° do Lote</h4>
                <p class="lot-edit-section__hint">A imagem 360 fica isolada da galeria comum para nao misturar fotos estaticas com a vista panoramica.</p>
              </div>
              <span class="lot-edit-section__badge">{{ lotForm.panoramaUrl ? '360 ativo' : 'sem 360' }}</span>
            </div>
            <div v-if="lotForm.panoramaUrl" class="media-card-v4 lot-edit-panorama-card" style="max-width: 240px; margin-bottom: 16px;">
              <div class="relative group">
                <img :src="lotForm.panoramaUrl" class="media-thumb-v4" style="aspect-ratio: 2/1;" loading="eager" decoding="async" @error="retryMediaPreviewLoad" />
                <button class="media-delete-btn-v4" @click="clearLotPanoramaSelection">✕</button>
                <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none">
                  <span class="text-white text-xs font-bold">Vista 360° Ativa</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state lot-edit-empty" style="padding: 16px; background: var(--glass-bg-heavy); border-radius: 12px; margin-bottom: 16px;">
              <p>Nenhuma imagem 360° enviada para este lote.</p>
            </div>

            <label class="btn btn-secondary btn-sm lot-edit-upload-btn" style="cursor:pointer; width: fit-content;">
              {{ panoramaUploadLabel }}
              <input type="file" accept="image/*" style="display:none" @change="uploadLotPanoramaFile" :disabled="uploadingPanorama" />
            </label>
          </section>

          <div class="modal-actions lot-edit-modal__actions">
            <button class="btn btn-secondary lot-edit-btn-secondary" style="background: var(--glass-bg-heavy); color: var(--color-surface-200); border: 1px solid var(--glass-border-subtle);" @click="closeEditingLot">Cancelar</button>
            <button class="btn btn-primary lot-edit-btn-primary" style="background: var(--color-primary-600); color: #fff; border: none; font-weight: 600;" :disabled="!authStore.canEdit || savingLot" :title="!authStore.canEdit ? 'Disponivel apenas para usuarios com permissao de edicao' : undefined" @click="saveLotDetails">
              {{ savingLot ? 'Salvando...' : 'Salvar Detalhes' }}
            </button>
          </div>
        </fieldset>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePlantMapApi } from '~/composables/plantMap/usePlantMapApi'

const props = defineProps<{
  projectId: string
  project?: any | null
}>()

const emit = defineEmits<{
  (e: 'map-changed'): void
}>()

const { fetchApi, uploadApi } = useApi()
const plantMapApi = usePlantMapApi()
const authStore = useAuthStore()
const { success: toastSuccess, fromError: toastFromError } = useToast()

const loadingLots = ref(true)
const lots = ref<any[]>([])
const lotsMeta = ref({ totalItems: 0, itemCount: 0, itemsPerPage: 50, totalPages: 0, currentPage: 1 })
const lotCsvInputRef = ref<HTMLInputElement | null>(null)
const uploadingLotCsv = ref(false)
const activeLotImport = ref<any>(null)
let lotImportPollTimer: ReturnType<typeof setInterval> | null = null
const lotSearch = ref('')
const groupLotsByBlock = ref(true)
const duplicatingLotId = ref<string | null>(null)

const editingLot = ref<any>(null)
const viewingReservation = ref<any>(null)
const reservationData = ref<any>(null)
const reservationLoading = ref(false)
const lotQrModal = ref<null | {
  code: string
  publicPageUrl: string
  qrCodeUrl: string
  shareText: string
}>(null)

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
  paymentConditions: null as any,
})
const savingLot = ref(false)
const uploadingLotMedia = ref(false)
const uploadingPanorama = ref(false)
const lotMediaUploadProgress = ref<{ current: number; total: number } | null>(null)

const projectValue = computed(() => props.project ?? {})
const isArchivedProject = computed(() => {
  const slug = String(projectValue.value?.slug || '').toLowerCase()
  const name = String(projectValue.value?.name || '').toLowerCase()
  return slug.startsWith('archived-') || name.startsWith('[arquivado]')
})
const downPaymentFactor = computed(() => Number(projectValue.value?.minDownPaymentPercent ?? 10) / 100)

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

const filteredLots = computed(() => {
  const search = lotSearch.value.trim().toLowerCase()
  if (!search) return lots.value

  return lots.value.filter((lot: any) => {
    const candidates = [lot.block, lot.lotNumber, lot.mapElement?.code, lot.mapElement?.name, lot.status, lot.id]
    return candidates.some((value) => String(value || '').toLowerCase().includes(search))
  })
})

const groupedLots = computed(() => {
  if (!groupLotsByBlock.value) {
    return [{ key: '__all__', label: 'Todos os lotes', items: filteredLots.value }]
  }

  const groups = new Map<string, { key: string; label: string; items: any[]; order: number }>()

  for (const lot of filteredLots.value) {
    const block = String(lot.block || '').trim()
    const key = block ? `block:${block.toUpperCase()}` : 'block:__sem_quadra__'
    const label = block ? `Quadra ${block}` : 'Sem quadra'
    const order = block ? 0 : 1

    if (!groups.has(key)) groups.set(key, { key, label, items: [], order })
    groups.get(key)!.items.push(lot)
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })
  })
})

const lotMediaUploadLabel = computed(() => {
  if (!uploadingLotMedia.value) return '+ Adicionar Fotos do Lote'
  if (!lotMediaUploadProgress.value) return 'Enviando fotos...'
  const { current, total } = lotMediaUploadProgress.value
  return total > 1 ? `Enviando ${current}/${total}...` : 'Enviando foto...'
})

const panoramaUploadLabel = computed(() => {
  if (uploadingPanorama.value) return 'Enviando 360...'
  return lotForm.value.panoramaUrl ? 'Alterar Imagem 360°' : '+ Adicionar Imagem 360°'
})

const editingLotSideMetrics = computed(() => {
  const raw = editingLot.value?.sideMetricsJson
  if (!Array.isArray(raw) || raw.length === 0) return []
  return raw
})

const lotContractArea = computed(() => {
  const f = lotForm.value.frontage
  if (!f) return null
  const back = lotForm.value.depth ?? f
  const sideLeft = lotForm.value.sideLeft
  if (!sideLeft) return null
  const sideRight = lotForm.value.sideRight ?? sideLeft
  return ((f + back) / 2) * ((sideLeft + sideRight) / 2)
})

const lotMedias = computed(() => {
  if (!editingLot.value) return []
  const medias = Array.isArray(editingLot.value.medias) ? editingLot.value.medias : []
  const panoramaUrl = lotForm.value.panoramaUrl

  return medias.filter((media: any) => {
    const caption = String(media?.caption || '').toLowerCase()
    if (panoramaUrl && media?.url === panoramaUrl) return false
    if (caption.includes('lot_panorama_360') || caption.includes('panorama_360') || caption.includes('panorama 360')) return false
    return true
  })
})

const normalizeFrontEdgeIndex = (value: unknown, edgeCount: number) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || edgeCount < 1) return null
  return ((parsed % edgeCount) + edgeCount) % edgeCount
}

const formatCurrencyToBrasilia = (val: number | string) => {
  if (!val) return '---'
  const num = typeof val === 'string' ? parseFloat(val) : val
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
}

const formatDateTimeToBrasilia = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

const reservationExpiry = (createdAt: string) => {
  if (!projectValue.value?.reservationExpiryHours) return '—'
  const expiry = new Date(new Date(createdAt).getTime() + Number(projectValue.value.reservationExpiryHours) * 3600000)
  return formatDateTimeToBrasilia(expiry.toISOString())
}

const lotBadge = (status: string) => ({ AVAILABLE: 'badge-success', RESERVED: 'badge-warning', SOLD: 'badge-danger' }[status] || 'badge-neutral')
const lotLabel = (status: string) => ({ AVAILABLE: 'Disponivel', RESERVED: 'Reservado', SOLD: 'Vendido' }[status] || status)

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

const loadLotsPaginated = async (page = 1, manageLoading = true) => {
  if (manageLoading) loadingLots.value = true
  try {
    const res = await fetchApi(`/projects/${props.projectId}/lots?page=${page}&limit=50`)
    lots.value = res.data
    lotsMeta.value = res.meta
  } catch (e) {
    toastFromError(e, 'Erro ao carregar lotes')
  } finally {
    if (manageLoading) loadingLots.value = false
  }
}

const refreshLots = async (page = lotsMeta.value.currentPage || 1) => {
  await loadLotsPaginated(page)
}

const loadLatestImport = async () => {
  activeLotImport.value = await fetchApi(`/projects/${props.projectId}/lots/imports/latest`).catch(() => null)
}

const loadInitialData = async () => {
  loadingLots.value = true
  try {
    await Promise.all([
      loadLotsPaginated(1, false),
      loadLatestImport(),
    ])

    if (activeLotImport.value && !activeLotImport.value.terminal) {
      startLotImportPolling(activeLotImport.value.id)
    }
  } finally {
    loadingLots.value = false
  }
}

const startLotImportPolling = (importId: string) => {
  stopLotImportPolling()

  const poll = async () => {
    try {
      const status = await fetchApi(`/projects/${props.projectId}/lots/imports/${importId}`)
      activeLotImport.value = status

      if (status?.terminal) {
        stopLotImportPolling()
        await refreshLots(lotsMeta.value.currentPage || 1)
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

  void poll()
  lotImportPollTimer = setInterval(() => {
    void poll()
  }, 2000)
}

const openLotCsvPicker = () => {
  if (!authStore.canEdit) return
  lotCsvInputRef.value?.click()
}

const isExcelFile = (file: File) => {
  const name = file.name.toLowerCase()
  const type = String(file.type || '').toLowerCase()
  return (
    name.endsWith('.xlsx')
    || name.endsWith('.xls')
    || type.includes('spreadsheetml')
    || type.includes('application/vnd.ms-excel')
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
    let uploadFile = file
    if (isExcelFile(file)) {
      uploadFile = await convertExcelToCsvFile(file)
    }

    const formData = new FormData()
    formData.append('file', uploadFile, uploadFile.name)
    const job = await uploadApi(`/projects/${props.projectId}/lots/imports`, formData)
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
  link.download = `modelo-importacao-lotes-${props.projectId}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const downloadLotImportErrorsCsv = async () => {
  if (!activeLotImport.value?.id) return
  try {
    const errors = await fetchApi(`/projects/${props.projectId}/lots/imports/${activeLotImport.value.id}/errors?limit=5000`)
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

const buildNextLotIdentity = () => {
  const existingNumbers = lots.value
    .map((lot: any) => String(lot.lotNumber || lot.mapElement?.code || lot.mapElement?.name || ''))
    .map((text) => text.match(/(\d+)(?!.*\d)/))
    .map((match) => (match?.[1] ? Number.parseInt(match[1], 10) : null))
    .filter((value): value is number => Number.isInteger(value))

  const nextNumber = (existingNumbers.length ? Math.max(...existingNumbers) : 0) + 1
  const padded = String(nextNumber).padStart(2, '0')

  return {
    code: `L-${padded}`,
    lotNumber: padded,
  }
}

const addTag = () => {
  if (!newTag.value) return
  if (!lotForm.value.tags) lotForm.value.tags = []
  const normalizedTag = newTag.value.trim().toLowerCase()
  if (!lotForm.value.tags.includes(normalizedTag)) {
    lotForm.value.tags.push(normalizedTag)
  }
  newTag.value = ''
}

const addSuggestedTag = (tag: string) => {
  if (!lotForm.value.tags) lotForm.value.tags = []
  const normalizedTag = tag.toLowerCase()
  if (!lotForm.value.tags.includes(normalizedTag)) {
    lotForm.value.tags.push(normalizedTag)
  }
}

const resetLotUploadStates = () => {
  uploadingLotMedia.value = false
  uploadingPanorama.value = false
  lotMediaUploadProgress.value = null
}

const closeEditingLot = () => {
  resetLotUploadStates()
  editingLot.value = null
}

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

watch(() => editingLot.value?.id ?? null, () => {
  resetLotUploadStates()
})

const openEditLot = (lot: any) => {
  resetLotUploadStates()
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
    paymentConditions: lot.paymentConditions ? JSON.parse(JSON.stringify(lot.paymentConditions)) : null,
  }
}

const openLotByMapElementId = async (mapElementId: string) => {
  try {
    const lot = await fetchApi(`/projects/${props.projectId}/lots/${mapElementId}`)
    openEditLot(lot)
  } catch (e) {
    toastFromError(e, 'Nao foi possivel abrir os dados deste lote')
  }
}

const duplicateLot = async (lot: any) => {
  if (!authStore.canEdit) return

  duplicatingLotId.value = lot.id
  try {
    const plantMap = await plantMapApi.getPlantMap(props.projectId)
    const sourceHotspot = plantMap?.hotspots?.find((item: any) => item.linkId === lot.mapElementId)

    if (!plantMap?.id || !sourceHotspot) {
      throw new Error('Nao foi possivel localizar o spot original deste lote na planta.')
    }

    const identity = buildNextLotIdentity()
    const createdHotspot = await plantMapApi.createHotspot(plantMap.id, {
      type: 'LOTE',
      title: identity.code,
      description: sourceHotspot.description || '',
      x: Math.min(0.99, Number(sourceHotspot.x || 0) + 0.02),
      y: Math.min(0.99, Number(sourceHotspot.y || 0) + 0.02),
      label: identity.code,
      labelEnabled: sourceHotspot.labelEnabled ?? true,
      labelOffsetX: sourceHotspot.labelOffsetX ?? 0,
      labelOffsetY: sourceHotspot.labelOffsetY ?? -24,
      loteStatus: lot.status || 'AVAILABLE',
      metaJson: sourceHotspot.metaJson || {},
    })

    if (!createdHotspot?.linkId) {
      throw new Error('O novo lote foi criado sem vinculo de mapa.')
    }

    await fetchApi(`/projects/${props.projectId}/lots/${createdHotspot.linkId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: lot.status,
        block: lot.block || undefined,
        lotNumber: identity.lotNumber,
        price: lot.price != null ? Number(lot.price) : undefined,
        pricePerM2: lot.pricePerM2 != null ? Number(lot.pricePerM2) : undefined,
        areaM2: lot.areaM2 != null ? Number(lot.areaM2) : undefined,
        frontage: lot.frontage != null ? Number(lot.frontage) : undefined,
        depth: lot.depth != null ? Number(lot.depth) : undefined,
        sideLeft: lot.sideLeft != null ? Number(lot.sideLeft) : undefined,
        sideRight: lot.sideRight != null ? Number(lot.sideRight) : undefined,
        slope: lot.slope,
        notes: lot.notes || undefined,
        tags: Array.isArray(lot.tags) ? [...lot.tags] : [],
        panoramaUrl: lot.panoramaUrl || null,
        paymentConditions: lot.paymentConditions ? JSON.parse(JSON.stringify(lot.paymentConditions)) : undefined,
      }),
    })

    await refreshLots(1)
    emit('map-changed')
    toastSuccess(`Lote ${identity.code} duplicado com sucesso!`)
  } catch (e) {
    toastFromError(e, 'Erro ao duplicar lote')
  } finally {
    duplicatingLotId.value = null
  }
}

const saveLotDetails = async () => {
  if (!authStore.canEdit || !editingLot.value) return
  savingLot.value = true
  try {
    const calc = lotContractArea.value
    const toNum = (value: any) => (value != null ? Number(value) : undefined)
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
    if (calc !== null) {
      payload.areaM2 = Math.round(calc * 100) / 100
    }

    const updated = await fetchApi(`/projects/${props.projectId}/lots/${editingLot.value.mapElementId}`, {
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

        updatedMapElement = await fetchApi(`/projects/${props.projectId}/map-elements/${editingLot.value.mapElement.id}`, {
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
      }
    }

    const idx = lots.value.findIndex((lot: any) => lot.id === editingLot.value.id)
    if (idx !== -1) {
      lots.value[idx] = {
        ...lots.value[idx],
        ...updated,
        frontEdgeIndex: normalizeFrontEdgeIndex(lotForm.value.frontEdgeIndex, editingLotSideMetrics.value.length),
        ...(updatedMapElement ? { mapElement: updatedMapElement } : {}),
      }
    }

    toastSuccess('Detalhes do lote salvos!')
    closeEditingLot()
    await refreshLots(lotsMeta.value.currentPage || 1)
  } catch (e) {
    toastFromError(e, 'Erro ao salvar detalhes do lote')
  } finally {
    savingLot.value = false
  }
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

const uploadLotMediaFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length || !editingLot.value) return
  const targetLot = editingLot.value
  uploadingLotMedia.value = true
  lotMediaUploadProgress.value = { current: 0, total: files.length }
  try {
    const uploadedMedias: any[] = []
    for (const [index, file] of files.entries()) {
      lotMediaUploadProgress.value = { current: index + 1, total: files.length }
      const formData = new FormData()
      formData.append('file', file)
      const media = await uploadApi(`/projects/${props.projectId}/media?lotDetailsId=${targetLot.id}`, formData)
      uploadedMedias.push(media)
    }

    if (editingLot.value?.id === targetLot.id) {
      const currentMedias = Array.isArray(editingLot.value.medias) ? editingLot.value.medias : []
      editingLot.value.medias = [...uploadedMedias, ...currentMedias]
    }

    toastSuccess(uploadedMedias.length > 1 ? `${uploadedMedias.length} fotos do lote enviadas!` : 'Foto do lote enviada!')
  } catch (e) {
    toastFromError(e, 'Erro ao enviar foto')
  } finally {
    input.value = ''
    uploadingLotMedia.value = false
    lotMediaUploadProgress.value = null
  }
}

const uploadLotPanoramaFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !editingLot.value) return
  const targetLot = editingLot.value
  uploadingPanorama.value = true
  try {
    const previousPanoramaUrl = lotForm.value.panoramaUrl
    const formData = new FormData()
    formData.append('file', file)
    const media = await uploadApi(`/projects/${props.projectId}/media?lotDetailsId=${targetLot.id}&caption=lot_panorama_360`, formData)

    if (editingLot.value?.id !== targetLot.id) return

    if (!editingLot.value.medias) editingLot.value.medias = []
    editingLot.value.medias.unshift(media)

    if (previousPanoramaUrl && Array.isArray(editingLot.value.medias)) {
      const previousMedia = editingLot.value.medias.find((item: any) => item?.url === previousPanoramaUrl)
      if (previousMedia?.id) {
        await fetchApi(`/projects/${props.projectId}/media/${previousMedia.id}`, { method: 'DELETE' }).catch(() => null)
        editingLot.value.medias = editingLot.value.medias.filter((item: any) => item?.id !== previousMedia.id)
      }
    }

    lotForm.value.panoramaUrl = media.url
    toastSuccess('Imagem 360° enviada! Salve para concluir.')
  } catch (e) {
    toastFromError(e, 'Erro ao enviar imagem')
  } finally {
    input.value = ''
    uploadingPanorama.value = false
  }
}

const removeLotMedia = async (id: string) => {
  if (!confirm('Excluir foto do lote?')) return
  try {
    await fetchApi(`/projects/${props.projectId}/media/${id}`, { method: 'DELETE' })
    if (editingLot.value?.medias) {
      editingLot.value.medias = editingLot.value.medias.filter((media: any) => media.id !== id)
    }
    toastSuccess('Foto excluida')
  } catch (e) {
    toastFromError(e, 'Erro ao excluir foto')
  }
}

const retryMediaPreviewLoad = (event: Event) => {
  const target = event.target as HTMLImageElement | null
  if (!target) return
  if (target.dataset.retryOnce === '1') return
  target.dataset.retryOnce = '1'

  const current = target.currentSrc || target.src
  if (!current) return

  const separator = current.includes('?') ? '&' : '?'
  target.src = `${current}${separator}r=${Date.now()}`
}

const copyLink = (text: string) => {
  navigator.clipboard.writeText(text)
  toastSuccess('Link copiado!')
}

const lotPublicPageUrl = (lot: any) => {
  const backendUrl = String(lot?.publicPageUrl || '').trim()
  if (backendUrl) return backendUrl

  const code = lot?.mapElement?.code || lot?.mapElement?.name || lot?.lotNumber || lot?.id
  const slug = projectValue.value?.slug
  if (!code || !slug || typeof window === 'undefined') return ''

  return `${window.location.origin}/${slug}/${encodeURIComponent(String(code))}`
}

const lotAttributionUrl = (lot: any, source: 'qr_code' | 'share_button') => {
  const baseUrl = lotPublicPageUrl(lot)
  if (!baseUrl) return ''

  try {
    const url = new URL(baseUrl)
    const lotLabel = String(lot?.lotNumber || lot?.mapElement?.code || lot?.mapElement?.name || lot?.id || 'lote').trim()
    const campaignBase = String(projectValue.value?.slug || props.projectId || 'projeto').trim().replace(/\s+/g, '-').toLowerCase()

    url.searchParams.set('utm_source', source)
    url.searchParams.set('utm_medium', source === 'qr_code' ? 'offline' : 'share')
    url.searchParams.set('utm_campaign', `project_${campaignBase}`)
    url.searchParams.set('utm_content', `lot_${lotLabel.replace(/\s+/g, '-').toLowerCase()}`)
    return url.toString()
  } catch {
    return baseUrl
  }
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
  const projectName = projectValue.value?.name || 'este empreendimento'
  return `Saiba mais sobre o lote ${lotLabel} do ${projectName}`
}

const shareLot = async (lot: any) => {
  const url = lotAttributionUrl(lot, 'share_button')
  if (!url) {
    toastFromError(new Error('Nao foi possivel gerar o link publico deste lote.'))
    return
  }

  const lotLabel = lot?.lotNumber || lot?.mapElement?.code || lot?.mapElement?.name || lot?.id
  const title = `${projectValue.value?.name || 'Empreendimento'} - Lote ${lotLabel}`
  const text = lotShareText(lot)

  if (navigator?.share) {
    try {
      await navigator.share({ title, text, url })
      return
    } catch {
      // fallback handled below
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
    shareText: lotShareText(lot),
  }
}

const downloadLotQr = (payload: { code: string; qrCodeUrl: string }) => {
  const link = document.createElement('a')
  link.href = payload.qrCodeUrl
  link.download = `qr-lote-${payload.code || 'sem-codigo'}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const printLotQr = (payload: { code: string; qrCodeUrl: string; publicPageUrl: string; shareText: string }) => {
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
          window.onload = function () { window.print(); };
        <\/script>
      </body>
    </html>
  `)
  win.document.close()
}

const openReservationModal = async (lot: any) => {
  viewingReservation.value = lot
  reservationData.value = null
  reservationLoading.value = true
  try {
    const res = await fetchApi(`/leads?projectId=${props.projectId}&mapElementId=${lot.mapElementId}&status=RESERVATION&limit=1`)
    reservationData.value = res?.data?.[0] ?? null
  } catch {
    reservationData.value = null
  } finally {
    reservationLoading.value = false
  }
}

watch(() => props.projectId, () => {
  stopLotImportPolling()
  void loadInitialData()
})

onMounted(() => {
  void loadInitialData()
})

onBeforeUnmount(() => {
  stopLotImportPolling()
})

defineExpose({
  refreshLots,
  openLotByMapElementId,
})
</script>

<style scoped>
.plm {
  margin-top: 24px;
  padding: 24px;
  border: 1px solid var(--glass-border-subtle);
  border-radius: 20px;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.1), transparent 30%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.72));
}

.plm__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.plm__eyebrow {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(96, 165, 250, 0.2);
  color: #bfdbfe;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.plm__title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.plm__subtitle {
  margin: 8px 0 0;
  max-width: 72ch;
  color: var(--color-surface-400);
}

.plm__loading {
  min-height: 220px;
}

.plm__empty {
  display: grid;
  place-items: center;
  text-align: center;
  min-height: 240px;
  gap: 10px;
}

.plm__notice {
  padding: 12px 16px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: #fbbf24;
  display: flex;
  align-items: center;
  gap: 8px;
}

.plm__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin: 18px 0 14px;
  flex-wrap: wrap;
}

.plm__toolbar-search {
  flex: 1 1 320px;
}

.plm__toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-surface-300);
  font-size: 0.88rem;
  font-weight: 600;
}

.plm__table-wrap {
  overflow-x: auto;
}

.plm__group-row td {
  padding: 0;
  border-bottom: 0;
}

.plm__group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #bfdbfe;
  background: rgba(59, 130, 246, 0.12);
}

.plm__group-title span {
  color: var(--color-surface-400);
}

.plm__actions {
  flex-wrap: wrap;
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

.lot-edit-overlay {
  background: rgb(0, 0, 0, 0.4);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.lot-edit-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  background: var(--color-surface-400);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 28px 70px rgba(2, 6, 23, 0.52);
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.8) transparent;
  padding: 0;
}

.lot-edit-modal__header {
  position: sticky;
  top: 0;
  z-index: 6;
  margin-bottom: 0;
  padding: 24px;
  align-items: flex-start;
  padding-right: 48px;
  background: var(--color-surface-500);
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  backdrop-filter: blur(10px);
}

.lot-edit-modal__eyebrow {
  display: inline-flex;
  margin-bottom: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.lot-edit-modal__subtitle {
  margin: 8px 0 0;
  color: rgba(226, 232, 240, 0.72);
  font-size: 0.85rem;
  line-height: 1.45;
  max-width: 56ch;
}

.lot-edit-modal__code-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.lot-edit-modal__code-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
}

.lot-edit-modal__code-value {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.26);
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.lot-edit-modal__close {
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
}

.lot-edit-modal__fieldset {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0 24px 24px;
}

.lot-edit-modal__actions {
  position: sticky;
  bottom: 0;
  z-index: 6;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding: 16px;
  background: var(--color-surface-400);
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.lot-edit-section {
  padding: 18px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: var(--color-surface-500);
}

.lot-edit-section__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.lot-edit-section__hint {
  margin: 0;
  color: var(--color-surface-400);
  font-size: 0.8rem;
}

.lot-edit-section__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
  border: 1px solid rgba(148, 163, 184, 0.24);
  color: #e2e8f0;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.lot-edit-empty p {
  margin: 0;
  color: var(--color-surface-400);
}

.lot-edit-gallery-grid {
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
}

.lot-edit-panorama-card {
  overflow: hidden;
}

@media (max-width: 900px) {
  .plm {
    padding: 18px;
  }

  .plm__header {
    flex-direction: column;
    align-items: stretch;
  }

  .plm__toolbar {
    align-items: stretch;
  }

  .plm__toggle {
    width: 100%;
    justify-content: space-between;
  }
}
</style>