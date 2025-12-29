<script>
import Popper from 'vue3-popper';

export default {
  name: 'MedicalTemplateSimpleName',
  components: { Popper },
  props: {
    template: {
      type: Object,
      default: () => ({
        name: '',
        type: '',
        scope: '',
        active: true,
        available: true,
        isFavorite: false,
      }),
    },
    getTypeLabel: { type: Function, default: () => (type) => type },
    getScopeLabel: { type: Function, default: () => (scope) => scope },
  },
  computed: {
    statusClass() {
      return this.template.active === true && this.template.available === true
        ? 'template-active'
        : 'template-inactive';
    },
    statusIconClass() {
      return this.template.active === true && this.template.available === true
        ? 'icon-success'
        : 'icon-error';
    },
    statusTooltip() {
      return this.template.active === true && this.template.available === true
        ? this.$t('dashboard.clientCard.tooltip.productActive') || 'Plantilla disponible'
        : this.$t('dashboard.clientCard.tooltip.productInactive') || 'Plantilla no disponible';
    },
    typeLabel() {
      return this.getTypeLabel(this.template.type) || this.template.type;
    },
    scopeLabel() {
      return this.getScopeLabel(this.template.scope) || this.template.scope;
    },
  },
};
</script>

<template>
  <div class="template-name-container" :class="statusClass">
    <!-- Template Icon -->
    <Popper :class="'dark'" arrow hover>
      <template #content>
        <div>{{ statusTooltip }}</div>
      </template>
      <div class="template-icon" :class="statusIconClass">
        <i class="bi bi-file-earmark-text"></i>
      </div>
    </Popper>

    <!-- Template Name -->
    <span class="template-name-text" :class="statusClass">
      {{ template.name || 'N/I' }}
    </span>

    <!-- Template Type -->
    <Popper v-if="template.type" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('businessMedicalTemplatesAdmin.type') || 'Tipo de plantilla' }}</div>
      </template>
      <span class="template-tag template-type-tag">
        <i class="bi bi-tags-fill"></i>
        <span class="template-tag-text">{{ typeLabel }}</span>
      </span>
    </Popper>

    <!-- Template Scope -->
    <Popper v-if="template.scope" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('businessMedicalTemplatesAdmin.scope') || 'Alcance de la plantilla' }}</div>
      </template>
      <span class="template-tag template-scope-tag">
        <i class="bi bi-people-fill"></i>
        <span class="template-tag-text">{{ scopeLabel }}</span>
      </span>
    </Popper>

    <!-- Favorite Badge -->
    <Popper v-if="template.isFavorite" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('dashboard.clientCard.tooltip.favorite') || 'Favorito' }}</div>
      </template>
      <span class="template-favorite">
        <i class="bi bi-star-fill"></i>
      </span>
    </Popper>
  </div>
</template>

<style scoped>
/* Template Name Container */
.template-name-container {
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

.template-name-container:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 1);
}

.template-name-container.template-active {
  border-left: 3px solid #00c2cb;
}

.template-name-container.template-inactive {
  border-left: 3px solid #a52a2a;
  opacity: 0.7;
}

/* Template Icon */
.template-name-container :deep(.inline-block) {
  display: flex !important;
  align-items: center !important;
}

.template-icon {
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

.template-icon i {
  font-size: 1.125rem;
}

.template-icon.icon-success {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
}

.template-icon.icon-error {
  background: rgba(165, 42, 42, 0.12);
  color: #a52a2a;
}

.template-name-container:hover .template-icon {
  transform: scale(1.02);
}

/* Template Name Text */
.template-name-text {
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.template-name-text.template-active {
  color: #000000;
}

.template-name-text.template-inactive {
  color: rgba(0, 0, 0, 0.5);
  text-decoration: line-through;
}

/* Template Tag (Type and Scope) */
.template-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.1875rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: help;
  transition: all 0.2s ease;
  line-height: 1.3;
}

.template-type-tag {
  background: rgba(108, 117, 125, 0.1);
  color: #6c757d;
}

.template-type-tag:hover {
  background: rgba(108, 117, 125, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(108, 117, 125, 0.2);
}

.template-scope-tag {
  background: rgba(13, 110, 253, 0.1);
  color: #0d6efd;
}

.template-scope-tag:hover {
  background: rgba(13, 110, 253, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(13, 110, 253, 0.2);
}

.template-tag i {
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.template-tag-text {
  font-weight: 700;
  letter-spacing: 0.15px;
}

/* Favorite Badge */
.template-favorite {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(255, 193, 7, 0.15);
  color: #ffc107;
  border-radius: 50%;
  cursor: help;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.template-favorite:hover {
  background: rgba(255, 193, 7, 0.25);
  transform: scale(1.1);
}

.template-favorite i {
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 768px) {
  .template-name-container {
    padding: 0.3125rem 0.4375rem;
    gap: 0.375rem;
  }

  .template-icon {
    width: 36px;
    height: 36px;
  }

  .template-icon i {
    font-size: 1rem;
  }

  .template-name-text {
    font-size: 0.8125rem;
  }

  .template-tag {
    font-size: 0.6875rem;
    padding: 0.125rem 0.4375rem;
    gap: 0.3125rem;
  }

  .template-tag i {
    font-size: 0.625rem;
  }

  .template-favorite {
    width: 24px;
    height: 24px;
  }

  .template-favorite i {
    font-size: 0.75rem;
  }
}

@media (max-width: 576px) {
  .template-name-container {
    padding: 0.25rem 0.375rem;
    gap: 0.25rem;
  }

  .template-name-text {
    font-size: 0.75rem;
  }

  .template-icon {
    width: 32px;
    height: 32px;
  }

  .template-icon i {
    font-size: 0.9375rem;
  }

  .template-tag {
    font-size: 0.625rem;
    padding: 0.1rem 0.375rem;
  }

  .template-favorite {
    width: 22px;
    height: 22px;
  }

  .template-favorite i {
    font-size: 0.6875rem;
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
.template-name-container {
  overflow: visible;
}
</style>


