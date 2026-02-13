<script>
import Popper from 'vue3-popper';

export default {
  name: 'FinancialKPICard',
  components: { Popper },
  props: {
    show: { type: Boolean, default: true },
    title: { type: String, required: true },
    value: { type: [Number, String], default: 0 },
    change: { type: Number, default: undefined },
    changeLabel: { type: String, default: undefined },
    icon: { type: String, default: 'bi-graph-up' },
    iconStyleClass: { type: String, default: 'blue-icon' },
    showTooltip: { type: Boolean, default: false },
    description: { type: String, default: '' },
    formatCurrency: { type: Boolean, default: true },
    formatPercentage: { type: Boolean, default: false },
  },
  methods: {
    getFormattedValue() {
      if (this.value === undefined || this.value === null || this.value === '') {
        return '0';
      }
      if (this.formatPercentage) {
        return `${Number(this.value).toFixed(2)}%`;
      }
      if (this.formatCurrency) {
        const numValue = Number(this.value);
        if (isNaN(numValue)) return this.value;
        return numValue.toLocaleString('de-DE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
      const numValue = Number(this.value);
      if (isNaN(numValue)) return this.value;
      return numValue.toLocaleString('de-DE');
    },
    getChangeIcon() {
      if (this.change === undefined || this.change === null) return '';
      if (this.change > 0) return 'bi-arrow-up-circle-fill';
      if (this.change < 0) return 'bi-arrow-down-circle-fill';
      return 'bi-dash-circle';
    },
    getChangeClass() {
      if (this.change === undefined || this.change === null) return 'change-neutral';
      if (this.change > 0) return 'change-positive';
      if (this.change < 0) return 'change-negative';
      return 'change-neutral';
    },
    getCardTypeClass() {
      const iconClass = this.iconStyleClass || 'blue-icon';
      if (iconClass.includes('green')) return 'metric-type-success';
      if (iconClass.includes('yellow')) return 'metric-type-warning';
      if (iconClass.includes('red')) return 'metric-type-error';
      if (iconClass.includes('blue')) return 'metric-type-info';
      return 'metric-type-neutral';
    },
    getIconContainerClass() {
      const iconClass = this.iconStyleClass || 'blue-icon';
      if (iconClass.includes('green')) return 'icon-success';
      if (iconClass.includes('yellow')) return 'icon-warning';
      if (iconClass.includes('red')) return 'icon-error';
      if (iconClass.includes('blue')) return 'icon-info';
      return 'icon-neutral';
    },
  },
};
</script>

<template>
  <div v-if="show" class="modern-metric-card" :class="getCardTypeClass()">
    <div class="metric-card-header">
      <div class="metric-icon-container" :class="getIconContainerClass()">
        <i :class="`bi ${icon}`"></i>
      </div>
      <div class="metric-title-section">
        <span class="metric-label">{{ title }}</span>
        <Popper v-if="showTooltip" :class="'dark'" arrow disable-click-away :content="description">
          <i class="bi bi-info-circle metric-info-icon"></i>
        </Popper>
      </div>
    </div>
    <div class="metric-value-container">
      <div class="metric-value-section">
        <span class="metric-value">{{ getFormattedValue() }}</span>
      </div>
      <div v-if="change !== undefined && change !== null" class="metric-change-section">
        <span class="metric-change" :class="getChangeClass()">
          <i :class="`bi ${getChangeIcon()}`"></i>
          <span>{{ Math.abs(change).toFixed(2) }}%</span>
          <span v-if="changeLabel" class="change-label">{{ changeLabel }}</span>
        </span>
      </div>
    </div>
    <div class="metric-card-accent"></div>
  </div>
</template>

<style scoped>
/* Modern Metric Card - matching SimpleCard style */
.modern-metric-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  padding: 0.625rem 0.5rem;
  margin: 0.375rem;
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.modern-metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #00c2cb 0%, #00c4cc 50%, #00c2cb 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.modern-metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgba(169, 169, 169, 0.3);
}

.modern-metric-card:hover::before {
  opacity: 0.6;
}

/* Metric Type Variations */
.metric-type-success {
  border-left: 3px solid #00c2cb;
}

.metric-type-success:hover {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.05) 0%, rgba(0, 194, 203, 0.02) 100%);
}

.metric-type-warning {
  border-left: 3px solid #f9c322;
}

.metric-type-warning:hover {
  background: linear-gradient(135deg, rgba(249, 195, 34, 0.05) 0%, rgba(249, 195, 34, 0.02) 100%);
}

.metric-type-error {
  border-left: 3px solid #a52a2a;
}

.metric-type-error:hover {
  background: linear-gradient(135deg, rgba(165, 42, 42, 0.05) 0%, rgba(165, 42, 42, 0.02) 100%);
}

.metric-type-info {
  border-left: 3px solid #004aad;
}

.metric-type-info:hover {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.05) 0%, rgba(0, 74, 173, 0.02) 100%);
}

.metric-type-neutral {
  border-left: 3px solid #a9a9a9;
}

/* Card Header */
.metric-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.metric-icon-container {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.modern-metric-card:hover .metric-icon-container {
  transform: scale(1.1) rotate(5deg);
}

.icon-success {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.icon-warning {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
}

.icon-error {
  background: rgba(165, 42, 42, 0.15);
  color: #a52a2a;
}

.icon-info {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
}

.icon-neutral {
  background: rgba(169, 169, 169, 0.15);
  color: #a9a9a9;
}

.metric-icon-container i {
  font-size: 1rem;
}

.metric-title-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.metric-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  letter-spacing: 0.01em;
  line-height: 1.4;
}

.metric-info-icon {
  font-size: 0.75rem;
  color: #a9a9a9;
  cursor: help;
  transition: color 0.15s ease;
}

.metric-info-icon:hover {
  color: #004aad;
}

/* Popper Styles with proper z-index - Higher than all cards and modals */
:deep(.vue3-popper) {
  z-index: 99999 !important;
  position: fixed !important;
  pointer-events: auto !important;
}

:deep(.vue3-popper__inner) {
  z-index: 99999 !important;
  position: relative;
  pointer-events: auto !important;
}

:deep(.vue3-popper__arrow) {
  z-index: 100000 !important;
  pointer-events: auto !important;
}

:deep(.vue3-popper__wrapper) {
  z-index: 99999 !important;
  position: fixed !important;
  pointer-events: auto !important;
}

/* Ensure parent containers don't clip poppers */
.metric-title-section {
  overflow: visible !important;
  position: relative;
  z-index: 1;
}

.modern-metric-card {
  overflow: visible !important;
  position: relative;
  z-index: 1;
}

/* Ensure all parent containers allow overflow */
:deep(.row),
:deep(.col),
:deep(.col-12),
:deep(.col-md-6) {
  overflow: visible !important;
}

/* Value Container */
.metric-value-container {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.metric-value-section {
  display: flex;
  align-items: baseline;
}

.metric-change-section {
  display: flex;
  align-items: center;
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.metric-change {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.4rem;
  border-radius: 9999px;
  white-space: nowrap;
}

.metric-change i {
  font-size: 0.75rem;
}

.change-positive {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.change-negative {
  background: rgba(165, 42, 42, 0.15);
  color: #a52a2a;
}

.change-neutral {
  background: rgba(169, 169, 169, 0.15);
  color: #a9a9a9;
}

.change-label {
  font-size: 0.65rem;
  font-weight: 500;
  opacity: 0.8;
}

/* Accent Bar */
.metric-card-accent {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(169, 169, 169, 0.2) 50%,
    transparent 100%
  );
  opacity: 0;
  transition: opacity 0.2s ease;
}

.modern-metric-card:hover .metric-card-accent {
  opacity: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .modern-metric-card {
    padding: 0.5rem 0.375rem;
  }

  .metric-value {
    font-size: 1.125rem;
  }

  .metric-icon-container {
    width: 28px;
    height: 28px;
  }

  .metric-icon-container i {
    font-size: 0.9rem;
  }
}

@media (max-width: 576px) {
  .modern-metric-card {
    padding: 0.5rem 0.375rem;
    margin: 0.25rem;
  }

  .metric-value {
    font-size: 1rem;
  }

  .metric-label {
    font-size: 0.7rem;
  }

  .metric-change {
    font-size: 0.625rem;
    padding: 0.125rem 0.3rem;
  }
}
</style>
