<script>
import { ref, reactive, onBeforeMount, toRefs, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { getSpyMetrics } from '../../application/services/query-stack';
import { getPermissions } from '../../application/services/permissions';
import DefaultSkeleton from '../../components/skeletons/DefaultSkeleton.vue';

export default {
  name: 'SpySection',
  components: { DefaultSkeleton },
  props: {
    show: { type: Boolean, default: true },
    commerces: { type: Array, default: [] },
  },
  async setup(props) {
    const router = useRouter();

    const loading = ref(false);
    const loadingSpy = ref(false);
    const alertError = ref('');

    const { show, commerces } = toRefs(props);

    const state = reactive({
      commerces: [],
      startDate: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      togglesSpy: {},
      timeUpdate: 60,
      incomeTicker: 60,
      calculatedMetrics: {
        'attention.created': {},
        'survey.created': {},
        'notification.created': {},
        'booking.created': {},
        clients: {},
      },
    });

    onBeforeMount(async () => {
      try {
        if (show.value === true) {
          await getSpyMetric();
          state.togglesSpy = await getPermissions('dashboard');
          /*setInterval(async () => {
            if (state.incomeTicker > 0) {
              state.incomeTicker--;
            } else {
              state.incomeTicker = state.timeUpdate;
              await getSpyMetric();
            }
          }, 1000);*/
        }
      } catch (error) {
        alertError.value = error ? (error.response ? error.respose.status : 500) : 500;
        loading.value = false;
      }
    });

    const getSpyMetric = async () => {
      try {
        loadingSpy.value = true;
        const date = new Date().toISOString().slice(0, 10);
        const [year, month, day] = date.split('-');
        state.startDate = `${year}-${month}-01`;
        state.endDate = `${year}-${month}-${day}`;
        state.calculatedMetrics = await getCalculatedMetrics();
        alertError.value = '';
        loadingSpy.value = false;
      } catch (error) {
        alertError.value = error ? (error.response ? error.respose.status : 500) : 500;
        loadingSpy.value = false;
      }
    };

    const getCalculatedMetrics = async () => {
      if (commerces.value && commerces.value.length > 0) {
        const commercesId = commerces.value.map(commerce => commerce.id);
        const { calculatedMetrics } = await getSpyMetrics(
          commercesId,
          state.startDate,
          state.endDate
        );
        return calculatedMetrics;
      }
      return {};
    };

    const goToOption = async option => {
      try {
        loading.value = true;
        alertError.value = '';
        if (option) {
          router.push({ path: `/interno/negocio/${option}` });
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.message;
      }
    };

    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return { value: 0, type: 'neutral' };
      const change = ((current - previous) / previous) * 100;
      if (change > 5) return { value: Math.abs(change), type: 'up' };
      if (change < -5) return { value: Math.abs(change), type: 'down' };
      return { value: Math.abs(change), type: 'neutral' };
    };

    const getDaysInPeriod = () => {
      if (!state.startDate || !state.endDate) return 0;
      const start = new Date(state.startDate);
      const end = new Date(state.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    };

    const getTrendIcon = trend => {
      if (trend.type === 'up') return 'bi-arrow-up-circle-fill green-icon';
      if (trend.type === 'down') return 'bi-arrow-down-circle-fill red-icon';
      return 'bi-dash-circle blue-icon';
    };

    const getTrendClass = trend => {
      if (trend.type === 'up') return 'trend-up';
      if (trend.type === 'down') return 'trend-down';
      return 'trend-neutral';
    };

    const getNPSClass = value => {
      if (value >= 50) return 'nps-excellent';
      if (value >= 0) return 'nps-good';
      return 'nps-poor';
    };

    const getNPSLabel = value => {
      if (value >= 50) return 'Excelente';
      if (value >= 0) return 'Bueno';
      return 'Mejorable';
    };

    const getNPSDescription = value => {
      if (value >= 50) return 'Clientes muy satisfechos';
      if (value >= 0) return 'Clientes satisfechos';
      return 'Oportunidad de mejora';
    };

    const summaryMetrics = computed(() => {
      if (!state.calculatedMetrics || Object.keys(state.calculatedMetrics).length === 0) {
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

      const metrics = state.calculatedMetrics;
      const attention = metrics['attention.created'] || {};
      const booking = metrics['booking.created'] || {};
      const survey = metrics['survey.created'] || {};

      const pastPeriodNumber =
        (attention.pastPeriodAttentionNumber && attention.pastPeriodAttentionNumber.number) || 0;
      const attentionTrend = calculateTrend(attention.attentionNumber || 0, pastPeriodNumber);
      const bookingTrend = calculateTrend(
        booking.bookingNumber || 0,
        booking.pastPeriodBookingNumber || 0
      );
      const ratingTrend = calculateTrend(survey.avgRating || 0, survey.pastPeriodAvgRating || 0);

      const daysInPeriod = getDaysInPeriod();
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
    });

    watch(commerces, async () => {
      state.commerces = commerces.value;
      if (show.value === true) {
        await getSpyMetric();
      }
    });

    return {
      state,
      show,
      loading,
      loadingSpy,
      alertError,
      getSpyMetric,
      goToOption,
      summaryMetrics,
      getDaysInPeriod,
      getTrendIcon,
      getTrendClass,
      getNPSClass,
      getNPSLabel,
      getNPSDescription,
    };
  },
};
</script>
<template>
  <div>
    <div v-if="show">
      <div v-if="loadingSpy === true">
        <DefaultSkeleton> </DefaultSkeleton>
      </div>
      <div v-if="loading === false && loadingSpy === false">
        <div class="spy-title mt-2">
          <i class="bi bi-eye-fill mx-1"></i>
          <span> {{ $t('dashboard.spy') }}</span>
          <button
            class="btn btn-sm btn-dark rounded-pill mx-2 px-3 metric-filters"
            @click="getSpyMetric()"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
          </button>
          <div hidden>
            <span class="spy-update">{{ $t('dashboard.spyUpdate') }} </span>
            <span class="fw-bold spy-update">{{ state.incomeTicker }} </span>
            <span class="spy-update">
              {{ $t('dashboard.second') }} <i class="bi bi-clock"></i
            ></span>
          </div>
        </div>
        <hr />
        <div class="spy-subdetails">
          <span class="spy-subdetails">{{ $t('dashboard.spySubDetails') }}</span
          ><br />
          <span class="spy-details" @click="goToOption('dashboard')">
            {{ $t('dashboard.spyDetails') }}<i class="bi bi-arrow-up-right-circle mx-1"></i
          ></span>
        </div>

        <!-- Summary Cards Section -->
        <div class="summary-cards-grid">
          <!-- Attention Summary Card -->
          <div
            class="summary-card summary-card-primary"
            v-if="state.togglesSpy['dashboard.attention-number.view']"
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
            v-if="state.togglesSpy['dashboard.booking-number.view']"
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

          <!-- Rating Summary Card -->
          <div
            class="summary-card summary-card-warning"
            v-if="state.togglesSpy['dashboard.attention-rating-avg.view']"
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
            v-if="state.togglesSpy['dashboard.attention-nps-avg.view']"
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
              <div class="summary-nps-label">
                {{ getNPSLabel(summaryMetrics.nps.value) }}
              </div>
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
    </div>
  </div>
</template>
<style scoped>
.choose-attention {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1rem;
}
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.btn-light {
  --bs-btn-bg: #dcddde !important;
}
.spy-details {
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 0.75rem;
  cursor: pointer;
}
.spy-subdetails {
  font-size: 0.8rem;
  font-weight: 400;
  line-height: 1rem;
}
.spy-update {
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 0.75rem;
}
.spy-title {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1rem;
}

/* Mobile: Center spy section titles and details */
@media (max-width: 991px) {
  .spy-title {
    text-align: center !important;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
  }

  .spy-subdetails {
    text-align: center !important;
    display: block;
    width: 100%;
  }

  .spy-details {
    text-align: center !important;
    display: block;
    width: 100%;
  }
}

/* Desktop: Center spy section titles and details */
@media (min-width: 992px) {
  .spy-title {
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .spy-subdetails {
    text-align: center;
  }

  .spy-details {
    text-align: center;
    display: block;
  }
}

/* Summary Cards Styles */
.summary-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  margin: 1.5rem 0;
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
  .summary-cards-grid {
    grid-template-columns: 1fr;
    margin: 1rem 0;
  }

  .summary-main-value {
    font-size: 1.75rem;
  }

  .summary-card {
    padding: 1.25rem;
  }
}

@media (max-width: 576px) {
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
