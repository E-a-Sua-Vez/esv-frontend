<script>
import { getPackageMetricsAnalytics } from '../../../application/services/package';
import Spinner from '../../common/Spinner.vue';
import SimpleCard from '../common/SimpleCard.vue';
import DetailsCard from '../common/DetailsCard.vue';
import Message from '../../common/Message.vue';
import GaugeChart from './GaugeChart.vue';
import Popper from 'vue3-popper';

export default {
  name: 'DashboardPackageMetrics',
  components: {
    Spinner,
    SimpleCard,
    DetailsCard,
    Message,
    GaugeChart,
    Popper,
  },
  props: {
    show: { type: Boolean, default: false },
    commerceId: { type: String, default: undefined },
  },
  data() {
    return {
      loading: false,
      metrics: null,
      error: null,
    };
  },
  async mounted() {
    if (this.show && this.commerceId) {
      await this.loadMetrics();
    }
  },
  watch: {
    show(newVal) {
      if (newVal && this.commerceId && !this.metrics) {
        this.loadMetrics();
      }
    },
    commerceId() {
      if (this.show && this.commerceId) {
        this.loadMetrics();
      }
    },
  },
  computed: {
    hasMetrics() {
      return this.metrics !== null && !this.error;
    },
    mostRequestedPackages() {
      return this.metrics?.mostRequestedPackages || [];
    },
    gaugeMetrics() {
      if (!this.metrics) return [];
      return [
        {
          key: 'completion',
          value: this.metrics.overallCompletionRate || 0,
          label: this.$t('package.metrics.completionRate') || 'Tasa de Completitud',
          unit: '%',
          threshold: 70,
          color: 'success',
        },
        {
          key: 'noshow',
          value: 100 - (this.metrics.overallNoShowRate || 0), // Invert for gauge (show attendance rate)
          label: this.$t('package.metrics.attendanceRate') || 'Tasa de Asistencia',
          unit: '%',
          threshold: 80,
          color: 'primary',
        },
      ];
    },
  },
  methods: {
    async loadMetrics() {
      if (!this.commerceId) return;
      try {
        this.loading = true;
        this.error = null;
        this.metrics = await getPackageMetricsAnalytics(this.commerceId);
      } catch (error) {
        console.error('Error loading package metrics:', error);
        this.error = error.message || 'Error loading metrics';
        this.metrics = null;
      } finally {
        this.loading = false;
      }
    },
    getGaugeTooltip(key) {
      const tooltips = {
        completion:
          this.$t('package.metrics.tooltip.completionRate') ||
          'La tasa de completitud mide el porcentaje de sesiones consumidas respecto al total de sesiones vendidas. Un valor alto indica que los clientes están completando sus paquetes.',
        noshow:
          this.$t('package.metrics.tooltip.attendanceRate') ||
          'La tasa de asistencia mide el porcentaje de reservas que fueron atendidas (inverso de la tasa de no-show). Un valor alto indica buena asistencia de clientes.',
      };
      return tooltips[key] || '';
    },
    getRateClass(rate, type) {
      if (type === 'completion') {
        if (rate >= 80) return 'rate-excellent';
        if (rate >= 60) return 'rate-good';
        if (rate >= 40) return 'rate-warning';
        return 'rate-poor';
      } else if (type === 'noshow') {
        // For no-show, lower is better
        if (rate <= 10) return 'rate-excellent';
        if (rate <= 20) return 'rate-good';
        if (rate <= 30) return 'rate-warning';
        return 'rate-poor';
      } else if (type === 'abandonment') {
        // For abandonment, lower is better
        if (rate <= 5) return 'rate-excellent';
        if (rate <= 10) return 'rate-good';
        if (rate <= 15) return 'rate-warning';
        return 'rate-poor';
      }
      return 'rate-neutral';
    },
    getRateIcon(rate, type) {
      const rateClass = this.getRateClass(rate, type);
      if (rateClass === 'rate-excellent') return 'bi-check-circle-fill';
      if (rateClass === 'rate-good') return 'bi-info-circle-fill';
      return 'bi-exclamation-triangle-fill';
    },
    formatNumber(num) {
      if (num === null || num === undefined) return '0';
      return Number(num).toFixed(2);
    },
  },
};
</script>

<template>
  <div v-if="show && commerceId">
    <Spinner :show="loading"></Spinner>
    <div v-if="error" class="error-message">
      <Message :icon="'exclamation-triangle'" :title="'Error'" :content="error" />
    </div>
    <div v-if="hasMetrics" class="package-metrics-section">
      <!-- Summary Cards Section -->
      <div class="package-metrics-summary">
        <div class="section-header">
          <h4 class="section-title">
            <i class="bi bi-box-seam-fill"></i>
            {{ $t('package.metrics.title') || 'Métricas de Paquetes' }}
          </h4>
        </div>

        <!-- Main Metrics Cards -->
        <div class="metrics-summary-grid">
          <!-- Completion Rate Card -->
          <div class="summary-card summary-card-success">
            <div class="summary-card-header">
              <div class="summary-icon-wrapper summary-icon-success">
                <i class="bi bi-check-circle-fill"></i>
              </div>
              <div class="summary-card-title">
                <span class="summary-label">{{
                  $t('package.metrics.completionRate') || 'Tasa de Completitud'
                }}</span>
              </div>
            </div>
            <div class="summary-value-section">
              <div class="summary-main-value">
                {{ formatNumber(metrics.overallCompletionRate) }}%
              </div>
              <div
                class="summary-status-badge"
                :class="getRateClass(metrics.overallCompletionRate, 'completion')"
              >
                <i :class="getRateIcon(metrics.overallCompletionRate, 'completion')"></i>
                <span>{{ $t('package.metrics.status.completed') || 'Completitud' }}</span>
              </div>
            </div>
            <div class="summary-insights">
              <div class="insight-item">
                <i class="bi bi-info-circle"></i>
                <span>{{
                  $t('package.metrics.description.completion') || 'Sesiones completadas vs. total'
                }}</span>
              </div>
            </div>
          </div>

          <!-- No-Show Rate Card -->
          <div class="summary-card summary-card-warning">
            <div class="summary-card-header">
              <div class="summary-icon-wrapper summary-icon-warning">
                <i class="bi bi-x-circle-fill"></i>
              </div>
              <div class="summary-card-title">
                <span class="summary-label">{{
                  $t('package.metrics.noShowRate') || 'Tasa de No-Show'
                }}</span>
              </div>
            </div>
            <div class="summary-value-section">
              <div class="summary-main-value">{{ formatNumber(metrics.overallNoShowRate) }}%</div>
              <div
                class="summary-status-badge"
                :class="getRateClass(metrics.overallNoShowRate, 'noshow')"
              >
                <i :class="getRateIcon(metrics.overallNoShowRate, 'noshow')"></i>
                <span>{{ $t('package.metrics.status.noshow') || 'No-Show' }}</span>
              </div>
            </div>
            <div class="summary-insights">
              <div class="insight-item">
                <i class="bi bi-info-circle"></i>
                <span>{{
                  $t('package.metrics.description.noshow') || 'Reservas canceladas sin atención'
                }}</span>
              </div>
            </div>
          </div>

          <!-- Abandonment Rate Card -->
          <div class="summary-card summary-card-error">
            <div class="summary-card-header">
              <div class="summary-icon-wrapper summary-icon-error">
                <i class="bi bi-exclamation-triangle-fill"></i>
              </div>
              <div class="summary-card-title">
                <span class="summary-label">{{
                  $t('package.metrics.abandonmentRate') || 'Tasa de Abandono'
                }}</span>
              </div>
            </div>
            <div class="summary-value-section">
              <div class="summary-main-value">
                {{ formatNumber(metrics.overallAbandonmentRate) }}%
              </div>
              <div
                class="summary-status-badge"
                :class="getRateClass(metrics.overallAbandonmentRate, 'abandonment')"
              >
                <i :class="getRateIcon(metrics.overallAbandonmentRate, 'abandonment')"></i>
                <span>{{ $t('package.metrics.status.abandoned') || 'Abandono' }}</span>
              </div>
            </div>
            <div class="summary-insights">
              <div class="insight-item">
                <i class="bi bi-info-circle"></i>
                <span>{{
                  $t('package.metrics.description.abandonment') ||
                  'Paquetes cancelados con sesiones usadas'
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Gauge Charts Section -->
        <div class="gauge-charts-section" v-if="gaugeMetrics.length > 0">
          <div class="gauge-charts-grid">
            <div v-for="gauge in gaugeMetrics" :key="gauge.key" class="gauge-chart-card">
              <div class="gauge-card-header">
                <h5 class="gauge-card-title">{{ gauge.label }}</h5>
                <GaugeChart
                  :value="gauge.value"
                  :min="0"
                  :max="100"
                  :label="gauge.label"
                  :unit="gauge.unit"
                  :threshold="gauge.threshold"
                  :color="gauge.color"
                  :size="280"
                />
                <Popper
                  :class="'dark'"
                  arrow
                  disable-click-away
                  :content="getGaugeTooltip(gauge.key)"
                >
                  <i class="bi bi-info-circle-fill gauge-info-icon"></i>
                </Popper>
              </div>
            </div>
          </div>
        </div>

        <!-- Most Requested Packages -->
        <div class="most-requested-section" v-if="mostRequestedPackages.length > 0">
          <div class="section-header">
            <h4 class="section-title">
              <i class="bi bi-trophy-fill"></i>
              {{ $t('package.metrics.mostRequested') || 'Paquetes Más Solicitados' }}
            </h4>
          </div>
          <div class="packages-grid">
            <div
              v-for="(pkg, index) in mostRequestedPackages"
              :key="index"
              class="package-item-card"
            >
              <div class="package-item-header">
                <div class="package-rank">{{ index + 1 }}</div>
                <div class="package-name">{{ pkg.packageName }}</div>
              </div>
              <div class="package-stats">
                <div class="package-stat">
                  <span class="stat-label">{{
                    $t('package.metrics.totalCreated') || 'Creados'
                  }}</span>
                  <span class="stat-value">{{ pkg.totalCreated }}</span>
                </div>
                <div class="package-stat">
                  <span class="stat-label">{{ $t('package.metrics.active') || 'Activos' }}</span>
                  <span class="stat-value stat-active">{{ pkg.totalActive }}</span>
                </div>
                <div class="package-stat">
                  <span class="stat-label">{{
                    $t('package.metrics.completed') || 'Completados'
                  }}</span>
                  <span class="stat-value stat-completed">{{ pkg.totalCompleted }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.package-metrics-section {
  margin: 2rem auto;
  max-width: 100%;
  padding: 0 0.5rem;
}

.section-header {
  margin-bottom: 1.5rem;
  padding: 0 0.5rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #000;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-title i {
  color: var(--azul-turno);
  font-size: 1.5rem;
}

.metrics-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.summary-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  transition: opacity 0.2s ease;
}

.summary-card-success::before {
  background: linear-gradient(90deg, #00c2cb 0%, #00c4cc 100%);
}

.summary-card-warning::before {
  background: linear-gradient(90deg, #f9c322 0%, #fac107 100%);
}

.summary-card-error::before {
  background: linear-gradient(90deg, #a52a2a 0%, #d32f2f 100%);
}

.summary-card:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 6px 16px rgba(0, 0, 0, 0.1);
}

.summary-card-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.summary-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.summary-icon-success {
  background: linear-gradient(135deg, #00c2cb 0%, #00c4cc 100%);
}

.summary-icon-warning {
  background: linear-gradient(135deg, #f9c322 0%, #fac107 100%);
}

.summary-icon-error {
  background: linear-gradient(135deg, #a52a2a 0%, #d32f2f 100%);
}

.summary-icon-wrapper i {
  font-size: 1.5rem;
  color: #fff;
}

.summary-card-title {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.summary-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  line-height: 0.9rem;
}

.summary-value-section {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.summary-main-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #000;
  line-height: 1;
  letter-spacing: -0.02em;
}

.summary-status-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 700;
}

.rate-excellent {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.2) 0%, rgba(0, 194, 203, 0.15) 100%);
  color: #00c2cb;
  border: 1px solid rgba(0, 194, 203, 0.3);
}

.rate-good {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.2) 0%, rgba(0, 74, 173, 0.15) 100%);
  color: #004aad;
  border: 1px solid rgba(0, 74, 173, 0.3);
}

.rate-warning {
  background: linear-gradient(135deg, rgba(249, 195, 34, 0.2) 0%, rgba(249, 195, 34, 0.15) 100%);
  color: #f9c322;
  border: 1px solid rgba(249, 195, 34, 0.3);
}

.rate-poor {
  background: linear-gradient(135deg, rgba(165, 42, 42, 0.2) 0%, rgba(165, 42, 42, 0.15) 100%);
  color: #a52a2a;
  border: 1px solid rgba(165, 42, 42, 0.3);
}

.summary-insights {
  display: flex;
  flex-direction: column;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.insight-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.65);
}

.insight-item i {
  font-size: 1rem;
  color: rgba(0, 0, 0, 0.5);
}

/* Gauge Charts Section */
.gauge-charts-section {
  margin: 2rem 0;
}

.gauge-charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.75rem;
  margin-top: 1.5rem;
  justify-items: center;
}

.gauge-chart-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.5rem 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  max-width: 420px;
  min-height: 360px;
  box-sizing: border-box;
}

.gauge-card-header {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 0.5rem 0;
}

.gauge-card-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #000;
  margin: 0 0 1.25rem 0;
  text-align: center;
  padding: 0 1rem;
  line-height: 1.3;
}

.gauge-info-icon {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 10;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  padding: 0.25rem;
  width: 28px;
  height: 28px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  color: var(--azul-turno);
}

.gauge-info-icon:hover {
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* Most Requested Packages */
.most-requested-section {
  margin-top: 2rem;
}

.packages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.package-item-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.package-item-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: rgba(0, 74, 173, 0.15);
}

.package-item-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.package-rank {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.package-name {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.8);
  flex: 1;
}

.package-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.package-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: center;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #000;
}

.stat-active {
  color: var(--azul-turno);
}

.stat-completed {
  color: #00c2cb;
}

/* Responsive */
@media (max-width: 768px) {
  .metrics-summary-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .summary-main-value {
    font-size: 2rem;
  }

  .gauge-charts-grid {
    grid-template-columns: 1fr;
  }

  .packages-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 576px) {
  .summary-main-value {
    font-size: 1.75rem;
  }

  .summary-card {
    padding: 1.25rem;
  }
}
</style>
