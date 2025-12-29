<script>
import Spinner from '../common/Spinner.vue';
import Popper from 'vue3-popper';
import Message from '../common/Message.vue';
import SimpleDownloadCard from '../reports/SimpleDownloadCard.vue';
import jsonToCsv from '../../shared/utils/jsonToCsv';
import { getClientsDetails } from '../../application/services/query-stack';
import ClientDetailsCard from '../clients/common/ClientDetailsCard.vue';
import SimpleDownloadButton from '../reports/SimpleDownloadButton.vue';
import { DateModel } from '../../shared/utils/date.model';
import { getPermissions } from '../../application/services/permissions';
import ClientDataManagement from './domain/ClientDataManagement.vue';
import ClientAddManagement from './domain/ClientAddManagement.vue';

export default {
  name: 'DashboardClientsManagement',
  components: {
    Message,
    SimpleDownloadCard,
    Spinner,
    Popper,
    ClientDetailsCard,
    SimpleDownloadButton,
    ClientDataManagement,
    ClientAddManagement,
  },
  props: {
    showClientManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    queues: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    business: { type: Object, default: undefined },
    services: { type: Array, default: undefined },
    filtersLocation: { type: String, default: 'component' }, // 'component' or 'slot'
    clientDetailsOpened: { type: Boolean, default: true },
  },
  data() {
    return {
      loading: false,
      counter: 0,
      clients: [],
      totalPages: 0,
      daysSinceType: undefined,
      daysSinceContacted: undefined,
      contactResultType: undefined,
      contacted: undefined,
      contactable: undefined,
      survey: undefined,
      firstAttentionForm: undefined,
      ratingType: undefined,
      npsType: undefined,
      asc: true,
      pendingControls: undefined,
      pendingBookings: undefined,
      showKeyWordsOptions: false,
      showFilterOptions: false,
      searchText: undefined,
      queueId: undefined,
      serviceId: undefined,
      page: 1,
      limits: [10, 20, 50, 100],
      limit: 10,
      startDate: undefined,
      endDate: undefined,
      togglesClient: {},
      _skipWatch: false, // Flag to skip watch during manual sync
    };
  },
  methods: {
    async refresh(page) {
      try {
        this.loading = true;
        // Clear previous clients IMMEDIATELY to avoid showing stale data
        this.clients = [];
        this.counter = 0;
        this.totalPages = 0;
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

        // Normalize searchText - empty string becomes undefined
        const searchTextParam = normalizeString(this.searchText);

        // Normalize dates - empty string becomes undefined, ensure YYYY-MM-DD format
        const startDateParam = normalizeString(this.startDate);
        const endDateParam = normalizeString(this.endDate);

        // Normalize queueId and serviceId - empty string becomes undefined
        const queueIdParam = normalizeString(this.queueId);
        const serviceIdParam = normalizeString(this.serviceId);

        this.clients = await getClientsDetails(
          this.business.id,
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
          undefined,
          serviceIdParam,
          this.pendingControls,
          this.pendingBookings,
          this.firstAttentionForm,
          this.ratingType,
          this.npsType
        );
        // 🔍 DEBUG: Verificar IDs recibidos del query-stack
        if (this.clients && this.clients.length > 0) {
          console.log(
            '🔍 DEBUG Client IDs from query-stack:',
            this.clients.map(c => ({
              id: c.id,
              userId: c.userId,
              userName: c.userName,
              userEmail: c.userEmail,
            })),
          );
        }
        if (this.clients && this.clients.length > 0) {
          const { counter } = this.clients[0];
          this.counter = counter;
          const total = counter / this.limit;
          const totalB = Math.trunc(total);
          this.totalPages = totalB <= 0 ? 1 : counter % this.limit === 0 ? totalB : totalB + 1;
        } else {
          this.clients = [];
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
      await this.refresh();
    },
    async clear() {
      this.daysSinceType = undefined;
      this.daysSinceContacted = undefined;
      this.contactResultType = undefined;
      this.survey = undefined;
      this.firstAttentionForm = undefined;
      this.ratingType = undefined;
      this.npsType = undefined;
      this.page = 1;
      this.asc = true;
      this.contactable = undefined;
      this.contacted = undefined;
      this.searchText = undefined;
      this.queueId = undefined;
      this.serviceId = undefined;
      this.startDate = undefined;
      this.endDate = undefined;
      this.pendingControls = undefined;
      this.pendingBookings = undefined;
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
    async checkFirstAttentionForm(event) {
      if (event.target.checked) {
        this.firstAttentionForm = true;
      } else {
        this.firstAttentionForm = false;
      }
    },
    async checkAsc(event) {
      if (event.target.checked) {
        this.asc = true;
      } else {
        this.asc = false;
      }
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
    setDaysSinceContacted(value) {
      this.daysSinceContacted = value;
    },
    setContactResultType(value) {
      this.contactResultType = value;
    },
    setRatingType(value) {
      this.ratingType = value;
    },
    setNpsType(value) {
      this.npsType = value;
    },
    async checkPendingControls(event) {
      if (event.target.checked) {
        this.pendingControls = true;
      } else {
        this.pendingControls = false;
      }
    },
    async checkPendingBookings(event) {
      if (event.target.checked) {
        this.pendingBookings = true;
      } else {
        this.pendingBookings = false;
      }
    },
    showFilters() {
      this.showFilterOptions = !this.showFilterOptions;
    },
    async exportToCSV() {
      try {
        this.loading = true;
        let csvAsBlob = [];
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        const result = await getClientsDetails(
          this.business.id,
          this.commerce.id,
          undefined,
          undefined,
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
          this.pendingControls,
          this.pendingBookings,
          this.firstAttentionForm,
          this.ratingType,
          this.npsType
        );
        if (result && result.length > 0) {
          csvAsBlob = jsonToCsv(result);
        }
        const blobURL = URL.createObjectURL(new Blob([csvAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `clients-details-${this.commerce.tag}.csv`;
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
      await this.refresh(1);
    },
    async getCurrentMonth() {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      this.startDate = `${year}-${month}-01`;
      this.endDate = `${year}-${month}-${day}`;
      await this.refresh(1);
    },
    async getLastMonth() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(1).toString();
      this.endDate = new DateModel(this.startDate).endOfMonth().toString();
      await this.refresh(1);
    },
    async getLastThreeMonths() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(3).toString();
      this.endDate = new DateModel(date).substractMonths(1).endOfMonth().toString();
      await this.refresh(1);
    },
    async loadTogglesIfNeeded() {
      // Lazy load toggles only when needed (e.g., when opening add modal)
      if (!this.togglesClient || Object.keys(this.togglesClient).length === 0) {
        this.togglesClient = await getPermissions('client', 'admin');
      }
    },
    async closeAddModal() {
      const modalCloseButton = document.getElementById('close-modal-client-add');
      modalCloseButton.click();
      setTimeout(async () => {
        this.refresh(1);
      }, 3000);
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
        firstAttentionForm,
        ratingType,
        npsType,
        asc,
        queueId,
        limit,
        serviceId,
        pendingControls,
        pendingBookings,
        searchText,
        startDate,
        endDate,
      } = this;
      return {
        page,
        daysSinceType,
        daysSinceContacted,
        contactResultType,
        contactable,
        contacted,
        survey,
        firstAttentionForm,
        ratingType,
        npsType,
        asc,
        queueId,
        limit,
        serviceId,
        pendingControls,
        pendingBookings,
        searchText,
        startDate,
        endDate,
      };
    },
    visible() {
      const { showClientManagement } = this;
      return {
        showClientManagement,
      };
    },
  },
  watch: {
    changeData: {
      immediate: true,
      deep: true,
      async handler(oldData, newData) {
        // Skip if this is a manual sync (indicated by _skipWatch flag)
        if (this._skipWatch) {
          this._skipWatch = false;
          return;
        }

        // Only refresh if this component is actually showing content (not just filters)
        // The filter instance has showClientManagement=false, so it shouldn't refresh
        if (!this.showClientManagement) {
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
            oldData.firstAttentionForm !== newData.firstAttentionForm ||
            oldData.ratingType !== newData.ratingType ||
            oldData.npsType !== newData.npsType ||
            oldData.asc !== newData.asc ||
            oldData.pendingControls !== newData.pendingControls ||
            oldData.pendingBookings !== newData.pendingBookings ||
            oldData.limit !== newData.limit ||
            oldData.queueId !== newData.queueId ||
            oldData.serviceId !== newData.serviceId ||
            oldData.searchText !== newData.searchText ||
            oldData.startDate !== newData.startDate ||
            oldData.endDate !== newData.endDate)
        ) {
          this.page = 1;
        }
        // Only refresh if this is not the initial mount (oldData exists)
        if (oldData) {
          this.refresh();
        }
      },
    },
    visible: {
      immediate: true,
      deep: true,
      async handler(newVal, oldVal) {
        // Only load toggles when component is actually shown (lazy loading)
        // For filtersLocation === 'slot', we don't need toggles unless add modal is opened
        if (this.showClientManagement === true) {
          // Load toggles only when component becomes visible for the first time
          if (!this.togglesClient || Object.keys(this.togglesClient).length === 0) {
            this.togglesClient = await getPermissions('client', 'admin');
          }
          // Auto-expand filters when component becomes visible for the first time
          if (!oldVal || (oldVal && !oldVal.showClientManagement && newVal.showClientManagement)) {
            this.showFilterOptions = true;
          }
          this.page = 1;
          this.refresh();
        }
      },
    },
    showClientManagement: {
      immediate: false,
      handler(newVal) {
        // Auto-expand filters when component becomes visible
        if (newVal === true && this.filtersLocation === 'component') {
          this.showFilterOptions = true;
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
      :pending-controls="pendingControls"
      :pending-bookings="pendingBookings"
      :check-contactable="checkContactable"
      :check-contacted="checkContacted"
      :check-survey="checkSurvey"
      :check-asc="checkAsc"
      :check-pending-controls="checkPendingControls"
      :check-pending-bookings="checkPendingBookings"
      :check-first-attention-form="checkFirstAttentionForm"
      :set-search-text="setSearchText"
      :set-queue-id="setQueueId"
      :set-service-id="setServiceId"
      :set-start-date="setStartDate"
      :set-end-date="setEndDate"
      :set-days-since-type="setDaysSinceType"
      :set-days-since-contacted="setDaysSinceContacted"
      :set-contact-result-type="setContactResultType"
      :set-rating-type="setRatingType"
      :set-nps-type="setNpsType"
      :first-attention-form="firstAttentionForm"
      :rating-type="ratingType"
      :nps-type="npsType"
    ></slot>
    <div
      id="clients-management"
      class="row"
      v-if="showClientManagement === true && toggles['dashboard.clients-management.view']"
    >
      <div class="col">
        <div id="attention-management-component">
          <Spinner :show="loading"></Spinner>
          <div v-if="!loading">
            <div>
              <div id="admin-sub-menu" class="row mt-3 mx-0">
                <div class="col lefted">
                  <button
                    class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                    data-bs-toggle="modal"
                    data-bs-target="#addModal"
                    :disabled="!togglesClient || !togglesClient['client.admin.add']"
                  >
                    <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                  </button>
                  <SimpleDownloadButton
                    :download="toggles['dashboard.reports.clients-management']"
                    :show-tooltip="true"
                    :description="$t('dashboard.reports.clients-management.description')"
                    @download="exportToCSV"
                    :can-download="toggles['dashboard.reports.clients-management'] === true"
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
                  <!-- Filter content slot - exposes all filter content -->
                  <slot name="filters-content" :clear="clear" :component="this">
                    <!-- Default filter content for mobile -->
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
                      <select
                        class="btn btn-sm btn-light fw-bold text-dark select"
                        v-model="queueId"
                      >
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
                    <!-- Atendimentos Filters (matching exact order from DashboardAttentionsManagement) -->
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
                        hover
                        :content="$t(`dashboard.tracing.filters.attention`)"
                      >
                        <i class="bi bi-info-circle-fill h7 m-2"></i>
                      </Popper>
                    </div>
                    <div class="col-12 col-md my-1 filter-card">
                      <input
                        type="radio"
                        class="btn btn-check btn-sm"
                        v-model="daysSinceContacted"
                        value="EARLY"
                        name="daysContacted-type"
                        id="early-contacted"
                        autocomplete="off"
                      />
                      <label class="btn" for="early-contacted">
                        <i :class="`bi bi-chat-left-dots-fill green-icon`"></i>
                      </label>
                      <input
                        type="radio"
                        class="btn btn-check btn-sm"
                        v-model="daysSinceContacted"
                        value="MEDIUM"
                        name="daysContacted-type"
                        id="medium-contacted"
                        autocomplete="off"
                      />
                      <label class="btn" for="medium-contacted">
                        <i :class="`bi bi-chat-left-dots-fill yellow-icon`"></i>
                      </label>
                      <input
                        type="radio"
                        class="btn btn-check btn-sm"
                        v-model="daysSinceContacted"
                        value="LATE"
                        name="daysContacted-type"
                        id="late-contacted"
                        autocomplete="off"
                      />
                      <label class="btn" for="late-contacted">
                        <i :class="`bi bi-chat-left-dots-fill red-icon`"></i>
                      </label>
                      <Popper
                        v-if="true"
                        :class="'dark'"
                        arrow
                        disable-click-away
                        hover
                        :content="$t(`dashboard.tracing.filters.contact`)"
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
                        hover
                        :content="$t(`dashboard.tracing.filters.contactResult`)"
                      >
                        <i class="bi bi-info-circle-fill h7 m-2"></i>
                      </Popper>
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
                    <!-- Clientes-specific filters -->
                    <div class="row">
                      <div class="col-12 col-md-6">
                        <div class="form-check form-switch centered">
                          <input
                            class="form-check-input m-1"
                            :class="firstAttentionForm === false ? 'bg-danger' : ''"
                            type="checkbox"
                            name="firstAttentionForm"
                            id="firstAttentionForm"
                            v-model="firstAttentionForm"
                            @click="checkFirstAttentionForm($event)"
                          />
                          <label
                            class="form-check-label metric-card-subtitle"
                            for="firstAttentionForm"
                            >{{ $t('dashboard.firstAttentionForm') }}</label
                          >
                        </div>
                      </div>
                      <div class="col-12 col-md-6">
                        <div class="form-check form-switch centered">
                          <input
                            class="form-check-input m-1"
                            :class="pendingBookings === false ? 'bg-danger' : ''"
                            type="checkbox"
                            name="pendingBookings"
                            id="pendingBookings"
                            v-model="pendingBookings"
                            @click="checkPendingBookings($event)"
                          />
                          <label
                            class="form-check-label metric-card-subtitle"
                            for="pendingBookings"
                            >{{ $t('dashboard.pendingBookings') }}</label
                          >
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-12 col-md-6">
                        <div class="form-check form-switch centered">
                          <input
                            class="form-check-input m-1"
                            :class="pendingControls === false ? 'bg-danger' : ''"
                            type="checkbox"
                            name="pendingControls"
                            id="pendingControls"
                            v-model="pendingControls"
                            @click="checkPendingControls($event)"
                          />
                          <label
                            class="form-check-label metric-card-subtitle"
                            for="pendingControls"
                            >{{ $t('dashboard.pendingControls') }}</label
                          >
                        </div>
                      </div>
                    </div>
                    <!-- Pesquisas Filters (from DashboardSurveysManagement) -->
                    <div class="col-12 col-md my-1 filter-card">
                      <input
                        type="radio"
                        class="btn btn-check btn-sm"
                        v-model="ratingType"
                        value="DETRACTOR"
                        name="rating-type"
                        id="detractor-rating"
                        autocomplete="off"
                      />
                      <label class="btn" for="detractor-rating">
                        <i :class="`bi bi-star-fill red-icon`"></i>
                      </label>
                      <input
                        type="radio"
                        class="btn btn-check btn-sm"
                        v-model="ratingType"
                        value="NEUTRO"
                        name="rating-type"
                        id="neutro-rating"
                        autocomplete="off"
                      />
                      <label class="btn" for="neutro-rating">
                        <i :class="`bi bi-star-half yellow-icon`"></i>
                      </label>
                      <input
                        type="radio"
                        class="btn btn-check btn-sm"
                        v-model="ratingType"
                        value="PROMOTOR"
                        name="rating-type"
                        id="promotor-rating"
                        autocomplete="off"
                      />
                      <label class="btn" for="promotor-rating">
                        <i :class="`bi bi-star-fill green-icon`"></i>
                      </label>
                      <Popper
                        v-if="true"
                        :class="'dark'"
                        arrow
                        disable-click-away
                        hover
                        :content="$t(`dashboard.surveysFilters.filters.rating`)"
                      >
                        <i class="bi bi-info-circle-fill h7 m-2"></i>
                      </Popper>
                    </div>
                    <div class="col-12 col-md my-1 filter-card">
                      <input
                        type="radio"
                        class="btn btn-check btn-sm"
                        v-model="npsType"
                        value="DETRACTOR"
                        name="nps-type"
                        id="detractor-nps"
                        autocomplete="off"
                      />
                      <label class="btn" for="detractor-nps">
                        <i :class="`bi bi-emoji-frown-fill red-icon`"></i>
                      </label>
                      <input
                        type="radio"
                        class="btn btn-check btn-sm"
                        v-model="npsType"
                        value="NEUTRO"
                        name="nps-type"
                        id="neutro-nps"
                        autocomplete="off"
                      />
                      <label class="btn" for="neutro-nps">
                        <i :class="`bi bi-emoji-neutral-fill yellow-icon`"></i>
                      </label>
                      <input
                        type="radio"
                        class="btn btn-check btn-sm"
                        v-model="npsType"
                        value="PROMOTOR"
                        name="nps-type"
                        id="promotor-nps"
                        autocomplete="off"
                      />
                      <label class="btn" for="promotor-nps">
                        <i :class="`bi bi-emoji-smile-fill green-icon`"></i>
                      </label>
                      <Popper
                        v-if="true"
                        :class="'dark'"
                        arrow
                        disable-click-away
                        hover
                        :content="$t(`dashboard.surveysFilters.filters.nps`)"
                      >
                        <i class="bi bi-info-circle-fill h7 m-2"></i>
                      </Popper>
                    </div>
                  </slot>
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
              <div v-if="clients && clients.length > 0">
                <div class="row" v-for="(client, index) in clients" :key="`clients-${index}`">
                  <ClientDetailsCard
                    :show="true"
                    :client="client"
                    :details-opened="this.clientDetailsOpened"
                    :commerce="this.commerce"
                    :toggles="this.toggles"
                    :start-date="this.startDate"
                    :end-date="this.endDate"
                    :queues="this.queues"
                    :commerces="this.commerces"
                    :services="this.services"
                  >
                  </ClientDetailsCard>
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
    <div v-if="showClientManagement === true && !toggles['dashboard.clients-management.view']">
      <Message
        :icon="'bi-graph-up-arrow'"
        :title="$t('dashboard.message.1.title')"
        :content="$t('dashboard.message.1.content')"
      />
    </div>
    <!-- Modal Add - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
      <div
        v-if="showClientManagement === true"
        class="modal fade"
        id="addModal"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabindex="-1"
        aria-labelledby="staticBackdropLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header border-0 centered active-name">
              <h5 class="modal-title fw-bold">
                <i class="bi bi-pencil-fill"></i> {{ $t('dashboard.addClient') }}
              </h5>
              <button
                :id="`close-modal-client-add`"
                class="btn-close"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <Spinner :show="loading"></Spinner>
            <div class="modal-body text-center mb-0" id="attentions-component">
              <ClientAddManagement
                :show-client-add-management="true"
                :toggles="togglesClient"
                :client="undefined"
                :commerce="commerce"
                :commerces="commerces"
                :close-modal="closeAddModal"
              >
              </ClientAddManagement>
            </div>
            <div class="mx-2 mb-4 text-center">
              <a
                class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
                data-bs-dismiss="modal"
                aria-label="Close"
                >{{ $t('close') }} <i class="bi bi-check-lg"></i
              ></a>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
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
