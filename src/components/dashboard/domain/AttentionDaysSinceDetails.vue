<script>
import Popper from 'vue3-popper';

export default {
  name: 'AttentionDaysSinceDetails',
  components: { Popper },
  props: {
    show: { type: Boolean, default: true },
    count: { type: [String, Number], default: 'No Data' },
    distribution: { type: Object, default: {} },
  },
  data() {
    return {};
  },
  methods: {
    scorePercentage(total, tag) {
      return parseFloat(((tag * 100) / total).toFixed(2), 2) || 0;
    },
  },
};
</script>

<template>
  <div v-if="show" class="modern-metric-card metric-type-info">
    <div class="metric-card-header">
      <div class="metric-icon-container icon-info">
        <i class="bi bi-clock-history"></i>
      </div>
      <div class="metric-title-section">
        <span class="metric-label">{{ $t('dashboard.items.attentions.33') }}</span>
        <Popper :class="'dark'" arrow disable-click-away :content="$t('dashboard.daysSince')">
          <i class="bi bi-info-circle metric-info-icon"></i>
        </Popper>
      </div>
    </div>
    <div class="metric-value-container">
      <span class="metric-value">{{ count || 0 }}</span>
      <span v-if="count >= 0" class="metric-subdata">{{
        $t('dashboard.clients') || 'Clientes'
      }}</span>
    </div>

    <div v-if="count && count > 0" class="days-since-distribution">
      <div class="distribution-grid">
        <div class="distribution-item distribution-early">
          <div class="distribution-header">
            <div class="distribution-icon-wrapper icon-early">
              <i class="bi bi-check-circle-fill"></i>
            </div>
            <div class="distribution-label">{{ $t('dashboard.early') }}</div>
          </div>
          <div class="distribution-value">
            <span class="distribution-number">{{
              distribution.EARLY ? distribution.EARLY : 0
            }}</span>
            <span class="distribution-percentage">
              {{ scorePercentage(count, distribution.EARLY ? distribution.EARLY : 0) }}%
            </span>
          </div>
        </div>

        <div class="distribution-item distribution-medium">
          <div class="distribution-header">
            <div class="distribution-icon-wrapper icon-medium">
              <i class="bi bi-exclamation-circle-fill"></i>
            </div>
            <div class="distribution-label">{{ $t('dashboard.medium') }}</div>
          </div>
          <div class="distribution-value">
            <span class="distribution-number">{{
              distribution.MEDIUM ? distribution.MEDIUM : 0
            }}</span>
            <span class="distribution-percentage">
              {{ scorePercentage(count, distribution.MEDIUM ? distribution.MEDIUM : 0) }}%
            </span>
          </div>
        </div>

        <div class="distribution-item distribution-late">
          <div class="distribution-header">
            <div class="distribution-icon-wrapper icon-late">
              <i class="bi bi-x-circle-fill"></i>
            </div>
            <div class="distribution-label">{{ $t('dashboard.late') }}</div>
          </div>
          <div class="distribution-value">
            <span class="distribution-number">{{ distribution.LATE ? distribution.LATE : 0 }}</span>
            <span class="distribution-percentage">
              {{ scorePercentage(count, distribution.LATE ? distribution.LATE : 0) }}%
            </span>
          </div>
        </div>
      </div>

      <div class="progress-container">
        <div class="modern-progress">
          <div
            class="progress-segment progress-early"
            :style="`width: ${scorePercentage(
              count,
              distribution.EARLY ? distribution.EARLY : 0
            )}%`"
          >
            <span
              v-if="scorePercentage(count, distribution.EARLY ? distribution.EARLY : 0) > 5"
              class="progress-label"
            >
              {{ distribution.EARLY ? distribution.EARLY : 0 }}
            </span>
          </div>
          <div
            class="progress-segment progress-medium"
            :style="`width: ${scorePercentage(
              count,
              distribution.MEDIUM ? distribution.MEDIUM : 0
            )}%`"
          >
            <span
              v-if="scorePercentage(count, distribution.MEDIUM ? distribution.MEDIUM : 0) > 5"
              class="progress-label"
            >
              {{ distribution.MEDIUM ? distribution.MEDIUM : 0 }}
            </span>
          </div>
          <div
            class="progress-segment progress-late"
            :style="`width: ${scorePercentage(count, distribution.LATE ? distribution.LATE : 0)}%`"
          >
            <span
              v-if="scorePercentage(count, distribution.LATE ? distribution.LATE : 0) > 5"
              class="progress-label"
            >
              {{ distribution.LATE ? distribution.LATE : 0 }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="no-data-section">
      <i class="bi bi-inbox no-data-icon"></i>
      <span class="no-data-text">{{ 'No Data' }}</span>
    </div>

    <div class="metric-card-accent"></div>
  </div>
</template>

<style scoped>
/* Modern Metric Card - matching SimpleCard style */
.modern-metric-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  padding: 1rem 0.875rem;
  margin: 0.5rem;
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
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

.metric-type-info {
  border-left: 3px solid #004aad;
}

.metric-type-info:hover {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.05) 0%, rgba(0, 74, 173, 0.02) 100%);
}

/* Card Header - matching SimpleCard */
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

.icon-info {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
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
  margin-bottom: 0.5rem;
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

/* Distribution Section - compact */
.days-since-distribution {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.distribution-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.625rem;
}

.distribution-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.5rem;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
}

.distribution-item:hover {
  background: rgba(0, 0, 0, 0.04);
  transform: translateY(-2px);
}

.distribution-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.distribution-icon-wrapper {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.distribution-icon-wrapper i {
  font-size: 0.75rem;
  color: #fff;
}

.icon-early {
  background: linear-gradient(135deg, #00c2cb 0%, #00c4cc 100%);
}

.icon-medium {
  background: linear-gradient(135deg, #f9c322 0%, #fac107 100%);
}

.icon-late {
  background: linear-gradient(135deg, #a52a2a 0%, #c0392b 100%);
}

.distribution-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  line-height: 1.2;
}

.distribution-value {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.distribution-number {
  font-size: 0.875rem;
  font-weight: 700;
  color: #000;
}

.distribution-percentage {
  font-size: 0.65rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  background: rgba(169, 169, 169, 0.1);
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
}

/* Progress Bar - compact */
.progress-container {
  margin-top: 0.5rem;
}

.modern-progress {
  display: flex;
  height: 20px;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.progress-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.3s ease;
  position: relative;
}

.progress-early {
  background: linear-gradient(135deg, #00c2cb 0%, #00c4cc 100%);
}

.progress-medium {
  background: linear-gradient(135deg, #f9c322 0%, #fac107 100%);
}

.progress-late {
  background: linear-gradient(135deg, #a52a2a 0%, #c0392b 100%);
}

.progress-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* No Data Section */
.no-data-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 1rem;
  gap: 0.5rem;
}

.no-data-icon {
  font-size: 2rem;
  color: rgba(0, 0, 0, 0.2);
}

.no-data-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
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

  .distribution-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
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
