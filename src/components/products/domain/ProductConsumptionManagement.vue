<script>
import Spinner from '../../common/Spinner.vue';
import Alert from '../../common/Alert.vue';
import Warning from '../../common/Warning.vue';
import Popper from 'vue3-popper';
import Message from '../../common/Message.vue';
import SimpleDownloadCard from '../../reports/SimpleDownloadCard.vue';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { globalStore } from '../../../stores';
import { getProductsConsumptionsDetails } from '../../../application/services/query-stack';
import {
  addProductConsumption,
  getActiveReplacementsByProductId,
} from '../../../application/services/product';
import { getDate } from '../../../shared/utils/date';
import ProductReplacementDetailsCard from '../common/ProductReplacementDetailsCard.vue';
import ProductConsumptionDetailsCard from '../common/ProductConsumptionDetailsCard.vue';
import { DateModel } from '../../../shared/utils/date.model';

export default {
  name: 'ProductConsumptionManagement',
  components: {
    Message,
    SimpleDownloadCard,
    Spinner,
    Popper,
    Alert,
    Warning,
    ProductReplacementDetailsCard,
    ProductConsumptionDetailsCard,
  },
  props: {
    showProductConsumptionManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    product: { type: Object, default: {} },
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    queues: { type: Array, default: undefined },
    productConsumptionsIn: { type: Array, default: [] },
  },
  emits: ['getProductConsuptions'],
  data() {
    const store = globalStore();
    return {
      loading: false,
      alertError: '',
      productConsumptions: [],
      newProductConsumptions: [],
      productReplacements: [],
      newProductConsumption: {},
      counter: 0,
      totalPages: 0,
      asc: true,
      checked: false,
      showFilterOptions: false,
      showAddOption: false,
      searchText: undefined,
      typeError: false,
      commentError: false,
      resultError: false,
      store,
      userType: undefined,
      user: undefined,
      errorsAdd: [],
      page: 1,
      limits: [10, 20, 50, 100],
      limit: 10,
      consumptionAmountError: false,
      consumptionDateError: false,
      consumptionReplacementId: false,
      replacementExpirationDateError: false,
      selectedProductReplacement: {},
      startDate: undefined,
      endDate: undefined,
    };
  },
  methods: {
    async setPage(pageIn) {
      this.page = pageIn;
      await this.refresh();
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    async clear() {
      this.asc = true;
      this.searchText = undefined;
      this.limit = 10;
      this.page = 1;
      this.startDate = undefined;
      this.endDate = undefined;
      await this.refresh();
    },
    async checkAsc(event) {
      if (event.target.checked) {
        this.asc = true;
      } else {
        this.asc = false;
      }
    },
    async refresh() {
      try {
        this.loading = true;
        const commerceIds = [this.commerce.id];
        this.newProductConsumptions = await getProductsConsumptionsDetails(
          commerceIds,
          this.product.productId,
          this.page,
          this.limit,
          this.asc,
          this.startDate,
          this.endDate,
          undefined
        );
        this.updatePaginationData();
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    showFilters() {
      this.showFilterOptions = !this.showFilterOptions;
    },
    async showAdd() {
      if (this.product && this.product.productId && this.productReplacements.length === 0) {
        this.productReplacements = await getActiveReplacementsByProductId(this.product.productId);
      }
      this.showAddOption = !this.showAddOption;
      this.newProductConsumption = {
        consumptionDate: new Date().toISOString().slice(0, 10),
      };
    },
    updatePaginationData() {
      if (this.productConsumptions && this.productConsumptions.length > 0) {
        const { counter } = this.productConsumptions[0];
        this.counter = counter;
        const total = counter / this.limit;
        const totalB = Math.trunc(total);
        this.totalPages = totalB <= 0 ? 1 : counter % this.limit === 0 ? totalB : totalB + 1;
      } else {
        this.counter = 0;
        this.totalPages = 0;
      }
    },
    validateAdd(newProductConsumption) {
      this.errorsAdd = [];
      if (!this.selectedProductReplacement || !this.selectedProductReplacement.id) {
        this.consumptionReplacementId = true;
        this.errorsAdd.push('businessProductStockAdmin.validate.productReplacement');
      } else {
        this.consumptionReplacementId = false;
      }
      if (
        newProductConsumption.consumptionAmount === undefined ||
        newProductConsumption.consumptionAmount <= 0
      ) {
        this.consumptionAmountError = true;
        this.errorsAdd.push('businessProductStockAdmin.validate.consumptionAmount');
      } else {
        this.consumptionAmountError = false;
      }
      if (
        newProductConsumption.consumptionAmount >
        this.selectedProductReplacement.replacementActualLevel
      ) {
        this.consumptionAmountError = true;
        this.errorsAdd.push('businessProductStockAdmin.validate.consumptionLevel');
      } else {
        this.consumptionAmountError = false;
      }
      if (
        newProductConsumption.consumptionDate === undefined ||
        newProductConsumption.consumptionDate.length === 0
      ) {
        this.consumptionDateError = true;
        this.errorsAdd.push('businessProductStockAdmin.validate.consumptionDate');
      } else {
        this.consumptionDateError = false;
      }
      if (this.errorsAdd.length === 0) {
        return true;
      }
      return false;
    },
    async add(newProductConsumption) {
      try {
        this.loading = true;
        if (this.validateAdd(newProductConsumption)) {
          newProductConsumption.productId = this.product.productId;
          newProductConsumption.commerceId = this.product.commerceId;
          newProductConsumption.productCode = this.product.productCode;
          newProductConsumption.consumedBy = this.user.email;
          newProductConsumption.productReplacementId = this.selectedProductReplacement.id;
          await addProductConsumption(newProductConsumption);
          setTimeout(async () => {
            this.$emit('getProductConsumptions');
            await this.refresh();
          }, 5000);
          this.showAddOption = false;
          this.newProductConsumption = {};
          this.extendedEntity = undefined;
        }
        this.alertError = '';
        this.loading = false;
      } catch (error) {
        this.alertError = error.response.status || 500;
        this.loading = false;
      }
    },
    async exportToCSV() {
      try {
        this.loading = true;
        let csvAsBlob = [];
        const commerceIds = [this.commerce.id];
        const result = await getProductsConsumptionsDetails(
          commerceIds,
          this.product.productId,
          undefined,
          undefined,
          this.asc,
          this.startDate,
          this.endDate,
          undefined
        );
        if (result && result.length > 0) {
          csvAsBlob = jsonToCsv(result);
        }
        const blobURL = URL.createObjectURL(new Blob([csvAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `product-consumption-details-${this.commerce.tag}-${this.startDate}-${this.endDate}.csv`;
        a.href = blobURL;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async getUserType() {
      this.userType = await this.store.getCurrentUserType;
    },
    async getUser() {
      this.user = await this.store.getCurrentUser;
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
  },
  computed: {
    changeData() {
      const { page, asc, queueId, limit } = this;
      return {
        page,
        asc,
        queueId,
        limit,
      };
    },
  },
  mounted() {
    // Set default dates: endDate = today, startDate = one month ago
    const today = new Date().toISOString().slice(0, 10);
    this.endDate = today;
    const oneMonthAgo = new DateModel(today).substractMonths(1).toString();
    this.startDate = oneMonthAgo;
  },
  watch: {
    changeData: {
      immediate: true,
      deep: true,
      async handler(oldData, newData) {
        if (
          oldData &&
          newData &&
          (oldData.product !== newData.product ||
            oldData.asc !== newData.asc ||
            oldData.limit !== newData.limit)
        ) {
          this.page = 1;
          this.refresh();
        }
      },
    },
    store: {
      immediate: true,
      deep: true,
      async handler() {
        await this.getUserType();
        await this.getUser();
      },
    },
    productConsumptionsIn: {
      immediate: true,
      deep: true,
      async handler() {
        this.productConsumptions = this.productConsumptionsIn;
        this.updatePaginationData();
      },
    },
    newProductConsumptions: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.newProductConsumptions) {
          this.productConsumptions = this.newProductConsumptions;
          this.updatePaginationData();
        }
      },
    },
  },
};
</script>

<template>
  <div
    id="productConsumptions-management"
    class="row"
    v-if="
      showProductConsumptionManagement === true &&
      toggles['products-stock.products.view-consumption']
    "
  >
    <div class="col">
      <div id="attention-management-component">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
        <div v-if="!loading">
          <div>
            <div class="my-2 row metric-card">
              <div class="col-12">
                <span class="metric-card-subtitle">
                  <span class="form-check-label" @click="showAdd()">
                    <i class="bi bi-arrow-up-circle-fill"></i>
                    {{ $t('businessProductStockAdmin.addConsuption') }}
                    <i
                      :class="`bi ${showAddOption === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"
                    ></i>
                  </span>
                </span>
              </div>
              <div v-if="showAddOption">
                <div class="row mt-1">
                  <div class="col-4 text-label">
                    {{ $t('businessProductStockAdmin.replacementSel') }}
                  </div>
                  <div class="col-8">
                    <select
                      class="btn btn-sm btn-light fw-bold text-dark select"
                      v-model="selectedProductReplacement"
                    >
                      <option
                        v-for="rep in productReplacements"
                        :key="rep.id"
                        :value="rep"
                        id="select-replacement"
                      >
                        {{ rep.replacementActualLevel }}
                        {{ $t(`productMeasuresTypesShort.${product.productMeasureType}`) }} - ({{
                          getDate(rep.replacementExpirationDate)
                        }})
                      </option>
                    </select>
                  </div>
                </div>
                <div class="row mt-1">
                  <div class="col-4 text-label">
                    {{ $t('businessProductStockAdmin.amount') }}
                  </div>
                  <div class="col-8">
                    <input
                      :min="0"
                      type="number"
                      class="form-control"
                      v-model="newProductConsumption.consumptionAmount"
                      v-bind:class="{ 'is-invalid': consumptionAmountError }"
                      placeholder="1"
                    />
                  </div>
                </div>
                <div class="row mt-1">
                  <div class="col-4 text-label">
                    {{ $t('businessProductStockAdmin.consumptionDate') }}
                  </div>
                  <div class="col-8">
                    <input
                      type="date"
                      class="form-control"
                      v-model="newProductConsumption.consumptionDate"
                      v-bind:class="{ 'is-invalid': consumptionDateError }"
                      placeholder="1"
                    />
                  </div>
                </div>
                <div class="row m-1">
                  <div class="col-12 text-label">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="add(newProductConsumption)"
                    >
                      {{ $t('dashboard.add') }} <i class="bi bi-save"></i>
                    </button>
                  </div>
                </div>
                <div class="row g-1 errors" id="feedback" v-if="errorsAdd.length > 0">
                  <Warning>
                    <template v-slot:message>
                      <li v-for="(error, index) in errorsAdd" :key="index">
                        {{ $t(error) }}
                      </li>
                    </template>
                  </Warning>
                </div>
              </div>
            </div>
            <div class="my-1 row metric-card compact-filters-card">
              <div class="col-12">
                <div class="d-flex align-items-center justify-content-between">
                  <span class="metric-card-subtitle">
                    <span class="form-check-label metric-keyword-subtitle" @click="showFilters()">
                      <i class="bi bi-search"></i> {{ $t('dashboard.aditionalFilters') }}
                      <i
                        :class="`bi ${
                          showFilterOptions === true ? 'bi-chevron-up' : 'bi-chevron-down'
                        }`"
                      ></i>
                    </span>
                  </span>
                  <button
                    class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2 py-1"
                    @click="clear()"
                  >
                    <i class="bi bi-eraser-fill"></i>
                  </button>
                </div>
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
            <div
              class="my-2 d-flex align-items-center justify-content-center flex-wrap gap-2 compact-pagination-info"
            >
              <span class="badge bg-secondary px-2 py-1 compact-badge"
                >{{ $t('businessAdmin.listResult') }} {{ this.counter }}
              </span>
              <span class="badge bg-secondary px-2 py-1 compact-badge">
                {{ $t('page') }} {{ this.page }} {{ $t('of') }} {{ this.totalPages }}
              </span>
              <select
                class="btn btn-sm btn-light fw-bold text-dark select compact-select"
                v-model="limit"
              >
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
            <div v-if="this.productConsumptions && this.productConsumptions.length > 0">
              <div
                class="row"
                v-for="(product, index) in productConsumptions"
                :key="`productConsumptions-${index}`"
              >
                <ProductConsumptionDetailsCard
                  :show="true"
                  :details-opened="false"
                  :product="product"
                >
                </ProductConsumptionDetailsCard>
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
    v-if="
      showProductConsumptionManagement === true &&
      !toggles['products-stock.products.view-consumption']
    "
  >
    <Message
      :icon="'bi-graph-up-arrow'"
      :title="$t('dashboard.message.1.title')"
      :content="$t('dashboard.message.1.content')"
    />
  </div>
</template>

<style scoped>
/* Modern Metric Card - Compact and beautiful */
.metric-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 0.75rem;
  margin: 0.5rem 0;
  border-radius: 0.625rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.metric-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.12);
}

/* Compact Filters Card - Even more compact */
.compact-filters-card {
  padding: 0.5rem 0.75rem !important;
  margin: 0.375rem 0 !important;
}

/* Modern Filter Card - Compact */
.filter-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 0.5rem 0.75rem;
  margin: 0.375rem 0;
  border-radius: 0.625rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.filter-card:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.12);
}

/* Modern Typography */
.metric-card-title {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2rem;
  align-items: center;
  justify-content: center;
  display: flex;
  color: rgba(0, 0, 0, 0.75);
  letter-spacing: -0.01em;
}

.metric-card-comment {
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.2rem;
  color: rgba(0, 0, 0, 0.65);
}

.metric-card-number {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.02em;
}

.metric-card-subtitle {
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.2rem;
  color: rgba(0, 0, 0, 0.7);
}

/* Modern Keyword Subtitle - Interactive */
.metric-keyword-subtitle {
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--azul-turno);
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
}

.metric-keyword-subtitle:hover {
  background: rgba(0, 74, 173, 0.08);
  color: var(--azul-turno);
}

.metric-keyword-subtitle i {
  font-size: 0.875rem;
}

/* Modern Keyword Tags */
.metric-keyword-tag {
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.7);
}

.metric-keyword-tag-selected {
  font-size: 0.6875rem;
  font-weight: 600;
  background-color: var(--azul-turno) !important;
  color: #ffffff !important;
}

.metric-keyword-tag:hover {
  background-color: rgba(0, 74, 173, 0.1);
  color: var(--azul-turno);
}

/* Modern Select - Compact and beautiful */
.select {
  border-radius: 0.5rem;
  border: 1.5px solid rgba(0, 0, 0, 0.1);
  background: #ffffff;
  transition: all 0.2s ease;
  font-size: 0.8125rem;
  font-weight: 500;
}

.select:hover {
  border-color: rgba(0, 74, 173, 0.3);
  box-shadow: 0 1px 3px rgba(0, 74, 173, 0.1);
}

.select:focus {
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);
  outline: none;
}

/* Modern Form Controls */
.metric-controls {
  border-radius: 0.5rem;
  border: 1.5px solid rgba(0, 0, 0, 0.1);
  font-size: 0.8125rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.metric-controls:hover {
  border-color: rgba(0, 74, 173, 0.3);
}

.metric-controls:focus {
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);
  outline: none;
}

.form-control {
  font-size: 0.9rem;
  border-radius: 0.5rem;
  border: 1.5px solid rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.form-control:hover {
  border-color: rgba(0, 74, 173, 0.3);
}

.form-control:focus {
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);
  outline: none;
}

/* Modern Filter Buttons */
.metric-filters {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.375rem 0.75rem;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.metric-filters:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.metric-filters:active {
  transform: translateY(0);
}

/* Modern Badges */
.badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  letter-spacing: -0.01em;
}

/* Compact Pagination Info - Centered */
.compact-pagination-info {
  gap: 0.5rem;
}

.compact-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  letter-spacing: -0.01em;
}

.compact-select {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

/* Modern Buttons - Ensure consistency */
.btn {
  transition: all 0.2s ease;
  font-weight: 600;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .metric-card {
    padding: 0.625rem;
    margin: 0.375rem 0;
  }

  .filter-card {
    padding: 0.375rem 0.625rem;
    margin: 0.25rem 0;
  }

  .metric-card-title {
    font-size: 0.8125rem;
  }

  .metric-card-number {
    font-size: 1.125rem;
  }

  .metric-keyword-subtitle {
    font-size: 0.75rem;
  }
}
</style>
