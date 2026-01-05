<script>
import Popper from 'vue3-popper';
import jsonToCsv from '../../shared/utils/jsonToCsv';

export default {
  name: 'CommerceName',
  components: { Popper },
  props: {
    name: { type: String, default: '' },
    tag: { type: String, default: '' },
    active: { type: Boolean, default: true },
    keyName: { type: String, default: '' },
    linkType: { type: String, default: 'commerce' }, // 'commerce' or 'business'
    businessData: { type: Object, default: null }, // Complete business object for copying
  },
  computed: {
    statusClass() {
      return this.active ? 'commerce-active' : 'commerce-inactive';
    },
    statusIconClass() {
      return this.active ? 'icon-success' : 'icon-error';
    },
    statusTooltip() {
      return this.active
        ? this.$t('dashboard.clientCard.tooltip.commerceActive') || 'Comércio ativo'
        : this.$t('dashboard.clientCard.tooltip.commerceInactive') || 'Comércio inativo';
    },
    commerceLink() {
      if (!this.keyName) return '';
      const pathPrefix = this.linkType === 'business' ? 'negocio' : 'comercio';
      return `${import.meta.env.VITE_URL}/interno/${pathPrefix}/${this.keyName}`;
    },
  },
  methods: {
    copyLink() {
      // If businessData is provided, copy all business data in CSV format
      if (this.businessData && typeof this.businessData === 'object') {
        try {
          const textToCopy = jsonToCsv([this.businessData]);
          navigator.clipboard.writeText(textToCopy);
        } catch (error) {
          console.error('Error copying business data:', error);
          // Fallback to copying link if CSV conversion fails
          if (this.commerceLink) {
            navigator.clipboard.writeText(this.commerceLink);
          }
        }
      } else if (this.commerceLink) {
        // Default behavior: copy link
        navigator.clipboard.writeText(this.commerceLink);
      }
    },
  },
};
</script>

<template>
  <div class="commerce-name-container" :class="statusClass">
    <!-- Commerce Icon -->
    <Popper :class="'dark'" arrow disable-click-away hover>
      <template #content>
        <div>{{ statusTooltip }}</div>
      </template>
      <div class="commerce-icon" :class="statusIconClass">
        <i class="bi bi-shop"></i>
      </div>
    </Popper>

    <!-- Commerce Name -->
    <span class="commerce-name-text" :class="statusClass">
      {{ name || $t('dashboard.clientCard.label.noCommerce') || 'N/I' }}
    </span>

    <!-- Commerce Tag -->
    <Popper v-if="tag" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('dashboard.clientCard.tooltip.commerceTag') || 'Tag do comércio' }}</div>
      </template>
      <span class="commerce-tag">
        <i class="bi bi-tags-fill"></i>
        <span class="commerce-tag-text">{{ tag }}</span>
      </span>
    </Popper>

    <!-- Action Buttons -->
    <Popper v-if="commerceLink" :class="'dark'" arrow hover>
      <template #content>
        <div>
          {{
            businessData
              ? $t('dashboard.clientCard.tooltip.copyBusinessData') ||
                'Copiar todos los datos del negocio'
              : $t('dashboard.clientCard.tooltip.copy') || 'Copiar link do comércio'
          }}
        </div>
      </template>
      <button class="btn-copy-mini" @click.stop="copyLink()">
        <i class="bi bi-file-earmark-spreadsheet"></i>
      </button>
    </Popper>
    <Popper v-if="commerceLink" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('dashboard.clientCard.tooltip.openWebsite') || 'Abrir site do comércio' }}</div>
      </template>
      <a class="btn-link-mini" :href="commerceLink" target="_blank" @click.stop>
        <i class="bi bi-box-arrow-up-right"></i>
      </a>
    </Popper>
  </div>
</template>

<style scoped>
/* Commerce Name Container */
.commerce-name-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 6px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  padding: 0.375rem 0.5rem;
}

.commerce-name-container:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 1);
}

.commerce-name-container.commerce-active {
  border-left: none;
}

.commerce-name-container.commerce-active {
  border-left: 3px solid #00c2cb;
}

.commerce-name-container.commerce-inactive {
  border-left: 3px solid #a52a2a;
  opacity: 0.7;
}

/* Commerce Icon */
.commerce-name-container :deep(.inline-block) {
  display: flex !important;
  align-items: center !important;
}

.commerce-icon {
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

.commerce-icon i {
  font-size: 1.125rem;
}

.commerce-icon.icon-success {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
}

.commerce-icon.icon-error {
  background: rgba(165, 42, 42, 0.12);
  color: #a52a2a;
}

.commerce-name-container:hover .commerce-icon {
  transform: scale(1.02);
}

.btn-copy-mini {
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.btn-copy-mini:hover {
  background: rgba(169, 169, 169, 0.1);
  color: rgba(0, 0, 0, 0.7);
}

.btn-copy-mini i {
  font-size: 0.875rem;
}

.btn-link-mini {
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  text-decoration: none;
}

.btn-link-mini:hover {
  background: rgba(169, 169, 169, 0.1);
  color: rgba(0, 0, 0, 0.7);
}

.btn-link-mini i {
  font-size: 0.875rem;
}

/* Commerce Name Text */
.commerce-name-text {
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.commerce-name-text.commerce-active {
  color: #000000;
}

.commerce-name-text.commerce-inactive {
  color: rgba(0, 0, 0, 0.5);
  text-decoration: line-through;
}

/* Commerce Tag */
.commerce-tag {
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

.commerce-tag:hover {
  background: rgba(0, 74, 173, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 74, 173, 0.2);
}

.commerce-tag i {
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.commerce-tag-text {
  font-weight: 700;
  letter-spacing: 0.15px;
}

/* Responsive */
@media (max-width: 768px) {
  .commerce-name-container {
    padding: 0.3125rem 0.4375rem;
    gap: 0.375rem;
  }

  .commerce-icon {
    width: 36px;
    height: 36px;
  }

  .commerce-icon i {
    font-size: 1rem;
  }

  .commerce-name-text {
    font-size: 0.8125rem;
  }

  .commerce-tag {
    font-size: 0.6875rem;
    padding: 0.125rem 0.4375rem;
    gap: 0.3125rem;
  }

  .commerce-tag i {
    font-size: 0.625rem;
  }

  .btn-copy-mini i,
  .btn-link-mini i {
    font-size: 0.8125rem;
  }
}

@media (max-width: 576px) {
  .commerce-name-container {
    padding: 0.25rem 0.375rem;
    gap: 0.25rem;
  }

  .commerce-name-text {
    font-size: 0.75rem;
  }

  .commerce-icon {
    width: 32px;
    height: 32px;
  }

  .commerce-icon i {
    font-size: 0.9375rem;
  }

  .commerce-tag {
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
.commerce-name-container {
  overflow: visible;
}
</style>
