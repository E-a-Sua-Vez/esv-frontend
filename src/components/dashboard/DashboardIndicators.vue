<script>
import Spinner from '../../components/common/Spinner.vue';
import SimpleCard from './common/SimpleCard.vue';
import DetailsCard from './common/DetailsCard.vue';
import Message from '../../components/common/Message.vue';
import SimpleDownloadCard from '../../components/reports/SimpleDownloadCard.vue';
import { lazyLoadHtml2Pdf } from '../../shared/utils/lazyLoad';
import AttentionRatingDetails from './domain/AttentionRatingDetails.vue';
import AttentionNPSDetails from './domain/AttentionNPSDetails.vue';
import AttentionCommentsDetails from './domain/AttentionCommentsDetails.vue';
import AttentionCollaboratorsDetails from './domain/AttentionCollaboratorsDetails.vue';
import AttentionNotificationDetails from './domain/AttentionNotificationDetails.vue';
import TelemedicineDetails from './domain/TelemedicineDetails.vue';
import PDFHeader from '../reports/PDFHeader.vue';
import PDFFooter from '../reports/PDFFooter.vue';
import AttentionOriginDetails from './domain/AttentionOriginDetails.vue';
import AttentionClientContactDetails from './domain/AttentionClientContactDetails.vue';
import AttentionDaysSinceDetails from './domain/AttentionDaysSinceDetails.vue';
import CollectionDetails from './domain/CollectionDetails.vue';
import DetailItem from './common/DetailItem.vue';
import SmartRecommendationsPanel from './domain/SmartRecommendationsPanel.vue';
import GaugeChart from './domain/GaugeChart.vue';
import Popper from 'vue3-popper';

export default {
  name: 'DashboardIndicators',
  components: {
    SimpleCard,
    DetailsCard,
    Message,
    SimpleDownloadCard,
    AttentionRatingDetails,
    AttentionNPSDetails,
    AttentionCommentsDetails,
    AttentionCollaboratorsDetails,
    AttentionNotificationDetails,
    TelemedicineDetails,
    PDFHeader,
    PDFFooter,
    Spinner,
    AttentionOriginDetails,
    AttentionClientContactDetails,
    AttentionDaysSinceDetails,
    CollectionDetails,
    DetailItem,
    SmartRecommendationsPanel,
    GaugeChart,
    Popper,
  },
  props: {
    showIndicators: { type: Boolean, default: false },
    calculatedMetrics: { type: Object, default: undefined },
    toggles: { type: Object, default: undefined },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    commerce: { type: Object, default: undefined },
    hideSummary: { type: Boolean, default: false },
  },
  data() {
    return {
      loading: false,
      detailsOpened: false,
      sentimentScore: {},
      queueDetailsExpanded: false,
    };
  },
  beforeMount() {
    if (
      this.calculatedMetrics['survey.created'] &&
      this.calculatedMetrics['survey.created']['sentimentScore']
    ) {
      this.sentimentScore['totalSentimentBad'] =
        this.calculatedMetrics['survey.created']['sentimentScore']['totalSentimentBad'] || 0;
      this.sentimentScore['totalSentimentNeutral'] =
        this.calculatedMetrics['survey.created']['sentimentScore']['totalSentimentNeutral'] || 0;
      this.sentimentScore['totalSentimentGood'] =
        this.calculatedMetrics['survey.created']['sentimentScore']['totalSentimentGood'] || 0;
    }
  },
  computed: {
    summaryMetrics() {
      if (!this.calculatedMetrics) {
        return {
          attention: {
            value: 0,
            trend: { value: 0, type: 'neutral' },
            projection: 0,
            avgDuration: 0,
          },
          booking: { value: 0, trend: { value: 0, type: 'neutral' }, projection: 0, pending: 0 },
          rating: { value: 0, trend: { value: 0, type: 'neutral' }, count: 0 },
          nps: { value: 0, count: 0 },
        };
      }

      const metrics = this.calculatedMetrics;
      const attention = metrics['attention.created'] || {};
      const booking = metrics['booking.created'] || {};
      const survey = metrics['survey.created'] || {};

      // Calculate trends
      const pastPeriodNumber =
        (attention.pastPeriodAttentionNumber && attention.pastPeriodAttentionNumber.number) || 0;
      const attentionTrend = this.calculateTrend(attention.attentionNumber || 0, pastPeriodNumber);
      const bookingTrend = this.calculateTrend(
        booking.bookingNumber || 0,
        booking.pastPeriodBookingNumber || 0
      );
      const ratingTrend = this.calculateTrend(
        survey.avgRating || 0,
        survey.pastPeriodAvgRating || 0
      );

      // Calculate projections (simple linear projection based on current period)
      const daysInPeriod = this.getDaysInPeriod();
      const attentionProjection =
        daysInPeriod > 0 ? Math.round(((attention.attentionNumber || 0) / daysInPeriod) * 30) : 0;
      const bookingProjection =
        daysInPeriod > 0 ? Math.round(((booking.bookingNumber || 0) / daysInPeriod) * 30) : 0;

      return {
        attention: {
          value: attention.attentionNumber || 0,
          trend: attentionTrend,
          projection: attentionProjection,
          avgDuration: attention.avgDuration || 0,
        },
        booking: {
          value: booking.bookingNumber || 0,
          trend: bookingTrend,
          projection: bookingProjection,
          pending: booking.stillPendingBookings || 0,
        },
        rating: {
          value: survey.avgRating || 0,
          trend: ratingTrend,
          count: survey.count_rating || 0,
        },
        nps: {
          value: survey.nps || 0,
          count: survey.count_nps || 0,
        },
      };
    },
    healthScore() {
      if (!this.calculatedMetrics) return { total: 0, operational: 0, customer: 0, financial: 0 };

      const metrics = this.calculatedMetrics;
      const attention = metrics['attention.created'] || {};
      const booking = metrics['booking.created'] || {};
      const survey = metrics['survey.created'] || {};

      // Operational Health (40%)
      let operationalScore = 50; // Base score

      // Booking conversion rate
      if (booking.bookingNumber > 0 && booking.bookingFlow?.datasets?.[1] !== undefined) {
        const conversionRate = (booking.bookingFlow.datasets[1] / booking.bookingNumber) * 100;
        operationalScore += (conversionRate / 100) * 30; // Max 30 points
      }

      // Attention efficiency (time-based)
      if (attention.avgDuration) {
        const avgMinutes = attention.avgDuration / 60;
        if (avgMinutes <= 20) operationalScore += 20;
        else if (avgMinutes <= 30) operationalScore += 10;
      }

      operationalScore = Math.min(100, Math.max(0, operationalScore));

      // Customer Health (35%)
      let customerScore = 50; // Base score

      // CSAT Score (0-5 scale, target: 4+)
      if (survey.avgRating) {
        customerScore += (survey.avgRating / 5) * 25; // Max 25 points
      }

      // NPS Score (-100 to 100, target: 50+)
      if (survey.nps !== undefined) {
        const npsNormalized = ((survey.nps + 100) / 200) * 100; // Normalize to 0-100
        customerScore = customerScore * 0.6 + npsNormalized * 0.4; // Weighted
      }

      customerScore = Math.min(100, Math.max(0, customerScore));

      // Financial Health (25%)
      let financialScore = 50; // Base score

      // Growth trend
      if (attention.attentionNumber && attention.pastPeriodAttentionNumber?.number) {
        const growth =
          ((attention.attentionNumber - attention.pastPeriodAttentionNumber.number) /
            (attention.pastPeriodAttentionNumber.number || 1)) *
          100;
        if (growth > 0) financialScore += Math.min(25, growth);
        else financialScore += Math.max(-25, growth);
      }

      financialScore = Math.min(100, Math.max(0, financialScore));

      // Total Health Score (weighted average)
      const totalScore = operationalScore * 0.4 + customerScore * 0.35 + financialScore * 0.25;

      return {
        total: Math.round(totalScore),
        operational: Math.round(operationalScore),
        customer: Math.round(customerScore),
        financial: Math.round(financialScore),
      };
    },
    gaugeMetrics() {
      if (!this.calculatedMetrics) return [];

      const metrics = this.calculatedMetrics;
      const attention = metrics['attention.created'] || {};
      const booking = metrics['booking.created'] || {};
      const survey = metrics['survey.created'] || {};

      const gauges = [];

      // Conversion Rate Gauge
      if (booking.bookingNumber > 0 && booking.bookingFlow?.datasets?.[1] !== undefined) {
        const conversionRate = (booking.bookingFlow.datasets[1] / booking.bookingNumber) * 100;
        gauges.push({
          key: 'conversion',
          value: conversionRate,
          label: this.$t('dashboard.gauge.conversion') || 'Tasa de Conversión',
          unit: '%',
          threshold: 70,
          color: 'success',
        });
      }

      // CSAT Gauge
      if (survey.avgRating) {
        const csatPercentage = (survey.avgRating / 5) * 100;
        gauges.push({
          key: 'csat',
          value: csatPercentage,
          label: this.$t('dashboard.gauge.csat') || 'Satisfacción (CSAT)',
          unit: '%',
          threshold: 80,
          color: 'warning',
        });
      }

      // NPS Gauge (normalized to 0-100)
      if (survey.nps !== undefined) {
        const npsNormalized = ((survey.nps + 100) / 200) * 100;
        gauges.push({
          key: 'nps',
          value: npsNormalized,
          label: this.$t('dashboard.gauge.nps') || 'NPS Score',
          unit: '%',
          threshold: 75,
          color: 'primary',
        });
      }

      return gauges;
    },
  },
  methods: {
    calculateTrend(current, previous) {
      if (!previous || previous === 0) return { value: 0, type: 'neutral' };
      const change = ((current - previous) / previous) * 100;
      if (change > 5) return { value: Math.abs(change), type: 'up' };
      if (change < -5) return { value: Math.abs(change), type: 'down' };
      return { value: Math.abs(change), type: 'neutral' };
    },
    getGaugeTooltip(key) {
      const tooltips = {
        conversion:
          this.$t('dashboard.gauge.tooltip.conversion') ||
          'La tasa de conversión mide el porcentaje de reservas que se confirman exitosamente. Un valor alto indica que los clientes están cumpliendo con sus citas.',
        csat:
          this.$t('dashboard.gauge.tooltip.csat') ||
          'CSAT (Customer Satisfaction) mide la satisfacción del cliente en una escala de 1 a 5. Este indicador muestra el porcentaje equivalente de satisfacción.',
        nps:
          this.$t('dashboard.gauge.tooltip.nps') ||
          'NPS (Net Promoter Score) mide la lealtad del cliente. Va de -100 a +100. Valores positivos indican más promotores que detractores.',
      };
      return tooltips[key] || '';
    },
    getDaysInPeriod() {
      if (!this.startDate || !this.endDate) return 0;
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    },
    getMedianDuration() {
      // Use median if available (more robust), otherwise fallback to average
      const attention = this.calculatedMetrics?.['attention.created'] || {};
      if (attention.medianDuration !== null && attention.medianDuration !== undefined) {
        return attention.medianDuration;
      }
      // Fallback to average
      return attention.avgDuration || 0;
    },
    isUsingIntelligentEstimation() {
      const attention = this.calculatedMetrics?.['attention.created'] || {};
      return attention.usingIntelligentEstimation === true;
    },
    getQueueDetails() {
      const attention = this.calculatedMetrics?.['attention.created'] || {};
      return attention.queueDetails || [];
    },
    getMaxQueue() {
      const details = this.getQueueDetails();
      if (details.length === 0) return null;
      // Find queue with most attentions
      const maxQueue = details.reduce(
        (max, queue) => (queue.attentionCount > max.attentionCount ? queue : max),
        details[0]
      );
      return maxQueue;
    },
    formatDuration(minutes) {
      if (!minutes || minutes === null || minutes === 0) return 'N/A';
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      if (hours > 0) {
        return `${hours}h ${mins}min`;
      }
      return `${mins} min`;
    },
    getDurationColorClass(minutes) {
      if (!minutes || minutes === null || minutes === 0) return 'duration-neutral';
      // Green: < 15 min (excellent)
      if (minutes < 15) return 'duration-excellent';
      // Yellow: 15-30 min (good)
      if (minutes < 30) return 'duration-good';
      // Orange: 30-60 min (warning)
      if (minutes < 60) return 'duration-warning';
      // Red: >= 60 min (poor)
      return 'duration-poor';
    },
    getCollaboratorsList() {
      if (!this.calculatedMetrics) {
        return [];
      }
      const collabs = this.calculatedMetrics['collaborators'];
      if (!collabs) {
        return [];
      }
      if (Array.isArray(collabs)) {
        return collabs.filter(c => c && c.id);
      }
      // Convert object to array if needed
      if (collabs && typeof collabs === 'object') {
        const values = Object.values(collabs);
        return values.filter(c => c && c.id);
      }
      return [];
    },
    hasCollaborators() {
      const list = this.getCollaboratorsList();
      return list && list.length > 0;
    },
    getTrendIcon(trend) {
      if (trend.type === 'up') return 'bi-arrow-up-circle-fill green-icon';
      if (trend.type === 'down') return 'bi-arrow-down-circle-fill red-icon';
      return 'bi-dash-circle blue-icon';
    },
    getTrendClass(trend) {
      if (trend.type === 'up') return 'trend-up';
      if (trend.type === 'down') return 'trend-down';
      return 'trend-neutral';
    },
    getNPSClass(value) {
      if (value >= 50) return 'nps-excellent';
      if (value >= 0) return 'nps-good';
      return 'nps-poor';
    },
    getNPSLabel(value) {
      if (value >= 50) return this.$t('dashboard.nps.excellent') || 'Excelente';
      if (value >= 0) return this.$t('dashboard.nps.good') || 'Bueno';
      return this.$t('dashboard.nps.poor') || 'Mejorable';
    },
    getNPSDescription(value) {
      if (value >= 50) return this.$t('dashboard.nps.desc.excellent') || 'Clientes muy satisfechos';
      if (value >= 0) return this.$t('dashboard.nps.desc.good') || 'Clientes satisfechos';
      return this.$t('dashboard.nps.desc.poor') || 'Oportunidad de mejora';
    },
    getCSATStatus(rating) {
      if (rating >= 4) return { status: 'excellent', label: 'Excelente', class: 'csat-excellent' };
      if (rating >= 2.5) return { status: 'good', label: 'Bueno', class: 'csat-good' };
      return { status: 'poor', label: 'Mejorable', class: 'csat-poor' };
    },
    getCSATIcon(rating) {
      if (rating >= 4) return 'bi-check-circle-fill';
      if (rating >= 2.5) return 'bi-info-circle-fill';
      return 'bi-exclamation-triangle-fill';
    },
    getNPSStatusIcon(value) {
      if (value >= 50) return 'bi-check-circle-fill';
      if (value >= 0) return 'bi-info-circle-fill';
      return 'bi-exclamation-triangle-fill';
    },
    getHealthScoreClass(score) {
      if (score >= 80) return 'health-excellent';
      if (score >= 60) return 'health-good';
      if (score >= 40) return 'health-warning';
      return 'health-poor';
    },
    async handleDownload() {
      try {
        await this.exportToPDF();
      } catch (error) {
        this.loading = false;
        this.detailsOpened = false;
      }
    },
    async exportToPDF() {
      try {
        this.loading = true;
        this.detailsOpened = true;

        // Validate commerce exists
        if (!this.commerce || !this.commerce.id) {
          this.loading = false;
          this.detailsOpened = false;
          return;
        }

        const commerceName = this.commerce.name || 'commerce';
        const commerceTag = this.commerce.tag || 'tag';
        const filename = `indicators-${commerceName}-${commerceTag}-${this.startDate || 'start'}-${
          this.endDate || 'end'
        }.pdf`;
        const options = {
          margin: 0.5,
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        };

        let doc = document.getElementById('indicators-component');
        const pdfHeader = document.getElementById('pdf-header');
        const pdfFooter = document.getElementById('pdf-footer');

        if (!doc) {
          this.loading = false;
          this.detailsOpened = false;
          return;
        }

        if (pdfHeader) pdfHeader.style.display = 'block';
        if (pdfFooter) pdfFooter.style.display = 'block';

        setTimeout(async () => {
          try {
            const html2pdf = await lazyLoadHtml2Pdf();
            html2pdf()
              .set(options)
              .from(doc)
              .save()
              .then(() => {
                if (pdfHeader) pdfHeader.style.display = 'none';
                if (pdfFooter) pdfFooter.style.display = 'none';
                doc = undefined;
                this.detailsOpened = false;
                this.loading = false;
              })
              .catch(error => {
                if (pdfHeader) pdfHeader.style.display = 'none';
                if (pdfFooter) pdfFooter.style.display = 'none';
                this.detailsOpened = false;
                doc = undefined;
                this.loading = false;
              });
          } catch (error) {
            if (pdfHeader) pdfHeader.style.display = 'none';
            if (pdfFooter) pdfFooter.style.display = 'none';
            this.detailsOpened = false;
            doc = undefined;
            this.loading = false;
          }
        }, 1000);
      } catch (error) {
        this.loading = false;
        this.detailsOpened = false;
      }
    },
  },
};
</script>

<template>
  <div>
    <div
      id="indicators"
      class="row"
      v-if="showIndicators === true && toggles['dashboard.indicators.view']"
    >
      <SimpleDownloadCard
        v-if="!hideSummary"
        :download="toggles['dashboard.reports.indicators']"
        :title="$t('dashboard.reports.indicators.title')"
        :show-tooltip="true"
        :description="$t('dashboard.reports.indicators.description')"
        :icon="'file-earmark-pdf'"
        @download="handleDownload"
        :can-download="toggles['dashboard.reports.indicators'] === true"
      ></SimpleDownloadCard>
      <Spinner :show="loading"></Spinner>
      <div id="indicators-component">
        <!-- Health Score Card -->
        <div class="health-score-section" v-if="!detailsOpened && !hideSummary">
          <div class="health-score-card">
            <div class="health-score-header">
              <div class="health-score-icon">
                <i class="bi bi-heart-pulse-fill"></i>
              </div>
              <div class="health-score-title-section">
                <div class="health-score-title-wrapper">
                  <h3 class="health-score-title">
                    {{ $t('dashboard.healthScore.title') || 'Health Score del Negocio' }}
                  </h3>
                  <Popper
                    :class="'dark'"
                    arrow
                    disable-click-away
                    :content="
                      $t('dashboard.healthScore.tooltip') ||
                      'El Health Score es un indicador compuesto que evalúa la salud general de tu negocio en tres dimensiones: operacional (eficiencia y productividad), cliente (satisfacción y lealtad) y financiera (rentabilidad y crecimiento). Un score alto indica un negocio saludable y sostenible.'
                    "
                  >
                    <i class="bi bi-info-circle-fill health-score-info-icon"></i>
                  </Popper>
                </div>
                <p class="health-score-subtitle">
                  {{
                    $t('dashboard.healthScore.subtitle') ||
                    'Indicador general de salud operativa, cliente y financiera'
                  }}
                </p>
              </div>
            </div>
            <div class="health-score-main">
              <div class="health-score-value" :class="getHealthScoreClass(healthScore.total)">
                <span class="health-score-number">{{ healthScore.total }}</span>
                <span class="health-score-max">/100</span>
              </div>
              <div class="health-score-bar">
                <div
                  class="health-score-progress"
                  :class="getHealthScoreClass(healthScore.total)"
                  :style="`width: ${healthScore.total}%`"
                ></div>
              </div>
            </div>
            <div class="health-score-breakdown">
              <div class="health-score-item">
                <div class="health-score-item-label">
                  <i class="bi bi-gear-fill"></i>
                  <span>{{ $t('dashboard.healthScore.operational') || 'Operacional' }}</span>
                  <Popper
                    :class="'dark'"
                    arrow
                    disable-click-away
                    :content="
                      $t('dashboard.healthScore.tooltips.operational') ||
                      'Evalúa la eficiencia operativa: tiempo promedio de atención, productividad del personal, y capacidad de respuesta del negocio.'
                    "
                  >
                    <i class="bi bi-info-circle health-score-item-info"></i>
                  </Popper>
                </div>
                <div
                  class="health-score-item-value"
                  :class="getHealthScoreClass(healthScore.operational)"
                >
                  {{ healthScore.operational }}/100
                </div>
                <div class="health-score-item-bar">
                  <div
                    class="health-score-item-progress"
                    :class="getHealthScoreClass(healthScore.operational)"
                    :style="`width: ${healthScore.operational}%`"
                  ></div>
                </div>
              </div>
              <div class="health-score-item">
                <div class="health-score-item-label">
                  <i class="bi bi-people-fill"></i>
                  <span>{{ $t('dashboard.healthScore.customer') || 'Cliente' }}</span>
                  <Popper
                    :class="'dark'"
                    arrow
                    disable-click-away
                    :content="
                      $t('dashboard.healthScore.tooltips.customer') ||
                      'Mide la satisfacción y lealtad del cliente: CSAT, NPS, tasa de retorno y calidad de la experiencia del cliente.'
                    "
                  >
                    <i class="bi bi-info-circle health-score-item-info"></i>
                  </Popper>
                </div>
                <div
                  class="health-score-item-value"
                  :class="getHealthScoreClass(healthScore.customer)"
                >
                  {{ healthScore.customer }}/100
                </div>
                <div class="health-score-item-bar">
                  <div
                    class="health-score-item-progress"
                    :class="getHealthScoreClass(healthScore.customer)"
                    :style="`width: ${healthScore.customer}%`"
                  ></div>
                </div>
              </div>
              <div class="health-score-item">
                <div class="health-score-item-label">
                  <i class="bi bi-cash-coin"></i>
                  <span>{{ $t('dashboard.healthScore.financial') || 'Financiero' }}</span>
                  <Popper
                    :class="'dark'"
                    arrow
                    disable-click-away
                    :content="
                      $t('dashboard.healthScore.tooltips.financial') ||
                      'Analiza la salud financiera: ingresos, rentabilidad, crecimiento y sostenibilidad económica del negocio.'
                    "
                  >
                    <i class="bi bi-info-circle health-score-item-info"></i>
                  </Popper>
                </div>
                <div
                  class="health-score-item-value"
                  :class="getHealthScoreClass(healthScore.financial)"
                >
                  {{ healthScore.financial }}/100
                </div>
                <div class="health-score-item-bar">
                  <div
                    class="health-score-item-progress"
                    :class="getHealthScoreClass(healthScore.financial)"
                    :style="`width: ${healthScore.financial}%`"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Gauge Charts Section -->
        <div
          class="gauge-charts-section"
          v-if="!detailsOpened && !hideSummary && gaugeMetrics.length > 0"
        >
          <div class="section-header">
            <h4 class="section-title">
              <i class="bi bi-speedometer2"></i>
              {{ $t('dashboard.gauge.title') || 'KPIs Principales' }}
            </h4>
          </div>
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

        <!-- Smart Recommendations Panel -->
        <SmartRecommendationsPanel
          v-if="!detailsOpened && !hideSummary"
          :calculated-metrics="calculatedMetrics"
          :commerce="commerce"
        />

        <!-- Enhanced Summary Section -->
        <div class="dashboard-summary-section" v-if="!detailsOpened && !hideSummary">
          <div class="summary-cards-grid">
            <!-- Attention Summary Card -->
            <div
              class="summary-card summary-card-primary"
              v-if="toggles['dashboard.attention-number.view']"
            >
              <div class="summary-card-header">
                <div class="summary-icon-wrapper summary-icon-primary">
                  <i class="bi bi-qr-code"></i>
                </div>
                <div class="summary-card-title">
                  <span class="summary-label">{{
                    $t('dashboard.items.attentions.1') || 'Atenciones'
                  }}</span>
                  <span class="summary-period"
                    >{{ getDaysInPeriod() }} {{ $t('dashboard.days') || 'días' }}</span
                  >
                </div>
              </div>
              <div class="summary-value-section">
                <div class="summary-main-value">
                  {{ summaryMetrics.attention.value.toLocaleString() }}
                </div>
                <div class="summary-trend" :class="getTrendClass(summaryMetrics.attention.trend)">
                  <i :class="getTrendIcon(summaryMetrics.attention.trend)"></i>
                  <span>{{ summaryMetrics.attention.trend.value.toFixed(1) }}%</span>
                </div>
              </div>
              <div class="summary-insights">
                <div class="insight-item">
                  <i class="bi bi-clock-history"></i>
                  <span
                    >{{ $t('dashboard.avgDuration') || 'Promedio' }}:
                    {{ Math.round(summaryMetrics.attention.avgDuration) }}s</span
                  >
                </div>
                <div class="insight-item insight-projection">
                  <i class="bi bi-graph-up-arrow"></i>
                  <span
                    >{{ $t('dashboard.projection') || 'Proyección mensual' }}: ~{{
                      summaryMetrics.attention.projection.toLocaleString()
                    }}</span
                  >
                </div>
              </div>
            </div>

            <!-- Booking Summary Card -->
            <div
              class="summary-card summary-card-success"
              v-if="toggles['dashboard.booking-number.view']"
            >
              <div class="summary-card-header">
                <div class="summary-icon-wrapper summary-icon-success">
                  <i class="bi bi-calendar2-check-fill"></i>
                </div>
                <div class="summary-card-title">
                  <span class="summary-label">{{
                    $t('dashboard.items.attentions.27') || 'Reservas'
                  }}</span>
                  <span class="summary-period"
                    >{{ getDaysInPeriod() }} {{ $t('dashboard.days') || 'días' }}</span
                  >
                </div>
              </div>
              <div class="summary-value-section">
                <div class="summary-main-value">
                  {{ summaryMetrics.booking.value.toLocaleString() }}
                </div>
                <div class="summary-trend" :class="getTrendClass(summaryMetrics.booking.trend)">
                  <i :class="getTrendIcon(summaryMetrics.booking.trend)"></i>
                  <span>{{ summaryMetrics.booking.trend.value.toFixed(1) }}%</span>
                </div>
              </div>
              <div class="summary-insights">
                <div class="insight-item">
                  <i class="bi bi-hourglass-split"></i>
                  <span
                    >{{ $t('dashboard.pending') || 'Pendientes' }}:
                    {{ summaryMetrics.booking.pending }}</span
                  >
                </div>
                <div class="insight-item insight-projection">
                  <i class="bi bi-graph-up-arrow"></i>
                  <span
                    >{{ $t('dashboard.projection') || 'Proyección mensual' }}: ~{{
                      summaryMetrics.booking.projection.toLocaleString()
                    }}</span
                  >
                </div>
              </div>
            </div>

            <!-- Rating Summary Card (CSAT) -->
            <div
              class="summary-card summary-card-warning"
              v-if="toggles['dashboard.attention-rating-avg.view']"
            >
              <div class="summary-card-header">
                <div class="summary-icon-wrapper summary-icon-warning">
                  <i class="bi bi-star-fill"></i>
                </div>
                <div class="summary-card-title">
                  <span class="summary-label">{{
                    $t('dashboard.items.attentions.3') || 'Calificación'
                  }}</span>
                  <span class="summary-period"
                    >{{ summaryMetrics.rating.count }}
                    {{ $t('dashboard.ratings') || 'evaluaciones' }}</span
                  >
                </div>
              </div>
              <div class="summary-value-section">
                <div class="summary-main-value">{{ summaryMetrics.rating.value.toFixed(1) }}</div>
                <div class="summary-rating-stars">
                  <i
                    v-for="n in 5"
                    :key="n"
                    class="bi"
                    :class="
                      n <= Math.round(summaryMetrics.rating.value) ? 'bi-star-fill' : 'bi-star'
                    "
                  ></i>
                </div>
              </div>
              <div
                class="summary-status-badge"
                :class="getCSATStatus(summaryMetrics.rating.value).class"
              >
                <i :class="getCSATIcon(summaryMetrics.rating.value)"></i>
                <span>{{ getCSATStatus(summaryMetrics.rating.value).label }}</span>
              </div>
              <div class="summary-insights">
                <div class="insight-item">
                  <i class="bi bi-people-fill"></i>
                  <span
                    >{{ summaryMetrics.rating.count }}
                    {{ $t('dashboard.responses') || 'respuestas' }}</span
                  >
                </div>
                <div class="insight-item" :class="getTrendClass(summaryMetrics.rating.trend)">
                  <i :class="getTrendIcon(summaryMetrics.rating.trend)"></i>
                  <span
                    >{{ summaryMetrics.rating.trend.value.toFixed(1) }}%
                    {{ $t('dashboard.vsPrevious') || 'vs período anterior' }}</span
                  >
                </div>
              </div>
            </div>

            <!-- NPS Summary Card -->
            <div
              class="summary-card summary-card-info"
              v-if="toggles['dashboard.attention-nps-avg.view']"
            >
              <div class="summary-card-header">
                <div class="summary-icon-wrapper summary-icon-info">
                  <i class="bi bi-megaphone-fill"></i>
                </div>
                <div class="summary-card-title">
                  <span class="summary-label">{{
                    $t('dashboard.items.attentions.24') || 'NPS'
                  }}</span>
                  <span class="summary-period"
                    >{{ summaryMetrics.nps.count }}
                    {{ $t('dashboard.responses') || 'respuestas' }}</span
                  >
                </div>
              </div>
              <div class="summary-value-section">
                <div class="summary-main-value" :class="getNPSClass(summaryMetrics.nps.value)">
                  {{ summaryMetrics.nps.value > 0 ? '+' : ''
                  }}{{ Math.round(summaryMetrics.nps.value) }}
                </div>
                <div class="summary-nps-label" :class="getNPSClass(summaryMetrics.nps.value)">
                  {{ getNPSLabel(summaryMetrics.nps.value) }}
                </div>
              </div>
              <div class="summary-status-badge" :class="getNPSClass(summaryMetrics.nps.value)">
                <i :class="getNPSStatusIcon(summaryMetrics.nps.value)"></i>
                <span>{{ getNPSLabel(summaryMetrics.nps.value) }}</span>
              </div>
              <div class="summary-insights">
                <div class="insight-item">
                  <i class="bi bi-bar-chart-fill"></i>
                  <span>{{ $t('dashboard.npsScore') || 'Puntuación NPS' }}</span>
                </div>
                <div class="insight-item">
                  <i class="bi bi-info-circle"></i>
                  <span>{{ getNPSDescription(summaryMetrics.nps.value) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Detailed Metrics Section -->
        <!-- Show detailed metrics always, or when summary is hidden (hideSummary=true) -->
        <!-- When exporting to PDF (detailsOpened=true), show detailed metrics even if hideSummary=false -->
        <div class="dashboard-detailed-section" v-if="true">
          <div class="section-header">
            <h4 class="section-title">
              <i class="bi bi-list-ul"></i>
              {{ $t('dashboard.detailedMetrics') || 'Métricas Detalladas' }}
            </h4>
          </div>

          <div id="attention-number">
            <DetailsCard
              :show="!!toggles['dashboard.attention-number.view']"
              :data="calculatedMetrics['attention.created'].attentionNumber"
              :subdatapastperiod="calculatedMetrics['attention.created'].pastPeriodAttentionNumber"
              :subdatapastmonth="calculatedMetrics['attention.created'].pastMonthAttentionNumber"
              :subdatacurrentperiod="
                calculatedMetrics['attention.created'].currentMonthAttentionNumber
              "
              :title="$t('dashboard.items.attentions.1')"
              :show-tooltip="false"
              :icon="'qr-code'"
              :icon-style-class="'blue-icon'"
              :details-opened="detailsOpened"
            >
              <template v-slot:details>
                <div id="attention-number-details" class="modern-details-grid">
                  <DetailItem
                    :label="$t('dashboard.items.attentions.16')"
                    :value="calculatedMetrics['attention.created'].typesFlow.STANDARD || 0"
                    icon="bi-person-fill"
                    icon-class="green-icon"
                  />
                  <DetailItem
                    :label="$t('dashboard.items.attentions.17')"
                    :value="calculatedMetrics['attention.created'].typesFlow.NODEVICE || 0"
                    icon="bi-people-fill"
                    icon-class="red-icon"
                  />
                  <DetailItem
                    :label="$t('dashboard.items.attentions.18')"
                    :value="calculatedMetrics['attention.created'].typesFlow.SURVEY_ONLY || 0"
                    icon="bi-star-fill"
                    icon-class="yellow-icon"
                  />
                </div>
              </template>
            </DetailsCard>
          </div>
          <div id="booking-number">
            <DetailsCard
              :show="!!toggles['dashboard.booking-number.view']"
              :data="calculatedMetrics['booking.created'].bookingNumber"
              :subdata="calculatedMetrics['booking.created'].stillPendingBookings"
              :title="$t('dashboard.items.attentions.27')"
              :show-tooltip="true"
              :description="$t('dashboard.booking')"
              :icon="'calendar2-check-fill'"
              :icon-style-class="'orange-icon'"
              :details-opened="detailsOpened"
            >
              <template v-slot:details>
                <div id="booking-number-details" class="modern-details-grid">
                  <DetailItem
                    :label="$t('dashboard.items.attentions.28')"
                    :value="calculatedMetrics['booking.created'].bookingFlow.datasets[0] || 0"
                    icon="bi-calendar-plus-fill"
                    icon-class="yellow-icon"
                  />
                  <DetailItem
                    :label="$t('dashboard.items.attentions.35')"
                    :value="calculatedMetrics['booking.created'].bookingFlow.datasets[2] || 0"
                    icon="bi-calendar2-check-fill"
                    icon-class="blue-icon"
                  />
                  <DetailItem
                    :label="$t('dashboard.items.attentions.29')"
                    :value="calculatedMetrics['booking.created'].bookingFlow.datasets[1] || 0"
                    icon="bi-calendar2-heart-fill"
                    icon-class="green-icon"
                  />
                  <DetailItem
                    :label="$t('dashboard.items.attentions.30')"
                    :value="calculatedMetrics['booking.created'].bookingFlow.datasets[3] || 0"
                    icon="bi-calendar-x-fill"
                    icon-class="red-icon"
                  />
                </div>
              </template>
            </DetailsCard>
          </div>
          <!-- Queue Details Card -->
          <div
            class="queue-details-section"
            v-if="!detailsOpened && !hideSummary && getQueueDetails().length > 0"
          >
            <div class="queue-details-card">
              <div class="queue-details-header">
                <div class="queue-details-icon">
                  <i class="bi bi-list-ul"></i>
                </div>
                <div class="queue-details-title-section">
                  <h3 class="queue-details-title">
                    {{ $t('dashboard.queueDetails.title') || 'Detalles por Cola' }}
                  </h3>
                  <p class="queue-details-subtitle">
                    {{
                      $t('dashboard.queueDetails.subtitle') ||
                      'Atenciones, reservas y tiempo medio por cola'
                    }}
                  </p>
                </div>
                <button
                  v-if="getQueueDetails().length > 1"
                  @click="queueDetailsExpanded = !queueDetailsExpanded"
                  class="queue-details-toggle-btn"
                  :class="{ expanded: queueDetailsExpanded }"
                >
                  <i :class="queueDetailsExpanded ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
                </button>
              </div>
              <!-- Front Card - Queue with most attentions -->
              <div class="queue-details-front" v-if="getMaxQueue()">
                <div class="queue-details-front-content">
                  <div class="queue-details-front-label">
                    {{ $t('dashboard.queueDetails.maxQueue') || 'Cola con más atenciones' }}
                  </div>
                  <div class="queue-details-front-name">{{ getMaxQueue().queueName }}</div>
                  <div class="queue-details-front-stats">
                    <div class="queue-details-front-stat">
                      <span class="queue-details-front-stat-label">Atenciones:</span>
                      <span class="queue-details-front-stat-value">{{
                        getMaxQueue().attentionCount
                      }}</span>
                    </div>
                    <div class="queue-details-front-stat">
                      <span class="queue-details-front-stat-label">Reservas:</span>
                      <span class="queue-details-front-stat-value">{{
                        getMaxQueue().bookingCount || 0
                      }}</span>
                    </div>
                    <div class="queue-details-front-stat">
                      <span class="queue-details-front-stat-label">Tempo Médio:</span>
                      <span
                        class="queue-details-front-stat-value"
                        :class="getDurationColorClass(getMaxQueue().medianDuration)"
                      >
                        {{ formatDuration(getMaxQueue().medianDuration) }}
                        <span
                          class="duration-indicator"
                          :class="getDurationColorClass(getMaxQueue().medianDuration)"
                        ></span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Queue List -->
              <div
                class="queue-details-list"
                v-if="queueDetailsExpanded && getQueueDetails().length > 1"
              >
                <div
                  v-for="queue in getQueueDetails()"
                  :key="queue.queueId"
                  class="queue-details-item"
                >
                  <div class="queue-details-item-name">{{ queue.queueName }}</div>
                  <div class="queue-details-item-stats">
                    <div class="queue-details-item-stat">
                      <i class="bi bi-qr-code"></i>
                      <span>{{ queue.attentionCount }}</span>
                    </div>
                    <div class="queue-details-item-stat">
                      <i class="bi bi-calendar2-check"></i>
                      <span>{{ queue.bookingCount || 0 }}</span>
                    </div>
                    <div class="queue-details-item-stat">
                      <i class="bi bi-clock-history"></i>
                      <span :class="getDurationColorClass(queue.medianDuration)">
                        {{ formatDuration(queue.medianDuration) }}
                        <span
                          class="duration-indicator-small"
                          :class="getDurationColorClass(queue.medianDuration)"
                        ></span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div class="row">
              <div id="attention-time-avg" class="col">
                <div class="dashboard-metric-card-wrapper">
                  <SimpleCard
                    :show="!!toggles['dashboard.attention-time-avg.view']"
                    :data="getMedianDuration()"
                    :title="$t('dashboard.items.attentions.2')"
                    :show-tooltip="true"
                    :description="$t('dashboard.seconds')"
                    :icon="'clock-history'"
                    :icon-style-class="'green-icon'"
                  >
                  </SimpleCard>
                  <Popper
                    v-if="isUsingIntelligentEstimation()"
                    :class="'dark'"
                    arrow
                    hover
                    disable-click-away
                    :content="$t('dashboard.intelligentEstimationTooltip')"
                  >
                    <span class="ai-badge-dashboard">
                      <i class="bi bi-stars"></i>
                    </span>
                  </Popper>
                </div>
              </div>
              <div id="attention-no-device" class="col">
                <SimpleCard
                  :show="!!toggles['dashboard.attention-no-device.view']"
                  :data="calculatedMetrics['attention.created'].noDevicePer || 0 + '%'"
                  :subdata="calculatedMetrics['attention.created'].noDevice || 0"
                  :title="$t('dashboard.items.attentions.5')"
                  :show-tooltip="false"
                  :icon="'people-fill'"
                  :icon-style-class="'orange-icon'"
                >
                </SimpleCard>
              </div>
            </div>
          </div>
          <div id="attention-rating-avg">
            <DetailsCard
              :show="!!toggles['dashboard.attention-rating-avg.view']"
              :data="calculatedMetrics['survey.created'].avgRating || 0"
              :subdata="calculatedMetrics['survey.created'].count_rating || 0"
              :title="$t('dashboard.items.attentions.3')"
              :show-tooltip="true"
              :description="$t('dashboard.rating')"
              :icon="'star-fill'"
              :icon-style-class="'yellow-icon'"
              :details-opened="detailsOpened"
            >
              <template v-slot:details>
                <AttentionRatingDetails
                  :show="toggles['dashboard.attention-rating-avg.view']"
                  :count="calculatedMetrics['survey.created'].count_rating || 0"
                  :min="calculatedMetrics['survey.created']['min']?.rating || 0"
                  :max="calculatedMetrics['survey.created']['max']?.rating || 0"
                  :messages="calculatedMetrics['survey.created']['messages'] || []"
                  :score="calculatedMetrics['survey.created']['csatScore'] || []"
                  :limit="5"
                >
                </AttentionRatingDetails>
              </template>
            </DetailsCard>
          </div>
          <div id="attention-nps-avg">
            <DetailsCard
              :show="!!toggles['dashboard.attention-nps-avg.view']"
              :data="Math.round(calculatedMetrics['survey.created'].nps || 0)"
              :subdata="calculatedMetrics['survey.created'].count_nps || 0"
              :title="$t('dashboard.items.attentions.24')"
              :show-tooltip="true"
              :description="$t('dashboard.nps.description')"
              :icon="'megaphone-fill'"
              :details-opened="detailsOpened"
            >
              <template v-slot:details>
                <AttentionNPSDetails
                  :show="!!toggles['dashboard.attention-nps-avg.view']"
                  :min="calculatedMetrics['survey.created']['min']?.nps || 0"
                  :max="calculatedMetrics['survey.created']['max']?.nps || 0"
                  :score="calculatedMetrics['survey.created']['npsScore'] || []"
                  :distribution="calculatedMetrics['survey.created']['npsDistribution']"
                  :count="calculatedMetrics['survey.created'].count_nps || 0"
                  :limit="10"
                >
                </AttentionNPSDetails>
              </template>
            </DetailsCard>
          </div>
          <div id="attention-comments-avg">
            <DetailsCard
              :show="!!toggles['dashboard.attention-comments-avg.view']"
              :data="calculatedMetrics['survey.created']?.prom_score"
              :subdata="calculatedMetrics['survey.created']['scoredMessages']?.length"
              :title="$t('dashboard.items.attentions.21')"
              :show-tooltip="true"
              :description="$t('dashboard.sentiment')"
              :icon="'chat-heart-fill'"
              :icon-style-class="'red-icon'"
              :details-opened="detailsOpened"
            >
              <template v-slot:details>
                <AttentionCommentsDetails
                  :show="!!toggles['dashboard.attention-comments-avg.view']"
                  :messages="calculatedMetrics['survey.created']['scoredMessages']"
                  :min="calculatedMetrics['survey.created']['sentimentScore']['minSentiment'] || 0"
                  :max="calculatedMetrics['survey.created']['sentimentScore']['maxSentiment'] || 0"
                  :distribution="sentimentScore"
                  :limit="5"
                >
                </AttentionCommentsDetails>
              </template>
            </DetailsCard>
          </div>
          <div id="attention-collaborators">
            <DetailsCard
              :show="!!toggles['dashboard.attention-collaborators.view']"
              :data="
                hasCollaborators() && getCollaboratorsList().length > 0
                  ? getCollaboratorsList()[0].attention_counter || 0
                  : 0
              "
              :subdata="
                hasCollaborators() && getCollaboratorsList().length > 0
                  ? getCollaboratorsList()[0].name || getCollaboratorsList()[0].alias || 'N/A'
                  : 'No Data'
              "
              :title="$t('dashboard.items.attentions.20') || 'Rendimiento de Colaboradores'"
              :show-tooltip="true"
              :description="
                $t('dashboard.collaborators.tooltip') ||
                'Métricas de productividad, eficiencia y calidad de servicio por colaborador'
              "
              :icon="'people-fill'"
              :icon-style-class="'blue-icon'"
              :details-opened="detailsOpened"
            >
              <template v-slot:details>
                <AttentionCollaboratorsDetails
                  :show="!!toggles['dashboard.attention-collaborators.view']"
                  :collaborators="getCollaboratorsList()"
                  :limit="10"
                >
                </AttentionCollaboratorsDetails>
              </template>
            </DetailsCard>
          </div>
          <div id="attention-origin-avg">
            <DetailsCard
              :show="!!toggles['dashboard.attention-origin-avg.view']"
              :data="
                calculatedMetrics['clients']['maxOrigin']?.name
                  ? $t(`origin.${calculatedMetrics['clients']['maxOrigin']?.name}`)
                  : 'No Data'
              "
              :subdata="
                calculatedMetrics['clients']['maxOrigin']
                  ? calculatedMetrics['clients']['maxOrigin']?.count
                  : 0
              "
              :title="$t('dashboard.items.attentions.31')"
              :show-tooltip="true"
              :description="$t('dashboard.origin')"
              :icon="'emoji-heart-eyes-fill'"
              :icon-style-class="'orange-icon'"
              :details-opened="detailsOpened"
            >
              <template v-slot:details>
                <AttentionOriginDetails
                  :show="!!toggles['dashboard.attention-origin-avg.view']"
                  :distribution="calculatedMetrics['clients']['originDistribution']"
                  :count="calculatedMetrics['clients'].originTotal || 0"
                  :limit="10"
                >
                </AttentionOriginDetails>
              </template>
            </DetailsCard>
          </div>
          <div id="attention-client-contact">
            <DetailsCard
              :show="!!toggles['dashboard.attention-client-contact.view']"
              :data="
                calculatedMetrics['clients']?.contactTotal
                  ? calculatedMetrics['clients']?.contactTotal
                  : 0
              "
              :subdata="undefined"
              :title="$t('dashboard.items.attentions.32')"
              :show-tooltip="true"
              :description="$t('dashboard.contacts')"
              :icon="'chat-left-dots-fill'"
              :icon-style-class="'yellow-icon'"
              :details-opened="detailsOpened"
            >
              <template v-slot:details>
                <AttentionClientContactDetails
                  :show="!!toggles['dashboard.attention-client-contact.view']"
                  :distribution-type="calculatedMetrics['clients']['typeContactDistribution']"
                  :distribution-result="calculatedMetrics['clients']['resultContactDistribution']"
                  :count="calculatedMetrics['clients'].contactTotal || 0"
                >
                </AttentionClientContactDetails>
              </template>
            </DetailsCard>
          </div>
          <div id="attention-daysSince-clients">
            <AttentionDaysSinceDetails
              :show="!!toggles['dashboard.attention-days-since-clients.view']"
              :distribution="calculatedMetrics['clients']['resultDaysSinceDistribution']"
              :count="calculatedMetrics['clients'].daysSinceClientsTotal || 0"
            >
            </AttentionDaysSinceDetails>
          </div>
          <div id="attention-collection-clients">
            <CollectionDetails
              :show="!!toggles['dashboard.collection-details.view']"
              :calculated-metrics="calculatedMetrics"
              :details-opened="detailsOpened"
            >
            </CollectionDetails>
          </div>
          <div id="attention-notification">
            <DetailsCard
              :show="!!toggles['dashboard.attention-notification.view']"
              :data="calculatedMetrics['notification.created'].notificationNumber"
              :title="$t('dashboard.items.attentions.6')"
              :show-tooltip="false"
              :icon="'send-check-fill'"
              :icon-style-class="'blue-icon'"
              :details-opened="detailsOpened"
            >
              <template v-slot:details>
                <AttentionNotificationDetails
                  :show="!!toggles['dashboard.attention-notification.view']"
                  :count="calculatedMetrics['notification.created'].notifiedAttentions"
                  :booking="calculatedMetrics['notification.created'].notifiedBookings"
                  :waitlist="calculatedMetrics['notification.created'].notifiedWaitlists"
                  :channels="calculatedMetrics['notification.created'].channelFlow"
                  :types="calculatedMetrics['notification.created'].typesFlow"
                >
                </AttentionNotificationDetails>
              </template>
            </DetailsCard>
          </div>
          <div id="telemedicine-sessions" v-if="commerce?.telemedicineEnabled">
            <DetailsCard
              :show="!!toggles['dashboard.telemedicine.view']"
              :data="calculatedMetrics['telemedicine.created']?.total || 0"
              :title="$t('dashboard.telemedicine.title') || 'Sesiones de Telemedicina'"
              :show-tooltip="true"
              :description="
                $t('dashboard.telemedicine.description') || 'Métricas de sesiones de telemedicina'
              "
              :icon="'camera-video-fill'"
              :icon-style-class="'blue-icon'"
              :details-opened="detailsOpened"
            >
              <template v-slot:details>
                <TelemedicineDetails
                  :show="!!toggles['dashboard.telemedicine.view']"
                  :total="calculatedMetrics['telemedicine.created']?.total || 0"
                  :completed="calculatedMetrics['telemedicine.created']?.completed || 0"
                  :cancelled="calculatedMetrics['telemedicine.created']?.cancelled || 0"
                  :scheduled="calculatedMetrics['telemedicine.created']?.scheduled || 0"
                  :active="calculatedMetrics['telemedicine.created']?.active || 0"
                  :average-duration="
                    calculatedMetrics['telemedicine.created']?.averageDuration || 0
                  "
                  :access-keys-sent="
                    calculatedMetrics['telemedicine.created']?.totalAccessKeysSent || 0
                  "
                  :access-keys-validated="
                    calculatedMetrics['telemedicine.created']?.totalAccessKeysValidated || 0
                  "
                  :doctors-connected="
                    calculatedMetrics['telemedicine.created']?.totalDoctorsConnected || 0
                  "
                  :patients-connected="
                    calculatedMetrics['telemedicine.created']?.totalPatientsConnected || 0
                  "
                  :sessions-started="
                    calculatedMetrics['telemedicine.created']?.totalSessionsStarted || 0
                  "
                  :sessions-ended="
                    calculatedMetrics['telemedicine.created']?.totalSessionsEnded || 0
                  "
                  :status-flow="calculatedMetrics['telemedicine.created']?.statusFlow || {}"
                  :access-key-flow="
                    calculatedMetrics['telemedicine.created']?.accessKeyFlow || {
                      sent: 0,
                      validated: 0,
                      pending: 0,
                    }
                  "
                  :connection-flow="
                    calculatedMetrics['telemedicine.created']?.connectionFlow || {
                      doctors: 0,
                      patients: 0,
                      both: 0,
                      none: 0,
                    }
                  "
                >
                </TelemedicineDetails>
              </template>
            </DetailsCard>
          </div>
        </div>
        <PDFFooter :show="toggles['dashboard.reports.indicators']"></PDFFooter>
      </div>
    </div>
    <div v-if="showIndicators === true && !toggles['dashboard.indicators.view']">
      <Message
        :icon="'graph-up-arrow'"
        :title="$t('dashboard.message.1.title')"
        :content="$t('dashboard.message.1.content')"
      />
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}
.metric-card-title {
  font-size: 0.8rem;
  line-height: 0.8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}

.modern-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  padding: 0.5rem 0;
}

@media (max-width: 768px) {
  .modern-details-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.75rem;
  }
}

@media (max-width: 576px) {
  .modern-details-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
}

/* Enhanced Dashboard Summary Section */
.dashboard-summary-section {
  margin: 1.5rem auto;
  max-width: 100%;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  width: 100%;
  box-sizing: border-box;
}

.summary-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(0, 74, 173, 0.1);
}

.summary-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #000;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.summary-title i {
  color: var(--azul-turno);
  font-size: 1.75rem;
}

.summary-subtitle {
  font-size: 0.9rem;
  color: rgba(0, 0, 0, 0.6);
  margin: 0;
}

.summary-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  justify-items: stretch;
  align-items: stretch;
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
  animation: fadeInUp 0.6s ease-out;
  animation-fill-mode: both;
  will-change: transform, box-shadow;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}

.summary-card:nth-child(1) {
  animation-delay: 0.1s;
}

.summary-card:nth-child(2) {
  animation-delay: 0.2s;
}

.summary-card:nth-child(3) {
  animation-delay: 0.3s;
}

.summary-card:nth-child(4) {
  animation-delay: 0.4s;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

.summary-card-primary::before {
  background: linear-gradient(90deg, #004aad 0%, #446ffc 100%);
}

.summary-card-success::before {
  background: linear-gradient(90deg, #00c2cb 0%, #00c4cc 100%);
}

.summary-card-warning::before {
  background: linear-gradient(90deg, #f9c322 0%, #fac107 100%);
}

.summary-card-info::before {
  background: linear-gradient(90deg, #2f407a 0%, #7c91d9 100%);
}

.summary-card:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 6px 16px rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 74, 173, 0.15);
}

.summary-card:hover::before {
  opacity: 1;
  height: 5px;
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
  position: relative;
  overflow: hidden;
}

.summary-icon-wrapper::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.4s ease, height 0.4s ease;
}

.summary-card:hover .summary-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.summary-card:hover .summary-icon-wrapper::before {
  width: 100px;
  height: 100px;
}

.summary-icon-wrapper i {
  font-size: 1.5rem;
  color: #fff;
}

.summary-icon-primary {
  background: linear-gradient(135deg, #004aad 0%, #446ffc 100%);
}

.summary-icon-success {
  background: linear-gradient(135deg, #00c2cb 0%, #00c4cc 100%);
}

.summary-icon-warning {
  background: linear-gradient(135deg, #f9c322 0%, #fac107 100%);
}

.summary-icon-info {
  background: linear-gradient(135deg, #2f407a 0%, #7c91d9 100%);
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
  line-height: .9rem;
}

.summary-period {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.5);
}

.summary-value-section {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: 1rem;
}

.summary-main-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #000;
  line-height: 1;
  letter-spacing: -0.02em;
  transition: all 0.3s ease;
  position: relative;
}

.summary-card:hover .summary-main-value {
  color: var(--azul-turno);
  transform: scale(1.05);
}

.summary-trend {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
}

.trend-up {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.trend-down {
  background: rgba(165, 42, 42, 0.15);
  color: #a52a2a;
}

.trend-neutral {
  background: rgba(169, 169, 169, 0.15);
  color: #a9a9a9;
}

.summary-trend i {
  font-size: 1rem;
}

.summary-rating-stars {
  display: flex;
  gap: 0.25rem;
}

.summary-rating-stars i {
  font-size: 1.25rem;
  color: #f9c322;
}

.summary-nps-label {
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
}

.nps-excellent {
  color: #00c2cb;
}

.nps-good {
  color: #004aad;
}

.nps-poor {
  color: #a52a2a;
}

/* Status Badge */
.summary-status-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 700;
  margin: 0.75rem 0;
  transition: all 0.2s ease;
}

.summary-status-badge i {
  font-size: 1rem;
}

/* CSAT Status Badges */
.csat-excellent {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.2) 0%, rgba(0, 194, 203, 0.15) 100%);
  color: #00c2cb;
  border: 1px solid rgba(0, 194, 203, 0.3);
  box-shadow: 0 2px 8px rgba(0, 194, 203, 0.15);
}

.csat-good {
  background: linear-gradient(135deg, rgba(249, 195, 34, 0.2) 0%, rgba(249, 195, 34, 0.15) 100%);
  color: #f9c322;
  border: 1px solid rgba(249, 195, 34, 0.3);
  box-shadow: 0 2px 8px rgba(249, 195, 34, 0.15);
}

.csat-poor {
  background: linear-gradient(135deg, rgba(165, 42, 42, 0.2) 0%, rgba(165, 42, 42, 0.15) 100%);
  color: #a52a2a;
  border: 1px solid rgba(165, 42, 42, 0.3);
  box-shadow: 0 2px 8px rgba(165, 42, 42, 0.15);
}

/* NPS Status Badges - reusing nps classes */
.summary-status-badge.nps-excellent {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.2) 0%, rgba(0, 194, 203, 0.15) 100%);
  color: #00c2cb;
  border: 1px solid rgba(0, 194, 203, 0.3);
  box-shadow: 0 2px 8px rgba(0, 194, 203, 0.15);
}

.summary-status-badge.nps-good {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.2) 0%, rgba(0, 74, 173, 0.15) 100%);
  color: #004aad;
  border: 1px solid rgba(0, 74, 173, 0.3);
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.15);
}

.summary-status-badge.nps-poor {
  background: linear-gradient(135deg, rgba(165, 42, 42, 0.2) 0%, rgba(165, 42, 42, 0.15) 100%);
  color: #a52a2a;
  border: 1px solid rgba(165, 42, 42, 0.3);
  box-shadow: 0 2px 8px rgba(165, 42, 42, 0.15);
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

.insight-projection {
  font-weight: 600;
  color: rgba(0, 74, 173, 0.8);
}

.insight-projection i {
  color: var(--azul-turno);
}

/* Detailed Metrics Section */
.dashboard-detailed-section {
  margin-top: 2rem;
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

/* Responsive */
@media (max-width: 992px) {
  .summary-cards-grid {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
  }

  .summary-main-value {
    font-size: 2rem;
  }

  .gauge-charts-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  .health-score-breakdown {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-summary-section {
    margin: 1rem auto;
    padding: 1.25rem;
    max-width: 100%;
  }

  .summary-cards-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .summary-main-value {
    font-size: 1.75rem;
  }

  .summary-card {
    padding: 1.25rem;
  }

  .health-score-section,
  .gauge-charts-section,
  .smart-recommendations-panel {
    margin-left: 0.25rem;
    margin-right: 0.25rem;
  }

  .gauge-charts-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .gauge-chart-card {
    max-width: 100%;
  }

  .health-score-breakdown {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 576px) {
  .summary-title {
    font-size: 1.25rem;
  }

  .summary-main-value {
    font-size: 1.5rem;
  }

  .summary-icon-wrapper {
    width: 40px;
    height: 40px;
  }

  .summary-icon-wrapper i {
    font-size: 1.25rem;
  }

  .health-score-card {
    padding: 1.5rem;
  }

  .health-score-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .health-score-icon {
    width: 56px;
    height: 56px;
  }

  .health-score-icon i {
    font-size: 1.75rem;
  }

  .health-score-number {
    font-size: 3rem;
  }

  .health-score-max {
    font-size: 1.5rem;
  }
}

/* Health Score Section */
.health-score-section {
  margin: 1.5rem auto;
  max-width: 100%;
  padding: 0 0.5rem;
  animation: fadeInUp 0.6s ease-out;
}

.health-score-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.health-score-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(90deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
}

.health-score-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.health-score-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.3);
}

.health-score-icon i {
  font-size: 2rem;
  color: #fff;
}

.health-score-title-section {
  flex: 1;
}

.health-score-title-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.health-score-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #000;
  margin: 0;
}

/* Styles moved to global section below */

.health-score-subtitle {
  font-size: 0.9rem;
  color: rgba(0, 0, 0, 0.6);
  margin: 0;
}

.health-score-main {
  text-align: center;
  margin-bottom: 2rem;
  padding: 2rem 1.5rem;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.03) 0%, rgba(0, 194, 203, 0.02) 100%);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.health-score-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.health-score-number {
  font-size: 4rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.05em;
}

.health-score-max {
  font-size: 2rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.4);
}

.health-score-bar {
  width: 100%;
  max-width: 400px;
  height: 16px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 9999px;
  overflow: hidden;
  position: relative;
  margin: 0 auto;
}

.health-score-progress {
  height: 100%;
  border-radius: 9999px;
  transition: width 1s ease-out;
  position: relative;
  background: transparent; /* Will be overridden by color classes */
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.health-excellent {
  color: #00c2cb;
}

.health-excellent .health-score-progress,
.health-excellent .health-score-item-progress,
.health-score-progress.health-excellent,
.health-score-item-progress.health-excellent {
  background: linear-gradient(90deg, #00c2cb 0%, #00c4cc 100%) !important;
}

.health-good {
  color: #004aad;
}

.health-good .health-score-progress,
.health-good .health-score-item-progress,
.health-score-progress.health-good,
.health-score-item-progress.health-good {
  background: linear-gradient(90deg, #004aad 0%, #446ffc 100%) !important;
}

.health-warning {
  color: #f9c322;
}

.health-warning .health-score-progress,
.health-warning .health-score-item-progress,
.health-score-progress.health-warning,
.health-score-item-progress.health-warning {
  background: linear-gradient(90deg, #f9c322 0%, #fac107 100%) !important;
}

.health-poor {
  color: #a52a2a;
}

.health-poor .health-score-progress,
.health-poor .health-score-item-progress,
.health-score-progress.health-poor,
.health-score-item-progress.health-poor {
  background: linear-gradient(90deg, #a52a2a 0%, #d32f2f 100%) !important;
}

.health-score-breakdown {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.health-score-item {
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  min-height: 120px;
  justify-content: space-between;
}

.health-score-item:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.health-score-item-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  margin-bottom: 0.5rem;
}

.health-score-item-label i {
  color: var(--azul-turno);
  font-size: 1rem;
}

.health-score-item-value {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.health-score-item-bar {
  width: 100%;
  height: 12px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 9999px;
  overflow: hidden;
  position: relative;
}

.health-score-item-progress {
  height: 100%;
  border-radius: 9999px;
  transition: width 1s ease-out;
  position: relative;
  background: transparent; /* Will be overridden by color classes */
}

/* Percentage removed from bars */

/* Gauge Charts Section */
.gauge-charts-section {
  margin: 2rem auto;
  max-width: 100%;
  padding: 0 0.5rem;
  animation: fadeInUp 0.6s ease-out 0.2s both;
}

.gauge-charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.75rem;
  margin-top: 1.5rem;
  justify-items: center;
  align-items: stretch;
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
  overflow: visible;
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
}

.gauge-info-icon:hover {
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.gauge-chart-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* Responsive */
@media (max-width: 768px) {
  .health-score-card {
    padding: 1.5rem;
  }

  .health-score-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .health-score-icon {
    width: 56px;
    height: 56px;
  }

  .health-score-icon i {
    font-size: 1.75rem;
  }

  .health-score-number {
    font-size: 3rem;
  }

  .health-score-max {
    font-size: 1.5rem;
  }

  .gauge-charts-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

/* Global Popper/Tooltip Styles - Homologated for all dashboard tooltips */
::deep(.popper),
::deep(.popper-dark),
::deep([data-popper-placement]),
::deep([data-popper-placement] > div) {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.95) 0%,
    rgba(30, 30, 30, 0.98) 100%
  ) !important;
  color: #ffffff !important;
  padding: 0.75rem 1rem !important;
  border-radius: 8px !important;
  font-size: 0.875rem !important;
  line-height: 1.5 !important;
  max-width: 320px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  z-index: 9999 !important;
  font-weight: 400 !important;
  word-wrap: break-word !important;
}

::deep(.popper__arrow),
::deep(.popper__arrow::before) {
  border-color: rgba(0, 0, 0, 0.95) transparent transparent transparent !important;
  border-width: 8px !important;
}

::deep(.popper[data-popper-placement^='top'] .popper__arrow),
::deep(.popper[data-popper-placement^='top'] .popper__arrow::before) {
  border-color: transparent transparent rgba(0, 0, 0, 0.95) transparent !important;
}

::deep(.popper[data-popper-placement^='bottom'] .popper__arrow),
::deep(.popper[data-popper-placement^='bottom'] .popper__arrow::before) {
  border-color: rgba(0, 0, 0, 0.95) transparent transparent transparent !important;
}

::deep(.popper[data-popper-placement^='left'] .popper__arrow),
::deep(.popper[data-popper-placement^='left'] .popper__arrow::before) {
  border-color: transparent transparent transparent rgba(0, 0, 0, 0.95) !important;
}

::deep(.popper[data-popper-placement^='right'] .popper__arrow),
::deep(.popper[data-popper-placement^='right'] .popper__arrow::before) {
  border-color: transparent rgba(0, 0, 0, 0.95) transparent transparent !important;
}

/* Unified Info Icon Styles for all dashboard tooltips */
.health-score-info-icon,
.health-score-item-info,
.gauge-info-icon,
.recommendations-info-icon,
.metric-info-icon {
  font-size: 1rem !important;
  color: var(--azul-turno) !important;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.health-score-info-icon:hover,
.health-score-item-info:hover,
.gauge-info-icon:hover,
.recommendations-info-icon:hover,
.metric-info-icon:hover {
  color: var(--verde-tu) !important;
  transform: scale(1.15);
}

/* Dashboard Metric Card Wrapper for AI Badge */
.dashboard-metric-card-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}

.ai-badge-dashboard {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: inline-block;
  color: #ffc107;
  font-size: 1rem;
  cursor: help;
  z-index: 10;
  animation: sparkle 2s ease-in-out infinite;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.ai-badge-dashboard i {
  filter: drop-shadow(0 0 2px rgba(255, 193, 7, 0.5));
}

@keyframes sparkle {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

/* Queue Details Section */
.queue-details-section {
  margin: 2rem 0;
}

.queue-details-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.queue-details-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
}

.queue-details-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.15) 0%, rgba(0, 194, 203, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #004aad;
  font-size: 1.5rem;
}

.queue-details-title-section {
  flex: 1;
}

.queue-details-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  margin: 0 0 0.25rem 0;
}

.queue-details-subtitle {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  margin: 0;
}

.queue-details-toggle-btn {
  background: transparent;
  border: none;
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.queue-details-toggle-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.7);
}

/* Front Card - Max Queue */
.queue-details-front {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.1) 0%, rgba(0, 194, 203, 0.1) 100%);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border: 2px solid rgba(0, 74, 173, 0.2);
}

.queue-details-front-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.queue-details-front-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.queue-details-front-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
}

.queue-details-front-stats {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.queue-details-front-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.queue-details-front-stat-label {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
}

.queue-details-front-stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Queue List */
.queue-details-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.queue-details-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(169, 169, 169, 0.15);
  transition: all 0.2s ease;
}

.queue-details-item:hover {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.queue-details-item-name {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.8);
  flex: 1;
}

.queue-details-item-stats {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.queue-details-item-stat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
}

.queue-details-item-stat i {
  color: rgba(0, 0, 0, 0.5);
  font-size: 1rem;
}

/* Duration Color Classes */
.duration-excellent {
  color: #28a745;
}

.duration-good {
  color: #ffc107;
}

.duration-warning {
  color: #ff9800;
}

.duration-poor {
  color: #dc3545;
}

.duration-neutral {
  color: #a9a9a9;
}

.duration-indicator {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-left: 0.5rem;
}

.duration-indicator-small {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-left: 0.5rem;
}

.duration-excellent .duration-indicator,
.duration-excellent .duration-indicator-small {
  background: #28a745;
  box-shadow: 0 0 4px rgba(40, 167, 69, 0.4);
}

.duration-good .duration-indicator,
.duration-good .duration-indicator-small {
  background: #ffc107;
  box-shadow: 0 0 4px rgba(255, 193, 7, 0.4);
}

.duration-warning .duration-indicator,
.duration-warning .duration-indicator-small {
  background: #ff9800;
  box-shadow: 0 0 4px rgba(255, 152, 0, 0.4);
}

.duration-poor .duration-indicator,
.duration-poor .duration-indicator-small {
  background: #dc3545;
  box-shadow: 0 0 4px rgba(220, 53, 69, 0.4);
}

.duration-neutral .duration-indicator,
.duration-neutral .duration-indicator-small {
  background: #a9a9a9;
}
</style>
