<script>
import Spinner from '../../common/Spinner.vue';
import Alert from '../../common/Alert.vue';
import Warning from '../../common/Warning.vue';
import Popper from 'vue3-popper';
import Message from '../../common/Message.vue';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { globalStore } from '../../../stores';
import { getProductsConsumptionsDetails } from '../../../application/services/query-stack';
import {
  addProductConsumption,
  getActiveReplacementsByProductId,
  getProductByCommerce,
} from '../../../application/services/product';
import { getPrescriptionSuggestionsForAttention } from '../../../application/services/prescription';
import { getDate } from '../../../shared/utils/date';
import ProductReplacementDetailsCard from '../common/ProductReplacementDetailsCard.vue';
import ProductConsumptionDetailsCard from '../common/ProductConsumptionDetailsCard.vue';
import { DateModel } from '../../../shared/utils/date.model';

export default {
  name: 'ProductAttentionManagement',
  components: {
    Message,
    Spinner,
    Popper,
    Alert,
    Warning,
    ProductReplacementDetailsCard,
    ProductConsumptionDetailsCard,
  },
  props: {
    showProductAttentionManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    attention: { type: Object, default: {} },
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    queues: { type: Array, default: undefined },
    productAttentionsIn: { type: Array, default: [] },
    showSearchFilters: { type: Boolean, default: true },
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
      endDate: undefined,
      prescriptionSuggestions: [],
      loadingSuggestions: false,
    };
  },
  async beforeMount() {
    await this.loadPrescriptionSuggestions();
  },
  methods: {
    async setPage(pageIn) {
      this.page = pageIn;
      await this.refresh();
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    clearForm() {
      this.selectedProduct = {};
      this.selectedProductReplacement = {};
      this.productReplacements = [];
      this.newProductConsumption = {
        consumptionDate: new Date().toISOString().slice(0, 10),
      };
      this.consumptionAmountError = false;
      this.consumptionDateError = false;
      this.consumptionProductId = false;
      this.consumptionReplacementId = false;
      this.errorsAdd = [];
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
          undefined,
          this.page,
          this.limit,
          this.asc,
          undefined,
          undefined,
          this.attention.attentionId
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
      if (this.commerce && this.commerce.id && this.products.length === 0) {
        this.products = await getProductByCommerce(this.commerce.id);
      }
      this.showAddOption = !this.showAddOption;
      this.newProductConsumption = {
        consumptionDate: new Date().toISOString().slice(0, 10),
      };
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
          }, 5000);
          this.showAddOption = false;
          this.clearForm();
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
          undefined,
          undefined,
          undefined,
          this.asc,
          this.startDate,
          this.endDate,
          this.attention.attentionId
        );
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
    async loadPrescriptionSuggestions() {
      const attentionId = this.attention?.attentionId || this.attention?.id;
      if (
        !this.commerce ||
        !this.commerce.id ||
        !this.attention ||
        !this.attention.clientId ||
        !attentionId
      ) {
        return;
      }
      try {
        this.loadingSuggestions = true;
        this.prescriptionSuggestions = await getPrescriptionSuggestionsForAttention(
          this.commerce.id,
          this.attention.clientId,
          attentionId
        );
        this.loadingSuggestions = false;
      } catch (error) {
        console.error('Error loading prescription suggestions:', error);
        this.loadingSuggestions = false;
      }
    },
    async quickConsumeFromPrescription(suggestion, matchingProduct) {
      try {
        this.loading = true;
        // Buscar el producto completo
        const product = this.products.find(p => p.id === matchingProduct.productId);
        if (!product) {
          // Si no está en la lista, cargarlo
          if (this.commerce && this.commerce.id) {
            this.products = await getProductByCommerce(this.commerce.id);
            const foundProduct = this.products.find(p => p.id === matchingProduct.productId);
            if (!foundProduct) {
              this.alertError = 'Producto no encontrado';
              this.loading = false;
              return;
            }
            this.selectedProduct = foundProduct;
          } else {
            this.alertError = 'Comercio no disponible';
            this.loading = false;
            return;
          }
        } else {
          this.selectedProduct = product;
        }

        // Obtener reemplazos activos
        this.productReplacements = await getActiveReplacementsByProductId(this.selectedProduct.id);
        if (!this.productReplacements || this.productReplacements.length === 0) {
          this.alertError = 'No hay reemplazos disponibles para este producto';
          this.loading = false;
          return;
        }

        // Seleccionar el primer reemplazo disponible
        this.selectedProductReplacement = this.productReplacements[0];

        // Configurar el consumo
        this.newProductConsumption = {
          consumptionAmount: suggestion.medication.quantity,
          consumptionDate: new Date().toISOString().slice(0, 10),
        };

        // Validar y agregar
        if (this.validateAdd(this.newProductConsumption)) {
          await this.add(this.newProductConsumption);
          // Recargar sugerencias después del consumo
          await this.loadPrescriptionSuggestions();
        }
        this.loading = false;
      } catch (error) {
        console.error('Error in quick consume:', error);
        this.alertError = error.response?.status || 500;
        this.loading = false;
      }
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
    // Clear form on mount
    this.clearForm();
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
    productAttentionsIn: {
      immediate: true,
      deep: true,
      async handler() {
        this.productAttentions = this.productAttentionsIn;
        this.updatePaginationData();
      },
    },
    newProductConsumptions: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.newProductConsumptions) {
          this.productAttentions = this.newProductConsumptions;
          this.updatePaginationData();
        }
      },
    },
    selectedProduct: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.selectedProduct && this.selectedProduct.id) {
          this.productReplacements = await getActiveReplacementsByProductId(
            this.selectedProduct.id
          );
          if (!this.productReplacements || this.productReplacements.length === 0) {
            this.errorsAdd.push('businessProductStockAdmin.validate.replacement');
          }
        }
      },
    },
    attention: {
      immediate: false,
      deep: true,
      async handler(newVal, oldVal) {
        // Recargar sugerencias cuando cambie la atención o el cliente
        if (
          newVal &&
          (newVal.clientId !== oldVal?.clientId ||
            newVal.attentionId !== oldVal?.attentionId ||
            newVal.id !== oldVal?.id)
        ) {
          await this.loadPrescriptionSuggestions();
        }
      },
    },
  },
};
</script>

<template>
  <div>
    <div
      id="productAttentions-management"
      class="row"
      v-if="
        showProductAttentionManagement === true && toggles['products-stock.products.view-attention']
      "
    >
    <div class="col">
      <div id="attention-management-component">
        <Spinner :show="loading || loadingSuggestions"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
        <div v-if="!loading">
          <!-- Prescription Suggestions Section -->
          <div
            v-if="
              !loadingSuggestions && prescriptionSuggestions && prescriptionSuggestions.length > 0
            "
            class="my-2 row prescription-suggestions-card"
          >
            <div class="col-12">
              <h5 class="prescription-suggestions-title">
                <i class="bi bi-prescription2"></i>
                {{ $t('businessProductStockAdmin.prescriptionSuggestions') }}
              </h5>
              <div
                v-for="(suggestion, suggestionIndex) in prescriptionSuggestions"
                :key="`suggestion-${suggestionIndex}`"
                class="prescription-suggestion-item"
              >
                <div class="prescription-medication-info">
                  <strong>{{ suggestion.medication.medicationName }}</strong>
                  <span class="badge bg-info ms-2"
                    >{{ suggestion.medication.quantity }} unidades</span
                  >
                  <span v-if="suggestion.medication.dosage" class="text-muted ms-2">
                    {{ suggestion.medication.dosage }}
                  </span>
                </div>
                <div class="prescription-products-list">
                  <div
                    v-for="(product, productIndex) in suggestion.matchingProducts"
                    :key="`product-${productIndex}`"
                    class="prescription-product-item"
                    :class="{ 'product-unavailable': !product.available }"
                  >
                    <div class="product-info">
                      <span class="product-name">{{ product.productName }}</span>
                      <span class="product-stock" :class="{ 'stock-low': !product.available }">
                        Stock: {{ product.actualLevel }}
                      </span>
                      <span v-if="product.available" class="badge bg-success ms-2">
                        <i class="bi bi-check-circle"></i> Disponible
                      </span>
                      <span v-else class="badge bg-danger ms-2">
                        <i class="bi bi-x-circle"></i> Stock insuficiente
                      </span>
                    </div>
                    <button
                      v-if="product.canConsume"
                      class="btn btn-sm btn-primary quick-consume-btn"
                      @click="quickConsumeFromPrescription(suggestion, product)"
                      :disabled="loading"
                    >
                      <i class="bi bi-lightning-fill"></i>
                      {{ $t('businessProductStockAdmin.quickConsume') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="my-2 row metric-card">
              <div class="col-12">
                <span class="metric-card-subtitle">
                  <span class="form-check-label" @click="showAdd()" style="cursor: pointer;">
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
                    {{ $t('businessProductStockAdmin.product') }}
                  </div>
                  <div class="col-8">
                    <select
                      class="btn btn-sm btn-light fw-bold text-dark select"
                      v-model="selectedProduct"
                    >
                      <option
                        v-for="prod in products"
                        :key="prod.id"
                        :value="prod"
                        id="select-product"
                      >
                        {{ prod.name }}
                      </option>
                    </select>
                  </div>
                </div>
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
                        {{ $t(`productMeasuresTypesShort.${selectedProduct.measureType}`) }} - ({{
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
                      class="form-control-modern"
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
                      class="form-control-modern"
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
            <div v-if="showSearchFilters">
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
                  <div class="row my-1" v-if="showSearchFilters">
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
                    <div class="row g-2 align-items-center justify-content-center">
                      <div class="col-5">
                        <input
                          id="startDate"
                          class="form-control-modern"
                          type="date"
                          v-model="startDate"
                        />
                      </div>
                      <div class="col-5">
                        <input
                          id="endDate"
                          class="form-control-modern"
                          type="date"
                          v-model="endDate"
                        />
                      </div>
                      <div class="col-2 text-center">
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
                      <div class="form-check form-switch d-flex align-items-center justify-content-center gap-2">
                        <input
                          class="form-check-input m-0"
                          :class="asc === false ? 'bg-danger' : ''"
                          type="checkbox"
                          name="asc"
                          id="asc"
                          v-model="asc"
                          @click="checkAsc($event)"
                        />
                        <label class="form-check-label metric-card-subtitle m-0" for="asc">{{
                          asc ? $t('dashboard.asc') : $t('dashboard.desc')
                        }}</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="my-3 d-flex align-items-center justify-content-end">
              <button
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                @click="refresh()"
                :disabled="loading"
              >
                <i class="bi bi-arrow-clockwise"></i>
                {{ $t('dashboard.refresh') || 'Atualizar' }}
              </button>
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
            <div v-if="this.productAttentions && this.productAttentions.length > 0">
              <div
                class="row"
                v-for="(product, index) in productAttentions"
                :key="`productAttentions-${index}`"
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
                :icon="'graph-up-arrow'"
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
      showProductAttentionManagement === true && !toggles['products-stock.products.view-attention']
    "
  >
    <Message
      :icon="'graph-up-arrow'"
      :title="$t('dashboard.message.1.title')"
      :content="$t('dashboard.message.1.content')"
    />
  </div>
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

.text-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  align-items: center;
  justify-content: center;
  display: flex;
}

/* Modern Form Controls */
.form-control-modern {
  flex: 1;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
  color: #000000;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.form-control-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:hover:not(:disabled) {
  border-color: rgba(169, 169, 169, 0.4);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern.is-invalid {
  border-color: #dc3545;
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.1);
}

.metric-controls {
  border-radius: 0.5rem;
  border: 1.5px solid rgba(0, 0, 0, 0.1);
  font-size: 0.8125rem;
  font-weight: 500;
  transition: all 0.2s ease;
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

/* Prescription Suggestions Styles */
.prescription-suggestions-card {
  background: linear-gradient(135deg, rgba(240, 248, 255, 0.98) 0%, rgba(255, 255, 255, 0.98) 100%);
  padding: 1rem;
  margin: 0.5rem 0;
  border-radius: 0.625rem;
  border: 1px solid rgba(0, 74, 173, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.prescription-suggestions-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--azul-turno);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.prescription-suggestion-item {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.prescription-medication-info {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.prescription-products-list {
  margin-top: 0.5rem;
  padding-left: 1rem;
  border-left: 2px solid var(--azul-turno);
}

.prescription-product-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: rgba(248, 249, 250, 0.5);
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}

.prescription-product-item:hover {
  background: rgba(240, 248, 255, 0.8);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.prescription-product-item.product-unavailable {
  background: rgba(255, 245, 245, 0.5);
  border-left: 3px solid var(--rojo-warning);
}

.product-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-grow: 1;
}

.product-name {
  font-weight: 600;
  color: var(--color-heading);
}

.product-stock {
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.product-stock.stock-low {
  color: var(--rojo-warning);
  font-weight: 600;
}

.quick-consume-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  white-space: nowrap;
}

.quick-consume-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 74, 173, 0.2);
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

  .prescription-product-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .quick-consume-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
