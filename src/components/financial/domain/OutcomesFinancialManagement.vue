<script>
import Spinner from '../../common/Spinner.vue';
import Alert from '../../common/Alert.vue';
import Warning from '../../common/Warning.vue';
import Popper from "vue3-popper";
import Message from '../../common/Message.vue';
import SimpleDownloadCard from '../../reports/SimpleDownloadCard.vue';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { globalStore } from '../../../stores';
import { getActiveReplacementsByProductId, getProductByCommerce } from '../../../application/services/product';
import { getDate } from '../../../shared/utils/date';
import { getOutcomesDetails } from '../../../application/services/query-stack';
import OutcomeDetailsCard from './common/OutcomeDetailsCard.vue';
import Toggle from '@vueform/toggle';
import { getOutcomeTypes } from '../../../shared/utils/data';
import SimpleDownloadButton from '../../reports/SimpleDownloadButton.vue';

export default {
  name: 'OutcomesFinancialManagement',
  components: { Message, SimpleDownloadCard, Spinner, Popper, Alert, Warning, OutcomeDetailsCard, Toggle, SimpleDownloadButton },
  props: {
    showOutcomesFinancialManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    queues: { type: Array, default: undefined },
    business: { type: Object, default: undefined },
    financialOutcomesIn: { type: Array, default: [] }
  },
  data() {
    const store = globalStore();
    return {
      loading: false,
      alertError: '',
      financialOutcomes: [],
      counter: 0,
      totalPages: 0,
      asc: true,
      checked: false,
      showFilterOptions: false,
      showAddOption: false,
      searchText: undefined,
      store,
      userType: undefined,
      user: undefined,
      errorsAdd: [],
      page: 1,
      limits: [10, 20, 50, 100],
      limit: 10,
      outcomeTitleError: false,
      outcomeDateError: false,
      outcomeTypeError: false,
      outcomeProductError: false,
      outcomeExpireDate: false,
      outcomePaymentAmountError: false,
      outcomeAmountError: false,
      startDate: undefined,
      endDate: undefined,
      newOutcome: {},
      outcomeTypes: []
    }
  },
  async beforeMount() {
    this.outcomeTypes = getOutcomeTypes();
    this.financialOutcomes = [
      {
        id: 'LzgvWXNa4n53urFQk1Re',
        paymentDate: '2024-04-18T01:03:39.753Z',
        type: 'PRODUCT_REPLACEMENT',
        paymentType: 'TOTALLY',
        paymentMethod: 'CREDIT_CARD',
        paid: true,
        paymentAmount: 1600,
        amount: 800,
        title: 'Compra Botox',
        productId: '1',
        productName: 'Botox',
        beneficiary: 'BOTOX SANTA LAURA C.A.',
        user: 'carolinadiaz@semprebela.com'
      },
      {
        id: 'LzgvWXNa4n53urFQk1Re',
        paymentDate: '2024-04-05T01:03:39.753Z',
        type: 'OTHER',
        paymentType: 'TOTALLY',
        paymentMethod: 'PIX',
        paid: true,
        paymentAmount: 17400,
        amount: 800,
        title: 'Pagamento Funcionários',
        productId: '1',
        user: 'carolinadiaz@semprebela.com'
      }
    ]
  },
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
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        this.financialOutcomes = await getOutcomesDetails(this.business.id, this.commerce.id, this.startDate, this.endDate, commerceIds,
          this.page, this.limit, this.searchText, this.asc, this.incomeStatus, this.fiscalNote, this.automatic);
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
      this.newOutcomeConsumption = {
        consumptionDate: new Date().toISOString().slice(0,10),
      }
    },
    updatePaginationData() {
      if (this.financialOutcomes && this.financialOutcomes.length > 0) {
        const { counter } = this.financialOutcomes[0];
        this.counter = counter;
        const total = counter / this.limit;
        const totalB = Math.trunc(total);
        this.totalPages = totalB <= 0 ? 1 : counter % this.limit === 0 ? totalB : totalB + 1;
      } else {
        this.counter = 0;
        this.totalPages = 0;
      }
    },
    async exportToCSV() {
      try {
        this.loading = true;
        let csvAsBlob = [];
        let commerceIds = [this.commerce.id];
        const result = await getOutcomesDetails(this.business.id, this.commerce.id, this.startDate, this.endDate, commerceIds,
          this.page, this.limit, this.searchText, this.asc, this.incomeStatus, this.fiscalNote, this.automatic);
        if (result && result.length > 0) {
          csvAsBlob = jsonToCsv(result);
        }
        const blobURL = URL.createObjectURL(new Blob([csvAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `financial-outcomes-${this.commerce.tag}.csv`;
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
    },
    validateAdd(outcome) {
      this.errorsAdd = [];
      if(!outcome.type || outcome.type.length === 0) {
        this.outcomeTypeError = true;
        this.errorsAdd.push('businessFinancial.validate.type');
      } else {
        this.outcomeTypeError = false;
      }
      if(!outcome.paymentAmount || outcome.paymentAmount <= 0) {
        this.outcomePaymentAmountError = true;
        this.errorsAdd.push('businessFinancial.validate.paymentAmount');
      } else {
        this.outcomePaymentAmountError = false;
      }
      if(!outcome.title || outcome.title.length === 0) {
        this.outcomeTitleError = true;
        this.errorsAdd.push('businessFinancial.validate.title');
      } else {
        this.outcomeTitleError = false;
      }
      if(!outcome.date || outcome.date.length === 0) {
        this.outcomeDateError = true;
        this.errorsAdd.push('businessFinancial.validate.date');
      } else {
        this.outcomeDateError = false;
      }
      if (outcome.type && outcome.type === 'PRODUCT_REPLACEMENT') {
        if(!outcome.amount || outcome.amount.length === 0) {
          this.outcomeAmountError = true;
          this.errorsAdd.push('businessFinancial.validate.amount');
        } else {
          this.outcomeAmountError = false;
        }
      }
      if(this.errorsAdd.length === 0) {
        return true;
      }
      return false;
    },
    async add() {
      try {
        this.loading = true;
        if (this.validateAdd(this.newOutcome)) {
          this.newOutcome.commerceId = state.commerce.id;
          this.showAdd = false;
          this.closeAddModal();
          this.newOutcome = {}
        }
        this.alertError = '';
        this.loading = false;
      } catch (error) {
        this.alertError = error.response.status || 500;
        this.loading = false;
      }
    },
    closeAddModal() {
      const modalCloseButton = document.getElementById('close-modal');
      modalCloseButton.click();
    },
    selectType ($event) {
      if ($event && $event.target) {
        const outcomeType = $event.target.value;
        this.newOutcome.title = this.$t(`outcomeTypes.${outcomeType}`);
      }
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
    }
  }
}
</script>

<template>
  <div id="financialOutcomes-management" class="row" v-if="showOutcomesFinancialManagement === true && toggles['financial.outcomes.view']">
    <div class="col">
      <div id="outcome-management-component">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
        <div v-if="!loading">
          <div>
            <div>
              <div id="admin-sub-menu" class="row mt-3 mx-0">
                <div class="col lefted">
                  <button
                    class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd()"
                    data-bs-toggle="modal"
                    :data-bs-target="`#add-outcome`"
                    :disabled="!toggles['financial.outcomes.add']">
                    <i class="bi bi-plus-lg"></i> {{ $t("add") }}
                  </button>
                  <SimpleDownloadButton
                    :download="toggles['financial.reports.outcomes']"
                    :showTooltip="true"
                    :description="$t('businessFinancial.reports.outcomes.description')"
                    @download="exportToCSV"
                    :canDownload="toggles['financial.reports.outcomes'] === true"
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
                  <div class="m-1">
                    <div class="row">
                      <div class="col-10">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="searchText"
                          :placeholder="$t('dashboard.search')">
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
            <div v-if="this.financialOutcomes && this.financialOutcomes.length > 0">
              <div class="row" v-for="(outcome, index) in financialOutcomes" :key="`financialOutcomes-${index}`">
                <OutcomeDetailsCard
                  :show="true"
                  :outcome="outcome"
                  :commerce="commerce"
                  :commerces="commerces"
                  :toggles="toggles"
                >
                </OutcomeDetailsCard>
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
    <!-- Modal Add -->
    <div class="modal fade" :id="`add-outcome`" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-plus-lg"></i> {{ $t("add") }} </h5>
            <button id="close-modal" class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="loading" :stack="alertError"></Alert>
            <div id="add-outcome" class="result-card mb-4" v-if="showAdd && toggles['financial.outcomes.add']">
              <div>
                <div class="row mb-1">
                  <div id="outcome-type-form-add" class="row mt-1">
                    <div class="col-4 text-label">
                      {{ $t("businessFinancial.outcomeType") }}
                    </div>
                    <div class="col-8">
                      <select
                        class="btn btn-md btn-light fw-bold text-dark select"
                        v-model="newOutcome.type"
                        id="types"
                        @change="selectType($event)"
                        v-bind:class="{ 'is-invalid': outcomeTypeError }">
                        <option v-for="typ in outcomeTypes" :key="typ.name" :value="typ.id">{{ $t(`outcomeTypes.${typ.name}`) }}</option>
                      </select>
                    </div>
                  </div>
                  <div id="outcome-title-form-add" class="row mt-1">
                    <div class="col-4 text-label">
                      {{ $t("businessFinancial.outcomeTitle") }}
                    </div>
                    <div class="col-8">
                      <input
                        min="1"
                        max="50"
                        type="text"
                        class="form-control"
                        v-model="newOutcome.title"
                        v-bind:class="{ 'is-invalid': outcomeTitleError }"
                        placeholder="Outcome A">
                    </div>
                  </div>
                  <div id="outcome-beneficiary-form-add" class="row mt-1">
                    <div class="col-4 text-label">
                      {{ $t("businessFinancial.outcomeBeneficiary") }}
                    </div>
                    <div class="col-8">
                      <input
                        min="1"
                        max="50"
                        type="text"
                        class="form-control"
                        v-model="newOutcome.beneficiary"
                        placeholder="Company A">
                    </div>
                  </div>
                  <div id="outcome-paymentAmount-form-add" class="row mt-1">
                    <div class="col-4 text-label">
                      {{ $t("businessFinancial.outcomePaymentAmount") }}
                    </div>
                    <div class="col-8">
                      <input
                        :min="0"
                        type="number"
                        class="form-control"
                        v-model="newOutcome.paymentAmount"
                        v-bind:class="{ 'is-invalid': outcomePaymentAmountError }"
                        placeholder="1">
                    </div>
                  </div>
                  <div v-if="newOutcome.type === 'PRODUCT_REPLACEMENT'" class="row g-0">
                    <div id="outcome-type-form-add" class="row mt-1">
                      <div class="col-4 text-label">
                        {{ $t("businessFinancial.outcomeProduct") }}
                      </div>
                      <div class="col-8">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select"
                          v-model="newOutcome.productId"
                          id="types"
                          v-bind:class="{ 'is-invalid': outcomeProductError }">
                          <option v-for="typ in products" :key="typ.name" :value="typ.id">{{ typ.name }}</option>
                        </select>
                      </div>
                    </div>
                    <div id="outcome-amount-form-add" class="row mt-1">
                      <div class="col-4 text-label">
                        {{ $t("businessFinancial.outcomeAmount") }}
                      </div>
                      <div class="col-8">
                        <input
                          :min="0"
                          type="number"
                          class="form-control"
                          v-model="newOutcome.outcomeAmount"
                          v-bind:class="{ 'is-invalid': outcomeAmountError }"
                          placeholder="1">
                      </div>
                    </div>
                    <div id="outcome-expire-form-add" class="row mt-1">
                      <div class="col-4 text-label">
                        {{ $t("businessFinancial.outcomeExpireDate") }}
                      </div>
                      <div class="col-8">
                        <input
                          type="date"
                          class="form-control"
                          v-model="newOutcome.outcomeExpireDate"
                          placeholder="1">
                      </div>
                    </div>
                  </div>
                  <div id="outcome-date-form-add" class="row mt-1">
                    <div class="col-4 text-label">
                      {{ $t("businessFinancial.outcomeDate") }}
                    </div>
                    <div class="col-8">
                      <input
                        type="date"
                        class="form-control"
                        v-model="newOutcome.date"
                        v-bind:class="{ 'is-invalid': outcomeDateError }"
                        placeholder="1">
                    </div>
                  </div>
                  <div id="outcome-nextDate-form-add" class="row mt-1">
                    <div class="col-4 text-label">
                      {{ $t("businessFinancial.outcomeNextDate") }}
                    </div>
                    <div class="col-8">
                      <input
                        type="date"
                        class="form-control"
                        v-model="newOutcome.outcomeNextDateDate"
                        placeholder="1">
                    </div>
                  </div>
                  <div id="outcome-code-form-add" class="row mt-1">
                    <div class="col-4 text-label">
                      {{ $t("businessFinancial.outcomeCode") }}
                    </div>
                    <div class="col-8">
                      <input
                        type="text"
                        class="form-control"
                        v-model="newOutcome.code"
                        placeholder="Code/Batch">
                    </div>
                  </div>
                  <div class="col">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="add(newOutcome)">
                      {{ $t("businessFinancial.add") }} <i class="bi bi-save"></i>
                    </button>
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
            </div>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4" data-bs-dismiss="modal" aria-label="Close">{{ $t("close") }} <i class="bi bi-check-lg"></i></a>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-if="showOutcomesFinancialManagement === true && !toggles['financial.outcomes.view']">
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