<script>
import Popper from 'vue3-popper';

export default {
  name: 'MedicalExamSimpleName',
  components: { Popper },
  props: {
    exam: { type: Object, default: () => ({ name: '', code: '', available: true, active: true }) },
  },
  computed: {
    statusClass() {
      return this.exam.available === true && this.exam.active === true
        ? 'exam-active'
        : 'exam-inactive';
    },
    statusIconClass() {
      return this.exam.available === true && this.exam.active === true ? 'icon-success' : 'icon-error';
    },
    statusTooltip() {
      return this.exam.available === true && this.exam.active === true
        ? this.$t('dashboard.clientCard.tooltip.productActive') || 'Examen disponible'
        : this.$t('dashboard.clientCard.tooltip.productInactive') || 'Examen no disponible';
    },
  },
};
</script>

<template>
  <div class="exam-name-container" :class="statusClass">
    <!-- Exam Icon -->
    <Popper :class="'dark'" arrow hover>
      <template #content>
        <div>{{ statusTooltip }}</div>
      </template>
      <div class="exam-icon" :class="statusIconClass">
        <i class="bi bi-clipboard-pulse"></i>
      </div>
    </Popper>

    <!-- Exam Name -->
    <span class="exam-name-text" :class="statusClass">
      {{ exam.name || 'N/I' }}
    </span>

    <!-- LOINC Code -->
    <Popper v-if="exam.code" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('businessMedicalExamsAdmin.code') || 'Código LOINC' }}</div>
      </template>
      <span class="exam-tag">
        <i class="bi bi-tags-fill"></i>
        <span class="exam-tag-text">{{ exam.code }}</span>
      </span>
    </Popper>
  </div>
</template>

<style scoped>
/* Exam Name Container */
.exam-name-container {
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

.exam-name-container:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 1);
}

.exam-name-container.exam-active {
  border-left: 3px solid #00c2cb;
}

.exam-name-container.exam-inactive {
  border-left: 3px solid #a52a2a;
  opacity: 0.7;
}

/* Exam Icon */
.exam-name-container :deep(.inline-block) {
  display: flex !important;
  align-items: center !important;
}

.exam-icon {
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

.exam-icon i {
  font-size: 1.125rem;
}

.exam-icon.icon-success {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
}

.exam-icon.icon-error {
  background: rgba(165, 42, 42, 0.12);
  color: #a52a2a;
}

.exam-name-container:hover .exam-icon {
  transform: scale(1.02);
}

/* Exam Name Text */
.exam-name-text {
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.exam-name-text.exam-active {
  color: #000000;
}

.exam-name-text.exam-inactive {
  color: rgba(0, 0, 0, 0.5);
  text-decoration: line-through;
}

/* Exam Tag (LOINC Code) */
.exam-tag {
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

.exam-tag:hover {
  background: rgba(0, 74, 173, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 74, 173, 0.2);
}

.exam-tag i {
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.exam-tag-text {
  font-weight: 700;
  letter-spacing: 0.15px;
}

/* Responsive */
@media (max-width: 768px) {
  .exam-name-container {
    padding: 0.3125rem 0.4375rem;
    gap: 0.375rem;
  }

  .exam-icon {
    width: 36px;
    height: 36px;
  }

  .exam-icon i {
    font-size: 1rem;
  }

  .exam-name-text {
    font-size: 0.8125rem;
  }

  .exam-tag {
    font-size: 0.6875rem;
    padding: 0.125rem 0.4375rem;
    gap: 0.3125rem;
  }

  .exam-tag i {
    font-size: 0.625rem;
  }
}

@media (max-width: 576px) {
  .exam-name-container {
    padding: 0.25rem 0.375rem;
    gap: 0.25rem;
  }

  .exam-name-text {
    font-size: 0.75rem;
  }

  .exam-icon {
    width: 32px;
    height: 32px;
  }

  .exam-icon i {
    font-size: 0.9375rem;
  }

  .exam-tag {
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
.exam-name-container {
  overflow: visible;
}
</style>
