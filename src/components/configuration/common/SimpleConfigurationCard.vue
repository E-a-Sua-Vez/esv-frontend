<script>
import Popper from 'vue3-popper';
import Toggle from '@vueform/toggle';
import {
  updateFeatureToggle,
  addFeatureToggle,
} from '../../../application/services/feature-toggle';

export default {
  name: 'SimpleConfigurationCard',
  components: { Popper, Toggle },
  props: {
    show: { type: Boolean, default: true },
    canUpdate: { type: Boolean, default: true },
    configuration: { type: Object, default: {} },
    commerceId: { type: String, default: undefined },
    showTooltip: { type: Boolean, default: false },
    icon: { type: String, default: '' },
    iconStyleClass: { type: String, default: '' },
  },
  data() {
    return {};
  },
  methods: {
    async update(configuration) {
      try {
        // Si ya existe el feature-toggle para el comercio, solo actualizamos "active"
        if (configuration.id) {
          await updateFeatureToggle(configuration.id, { active: configuration.active });
        } else if (this.commerceId) {
          // Si aún no existe, lo creamos. El backend lo crea siempre como active=true,
          // y luego el padre refresca el estado real desde el backend.
          const payload = {
            name: configuration.name,
            type: configuration.type,
            commerceId: this.commerceId,
          };
          await addFeatureToggle(payload);
        }
        this.$emit('updated');
      } catch (error) {}
    },
  },
};
</script>

<template>
  <div v-if="show" class="config-card-wrapper">
    <div class="config-card">
      <div class="config-card-header">
        <div class="config-card-title-section">
          <span class="config-card-title">{{
            $t(`configuration.${configuration.name}.title`)
          }}</span>
          <Popper
            v-if="showTooltip"
            :class="'dark'"
            arrow
            disable-click-away
            :content="`${$t('configuration.' + configuration.name + '.description')} (key: ${
              configuration.name
            }, type: ${configuration.type})`"
          >
            <i class="bi bi-info-circle-fill config-info-icon"></i>
          </Popper>
        </div>
        <div class="config-card-toggle">
          <Toggle
            v-model="configuration.active"
            :disabled="!canUpdate"
            @click="update(configuration)"
          />
        </div>
      </div>
      <div class="config-card-details">
        <span class="config-badge config-badge-type">{{ configuration.type }}</span>
        <span class="config-badge config-badge-id">{{ configuration.id || 'N/A' }}</span>
        <span class="config-badge config-badge-key">{{ configuration.name || 'N/A' }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-card-wrapper {
  margin: 0.4rem 0;
}

.config-card {
  background: #ffffff;
  padding: 0.6rem 0.8rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.config-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.12);
}

.config-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  gap: 0.75rem;
}

.config-card-title-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.config-card-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-info-icon {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.5);
  cursor: help;
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.config-info-icon:hover {
  color: rgba(0, 0, 0, 0.7);
}

.config-card-toggle {
  flex-shrink: 0;
}

.config-card-details {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-top: 0.4rem;
  padding-top: 0.4rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.config-badge {
  font-size: 0.65rem;
  padding: 0.2rem 0.5rem;
  border-radius: 0.375rem;
  font-weight: 600;
  line-height: 1.2;
}

.config-badge-type {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
}

.config-badge-id {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.7);
  font-family: 'Courier New', monospace;
}

.config-badge-key {
  background: rgba(59, 130, 246, 0.12);
  color: rgba(37, 99, 235, 0.9);
  font-family: 'Courier New', monospace;
}
</style>
