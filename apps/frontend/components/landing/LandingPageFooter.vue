<template>
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
          <span>&copy; {{ currentYear }} &mdash; Todos os direitos reservados.</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getYearInBrasilia } from '~/utils/date'

const props = defineProps<{
  project: any
}>()

const currentYear = computed(() => getYearInBrasilia())
</script>

<style scoped>
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
</style>
