<script>
import Spinner from '../../common/Spinner.vue';
import Alert from '../../common/Alert.vue';
import Warning from '../../common/Warning.vue';
import Popper from "vue3-popper";
import Message from '../../common/Message.vue';
import SimpleDownloadCard from '../../reports/SimpleDownloadCard.vue';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { globalStore } from '../../../stores';
import { getProductsConsumptionsDetails } from '../../../application/services/query-stack';
import { addProductConsumption, getActiveReplacementsByProductId, getProductByCommerce } from '../../../application/services/product';
import { getDate } from '../../../shared/utils/date';
import ProductReplacementDetailsCard from '../common/ProductReplacementDetailsCard.vue';
import ProductConsumptionDetailsCard from '../common/ProductConsumptionDetailsCard.vue';

export default {
  name: 'ProductAttentionManagement',
  components: { Message, SimpleDownloadCard, Spinner, Popper, Alert, Warning, ProductReplacementDetailsCard, ProductConsumptionDetailsCard },
  props: {
    showProductAttentionManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    attention: { type: Object, default: {} },
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    queues: { type: Array, default: undefined },
    productAttentionsIn: { type: Array, default: [] }
  },
  emits: ['getProductConsuptions'],
  data() {
    const store = globalStore();
    return {
      loading: false,
      alertError: '',
      productAttentions: [],
      newProductConsumptions: [],
      products: [],
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
      consumptionProductId: false,
      consumptionReplacementId: false,
      replacementExpirationDateError: false,
      selectedProductReplacement: {},
      selectedProduct: {},
      startDate: undefined,
      endDate: undefined
    }
  },
  async beforeMount() {},
  methods: {
    setPage(pageIn) {
      this.page = pageIn;
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    async clear() {
      this.asc = true;
      this.searchText = undefined;
      this.limit = 10;
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
        let commerceIds = [this.commerce.id];
        this.newProductConsumptions = await getProductsConsumptionsDetails(commerceIds, undefined, this.page, this.limit, this.asc, undefined, undefined, this.attention.attentionId);
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
      if (this.commerce && this.commerce.id && this.products.length === 0) {
        this.products = await getProductByCommerce(this.commerce.id);
      }
      this.showAddOption = !this.showAddOption;
      this.newProductConsumption = {
        consumptionDate: new Date().toISOString().slice(0,10),
      }
    },
    updatePaginationData() {
      if (this.productAttentions && this.productAttentions.length > 0) {
        const { counter } = this.productAttentions[0];
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
      if (!this.selectedProduct || !this.selectedProduct.id) {
        this.consumptionProductId = true;
        this.errorsAdd.push('businessProductStockAdmin.validate.product');
      } else {
        this.consumptionProductId = false;
      }
      if (!this.selectedProductReplacement || !this.selectedProductReplacement.id) {
        this.consumptionReplacementId = true;
        this.errorsAdd.push('businessProductStockAdmin.validate.productReplacement');
      } else {
        this.consumptionReplacementId = false;
      }
      if (newProductConsumption.consumptionAmount === undefined ||
         newProductConsumption.consumptionAmount <= 0) {
        this.consumptionAmountError = true;
        this.errorsAdd.push('businessProductStockAdmin.validate.consumptionAmount');
      } else {
        this.consumptionAmountError = false;
      }
      if (newProductConsumption.consumptionAmount > this.selectedProductReplacement.replacementActualLevel) {
        this.consumptionAmountError = true;
        this.errorsAdd.push('businessProductStockAdmin.validate.consumptionLevel');
      } else {
        this.consumptionAmountError = false;
      }
      if (newProductConsumption.consumptionDate === undefined || newProductConsumption.consumptionDate.length === 0) {
        this.consumptionDateError = true;
        this.errorsAdd.push('businessProductStockAdmin.validate.consumptionDate');
      } else {
        this.consumptionDateError = false;
      }
      if(this.errorsAdd.length === 0) {
        return true;
      }
      return false;
    },
    async add(newProductConsumption) {
      try {
        this.loading = true;
        if (this.validateAdd(newProductConsumption)) {
          newProductConsumption.productId = this.selectedProduct.id;
          newProductConsumption.comsumptionAttentionId = this.attention.attentionId;
          newProductConsumption.commerceId = this.selectedProduct.commerceId;
          newProductConsumption.productCode = this.selectedProduct.productCode;
          newProductConsumption.consumedBy = this.user.email;
          newProductConsumption.productReplacementId = this.selectedProductReplacement.id;
          await addProductConsumption(newProductConsumption);
          setTimeout(async () => {
            this.$emit('getProductConsuptions');
            await this.refresh();
          }, 5000)
          this.showAddOption = false;
          this.newProductConsumption = {}
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
        let commerceIds = [this.commerce.id];
        const result = await getProductsConsumptionsDetails(commerceIds, undefined, undefined, undefined, this.asc, this.startDate, this.endDate, this.attention.attentionId);
        if (result && result.length > 0) {
          csvAsBlob = jsonToCsv(result);
        }
        const blobURL = URL.createObjectURL(new Blob([csvAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `product-attention-details-${this.commerce.tag}.csv`;
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
      const date = new Date().toISOString().slice(0,10);
      const [ year, month, day ] = date.split('-');
      this.startDate = `${year}-${month}-${day}`;
      this.endDate = `${year}-${month}-${day}`;
      await this.refresh();
    },
    async getCurrentMonth() {
      const date = new Date().toISOString().slice(0,10);
      const [ year, month, day ] = date.split('-');
      this.startDate = `${year}-${month}-01`;
      this.endDate = `${year}-${month}-${day}`;
      await this.refresh();
    },
    async getLastMonth() {
      const date = new Date().toISOString().slice(0,10);
      this.startDate = new Date(new Date(new Date(date).setMonth(new Date(date).getMonth() - 1)).setDate(0)).toISOString().slice(0, 10);
      const pastFromDate = new Date(new Date(new Date(date).setMonth(new Date(date).getMonth() - 1)).setDate(0));
      this.endDate = new Date(pastFromDate.getFullYear(), pastFromDate.getMonth() + 2, 0).toISOString().slice(0, 10);
      await this.refresh();
    },
    async getLastThreeMonths() {
      const date = new Date().toISOString().slice(0,10);
      this.startDate = new Date(new Date(new Date(date).setMonth(new Date(date).getMonth() - 3)).setDate(0)).toISOString().slice(0, 10);
      const pastFromDate = new Date(new Date(new Date(date).setMonth(new Date(date).getMonth() - 1)).setDate(0));
      this.endDate = new Date(pastFromDate.getFullYear(), pastFromDate.getMonth() + 2, 0).toISOString().slice(0, 10);
      await this.refresh();
    }
  },
  computed: {
    changeData() {
      const { page, asc, queueId, limit } = this;
      return {
        page, asc, queueId, limit
      }
    }
  },
  watch: {
    changeData: {
      immediate: true,
      deep: true,
      async handler(oldData, newData) {
        if (
          (oldData && newData) &&
          (oldData.product !== newData.product ||
          oldData.asc !== newData.asc ||
          oldData.limit !== newData.limit)
        ) {
          this.page = 1;
          this.refresh();
        }
      }
    },
    store: {
      immediate: true,
      deep: true,
      async handler() {
        await this.getUserType();
        await this.getUser();
      }
    },
    productAttentionsIn: {
      immediate: true,
      deep: true,
      async handler() {
        this.productAttentions = this.productAttentionsIn;
        this.updatePaginationData();
      }
    },
    newProductConsumptions: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.newProductConsumptions) {
          this.productAttentions = this.newProductConsumptions;
          this.updatePaginationData();
        }
      }
    },
    selectedProduct: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.selectedProduct && this.selectedProduct.id) {
          this.productReplacements = await getActiveReplacementsByProductId(this.selectedProduct.id);
        }
      }
    }
  }
}
</script>

<template>
  <div id="productAttentions-management" class="row" v-if="showProductAttentionManagement === true && toggles['products-stock.products.view-attention']">
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
                    <i class="bi bi-arrow-up-circle-fill"></i> {{ $t("businessProductStockAdmin.addConsuption") }}
                    <i :class="`bi ${showAddOption === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i> </span>
                </span>
              </div>
              <div v-if="showAddOption">
                <div class="row mt-1">
                  <div class="col-4 text-label">
                    {{ $t("businessProductStockAdmin.product") }}
                  </div>
                  <div class="col-8">
                    <select class="btn btn-sm btn-light fw-bold text-dark select" v-model="selectedProduct">
                      <option v-for="prod in products" :key="prod.id" :value="prod" id="select-product"> {{ prod.name }} </option>
                    </select>
                  </div>
                </div>
                <div class="row mt-1">
                  <div class="col-4 text-label">
                    {{ $t("businessProductStockAdmin.replacementSel") }}
                  </div>
                  <div class="col-8">
                    <select class="btn btn-sm btn-light fw-bold text-dark select" v-model="selectedProductReplacement">
                      <option v-for="rep in productReplacements" :key="rep.id" :value="rep" id="select-replacement">{{ rep.replacementActualLevel }} {{ $t(`productMeasuresTypesShort.${selectedProduct.measureType}`) }} - ({{ getDate(rep.replacementExpirationDate) }})</option>
                    </select>
                  </div>
                </div>
                <div class="row mt-1">
                  <div class="col-4 text-label">
                    {{ $t("businessProductStockAdmin.amount") }}
                  </div>
                  <div class="col-8">
                    <input
                      :min="0"
                      type="number"
                      class="form-control"
                      v-model="newProductConsumption.consumptionAmount"
                      v-bind:class="{ 'is-invalid': consumptionAmountError }"
                      placeholder="1">
                  </div>
                </div>
                <div class="row mt-1">
                  <div class="col-4 text-label">
                    {{ $t("businessProductStockAdmin.consumptionDate") }}
                  </div>
                  <div class="col-8">
                    <input
                      type="date"
                      class="form-control"
                      v-model="newProductConsumption.consumptionDate"
                      v-bind:class="{ 'is-invalid': consumptionDateError }"
                      placeholder="1">
                  </div>
                </div>
                <div class="row m-1">
                  <div class="col-12 text-label">
                    <button class="btn btn-sm btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="add(newProductConsumption)"
                      >
                      {{ $t("dashboard.add") }} <i class="bi bi-save"></i>
                    </button>
                  </div>
                </div>
                <div class="row g-1 errors" id="feedback" v-if="(errorsAdd.length > 0)">
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
            <div>
              <SimpleDownloadCard
                :download="toggles['products-stock.reports.consumption-details']"
                :title="$t('businessProductStockAdmin.reports.consumption-details.title')"
                :showTooltip="true"
                :description="$t('businessProductStockAdmin.reports.consumption-details.description')"
                :icon="'bi-file-earmark-spreadsheet'"
                @download="exportToCSV"
                :canDownload="toggles['products-stock.reports.consumption-details'] === true"
              ></SimpleDownloadCard>
              <div class="my-2 row metric-card">
                <div class="col-12">
                  <span class="metric-card-subtitle">
                    <span class="form-check-label metric-keyword-subtitle mx-1" @click="showFilters()"> <i class="bi bi-search"></i> {{ $t("dashboard.aditionalFilters") }}  <i :class="`bi ${showFilterOptions === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i> </span>
                  </span>
                  <button
                    class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-1 mx-1"
                    @click="clear()">
                    <span><i class="bi bi-eraser-fill"></i></span>
                  </button>
                </div>
                <div v-if="showFilterOptions">
                  <div class="row my-1">
                    <div class="col-3">
                      <button class="btn btn-dark rounded-pill px-2 metric-filters" @click="getToday()" :disabled="loading">{{ $t("dashboard.today") }}</button>
                    </div>
                    <div class="col-3">
                      <button class="btn  btn-dark rounded-pill px-2 metric-filters" @click="getCurrentMonth()" :disabled="loading">{{ $t("dashboard.thisMonth") }}</button>
                    </div>
                    <div class="col-3">
                      <button class="btn  btn-dark rounded-pill px-2 metric-filters" @click="getLastMonth()" :disabled="loading">{{ $t("dashboard.lastMonth") }}</button>
                    </div>
                    <div class="col-3">
                      <button class="btn btn-dark rounded-pill px-2 metric-filters" @click="getLastThreeMonths()" :disabled="loading">{{ $t("dashboard.lastThreeMonths") }}</button>
                    </div>
                  </div>
                  <div class="m-1">
                    <div class="row">
                      <div class="col-5">
                        <input id="startDate" class="form-control metric-controls" type="date" v-model="startDate"/>
                      </div>
                      <div class="col-5">
                        <input id="endDate" class="form-control metric-controls" type="date" v-model="endDate"/>
                      </div>
                      <div class="col-2">
                        <button
                          class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                          @click="refresh()">
                          <span><i class="bi bi-search"></i></span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-12">
                      <div class="form-check form-switch centered">
                        <input class="form-check-input m-1" :class="asc === false ? 'bg-danger' : ''" type="checkbox" name="asc" id="asc" v-model="asc" @click="checkAsc($event)">
                        <label class="form-check-label metric-card-subtitle" for="asc">{{ asc ? $t("dashboard.asc") :  $t("dashboard.desc") }}</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="my-3">
              <span class="badge bg-secondary px-3 py-2 m-1">{{ $t("businessAdmin.listResult") }} {{ this.counter }} </span>
              <span class="badge bg-secondary px-3 py-2 m-1"> {{ $t("page") }} {{ this.page }} {{ $t("of") }} {{ this.totalPages }} </span>
              <select class="btn btn-sm btn-light fw-bold text-dark select mx-1" v-model="limit">
                <option v-for="lim in limits" :key="lim" :value="lim" id="select-queue">{{ lim }}</option>
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
                        :disabled="page === 1 || totalPages === 0">
                        <span aria-hidden="true"><i class="bi bi-arrow-bar-left"></i></span>
                      </button>
                    </li>
                    <li class="page-item">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="Previous"
                        @click="setPage(page - 1)"
                        :disabled="page === 1 || totalPages === 0">
                        <span aria-hidden="true">&laquo;</span>
                      </button>
                    </li>
                    <li>
                      <select class="btn btn-md btn-light fw-bold text-dark select mx-1" v-model="page" :disabled="totalPages === 0">
                        <option v-for="pag in totalPages" :key="pag" :value="pag" id="select-queue">{{ pag }}</option>
                      </select>
                    </li>
                    <li class="page-item">
                      <button class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="Next"
                        @click="setPage(page + 1)"
                        :disabled="page === totalPages || totalPages === 0">
                        <span aria-hidden="true">&raquo;</span>
                      </button>
                    </li>
                    <li class="page-item">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="First"
                        @click="setPage(totalPages)"
                        :disabled="page === totalPages || totalPages === 0">
                        <span aria-hidden="true"><i class="bi bi-arrow-bar-right"></i></span>
                      </button>
                    </li>
                  </ul>
                </nav>
            </div>
            <div v-if="this.productAttentions && this.productAttentions.length > 0">
              <div class="row" v-for="(product, index) in productAttentions" :key="`productAttentions-${index}`">
                <ProductConsumptionDetailsCard
                  :show="true"
                  :detailsOpened="false"
                  :product="product"
                >
                </ProductConsumptionDetailsCard>
              </div>
            </div>
            <div v-else>
              <Message
                :icon="'bi-graph-up-arrow'"
                :title="$t('dashboard.message.2.title')"
                :content="$t('dashboard.message.2.content')" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-if="showProductAttentionManagement === true && !toggles['products-stock.products.view-attention']">
    <Message
      :icon="'bi-graph-up-arrow'"
      :title="$t('dashboard.message.1.title')"
      :content="$t('dashboard.message.1.content')" />
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .5rem;
  margin-bottom: 0;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.filter-card {
  background-color: var(--color-background);
  padding-top: .2rem;
  padding-bottom: .2rem;
  margin: .2rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
}
.metric-card-title {
  font-size: .9rem;
  font-weight: 600;
  line-height: .8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.metric-card-comment {
  font-size: .8rem;
  font-weight: 500;
  line-height: .9rem;
}
.metric-card-number {
  font-size: 1.2rem;
  font-weight: 700;
}
.metric-keyword-tag {
  font-size: .6rem;
  font-weight: 400;
  cursor: pointer;
}
.metric-keyword-tag-selected {
  font-size: .6rem;
  font-weight: 400;
  background-color: var(--azul-es) !important;
}
.metric-keyword-tag:hover {
  font-size: .6rem;
  font-weight: 400;
  cursor: pointer;
  background-color: var(--azul-es) !important;
}
.metric-keyword-subtitle {
  font-size: .8rem;
  font-weight: 500;
  cursor: pointer;
}
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
.form-control {
  font-size: .9rem;
}
</style>