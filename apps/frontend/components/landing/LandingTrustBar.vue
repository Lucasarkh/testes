<template>
  <div
    v-if="corretor"
    class="v4-trust-bar"
    :class="{ 'v4-trust-bar--with-prelaunch': showWithPreLaunch }"
  >
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
          <a :href="primaryHref || '#contato'" class="v4-trust-btn v4-trust-btn--primary" @click="tracking.trackClick(trackingLabel)">
            <span>{{ primaryInterestLabel }}</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTracking } from '~/composables/useTracking'

const props = defineProps<{
  corretor: any
  showWithPreLaunch: boolean
  primaryInterestLabel: string
  trackingLabel: string
  primaryHref?: string
  stickyOffset?: number
}>()

const tracking = useTracking()

</script>

<style scoped>
.v4-trust-bar {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(0,0,0,0.05);
  padding: 12px 0;
  position: sticky;
  top: var(--v4-trust-offset, 0px);
  z-index: 100;
  box-shadow: 0 4px 30px rgba(0,0,0,0.03);
}

.v4-trust-bar--with-prelaunch {
  top: calc(var(--v4-trust-offset, 0px) + 86px);
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

/* Mobile overrides */
@media (max-width: 768px) {
  .v4-trust-bar { padding: 8px 0; }
  .v4-trust-bar--with-prelaunch { top: var(--v4-trust-offset, 0px); }
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
}
</style>
