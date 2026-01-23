<script>
import Spinner from '../../common/Spinner.vue';
import Popper from 'vue3-popper';
import Message from '../../common/Message.vue';
import SimpleDownloadCard from '../../reports/SimpleDownloadCard.vue';
import PackageDetailsCard from '../common/PackageDetailsCard.vue';
import { getPackagesByClient } from '../../../application/services/package';
import { getAttentionsDetails } from '../../../application/services/query-stack';
import { getBookingsDetails } from '../../../application/services/query-stack';
import jsonToCsv from '../../../shared/utils/jsonToCsv';

const ACTIVE_STATUSES = ['ACTIVE', 'CONFIRMED', 'REQUESTED'];

export default {
  name: 'ClientPackagesManagement',
  components: {
    Message,
    SimpleDownloadCard,
    Spinner,
    Popper,
    PackageDetailsCard,
  },
  props: {
    showClientPackagesManagement: Boolean,
    toggles: Object,
    client: Object,
    commerce: Object,
    commerces: Array,
    queues: { type: Array, default: () => [] },
  },
  emits: ['open-attention-modal', 'open-payment-form'],
  data() {
    return {
      loading: false,
      allPackages: [],
      showFilterOptions: false,
      filterStatus: 'all',
      showLowSessions: false,
      showExpiringSoon: false,
      searchText: undefined,
      allAttentions: [],
      allBookings: [],
      loadingAttentions: false,
      loadingBookings: false,
    };
  },

  /* =========================
       COMPUTED (AQUÍ ESTÁ LA MAGIA)
       ========================= */
  computed: {
    filteredPackages() {
      let list = [...this.allPackages];

      if (this.filterStatus !== 'all') {
        if (this.filterStatus === 'active') {
          list = list.filter(p => ACTIVE_STATUSES.includes(p.status));
        } else {
          list = list.filter(p => p.status === this.filterStatus.toUpperCase());
        }
      }

      if (this.showLowSessions) {
        list = list.filter(p => (p.proceduresLeft || 0) > 0 && (p.proceduresLeft || 0) <= 3);
      }

      if (this.showExpiringSoon) {
        const now = new Date();
        list = list.filter(p => {
          if (!p.expireAt) return false;
          const days = (new Date(p.expireAt) - now) / (1000 * 60 * 60 * 24);
          return days > 0 && days <= 7;
        });
      }

      return list;
    },

    activePackages() {
      return this.filteredPackages.filter(p => ACTIVE_STATUSES.includes(p.status));
    },
    completedPackages() {
      return this.filteredPackages.filter(p => p.status === 'COMPLETED');
    },
    expiredPackages() {
      return this.filteredPackages.filter(p => p.status === 'EXPIRED');
    },
    cancelledPackages() {
      return this.filteredPackages.filter(p => p.status === 'CANCELLED');
    },

    activePackagesCount() {
      return this.allPackages.filter(p => ACTIVE_STATUSES.includes(p.status)).length;
    },
    lowSessionsCount() {
      return this.allPackages.filter(
        p => (p.proceduresLeft || 0) > 0 && (p.proceduresLeft || 0) <= 3
      ).length;
    },
    expiringSoonCount() {
      const now = new Date();
      return this.allPackages.filter(p => {
        if (!p.expireAt) return false;
        const days = (new Date(p.expireAt) - now) / (1000 * 60 * 60 * 24);
        return days > 0 && days <= 7;
      }).length;
    },
    completedPackagesCount() {
      return this.allPackages.filter(p => p.status === 'COMPLETED').length;
    },
    totalSessionsRemaining() {
      return this.allPackages
        .filter(p => ACTIVE_STATUSES.includes(p.status))
        .reduce((sum, p) => sum + (p.proceduresLeft || 0), 0);
    },
  },

  /* =========================
       METHODS
       ========================= */
  methods: {
    async refresh() {
      if (!this.commerce?.id || !this.client?.id) return;

      this.loading = true;
      try {
        // Load packages
        const res = await getPackagesByClient(this.commerce.id, this.client.id);

        this.allPackages = [
          ...(res?.active || []),
          ...(res?.completed || []),
          ...(res?.expired || []),
          ...(res?.cancelled || []),
        ];

        // Load attentions and bookings for all packages
        await this.loadAttentionsAndBookings();
      } catch (e) {
        console.error('[ClientPackagesManagement] Error', e);
        this.allPackages = [];
      } finally {
        this.loading = false;
      }
    },

    async loadAttentionsAndBookings() {
      if (!this.commerce?.id || !this.client?.id) return;

      // Load attentions
      try {
        this.loadingAttentions = true;
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }

        const attentions = await getAttentionsDetails(
          this.commerce.id,
          null, // from
          null, // to
          commerceIds,
          1, // page
          1000, // limit - get all attentions for this client
          undefined, // daysSinceType
          undefined, // daysSinceContacted
          undefined, // contactable
          undefined, // contacted
          undefined, // searchText
          undefined, // queueId
          undefined, // survey
          false, // asc
          undefined, // contactResultType
          undefined, // serviceId
          undefined, // stock
          undefined, // id
          undefined, // userId
          this.client?.id // clientId
        );
        this.allAttentions = attentions || [];
      } catch (error) {
        console.error('[ClientPackagesManagement] Error loading attentions:', error);
        this.allAttentions = [];
      } finally {
        this.loadingAttentions = false;
      }

      // Load bookings
      try {
        this.loadingBookings = true;
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }

        const bookings = await getBookingsDetails(
          this.commerce.id,
          null, // from
          null, // to
          commerceIds,
          1, // page
          1000, // limit - get all bookings for this client
          undefined, // searchText
          undefined, // queueId
          false, // asc
          undefined, // serviceId
          undefined, // status
          this.client?.id, // clientId
          undefined, // packageId - get all bookings
        );
        this.allBookings = bookings || [];
      } catch (error) {
        console.error('[ClientPackagesManagement] Error loading bookings:', error);
        this.allBookings = [];
      } finally {
        this.loadingBookings = false;
      }
    },

    clear() {
      this.filterStatus = 'all';
      this.showLowSessions = false;
      this.showExpiringSoon = false;
      this.searchText = undefined;
    },

    showFilters() {
      this.showFilterOptions = !this.showFilterOptions;
    },

    handlePackageUpdated() {
      // backend terminó → refresca
      setTimeout(this.refresh, 300);
    },
    handleOpenAttentionModal(data) {
      // Emit event to parent (ClientDetailsCard) to open attention modal
      this.$emit('open-attention-modal', data);
    },
    handleAttentionCreated(attention) {
      // When attention/booking is created, refresh packages to update sessions
      console.log(
        '[ClientPackagesManagement] Attention/booking created, refreshing packages:',
        attention,
      );
      setTimeout(this.refresh, 500);
    },

    exportToCSV() {
      if (!this.filteredPackages.length) return;
      const csv = jsonToCsv(this.filteredPackages);
      const blob = new Blob([csv]);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `packages-${this.commerce.tag}.csv`;
      a.click();
    },
    handleOpenPaymentForm(paymentData) {
      // Emitir evento para abrir PaymentForm con datos del paquete
      this.$emit('open-payment-form', paymentData);
    },
  },

  watch: {
    showClientPackagesManagement: {
      immediate: true,
      handler(val) {
        if (val && this.client?.id && this.commerce?.id) {
          this.refresh();
        }
      },
    },
  },
};
</script>

<template>
  <div>
    <div
      id="packages-management"
      class="row"
      v-if="
        showClientPackagesManagement === true &&
        (toggles === undefined || toggles['dashboard.packages-management.view'] !== false)
      "
    >
      <div class="col">
        <div id="package-management-component">
          <Spinner :show="loading"></Spinner>
          <div v-show="!loading" :key="`packages-${allPackages.length}`">
            <div>
              <!-- Intelligent Summary Cards -->
              <div class="row metric-card compact-row">
                <div class="col-12 col-md-3 compact-col">
                  <div class="package-summary-card active-card">
                    <div class="summary-card-header">
                      <i class="bi bi-check-circle-fill green-icon"></i>
                      <span class="summary-card-label">{{
                        $t('package.active') || 'Activos'
                      }}</span>
                    </div>
                    <div class="summary-card-value">{{ activePackagesCount }}</div>
                    <div class="summary-card-footer">
                      {{ totalSessionsRemaining }}
                      {{ $t('package.sessionsRemaining') || 'sesiones' }}
                    </div>
                  </div>
                </div>
                <div class="col-12 col-md-3 compact-col">
                  <div class="package-summary-card low-sessions-card" v-if="lowSessionsCount > 0">
                    <div class="summary-card-header">
                      <i class="bi bi-exclamation-triangle-fill yellow-icon"></i>
                      <span class="summary-card-label">{{
                        $t('package.lowSessions') || 'Sesiones Bajas'
                      }}</span>
                    </div>
                    <div class="summary-card-value">{{ lowSessionsCount }}</div>
                    <div class="summary-card-footer">
                      {{ $t('package.needAttention') || 'Requieren atención' }}
                    </div>
                  </div>
                </div>
                <div class="col-12 col-md-3 compact-col">
                  <div class="package-summary-card expiring-card" v-if="expiringSoonCount > 0">
                    <div class="summary-card-header">
                      <i class="bi bi-calendar-x-fill red-icon"></i>
                      <span class="summary-card-label">{{
                        $t('package.expiringSoon') || 'Por Vencer'
                      }}</span>
                    </div>
                    <div class="summary-card-value">{{ expiringSoonCount }}</div>
                    <div class="summary-card-footer">
                      {{ $t('package.within7Days') || 'En los próximos 7 días' }}
                    </div>
                  </div>
                </div>
                <div class="col-12 col-md-3 compact-col">
                  <div class="package-summary-card completed-card">
                    <div class="summary-card-header">
                      <i class="bi bi-check-circle-fill blue-icon"></i>
                      <span class="summary-card-label">{{
                        $t('package.completed') || 'Completados'
                      }}</span>
                    </div>
                    <div class="summary-card-value">{{ completedPackagesCount }}</div>
                    <div class="summary-card-footer">
                      {{ $t('package.finished') || 'Finalizados' }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Filters Section -->
              <div class="my-2 row metric-card">
                <div class="col-12 d-flex align-items-center">
                  <span class="metric-card-subtitle">
                    <span
                      class="form-check-label metric-keyword-subtitle mx-1"
                      @click="showFilters()"
                    >
                      <i class="bi bi-search"></i> {{ $t('dashboard.aditionalFilters') }}
                      <i
                        :class="`bi ${
                          showFilterOptions === true ? 'bi-chevron-up' : 'bi-chevron-down'
                        }`"
                      ></i>
                    </span>
                  </span>
                  <button
                    class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-1 mx-1"
                    @click="clear()"
                  >
                    <span><i class="bi bi-eraser-fill"></i></span>
                  </button>
                </div>
                <div v-if="showFilterOptions">
                  <!-- Status Filter -->
                  <div class="col-12 col-md my-1 filter-card">
                    <label class="metric-card-subtitle mx-2" for="select-status">
                      {{ $t('package.status') || 'Estado' }}
                    </label>
                    <select
                      class="btn btn-sm btn-light fw-bold text-dark select"
                      v-model="filterStatus"
                    >
                      <option value="all">{{ $t('package.all') || 'Todos' }}</option>
                      <option value="active">{{ $t('package.active') || 'Activos' }}</option>
                      <option value="completed">
                        {{ $t('package.completed') || 'Completados' }}
                      </option>
                      <option value="expired">{{ $t('package.expired') || 'Vencidos' }}</option>
                      <option value="cancelled">
                        {{ $t('package.cancelled') || 'Cancelados' }}
                      </option>
                    </select>
                  </div>

                  <!-- Quick Filters -->
                  <div class="col-12 col-md my-1 filter-card">
                    <label class="metric-card-subtitle mx-2">
                      {{ $t('package.quickFilters') || 'Filtros Rápidos' }}
                    </label>
                    <div class="quick-filters-container">
                      <div class="form-check form-switch">
                        <input
                          class="form-check-input"
                          type="checkbox"
                          id="lowSessionsFilter"
                          v-model="showLowSessions"
                        />
                        <label class="form-check-label" for="lowSessionsFilter">
                          <i class="bi bi-exclamation-triangle-fill yellow-icon"></i>
                          {{ $t('package.lowSessions') || 'Sesiones Bajas' }}
                          <span v-if="lowSessionsCount > 0" class="filter-count"
                            >({{ lowSessionsCount }})</span
                          >
                        </label>
                      </div>
                      <div class="form-check form-switch">
                        <input
                          class="form-check-input"
                          type="checkbox"
                          id="expiringSoonFilter"
                          v-model="showExpiringSoon"
                        />
                        <label class="form-check-label" for="expiringSoonFilter">
                          <i class="bi bi-calendar-x-fill red-icon"></i>
                          {{ $t('package.expiringSoon') || 'Por Vencer' }}
                          <span v-if="expiringSoonCount > 0" class="filter-count"
                            >({{ expiringSoonCount }})</span
                          >
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Results Count -->
              <div class="my-3 text-center">
                <span class="badge bg-secondary px-3 py-2 m-1"
                  >{{ $t('businessAdmin.listResult') || 'Resultados' }}
                  {{ filteredPackages.length }} (total: {{ allPackages.length }})</span
                >
              </div>

              <!-- Packages List - Grouped by Status -->
              <div v-if="filteredPackages && filteredPackages.length > 0">
                <!-- Active Packages Section -->
                <div
                  v-if="filterStatus === 'all' || filterStatus === 'active'"
                  class="package-group-section"
                >
                  <div
                    v-if="
                      filteredPackages.filter(
                        p =>
                          p.status === 'ACTIVE' ||
                          p.status === 'CONFIRMED' ||
                          p.status === 'REQUESTED'
                      ).length > 0
                    "
                    class="package-group-header"
                  >
                    <i class="bi bi-check-circle-fill green-icon"></i>
                    <span class="package-group-title">{{
                      $t('package.activePackages') || 'Paquetes Activos'
                    }}</span>
                    <span class="package-group-count">
                      {{
                        filteredPackages.filter(
                          p =>
                            p.status === 'ACTIVE' ||
                            p.status === 'CONFIRMED' ||
                            p.status === 'REQUESTED'
                        ).length
                      }}
                    </span>
                  </div>
                  <div
                    v-for="(pkg, index) in filteredPackages.filter(
                      p =>
                        p.status === 'ACTIVE' ||
                        p.status === 'CONFIRMED' ||
                        p.status === 'REQUESTED'
                    )"
                    :key="`active-${index}`"
                    class="row"
                  >
                    <PackageDetailsCard
                      :show="true"
                      :package-data="pkg"
                      :commerce="commerce"
                      :queues="queues"
                      @package-updated="handlePackageUpdated"
                      @refresh="refresh"
                      @open-attention-modal="handleOpenAttentionModal"
                      @open-payment-form="handleOpenPaymentForm"
                    ></PackageDetailsCard>
                  </div>
                </div>

                <!-- Completed Packages Section -->
                <div
                  v-if="filterStatus === 'all' || filterStatus === 'completed'"
                  class="package-group-section"
                >
                  <div
                    v-if="filteredPackages.filter(p => p.status === 'COMPLETED').length > 0"
                    class="package-group-header"
                  >
                    <i class="bi bi-check-circle-fill blue-icon"></i>
                    <span class="package-group-title">{{
                      $t('package.completedPackages') || 'Paquetes Completados'
                    }}</span>
                    <span class="package-group-count">
                      {{ filteredPackages.filter(p => p.status === 'COMPLETED').length }}
                    </span>
                  </div>
                  <div
                    v-for="(pkg, index) in filteredPackages.filter(p => p.status === 'COMPLETED')"
                    :key="`completed-${index}`"
                    class="row"
                  >
                    <PackageDetailsCard
                      :show="true"
                      :package-data="pkg"
                      :commerce="commerce"
                      :queues="queues"
                      @package-updated="handlePackageUpdated"
                      @refresh="refresh"
                      @open-attention-modal="handleOpenAttentionModal"
                      @open-payment-form="handleOpenPaymentForm"
                    ></PackageDetailsCard>
                  </div>
                </div>

                <!-- Expired Packages Section -->
                <div
                  v-if="filterStatus === 'all' || filterStatus === 'expired'"
                  class="package-group-section"
                >
                  <div
                    v-if="filteredPackages.filter(p => p.status === 'EXPIRED').length > 0"
                    class="package-group-header"
                  >
                    <i class="bi bi-calendar-x-fill red-icon"></i>
                    <span class="package-group-title">{{
                      $t('package.expiredPackages') || 'Paquetes Vencidos'
                    }}</span>
                    <span class="package-group-count">
                      {{ filteredPackages.filter(p => p.status === 'EXPIRED').length }}
                    </span>
                  </div>
                  <div
                    v-for="(pkg, index) in filteredPackages.filter(p => p.status === 'EXPIRED')"
                    :key="`expired-${index}`"
                    class="row"
                  >
                    <PackageDetailsCard
                      :show="true"
                      :package-data="pkg"
                      :commerce="commerce"
                      :queues="queues"
                      @package-updated="handlePackageUpdated"
                      @refresh="refresh"
                      @open-attention-modal="handleOpenAttentionModal"
                      @open-payment-form="handleOpenPaymentForm"
                    ></PackageDetailsCard>
                  </div>
                </div>

                <!-- Cancelled Packages Section -->
                <div
                  v-if="filterStatus === 'all' || filterStatus === 'cancelled'"
                  class="package-group-section"
                >
                  <div
                    v-if="filteredPackages.filter(p => p.status === 'CANCELLED').length > 0"
                    class="package-group-header"
                  >
                    <i class="bi bi-x-circle-fill red-icon"></i>
                    <span class="package-group-title">{{
                      $t('package.cancelledPackages') || 'Paquetes Cancelados'
                    }}</span>
                    <span class="package-group-count">
                      {{ filteredPackages.filter(p => p.status === 'CANCELLED').length }}
                    </span>
                  </div>
                  <div
                    v-for="(pkg, index) in filteredPackages.filter(p => p.status === 'CANCELLED')"
                    :key="`cancelled-${index}`"
                    class="row"
                  >
                    <PackageDetailsCard
                      :show="true"
                      :package-data="pkg"
                      :commerce="commerce"
                      :queues="queues"
                      @package-updated="handlePackageUpdated"
                      @refresh="refresh"
                      @open-attention-modal="handleOpenAttentionModal"
                      @open-payment-form="handleOpenPaymentForm"
                    ></PackageDetailsCard>
                  </div>
                </div>
              </div>
              <div v-else>
                <Message
                  :icon="'box'"
                  :title="$t('package.noPackages') || 'No hay paquetes'"
                  :content="
                    $t('package.noPackagesMessage') ||
                    'No se encontraron paquetes con los filtros seleccionados'
                  "
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="
        showClientPackagesManagement === true &&
        toggles &&
        toggles['dashboard.packages-management.view'] === false
      "
    >
      <Message
        :icon="'box'"
        :title="$t('dashboard.message.1.title') || 'Sin permisos'"
        :content="$t('dashboard.message.1.content') || 'No tienes permisos para ver esta sección'"
      />
    </div>
  </div>
</template>

<style scoped>
/* Inherit all styles from ClientBookingsManagement */
.metric-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}

.metric-card.compact-row {
  margin: 0.25rem 0.5rem;
  padding: 0.25rem;
}

.compact-col {
  padding: 0.125rem 0.25rem;
}

.filter-card {
  background-color: var(--color-background);
  padding-top: 0.2rem;
  padding-bottom: 0.2rem;
  margin: 0.2rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
}

.metric-card-subtitle {
  font-size: 0.8rem;
  font-weight: 500;
}

.metric-keyword-subtitle {
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
}

.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}

/* Package Summary Cards */
.package-summary-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  padding: 0.5rem 0.625rem;
  margin: 0;
  transition: all 0.2s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.package-summary-card:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(169, 169, 169, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.active-card {
  border-left: 3px solid #00c2cb;
}

.low-sessions-card {
  border-left: 3px solid #f9c322;
  animation: pulse-warning-border 2s ease-in-out infinite;
}

@keyframes pulse-warning-border {
  0%,
  100% {
    border-left-color: #f9c322;
  }
  50% {
    border-left-color: rgba(249, 195, 34, 0.5);
  }
}

.expiring-card {
  border-left: 3px solid #a52a2a;
}

.completed-card {
  border-left: 3px solid #004aad;
}

.summary-card-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
}

.summary-card-header i {
  font-size: 0.875rem;
}

.summary-card-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.2px;
}

.summary-card-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #000000;
  margin-bottom: 0.1875rem;
  line-height: 1.2;
}

.summary-card-footer {
  font-size: 0.625rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.2;
}

/* Package Group Sections */
.package-group-section {
  margin-bottom: 1.5rem;
}

.package-group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(245, 246, 247, 0.6);
  border-radius: 8px;
  margin-bottom: 0.75rem;
  border-left: 3px solid rgba(169, 169, 169, 0.3);
}

.package-group-header i {
  font-size: 1rem;
}

.package-group-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #000000;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex: 1;
}

.package-group-count {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.6);
  background: rgba(255, 255, 255, 0.8);
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
}

/* Quick Filters */
.quick-filters-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
}

.form-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-check-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  cursor: pointer;
}

.filter-count {
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 700;
}

/* Icon Colors */
.green-icon {
  color: var(--verde-tu);
}

.yellow-icon {
  color: var(--amarillo-star);
}

.red-icon {
  color: var(--rojo-warning);
}

.blue-icon {
  color: var(--azul-turno);
}
</style>
