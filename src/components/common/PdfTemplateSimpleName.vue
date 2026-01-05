<script>
import Popper from 'vue3-popper';

export default {
  name: 'PdfTemplateSimpleName',
  components: { Popper },
  props: {
    template: {
      type: Object,
      default: () => ({
        name: '',
        documentType: '',
        scope: '',
        active: true,
        available: true,
        isDefault: false,
      }),
    },
    getDocumentTypeLabel: { type: Function, default: () => type => type },
    getScopeLabel: { type: Function, default: () => scope => scope },
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
    documentTypeLabel() {
      return this.getDocumentTypeLabel(this.template.documentType) || this.template.documentType;
    },
    scopeLabel() {
      return this.getScopeLabel(this.template.scope) || this.template.scope;
    },
  },
};
</script>

<template>
  <div class="pdf-template-name-container" :class="statusClass">
    <!-- Template Icon -->
    <Popper :class="'dark'" arrow hover>
      <template #content>
        <div>{{ statusTooltip }}</div>
      </template>
      <div class="pdf-template-icon" :class="statusIconClass">
        <i class="bi bi-file-earmark-pdf"></i>
      </div>
    </Popper>

    <!-- Template Name -->
    <span class="pdf-template-name-text" :class="statusClass">
      {{ template.name || 'N/I' }}
    </span>

    <!-- Document Type Tag -->
    <Popper v-if="template.documentType" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('pdfTemplates.documentType') || 'Tipo de documento' }}</div>
      </template>
      <span class="pdf-template-tag pdf-template-type-tag">
        <i class="bi bi-file-text"></i>
        <span class="pdf-template-tag-text">{{ documentTypeLabel }}</span>
      </span>
    </Popper>

    <!-- Scope Tag -->
    <Popper v-if="template.scope" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('pdfTemplates.scope') || 'Alcance de la plantilla' }}</div>
      </template>
      <span class="pdf-template-tag pdf-template-scope-tag">
        <i class="bi bi-people-fill"></i>
        <span class="pdf-template-tag-text">{{ scopeLabel }}</span>
      </span>
    </Popper>

    <!-- Default Badge -->
    <Popper v-if="template.isDefault" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('pdfTemplates.isDefault') || 'Plantilla por defecto' }}</div>
      </template>
      <span class="pdf-template-default">
        <i class="bi bi-star-fill"></i>
      </span>
    </Popper>
  </div>
</template>

<style scoped>
/* PDF Template Name Container */
.pdf-template-name-container {
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

.pdf-template-name-container:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 1);
}

.pdf-template-name-container.template-active {
  border-left: 3px solid #00c2cb;
}

.pdf-template-name-container.template-inactive {
  border-left: 3px solid #a52a2a;
  opacity: 0.7;
}

/* PDF Template Icon */
.pdf-template-name-container :deep(.inline-block) {
  display: flex !important;
  align-items: center !important;
}

.pdf-template-icon {
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

.pdf-template-icon i {
  font-size: 1.125rem;
}

.pdf-template-icon.icon-success {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
}

.pdf-template-icon.icon-error {
  background: rgba(165, 42, 42, 0.12);
  color: #a52a2a;
}

.pdf-template-name-container:hover .pdf-template-icon {
  transform: scale(1.02);
}

/* PDF Template Name Text */
.pdf-template-name-text {
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.pdf-template-name-text.template-active {
  color: #000000;
}

.pdf-template-name-text.template-inactive {
  color: rgba(0, 0, 0, 0.5);
  text-decoration: line-through;
}

/* PDF Template Tag (Document Type and Scope) */
.pdf-template-tag {
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

.pdf-template-type-tag {
  background: rgba(13, 110, 253, 0.1);
  color: #0d6efd;
}

.pdf-template-type-tag:hover {
  background: rgba(13, 110, 253, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(13, 110, 253, 0.2);
}

.pdf-template-scope-tag {
  background: rgba(108, 117, 125, 0.1);
  color: #6c757d;
}

.pdf-template-scope-tag:hover {
  background: rgba(108, 117, 125, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(108, 117, 125, 0.2);
}

.pdf-template-tag i {
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.pdf-template-tag-text {
  font-weight: 700;
  letter-spacing: 0.15px;
}

/* Default Badge */
.pdf-template-default {
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

.pdf-template-default:hover {
  background: rgba(255, 193, 7, 0.25);
  transform: scale(1.1);
}

.pdf-template-default i {
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 768px) {
  .pdf-template-name-container {
    padding: 0.3125rem 0.4375rem;
    gap: 0.375rem;
  }

  .pdf-template-icon {
    width: 36px;
    height: 36px;
  }

  .pdf-template-icon i {
    font-size: 1rem;
  }

  .pdf-template-name-text {
    font-size: 0.8125rem;
  }

  .pdf-template-tag {
    font-size: 0.6875rem;
    padding: 0.125rem 0.4375rem;
    gap: 0.3125rem;
  }

  .pdf-template-tag i {
    font-size: 0.625rem;
  }

  .pdf-template-default {
    width: 24px;
    height: 24px;
  }

  .pdf-template-default i {
    font-size: 0.75rem;
  }
}

@media (max-width: 576px) {
  .pdf-template-name-container {
    padding: 0.25rem 0.375rem;
    gap: 0.25rem;
  }

  .pdf-template-name-text {
    font-size: 0.75rem;
  }

  .pdf-template-icon {
    width: 32px;
    height: 32px;
  }

  .pdf-template-icon i {
    font-size: 0.9375rem;
  }

  .pdf-template-tag {
    font-size: 0.625rem;
    padding: 0.1rem 0.375rem;
  }

  .pdf-template-default {
    width: 22px;
    height: 22px;
  }

  .pdf-template-default i {
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
.pdf-template-name-container {
  overflow: visible;
}
</style>

