<script>
import Spinner from '../common/Spinner.vue';
import Popper from 'vue3-popper';
import Message from '../common/Message.vue';
import SimpleDownloadCard from '../reports/SimpleDownloadCard.vue';
import jsonToCsv from '../../shared/utils/jsonToCsv';
import { getProductsDetails } from '../../application/services/query-stack';
import ProductDetailsCard from './common/ProductDetailsCard.vue';
import { getPermissions } from '../../application/services/permissions';
import { globalStore } from '../../stores';
import SimpleDownloadButton from '../reports/SimpleDownloadButton.vue';
import { DateModel } from '../../shared/utils/date.model';

export default {
  name: 'ProductsStockManagement',
  components: {
    Message,
    SimpleDownloadCard,
    Spinner,
    Popper,
    ProductDetailsCard,
    SimpleDownloadButton,
  },
  props: {
    showProductStockManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    queues: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    business: { type: Object, default: undefined },
    services: { type: Array, default: undefined },
    filtersLocation: { type: String, default: 'component' }, // 'component' or 'slot'
  },
  data() {
    const store = globalStore();
    // Set default dates: 1 month before today to today
    const today = new Date().toISOString().slice(0, 10);
    const oneMonthAgo = new DateModel(today).substractMonths(1).toString();
    return {
      loading: false,
      counter: 0,
      products: [],
      totalPages: 0,
      productStatus: undefined,
      replacement: undefined,
      expired: undefined,
      asc: true,
      showFilterOptions: false,
      searchText: undefined,
      productToggles: [],
      store,
      page: 1,
      limits: [10, 20, 50, 100],
      limit: 10,
      _skipWatch: false, // Flag to skip watch during manual sync
      startDate: oneMonthAgo,
      endDate: today,
      queueId: undefined,
      serviceId: undefined,
    };
  },
  async beforeMount() {
    this.productToggles = await getPermissions('products');
  },
  async mounted() {
    // Load data if component is visible when mounted
    if (
      this.showProductStockManagement === true &&
      this.commerce &&
      this.commerce.id &&
      this.business &&
      this.business.id
    ) {
      await this.refresh();
    }
  },
  methods: {
    async refresh() {
      try {
        // Don't refresh if commerce or business are not available
        if (!this.commerce || !this.commerce.id || !this.business || !this.business.id) {
          return;
        }

        this.loading = true;
        // Clear previous products IMMEDIATELY to avoid showing stale data
        this.products = [];
        this.counter = 0;
        this.totalPages = 0;

        const commerceIds = [this.commerce.id];

        // Log filter values for debugging
        // Ensure searchText is passed correctly (even if empty string)
        const searchTextParam =
          this.searchText !== null && this.searchText !== undefined ? this.searchText : undefined;

        // Ensure dates are properly formatted (YYYY-MM-DD) or undefined
        const startDateParam = this.startDate && this.startDate !== '' ? this.startDate : undefined;
        const endDateParam = this.endDate && this.endDate !== '' ? this.endDate : undefined;
        const result = await getProductsDetails(
          this.business.id,
          this.commerce.id,
          startDateParam,
          endDateParam,
          commerceIds,
          this.page,
          this.limit,
          this.expired,
          this.replacement,
          this.productStatus,
          searchTextParam,
          this.asc,
          this.queueId,
          this.serviceId
        );
        // Always set products to the result (even if empty array)
        // This ensures the UI updates correctly
        if (result && Array.isArray(result) && result.length > 0) {
          this.products = result;
          const { counter } = this.products[0];
          this.counter = counter;
          const total = counter / this.limit;
          const totalB = Math.trunc(total);
          this.totalPages = totalB <= 0 ? 1 : counter % this.limit === 0 ? totalB : totalB + 1;
        } else {
          // No products or empty array - explicitly set to empty array
          this.products = [];
          this.counter = 0;
          this.totalPages = 0;
        }
        this.loading = false;
      } catch (error) {
        this.products = [];
        this.counter = 0;
        this.totalPages = 0;
        this.loading = false;
      }
    },
    setPage(pageIn) {
      this.page = pageIn;
    },
    async clear() {
      this.productStatus = undefined;
      this.survey = undefined;
      this.asc = true;
      this.expired = undefined;
      this.replacement = undefined;
      this.searchText = undefined;
      await this.refresh();
    },
    async checkExpired(event) {
      if (event.target.checked) {
        this.expired = true;
      } else {
        this.expired = false;
      }
      // If this is the content instance, refresh immediately
      if (this.showProductStockManagement) {
        this.page = 1;
        await this.refresh();
      }
    },
    async checkReplacement(event) {
      if (event.target.checked) {
        this.replacement = true;
      } else {
        this.replacement = false;
      }
      // If this is the content instance, refresh immediately
      if (this.showProductStockManagement) {
        this.page = 1;
        await this.refresh();
      }
    },
    async checkAsc(event) {
      if (event.target.checked) {
        this.asc = true;
      } else {
        this.asc = false;
      }
      // If this is the content instance, refresh immediately
      if (this.showProductStockManagement) {
        this.page = 1;
        await this.refresh();
      }
    },
    setProductStatus(status) {
      this.productStatus = status;
      // If this is the content instance, refresh immediately
      if (this.showProductStockManagement) {
        this.page = 1;
        this.refresh();
      }
    },
    setSearchText(text) {
      this.searchText = text;
    },
    setStartDate(date) {
      this.startDate = date;
    },
    setEndDate(date) {
      this.endDate = date;
    },
    async getToday() {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      this.startDate = `${year}-${month}-${day}`;
      this.endDate = `${year}-${month}-${day}`;
    },
    async getCurrentMonth() {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      this.startDate = `${year}-${month}-01`;
      this.endDate = `${year}-${month}-${day}`;
    },
    async getLastMonth() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(1).toString();
      this.endDate = new DateModel(this.startDate).endOfMonth().toString();
    },
    async getLastThreeMonths() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(3).toString();
      this.endDate = new DateModel(date).substractMonths(1).endOfMonth().toString();
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
        const result = await getProductsDetails(
          this.business.id,
          this.commerce.id,
          undefined,
          undefined,
          commerceIds,
          undefined,
          undefined,
          this.expired,
          this.replacement,
          this.productStatus,
          this.searchText,
          this.asc
        );
        if (result && result.length > 0) {
          csvAsBlob = jsonToCsv(result);
        }
        const blobURL = URL.createObjectURL(new Blob([csvAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `products-details-${this.commerce.tag}.csv`;
        a.href = blobURL;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async goToProductsAdmin() {
      const userType = await this.store.getCurrentUserType;
      if (userType && userType === 'business') {
        this.$router.push({ path: '/interno/negocio/product-admin' });
      }
    },
    handleQuickRecharge(productId) {
      // Emitir evento al componente padre para manejar la recarga
      this.$emit('quick-recharge', productId);
      // Alternativamente, podríamos abrir el modal de recarga directamente
      // Por ahora, solo emitimos el evento
    },
  },
  computed: {
    changeData() {
      const {
        page,
        commerce,
        expired,
        replacement,
        productStatus,
        asc,
        limit,
        searchText,
        startDate,
        endDate,
        queueId,
        serviceId,
      } = this;
      return {
        page,
        expired,
        commerce,
        replacement,
        productStatus,
        asc,
        limit,
        searchText,
        startDate,
        endDate,
        queueId,
        serviceId,
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
        // The filter instance has showProductStockManagement=false, so it shouldn't refresh
        // But we still allow the watch to run so values can update in the filter instance
        if (!this.showProductStockManagement) {
          // Filter instance - values update but don't refresh
          // The parent will handle syncing and refreshing the content instance
          return;
        }

        // Content instance - handle page reset and refresh
        if (
          oldData &&
          newData &&
          (oldData.expired !== newData.expired ||
            oldData.productStatus !== newData.productStatus ||
            oldData.replacement !== newData.replacement ||
            oldData.asc !== newData.asc ||
            oldData.limit !== newData.limit ||
            oldData.searchText !== newData.searchText ||
            oldData.startDate !== newData.startDate ||
            oldData.endDate !== newData.endDate ||
            oldData.queueId !== newData.queueId ||
            oldData.serviceId !== newData.serviceId)
        ) {
          this.page = 1;
        }
        // Refresh if data changed, or if this is the first time showing (oldData doesn't exist but component is visible)
        if (oldData) {
          this.refresh();
        } else if (
          !oldData &&
          this.showProductStockManagement &&
          this.commerce &&
          this.commerce.id &&
          this.business &&
          this.business.id
        ) {
          // First time showing - load initial data
          this.refresh();
        }
      },
    },
    showProductStockManagement: {
      immediate: false,
      handler(newVal) {
        // When the component becomes visible, load the data
        if (
          newVal === true &&
          this.commerce &&
          this.commerce.id &&
          this.business &&
          this.business.id
        ) {
          // Reset to first page when showing
          this.page = 1;
          this.refresh();
        }
      },
    },
    commerce: {
      immediate: false,
      handler(newVal) {
        // When commerce changes and component is visible, reload data
        if (
          this.showProductStockManagement === true &&
          newVal &&
          newVal.id &&
          this.business &&
          this.business.id
        ) {
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
      :refresh="refresh"
      :search-text="searchText"
      :product-status="productStatus"
      :expired="expired"
      :replacement="replacement"
      :asc="asc"
      :loading="loading"
      :check-expired="checkExpired"
      :check-replacement="checkReplacement"
      :check-asc="checkAsc"
      :set-product-status="setProductStatus"
      :set-search-text="setSearchText"
      :set-start-date="setStartDate"
      :set-end-date="setEndDate"
      :get-today="getToday"
      :get-current-month="getCurrentMonth"
      :get-last-month="getLastMonth"
      :get-last-three-months="getLastThreeMonths"
      :queues="queues"
      :services="services"
      :queue-id="queueId"
      :service-id="serviceId"
      :start-date="startDate"
      :end-date="endDate"
    ></slot>
    <div
      id="products-management"
      class="row"
      v-if="showProductStockManagement === true && toggles['products-stock.products.view']"
    >
      <div class="col">
        <div id="attention-management-component">
          <Spinner :show="loading"></Spinner>
          <div v-if="!loading">
            <div>
              <div id="admin-sub-menu" v-if="commerce" class="row mt-3 mx-0">
                <div class="col lefted">
                  <button
                    class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="goToProductsAdmin()"
                    :hidden="!productToggles['products.admin.view']"
                  >
                    <i class="bi bi-database-gear"></i> {{ $t('businessProductStockAdmin.admin') }}
                  </button>
                  <SimpleDownloadButton
                    :download="toggles['products-stock.reports.details']"
                    :show-tooltip="true"
                    :description="$t('businessProductStockAdmin.reports.details.description')"
                    :icon="'bi-file-earmark-spreadsheet'"
                    @download="exportToCSV"
                    :can-download="toggles['products-stock.reports.details'] === true"
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
                  <div class="m-1">
                    <div class="row">
                      <div class="col-10">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="searchText"
                          :placeholder="$t('businessProductStockAdmin.search')"
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
                  <div class="col-12 col-md my-1 filter-card">
                    <input
                      type="radio"
                      class="btn btn-check btn-sm"
                      v-model="productStatus"
                      value="GOOD"
                      name="productStatus-type"
                      id="good-replacement"
                      autocomplete="off"
                    />
                    <label class="btn" for="good-replacement">
                      <i :class="`bi bi-battery-full green-icon h5`"></i>
                    </label>
                    <input
                      type="radio"
                      class="btn btn-check btn-sm"
                      v-model="productStatus"
                      value="MEDIUM"
                      name="productStatus-type"
                      id="medium-replacement"
                      autocomplete="off"
                    />
                    <label class="btn" for="medium-replacement">
                      <i :class="`bi bi-battery-half yellow-icon h5`"></i>
                    </label>
                    <input
                      type="radio"
                      class="btn btn-check btn-sm"
                      v-model="productStatus"
                      value="LOW"
                      name="productStatus-type"
                      id="low-replacement"
                      autocomplete="off"
                    />
                    <label class="btn" for="low-replacement">
                      <i :class="`bi bi-battery red-icon h5`"></i>
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
                  <div class="row">
                    <div class="col">
                      <div class="form-check form-switch centered">
                        <input
                          class="form-check-input m-1"
                          :class="expired === false ? 'bg-danger' : ''"
                          type="checkbox"
                          name="expired"
                          id="expired"
                          v-model="expired"
                          @click="checkContactable($event)"
                        />
                        <label class="form-check-label metric-card-subtitle" for="expired">{{
                          $t('businessProductStockAdmin.expired')
                        }}</label>
                      </div>
                    </div>
                    <div class="col">
                      <div class="form-check form-switch centered">
                        <input
                          class="form-check-input m-1"
                          :class="replacement === false ? 'bg-danger' : ''"
                          type="checkbox"
                          name="replacement"
                          id="replacement"
                          v-model="replacement"
                          @click="checkContacted($event)"
                        />
                        <label class="form-check-label metric-card-subtitle" for="replacement">{{
                          $t('businessProductStockAdmin.replacement')
                        }}</label>
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-12">
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
              <div v-if="products && products.length > 0">
                <div class="row" v-for="(product, index) in products" :key="`product-${index}`">
                  <ProductDetailsCard
                    :show="true"
                    :product="product"
                    :commerce="this.commerce"
                    :toggles="this.toggles"
                    :queues="this.queues"
                    :commerces="this.commerces"
                    @quick-recharge="handleQuickRecharge"
                  >
                  </ProductDetailsCard>
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
    <div v-if="showProductStockManagement === true && !toggles['products-stock.products.view']">
      <Message
        :icon="'bi-graph-up-arrow'"
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
