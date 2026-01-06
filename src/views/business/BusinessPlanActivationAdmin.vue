<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import {
  getValidatedPlanActivation,
  planValidate,
  planDesactivate,
} from '../../application/services/plan-activation';
import { useI18n } from 'vue-i18n';
import PlanName from '../../components/common/PlanName.vue';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import PlanActivationName from '../../components/common/PlanActivationName.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import { USER_TYPES } from '../../shared/constants';

export default {
  name: 'BusinessPlanActivationAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    PlanName,
    Warning,
    PlanActivationName,
    AreYouSure,
    ComponentMenu,
    DesktopPageHeader,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();
    const { t } = useI18n();

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      currentUser: {},
      activations: [],
      filtered: [],
      oldActivations: [],
      oldActivationsList: [],
      errorsValidate: false,
      extendedEntity: undefined,
      extendedOldEntity: undefined,
      newPaymentData: {
        paymentDate: new Date().toISOString().slice(0, 10),
      },
      paymentMethods: [
        { id: 'FREE_PERIOD', name: t('paymentMethods.freePeriod') },
        { id: 'WIRE_TRANSFER', name: t('paymentMethods.wireTransfer') },
        { id: 'CASH_DEPOSIT', name: t('paymentMethods.cashDeposit') },
      ],
      bankAccounts: [
        {
          id: '0',
          name: t('paymentMethods.freePeriod'),
          idNumber: 'ETT',
          bank: 'N/A',
          accountType: 'N/A',
          accountNumber: 'N/A',
          currency: 'N/A',
        },
        {
          id: '1',
          name: '1-Bank',
          idNumber: '123123123',
          bank: 'Bank',
          accountType: 'CHECK',
          accountNumber: '123123123',
          currency: 'us',
        },
      ],
      paymentDateError: false,
      paymentAmountAddError: false,
      paymentNumberAddError: false,
      paymentMethodError: false,
      paymentBankError: false,
      goToDesactivate: false,
      searchString: '',
      toggles: {},
      // Filtering state
      searchText: '',
      filterActive: '',
      filterValidated: '',
      // Pagination state
      page: 1,
      totalPages: 0,
      limit: 10,
      counter: 0,
      limits: [10, 20, 50, 100],
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        const activationsData = await getValidatedPlanActivation(false);
        state.activations = Array.isArray(activationsData)
          ? activationsData
          : activationsData?.data || activationsData || [];
        state.filtered = state.activations;
        const oldActivationsData = await getValidatedPlanActivation(true);
        state.oldActivations = Array.isArray(oldActivationsData)
          ? oldActivationsData
          : oldActivationsData?.data || oldActivationsData || [];
        state.oldActivationsList = state.oldActivations;
        state.toggles = await getPermissions('activations', 'admin');
        refreshPagination();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    });

    const goBack = () => {
      router.back();
    };

    const showForm = index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    };

    const showOldForm = index => {
      state.extendedOldEntity = state.extendedOldEntity !== index ? index : undefined;
    };

    const validateActivationPayment = payment => {
      state.errorsValidate = [];
      if (!payment.paymentNumber || payment.paymentNumber.length === 0) {
        state.paymentNumberAddError = true;
        state.errorsValidate.push('businessPlanActivationAdmin.validate.paymentNumber');
      } else {
        state.paymentNumberAddError = false;
      }
      if (payment.paymentAmount === undefined || payment.paymentAmount < 0) {
        state.paymentAmountAddError = true;
        state.errorsValidate.push('businessPlanActivationAdmin.validate.paymentAmount');
      } else {
        state.paymentAmountAddError = false;
      }
      if (!payment.method || payment.method.length === 0) {
        state.paymentMethodError = true;
        state.errorsValidate.push('businessPlanActivationAdmin.validate.method');
      } else {
        state.paymentMethodError = false;
      }
      if (!payment.bank || payment.bank.length === 0) {
        state.paymentBankError = true;
        state.errorsValidate.push('businessPlanActivationAdmin.validate.bank');
      } else {
        state.paymentBankError = false;
      }
      if (!payment.paymentDate || payment.paymentDate.length === 0) {
        state.paymentDateError = true;
        state.errorsValidate.push('businessPlanActivationAdmin.validate.paymentDate');
      } else {
        state.paymentDateError = false;
      }
      if (state.errorsValidate.length === 0) {
        return true;
      }
      return false;
    };

    const validate = async activation => {
      try {
        loading.value = true;
        if (validateActivationPayment(state.newPaymentData)) {
          const body = {
            id: activation.id,
            businessId: activation.businessId,
            planId: activation.planId,
            amount: state.newPaymentData.paymentAmount,
            method: state.newPaymentData.method,
            paymentNumber: state.newPaymentData.paymentNumber,
            paymentDate: state.newPaymentData.paymentDate,
            bankData: state.newPaymentData.bank,
          };
          await planValidate(activation.id, body);
          const activationsData = await getValidatedPlanActivation(false);
          state.activations = Array.isArray(activationsData)
            ? activationsData
            : activationsData?.data || activationsData || [];
          state.filtered = state.activations;
          applyFilters();
          const oldActivationsData = await getValidatedPlanActivation(true);
          state.oldActivations = Array.isArray(oldActivationsData)
            ? oldActivationsData
            : oldActivationsData?.data || oldActivationsData || [];
          state.newPaymentData = {};
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const goToDesactivate = () => {
      state.goToDesactivate = !state.goToDesactivate;
    };

    const cancelDesactivate = () => {
      state.goToDesactivate = false;
    };

    const desactivate = async activation => {
      try {
        loading.value = true;
        if (activation.active === true) {
          await planDesactivate(activation.id);
          const activationsData = await getValidatedPlanActivation(false);
          state.activations = Array.isArray(activationsData)
            ? activationsData
            : activationsData?.data || activationsData || [];
          state.filtered = state.activations;
          applyFilters();
          const oldActivationsData = await getValidatedPlanActivation(true);
          state.oldActivations = Array.isArray(oldActivationsData)
            ? oldActivationsData
            : oldActivationsData?.data || oldActivationsData || [];
          state.newPaymentData = {};
          state.goToDesactivate = false;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    // Filtering functions
    const applyFilters = () => {
      let filtered = [...state.activations];

      // Search filter
      if (state.searchText && state.searchText.trim().length > 0) {
        const searchLower = state.searchText.toLowerCase().trim();
        filtered = filtered.filter(activation => {
          const businessName = (activation.business?.name || '').toLowerCase();
          const planName = (activation.planPayedCopy?.name || '').toLowerCase();
          return businessName.includes(searchLower) || planName.includes(searchLower);
        });
      }

      // Active filter
      if (state.filterActive !== '') {
        const isActive = state.filterActive === 'true';
        filtered = filtered.filter(activation => activation.active === isActive);
      }

      // Validated filter
      if (state.filterValidated !== '') {
        const isValidated = state.filterValidated === 'true';
        filtered = filtered.filter(activation => activation.validated === isValidated);
      }

      state.filtered = filtered;
      state.page = 1; // Reset to first page on filter
      refreshPagination();
    };

    // Pagination methods
    const refreshPagination = () => {
      state.counter = state.filtered.length;
      state.totalPages = Math.ceil(state.counter / state.limit) || 1;
      if (state.page > state.totalPages) {
        state.page = 1;
      }
    };

    const setPage = pageIn => {
      state.page = pageIn;
    };

    // Computed for paginated items
    const paginatedItems = computed(() => {
      const start = (state.page - 1) * state.limit;
      const end = start + state.limit;
      return state.filtered.slice(start, end);
    });

    // Watch for filter changes
    const handleSearchChange = () => {
      applyFilters();
    };

    const handleFilterChange = () => {
      applyFilters();
    };

    const clearFilters = () => {
      state.searchText = '';
      state.filterActive = '';
      state.filterValidated = '';
      applyFilters();
    };

    watch(
      () => state.searchString,
      () => {
        if (state.searchString.length >= 3) {
          state.oldActivations = state.oldActivationsList.filter(i =>
            i.business?.name?.toLowerCase().startsWith(state.searchString.toLowerCase())
          );
        } else {
          state.oldActivations = state.oldActivationsList;
        }
      },
      { immediate: true }
    );

    // Computed para obtener el userType
    const currentUserType = computed(() => store.getCurrentUserType);

    return {
      state,
      loading,
      alertError,
      goBack,
      showForm,
      showOldForm,
      validate,
      goToDesactivate,
      cancelDesactivate,
      desactivate,
      handleSearchChange,
      handleFilterChange,
      clearFilters,
      refreshPagination,
      setPage,
      paginatedItems,
      currentUserType,
      USER_TYPES,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo :src="state.business?.logo"></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessPlanActivationAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessPlanActivationAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessPlanActivationAdmin">
          <div v-if="state.toggles['activations.admin.view']">
            <div v-if="!loading" id="businessPlanActivationAdmin-result" class="mt-4">
              <div>
                <div v-if="state.activations.length === 0">
                  <Message
                    :title="$t('businessPlanActivationAdmin.message.2.title')"
                    :content="$t('businessPlanActivationAdmin.message.2.content')"
                  />
                </div>
                <!-- Search and Filters -->
                <div class="search-filters-container mb-3">
                  <div class="row g-2 mb-2">
                    <div class="col-12 col-md-6">
                      <div class="search-input-wrapper">
                        <i class="bi bi-search search-icon"></i>
                        <input
                          type="text"
                          class="form-control search-input"
                          v-model="state.searchText"
                          @input="handleSearchChange"
                          :placeholder="$t('common.search')"
                        />
                      </div>
                    </div>
                    <div class="col-6 col-md-3">
                      <select
                        class="form-control filter-select"
                        v-model="state.filterActive"
                        @change="handleFilterChange"
                      >
                        <option value="">
                          {{ $t('businessPlanActivationAdmin.active') }}: {{ $t('common.all') }}
                        </option>
                        <option value="true">{{ $t('active') }}</option>
                        <option value="false">{{ $t('inactive') }}</option>
                      </select>
                    </div>
                    <div class="col-6 col-md-3">
                      <select
                        class="form-control filter-select"
                        v-model="state.filterValidated"
                        @change="handleFilterChange"
                      >
                        <option value="">
                          {{ $t('businessPlanActivationAdmin.validated') }}: {{ $t('common.all') }}
                        </option>
                        <option value="true">{{ $t('businessPlan.planValidated') }}</option>
                        <option value="false">{{ $t('businessPlan.planPending') }}</option>
                      </select>
                    </div>
                  </div>
                  <div class="row g-2 mb-2">
                    <div class="col-12 text-end">
                      <button
                        class="btn btn-sm btn-secondary rounded-pill px-3"
                        @click="clearFilters"
                        v-if="state.searchText || state.filterActive || state.filterValidated"
                      >
                        <i class="bi bi-x-circle"></i> {{ $t('common.reset') }}
                      </button>
                    </div>
                  </div>
                </div>
                <!-- Pagination Mobile/Tablet -->
                <div v-if="state.filtered && state.filtered.length > 0" class="mt-3 mb-3">
                  <div
                    class="d-flex justify-content-center align-items-center flex-wrap gap-2 mb-2"
                  >
                    <span class="badge bg-secondary px-2 py-2 m-1">
                      {{ $t('businessPlanActivationAdmin.listResult') }} {{ state.counter }}
                    </span>
                    <span class="badge bg-secondary px-2 py-2 m-1">
                      {{ $t('page') }} {{ state.page }} {{ $t('of') }} {{ state.totalPages }}
                    </span>
                    <select
                      class="btn btn-sm btn-light fw-bold text-dark select mx-1"
                      v-model="state.limit"
                      @change="refreshPagination()"
                    >
                      <option v-for="lim in state.limits" :key="lim" :value="lim">
                        {{ lim }}
                      </option>
                    </select>
                  </div>
                  <div class="centered mt-2" v-if="state.filtered">
                    <nav>
                      <ul class="pagination pagination-ul">
                        <li class="page-item">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            aria-label="First"
                            @click="setPage(1)"
                            :disabled="state.page === 1 || state.totalPages === 0"
                          >
                            <span aria-hidden="true"><i class="bi bi-arrow-bar-left"></i></span>
                          </button>
                        </li>
                        <li class="page-item">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            aria-label="Previous"
                            @click="setPage(state.page - 1)"
                            :disabled="state.page === 1 || state.totalPages === 0"
                          >
                            <span aria-hidden="true">&laquo;</span>
                          </button>
                        </li>
                        <li>
                          <select
                            class="btn btn-md btn-light fw-bold text-dark select mx-1 py-1"
                            v-model="state.page"
                            :disabled="state.totalPages === 0"
                          >
                            <option v-for="pag in state.totalPages" :key="pag" :value="pag">
                              {{ pag }}
                            </option>
                          </select>
                        </li>
                        <li class="page-item">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            aria-label="Next"
                            @click="setPage(state.page + 1)"
                            :disabled="state.page === state.totalPages || state.totalPages === 0"
                          >
                            <span aria-hidden="true">&raquo;</span>
                          </button>
                        </li>
                        <li class="page-item">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            aria-label="Last"
                            @click="setPage(state.totalPages)"
                            :disabled="state.page === state.totalPages || state.totalPages === 1"
                          >
                            <span aria-hidden="true"><i class="bi bi-arrow-bar-right"></i></span>
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
                <div
                  v-for="(activation, index) in paginatedItems"
                  :key="index"
                  class="activation-card"
                >
                  <div class="activation-card-header">
                    <div class="row align-items-center g-2">
                      <div class="col-auto">
                        <div class="activation-icon-wrapper">
                          <i
                            :class="`bi bi-star${activation.active ? '-fill' : ''} activation-icon`"
                          ></i>
                        </div>
                      </div>
                      <div class="col activation-name-wrapper">
                        <h5 class="activation-title mb-0 fw-bold">
                          {{ activation.business?.name || 'N/A' }}
                        </h5>
                        <div class="activation-meta">
                          <span v-if="activation.planPayedCopy?.name" class="activation-plan-badge">
                            <i class="bi bi-tag"></i> {{ activation.planPayedCopy.name }}
                          </span>
                          <span
                            :class="`badge rounded-pill ${
                              activation.active ? 'bg-success' : 'bg-secondary'
                            } ms-2`"
                          >
                            {{ activation.active ? $t('active') : $t('inactive') }}
                          </span>
                          <span
                            :class="`badge rounded-pill ${
                              activation.validated ? 'bg-primary' : 'bg-warning'
                            } ms-2`"
                          >
                            {{
                              activation.validated
                                ? $t('businessPlan.planValidated')
                                : $t('businessPlan.planPending')
                            }}
                          </span>
                        </div>
                      </div>
                      <div class="col-auto">
                        <div class="activation-status-badges">
                          <a
                            href="#"
                            @click.prevent="showForm(index)"
                            class="activation-toggle-btn text-decoration-none"
                            :class="{ active: state.extendedEntity === index }"
                          >
                            <i
                              :id="index"
                              :class="`bi ${
                                state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                              }`"
                            ></i>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="state.toggles['activations.admin.read']"
                    :class="{ show: state.extendedEntity === index }"
                    class="activation-details-container transition-slow"
                  >
                    <div class="form-fields-container">
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.number') }}
                        </label>
                        <input
                          id="activation-payment-id-form-add"
                          min="1"
                          max="50"
                          type="text"
                          class="form-control-modern"
                          :disabled="!state.toggles['activations.admin.add']"
                          v-model="state.newPaymentData.paymentNumber"
                          :class="{ 'is-invalid': state.paymentNumberAddError }"
                          placeholder="Ex: 0055433221"
                        />
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.amount') }}
                        </label>
                        <input
                          id="activation-payment-amount-form-add"
                          min="1"
                          type="number"
                          class="form-control-modern"
                          :disabled="!state.toggles['activations.admin.add']"
                          v-model="state.newPaymentData.paymentAmount"
                          :class="{ 'is-invalid': state.paymentAmountAddError }"
                          placeholder="Ex: 69"
                        />
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.paymentMethod') }}
                        </label>
                        <select
                          id="activation-payment-method-form-update"
                          class="form-control-modern form-select-modern"
                          v-model="state.newPaymentData.method"
                          :disabled="!state.toggles['activations.admin.add']"
                        >
                          <option
                            v-for="met in state.paymentMethods"
                            :key="met.name"
                            :value="met.id"
                          >
                            {{ met.name }}
                          </option>
                        </select>
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.bank') }}
                        </label>
                        <select
                          id="activation-payment-bank-form-update"
                          class="form-control-modern form-select-modern"
                          v-model="state.newPaymentData.bank"
                          :disabled="!state.toggles['activations.admin.add']"
                        >
                          <option
                            v-for="bank in state.bankAccounts"
                            :key="bank.name"
                            :value="bank.id"
                          >
                            {{ bank.name }}
                          </option>
                        </select>
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.paymentDate') }}
                        </label>
                        <input
                          id="paymentDate"
                          class="form-control-modern"
                          type="date"
                          :disabled="!state.toggles['activations.admin.add']"
                          :class="{ 'is-invalid': state.paymentDateError }"
                          v-model="state.newPaymentData.paymentDate"
                        />
                      </div>
                      <div id="activation-id-form" class="activation-details-container">
                        <span><strong>Id:</strong> {{ activation.id }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="col" v-if="state.extendedEntity === index">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="validate(activation)"
                      :disabled="!state.toggles['activations.admin.validate']"
                    >
                      <i class="bi bi-plugin"></i>
                      {{ $t('businessPlanActivationAdmin.validated') }}
                    </button>
                  </div>
                  <div class="row g-1 errors" id="feedback" v-if="state.errorsValidate.length > 0">
                    <Warning>
                      <template v-slot:message>
                        <li v-for="(error, index) in state.errorsValidate" :key="index">
                          {{ $t(error) }}
                        </li>
                      </template>
                    </Warning>
                  </div>
                  <div v-if="!state.toggles['activations.admin.read'] && !loading">
                    <Message
                      :title="$t('businessPlanActivationAdmin.message.1.title')"
                      :content="$t('businessPlanActivationAdmin.message.1.content')"
                    />
                  </div>
                </div>
                <div id="activation-history">
                  <span class="fw-bold"> {{ $t('businessPlanActivationAdmin.historic') }} </span>
                  <div class="row mx-4 mb-3">
                    <input
                      min="1"
                      max="50"
                      type="text"
                      class="form-control"
                      v-model="state.searchString"
                      :placeholder="$t('enterSearcher')"
                    />
                  </div>
                  <div v-if="state.oldActivations.length > 0">
                    <div
                      v-for="(activation, index) in state.oldActivations.slice(0, 10)"
                      :key="index"
                      class="activation-card mb-4"
                    >
                      <div class="activation-card-header">
                        <div class="row align-items-center g-2">
                          <div class="col-auto">
                            <div class="activation-icon-wrapper">
                              <i
                                :class="`bi bi-star${
                                  activation.active ? '-fill' : ''
                                } activation-icon`"
                              ></i>
                            </div>
                          </div>
                          <div class="col activation-name-wrapper">
                            <h5 class="activation-title mb-0 fw-bold">
                              {{ activation.business?.name || 'N/A' }}
                            </h5>
                            <div class="activation-meta">
                              <span
                                v-if="activation.planPayedCopy?.name"
                                class="activation-plan-badge"
                              >
                                <i class="bi bi-tag"></i> {{ activation.planPayedCopy.name }}
                              </span>
                              <span
                                :class="`badge rounded-pill ${
                                  activation.active ? 'bg-success' : 'bg-secondary'
                                } ms-2`"
                              >
                                {{ activation.active ? $t('active') : $t('inactive') }}
                              </span>
                              <span
                                :class="`badge rounded-pill ${
                                  activation.validated ? 'bg-primary' : 'bg-warning'
                                } ms-2`"
                              >
                                {{
                                  activation.validated
                                    ? $t('businessPlan.planValidated')
                                    : $t('businessPlan.planPending')
                                }}
                              </span>
                            </div>
                          </div>
                          <div class="col-auto">
                            <div class="activation-status-badges">
                              <a
                                href="#"
                                @click.prevent="showOldForm(index)"
                                class="activation-toggle-btn text-decoration-none"
                                :class="{ active: state.extendedOldEntity === index }"
                              >
                                <i
                                  :id="index"
                                  :class="`bi ${
                                    state.extendedOldEntity === index
                                      ? 'bi-chevron-up'
                                      : 'bi-chevron-down'
                                  }`"
                                ></i>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        v-if="state.toggles['activations.admin.read']"
                        :class="{ show: state.extendedOldEntity === index }"
                        class="activation-details-container transition-slow"
                      >
                        <div class="form-fields-container">
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.number') }}
                            </label>
                            <input
                              id="activation-payment-id-form-add"
                              min="1"
                              max="50"
                              type="text"
                              class="form-control-modern"
                              :disabled="true"
                              v-model="activation.payment.paymentNumber"
                              placeholder="Ex: 0055433221"
                            />
                          </div>
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.amount') }}
                            </label>
                            <input
                              id="activation-payment-amount-form-add"
                              min="1"
                              type="number"
                              class="form-control-modern"
                              :disabled="true"
                              v-model="activation.payment.amount"
                              placeholder="Ex: 69"
                            />
                          </div>
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.paymentMethod') }}
                            </label>
                            <select
                              id="activation-payment-method-form-update"
                              class="form-control-modern form-select-modern"
                              v-model="activation.payment.method"
                              :disabled="true"
                            >
                              <option
                                v-for="met in state.paymentMethods"
                                :key="met.name"
                                :value="met.id"
                              >
                                {{ met.name }}
                              </option>
                            </select>
                          </div>
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.bank') }}
                            </label>
                            <select
                              id="activation-payment-bank-form-update"
                              class="form-control-modern form-select-modern"
                              v-model="activation.payment.bank"
                              :disabled="true"
                            >
                              <option
                                v-for="bank in state.bankAccounts"
                                :key="bank.name"
                                :value="bank.id"
                              >
                                {{ bank.name }}
                              </option>
                            </select>
                          </div>
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.paymentDate') }}
                            </label>
                            <input
                              id="paymentDate"
                              class="form-control-modern"
                              type="date"
                              :disabled="true"
                              v-model="activation.payment.paymentDate"
                            />
                          </div>
                          <div id="activation-id-form" class="activation-details-container">
                            <span><strong>Id:</strong> {{ activation.id }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="col-12 text-center" v-if="state.extendedOldEntity === index">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="goToDesactivate()"
                          :disabled="
                            !state.toggles['activations.admin.desactivate'] || !activation.active
                          "
                        >
                          <i class="bi bi-scissors"></i>
                          {{ $t('businessPlanActivationAdmin.desactivate') }}
                        </button>
                        <AreYouSure
                          :show="state.goToDesactivate"
                          :yes-disabled="state.toggles['activations.admin.desactivate']"
                          :no-disabled="state.toggles['activations.admin.desactivate']"
                          @actionYes="desactivate(activation)"
                          @actionNo="cancelDesactivate()"
                        >
                        </AreYouSure>
                      </div>
                      <div v-if="!state.toggles['activations.admin.read'] && !loading">
                        <Message
                          :title="$t('businessPlanActivationAdmin.message.1.title')"
                          :content="$t('businessPlanActivationAdmin.message.1.content')"
                        />
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <Message
                      :title="$t('businessPlanActivationAdmin.message.3.title')"
                      :content="$t('businessPlanActivationAdmin.message.3.content')"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="!state.toggles['activations.admin.view'] && !loading">
            <Message
              :title="$t('businessPlanActivationAdmin.message.1.title')"
              :content="$t('businessPlanActivationAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="content">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <DesktopPageHeader
          :logo="state.business?.logo"
          :loading="loading"
          :title="$t('businessPlanActivationAdmin.title')"
          :toggles="state.toggles"
          component-name="businessPlanActivationAdmin"
          @go-back="goBack"
        />
        <div id="businessPlanActivationAdmin">
          <div v-if="state.toggles['activations.admin.view']">
            <div v-if="!loading" id="businessPlanActivationAdmin-result" class="mt-4">
              <div>
                <div v-if="state.activations.length === 0">
                  <Message
                    :title="$t('businessPlanActivationAdmin.message.2.title')"
                    :content="$t('businessPlanActivationAdmin.message.2.content')"
                  />
                </div>
                <!-- Search and Filters -->
                <div class="search-filters-container mb-3">
                  <div class="row g-2 mb-2">
                    <div class="col-12 col-md-6">
                      <div class="search-input-wrapper">
                        <i class="bi bi-search search-icon"></i>
                        <input
                          type="text"
                          class="form-control search-input"
                          v-model="state.searchText"
                          @input="handleSearchChange"
                          :placeholder="$t('common.search')"
                        />
                      </div>
                    </div>
                    <div class="col-6 col-md-3">
                      <select
                        class="form-control filter-select"
                        v-model="state.filterActive"
                        @change="handleFilterChange"
                      >
                        <option value="">
                          {{ $t('businessPlanActivationAdmin.active') }}: {{ $t('common.all') }}
                        </option>
                        <option value="true">{{ $t('active') }}</option>
                        <option value="false">{{ $t('inactive') }}</option>
                      </select>
                    </div>
                    <div class="col-6 col-md-3">
                      <select
                        class="form-control filter-select"
                        v-model="state.filterValidated"
                        @change="handleFilterChange"
                      >
                        <option value="">
                          {{ $t('businessPlanActivationAdmin.validated') }}: {{ $t('common.all') }}
                        </option>
                        <option value="true">{{ $t('businessPlan.planValidated') }}</option>
                        <option value="false">{{ $t('businessPlan.planPending') }}</option>
                      </select>
                    </div>
                  </div>
                  <div class="row g-2 mb-2">
                    <div class="col-12 text-end">
                      <button
                        class="btn btn-sm btn-secondary rounded-pill px-3"
                        @click="clearFilters"
                        v-if="state.searchText || state.filterActive || state.filterValidated"
                      >
                        <i class="bi bi-x-circle"></i> {{ $t('common.reset') }}
                      </button>
                    </div>
                  </div>
                </div>
                <!-- Pagination Desktop -->
                <div v-if="state.filtered && state.filtered.length > 0" class="mt-3 mb-3">
                  <div
                    class="d-flex justify-content-center align-items-center flex-wrap gap-2 mb-2"
                  >
                    <span class="badge bg-secondary px-2 py-2 m-1">
                      {{ $t('businessPlanActivationAdmin.listResult') }} {{ state.counter }}
                    </span>
                    <span class="badge bg-secondary px-2 py-2 m-1">
                      {{ $t('page') }} {{ state.page }} {{ $t('of') }} {{ state.totalPages }}
                    </span>
                    <select
                      class="btn btn-sm btn-light fw-bold text-dark select mx-1"
                      v-model="state.limit"
                      @change="refreshPagination()"
                    >
                      <option v-for="lim in state.limits" :key="lim" :value="lim">
                        {{ lim }}
                      </option>
                    </select>
                  </div>
                  <div class="centered mt-2" v-if="state.filtered">
                    <nav>
                      <ul class="pagination pagination-ul">
                        <li class="page-item">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            aria-label="First"
                            @click="setPage(1)"
                            :disabled="state.page === 1 || state.totalPages === 0"
                          >
                            <span aria-hidden="true"><i class="bi bi-arrow-bar-left"></i></span>
                          </button>
                        </li>
                        <li class="page-item">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            aria-label="Previous"
                            @click="setPage(state.page - 1)"
                            :disabled="state.page === 1 || state.totalPages === 0"
                          >
                            <span aria-hidden="true">&laquo;</span>
                          </button>
                        </li>
                        <li>
                          <select
                            class="btn btn-md btn-light fw-bold text-dark select mx-1 py-1"
                            v-model="state.page"
                            :disabled="state.totalPages === 0"
                          >
                            <option v-for="pag in state.totalPages" :key="pag" :value="pag">
                              {{ pag }}
                            </option>
                          </select>
                        </li>
                        <li class="page-item">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            aria-label="Next"
                            @click="setPage(state.page + 1)"
                            :disabled="state.page === state.totalPages || state.totalPages === 0"
                          >
                            <span aria-hidden="true">&raquo;</span>
                          </button>
                        </li>
                        <li class="page-item">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            aria-label="Last"
                            @click="setPage(state.totalPages)"
                            :disabled="state.page === state.totalPages || state.totalPages === 1"
                          >
                            <span aria-hidden="true"><i class="bi bi-arrow-bar-right"></i></span>
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
                <div
                  v-for="(activation, index) in paginatedItems"
                  :key="index"
                  class="activation-card mb-4"
                >
                  <div class="activation-card-header">
                    <div class="row align-items-center g-2">
                      <div class="col-auto">
                        <div class="activation-icon-wrapper">
                          <i
                            :class="`bi bi-star${activation.active ? '-fill' : ''} activation-icon`"
                          ></i>
                        </div>
                      </div>
                      <div class="col activation-name-wrapper">
                        <h5 class="activation-title mb-0 fw-bold">
                          {{ activation.business?.name || 'N/A' }}
                        </h5>
                        <div class="activation-meta">
                          <span v-if="activation.planPayedCopy?.name" class="activation-plan-badge">
                            <i class="bi bi-tag"></i> {{ activation.planPayedCopy.name }}
                          </span>
                          <span
                            :class="`badge rounded-pill ${
                              activation.active ? 'bg-success' : 'bg-secondary'
                            } ms-2`"
                          >
                            {{ activation.active ? $t('active') : $t('inactive') }}
                          </span>
                          <span
                            :class="`badge rounded-pill ${
                              activation.validated ? 'bg-primary' : 'bg-warning'
                            } ms-2`"
                          >
                            {{
                              activation.validated
                                ? $t('businessPlan.planValidated')
                                : $t('businessPlan.planPending')
                            }}
                          </span>
                        </div>
                      </div>
                      <div class="col-auto">
                        <div class="activation-status-badges">
                          <a
                            href="#"
                            @click.prevent="showForm(index)"
                            class="activation-toggle-btn text-decoration-none"
                            :class="{ active: state.extendedEntity === index }"
                          >
                            <i
                              :id="index"
                              :class="`bi ${
                                state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                              }`"
                            ></i>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="state.toggles['activations.admin.read']"
                    :class="{ show: state.extendedEntity === index }"
                    class="activation-details-container transition-slow"
                  >
                    <div class="form-fields-container">
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.number') }}
                        </label>
                        <input
                          id="activation-payment-id-form-add"
                          min="1"
                          max="50"
                          type="text"
                          class="form-control-modern"
                          :disabled="!state.toggles['activations.admin.add']"
                          v-model="state.newPaymentData.paymentNumber"
                          :class="{ 'is-invalid': state.paymentNumberAddError }"
                          placeholder="Ex: 0055433221"
                        />
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.amount') }}
                        </label>
                        <input
                          id="activation-payment-amount-form-add"
                          min="1"
                          type="number"
                          class="form-control-modern"
                          :disabled="!state.toggles['activations.admin.add']"
                          v-model="state.newPaymentData.paymentAmount"
                          :class="{ 'is-invalid': state.paymentAmountAddError }"
                          placeholder="Ex: 69"
                        />
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.paymentMethod') }}
                        </label>
                        <select
                          id="activation-payment-method-form-update"
                          class="form-control-modern form-select-modern"
                          v-model="state.newPaymentData.method"
                          :disabled="!state.toggles['activations.admin.add']"
                        >
                          <option
                            v-for="met in state.paymentMethods"
                            :key="met.name"
                            :value="met.id"
                          >
                            {{ met.name }}
                          </option>
                        </select>
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.bank') }}
                        </label>
                        <select
                          id="activation-payment-bank-form-update"
                          class="form-control-modern form-select-modern"
                          v-model="state.newPaymentData.bank"
                          :disabled="!state.toggles['activations.admin.add']"
                        >
                          <option
                            v-for="bank in state.bankAccounts"
                            :key="bank.name"
                            :value="bank.id"
                          >
                            {{ bank.name }}
                          </option>
                        </select>
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.paymentDate') }}
                        </label>
                        <input
                          id="paymentDate"
                          class="form-control-modern"
                          type="date"
                          :disabled="!state.toggles['activations.admin.add']"
                          :class="{ 'is-invalid': state.paymentDateError }"
                          v-model="state.newPaymentData.paymentDate"
                        />
                      </div>
                      <div id="activation-id-form" class="activation-details-container">
                        <span><strong>Id:</strong> {{ activation.id }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="col" v-if="state.extendedEntity === index">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="validate(activation)"
                      :disabled="!state.toggles['activations.admin.validate']"
                    >
                      <i class="bi bi-plugin"></i>
                      {{ $t('businessPlanActivationAdmin.validated') }}
                    </button>
                  </div>
                  <div class="row g-1 errors" id="feedback" v-if="state.errorsValidate.length > 0">
                    <Warning>
                      <template v-slot:message>
                        <li v-for="(error, index) in state.errorsValidate" :key="index">
                          {{ $t(error) }}
                        </li>
                      </template>
                    </Warning>
                  </div>
                  <div v-if="!state.toggles['activations.admin.read'] && !loading">
                    <Message
                      :title="$t('businessPlanActivationAdmin.message.1.title')"
                      :content="$t('businessPlanActivationAdmin.message.1.content')"
                    />
                  </div>
                </div>
                <div id="activation-history">
                  <span class="fw-bold"> {{ $t('businessPlanActivationAdmin.historic') }} </span>
                  <div class="row mx-4 mb-3">
                    <input
                      min="1"
                      max="50"
                      type="text"
                      class="form-control"
                      v-model="state.searchString"
                      :placeholder="$t('enterSearcher')"
                    />
                  </div>
                  <div v-if="state.oldActivations.length > 0">
                    <div
                      v-for="(activation, index) in state.oldActivations.slice(0, 10)"
                      :key="index"
                      class="activation-card mb-4"
                    >
                      <div class="activation-card-header">
                        <div class="row align-items-center g-2">
                          <div class="col-auto">
                            <div class="activation-icon-wrapper">
                              <i
                                :class="`bi bi-star${
                                  activation.active ? '-fill' : ''
                                } activation-icon`"
                              ></i>
                            </div>
                          </div>
                          <div class="col activation-name-wrapper">
                            <h5 class="activation-title mb-0 fw-bold">
                              {{ activation.business?.name || 'N/A' }}
                            </h5>
                            <div class="activation-meta">
                              <span
                                v-if="activation.planPayedCopy?.name"
                                class="activation-plan-badge"
                              >
                                <i class="bi bi-tag"></i> {{ activation.planPayedCopy.name }}
                              </span>
                              <span
                                :class="`badge rounded-pill ${
                                  activation.active ? 'bg-success' : 'bg-secondary'
                                } ms-2`"
                              >
                                {{ activation.active ? $t('active') : $t('inactive') }}
                              </span>
                              <span
                                :class="`badge rounded-pill ${
                                  activation.validated ? 'bg-primary' : 'bg-warning'
                                } ms-2`"
                              >
                                {{
                                  activation.validated
                                    ? $t('businessPlan.planValidated')
                                    : $t('businessPlan.planPending')
                                }}
                              </span>
                            </div>
                          </div>
                          <div class="col-auto">
                            <div class="activation-status-badges">
                              <a
                                href="#"
                                @click.prevent="showOldForm(index)"
                                class="activation-toggle-btn text-decoration-none"
                                :class="{ active: state.extendedOldEntity === index }"
                              >
                                <i
                                  :id="index"
                                  :class="`bi ${
                                    state.extendedOldEntity === index
                                      ? 'bi-chevron-up'
                                      : 'bi-chevron-down'
                                  }`"
                                ></i>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        v-if="state.toggles['activations.admin.read']"
                        :class="{ show: state.extendedOldEntity === index }"
                        class="activation-details-container transition-slow"
                      >
                        <div class="form-fields-container">
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.number') }}
                            </label>
                            <input
                              id="activation-payment-id-form-add"
                              min="1"
                              max="50"
                              type="text"
                              class="form-control-modern"
                              :disabled="true"
                              v-model="activation.payment.paymentNumber"
                              placeholder="Ex: 0055433221"
                            />
                          </div>
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.amount') }}
                            </label>
                            <input
                              id="activation-payment-amount-form-add"
                              min="1"
                              type="number"
                              class="form-control-modern"
                              :disabled="true"
                              v-model="activation.payment.amount"
                              placeholder="Ex: 69"
                            />
                          </div>
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.paymentMethod') }}
                            </label>
                            <select
                              id="activation-payment-method-form-update"
                              class="form-control-modern form-select-modern"
                              v-model="activation.payment.method"
                              :disabled="true"
                            >
                              <option
                                v-for="met in state.paymentMethods"
                                :key="met.name"
                                :value="met.id"
                              >
                                {{ met.name }}
                              </option>
                            </select>
                          </div>
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.bank') }}
                            </label>
                            <select
                              id="activation-payment-bank-form-update"
                              class="form-control-modern form-select-modern"
                              v-model="activation.payment.bank"
                              :disabled="true"
                            >
                              <option
                                v-for="bank in state.bankAccounts"
                                :key="bank.name"
                                :value="bank.id"
                              >
                                {{ bank.name }}
                              </option>
                            </select>
                          </div>
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.paymentDate') }}
                            </label>
                            <input
                              id="paymentDate"
                              class="form-control-modern"
                              type="date"
                              :disabled="true"
                              v-model="activation.payment.paymentDate"
                            />
                          </div>
                          <div id="activation-id-form" class="activation-details-container">
                            <span><strong>Id:</strong> {{ activation.id }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="col-12 text-center" v-if="state.extendedOldEntity === index">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="goToDesactivate()"
                          :disabled="
                            !state.toggles['activations.admin.desactivate'] || !activation.active
                          "
                        >
                          <i class="bi bi-scissors"></i>
                          {{ $t('businessPlanActivationAdmin.desactivate') }}
                        </button>
                        <AreYouSure
                          :show="state.goToDesactivate"
                          :yes-disabled="state.toggles['activations.admin.desactivate']"
                          :no-disabled="state.toggles['activations.admin.desactivate']"
                          @actionYes="desactivate(activation)"
                          @actionNo="cancelDesactivate()"
                        >
                        </AreYouSure>
                      </div>
                      <div v-if="!state.toggles['activations.admin.read'] && !loading">
                        <Message
                          :title="$t('businessPlanActivationAdmin.message.1.title')"
                          :content="$t('businessPlanActivationAdmin.message.1.content')"
                        />
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <Message
                      :title="$t('businessPlanActivationAdmin.message.3.title')"
                      :content="$t('businessPlanActivationAdmin.message.3.content')"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="!state.toggles['activations.admin.view'] && !loading">
            <Message
              :title="$t('businessPlanActivationAdmin.message.1.title')"
              :content="$t('businessPlanActivationAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modern Form Styles */
.form-fields-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.75rem;
}

.form-group-modern {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.form-label-modern {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  margin-bottom: 0;
  min-width: 120px;
  flex-shrink: 0;
}

.form-control-modern,
.form-select-modern {
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

.form-control-modern:focus,
.form-select-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:hover:not(:disabled),
.form-select-modern:hover:not(:disabled) {
  border-color: rgba(169, 169, 169, 0.4);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:disabled,
.form-select-modern:disabled {
  background-color: rgba(245, 246, 247, 0.8);
  color: rgba(0, 0, 0, 0.5);
  cursor: not-allowed;
  opacity: 0.7;
}

.form-control-modern.is-invalid,
.form-select-modern.is-invalid {
  border-color: rgba(220, 53, 69, 0.6);
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.1);
}

.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}

.activation-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid rgba(169, 169, 169, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  transition: all 0.3s ease;
  overflow: hidden;
}

.activation-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.activation-card-header {
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.1);
  margin-bottom: 0.5rem;
}

.activation-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--azul-qr) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.activation-icon {
  font-size: 1.3rem;
  color: white;
}

.activation-name-wrapper {
  min-width: 0;
}

.activation-title {
  font-size: 1.1rem;
  color: var(--gris-default);
  margin-bottom: 0.25rem;
}

.activation-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.activation-plan-badge {
  font-size: 0.8rem;
  color: var(--azul-turno);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.activation-status-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.activation-toggle-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(169, 169, 169, 0.1);
  color: var(--gris-default);
  transition: all 0.2s ease;
  font-size: 1rem;
}

.activation-toggle-btn:hover {
  background-color: rgba(169, 169, 169, 0.2);
  color: var(--azul-turno);
  transform: scale(1.05);
}

.activation-toggle-btn.active {
  background-color: var(--azul-turno);
  color: white;
}

.activation-details-container {
  font-size: 0.85rem;
  padding: 0.75rem;
  background-color: rgba(250, 251, 252, 0.5);
  border-radius: 6px;
  margin-top: 0.5rem;
  max-height: 0px;
  overflow: hidden;
  transition: max-height 0.3s ease;
  animation: slideDown 0.3s ease;
}

.activation-details-container.show {
  max-height: 2000px !important;
  overflow-y: auto;
  padding: 1.25rem;
  min-height: 300px;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.is-disabled {
  opacity: 0.5;
}

.search-filters-container {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 1.5rem;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--gris-default);
}

.search-input,
.filter-select {
  padding-left: 35px;
  border-radius: 8px;
  border-color: var(--gris-clear);
}

.filter-select {
  appearance: none;
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20256%20512%22%3E%3Cpath%20fill%3D%22%23333%22%20d%3D%22M119.5%20326.9L3.5%20209.1c-4.7-4.7-4.7-12.3%200-17l7.1-7.1c4.7-4.7%2012.3-4.7%2017%200L128%20297.9l100.4-100.9c4.7-4.7%2012.3-4.7%2017%200l7.1%207.1c4.7%204.7%204.7%2012.3%200%2017L136.5%20326.9c-4.7%204.6-12.3%204.6-17-.1z%22%2F%3E%3C%2Fsvg%3E');
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 0.8em;
  padding-right: 2.5rem;
}

/* Desktop Layout Styles */
@media (min-width: 992px) {
  .desktop-header-row {
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0;
    justify-content: flex-start;
  }

  .desktop-logo-wrapper {
    padding-right: 1rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .desktop-commerce-logo {
    display: flex;
    align-items: center;
    max-width: 150px;
  }

  .desktop-commerce-logo .logo-desktop {
    max-width: 120px;
    max-height: 100px;
    width: auto;
    height: auto;
    margin-bottom: 0;
  }

  #commerce-logo-desktop {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .desktop-menu-wrapper {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
  }
}
</style>
