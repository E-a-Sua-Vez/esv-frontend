<script>
import { ref, reactive, onBeforeMount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPlans, updatePlan, addPlan } from '../../application/services/plan';
import { getPermissions } from '../../application/services/permissions';
import PlanName from '../../components/common/PlanName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import { getCountries, getPeriodicities, getProductTypes } from '../../shared/utils/data';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import { USER_TYPES } from '../../shared/constants';

export default {
  name: 'BusinessPlansAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    PlanName,
    Toggle,
    Warning,
    ComponentMenu,
    DesktopPageHeader,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      currentUser: {},
      plans: [],
      filtered: [],
      showAdd: false,
      periodicities: [],
      countries: [],
      productTypes: [],
      newPlan: {},
      extendedEntity: undefined,
      errorsAdd: [],
      nameAddError: false,
      descriptionAddError: false,
      orderAddError: false,
      periodicityAddError: false,
      priceAddError: false,
      errorsUpdate: [],
      nameUpdateError: false,
      descriptionUpdateError: false,
      orderUpdateError: false,
      periodicityUpdateError: false,
      priceUpdateError: false,
      toggles: {},
      // Filtering state
      searchText: '',
      filterCountry: '',
      filterPeriodicity: '',
      filterActive: '',
      filterProductType: '',
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
        state.periodicities = getPeriodicities();
        state.countries = getCountries();
        state.productTypes = getProductTypes();
        state.currentUser = await store.getCurrentUser;
        const plans = await getPlans();
        state.plans = Array.isArray(plans) ? plans : [];
        state.filtered = state.plans;
        state.toggles = await getPermissions('plans', 'admin');
        refreshPagination();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error?.response?.status || error?.message || 500;
        loading.value = false;
      }
    });

    const goBack = () => {
      router.back();
    };

    const validateAdd = plan => {
      state.errorsAdd = [];
      if (!plan.name || plan.name.length === 0) {
        state.nameAddError = true;
        state.errorsAdd.push('businessPlansAdmin.validate.name');
      } else {
        state.nameAddError = false;
      }
      if (!plan.description || plan.description.length === 0) {
        state.descriptionAddError = true;
        state.errorsAdd.push('businessPlansAdmin.validate.description');
      } else {
        state.descriptionAddError = false;
      }
      if (!plan.order || plan.order === 0) {
        state.orderAddError = true;
        state.errorsAdd.push('businessPlansAdmin.validate.order');
      } else {
        state.orderAddError = false;
      }
      if (!plan.periodicity || plan.periodicity.length === 0) {
        state.periodicityAddError = true;
        state.errorsAdd.push('businessPlansAdmin.validate.periodicity');
      } else {
        state.periodicityAddError = false;
      }
      if (plan.price === undefined || plan.price < 0) {
        state.priceAddError = true;
        state.errorsAdd.push('businessPlansAdmin.validate.price');
      } else {
        state.priceAddError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = plan => {
      state.errorsUpdate = [];
      if (!plan.name || plan.name.length === 0) {
        state.nameError = true;
        state.errorsUpdate.push('businessPlansAdmin.validate.name');
      } else {
        state.nameUpdateError = false;
      }
      if (!plan.description || plan.description.length === 0) {
        state.descriptionUpdateError = true;
        state.errorsUpdate.push('businessPlansAdmin.validate.description');
      } else {
        state.descriptionUpdateError = false;
      }
      if (!plan.order || plan.order === 0) {
        state.orderUpdateError = true;
        state.errorsUpdate.push('businessPlansAdmin.validate.order');
      } else {
        state.orderUpdateError = false;
      }
      if (!plan.periodicity || plan.periodicity.length === 0) {
        state.periodicityUpdateError = true;
        state.errorsUpdate.push('businessPlansAdmin.validate.periodicity');
      } else {
        state.periodicityUpdateError = false;
      }
      if (plan.price === undefined || plan.price < 0) {
        state.priceUpdateError = true;
        state.errorsUpdate.push('businessPlansAdmin.validate.price');
      } else {
        state.priceUpdateError = false;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const update = async plan => {
      try {
        loading.value = true;
        if (validateUpdate(plan)) {
          await updatePlan(plan.id, plan);
          const plans = await getPlans();
          state.plans = plans;
          state.filtered = plans;
          applyFilters();
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error?.response?.status || error?.message || 500;
        loading.value = false;
      }
    };

    const showAdd = () => {
      state.showAdd = !state.showAdd;
      state.newPlan = {
        order: state.plans.length + 1,
        periodicity: 'monthly',
        online: false,
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newPlan)) {
          await addPlan(state.newPlan);
          const plans = await getPlans();
          state.plans = plans;
          state.filtered = plans;
          applyFilters();
          state.showAdd = false;
          state.newPlan = {};
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error?.response?.status || error?.message || 500;
        loading.value = false;
      }
    };

    const showUpdateForm = index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    };

    const extend = plan => {
      state.extendedEntity =
        state.extendedEntity && state.extendedEntity.id === plan.id ? undefined : { ...plan };
    };

    // Filtering functions
    const applyFilters = () => {
      let filtered = [...state.plans];

      // Search filter
      if (state.searchText && state.searchText.trim().length > 0) {
        const searchLower = state.searchText.toLowerCase().trim();
        filtered = filtered.filter(plan => {
          const name = (plan.name || '').toLowerCase();
          const description = (plan.description || '').toLowerCase();
          const country = (plan.country || '').toLowerCase();
          return (
            name.includes(searchLower) ||
            description.includes(searchLower) ||
            country.includes(searchLower)
          );
        });
      }

      // Country filter
      if (state.filterCountry) {
        filtered = filtered.filter(plan => plan.country === state.filterCountry);
      }

      // Periodicity filter
      if (state.filterPeriodicity) {
        filtered = filtered.filter(plan => plan.periodicity === state.filterPeriodicity);
      }

      // Active filter
      if (state.filterActive !== '') {
        const isActive = state.filterActive === 'true';
        filtered = filtered.filter(plan => plan.active === isActive);
      }

      // Product type filter
      if (state.filterProductType) {
        filtered = filtered.filter(plan => plan.productType === state.filterProductType);
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
      state.filterCountry = '';
      state.filterPeriodicity = '';
      state.filterActive = '';
      state.filterProductType = '';
      applyFilters();
    };

    // Computed para verificar toggles de forma reactiva
    // En master siempre se muestra el contenido, en business se verifica el permiso
    const hasViewPermission = computed(() => {
      const userType = store.getCurrentUserType;
      // Si es master, siempre mostrar
      if (userType === USER_TYPES.MASTER) {
        return !loading.value;
      }
      // Si es business, verificar el permiso
      return !loading.value && state.toggles && state.toggles['plans.admin.view'];
    });

    // Computed para obtener el userType
    const currentUserType = computed(() => store.getCurrentUserType);

    return {
      state,
      loading,
      alertError,
      showUpdateForm,
      update,
      showAdd,
      add,
      goBack,
      extend,
      hasViewPermission,
      currentUserType,
      USER_TYPES,
      handleSearchChange,
      handleFilterChange,
      clearFilters,
      refreshPagination,
      setPage,
      paginatedItems,
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
          :title="$t(`businessPlansAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessPlansAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessPlansAdmin">
          <div id="businessPlansAdmin-result" class="mt-4">
            <div>
              <div v-if="state.plans.length === 0">
                <Message
                  :title="$t('businessPlansAdmin.message.2.title')"
                  :content="$t('businessPlansAdmin.message.2.content')"
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
                      v-model="state.filterCountry"
                      @change="handleFilterChange"
                    >
                      <option value="">
                        {{ $t('businessPlansAdmin.country') }}: {{ $t('common.all') }}
                      </option>
                      <option v-for="country in state.countries" :key="country" :value="country">
                        {{ $t(`countries.${country}`) }}
                      </option>
                    </select>
                  </div>
                  <div class="col-6 col-md-3">
                    <select
                      class="form-control filter-select"
                      v-model="state.filterPeriodicity"
                      @change="handleFilterChange"
                    >
                      <option value="">
                        {{ $t('businessPlansAdmin.periodicity') }}: {{ $t('common.all') }}
                      </option>
                      <option v-for="per in state.periodicities" :key="per" :value="per">
                        {{ $t(`periodicities.${per}`) }}
                      </option>
                    </select>
                  </div>
                </div>
                <div class="row g-2 mb-2">
                  <div class="col-6 col-md-3">
                    <select
                      class="form-control filter-select"
                      v-model="state.filterActive"
                      @change="handleFilterChange"
                    >
                      <option value="">
                        {{ $t('businessPlansAdmin.active') }}: {{ $t('common.all') }}
                      </option>
                      <option value="true">{{ $t('active') }}</option>
                      <option value="false">{{ $t('inactive') }}</option>
                    </select>
                  </div>
                  <div class="col-6 col-md-3">
                    <select
                      class="form-control filter-select"
                      v-model="state.filterProductType"
                      @change="handleFilterChange"
                    >
                      <option value="">
                        {{ $t('businessPlansAdmin.type') }}: {{ $t('common.all') }}
                      </option>
                      <option v-for="product in state.productTypes" :key="product" :value="product">
                        {{ $t(`products.types.${product}`) }}
                      </option>
                    </select>
                  </div>
                  <div class="col-12 col-md-6 text-end">
                    <button
                      class="btn btn-sm btn-secondary rounded-pill px-3"
                      @click="clearFilters"
                      v-if="
                        state.searchText ||
                        state.filterCountry ||
                        state.filterPeriodicity ||
                        state.filterActive ||
                        state.filterProductType
                      "
                    >
                      <i class="bi bi-x-circle"></i> {{ $t('common.reset') }}
                    </button>
                  </div>
                </div>
              </div>
              <div class="row mb-2">
                <div class="col-12 text-start">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd()"
                    :disabled="
                      currentUserType !== USER_TYPES.MASTER && !state.toggles['plans.admin.add']
                    "
                  >
                    <i class="bi bi-plus-lg"></i>
                  </button>
                </div>
              </div>
              <div
                id="add-plan"
                class="plan-card mb-4"
                v-if="
                  state.showAdd &&
                  (currentUserType === USER_TYPES.MASTER || state.toggles['plans.admin.add'])
                "
              >
                <div v-if="state.plans.length < state.toggles['plans.admin.limit']">
                  <div class="row g-1">
                    <div id="plan-name-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.name') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="state.newPlan.name"
                          v-bind:class="{ 'is-invalid': state.nameAddError }"
                          placeholder="Plan A"
                        />
                      </div>
                    </div>
                    <div id="plan-type-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.type') }}
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select px-1"
                          v-model="state.newPlan.productType"
                          id="countries"
                        >
                          <option
                            v-for="product in state.productTypes"
                            :key="product"
                            :value="product"
                          >
                            {{ $t(`products.types.${product}`) }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div id="plan-country-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.country') }}
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select px-1"
                          v-model="state.newPlan.country"
                          id="countries"
                        >
                          <option
                            v-for="country in state.countries"
                            :key="country"
                            :value="country"
                          >
                            {{ $t(`countries.${country}`) }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div id="plan-description-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.description') }}
                      </div>
                      <div class="col-6">
                        <textarea
                          min="1"
                          max="500"
                          type="text"
                          class="form-control"
                          v-model="state.newPlan.description"
                          v-bind:class="{ 'is-invalid': state.descriptionAddError }"
                          placeholder="Benefit A-Benefit B..."
                        >
                        </textarea>
                      </div>
                    </div>
                    <div id="plan-order-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.order') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          :max="state.plans.length + 1"
                          type="number"
                          class="form-control"
                          v-model="state.newPlan.order"
                          v-bind:class="{ 'is-invalid': state.orderAddError }"
                          placeholder="1"
                        />
                      </div>
                    </div>
                    <div id="plan-periodicity-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.periodicity') }}
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select px-1"
                          v-model="state.newPlan.periodicity"
                          id="periodicities"
                          v-bind:class="{ 'is-invalid': state.periodicityAddError }"
                        >
                          <option v-for="per in state.periodicities" :key="per" :value="per">
                            {{ $t(`periodicities.${per}`) }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div id="plan-price-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.price') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          class="form-control"
                          v-model="state.newPlan.price"
                          v-bind:class="{ 'is-invalid': state.priceAddError }"
                          placeholder="1000"
                        />
                      </div>
                    </div>
                    <div id="plan-onlinePrice-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.onlinePrice') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          class="form-control"
                          v-model="state.newPlan.onlinePrice"
                          placeholder="1000"
                        />
                      </div>
                    </div>
                    <div id="plan-saving-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.saving') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          class="form-control"
                          v-model="state.newPlan.saving"
                          placeholder="25"
                        />
                      </div>
                    </div>
                    <div id="plan-onlineSaving-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.onlineSaving') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          class="form-control"
                          v-model="state.newPlan.onlineSaving"
                          placeholder="30"
                        />
                      </div>
                    </div>
                    <div id="plan-online-form" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.online') }}
                      </div>
                      <div class="col-6">
                        <Toggle v-model="state.newPlan.online" />
                      </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="add(state.newPlan)"
                      >
                        {{ $t('businessPlansAdmin.add') }} <i class="bi bi-save"></i>
                      </button>
                    </div>
                    <div class="row g-1 errors" id="feedback" v-if="state.errorsAdd.length > 0">
                      <Warning>
                        <template v-slot:message>
                          <li v-for="(error, index) in state.errorsAdd" :key="index">
                            {{ $t(error) }}
                          </li>
                        </template>
                      </Warning>
                    </div>
                  </div>
                </div>
                <div v-else>
                  <Message
                    :title="$t('businessPlansAdmin.message.3.title')"
                    :content="$t('businessPlansAdmin.message.3.content')"
                  />
                </div>
              </div>
              <!-- Pagination Mobile/Tablet -->
              <div v-if="state.filtered && state.filtered.length > 0" class="mt-3 mb-3">
                <div class="d-flex justify-content-center align-items-center flex-wrap gap-2 mb-2">
                  <span class="badge bg-secondary px-2 py-2 m-1">
                    {{ $t('businessPlansAdmin.listResult') }} {{ state.counter }}
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
              <div v-for="(plan, index) in paginatedItems" :key="index" class="plan-card">
                <div class="plan-card-header">
                  <div class="row align-items-center g-2">
                    <div class="col-auto">
                      <div class="plan-icon-wrapper">
                        <i :class="`bi bi-star${plan.active ? '-fill' : ''} plan-icon`"></i>
                      </div>
                    </div>
                    <div class="col plan-name-wrapper">
                      <h5 class="plan-title mb-0 fw-bold">{{ plan.name }}</h5>
                      <div class="plan-meta">
                        <span
                          v-if="plan.price !== undefined && plan.price !== null"
                          class="plan-price-badge"
                        >
                          <i class="bi bi-coin"></i> {{ plan.price }} / {{ plan.periodicity }}
                        </span>
                        <span v-if="plan.country" class="plan-country-badge ms-2">
                          <i class="bi bi-geo-alt"></i> {{ $t(`countries.${plan.country}`) }}
                        </span>
                      </div>
                    </div>
                    <div class="col-auto">
                      <div class="plan-status-badges">
                        <span
                          :class="`badge rounded-pill ${
                            plan.active ? 'bg-success' : 'bg-secondary'
                          } me-2`"
                        >
                          {{ plan.active ? $t('active') : $t('inactive') }}
                        </span>
                        <a
                          href="#"
                          @click.prevent="showUpdateForm(index)"
                          class="plan-toggle-btn text-decoration-none"
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
                  v-if="currentUserType === USER_TYPES.MASTER || state.toggles['plans.admin.read']"
                  :class="{ show: state.extendedEntity === index }"
                  class="detailed-data transition-slow"
                >
                  <div class="row g-1">
                    <div id="plan-name-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.name') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="plan.name"
                          v-bind:class="{ 'is-invalid': state.nameUpdateError }"
                          placeholder="Plan A"
                        />
                      </div>
                    </div>
                    <div id="plan-country-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.country') }}
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select px-1"
                          v-model="plan.country"
                          id="countries"
                        >
                          <option
                            v-for="country in state.countries"
                            :key="country"
                            :value="country"
                          >
                            {{ $t(`countries.${country}`) }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div id="plan-description-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.description') }}
                      </div>
                      <div class="col-6">
                        <textarea
                          min="1"
                          max="500"
                          type="text"
                          class="form-control"
                          v-model="plan.description"
                          v-bind:class="{ 'is-invalid': state.descriptionUpdateError }"
                          placeholder="Benefit A-Benefit B..."
                        >
                        </textarea>
                      </div>
                    </div>
                    <div id="plan-order-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.order') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          :max="state.plans.length + 1"
                          type="number"
                          class="form-control"
                          v-model="plan.order"
                          v-bind:class="{ 'is-invalid': state.orderUpdateError }"
                          placeholder="1"
                        />
                      </div>
                    </div>
                    <div id="plan-periodicity-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.periodicity') }}
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select px-1"
                          v-model="plan.periodicity"
                          id="periodicities"
                          v-bind:class="{ 'is-invalid': state.periodicityUpdateError }"
                        >
                          <option v-for="per in state.periodicities" :key="per" :value="per">
                            {{ $t(`periodicities.${per}`) }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div id="plan-price-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.price') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          class="form-control"
                          v-model="plan.price"
                          v-bind:class="{ 'is-invalid': state.priceUpdateError }"
                          placeholder="1000"
                        />
                      </div>
                    </div>
                    <div id="plan-onlinePrice-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.onlinePrice') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          class="form-control"
                          v-model="plan.onlinePrice"
                          placeholder="1000"
                        />
                      </div>
                    </div>
                    <div id="plan-saving-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.saving') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          class="form-control"
                          v-model="plan.saving"
                          placeholder="25"
                        />
                      </div>
                    </div>
                    <div id="plan-onlineSaving-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.onlineSaving') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          class="form-control"
                          v-model="plan.onlineSaving"
                          placeholder="30"
                        />
                      </div>
                    </div>
                    <div id="plan-active-form" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.active') }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="plan.active"
                          :disabled="!state.toggles['plans.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="plan-online-form" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.online') }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="plan.online"
                          :disabled="!state.toggles['plans.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="plan-id-form" class="row -2 mb-g3">
                      <div class="row plan-details-container">
                        <div class="col">
                          <span><strong>Id:</strong> {{ plan.id }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="update(plan)"
                        :disabled="
                          currentUserType !== USER_TYPES.MASTER &&
                          !state.toggles['plans.admin.update']
                        "
                      >
                        {{ $t('businessPlansAdmin.update') }} <i class="bi bi-save"></i>
                      </button>
                    </div>
                    <div class="row g-1 errors" id="feedback" v-if="state.errorsUpdate.length > 0">
                      <Warning>
                        <template v-slot:message>
                          <li v-for="(error, index) in state.errorsUpdate" :key="index">
                            {{ $t(error) }}
                          </li>
                        </template>
                      </Warning>
                    </div>
                  </div>
                </div>
                <div
                  v-if="
                    currentUserType !== USER_TYPES.MASTER &&
                    !state.toggles['plans.admin.read'] &&
                    !loading
                  "
                >
                  <Message
                    :title="$t('businessPlansAdmin.message.1.title')"
                    :content="$t('businessPlansAdmin.message.1.content')"
                  />
                </div>
              </div>
            </div>
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
          :title="$t('businessPlansAdmin.title')"
          :toggles="state.toggles"
          component-name="businessPlansAdmin"
          @go-back="goBack"
        />
        <div id="businessPlansAdmin">
          <div id="businessPlansAdmin-result" class="mt-4">
            <div>
              <div v-if="state.plans.length === 0">
                <Message
                  :title="$t('businessPlansAdmin.message.2.title')"
                  :content="$t('businessPlansAdmin.message.2.content')"
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
                      v-model="state.filterCountry"
                      @change="handleFilterChange"
                    >
                      <option value="">
                        {{ $t('businessPlansAdmin.country') }}: {{ $t('common.all') }}
                      </option>
                      <option v-for="country in state.countries" :key="country" :value="country">
                        {{ $t(`countries.${country}`) }}
                      </option>
                    </select>
                  </div>
                  <div class="col-6 col-md-3">
                    <select
                      class="form-control filter-select"
                      v-model="state.filterPeriodicity"
                      @change="handleFilterChange"
                    >
                      <option value="">
                        {{ $t('businessPlansAdmin.periodicity') }}: {{ $t('common.all') }}
                      </option>
                      <option v-for="per in state.periodicities" :key="per" :value="per">
                        {{ $t(`periodicities.${per}`) }}
                      </option>
                    </select>
                  </div>
                </div>
                <div class="row g-2 mb-2">
                  <div class="col-6 col-md-3">
                    <select
                      class="form-control filter-select"
                      v-model="state.filterActive"
                      @change="handleFilterChange"
                    >
                      <option value="">
                        {{ $t('businessPlansAdmin.active') }}: {{ $t('common.all') }}
                      </option>
                      <option value="true">{{ $t('active') }}</option>
                      <option value="false">{{ $t('inactive') }}</option>
                    </select>
                  </div>
                  <div class="col-6 col-md-3">
                    <select
                      class="form-control filter-select"
                      v-model="state.filterProductType"
                      @change="handleFilterChange"
                    >
                      <option value="">
                        {{ $t('businessPlansAdmin.type') }}: {{ $t('common.all') }}
                      </option>
                      <option v-for="product in state.productTypes" :key="product" :value="product">
                        {{ $t(`products.types.${product}`) }}
                      </option>
                    </select>
                  </div>
                  <div class="col-12 col-md-6 text-end">
                    <button
                      class="btn btn-sm btn-secondary rounded-pill px-3"
                      @click="clearFilters"
                      v-if="
                        state.searchText ||
                        state.filterCountry ||
                        state.filterPeriodicity ||
                        state.filterActive ||
                        state.filterProductType
                      "
                    >
                      <i class="bi bi-x-circle"></i> {{ $t('common.reset') }}
                    </button>
                  </div>
                </div>
              </div>
              <div class="row mb-2">
                <div class="col-12 text-start">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd()"
                    :disabled="
                      currentUserType !== USER_TYPES.MASTER && !state.toggles['plans.admin.add']
                    "
                  >
                    <i class="bi bi-plus-lg"></i>
                  </button>
                </div>
              </div>
              <div
                id="add-plan"
                class="plan-card mb-4"
                v-if="state.showAdd && state.toggles['plans.admin.add']"
              >
                <div v-if="state.plans.length < state.toggles['plans.admin.limit']">
                  <div class="row g-1">
                    <div id="plan-name-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.name') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="state.newPlan.name"
                          v-bind:class="{ 'is-invalid': state.nameAddError }"
                          placeholder="Plan A"
                        />
                      </div>
                    </div>
                    <div id="plan-type-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.type') }}
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select px-1"
                          v-model="state.newPlan.productType"
                          id="countries"
                        >
                          <option
                            v-for="product in state.productTypes"
                            :key="product"
                            :value="product"
                          >
                            {{ $t(`products.types.${product}`) }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div id="plan-country-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.country') }}
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select px-1"
                          v-model="state.newPlan.country"
                          id="countries"
                        >
                          <option
                            v-for="country in state.countries"
                            :key="country"
                            :value="country"
                          >
                            {{ $t(`countries.${country}`) }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div id="plan-description-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.description') }}
                      </div>
                      <div class="col-6">
                        <textarea
                          class="form-control"
                          v-model="state.newPlan.description"
                          v-bind:class="{ 'is-invalid': state.descriptionAddError }"
                          placeholder="Description"
                        ></textarea>
                      </div>
                    </div>
                    <div id="plan-order-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.order') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          type="number"
                          class="form-control"
                          v-model="state.newPlan.order"
                          v-bind:class="{ 'is-invalid': state.orderAddError }"
                          placeholder="1"
                        />
                      </div>
                    </div>
                    <div id="plan-periodicity-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.periodicity') }}
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select px-1"
                          v-model="state.newPlan.periodicity"
                          id="periodicities"
                        >
                          <option
                            v-for="periodicity in state.periodicities"
                            :key="periodicity"
                            :value="periodicity"
                          >
                            {{ $t(`periodicities.${periodicity}`) }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div id="plan-price-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.price') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          step="0.01"
                          class="form-control"
                          v-model="state.newPlan.price"
                          v-bind:class="{ 'is-invalid': state.priceAddError }"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div class="row g-1 mt-2">
                      <div class="col-12 text-center">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                          @click="add()"
                          :disabled="loading"
                        >
                          <i class="bi bi-save"></i> {{ $t('add') }}
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-secondary rounded-pill px-4 ms-2"
                          @click="showAdd()"
                        >
                          <i class="bi bi-x-lg"></i> {{ $t('cancel') }}
                        </button>
                      </div>
                    </div>
                    <div v-if="state.errorsAdd.length > 0" class="row g-1 mt-2">
                      <div class="col-12">
                        <Warning
                          v-for="(error, index) in state.errorsAdd"
                          :key="index"
                          :message="$t(error)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else>
                  <Message
                    :title="$t('businessPlansAdmin.message.3.title')"
                    :content="$t('businessPlansAdmin.message.3.content')"
                  />
                </div>
              </div>
              <!-- Pagination Desktop -->
              <div v-if="state.filtered && state.filtered.length > 0" class="mt-3 mb-3">
                <div class="d-flex justify-content-center align-items-center flex-wrap gap-2 mb-2">
                  <span class="badge bg-secondary px-2 py-2 m-1">
                    {{ $t('businessPlansAdmin.listResult') }} {{ state.counter }}
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
              <template
                v-if="currentUserType === USER_TYPES.MASTER || state.toggles['plans.admin.read']"
              >
                <div v-for="plan in paginatedItems" :key="plan.id" class="plan-card mb-4">
                  <div class="plan-card-header">
                    <div class="row align-items-center g-2">
                      <div class="col-auto">
                        <div class="plan-icon-wrapper">
                          <i :class="`bi bi-star${plan.active ? '-fill' : ''} plan-icon`"></i>
                        </div>
                      </div>
                      <div class="col plan-name-wrapper">
                        <h5 class="plan-title mb-0 fw-bold">{{ plan.name }}</h5>
                        <div class="plan-meta">
                          <span
                            v-if="plan.price !== undefined && plan.price !== null"
                            class="plan-price-badge"
                          >
                            <i class="bi bi-coin"></i> {{ plan.price }} / {{ plan.periodicity }}
                          </span>
                          <span v-if="plan.country" class="plan-country-badge ms-2">
                            <i class="bi bi-geo-alt"></i> {{ $t(`countries.${plan.country}`) }}
                          </span>
                        </div>
                      </div>
                      <div class="col-auto">
                        <div class="plan-status-badges">
                          <span
                            :class="`badge rounded-pill ${
                              plan.active ? 'bg-success' : 'bg-secondary'
                            } me-2`"
                          >
                            {{ plan.active ? $t('active') : $t('inactive') }}
                          </span>
                          <a
                            href="#"
                            @click.prevent="extend(plan)"
                            class="plan-toggle-btn text-decoration-none"
                            :class="{
                              active: state.extendedEntity && state.extendedEntity.id === plan.id,
                            }"
                          >
                            <i
                              :class="`bi ${
                                state.extendedEntity && state.extendedEntity.id === plan.id
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
                    v-if="state.extendedEntity && state.extendedEntity.id === plan.id"
                    class="plan-details-container"
                  >
                    <div class="row g-1">
                      <div id="plan-name-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t('businessPlansAdmin.name') }}
                        </div>
                        <div class="col-6">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="state.extendedEntity.name"
                            v-bind:class="{ 'is-invalid': state.nameUpdateError }"
                            placeholder="Plan A"
                          />
                        </div>
                      </div>
                      <div id="plan-type-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t('businessPlansAdmin.type') }}
                        </div>
                        <div class="col-6">
                          <select
                            class="btn btn-md btn-light fw-bold text-dark select px-1"
                            v-model="state.extendedEntity.productType"
                            id="countries"
                          >
                            <option
                              v-for="product in state.productTypes"
                              :key="product"
                              :value="product"
                            >
                              {{ $t(`products.types.${product}`) }}
                            </option>
                          </select>
                        </div>
                      </div>
                      <div id="plan-country-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t('businessPlansAdmin.country') }}
                        </div>
                        <div class="col-6">
                          <select
                            class="btn btn-md btn-light fw-bold text-dark select px-1"
                            v-model="state.extendedEntity.country"
                            id="countries"
                          >
                            <option
                              v-for="country in state.countries"
                              :key="country"
                              :value="country"
                            >
                              {{ $t(`countries.${country}`) }}
                            </option>
                          </select>
                        </div>
                      </div>
                      <div id="plan-description-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t('businessPlansAdmin.description') }}
                        </div>
                        <div class="col-6">
                          <textarea
                            class="form-control"
                            v-model="state.extendedEntity.description"
                            v-bind:class="{ 'is-invalid': state.descriptionUpdateError }"
                            placeholder="Description"
                          ></textarea>
                        </div>
                      </div>
                      <div id="plan-order-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t('businessPlansAdmin.order') }}
                        </div>
                        <div class="col-6">
                          <input
                            min="1"
                            type="number"
                            class="form-control"
                            v-model="state.extendedEntity.order"
                            v-bind:class="{ 'is-invalid': state.orderUpdateError }"
                            placeholder="1"
                          />
                        </div>
                      </div>
                      <div id="plan-periodicity-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t('businessPlansAdmin.periodicity') }}
                        </div>
                        <div class="col-6">
                          <select
                            class="btn btn-md btn-light fw-bold text-dark select px-1"
                            v-model="state.extendedEntity.periodicity"
                            id="periodicities"
                          >
                            <option
                              v-for="periodicity in state.periodicities"
                              :key="periodicity"
                              :value="periodicity"
                            >
                              {{ $t(`periodicities.${periodicity}`) }}
                            </option>
                          </select>
                        </div>
                      </div>
                      <div id="plan-price-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t('businessPlansAdmin.price') }}
                        </div>
                        <div class="col-6">
                          <input
                            min="0"
                            type="number"
                            step="0.01"
                            class="form-control"
                            v-model="state.extendedEntity.price"
                            v-bind:class="{ 'is-invalid': state.priceUpdateError }"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div id="plan-onlinePrice-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t('businessPlansAdmin.onlinePrice') }}
                        </div>
                        <div class="col-6">
                          <input
                            min="0"
                            type="number"
                            step="0.01"
                            class="form-control"
                            v-model="state.extendedEntity.onlinePrice"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div id="plan-saving-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t('businessPlansAdmin.saving') }}
                        </div>
                        <div class="col-6">
                          <input
                            min="0"
                            type="number"
                            class="form-control"
                            v-model="state.extendedEntity.saving"
                            placeholder="25"
                          />
                        </div>
                      </div>
                      <div id="plan-onlineSaving-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t('businessPlansAdmin.onlineSaving') }}
                        </div>
                        <div class="col-6">
                          <input
                            min="0"
                            type="number"
                            class="form-control"
                            v-model="state.extendedEntity.onlineSaving"
                            placeholder="30"
                          />
                        </div>
                      </div>
                      <div id="plan-active-form" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t('businessPlansAdmin.active') }}
                        </div>
                        <div class="col-6">
                          <Toggle
                            v-model="state.extendedEntity.active"
                            :disabled="
                              currentUserType !== USER_TYPES.MASTER &&
                              !state.toggles['plans.admin.edit']
                            "
                          />
                        </div>
                      </div>
                      <div id="plan-online-form" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t('businessPlansAdmin.online') }}
                        </div>
                        <div class="col-6">
                          <Toggle
                            v-model="state.extendedEntity.online"
                            :disabled="
                              currentUserType !== USER_TYPES.MASTER &&
                              !state.toggles['plans.admin.edit']
                            "
                          />
                        </div>
                      </div>
                      <div id="plan-id-form" class="row g-1 mb-3">
                        <div class="col-12">
                          <span><strong>Id:</strong> {{ state.extendedEntity.id }}</span>
                        </div>
                      </div>
                      <div class="row g-1 mt-2">
                        <div class="col-12 text-center">
                          <button
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                            @click="update(state.extendedEntity)"
                            :disabled="
                              loading ||
                              (currentUserType !== USER_TYPES.MASTER &&
                                !state.toggles['plans.admin.update'])
                            "
                          >
                            <i class="bi bi-save"></i> {{ $t('update') }}
                          </button>
                          <button
                            class="btn btn-lg btn-size fw-bold btn-secondary rounded-pill px-4 ms-2"
                            @click="extend(undefined)"
                          >
                            <i class="bi bi-x-lg"></i> {{ $t('cancel') }}
                          </button>
                        </div>
                      </div>
                      <div v-if="state.errorsUpdate.length > 0" class="row g-1 mt-2">
                        <div class="col-12">
                          <Warning
                            v-for="(error, index) in state.errorsUpdate"
                            :key="index"
                            :message="$t(error)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <div
                v-if="
                  currentUserType !== USER_TYPES.MASTER &&
                  !state.toggles['plans.admin.read'] &&
                  !loading
                "
              >
                <Message
                  :title="$t('businessPlansAdmin.message.1.title')"
                  :content="$t('businessPlansAdmin.message.1.content')"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.plan-card {
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

.plan-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.plan-card-header {
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.1);
  margin-bottom: 0.5rem;
}

.plan-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--azul-qr) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.plan-icon {
  font-size: 1.25rem;
  color: white;
}

.plan-name-wrapper {
  min-width: 0;
}

.plan-title {
  font-size: 1.1rem;
  color: var(--gris-default);
  margin-bottom: 0.15rem;
}

.plan-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.plan-price-badge {
  font-size: 0.85rem;
  color: var(--azul-turno);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.plan-country-badge {
  font-size: 0.75rem;
  color: var(--gris-default);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.plan-status-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.plan-toggle-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(169, 169, 169, 0.1);
  color: var(--gris-default);
  transition: all 0.2s ease;
  font-size: 1.1rem;
}

.plan-toggle-btn:hover {
  background-color: rgba(169, 169, 169, 0.2);
  color: var(--azul-turno);
  transform: scale(1.05);
}

.plan-toggle-btn.active {
  background-color: var(--azul-turno);
  color: white;
}

.plan-details-container {
  font-size: 0.9rem;
  padding: 0.75rem;
  background-color: rgba(250, 251, 252, 0.5);
  border-radius: 8px;
  margin-top: 0.5rem;
  animation: slideDown 0.3s ease;
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

.show {
  padding: 10px;
  max-height: 600px !important;
  overflow-y: auto;
}

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

/* Search and Filter Styles */
.search-filters-container {
  background-color: rgba(250, 251, 252, 0.5);
  border-radius: 8px;
  padding: 0.75rem;
  border: 1px solid rgba(169, 169, 169, 0.1);
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: rgba(0, 0, 0, 0.4);
  font-size: 0.9375rem;
  z-index: 1;
  pointer-events: none;
}

.search-input {
  flex: 1;
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  font-size: 0.875rem;
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
}

.filter-select {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.filter-select:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
}
</style>
