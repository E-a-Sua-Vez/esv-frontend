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
import PDFHeader from '../reports/PDFHeader.vue';
import PDFFooter from '../reports/PDFFooter.vue';
import AttentionOriginDetails from './domain/AttentionOriginDetails.vue';
import AttentionClientContactDetails from './domain/AttentionClientContactDetails.vue';
import AttentionDaysSinceDetails from './domain/AttentionDaysSinceDetails.vue';
import CollectionDetails from './domain/CollectionDetails.vue';
import DetailItem from './common/DetailItem.vue';

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
    PDFHeader,
    PDFFooter,
    Spinner,
    AttentionOriginDetails,
    AttentionClientContactDetails,
    AttentionDaysSinceDetails,
    CollectionDetails,
    DetailItem,
  },
  props: {
    showIndicators: { type: Boolean, default: false },
    calculatedMetrics: { type: Object, default: undefined },
    toggles: { type: Object, default: undefined },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    commerce: { type: Object, default: undefined },
  },
  data() {
    return {
      loading: false,
      detailsOpened: false,
      sentimentScore: {},
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
  },
  methods: {
    calculateTrend(current, previous) {
      if (!previous || previous === 0) return { value: 0, type: 'neutral' };
      const change = ((current - previous) / previous) * 100;
      if (change > 5) return { value: Math.abs(change), type: 'up' };
      if (change < -5) return { value: Math.abs(change), type: 'down' };
      return { value: Math.abs(change), type: 'neutral' };
    },
    getDaysInPeriod() {
      if (!this.startDate || !this.endDate) return 0;
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
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
    async exportToPDF() {
      this.loading = true;
      this.detailsOpened = true;
      const filename = `indicators-${this.commerce.name}-${this.commerce.tag}-${this.startDate}-${this.endDate}.pdf`;
      const options = {
        margin: 0.5,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      };
      let doc = document.getElementById('indicators-component');
      document.getElementById('pdf-header').style.display = 'block';
      document.getElementById('pdf-footer').style.display = 'block';
      setTimeout(async () => {
        try {
          const html2pdf = await lazyLoadHtml2Pdf();
          html2pdf()
            .set(options)
            .from(doc)
            .save()
            .then(() => {
              document.getElementById('pdf-header').style.display = 'none';
              document.getElementById('pdf-footer').style.display = 'none';
              doc = undefined;
              this.detailsOpened = false;
              this.loading = false;
            })
            .catch(error => {
              document.getElementById('pdf-header').style.display = 'none';
              document.getElementById('pdf-footer').style.display = 'none';
              this.detailsOpened = false;
              doc = undefined;
              this.loading = false;
            });
        } catch (error) {
          document.getElementById('pdf-header').style.display = 'none';
          document.getElementById('pdf-footer').style.display = 'none';
          this.detailsOpened = false;
          doc = undefined;
          this.loading = false;
        }
      }, 1000);
    },
  },
};
</script>

<template>
  <div
    id="indicators"
    class="row"
    v-if="showIndicators === true && toggles['dashboard.indicators.view']"
  >
    <SimpleDownloadCard
      :download="toggles['dashboard.reports.indicators']"
      :title="$t('dashboard.reports.indicators.title')"
      :show-tooltip="true"
      :description="$t('dashboard.reports.indicators.description')"
      :icon="'bi-file-earmark-pdf'"
      @download="exportToPDF"
      :can-download="toggles['dashboard.reports.indicators'] === true"
    ></SimpleDownloadCard>
    <Spinner :show="loading"></Spinner>
    <div id="indicators-component">
      <PDFHeader
        :show="toggles['dashboard.reports.indicators']"
        :title="$t('dashboard.reports.indicators.title')"
        :start-date="startDate"
        :end-date="endDate"
        :commerce="commerce"
      >
      </PDFHeader>

      <!-- Enhanced Summary Section -->
      <div class="dashboard-summary-section" v-if="!detailsOpened">
        <div class="summary-header">
          <h3 class="summary-title">
            <i class="bi bi-speedometer2"></i>
            {{ $t('dashboard.summary.title') || 'Resumen Ejecutivo' }}
          </h3>
          <p class="summary-subtitle">
            {{ $t('dashboard.summary.subtitle') || 'Métricas clave y proyecciones' }}
          </p>
        </div>

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
                  :class="n <= Math.round(summaryMetrics.rating.value) ? 'bi-star-fill' : 'bi-star'"
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
                {{ summaryMetrics.nps.value > 0 ? '+' : '' }}{{ summaryMetrics.nps.value }}
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
      <div class="dashboard-detailed-section">
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
            :icon="'bi-qr-code'"
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
            :icon="'bi-calendar2-check-fill'"
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
        <div>
          <div class="row">
            <div id="attention-time-avg" class="col">
              <SimpleCard
                :show="!!toggles['dashboard.attention-time-avg.view']"
                :data="calculatedMetrics['attention.created'].avgDuration"
                :title="$t('dashboard.items.attentions.2')"
                :show-tooltip="true"
                :description="$t('dashboard.seconds')"
                :icon="'bi-clock-history'"
                :icon-style-class="'green-icon'"
              >
              </SimpleCard>
            </div>
            <div id="attention-no-device" class="col">
              <SimpleCard
                :show="!!toggles['dashboard.attention-no-device.view']"
                :data="calculatedMetrics['attention.created'].noDevicePer || 0 + '%'"
                :subdata="calculatedMetrics['attention.created'].noDevice || 0"
                :title="$t('dashboard.items.attentions.5')"
                :show-tooltip="false"
                :icon="'bi-people-fill'"
                :icon-style-class="'orange-icon'"
              >
              </SimpleCard>
            </div>
          </div>
        </div>
        <div id="attention-queue">
          <SimpleCard
            :show="!!toggles['dashboard.attention-queue.view']"
            :data="calculatedMetrics['attention.created'].maxQueue"
            :subdata="calculatedMetrics['attention.created'].maxQueueCount"
            :title="$t('dashboard.items.attentions.4')"
            :show-tooltip="false"
            :icon="'bi-person-heart'"
            :icon-style-class="'red-icon'"
          >
          </SimpleCard>
        </div>
        <div id="attention-rating-avg">
          <DetailsCard
            :show="!!toggles['dashboard.attention-rating-avg.view']"
            :data="calculatedMetrics['survey.created'].avgRating || 0"
            :subdata="calculatedMetrics['survey.created'].count_rating || 0"
            :title="$t('dashboard.items.attentions.3')"
            :show-tooltip="true"
            :description="$t('dashboard.rating')"
            :icon="'bi-star-fill'"
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
            :data="calculatedMetrics['survey.created'].nps || 0"
            :subdata="calculatedMetrics['survey.created'].count_nps || 0"
            :title="$t('dashboard.items.attentions.24')"
            :show-tooltip="true"
            :description="$t('dashboard.nps.description')"
            :icon="'bi-megaphone-fill'"
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
            :icon="'bi-chat-heart-fill'"
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
            :show="
              !!toggles['dashboard.attention-collaborators.view'] &&
              calculatedMetrics['collaborators'].length > 0
            "
            :data="
              calculatedMetrics['collaborators']
                ? calculatedMetrics['collaborators'][0]?.name
                : 'No Data'
            "
            :subdata="
              calculatedMetrics['collaborators']
                ? calculatedMetrics['collaborators'][0]?.attention_counter
                : 0
            "
            :title="$t('dashboard.items.attentions.20')"
            :show-tooltip="false"
            :icon="'bi-trophy-fill'"
            :icon-style-class="'green-icon'"
            :details-opened="detailsOpened"
          >
            <template v-slot:details>
              <AttentionCollaboratorsDetails
                :show="
                  !!toggles['dashboard.attention-collaborators.view'] &&
                  calculatedMetrics['collaborators'].length > 0
                "
                :collaborators="calculatedMetrics['collaborators']"
                :limit="5"
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
            :icon="'bi-emoji-heart-eyes-fill'"
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
            :icon="'bi-chat-left-dots-fill'"
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
            :icon="'bi-send-check-fill'"
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
      </div>
      <PDFFooter :show="toggles['dashboard.reports.indicators']"></PDFFooter>
    </div>
  </div>
  <div v-if="showIndicators === true && !toggles['dashboard.indicators.view']">
    <Message
      :icon="'bi-graph-up-arrow'"
      :title="$t('dashboard.message.1.title')"
      :content="$t('dashboard.message.1.content')"
    />
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
  margin: 1.5rem 0.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
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
}

.summary-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
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
  gap: 0.75rem;
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
}

@media (max-width: 768px) {
  .dashboard-summary-section {
    margin: 1rem 0.25rem;
    padding: 1.25rem;
  }

  .summary-cards-grid {
    grid-template-columns: 1fr;
  }

  .summary-main-value {
    font-size: 1.75rem;
  }

  .summary-card {
    padding: 1.25rem;
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
}
</style>
