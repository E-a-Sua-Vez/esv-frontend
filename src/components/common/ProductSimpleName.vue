<script>
import Popper from 'vue3-popper';

export default {
  name: 'ProductSimpleName',
  components: { Popper },
  props: {
    product: { type: Object, default: { name: '', active: false, tag: '' } },
    details: { type: Boolean, default: false },
  },
  computed: {
    statusClass() {
      return this.product.active === true ? 'product-active' : 'product-inactive';
    },
    statusIconClass() {
      return this.product.active === true ? 'icon-success' : 'icon-error';
    },
    statusTooltip() {
      return this.product.active === true
        ? this.$t('dashboard.clientCard.tooltip.productActive') || 'Produto ativo'
        : this.$t('dashboard.clientCard.tooltip.productInactive') || 'Produto inativo';
    },
  },
};
</script>

<template>
  <div class="product-name-container" :class="statusClass">
    <!-- Product Icon -->
    <Popper :class="'dark'" arrow hover>
      <template #content>
        <div>{{ statusTooltip }}</div>
      </template>
      <div class="product-icon" :class="statusIconClass">
        <i class="bi bi-eyedropper"></i>
      </div>
    </Popper>

    <!-- Product Name -->
    <span class="product-name-text" :class="statusClass">
      {{ product.name || $t('dashboard.clientCard.label.noProduct') || 'N/I' }}
    </span>

    <!-- Product Tag -->
    <Popper v-if="product.tag" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('dashboard.clientCard.tooltip.productTag') || 'Tag do produto' }}</div>
      </template>
      <span class="product-tag">
        <i class="bi bi-tags-fill"></i>
        <span class="product-tag-text">{{ product.tag }}</span>
      </span>
    </Popper>
  </div>
</template>

<style scoped>
/* Product Name Container */
.product-name-container {
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

.product-name-container:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 1);
}

.product-name-container.product-active {
  border-left: 3px solid #00c2cb;
}

.product-name-container.product-inactive {
  border-left: 3px solid #a52a2a;
  opacity: 0.7;
}

/* Product Icon */
.product-name-container :deep(.inline-block) {
  display: flex !important;
  align-items: center !important;
}

.product-icon {
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

.product-icon i {
  font-size: 0.9375rem;
}

.product-icon.icon-success {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
}

.product-icon.icon-error {
  background: rgba(165, 42, 42, 0.12);
  color: #a52a2a;
}

.product-name-container:hover .product-icon {
  transform: scale(1.02);
}

/* Product Name Text */
.product-name-text {
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.product-name-text.product-active {
  color: #000000;
}

.product-name-text.product-inactive {
  color: rgba(0, 0, 0, 0.5);
  text-decoration: line-through;
}

/* Product Tag */
.product-tag {
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

.product-tag:hover {
  background: rgba(0, 74, 173, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 74, 173, 0.2);
}

.product-tag i {
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.product-tag-text {
  font-weight: 700;
  letter-spacing: 0.15px;
}

/* Responsive */
@media (max-width: 768px) {
  .product-name-container {
    padding: 0.25rem 0.4375rem;
    gap: 0.3125rem;
  }

  .product-icon {
    width: 28px;
    height: 28px;
  }

  .product-icon i {
    font-size: 0.875rem;
  }

  .product-name-text {
    font-size: 0.75rem;
  }

  .product-tag {
    font-size: 0.625rem;
    padding: 0.1rem 0.3125rem;
    gap: 0.25rem;
  }

  .product-tag i {
    font-size: 0.5625rem;
  }
}

@media (max-width: 576px) {
  .product-name-container {
    padding: 0.1875rem 0.375rem;
    gap: 0.25rem;
  }

  .product-name-text {
    font-size: 0.6875rem;
  }

  .product-icon {
    width: 24px;
    height: 24px;
  }

  .product-icon i {
    font-size: 0.8125rem;
  }

  .product-tag {
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
.product-name-container {
  overflow: visible;
}
</style>
