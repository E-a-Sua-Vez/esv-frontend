<script>
import Popper from 'vue3-popper';
import { createEvent } from '../../../application/services/event';

export default {
  name: 'DetailsCard',
  components: { Popper },
  props: {
    show: { type: Boolean, default: true },
    data: { type: [String, Number], default: 'No Data' },
    subdata: { type: [String, Number], default: undefined },
    subdatapastperiod: { type: Object, default: undefined },
    subdatapastmonth: { type: Object, default: undefined },
    subdatacurrentperiod: { type: Object, default: undefined },
    title: { type: String, default: 'No Title' },
    showTooltip: { type: Boolean, default: false },
    description: { type: String, default: 'No Data' },
    icon: { type: String, default: '' },
    iconStyleClass: { type: String, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    showDetailsSection: { type: Boolean, default: true },
  },
  data() {
    return {
      reportedError: false,
      extendedEntity: false,
    };
  },
  methods: {
    reportError() {
      const body = { error: this.stack };
      const errorReported = new ErrorReported(new Date(), body);
      createEvent(errorReported);
      this.reportedError = true;
    },
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    showTrend(period) {
      if (period && period.number >= 0) {
        if (this.data > period.number) {
          return 'bi-arrow-up-circle-fill green-icon';
        } else if (period.number === this.data) {
          return 'bi-asterisk blue-icon';
        } else if (this.data < period.number) {
          return 'bi-arrow-down-circle-fill red-icon';
        } else {
          return 'bi-exclamation-circle-fill blue-icon';
        }
      }
      return '';
    },
    npsColorTrend(data) {
      if (!data) {
        return 'blue-icon';
      } else if (data < 0) {
        return 'red-icon';
      } else if (data <= 39) {
        return 'yellow-icon';
      } else if (data <= 74) {
        return 'blue-icon';
      } else {
        return 'green-icon';
      }
    },
    getPastPeriodPercentage(period) {
      if (period && period.number >= 0) {
        const percentage = (this.data * 100) / (period.number === 0 ? 1 : period.number);
        return parseFloat(percentage.toFixed(2));
      }
      return 0;
    },
    getPastMonthPercentage(pastPeriod, currentPeriod) {
      if (pastPeriod && currentPeriod && pastPeriod.number && currentPeriod.number) {
        const percentage = (currentPeriod.number * 100) / pastPeriod.number;
        return percentage === Infinity
          ? pastPeriod.number * 100
          : parseFloat(percentage.toFixed(2)) || pastPeriod.number * 100;
      }
      return 0;
    },
    getVariationPercentage(period) {
      if (period && period.number >= 0) {
        const variation =
          ((this.data - period.number) / (period.number === 0 ? 1 : period.number)) * 100;
        return parseFloat(variation.toFixed(1));
      }
      return 0;
    },
    getMonthVariationPercentage(pastPeriod, currentPeriod) {
      if (pastPeriod && currentPeriod && pastPeriod.number && currentPeriod.number) {
        const variation = ((currentPeriod.number - pastPeriod.number) / pastPeriod.number) * 100;
        return parseFloat(variation.toFixed(1));
      }
      return 0;
    },
    getComparisonIconClass(period) {
      if (period && period.number >= 0) {
        if (this.data > period.number) return 'comparison-icon-up';
        if (this.data < period.number) return 'comparison-icon-down';
        return 'comparison-icon-neutral';
      }
      return 'comparison-icon-neutral';
    },
    getComparisonValueClass(period) {
      if (period && period.number >= 0) {
        if (this.data > period.number) return 'comparison-value-up';
        if (this.data < period.number) return 'comparison-value-down';
        return 'comparison-value-neutral';
      }
      return 'comparison-value-neutral';
    },
    getComparisonArrowIcon(period) {
      if (period && period.number >= 0) {
        if (this.data > period.number) return 'bi-arrow-up-circle-fill';
        if (this.data < period.number) return 'bi-arrow-down-circle-fill';
        return 'bi-dash-circle-fill';
      }
      return 'bi-dash-circle-fill';
    },
    getMonthComparisonValueClass(pastPeriod, currentPeriod) {
      if (pastPeriod && currentPeriod && pastPeriod.number && currentPeriod.number) {
        if (currentPeriod.number > pastPeriod.number) return 'comparison-value-up';
        if (currentPeriod.number < pastPeriod.number) return 'comparison-value-down';
        return 'comparison-value-neutral';
      }
      return 'comparison-value-neutral';
    },
    getMonthComparisonArrowIcon(pastPeriod, currentPeriod) {
      if (pastPeriod && currentPeriod && pastPeriod.number && currentPeriod.number) {
        if (currentPeriod.number > pastPeriod.number) return 'bi-arrow-up-circle-fill';
        if (currentPeriod.number < pastPeriod.number) return 'bi-arrow-down-circle-fill';
        return 'bi-dash-circle-fill';
      }
      return 'bi-dash-circle-fill';
    },
    getData() {
      if (this.data !== undefined && this.data !== '') {
        if (Number.isNaN()) {
          return this.data;
        } else {
          try {
            return parseFloat(this.data.toFixed(2)) || 0;
          } catch (error) {
            return this.data;
          }
        }
      }
      return 'No Data';
    },
    getCardTypeClass() {
      const iconClass = this.iconStyleClass || this.npsColorTrend(this.data);
      if (iconClass.includes('green')) return 'metric-type-success';
      if (iconClass.includes('yellow')) return 'metric-type-warning';
      if (iconClass.includes('red')) return 'metric-type-error';
      if (iconClass.includes('blue')) return 'metric-type-info';
      return 'metric-type-neutral';
    },
    getIconContainerClass() {
      const iconClass = this.iconStyleClass || this.npsColorTrend(this.data);
      if (iconClass.includes('green')) return 'icon-success';
      if (iconClass.includes('yellow')) return 'icon-warning';
      if (iconClass.includes('red')) return 'icon-error';
      if (iconClass.includes('blue')) return 'icon-info';
      return 'icon-neutral';
    },
  },
  watch: {
    detailsOpened: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.detailsOpened;
      },
    },
    extendedEntity: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.extendedEntity;
      },
    },
  },
};
</script>

<template>
  <div v-if="show" class="details-card-wrapper">
    <div class="modern-details-card" :class="getCardTypeClass()">
      <div class="metric-card-header">
        <div class="metric-icon-container" :class="getIconContainerClass()">
          <i :class="`bi bi-${icon}`"></i>
        </div>
        <div class="metric-title-section">
          <span class="metric-label">{{ title }}</span>
          <Popper
            v-if="showTooltip"
            :class="'dark'"
            arrow
            disable-click-away
            :content="description"
          >
            <i class="bi bi-info-circle metric-info-icon"></i>
          </Popper>
        </div>
      </div>

      <div class="metric-value-container">
        <span class="metric-value">{{ getData() }}</span>
        <span v-if="subdata" class="metric-subdata">
          {{ subdata }}
        </span>
        <div v-if="subdatapastperiod" class="metric-trend-indicator">
          <i :class="`bi ${showTrend(subdatapastperiod)}`"></i>
        </div>
      </div>

      <!-- Comparison Data -->
      <div v-if="subdatapastperiod || subdatapastmonth" class="metric-comparison-section">
        <div v-if="subdatapastperiod" class="comparison-item">
          <div class="comparison-header">
            <div class="comparison-icon-wrapper" :class="getComparisonIconClass(subdatapastperiod)">
              <i :class="`bi ${showTrend(subdatapastperiod)}`"></i>
            </div>
            <div class="comparison-title-section">
              <span class="comparison-label">{{ $t('dashboard.items.attentions.22') }}</span>
              <p v-if="subdatapastperiod.from && subdatapastperiod.to" class="comparison-date">
                {{ subdatapastperiod.from.substring(2, 10) }} |
                {{ subdatapastperiod.to.substring(2, 10) }}
              </p>
            </div>
          </div>
          <div class="comparison-visualization">
            <div class="comparison-bars">
              <div class="comparison-bar-wrapper">
                <div class="comparison-bar-label">Período Anterior</div>
                <div class="comparison-bar-container">
                  <div
                    class="comparison-bar comparison-bar-previous"
                    :style="`width: ${Math.min(
                      100,
                      (subdatapastperiod.number / Math.max(data, subdatapastperiod.number)) * 100
                    )}%`"
                  >
                    <span class="comparison-bar-value">{{ subdatapastperiod.number || 0 }}</span>
                  </div>
                </div>
              </div>
              <div class="comparison-bar-wrapper">
                <div class="comparison-bar-label">Período Actual</div>
                <div class="comparison-bar-container">
                  <div
                    class="comparison-bar comparison-bar-current"
                    :style="`width: ${Math.min(
                      100,
                      (data / Math.max(data, subdatapastperiod.number)) * 100
                    )}%`"
                  >
                    <span class="comparison-bar-value">{{ data || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="comparison-stats">
              <div class="comparison-stat-item">
                <div class="comparison-stat-label">Variação</div>
                <div
                  class="comparison-stat-value"
                  :class="getComparisonValueClass(subdatapastperiod)"
                >
                  <i :class="`bi ${getComparisonArrowIcon(subdatapastperiod)}`"></i>
                  {{ getVariationPercentage(subdatapastperiod) }}%
                </div>
              </div>
              <div class="comparison-stat-item">
                <div class="comparison-stat-label">Percentual</div>
                <div class="comparison-stat-value comparison-stat-percentage">
                  {{ getPastPeriodPercentage(subdatapastperiod) }}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="subdatapastmonth" class="comparison-item">
          <div class="comparison-header">
            <div class="comparison-icon-wrapper comparison-icon-month">
              <i class="bi bi-speedometer"></i>
            </div>
            <div class="comparison-title-section">
              <span class="comparison-label">{{ $t('dashboard.items.attentions.23') }}</span>
              <p v-if="subdatapastperiod.from && subdatapastperiod.to" class="comparison-date">
                {{ subdatacurrentperiod.from.substring(2, 7) }} |
                {{ subdatapastmonth.to.substring(2, 7) }}
              </p>
            </div>
          </div>
          <div class="comparison-visualization">
            <div class="comparison-bars">
              <div class="comparison-bar-wrapper">
                <div class="comparison-bar-label">Mês Anterior</div>
                <div class="comparison-bar-container">
                  <div
                    class="comparison-bar comparison-bar-previous"
                    :style="`width: ${Math.min(
                      100,
                      (subdatapastmonth.number /
                        Math.max(subdatacurrentperiod.number, subdatapastmonth.number)) *
                        100
                    )}%`"
                  >
                    <span class="comparison-bar-value">{{ subdatapastmonth.number || 0 }}</span>
                  </div>
                </div>
              </div>
              <div class="comparison-bar-wrapper">
                <div class="comparison-bar-label">Mês Atual</div>
                <div class="comparison-bar-container">
                  <div
                    class="comparison-bar comparison-bar-current"
                    :style="`width: ${Math.min(
                      100,
                      (subdatacurrentperiod.number /
                        Math.max(subdatacurrentperiod.number, subdatapastmonth.number)) *
                        100
                    )}%`"
                  >
                    <span class="comparison-bar-value">{{ subdatacurrentperiod.number || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="comparison-stats">
              <div class="comparison-stat-item">
                <div class="comparison-stat-label">Alcance</div>
                <div
                  class="comparison-stat-value"
                  :class="getMonthComparisonValueClass(subdatapastmonth, subdatacurrentperiod)"
                >
                  <i
                    :class="`bi ${getMonthComparisonArrowIcon(
                      subdatapastmonth,
                      subdatacurrentperiod
                    )}`"
                  ></i>
                  {{ getMonthVariationPercentage(subdatapastmonth, subdatacurrentperiod) }}%
                </div>
              </div>
              <div class="comparison-stat-item">
                <div class="comparison-stat-label">Percentual</div>
                <div class="comparison-stat-value comparison-stat-percentage">
                  {{ getPastMonthPercentage(subdatapastmonth, subdatacurrentperiod) }}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="metric-card-accent"></div>
    </div>

    <!-- Expandable Details Section -->
    <div v-if="showDetailsSection" class="details-expandable-section">
      <button
        class="details-toggle-btn"
        @click.prevent="showDetails()"
        :aria-expanded="extendedEntity"
      >
        <span class="details-toggle-text">{{ $t('dashboard.details') }}</span>
        <i
          class="bi details-toggle-icon"
          :class="extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'"
        ></i>
      </button>
      <Transition name="details-expand">
        <div v-if="extendedEntity" class="detailed-data">
          <slot name="details"></slot>
        </div>
      </Transition>
    </div>
    <div v-else class="details-placeholder">
      <span class="details-placeholder-text">—</span>
    </div>
  </div>
</template>

<style scoped>
.details-card-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.modern-details-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  padding: 1.25rem 1rem;
  margin: 0.5rem;
  margin-bottom: 0;
  border-radius: 12px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-bottom: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.modern-details-card::before {
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

.modern-details-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgba(169, 169, 169, 0.3);
}

.modern-details-card:hover::before {
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

.modern-details-card:hover .metric-icon-container {
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
  margin-bottom: 1rem;
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

.metric-trend-indicator {
  margin-left: auto;
}

.metric-trend-indicator i {
  font-size: 1.25rem;
}

/* Comparison Section */
.metric-comparison-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
  margin-top: 1rem;
}

.comparison-item {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 10px;
  border: 1px solid rgba(169, 169, 169, 0.1);
  transition: all 0.2s ease;
}

.comparison-item:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(169, 169, 169, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.comparison-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.comparison-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.comparison-icon-wrapper i {
  font-size: 1.25rem;
}

.comparison-icon-up {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.comparison-icon-down {
  background: rgba(165, 42, 42, 0.15);
  color: #a52a2a;
}

.comparison-icon-neutral {
  background: rgba(169, 169, 169, 0.15);
  color: #a9a9a9;
}

.comparison-icon-month {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
}

.comparison-title-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.comparison-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  line-height: 1.3;
}

.comparison-date {
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.5);
  margin: 0;
  line-height: 1.3;
}

/* Comparison Visualization */
.comparison-visualization {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.comparison-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.comparison-bar-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.comparison-bar-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comparison-bar-container {
  width: 100%;
  height: 28px;
  background: rgba(169, 169, 169, 0.1);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

.comparison-bar {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 0.5rem;
  border-radius: 6px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  min-width: 40px;
}

.comparison-bar-previous {
  background: linear-gradient(135deg, rgba(169, 169, 169, 0.4) 0%, rgba(169, 169, 169, 0.3) 100%);
  border: 1px solid rgba(169, 169, 169, 0.3);
}

.comparison-bar-current {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.6) 0%, rgba(0, 194, 203, 0.5) 100%);
  border: 1px solid rgba(0, 74, 173, 0.4);
}

.comparison-bar-value {
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
}

.comparison-bar-previous .comparison-bar-value {
  color: rgba(0, 0, 0, 0.7);
  text-shadow: none;
}

/* Comparison Stats */
.comparison-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(169, 169, 169, 0.1);
}

.comparison-stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.comparison-stat-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.comparison-stat-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #000000;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.comparison-stat-value i {
  font-size: 1rem;
}

.comparison-value-up {
  color: #00c2cb;
}

.comparison-value-up i {
  color: #00c2cb;
}

.comparison-value-down {
  color: #a52a2a;
}

.comparison-value-down i {
  color: #a52a2a;
}

.comparison-value-neutral {
  color: #a9a9a9;
}

.comparison-value-neutral i {
  color: #a9a9a9;
}

.comparison-stat-percentage {
  color: #004aad;
  font-size: 1.25rem;
}

/* Responsive */
@media (max-width: 768px) {
  .metric-comparison-section {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .comparison-item {
    padding: 0.875rem;
  }

  .comparison-bar-container {
    height: 24px;
  }

  .comparison-stat-value {
    font-size: 1rem;
  }
}

@media (max-width: 576px) {
  .comparison-stats {
    grid-template-columns: 1fr;
  }

  .comparison-bar-container {
    height: 20px;
  }

  .comparison-bar-value {
    font-size: 0.65rem;
  }
}

/* Details Expandable Section */
.details-expandable-section {
  margin: 0.5rem;
  margin-top: 0;
  border-radius: 0 0 12px 12px;
  overflow: hidden;
  background: rgba(245, 246, 247, 0.6);
  border: 1px solid rgba(169, 169, 169, 0.15);
  border-top: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.details-toggle-btn {
  width: 100%;
  padding: 0.5rem 1rem;
  background: rgba(245, 246, 247, 0.8);
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s ease;
  color: rgba(0, 0, 0, 0.7);
}

.details-toggle-btn:hover {
  background: rgba(235, 236, 237, 0.9);
  color: rgba(0, 0, 0, 0.85);
}

.details-toggle-btn:focus {
  outline: 2px solid #004aad;
  outline-offset: -2px;
}

.details-toggle-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
}

.details-toggle-icon {
  font-size: 0.75rem;
  color: rgba(169, 169, 169, 0.7);
  transition: transform 0.2s ease;
}

.details-toggle-btn[aria-expanded='true'] .details-toggle-icon {
  transform: rotate(180deg);
}

.detailed-data {
  padding: 1rem;
  max-height: 800px;
  overflow-y: auto;
  background: rgba(250, 251, 252, 0.5);
}

/* Transition for expandable section */
.details-expand-enter-active,
.details-expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.details-expand-enter-from,
.details-expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.details-expand-enter-to,
.details-expand-leave-from {
  max-height: 800px;
  opacity: 1;
}

.details-placeholder {
  margin: 0.5rem;
  margin-top: 0;
  padding: 0.5rem;
  text-align: center;
  border-radius: 0 0 12px 12px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-top: none;
}

.details-placeholder-text {
  color: #a9a9a9;
  font-size: 0.875rem;
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

.modern-details-card:hover .metric-card-accent {
  opacity: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .modern-details-card {
    padding: 1rem 0.75rem;
  }

  .metric-value {
    font-size: 1.25rem;
  }

  .metric-comparison-section {
    grid-template-columns: 1fr;
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
  .modern-details-card {
    padding: 0.75rem 0.5rem;
    margin: 0.25rem;
    margin-bottom: 0;
  }

  .metric-value {
    font-size: 1.125rem;
  }

  .metric-label {
    font-size: 0.75rem;
  }
}
</style>
