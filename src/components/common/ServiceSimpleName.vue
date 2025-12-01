<script>
import Popper from 'vue3-popper';

export default {
  name: 'ServiceSimpleName',
  components: { Popper },
  props: {
    service: { type: Object, default: () => ({ name: '', active: false, tag: '' }) },
    details: { type: Boolean, default: false },
  },
  computed: {
    statusClass() {
      return this.service.active ? 'service-active' : 'service-inactive';
    },
    statusIconClass() {
      return this.service.active ? 'icon-success' : 'icon-error';
    },
    statusTooltip() {
      return this.service.active
        ? this.$t('dashboard.clientCard.tooltip.serviceActive') || 'Servicio activo'
        : this.$t('dashboard.clientCard.tooltip.serviceInactive') || 'Servicio inactivo';
    },
  },
};
</script>

<template>
  <div class="service-name-container" :class="statusClass">
    <!-- Service Icon -->
    <Popper :class="'dark'" arrow hover>
      <template #content>
        <div>{{ statusTooltip }}</div>
      </template>
      <div class="service-icon" :class="statusIconClass">
        <i class="bi bi-person-lines-fill"></i>
      </div>
    </Popper>

    <!-- Service Name -->
    <span class="service-name-text" :class="statusClass">
      {{ service.name || $t('dashboard.clientCard.label.noService') || 'N/I' }}
    </span>

    <!-- Service Tag -->
    <Popper v-if="service.tag" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('dashboard.clientCard.tooltip.serviceTag') || 'Tag del servicio' }}</div>
      </template>
      <span class="service-tag">
        <i class="bi bi-tags-fill"></i>
        <span class="service-tag-text">{{ service.tag }}</span>
      </span>
    </Popper>
  </div>
</template>

<style scoped>
/* Service Name Container */
.service-name-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  transition: all 0.2s ease;
}

.service-name-container.service-active {
  border-left: 4px solid rgba(0, 194, 203, 0.8);
}

.service-name-container.service-inactive {
  border-left: 4px solid rgba(165, 42, 42, 0.6);
}

/* Service Icon */
.service-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 4px;
  font-size: 1rem;
  flex-shrink: 0;
}

.service-icon.icon-success {
  background: rgba(0, 194, 203, 0.1);
  color: rgba(0, 194, 203, 0.9);
}

.service-icon.icon-error {
  background: rgba(165, 42, 42, 0.1);
  color: rgba(165, 42, 42, 0.8);
}

/* Service Name Text */
.service-name-text {
  font-size: 0.875rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  flex: 1;
  text-align: left;
}

.service-name-text.service-active {
  color: rgba(0, 0, 0, 0.9);
}

.service-name-text.service-inactive {
  color: rgba(0, 0, 0, 0.5);
}

/* Service Tag */
.service-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.1875rem 0.5rem;
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: help;
  transition: all 0.2s ease;
  line-height: 1.3;
}

.service-tag:hover {
  background: rgba(0, 74, 173, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 74, 173, 0.2);
}

.service-tag i {
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.service-tag-text {
  font-weight: 700;
  letter-spacing: 0.15px;
  text-transform: capitalize;
}
</style>
