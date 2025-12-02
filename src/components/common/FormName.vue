<script>
import Popper from 'vue3-popper';

export default {
  name: 'FormName',
  components: { Popper },
  props: {
    type: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  computed: {
    statusClass() {
      return this.active === true ? 'form-active' : 'form-inactive';
    },
    statusIconClass() {
      return this.active === true ? 'icon-success' : 'icon-error';
    },
    statusTooltip() {
      return this.active === true
        ? 'Formulário ativo'
        : 'Formulário inativo';
    },
  },
};
</script>

<template>
  <div class="form-name-container" :class="statusClass">
    <!-- Form Icon -->
    <Popper :class="'dark'" arrow hover>
      <template #content>
        <div>{{ statusTooltip }}</div>
      </template>
      <div class="form-icon" :class="statusIconClass">
        <i class="bi bi-pencil"></i>
      </div>
    </Popper>

    <!-- Form Name -->
    <span class="form-name-text" :class="statusClass">
      {{ $t(`forms.types.${type}`) || type || 'N/I' }}
    </span>
  </div>
</template>

<style scoped>
/* Form Name Container */
.form-name-container {
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

.form-name-container:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 1);
}

.form-name-container.form-active {
  border-left: 3px solid #00c2cb;
}

.form-name-container.form-inactive {
  border-left: 3px solid #a52a2a;
  opacity: 0.7;
}

/* Form Icon */
.form-name-container :deep(.inline-block) {
  display: flex !important;
  align-items: center !important;
}

.form-icon {
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

.form-icon i {
  font-size: 0.9375rem;
}

.form-icon.icon-success {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
}

.form-icon.icon-error {
  background: rgba(165, 42, 42, 0.12);
  color: #a52a2a;
}

.form-name-container:hover .form-icon {
  transform: scale(1.02);
}

/* Form Name Text */
.form-name-text {
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.form-name-text.form-active {
  color: #000000;
}

.form-name-text.form-inactive {
  color: rgba(0, 0, 0, 0.5);
  text-decoration: line-through;
}

/* Responsive */
@media (max-width: 768px) {
  .form-name-container {
    padding: 0.25rem 0.4375rem;
    gap: 0.3125rem;
  }

  .form-icon {
    width: 28px;
    height: 28px;
  }

  .form-icon i {
    font-size: 0.875rem;
  }

  .form-name-text {
    font-size: 0.75rem;
  }
}

@media (max-width: 576px) {
  .form-name-container {
    padding: 0.1875rem 0.375rem;
    gap: 0.25rem;
  }

  .form-name-text {
    font-size: 0.6875rem;
  }

  .form-icon {
    width: 24px;
    height: 24px;
  }

  .form-icon i {
    font-size: 0.8125rem;
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
.form-name-container {
  overflow: visible;
}
</style>
