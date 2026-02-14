<script>
import Spinner from '../../common/Spinner.vue';
import Popper from 'vue3-popper';
import Message from '../../common/Message.vue';
import SimpleDownloadCard from '../../reports/SimpleDownloadCard.vue';
import AttentionDetailsCard from '../../clients/common/AttentionDetailsCard.vue';
import AttentionDetailsModal from '../../attentions/common/AttentionDetailsModal.vue';
import { getAttentionsDetails } from '../../../application/services/query-stack';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { DateModel } from '../../../shared/utils/date.model';
import { ATTENTION_STATUS } from '../../../shared/constants';

export default {
  name: 'ClientAttentionsManagement',
  components: {
    Message,
    SimpleDownloadCard,
    Spinner,
    Popper,
    AttentionDetailsCard,
    AttentionDetailsModal,
  },
  data() {
    return {
      ATTENTION_STATUS, // Expose constant to template
      loading: false,
      counter: 0,
      attentions: [],
      newAttentions: [],
      clientIn: [],
      totalPages: 0,
      daysSinceType: undefined,
      survey: undefined,
      asc: false,
      showFilterOptions: false,
      searchText: undefined,
      queueId: undefined,
      serviceId: undefined,
      status: undefined,
      page: 1,
      limits: [10, 20, 50, 100],
      limit: 10,
      startDate: undefined,
      endDate: undefined,
      showAttentionModal: false,
      selectedAttention: undefined,
      attentionsLoaded: false, // Flag to track if attentions have been loaded
    };
  },
  props: {
    showClientAttentionsManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    client: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    queues: { type: Array, default: undefined },
    services: { type: Array, default: undefined },
    attentionsIn: { type: Array, default: undefined },
  },
  methods: {
    async refresh(force = false) {
      // Don't refresh if already loaded and not forcing (unless filters changed)
      if (this.attentionsLoaded && !force && this.attentions && this.attentions.length > 0) {
        return;
      }
      try {
        this.loading = true;
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        if (this.client && (this.client.userIdNumber || this.client.userEmail)) {
          this.searchText = this.client.userIdNumber || this.client.userEmail;
        }
        this.newAttentions = await getAttentionsDetails(
          this.commerce.id,
          this.startDate,
          this.endDate,
          commerceIds,
          this.page,
          this.limit,
          this.daysSinceType,
          undefined,
          undefined,
          undefined,
          this.searchText,
          this.queueId,
          this.survey,
          this.asc,
          undefined,
          this.serviceId,
          undefined,
          undefined, // id - not used
          undefined, // userId - not used when filtering by clientId
          this.client?.id, // ✅ Pass clientId to filter by client (this is the client ID from query-stack)
          this.status
        );
        this.updatePaginationData();
        this.attentionsLoaded = true; // Mark as loaded
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async setPage(pageIn) {
      this.page = pageIn;
      // Don't call refresh here - the page watcher will handle it
    },
    async clear() {
      this.daysSinceType = undefined;
      this.survey = undefined;
      this.asc = true;
      this.searchText = undefined;
      this.queueId = undefined;
      this.serviceId = undefined;
      this.status = undefined;
      this.page = 1;
      this.limit = 10;
      this.startDate = undefined;
      this.endDate = undefined;
      await this.refresh();
    },
    async checkSurvey(event) {
      if (event.target.checked) {
        this.survey = true;
      } else {
        this.survey = false;
      }
    },
    async checkAsc(event) {
      if (event.target.checked) {
        this.asc = true;
      } else {
        this.asc = false;
      }
    },
    updatePaginationData() {
      if (this.attentions && this.attentions.length > 0) {
        const { counter } = this.attentions[0];
        this.counter = counter;
        const total = counter / this.limit;
        const totalB = Math.trunc(total);
        this.totalPages = totalB <= 0 ? 1 : counter % this.limit === 0 ? totalB : totalB + 1;
      } else {
        this.counter = 0;
        this.totalPages = 0;
      }
    },
    showFilters() {
      this.showFilterOptions = !this.showFilterOptions;
    },
    openAttentionModal(attention) {
      this.selectedAttention = attention;
      this.showAttentionModal = true;
    },
    closeAttentionModal() {
      this.showAttentionModal = false;
      this.selectedAttention = undefined;
    },
    async handleAttentionUpdated() {
      await this.refresh(true); // Force refresh after updating attention
      this.closeAttentionModal();
    },
    async exportToCSV() {
      try {
        this.loading = true;
        let csvAsBlob = [];
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        if (this.client && (this.client.userIdNumber || this.client.userEmail)) {
          this.searchText = this.client.userIdNumber || this.client.userEmail;
        }
        const result = await getAttentionsDetails(
          this.commerce.id,
          this.startDate,
          this.endDate,
          commerceIds,
          undefined,
          undefined,
          this.daysSinceType,
          undefined,
          undefined,
          undefined,
          this.searchText,
          this.queueId,
          this.survey,
          this.asc,
          undefined,
          this.serviceId,
          undefined,
          undefined,
          undefined,
          this.client?.id,
          this.status
        );
        if (result && result.length > 0) {
          csvAsBlob = jsonToCsv(result);
        }
        const blobURL = URL.createObjectURL(new Blob([csvAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `attentions-details-${this.commerce.tag}-${this.startDate}-${this.endDate}.csv`;
        a.href = blobURL;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async getToday() {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      this.startDate = `${year}-${month}-${day}`;
      this.endDate = `${year}-${month}-${day}`;
      await this.refresh();
    },
    async getCurrentMonth() {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      this.startDate = `${year}-${month}-01`;
      this.endDate = `${year}-${month}-${day}`;
      await this.refresh();
    },
    async getLastMonth() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(1).toString();
      this.endDate = new DateModel(this.startDate).endOfMonth().toString();
      await this.refresh();
    },
    async getLastThreeMonths() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(3).toString();
      this.endDate = new DateModel(date).substractMonths(1).endOfMonth().toString();
      await this.refresh();
    },
    getPackageColor(packageId) {
      // Generate a consistent color based on packageId
      if (!packageId) return null;
      let hash = 0;
      for (let i = 0; i < packageId.length; i++) {
        hash = packageId.charCodeAt(i) + ((hash << 5) - hash);
      }
      // Generate colors in a pleasant palette (pastels)
      const colors = [
        { bg: 'rgba(74, 144, 226, 0.12)', border: '#4a90e2', accent: '#4a90e2' }, // Blue
        { bg: 'rgba(0, 194, 203, 0.12)', border: '#00c2cb', accent: '#00c2cb' }, // Cyan
        { bg: 'rgba(108, 99, 255, 0.12)', border: '#6c63ff', accent: '#6c63ff' }, // Purple
        { bg: 'rgba(255, 159, 64, 0.12)', border: '#ff9f40', accent: '#ff9f40' }, // Orange
        { bg: 'rgba(255, 107, 107, 0.12)', border: '#ff6b6b', accent: '#ff6b6b' }, // Red
        { bg: 'rgba(72, 187, 120, 0.12)', border: '#48bb78', accent: '#48bb78' }, // Green
        { bg: 'rgba(237, 137, 54, 0.12)', border: '#ed8936', accent: '#ed8936' }, // Orange-alt
        { bg: 'rgba(129, 140, 248, 0.12)', border: '#818cf8', accent: '#818cf8' }, // Indigo
      ];
      const index = Math.abs(hash) % colors.length;
      return colors[index];
    },
  },
  computed: {
    groupedAttentions() {
      // Group attentions by packageId
      const grouped = {};
      const withoutPackage = [];

      this.attentions.forEach(attention => {
        if (attention.packageId) {
          const packageId = attention.packageId;
          if (!grouped[packageId]) {
            grouped[packageId] = {
              packageId,
              packageName: attention.packageName || 'Paquete',
              packageProceduresTotalNumber: attention.packageProceduresTotalNumber || 0,
              attentions: [],
            };
          }
          grouped[packageId].attentions.push(attention);
        } else {
          withoutPackage.push(attention);
        }
      });

      // Sort attentions within each package by procedure number
      Object.keys(grouped).forEach(packageId => {
        grouped[packageId].attentions.sort((a, b) => {
          const numA = a.packageProcedureNumber || 0;
          const numB = b.packageProcedureNumber || 0;
          return numA - numB;
        });
      });

      // Convert to array format for template
      const groups = Object.values(grouped).map(group => ({
        ...group,
        color: this.getPackageColor(group.packageId),
      }));

      return { groups, withoutPackage };
    },
    changeData() {
      const { page, daysSinceType, survey, asc, queueId, limit, serviceId, status } = this;
      return {
        page,
        daysSinceType,
        survey,
        asc,
        queueId,
        limit,
        serviceId,
        status,
      };
    },
  },
  watch: {
    limit: {
      immediate: false,
      async handler(newLimit, oldLimit) {
        if (oldLimit !== undefined && newLimit !== oldLimit) {
          this.page = 1;
          this.attentionsLoaded = false;
          await this.refresh(true);
        }
      },
    },
    page: {
      immediate: false,
      async handler(newPage, oldPage) {
        if (oldPage !== undefined && newPage !== oldPage && this.attentionsLoaded) {
          await this.refresh(true);
        }
      },
    },
    changeData: {
      immediate: false, // Don't trigger on mount - attentions load lazily when modal opens
      deep: true,
      async handler(newData, oldData) {
        // Only refresh if oldData exists (not initial mount) and something actually changed
        if (
          oldData &&
          newData &&
          (oldData.daysSinceType !== newData.daysSinceType ||
            oldData.survey !== newData.survey ||
            oldData.asc !== newData.asc ||
            oldData.queueId !== newData.queueId ||
            oldData.serviceId !== newData.serviceId ||
            oldData.status !== newData.status)
        ) {
          this.page = 1;
          this.attentionsLoaded = false; // Reset flag when filters change
          await this.refresh(true); // Force refresh when filters change
        }
      },
    },
    attentionsIn: {
      immediate: true,
      deep: true,
      async handler() {
        this.attentions = this.attentionsIn;
        this.updatePaginationData();
      },
    },
    newAttentions: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.newAttentions) {
          this.attentions = this.newAttentions;
          this.updatePaginationData();
        }
      },
    },
  },
  mounted() {
    // Don't load attentions on mount - wait until modal is actually opened (lazy loading)
    // This prevents unnecessary API calls when the component is mounted but not visible
    // Attentions will be loaded when the modal is shown via the event listener in ClientDetailsCard
  },
};
</script>

<template>
  <div
    id="attentions-management"
    class="row"
    v-if="
      showClientAttentionsManagement === true &&
      toggles &&
      toggles['dashboard.attentions-management.view']
    "
  >
    <div class="col">
      <div id="attention-management-component">
        <Spinner :show="loading"></Spinner>
        <div v-if="!loading">
          <div>
            <div class="my-2 row metric-card">
              <div class="col-12">
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
                <div class="row my-1">
                  <div class="col-3">
                    <button
                      class="btn btn-dark rounded-pill px-2 metric-filters"
                      @click="getToday()"
                      :disabled="loading"
                    >
                      {{ $t('dashboard.today') }}
                    </button>
                  </div>
                  <div class="col-3">
                    <button
                      class="btn btn-dark rounded-pill px-2 metric-filters"
                      @click="getCurrentMonth()"
                      :disabled="loading"
                    >
                      {{ $t('dashboard.thisMonth') }}
                    </button>
                  </div>
                  <div class="col-3">
                    <button
                      class="btn btn-dark rounded-pill px-2 metric-filters"
                      @click="getLastMonth()"
                      :disabled="loading"
                    >
                      {{ $t('dashboard.lastMonth') }}
                    </button>
                  </div>
                  <div class="col-3">
                    <button
                      class="btn btn-dark rounded-pill px-2 metric-filters"
                      @click="getLastThreeMonths()"
                      :disabled="loading"
                    >
                      {{ $t('dashboard.lastThreeMonths') }}
                    </button>
                  </div>
                </div>
                <div class="m-1">
                  <div class="row">
                    <div class="col-5">
                      <input
                        id="startDate"
                        class="form-control metric-controls"
                        type="date"
                        v-model="startDate"
                      />
                    </div>
                    <div class="col-5">
                      <input
                        id="endDate"
                        class="form-control metric-controls"
                        type="date"
                        v-model="endDate"
                      />
                    </div>
                    <div class="col-2">
                      <button
                        class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                        @click="refresh()"
                      >
                        <span><i class="bi bi-search"></i></span>
                      </button>
                    </div>
                  </div>
                </div>
                <div class="col-12 col-md my-1 filter-card" v-if="queues && queues.length > 1">
                  <label class="metric-card-subtitle mx-2" for="select-queue">
                    {{ $t('dashboard.queue') }}
                  </label>
                  <select class="btn btn-sm btn-light fw-bold text-dark select" v-model="queueId">
                    <option
                      v-for="queue in queues"
                      :key="queue.name"
                      :value="queue.id"
                      id="select-queue"
                    >
                      {{ queue.name }}
                    </option>
                  </select>
                </div>
                <div class="col-12 col-md my-1 filter-card" v-if="services && services.length > 1">
                  <label class="metric-card-subtitle mx-2" for="select-queue">
                    {{ $t('dashboard.service') }}
                  </label>
                  <select class="btn btn-sm btn-light fw-bold text-dark select" v-model="serviceId">
                    <option
                      v-for="service in services"
                      :key="service.name"
                      :value="service.id"
                      id="select-queue"
                    >
                      {{ service.name }}
                    </option>
                  </select>
                </div>
                <div class="col-12 col-md my-1 filter-card">
                  <label class="metric-card-subtitle mx-2" for="select-status">
                    {{ $t('dashboard.status') || 'Estado' }}:
                  </label>
                  <select
                    class="btn btn-sm btn-light fw-bold text-dark select"
                    v-model="status"
                    id="select-status"
                  >
                    <option :value="undefined">{{ $t('dashboard.all') || 'Todos' }}</option>
                    <option :value="ATTENTION_STATUS.PENDING">
                      {{ $t('dashboard.attentionStatus.pending') || 'Pendiente' }}
                    </option>
                    <option :value="ATTENTION_STATUS.PROCESSING">
                      {{ $t('dashboard.attentionStatus.processing') || 'En Proceso' }}
                    </option>
                    <option :value="ATTENTION_STATUS.TERMINATED">
                      {{ $t('dashboard.attentionStatus.terminated') || 'Terminado' }}
                    </option>
                    <option :value="ATTENTION_STATUS.CANCELLED">
                      {{ $t('dashboard.attentionStatus.cancelled') || 'Cancelado' }}
                    </option>
                    <option :value="ATTENTION_STATUS.USER_CANCELLED">
                      {{ $t('dashboard.attentionStatus.userCancelled') || 'Cancelado por Usuario' }}
                    </option>
                    <option :value="ATTENTION_STATUS.RATED">
                      {{ $t('dashboard.attentionStatus.rated') || 'Calificado' }}
                    </option>
                  </select>
                </div>
                <div class="col-12 col-md my-1 filter-card">
                  <input
                    type="radio"
                    class="btn btn-check btn-sm"
                    v-model="daysSinceType"
                    value="EARLY"
                    name="daysSince-type"
                    id="early-since"
                    autocomplete="off"
                  />
                  <label class="btn" for="early-since">
                    <i :class="`bi bi-qr-code green-icon`"></i>
                  </label>
                  <input
                    type="radio"
                    class="btn btn-check btn-sm"
                    v-model="daysSinceType"
                    value="MEDIUM"
                    name="daysSince-type"
                    id="medium-since"
                    autocomplete="off"
                  />
                  <label class="btn" for="medium-since">
                    <i :class="`bi bi-qr-code yellow-icon`"></i>
                  </label>
                  <input
                    type="radio"
                    class="btn btn-check btn-sm"
                    v-model="daysSinceType"
                    value="LATE"
                    name="daysSince-type"
                    id="late-since"
                    autocomplete="off"
                  />
                  <label class="btn" for="late-since">
                    <i :class="`bi bi-qr-code red-icon`"></i>
                  </label>
                  <Popper
                    v-if="true"
                    :class="'dark'"
                    arrow
                    disable-click-away
                    :content="$t(`dashboard.tracing.filters.attention`)"
                  >
                    <i class="bi bi-info-circle-fill h7 m-2"></i>
                  </Popper>
                </div>
                <div class="row">
                  <div class="col-12 col-md-6">
                    <div class="form-check form-switch centered">
                      <input
                        class="form-check-input m-1"
                        :class="survey === false ? 'bg-danger' : ''"
                        type="checkbox"
                        name="survey"
                        id="survey"
                        v-model="survey"
                        @click="checkSurvey($event)"
                      />
                      <label class="form-check-label metric-card-subtitle" for="survey">{{
                        $t('dashboard.survey')
                      }}</label>
                    </div>
                  </div>
                  <div class="col-12 col-md-6">
                    <div class="form-check form-switch centered">
                      <input
                        class="form-check-input m-1"
                        :class="asc === false ? 'bg-danger' : ''"
                        type="checkbox"
                        name="asc"
                        id="asc"
                        v-model="asc"
                        @click="checkAsc($event)"
                      />
                      <label class="form-check-label metric-card-subtitle" for="asc">{{
                        asc ? $t('dashboard.asc') : $t('dashboard.desc')
                      }}</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Refresh Button -->
            <div class="my-3 d-flex align-items-center justify-content-end">
              <button
                @click="refresh"
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                :disabled="loading"
              >
                <i class="bi bi-arrow-clockwise"></i> Pesquisar
              </button>
            </div>

            <div class="my-3 text-center">
              <span class="badge bg-secondary px-3 py-2 m-1"
                >{{ $t('businessAdmin.listResult') }} {{ this.counter }}
              </span>
              <span class="badge bg-secondary px-3 py-2 m-1">
                {{ $t('page') }} {{ this.page }} {{ $t('of') }} {{ this.totalPages }}
              </span>
              <select class="btn btn-sm btn-light fw-bold text-dark select mx-1" v-model="limit">
                <option v-for="lim in limits" :key="lim" :value="lim" id="select-queue">
                  {{ lim }}
                </option>
              </select>
            </div>
            <div class="centered mt-2">
              <nav>
                <ul class="pagination">
                  <li class="page-item">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                      aria-label="First"
                      @click="setPage(1)"
                      :disabled="page === 1 || totalPages === 0"
                    >
                      <span aria-hidden="true"><i class="bi bi-arrow-bar-left"></i></span>
                    </button>
                  </li>
                  <li class="page-item">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                      aria-label="Previous"
                      @click="setPage(page - 1)"
                      :disabled="page === 1 || totalPages === 0"
                    >
                      <span aria-hidden="true">&laquo;</span>
                    </button>
                  </li>
                  <li>
                    <select
                      class="btn btn-md btn-light fw-bold text-dark select mx-1"
                      v-model="page"
                      :disabled="totalPages === 0"
                    >
                      <option v-for="pag in totalPages" :key="pag" :value="pag" id="select-queue">
                        {{ pag }}
                      </option>
                    </select>
                  </li>
                  <li class="page-item">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                      aria-label="Next"
                      @click="setPage(page + 1)"
                      :disabled="page === totalPages || totalPages === 0"
                    >
                      <span aria-hidden="true">&raquo;</span>
                    </button>
                  </li>
                  <li class="page-item">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                      aria-label="First"
                      @click="setPage(totalPages)"
                      :disabled="page === totalPages || totalPages === 0"
                    >
                      <span aria-hidden="true"><i class="bi bi-arrow-bar-right"></i></span>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
            <div v-if="attentions && attentions.length > 0">
              <!-- Grouped by Package -->
              <div
                v-for="group in groupedAttentions.groups"
                :key="`package-group-${group.packageId}`"
                class="package-attentions-group"
                :style="`--package-color: ${group.color.accent}; --package-bg: ${group.color.bg};`"
              >
                <!-- Package Header -->
                <div class="package-group-header">
                  <div
                    class="package-group-indicator"
                    :style="`background-color: ${group.color.accent};`"
                  ></div>
                  <div class="package-group-info">
                    <div class="package-group-title">
                      <i class="bi bi-box-seam-fill package-icon"></i>
                      <span class="package-name">{{ group.packageName }}</span>
                      <span class="package-sessions-count">
                        <span v-if="group.packageProceduresTotalNumber > 0">
                          ({{ group.attentions.length }} / {{ group.packageProceduresTotalNumber }}
                          {{ $t('dashboard.attentions') || 'sesiones' }})
                        </span>
                        <span v-else>
                          ({{ group.attentions.length }}
                          {{ $t('dashboard.attentions') || 'sesiones' }})
                        </span>
                      </span>
                    </div>
                    <div class="package-group-progress">
                      <div class="package-progress-bar">
                        <div
                          class="package-progress-fill"
                          :style="`width: ${
                            (group.attentions.length /
                              (group.packageProceduresTotalNumber || group.attentions.length)) *
                            100
                          }%; background-color: ${group.color.accent};`"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Package Attentions -->
                <div class="package-attentions-list">
                  <div
                    class="row attention-row-with-package"
                    v-for="(attention, index) in group.attentions"
                    :key="`package-${group.packageId}-attention-${index}`"
                  >
                    <AttentionDetailsCard
                      :show="true"
                      :attention="attention"
                      :commerce="commerce"
                      :package-color="group.color"
                      @open-modal="openAttentionModal"
                    >
                    </AttentionDetailsCard>
                  </div>
                </div>
              </div>

              <!-- Attentions without Package -->
              <div
                v-if="groupedAttentions.withoutPackage.length > 0"
                class="attentions-without-package"
              >
                <div
                  class="row"
                  v-for="(attention, index) in groupedAttentions.withoutPackage"
                  :key="`no-package-attention-${index}`"
                >
                  <AttentionDetailsCard
                    :show="true"
                    :attention="attention"
                    :commerce="commerce"
                    @open-modal="openAttentionModal"
                  >
                  </AttentionDetailsCard>
                </div>
              </div>
            </div>
            <div v-else>
              <Message
                :icon="'graph-up-arrow'"
                :title="$t('dashboard.message.2.title')"
                :content="$t('dashboard.message.2.content')"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="
        showClientAttentionsManagement === true &&
        (!toggles || !toggles['dashboard.attentions-management.view'])
      "
    >
      <Message
        :icon="'graph-up-arrow'"
        :title="$t('dashboard.message.1.title')"
        :content="$t('dashboard.message.1.content')"
      />
    </div>
    <!-- Attention Details Modal -->
    <AttentionDetailsModal
      :show="showAttentionModal"
      :attention="selectedAttention"
      :commerce="commerce"
      :queues="queues"
      :toggles="toggles"
      @close="closeAttentionModal"
      @attention-updated="handleAttentionUpdated"
    />
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
}
.filter-card {
  background-color: var(--color-background);
  padding-top: 0.2rem;
  padding-bottom: 0.2rem;
  margin: 0.2rem;
  border-radius: 0.5rem;
}
.metric-card-title {
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 0.8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.metric-card-comment {
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 0.9rem;
}
.metric-card-number {
  font-size: 1.2rem;
  font-weight: 700;
}
.metric-keyword-tag {
  font-size: 0.6rem;
  font-weight: 400;
  cursor: pointer;
}
.metric-keyword-tag-selected {
  font-size: 0.6rem;
  font-weight: 400;
  background-color: var(--azul-es) !important;
}
.metric-keyword-tag:hover {
  font-size: 0.6rem;
  font-weight: 400;
  cursor: pointer;
  background-color: var(--azul-es) !important;
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

/* Package Grouping Styles */
.package-attentions-group {
  margin-bottom: 1.5rem;
  position: relative;
}

.package-group-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  background: var(--package-bg, rgba(74, 144, 226, 0.08));
  border-radius: 8px;
  border-left: 4px solid var(--package-color, #4a90e2);
  transition: all 0.2s ease;
}

.package-group-header:hover {
  background: var(--package-bg, rgba(74, 144, 226, 0.15));
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.package-group-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
  animation: packagePulse 2s ease-in-out infinite;
}

@keyframes packagePulse {
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

.package-group-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.package-group-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.8);
  flex-wrap: wrap;
}

.package-icon {
  color: var(--package-color, #4a90e2);
  font-size: 1rem;
}

.package-name {
  color: var(--package-color, #4a90e2);
  font-weight: 700;
}

.package-sessions-count {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
  margin-left: 0.25rem;
}

.package-group-progress {
  width: 100%;
}

.package-progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 9999px;
  overflow: hidden;
  position: relative;
}

.package-progress-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.5s ease;
}

.package-attentions-list {
  margin-left: 1rem;
  padding-left: 1rem;
  border-left: 2px dashed var(--package-color, rgba(74, 144, 226, 0.3));
  position: relative;
}

.package-attentions-list::before {
  content: '';
  position: absolute;
  left: -1px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(
    to bottom,
    var(--package-color, rgba(74, 144, 226, 0.3)) 0%,
    transparent 100%
  );
}

.attention-row-with-package {
  position: relative;
  margin-bottom: 0.25rem;
}

.attention-row-with-package::before {
  content: '';
  position: absolute;
  left: -1.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--package-color, #4a90e2);
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 2px var(--package-color, rgba(74, 144, 226, 0.2));
  z-index: 1;
}

.attentions-without-package {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px dashed rgba(0, 0, 0, 0.1);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .package-group-header {
    padding: 0.5rem;
    gap: 0.5rem;
  }

  .package-group-title {
    font-size: 0.8rem;
    flex-wrap: wrap;
  }

  .package-attentions-list {
    margin-left: 0.5rem;
    padding-left: 0.75rem;
  }

  .attention-row-with-package::before {
    left: -1rem;
    width: 6px;
    height: 6px;
  }
}
</style>
