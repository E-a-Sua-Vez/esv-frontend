<script>
import Spinner from '../../../components/common/Spinner.vue';
import Alert from '../../../components/common/Alert.vue';
import Warning from '../../../components/common/Warning.vue';
import Popper from "vue3-popper";
import Message from '../../common/Message.vue';
import SimpleDownloadCard from '../../reports/SimpleDownloadCard.vue';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { globalStore } from '../../../stores';
import { getProductsReplacementDetails } from '../../../application/services/query-stack';
import { addProductReplacement } from '../../../application/services/product';
import ProductReplacementDetailsCard from '../common/ProductReplacementDetailsCard.vue';

export default {
  name: 'ProductReplacementManagement',
  components: { Message, SimpleDownloadCard, Spinner, Popper, Alert, Warning, ProductReplacementDetailsCard },
  props: {
    showProductReplacementManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    product: { type: Object, default: {} },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    queues: { type: Array, default: undefined },
    productReplacementsIn: { type: Array, default: [] }
  },
  emits: ['getProductReplacements'],
  data() {
    const store = globalStore();
    return {
      loading: false,
      alertError: '',
      productReplacements: [],
      newProductReplacements: [],
      contactTypes: [],
      contactResultTypes: [],
      newProductReplacement: {},
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
      replacementAmountError: false,
      replacementDateError: false,
      replacementExpirationDateError: false
    }
  },
  beforeMount() { },
  methods: {
    setPage(pageIn) {
      this.page = pageIn;
    },
    async clear() {
      this.asc = true;
      this.searchText = undefined;
      this.limit = 10;
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
        this.newProductReplacements = await getProductsReplacementDetails(this.product.productId, this.page, this.limit, this.asc);
        this.updatePaginationData();
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    showFilters() {
      this.showFilterOptions = !this.showFilterOptions
    },
    showAdd() {
      this.showAddOption = !this.showAddOption;
      this.newProductReplacement = {
        replacementAmount: 0,
        price: 0,
        replacementDate: new Date().toISOString().slice(0,10),
        replacementExpirationDate: new Date().toISOString().slice(0,10),
        nextReplacementDate: new Date().toISOString().slice(0,10),
      }
    },
    updatePaginationData() {
      if (this.productReplacements && this.productReplacements.length > 0) {
        const { counter } = this.productReplacements[0];
        this.counter = counter;
        const total = counter / this.limit;
        const totalB = Math.trunc(total);
        this.totalPages = totalB <= 0 ? 1 : counter % this.limit === 0 ? totalB : totalB + 1;
      } else {
        this.counter = 0;
        this.totalPages = 0;
      }
    },
    validateAdd(newProductReplacement) {
      this.errorsAdd = [];
      if (!newProductReplacement.replacementAmount || newProductReplacement.replacementAmount <= 0) {
        this.replacementAmountError = true;
        this.errorsAdd.push('businessProductStockAdmin.validate.replacementAmount');
      } else {
        this.replacementAmountError = false;
      }
      if (!newProductReplacement.replacementDate || newProductReplacement.replacementDate.length === 0) {
        this.replacementDateError = true;
        this.errorsAdd.push('businessProductStockAdmin.validate.replacementDate');
      } else {
        this.replacementDateError = false;
      }
      if(this.errorsAdd.length === 0) {
        return true;
      }
      return false;
    },
    async add(newProductReplacement) {
      try {
        this.loading = true;
        if (this.validateAdd(newProductReplacement)) {
          newProductReplacement.productId = this.product.productId;
          newProductReplacement.commerceId = this.product.commerceId;
          newProductReplacement.productCode = this.product.productCode;
          newProductReplacement.replacedBy = this.user.email;
          await addProductReplacement(newProductReplacement)
          setTimeout(async () => {
            await refresh();
          }, 5000)
          this.showAddOption = false;
          this.newProductReplacement = {}
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
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        if (this.client && (this.client.userIdNumber || this.client.userEmail)) {
          this.searchText = this.client.userIdNumber || this.client.userEmail;
        }
        const result = await getProductsReplacementDetails(this.product.productId, undefined, undefined, this.asc);
        if (result && result.length > 0) {
          csvAsBlob = jsonToCsv(result);
        }
        const blobURL = URL.createObjectURL(new Blob([csvAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `product-replacement-details-${this.commerce.tag}-${this.startDate}-${this.endDate}.csv`;
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
    productReplacementsIn: {
      immediate: true,
      deep: true,
      async handler() {
        this.productReplacements = this.productReplacementsIn;
        this.updatePaginationData();
      }
    },
    newProductReplacements: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.newProductReplacements && this.newProductReplacements.length > 0) {
          this.productReplacements = this.newProductReplacements;
          this.updatePaginationData();
        }
      }
    }
  }
}
</script>

<template>
  <div id="productReplacements-management" class="row" v-if="showProductReplacementManagement === true && toggles['products-stock.products.view-consumption']">
    <div class="col">
      <div id="attention-management-component">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
        <div v-if="!loading">
          <div>
            <div class="my-2 row metric-card">
              <div class="col-12">
                <span class="">
                  <span class="form-check-label" @click="showAdd()">
                    <i class="bi bi-arrow-down-circle-fill"></i> {{ $t("businessProductStockAdmin.addReplacement") }}
                    <i :class="`bi ${showAddOption === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i> </span>
                </span>
              </div>
              <div v-if="showAddOption">
                <div class="row mt-1">
                  <div class="col-4 text-label">
                    {{ $t("businessProductStockAdmin.amount") }}
                  </div>
                  <div class="col-8">
                    <input
                      :min="0"
                      type="number"
                      class="form-control"
                      v-model="newProductReplacement.replacementAmount"
                      v-bind:class="{ 'is-invalid': replacementAmountError }"
                      placeholder="1">
                  </div>
                </div>
                <div class="row mt-1">
                  <div class="col-4 text-label">
                    {{ $t("businessProductStockAdmin.price") }}
                  </div>
                  <div class="col-8">
                    <input
                      :min="0"
                      type="number"
                      class="form-control"
                      v-model="newProductReplacement.price"
                      placeholder="1">
                  </div>
                </div>
                <div class="row mt-1">
                  <div class="col-4 text-label">
                    {{ $t("businessProductStockAdmin.date") }}
                  </div>
                  <div class="col-8">
                    <input
                      type="date"
                      class="form-control"
                      v-model="newProductReplacement.replacementDate"
                      v-bind:class="{ 'is-invalid': replacementDateError }"
                      placeholder="1">
                  </div>
                </div>
                <div class="row mt-1">
                  <div class="col-4 text-label">
                    {{ $t("businessProductStockAdmin.expireDate") }}
                  </div>
                  <div class="col-8">
                    <input
                      type="date"
                      class="form-control"
                      v-model="newProductReplacement.replacementExpirationDate"
                      v-bind:class="{ 'is-invalid': replacementExpirationDateError }"
                      placeholder="1">
                  </div>
                </div>
                <div class="row mt-1">
                  <div class="col-4 text-label">
                    {{ $t("businessProductStockAdmin.nextDate") }}
                  </div>
                  <div class="col-8">
                    <input
                      type="date"
                      class="form-control"
                      v-model="newProductReplacement.nextReplacementDate"
                      placeholder="1">
                  </div>
                </div>
                <div class="row mt-1">
                  <div class="col-4 text-label">
                    {{ $t("businessProductStockAdmin.code") }}
                  </div>
                  <div class="col-8">
                    <input
                      type="text"
                      class="form-control"
                      v-model="newProductReplacement.code"
                      placeholder="Code/Batch">
                  </div>
                </div>
                <div class="row m-1">
                  <div class="col-12 text-label">
                    <button class="btn btn-sm btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="add(newProductReplacement)"
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
            <SimpleDownloadCard
              :download="toggles['products-stock.reports.replacement-details']"
              :title="$t('businessProductStockAdmin.reports.replacement-details.title')"
              :showTooltip="true"
              :description="$t('businessProductStockAdmin.reports.replacement-details.description')"
              :icon="'bi-file-earmark-spreadsheet'"
              @download="exportToCSV"
              :canDownload="toggles['products-stock.reports.replacement-details'] === true"
            ></SimpleDownloadCard>
            <div class="my-2 row metric-card">
              <div class="col-12">
                <span class="metric-card-subtitle">
                  <span class="form-check-label metric-keyword-subtitle mx-1" @click="showFilters()"> <i class="bi bi-search"></i> {{ $t("dashboard.aditionalFilters") }}  <i :class="`bi ${showFilterOptions === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i> </span>
                </span>
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2"
                  @click="clear()">
                  <span><i class="bi bi-eraser-fill"></i></span>
                </button>
              </div>
              <div v-if="showFilterOptions">
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
            <div v-if="this.productReplacements && this.productReplacements.length > 0">
              <div class="row" v-for="(product, index) in productReplacements" :key="`productReplacements-${index}`">
                <ProductReplacementDetailsCard
                  :show="true"
                  :detailsOpened="false"
                  :product="product"
                >
                </ProductReplacementDetailsCard>
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
  <div v-if="showProductReplacementManagement === true && !toggles['products-stock.products.view-consumption']">
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
.metric-card-subtitle {
  font-size: .8rem;
  font-weight: 500;
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
.text-label {
  font-size: .9rem;
  line-height: .9rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.form-control {
  font-size: .9rem;
}
</style>