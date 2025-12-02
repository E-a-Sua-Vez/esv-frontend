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
  gap: 0.375rem;
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 6px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  padding: 0.25rem 0.5rem;
}

.service-name-container:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 1);
}

.service-name-container.service-active {
  border-left: 3px solid #00c2cb;
}

.service-name-container.service-inactive {
  border-left: 3px solid #a52a2a;
  opacity: 0.7;
}

/* Service Icon */
.service-name-container :deep(.inline-block) {
  display: flex !important;
  align-items: center !important;
}

.service-icon {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
  cursor: help;
}

.service-icon i {
  font-size: 0.9375rem;
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
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.service-name-text.service-active {
  color: #000000;
}

.service-name-text.service-inactive {
  color: rgba(0, 0, 0, 0.5);
  text-decoration: line-through;
}

.service-name-container:hover .service-icon {
  transform: scale(1.02);
}

/* Service Tag */
.service-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
  cursor: help;
  transition: all 0.2s ease;
  line-height: 1.2;
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
}

/* Responsive */
@media (max-width: 768px) {
  .service-name-container {
    padding: 0.25rem 0.4375rem;
    gap: 0.3125rem;
  }

  .service-icon {
    width: 28px;
    height: 28px;
  }

  .service-icon i {
    font-size: 0.875rem;
  }

  .service-name-text {
    font-size: 0.75rem;
  }

  .service-tag {
    font-size: 0.625rem;
    padding: 0.1rem 0.3125rem;
    gap: 0.25rem;
  }

  .service-tag i {
    font-size: 0.5625rem;
  }
}

@media (max-width: 576px) {
  .service-name-container {
    padding: 0.1875rem 0.375rem;
    gap: 0.25rem;
  }

  .service-name-text {
    font-size: 0.6875rem;
  }

  .service-icon {
    width: 24px;
    height: 24px;
  }

  .service-icon i {
    font-size: 0.8125rem;
  }

  .service-tag {
    font-size: 0.5625rem;
    padding: 0.0625rem 0.25rem;
  }
}

/* Tooltip z-index improvements */
:deep(.popper),
:deep(.popper-dark),
:deep([data-popper-placement]),
:deep([data-popper-placement] > div) {
  z-index: 10000 !important;
}

:deep(.popper__arrow),
:deep(.popper__arrow::before) {
  z-index: 10001 !important;
}

/* Allow tooltips to overflow parent containers */
.service-name-container {
  overflow: visible;
}
</style>
