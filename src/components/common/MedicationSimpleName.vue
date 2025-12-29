<script>
import Popper from 'vue3-popper';

export default {
  name: 'MedicationSimpleName',
  components: { Popper },
  props: {
    medication: { type: Object, default: () => ({ name: '', commercialName: '', available: true }) },
  },
  computed: {
    statusClass() {
      return this.medication.available === true ? 'medication-active' : 'medication-inactive';
    },
    statusIconClass() {
      return this.medication.available === true ? 'icon-success' : 'icon-error';
    },
    statusTooltip() {
      return this.medication.available === true
        ? this.$t('dashboard.clientCard.tooltip.productActive') || 'Medicamento disponible'
        : this.$t('dashboard.clientCard.tooltip.productInactive') || 'Medicamento no disponible';
    },
  },
};
</script>

<template>
  <div class="medication-name-container" :class="statusClass">
    <!-- Medication Icon -->
    <Popper :class="'dark'" arrow hover>
      <template #content>
        <div>{{ statusTooltip }}</div>
      </template>
      <div class="medication-icon" :class="statusIconClass">
        <i class="bi bi-capsule"></i>
      </div>
    </Popper>

    <!-- Medication Name -->
    <span class="medication-name-text" :class="statusClass">
      {{ medication.name || 'N/I' }}
    </span>

    <!-- Commercial Name -->
    <Popper v-if="medication.commercialName" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('dashboard.clientCard.tooltip.productTag') || 'Nombre comercial' }}</div>
      </template>
      <span class="medication-tag">
        <i class="bi bi-tags-fill"></i>
        <span class="medication-tag-text">{{ medication.commercialName }}</span>
      </span>
    </Popper>
  </div>
</template>

<style scoped>
/* Medication Name Container */
.medication-name-container {
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

.medication-name-container:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 1);
}

.medication-name-container.medication-active {
  border-left: 3px solid #00c2cb;
}

.medication-name-container.medication-inactive {
  border-left: 3px solid #a52a2a;
  opacity: 0.7;
}

/* Medication Icon */
.medication-name-container :deep(.inline-block) {
  display: flex !important;
  align-items: center !important;
}

.medication-icon {
  width: 40px;
  height: 40px;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
  cursor: help;
}

.medication-icon i {
  font-size: 1.125rem;
}

.medication-icon.icon-success {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
}

.medication-icon.icon-error {
  background: rgba(165, 42, 42, 0.12);
  color: #a52a2a;
}

.medication-name-container:hover .medication-icon {
  transform: scale(1.02);
}

/* Medication Name Text */
.medication-name-text {
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.medication-name-text.medication-active {
  color: #000000;
}

.medication-name-text.medication-inactive {
  color: rgba(0, 0, 0, 0.5);
  text-decoration: line-through;
}

/* Medication Tag (Commercial Name) */
.medication-tag {
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

.medication-tag:hover {
  background: rgba(0, 74, 173, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 74, 173, 0.2);
}

.medication-tag i {
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.medication-tag-text {
  font-weight: 700;
  letter-spacing: 0.15px;
}

/* Responsive */
@media (max-width: 768px) {
  .medication-name-container {
    padding: 0.3125rem 0.4375rem;
    gap: 0.375rem;
  }

  .medication-icon {
    width: 36px;
    height: 36px;
  }

  .medication-icon i {
    font-size: 1rem;
  }

  .medication-name-text {
    font-size: 0.8125rem;
  }

  .medication-tag {
    font-size: 0.6875rem;
    padding: 0.125rem 0.4375rem;
    gap: 0.3125rem;
  }

  .medication-tag i {
    font-size: 0.625rem;
  }
}

@media (max-width: 576px) {
  .medication-name-container {
    padding: 0.25rem 0.375rem;
    gap: 0.25rem;
  }

  .medication-name-text {
    font-size: 0.75rem;
  }

  .medication-icon {
    width: 32px;
    height: 32px;
  }

  .medication-icon i {
    font-size: 0.9375rem;
  }

  .medication-tag {
    font-size: 0.625rem;
    padding: 0.1rem 0.375rem;
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
.medication-name-container {
  overflow: visible;
}
</style>


