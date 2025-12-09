<script>
import Popper from 'vue3-popper';

export default {
  name: 'OutcomeTypeName',
  components: { Popper },
  props: {
    name: { type: String, default: '' },
    active: { type: Boolean, default: true },
    tag: { type: String, default: '' },
  },
  computed: {
    statusClass() {
      return this.active === true ? 'outcome-type-active' : 'outcome-type-inactive';
    },
    statusIconClass() {
      return this.active === true ? 'icon-success' : 'icon-error';
    },
    statusTooltip() {
      if (this.active === true) {
        return 'Tipo de resultado ativo';
      }
      return 'Tipo de resultado inativo';
    },
  },
};
</script>

<template>
  <div class="outcome-type-name-container" :class="statusClass">
    <!-- Outcome Type Icon -->
    <Popper :class="'dark'" arrow hover>
      <template #content>
        <div>{{ statusTooltip }}</div>
      </template>
      <div class="outcome-type-icon" :class="statusIconClass">
        <i class="bi bi-arrow-up-circle-fill"></i>
      </div>
    </Popper>

    <!-- Outcome Type Name -->
    <span class="outcome-type-name-text" :class="statusClass">
      {{ name || 'N/I' }}
    </span>

    <!-- Outcome Type Tag -->
    <Popper v-if="tag" :class="'dark'" arrow hover>
      <template #content>
        <div>Tag do tipo de resultado</div>
      </template>
      <span class="outcome-type-tag">
        <i class="bi bi-tags-fill"></i>
        <span class="outcome-type-tag-text">{{ tag }}</span>
      </span>
    </Popper>
  </div>
</template>

<style scoped>
/* Outcome Type Name Container */
.outcome-type-name-container {
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

.outcome-type-name-container:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 1);
}

.outcome-type-name-container.outcome-type-active {
  border-left: 3px solid #00c2cb;
}

.outcome-type-name-container.outcome-type-inactive {
  border-left: 3px solid #a52a2a;
  opacity: 0.7;
}

/* Outcome Type Icon */
.outcome-type-name-container :deep(.inline-block) {
  display: flex !important;
  align-items: center !important;
}

.outcome-type-icon {
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

.outcome-type-icon i {
  font-size: 0.9375rem;
}

.outcome-type-icon.icon-success {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
}

.outcome-type-icon.icon-error {
  background: rgba(165, 42, 42, 0.12);
  color: #a52a2a;
}

.outcome-type-name-container:hover .outcome-type-icon {
  transform: scale(1.02);
}

/* Outcome Type Name Text */
.outcome-type-name-text {
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.outcome-type-name-text.outcome-type-active {
  color: #000000;
}

.outcome-type-name-text.outcome-type-inactive {
  color: rgba(0, 0, 0, 0.5);
  text-decoration: line-through;
}

/* Outcome Type Tag */
.outcome-type-tag {
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

.outcome-type-tag:hover {
  background: rgba(0, 74, 173, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 74, 173, 0.2);
}

.outcome-type-tag i {
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.outcome-type-tag-text {
  font-weight: 700;
  letter-spacing: 0.15px;
}

/* Responsive */
@media (max-width: 768px) {
  .outcome-type-name-container {
    padding: 0.25rem 0.4375rem;
    gap: 0.3125rem;
  }

  .outcome-type-icon {
    width: 28px;
    height: 28px;
  }

  .outcome-type-icon i {
    font-size: 0.875rem;
  }

  .outcome-type-name-text {
    font-size: 0.75rem;
  }

  .outcome-type-tag {
    font-size: 0.625rem;
    padding: 0.1rem 0.3125rem;
    gap: 0.25rem;
  }

  .outcome-type-tag i {
    font-size: 0.5625rem;
  }
}

@media (max-width: 576px) {
  .outcome-type-name-container {
    padding: 0.1875rem 0.375rem;
    gap: 0.25rem;
  }

  .outcome-type-name-text {
    font-size: 0.6875rem;
  }

  .outcome-type-icon {
    width: 24px;
    height: 24px;
  }

  .outcome-type-icon i {
    font-size: 0.8125rem;
  }

  .outcome-type-tag {
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
.outcome-type-name-container {
  overflow: visible;
}
</style>
