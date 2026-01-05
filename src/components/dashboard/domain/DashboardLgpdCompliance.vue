<script>
import Spinner from '../../../components/common/Spinner.vue';
import SimpleCard from '../common/SimpleCard.vue';
import DetailsCard from '../common/DetailsCard.vue';
import Message from '../../../components/common/Message.vue';
import Alert from '../../../components/common/Alert.vue';
import {
  getConsentComplianceMetrics,
  getConsentNotificationMetrics,
} from '../../../application/services/consent';
import { globalStore } from '../../../stores';
import GaugeChart from './GaugeChart.vue';
import Popper from 'vue3-popper';

export default {
  name: 'DashboardLgpdCompliance',
  components: {
    Spinner,
    SimpleCard,
    DetailsCard,
    Message,
    Alert,
    GaugeChart,
    Popper,
  },
  props: {
    commerce: { type: Object, default: undefined },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
  },
  data() {
    return {
      loading: false,
      alertError: '',
      metrics: {
        totalClients: 0,
        clientsWithAllConsents: 0,
        clientsWithPendingConsents: 0,
        clientsWithExpiredConsents: 0,
        totalConsents: 0,
        grantedConsents: 0,
        pendingConsents: 0,
        deniedConsents: 0,
        expiredConsents: 0,
        revokedConsents: 0,
        complianceScore: 0,
        blockingConsents: 0,
      },
      notificationMetrics: {
        totalSent: 0,
        byChannel: {
          email: 0,
          whatsapp: 0,
          sms: 0,
          push: 0,
          inApp: 0,
        },
        byStatus: {
          sent: 0,
          delivered: 0,
          failed: 0,
          pending: 0,
        },
        successRate: 0,
        dailyBreakdown: [],
      },
      detailsOpened: false,
    };
  },
  computed: {
    store() {
      return globalStore();
    },
    compliancePercentage() {
      if (this.metrics.totalClients === 0) return 0;
      return Math.round((this.metrics.clientsWithAllConsents / this.metrics.totalClients) * 100);
    },
    pendingPercentage() {
      if (this.metrics.totalConsents === 0) return 0;
      return Math.round((this.metrics.pendingConsents / this.metrics.totalConsents) * 100);
    },
    expiredPercentage() {
      if (this.metrics.totalConsents === 0) return 0;
      return Math.round((this.metrics.expiredConsents / this.metrics.totalConsents) * 100);
    },
    complianceScoreColor() {
      if (this.metrics.complianceScore >= 90) return 'success';
      if (this.metrics.complianceScore >= 70) return 'warning';
      return 'danger';
    },
  },
  async mounted() {
    await this.loadMetrics();
    await this.loadNotificationMetrics();
  },
  watch: {
    commerce: {
      handler() {
        this.loadMetrics();
        this.loadNotificationMetrics();
      },
      deep: true,
    },
    startDate() {
      this.loadMetrics();
      this.loadNotificationMetrics();
    },
    endDate() {
      this.loadMetrics();
      this.loadNotificationMetrics();
    },
  },
  methods: {
    async loadMetrics() {
      if (!this.commerce || !this.commerce.id) {
        return;
      }
      try {
        this.loading = true;
        this.alertError = '';
        const response = await getConsentComplianceMetrics(
          this.commerce.id,
          this.startDate,
          this.endDate
        );
        this.metrics = response;
      } catch (error) {
        this.alertError =
          error.response?.data?.message ||
          error.message ||
          'Error al cargar métricas de compliance';
        console.error('Error loading compliance metrics:', error);
      } finally {
        this.loading = false;
      }
    },
    toggleDetails() {
      this.detailsOpened = !this.detailsOpened;
    },
    async loadNotificationMetrics() {
      if (!this.commerce || !this.commerce.id) {
        return;
      }
      try {
        const response = await getConsentNotificationMetrics(
          this.commerce.id,
          this.startDate,
          this.endDate
        );
        this.notificationMetrics = response;
      } catch (error) {
        console.error('Error loading notification metrics:', error);
        // No mostrar error al usuario, solo log
      }
    },
  },
};
</script>

<template>
  <div>
    <Spinner :show="loading"></Spinner>
    <Alert :show="!!alertError" :stack="alertError"></Alert>

    <div v-if="!commerce" class="control-box">
      <Message
        :title="$t('dashboard.lgpdCompliance.message.noCommerce.title')"
        :content="$t('dashboard.lgpdCompliance.message.noCommerce.content')"
      />
    </div>

    <div v-else class="control-box">
      <!-- Summary Cards -->
      <div class="row mb-3">
        <div class="col-12 col-md-6 col-lg-3 mb-3">
          <SimpleCard
            :title="$t('dashboard.lgpdCompliance.complianceScore')"
            :value="metrics.complianceScore"
            :suffix="'%'"
            :trend="null"
            :icon="'shield-check'"
            :color="complianceScoreColor"
          />
        </div>
        <div class="col-12 col-md-6 col-lg-3 mb-3">
          <SimpleCard
            :title="$t('dashboard.lgpdCompliance.clientsWithAllConsents')"
            :value="metrics.clientsWithAllConsents"
            :suffix="` / ${metrics.totalClients}`"
            :trend="null"
            :icon="'people-check'"
            :color="'success'"
          />
        </div>
        <div class="col-12 col-md-6 col-lg-3 mb-3">
          <SimpleCard
            :title="$t('dashboard.lgpdCompliance.pendingConsents')"
            :value="metrics.pendingConsents"
            :suffix="` / ${metrics.totalConsents}`"
            :trend="null"
            :icon="'clock-history'"
            :color="'warning'"
          />
        </div>
        <div class="col-12 col-md-6 col-lg-3 mb-3">
          <SimpleCard
            :title="$t('dashboard.lgpdCompliance.expiredConsents')"
            :value="metrics.expiredConsents"
            :suffix="` / ${metrics.totalConsents}`"
            :trend="null"
            :icon="'exclamation-triangle'"
            :color="'danger'"
          />
        </div>
      </div>

      <!-- Compliance Gauge -->
      <div class="row mb-3">
        <div class="col-12 col-md-6 mb-3">
          <DetailsCard
            :title="$t('dashboard.lgpdCompliance.complianceOverview')"
            :details-opened="detailsOpened"
            @toggle="toggleDetails"
          >
            <template #summary>
              <div class="d-flex align-items-center justify-content-between">
                <span>{{ $t('dashboard.lgpdCompliance.complianceScore') }}</span>
                <span
                  :class="`text-${complianceScoreColor}`"
                  style="font-size: 1.5rem; font-weight: bold"
                >
                  {{ metrics.complianceScore }}%
                </span>
              </div>
            </template>
            <template #details>
              <div class="row">
                <div class="col-12 col-md-6 mb-3">
                  <GaugeChart
                    :value="compliancePercentage"
                    :max="100"
                    :label="$t('dashboard.lgpdCompliance.clientsCompliant')"
                    :color="complianceScoreColor"
                  />
                </div>
                <div class="col-12 col-md-6">
                  <div class="metric-details">
                    <div class="metric-item">
                      <span class="metric-label"
                        >{{ $t('dashboard.lgpdCompliance.totalClients') }}:</span
                      >
                      <span class="metric-value">{{ metrics.totalClients }}</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-label"
                        >{{ $t('dashboard.lgpdCompliance.clientsWithAllConsents') }}:</span
                      >
                      <span class="metric-value text-success">{{
                        metrics.clientsWithAllConsents
                      }}</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-label"
                        >{{ $t('dashboard.lgpdCompliance.clientsWithPendingConsents') }}:</span
                      >
                      <span class="metric-value text-warning">{{
                        metrics.clientsWithPendingConsents
                      }}</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-label"
                        >{{ $t('dashboard.lgpdCompliance.clientsWithExpiredConsents') }}:</span
                      >
                      <span class="metric-value text-danger">{{
                        metrics.clientsWithExpiredConsents
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </DetailsCard>
        </div>
        <div class="col-12 col-md-6 mb-3">
          <DetailsCard
            :title="$t('dashboard.lgpdCompliance.consentsBreakdown')"
            :details-opened="false"
          >
            <template #summary>
              <div class="d-flex align-items-center justify-content-between">
                <span>{{ $t('dashboard.lgpdCompliance.totalConsents') }}</span>
                <span style="font-size: 1.5rem; font-weight: bold">{{
                  metrics.totalConsents
                }}</span>
              </div>
            </template>
            <template #details>
              <div class="metric-details">
                <div class="metric-item">
                  <span class="metric-label">
                    <i class="bi bi-check-circle text-success"></i>
                    {{ $t('dashboard.lgpdCompliance.grantedConsents') }}:
                  </span>
                  <span class="metric-value text-success">{{ metrics.grantedConsents }}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">
                    <i class="bi bi-clock-history text-warning"></i>
                    {{ $t('dashboard.lgpdCompliance.pendingConsents') }}:
                  </span>
                  <span class="metric-value text-warning">{{ metrics.pendingConsents }}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">
                    <i class="bi bi-x-circle text-danger"></i>
                    {{ $t('dashboard.lgpdCompliance.deniedConsents') }}:
                  </span>
                  <span class="metric-value text-danger">{{ metrics.deniedConsents }}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">
                    <i class="bi bi-exclamation-triangle text-danger"></i>
                    {{ $t('dashboard.lgpdCompliance.expiredConsents') }}:
                  </span>
                  <span class="metric-value text-danger">{{ metrics.expiredConsents }}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">
                    <i class="bi bi-arrow-counterclockwise text-secondary"></i>
                    {{ $t('dashboard.lgpdCompliance.revokedConsents') }}:
                  </span>
                  <span class="metric-value text-secondary">{{ metrics.revokedConsents }}</span>
                </div>
                <div v-if="metrics.blockingConsents > 0" class="metric-item">
                  <span class="metric-label">
                    <i class="bi bi-shield-exclamation text-danger"></i>
                    {{ $t('dashboard.lgpdCompliance.blockingConsents') }}:
                  </span>
                  <span class="metric-value text-danger">{{ metrics.blockingConsents }}</span>
                </div>
              </div>
            </template>
          </DetailsCard>
        </div>
      </div>

      <!-- Notification Metrics Section -->
      <div class="row mb-3">
        <div class="col-12">
          <DetailsCard
            :title="$t('dashboard.lgpdCompliance.notificationMetrics.title')"
            :details-opened="false"
          >
            <template #summary>
              <div class="d-flex align-items-center justify-content-between">
                <span>{{ $t('dashboard.lgpdCompliance.notificationMetrics.totalSent') }}</span>
                <span style="font-size: 1.5rem; font-weight: bold">{{
                  notificationMetrics.totalSent || 0
                }}</span>
              </div>
            </template>
            <template #details>
              <div class="metric-details">
                <div class="row mb-3">
                  <div class="col-12 col-md-6">
                    <h6 class="mb-2">
                      {{ $t('dashboard.lgpdCompliance.notificationMetrics.byChannel') }}
                    </h6>
                    <div class="metric-item">
                      <span class="metric-label">
                        <i class="bi bi-envelope text-primary"></i>
                        {{ $t('dashboard.lgpdCompliance.notificationMetrics.email') }}:
                      </span>
                      <span class="metric-value">{{
                        notificationMetrics.byChannel?.email || 0
                      }}</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-label">
                        <i class="bi bi-whatsapp text-success"></i>
                        {{ $t('dashboard.lgpdCompliance.notificationMetrics.whatsapp') }}:
                      </span>
                      <span class="metric-value">{{
                        notificationMetrics.byChannel?.whatsapp || 0
                      }}</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-label">
                        <i class="bi bi-chat-dots text-info"></i>
                        {{ $t('dashboard.lgpdCompliance.notificationMetrics.sms') }}:
                      </span>
                      <span class="metric-value">{{
                        notificationMetrics.byChannel?.sms || 0
                      }}</span>
                    </div>
                  </div>
                  <div class="col-12 col-md-6">
                    <h6 class="mb-2">
                      {{ $t('dashboard.lgpdCompliance.notificationMetrics.byStatus') }}
                    </h6>
                    <div class="metric-item">
                      <span class="metric-label">
                        <i class="bi bi-check-circle text-success"></i>
                        {{ $t('dashboard.lgpdCompliance.notificationMetrics.sent') }}:
                      </span>
                      <span class="metric-value text-success">{{
                        notificationMetrics.byStatus?.sent || 0
                      }}</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-label">
                        <i class="bi bi-envelope-check text-primary"></i>
                        {{ $t('dashboard.lgpdCompliance.notificationMetrics.delivered') }}:
                      </span>
                      <span class="metric-value text-primary">{{
                        notificationMetrics.byStatus?.delivered || 0
                      }}</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-label">
                        <i class="bi bi-exclamation-triangle text-warning"></i>
                        {{ $t('dashboard.lgpdCompliance.notificationMetrics.pending') }}:
                      </span>
                      <span class="metric-value text-warning">{{
                        notificationMetrics.byStatus?.pending || 0
                      }}</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-label">
                        <i class="bi bi-x-circle text-danger"></i>
                        {{ $t('dashboard.lgpdCompliance.notificationMetrics.failed') }}:
                      </span>
                      <span class="metric-value text-danger">{{
                        notificationMetrics.byStatus?.failed || 0
                      }}</span>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-12">
                    <div class="metric-item">
                      <span class="metric-label">
                        <i class="bi bi-graph-up text-success"></i>
                        {{ $t('dashboard.lgpdCompliance.notificationMetrics.successRate') }}:
                      </span>
                      <span class="metric-value text-success"
                        >{{ notificationMetrics.successRate || 0 }}%</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </DetailsCard>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-details {
  padding: 1rem 0;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e9ecef;
}

.metric-item:last-child {
  border-bottom: none;
}

.metric-label {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.metric-value {
  font-weight: bold;
  font-size: 1.1rem;
}
</style>
