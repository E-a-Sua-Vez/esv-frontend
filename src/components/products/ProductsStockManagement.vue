<script>
import Spinner from '../common/Spinner.vue';
import Popper from "vue3-popper";
import Message from '../common/Message.vue';
import SimpleDownloadCard from '../reports/SimpleDownloadCard.vue';
import jsonToCsv from '../../shared/utils/jsonToCsv';
import { getProductsDetails } from '../../application/services/query-stack';
import ProductDetailsCard from './common/ProductDetailsCard.vue';
import { getPermissions } from '../../application/services/permissions';
import { globalStore } from '../../stores';
import SimpleDownloadButton from '../reports/SimpleDownloadButton.vue';

export default {
  name: 'ProductsStockManagement',
  components: { Message, SimpleDownloadCard, Spinner, Popper, ProductDetailsCard, SimpleDownloadButton },
  props: {
    showProductStockManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    queues: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    business: { type: Object, default: undefined }
  },
  data() {
    const store = globalStore();
    return {
      loading: false,
      counter: 0,
      products: undefined,
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
      limit: 10
    }
  },
  async beforeMount() {
    this.productToggles = await getPermissions('products');
  },
  methods: {
    async refresh() {
      try {
        this.loading = true;
        let commerceIds = [this.commerce.id];
        this.products = await getProductsDetails(this.business.id, this.commerce.id, undefined, undefined, commerceIds,
          this.page, this.limit, this.expired, this.replacement, this.productStatus, this.searchText, this.asc);
        if (this.products && this.products.length > 0) {
          const { counter } = this.products[0];
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
    },
    async checkReplacement(event) {
      if (event.target.checked) {
        this.replacement = true;
      } else {
        this.replacement = false;
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
      this.showFilterOptions = !this.showFilterOptions
    },
    async exportToCSV() {
      try {
        this.loading = true;
        let csvAsBlob = [];
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        const result = await getProductsDetails(this.business.id, this.commerce.id, undefined, undefined, commerceIds,
          undefined, undefined, this.expired, this.replacement, this.productStatus, this.searchText, this.asc);
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
    }
  },
  computed: {
    changeData() {
      const { page, commerce, expired, replacement, productStatus, asc, limit } = this;
      return {
        page, expired, commerce, replacement, productStatus, asc, limit
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
          (oldData.expired !== newData.expired ||
          oldData.productStatus !== newData.productStatus ||
          oldData.replacement !== newData.replacement ||
          oldData.asc !== newData.asc ||
          oldData.limit !== newData.limit)
        ) {
          this.page = 1;
        }
        this.refresh();
      }
    }
  }
}
</script>

<template>
  <div id="products-management" class="row" v-if="showProductStockManagement === true && toggles['products-stock.products.view']">
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
                  :hidden="!productToggles['products.admin.view']">
                  <i class="bi bi-database-gear"></i> {{ $t("businessProductStockAdmin.admin") }}
                </button>
                <SimpleDownloadButton
                  :download="toggles['products-stock.reports.details']"
                  :showTooltip="true"
                  :description="$t('businessProductStockAdmin.reports.details.description')"
                  :icon="'bi-file-earmark-spreadsheet'"
                  @download="exportToCSV"
                  :canDownload="toggles['products-stock.reports.details'] === true"
                ></SimpleDownloadButton>
              </div>
            </div>
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
                <div class="m-1">
                  <div class="row">
                    <div class="col-10">
                      <input
                        min="1"
                        max="50"
                        type="text"
                        class="form-control"
                        v-model="searchText"
                        :placeholder="$t('businessProductStockAdmin.search')">
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
                <div class="col-12 col-md my-1 filter-card">
                  <input type="radio" class="btn btn-check btn-sm" v-model="productStatus" value="GOOD" name="productStatus-type" id="good-replacement" autocomplete="off">
                  <label class="btn" for="good-replacement"> <i :class="`bi bi-battery-full green-icon h5`"></i> </label>
                  <input type="radio" class="btn btn-check btn-sm" v-model="productStatus" value="MEDIUM" name="productStatus-type" id="medium-replacement" autocomplete="off">
                  <label class="btn" for="medium-replacement"> <i :class="`bi bi-battery-half yellow-icon h5`"></i> </label>
                  <input type="radio" class="btn btn-check btn-sm" v-model="productStatus" value="LOW" name="productStatus-type" id="low-replacement" autocomplete="off">
                  <label class="btn" for="low-replacement"> <i :class="`bi bi-battery red-icon h5`"></i> </label>
                  <Popper
                    v-if="true"
                    :class="'dark'"
                    arrow
                    disableClickAway
                    :content="$t(`dashboard.tracing.filters.contactResult`)">
                    <i class='bi bi-info-circle-fill h7 m-2'></i>
                  </Popper>
                </div>
                <div class="row">
                  <div class="col">
                    <div class="form-check form-switch centered">
                      <input class="form-check-input m-1" :class="expired === false ? 'bg-danger' : ''" type="checkbox" name="expired" id="expired" v-model="expired" @click="checkContactable($event)">
                      <label class="form-check-label metric-card-subtitle" for="expired">{{ $t("businessProductStockAdmin.expired") }}</label>
                    </div>
                  </div>
                  <div class="col">
                    <div class="form-check form-switch centered">
                      <input class="form-check-input m-1" :class="replacement === false ? 'bg-danger' : ''" type="checkbox" name="replacement" id="replacement"  v-model="replacement" @click="checkContacted($event)">
                      <label class="form-check-label metric-card-subtitle" for="replacement">{{ $t("businessProductStockAdmin.replacement") }}</label>
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
            <div v-if="products && products.length > 0">
              <div class="row" v-for="(product, index) in products" :key="`product-${index}`">
                <ProductDetailsCard
                  :show="true"
                  :product="product"
                  :commerce="this.commerce"
                  :toggles="this.toggles"
                  :queues="this.queues"
                  :commerces="this.commerces"
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
  <div v-if="showProductStockManagement === true && !toggles['products-stock.products.view']">
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
  border: 1px solid var(--gris-default);
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
  border: 1px solid var(--gris-clear);
}
</style>