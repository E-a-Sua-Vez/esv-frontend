<script>
import Popper from 'vue3-popper';
import { createEvent } from '../../../application/services/event';

export default {
  name: 'SimpleCard',
  components: { Popper },
  props: {
    show: { type: Boolean, default: true },
    data: { type: [String, Number], default: 'No Data' },
    subdata: { type: [String, Number], default: undefined },
    title: { type: String, default: 'No Title' },
    showTooltip: { type: Boolean, default: false },
    description: { type: String, default: 'No Data' },
    icon: { type: String, default: '' },
    iconStyleClass: { type: String, default: 'blue-icon' },
  },
  data() {
    return {
      reportedError: false,
    };
  },
  methods: {
    reportError() {
      const body = { error: this.stack };
      const errorReported = new ErrorReported(new Date(), body);
      createEvent(errorReported);
      this.reportedError = true;
    },
    getData() {
      if (this.data !== undefined && this.data !== null && this.data !== '') {
        if (isNaN(this.data)) {
          return this.data;
        } else {
          if (Number.isInteger(this.data)) {
            return Number(this.data.toFixed(2)).toLocaleString('de-DE');
          } else {
            return Number(this.data.toFixed(2)).toLocaleString('de-DE');
          }
        }
      } else {
        return 'No Data';
      }
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
        <i :class="`bi bi-${icon}`"></i>
      </div>
      <div class="metric-title-section">
        <span class="metric-label">{{ title }}</span>
        <Popper v-if="showTooltip" :class="'dark'" arrow disable-click-away :content="description">
          <i class="bi bi-info-circle metric-info-icon"></i>
        </Popper>
      </div>
    </div>
    <div class="metric-value-container">
      <span class="metric-value">{{ getData() }}</span>
      <span v-if="subdata !== undefined" class="metric-subdata">
        {{ subdata }}
      </span>
    </div>
    <div class="metric-card-accent"></div>
  </div>
</template>

<style scoped>
.modern-metric-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  padding: 1.25rem 1rem;
  margin: 0.5rem;
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
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
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.metric-icon-container {
  width: 40px;
  height: 40px;
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
  font-size: 1.25rem;
}

.metric-title-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.metric-label {
  font-size: 0.875rem;
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

/* Value Container */
.metric-value-container {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.metric-subdata {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
  background: rgba(169, 169, 169, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  white-space: nowrap;
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
    padding: 1rem 0.75rem;
  }

  .metric-value {
    font-size: 1.25rem;
  }

  .metric-icon-container {
    width: 32px;
    height: 32px;
  }

  .metric-icon-container i {
    font-size: 1.1rem;
  }
}

@media (max-width: 576px) {
  .modern-metric-card {
    padding: 0.75rem 0.5rem;
    margin: 0.25rem;
  }

  .metric-value {
    font-size: 1.125rem;
  }

  .metric-label {
    font-size: 0.75rem;
  }
}
</style>
