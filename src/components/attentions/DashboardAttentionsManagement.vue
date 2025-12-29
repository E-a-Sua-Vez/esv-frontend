<script>
import Spinner from '../common/Spinner.vue';
import Popper from 'vue3-popper';
import Message from '../common/Message.vue';
import SimpleDownloadCard from '../reports/SimpleDownloadCard.vue';
import AttentionManagementDetailsCard from './common/AttentionManagementDetailsCard.vue';
import AttentionDetailsModal from './common/AttentionDetailsModal.vue';
import jsonToCsv from '../../shared/utils/jsonToCsv';
import { getAttentionsDetails } from '../../application/services/query-stack';
import { DoughnutChart, BarChart } from 'vue-chart-3';
import SimpleDownloadButton from '../reports/SimpleDownloadButton.vue';
import { DateModel } from '../../shared/utils/date.model';
import { ATTENTION_STATUS } from '../../shared/constants';

export default {
  name: 'DashboardAttentionsManagement',
  components: {
    DoughnutChart,
    BarChart,
    Message,
    SimpleDownloadCard,
    Spinner,
    AttentionManagementDetailsCard,
    AttentionDetailsModal,
    Popper,
    SimpleDownloadButton,
  },
  props: {
    showAttentionManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    queues: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    services: { type: Array, default: undefined },
    filtersLocation: { type: String, default: 'component' }, // 'component' or 'slot'
  },
  data() {
    return {
      loading: false,
      counter: 0,
      attentions: undefined,
      totalPages: 0,
      daysSinceType: undefined,
      daysSinceContacted: undefined,
      contactResultType: undefined,
      contacted: undefined,
      contactable: undefined,
      survey: undefined,
      asc: false,
      showKeyWordsOptions: false,
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
      _skipWatch: false, // Flag to skip watch during manual sync
      showAttentionModal: false,
      selectedAttention: undefined,
    };
  },
  methods: {
    async refresh(page) {
      try {
        this.loading = true;
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        this.page = page ? page : this.page;

        // CRITICAL: Normalize all filter values to ensure consistency between mobile and desktop
        // Helper to normalize string values (empty string -> undefined, trim whitespace)
        const normalizeString = value => {
          if (value === null || value === undefined) return undefined;
          const str = String(value).trim();
          return str === '' ? undefined : str;
        };

        // Normalize all string parameters
        const startDateParam = normalizeString(this.startDate);
        const endDateParam = normalizeString(this.endDate);
        const searchTextParam = normalizeString(this.searchText);
        const queueIdParam = normalizeString(this.queueId);
        const serviceIdParam = normalizeString(this.serviceId);

        this.attentions = await getAttentionsDetails(
          this.commerce.id,
          startDateParam,
          endDateParam,
          commerceIds,
          this.page,
          this.limit,
          this.daysSinceType,
          this.daysSinceContacted,
          this.contactable,
          this.contacted,
          searchTextParam,
          queueIdParam,
          this.survey,
          this.asc,
          this.contactResultType,
          serviceIdParam,
          undefined,
          undefined,
          undefined,
          undefined,
          this.status
        );
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
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async setPage(pageIn) {
      this.page = pageIn;
      this.refresh();
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
      await this.refresh();
      this.closeAttentionModal();
    },
    async clear() {
      this.daysSinceType = undefined;
      this.daysSinceContacted = undefined;
      this.contactResultType = undefined;
      this.survey = undefined;
      this.page = 1;
      this.asc = false;
      this.contactable = undefined;
      this.contacted = undefined;
      this.searchText = undefined;
      this.queueId = undefined;
      this.serviceId = undefined;
      this.status = undefined;
      this.startDate = undefined;
      this.endDate = undefined;
      await this.refresh();
    },
    async checkContactable(event) {
      if (event.target.checked) {
        this.contactable = true;
      } else {
        this.contactable = false;
      }
    },
    async checkContacted(event) {
      if (event.target.checked) {
        this.contacted = true;
      } else {
        this.contacted = false;
      }
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
    showFilters() {
      this.showFilterOptions = !this.showFilterOptions;
    },
    setSearchText(text) {
      this.searchText = text;
    },
    setQueueId(id) {
      this.queueId = id;
    },
    setServiceId(id) {
      this.serviceId = id;
    },
    setStartDate(date) {
      this.startDate = date;
    },
    setEndDate(date) {
      this.endDate = date;
    },
    setDaysSinceType(value) {
      this.daysSinceType = value;
    },
    setContactResultType(value) {
      this.contactResultType = value;
    },
    setStatus(value) {
      this.status = value;
    },
    async exportToCSV() {
      try {
        this.loading = true;
        let csvAsBlob = [];
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        const result = await getAttentionsDetails(
          this.commerce.id,
          this.startDate,
          this.endDate,
          commerceIds,
          undefined,
          undefined,
          this.daysSinceType,
          this.daysSinceContacted,
          this.contactable,
          this.contacted,
          this.searchText,
          this.queueId,
          this.survey,
          this.asc,
          this.contactResultType,
          this.serviceId,
          undefined,
          undefined,
          undefined,
          undefined,
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
      // Don't call refresh here when filtersLocation is 'slot' - let the parent handle it
      if (this.filtersLocation !== 'slot') {
        await this.refresh(1);
      }
    },
    async getCurrentMonth() {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      this.startDate = `${year}-${month}-01`;
      this.endDate = `${year}-${month}-${day}`;
      // Don't call refresh here when filtersLocation is 'slot' - let the parent handle it
      if (this.filtersLocation !== 'slot') {
        await this.refresh(1);
      }
    },
    async getLastMonth() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(1).toString();
      this.endDate = new DateModel(this.startDate).endOfMonth().toString();
      // Don't call refresh here when filtersLocation is 'slot' - let the parent handle it
      if (this.filtersLocation !== 'slot') {
        await this.refresh(1);
      }
    },
    async getLastThreeMonths() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(3).toString();
      this.endDate = new DateModel(date).substractMonths(1).endOfMonth().toString();
      // Don't call refresh here when filtersLocation is 'slot' - let the parent handle it
      if (this.filtersLocation !== 'slot') {
        await this.refresh(1);
      }
    },
  },
  computed: {
    changeData() {
      const {
        page,
        daysSinceType,
        daysSinceContacted,
        contactResultType,
        contactable,
        contacted,
        survey,
        asc,
        queueId,
        limit,
        serviceId,
        status,
      } = this;
      return {
        page,
        daysSinceType,
        daysSinceContacted,
        contactResultType,
        contactable,
        contacted,
        survey,
        asc,
        queueId,
        limit,
        serviceId,
        status,
      };
    },
    visible() {
      const { showAttentionManagement } = this;
      return {
        showAttentionManagement,
      };
    },
  },
  watch: {
    changeData: {
      immediate: true,
      deep: true,
      async handler(oldData, newData) {
        // Skip watch if flag is set (manual sync in progress)
        if (this._skipWatch) {
          return;
        }
        if (
          oldData &&
          newData &&
          (oldData.daysSinceType !== newData.daysSinceType ||
            oldData.daysSinceContacted !== newData.daysSinceContacted ||
            oldData.contactable !== newData.contactable ||
            oldData.contactResultType !== newData.contactResultType ||
            oldData.contacted !== newData.contacted ||
            oldData.survey !== newData.survey ||
            oldData.asc !== newData.asc ||
            oldData.limit !== newData.limit ||
            oldData.queueId !== newData.queueId ||
            oldData.serviceId !== newData.serviceId ||
            oldData.status !== newData.status)
        ) {
          this.page = 1;
          this.refresh();
        }
      },
    },
    visible: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.showAttentionManagement === true) {
          this.page = 1;
          this.refresh();
        }
      },
    },
  },
};
</script>

<template>
  <div>
    <!-- Expose filters slot for desktop - rendered outside main content conditional -->
    <slot
      v-if="filtersLocation === 'slot'"
      name="filters-exposed"
      :clear="clear"
      :get-today="getToday"
      :get-current-month="getCurrentMonth"
      :get-last-month="getLastMonth"
      :get-last-three-months="getLastThreeMonths"
      :refresh="refresh"
      :start-date="startDate"
      :end-date="endDate"
      :search-text="searchText"
      :queue-id="queueId"
      :service-id="serviceId"
      :queues="queues"
      :services="services"
      :loading="loading"
      :days-since-type="daysSinceType"
      :days-since-contacted="daysSinceContacted"
      :contact-result-type="contactResultType"
      :contactable="contactable"
      :contacted="contacted"
      :survey="survey"
      :asc="asc"
      :check-contactable="checkContactable"
      :check-contacted="checkContacted"
      :check-survey="checkSurvey"
      :check-asc="checkAsc"
      :set-search-text="setSearchText"
      :set-queue-id="setQueueId"
      :set-service-id="setServiceId"
      :set-start-date="setStartDate"
      :set-end-date="setEndDate"
      :set-days-since-type="setDaysSinceType"
      :set-contact-result-type="setContactResultType"
      :status="status"
      :set-status="setStatus"
    ></slot>
    <div
      id="attentions-management"
      class="row"
      v-if="showAttentionManagement === true && toggles['dashboard.attentions-management.view']"
    >
      <div class="col">
        <div id="attention-management-component">
          <Spinner :show="loading"></Spinner>
          <div v-if="!loading">
            <div>
              <div id="admin-sub-menu" class="row mt-3 mx-0">
                <div class="col lefted">
                  <SimpleDownloadButton
                    :download="toggles['dashboard.reports.attentions-management']"
                    :show-tooltip="true"
                    :description="$t('dashboard.reports.attentions-management.description')"
                    @download="exportToCSV"
                    :can-download="toggles['dashboard.reports.attentions-management'] === true"
                  ></SimpleDownloadButton>
                </div>
              </div>
              <!-- Filters Section - Can be shown in component or exposed via slot -->
              <div v-if="filtersLocation === 'component'" class="my-2 row metric-card">
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
                          @click="refresh(1)"
                        >
                          <span><i class="bi bi-search"></i></span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div class="m-1">
                    <div class="row">
                      <div class="col-10">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="searchText"
                          :placeholder="$t('dashboard.search')"
                          @keyup.enter="refresh(1)"
                        />
                      </div>
                      <div class="col-2">
                        <button
                          class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                          @click="refresh(1)"
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
                  <div
                    class="col-12 col-md my-1 filter-card"
                    v-if="services && services.length > 1"
                  >
                    <label class="metric-card-subtitle mx-2" for="select-queue">
                      {{ $t('dashboard.service') }}
                    </label>
                    <select
                      class="btn btn-sm btn-light fw-bold text-dark select"
                      v-model="serviceId"
                    >
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
                  <div class="col-12 col-md my-1 filter-card">
                    <input
                      type="radio"
                      class="btn btn-check btn-sm"
                      v-model="contactResultType"
                      value="INTERESTED"
                      name="contactResultType-type"
                      id="interested-contacted"
                      autocomplete="off"
                    />
                    <label class="btn" for="interested-contacted">
                      <i :class="`bi bi-patch-check-fill green-icon`"></i>
                    </label>
                    <input
                      type="radio"
                      class="btn btn-check btn-sm"
                      v-model="contactResultType"
                      value="CONTACT_LATER"
                      name="contactResultType-type"
                      id="contact-later-contacted"
                      autocomplete="off"
                    />
                    <label class="btn" for="contact-later-contacted">
                      <i :class="`bi bi-patch-check-fill yellow-icon`"></i>
                    </label>
                    <input
                      type="radio"
                      class="btn btn-check btn-sm"
                      v-model="contactResultType"
                      value="REJECTED"
                      name="contactResultType-type"
                      id="rejected-contacted"
                      autocomplete="off"
                    />
                    <label class="btn" for="rejected-contacted">
                      <i :class="`bi bi-patch-check-fill red-icon`"></i>
                    </label>
                    <Popper
                      v-if="true"
                      :class="'dark'"
                      arrow
                      disable-click-away
                      :content="$t(`dashboard.tracing.filters.contactResult`)"
                    >
                      <i class="bi bi-info-circle-fill h7 m-2"></i>
                    </Popper>
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
                        {{
                          $t('dashboard.attentionStatus.userCancelled') || 'Cancelado por Usuario'
                        }}
                      </option>
                      <option :value="ATTENTION_STATUS.RATED">
                        {{ $t('dashboard.attentionStatus.rated') || 'Calificado' }}
                      </option>
                    </select>
                  </div>
                  <div class="row">
                    <div class="col-12 col-md-6">
                      <div class="form-check form-switch centered">
                        <input
                          class="form-check-input m-1"
                          :class="contactable === false ? 'bg-danger' : ''"
                          type="checkbox"
                          name="contactable"
                          id="contactable"
                          v-model="contactable"
                          @click="checkContactable($event)"
                        />
                        <label class="form-check-label metric-card-subtitle" for="contactable">{{
                          $t('dashboard.contactable')
                        }}</label>
                      </div>
                    </div>
                    <div class="col-12 col-md-6">
                      <div class="form-check form-switch centered">
                        <input
                          class="form-check-input m-1"
                          :class="contacted === false ? 'bg-danger' : ''"
                          type="checkbox"
                          name="contacted"
                          id="contacted"
                          v-model="contacted"
                          @click="checkContacted($event)"
                        />
                        <label class="form-check-label metric-card-subtitle" for="contacted">{{
                          $t('dashboard.contacted')
                        }}</label>
                      </div>
                    </div>
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
              <div class="my-3 d-flex justify-content-center align-items-center flex-wrap gap-2">
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
                <div
                  class="row"
                  v-for="(attention, index) in attentions"
                  :key="`attention-${index}`"
                >
                  <AttentionManagementDetailsCard
                    :show="true"
                    :attention="attention"
                    :commerce="commerce"
                    @open-modal="openAttentionModal"
                  >
                  </AttentionManagementDetailsCard>
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
                          <option
                            v-for="pag in totalPages"
                            :key="pag"
                            :value="pag"
                            id="select-queue"
                          >
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
              </div>
              <div v-else>
                <Message
                  :icon="'bi-graph-up-arrow'"
                  :title="$t('dashboard.message.2.title')"
                  :content="$t('dashboard.message.2.content')"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="showAttentionManagement === true && !toggles['dashboard.attentions-management.view']"
    >
      <Message
        :icon="'bi-graph-up-arrow'"
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
  border: 1px solid var(--gris-default);
}
.filter-card {
  background-color: var(--color-background);
  padding-top: 0.2rem;
  padding-bottom: 0.2rem;
  margin: 0.2rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
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
  border: 1px solid var(--gris-clear);
}
</style>
