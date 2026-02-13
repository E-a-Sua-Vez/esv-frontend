<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getCommerceById } from '../../application/services/commerce';
import { getPermissions } from '../../application/services/permissions';
import { getServiceByCommerce } from '../../application/services/service';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import ProductsStockManagement from '../../components/products/ProductsStockManagement.vue';
import ProductsAttentionManagement from '../../components/products/ProductsAttentionManagement.vue';
import InventoryDashboard from '../../components/products/InventoryDashboard.vue';
import DesktopContentLayout from '../../components/common/desktop/DesktopContentLayout.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import DesktopFiltersPanel from '../../components/common/desktop/DesktopFiltersPanel.vue';
import DateRangeFilters from '../../components/common/desktop/DateRangeFilters.vue';
import { DateModel } from '../../shared/utils/date.model';

export default {
  name: 'BusinessProductStockAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    ToggleCapabilities,
    ComponentMenu,
    ProductsStockManagement,
    ProductsAttentionManagement,
    InventoryDashboard,
    DesktopContentLayout,
    DesktopPageHeader,
    DesktopFiltersPanel,
    DateRangeFilters,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');
    const productsContentRef = ref(null);
    const attentionsContentRef = ref(null);
    const dashboardContentRef = ref(null);
    const filterIdCounter = ref(Date.now());
    const attentionsFilterIdCounter = ref(Date.now() + 1);

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      queues: ref([]),
      services: ref([]),
      queue: {},
      dateType: 'month',
      showDashboard: true,
      showProducts: false,
      showAttentions: false,
      toggles: {},
      startDate: undefined,
      endDate: undefined,
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);
    const selectedCommerces = computed(() =>
      commerce.value && commerce.value.id ? [commerce.value] : []
    );

    const currentTabTitle = computed(() => {
      if (state.showDashboard) return 'businessProductStockAdmin.dashboard';
      if (state.showProducts) return 'businessProductStockAdmin.products';
      if (state.showAttentions) return 'businessProductStockAdmin.attentions';
      return '';
    });

    // Load commerce-dependent data
    const loadCommerceData = async commerceId => {
      if (!commerceId) {
        state.queues = [];
        state.services = [];
        return;
      }
      try {
        const commerceData = await getCommerceById(commerceId);
        state.queues = commerceData?.queues || [];
        state.services = await getServiceByCommerce(commerceId);
      } catch (error) {
        state.queues = [];
        state.services = [];
      }
    };

    // Watch for commerce changes and reload data
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            // Immediately clear data to prevent showing old results
            state.queues = [];
            state.services = [];
            await loadCommerceData(newCommerce.id);
            loading.value = false;
          } catch (error) {
            loading.value = false;
          }
        }
      },
      { immediate: false }
    );

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('products-stock');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        // Load commerce-dependent data for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadCommerceData(commerceToUse.id);
        }

        loading.value = false;
        activateTabFromHash();
      } catch (error) {
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

    const goBack = () => {
      router.back();
    };

    const formatDateDisplay = (dateStr) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateStr;
    };

    const activateTabFromHash = () => {
      const hash = window.location.hash.replace('#', '');
      switch (hash) {
        case 'dashboard':
        case 'indicadores':
        case 'indicators':
          showDashboard();
          break;
        case 'productos':
        case 'products':
        case 'items':
          showProducts();
          break;
        case 'atenciones':
        case 'attentions':
        case 'atendimentos':
          showAttentions();
          break;
        default:
          break;
      }
    };

    const showDashboard = () => {
      state.showDashboard = true;
      state.showProducts = false;
      state.showAttentions = false;
      window.location.hash = 'dashboard';
    };

    const showProducts = () => {
      state.showDashboard = false;
      state.showProducts = true;
      state.showAttentions = false;
      window.location.hash = 'productos';
    };

    const showAttentions = () => {
      state.showDashboard = false;
      state.showProducts = false;
      state.showAttentions = true;
      window.location.hash = 'atenciones';
    };

    const handleQuickRecharge = productId => {
      // Cambiar a vista de productos y abrir modal de recarga
      showProducts();
      // El componente ProductsStockManagement puede manejar esto
      // Emitir evento o usar router
    };

    const handleFiltersToggle = collapsed => {
      // Handle filters toggle if needed
    };

    const handleCommerceChanged = async commerce => {
      // Commerce is now managed globally
      if (commerce && commerce.id && commerce.id !== 'ALL') {
        await store.setCurrentCommerce(commerce);
      }
    };

    const handleDashboardDateQuickSelect = (type, filterProps) => {
      // Use the methods exposed by the slot to ensure proper synchronization
      if (!dashboardContentRef.value) return;

      if (type === 'today') {
        dashboardContentRef.value.getToday();
      } else if (type === 'currentMonth') {
        dashboardContentRef.value.getCurrentMonth();
      } else if (type === 'lastMonth') {
        dashboardContentRef.value.getLastMonth();
      } else if (type === 'lastThreeMonths') {
        dashboardContentRef.value.getLastThreeMonths();
      }
    };

    return {
      state,
      loading,
      alertError,
      goBack,
      isActiveBusiness,
      formatDateDisplay,
      activateTabFromHash,
      currentTabTitle,
      showDashboard,
      showProducts,
      showAttentions,
      handleFiltersToggle,
      handleCommerceChanged,
      handleQuickRecharge,
      commerce,
      selectedCommerces,
      productsContentRef,
      attentionsContentRef,
      dashboardContentRef,
      filterIdCounter,
      attentionsFilterIdCounter,
      handleDashboardDateQuickSelect,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo
          :src="state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessProductStockAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessProductStockAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="product-stock">
          <div v-if="isActiveBusiness()">
            <div v-if="!loading" id="product-stock-result" class="mt-2">
              <div class="row col mx-1 mt-3 mb-1 tabs-header-divider">
                <div class="col-4 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showDashboard ? 'btn-selected' : ''"
                    @click="showDashboard()"
                  >
                    <span class="d-none d-lg-inline">{{ $t('businessProductStockAdmin.dashboard') || 'Dashboard' }} <br /></span>
                    <i class="bi bi-bar-chart-fill"></i>
                  </button>
                </div>
                <div class="col-4 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showProducts ? 'btn-selected' : ''"
                    @click="showProducts()"
                    :disabled="!state.toggles['products-stock.products.view']"
                  >
                    <span class="d-none d-lg-inline">{{ $t('businessProductStockAdmin.products') }} <br /></span>
                    <i class="bi bi-eyedropper"></i>
                  </button>
                </div>
                <div class="col-4 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showAttentions ? 'btn-selected' : ''"
                    @click="showAttentions()"
                    :disabled="!state.toggles['products-stock.attentions.view']"
                  >
                    <span class="d-none d-lg-inline">{{ $t('businessProductStockAdmin.attentions') }} <br /></span>
                    <i class="bi bi-qr-code"></i>
                  </button>
                </div>
                <div class="col-12 mt-3">
                  <div id="title" class="metric-title">
                    <span>{{ $t(currentTabTitle) }}</span>
                  </div>
                  <div v-if="state.startDate && state.endDate" id="sub-title" class="metric-subtitle">
                    ({{ $t('dashboard.dates.from') }} <strong>{{ formatDateDisplay(state.startDate) }}</strong>
                    {{ $t('dashboard.dates.to') }} <strong>{{ formatDateDisplay(state.endDate) }}</strong>)
                  </div>
                </div>
              </div>
              <div>
                <InventoryDashboard
                  ref="dashboardContentRef"
                  v-if="state.showDashboard"
                  :show="state.showDashboard"
                  :commerce="commerce"
                  :commerces="selectedCommerces"
                  filters-location="slot"
                  @quick-recharge="handleQuickRecharge"
                ></InventoryDashboard>
              </div>
              <div>
                <ProductsStockManagement
                  :show-product-stock-management="state.showProducts"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
                  :business="state.business"
                  filters-location="component"
                >
                </ProductsStockManagement>
                <ProductsAttentionManagement
                  :show-product-stock-management="state.showAttentions"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
                  :services="state.services"
                  filters-location="component"
                >
                </ProductsAttentionManagement>
              </div>
            </div>
          </div>
          <div v-if="!isActiveBusiness() && !loading">
            <Message
              :title="$t('businessProductStockAdmin.message.1.title')"
              :content="$t('businessProductStockAdmin.message.1.content')"
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
          :business-id="state.business?.id"
          :loading="loading"
          :title="$t('businessProductStockAdmin.title')"
          :toggles="state.toggles"
          component-name="businessProductStockAdmin"
          @go-back="goBack"
        />
        <div id="product-stock" v-if="isActiveBusiness()">
          <div>
            <DesktopContentLayout
              v-if="!loading"
              :show-filters="true"
              :filters-sticky="true"
              :initial-collapsed="false"
              @filters-toggle="handleFiltersToggle"
            >
              <template #filters="{ onToggle, collapsed }">
                <DesktopFiltersPanel
                  :model-value="{ commerce: commerce }"
                  :loading="loading"
                  :commerces="[]"
                  :show-commerce-selector="false"
                  :show-date-filters="false"
                  :show-quick-date-buttons="false"
                  :show-refresh-button="false"
                  :sticky="true"
                  :show-all-option="true"
                  :commerce-selector-id="'product-stock-commerce-selector'"
                  :on-toggle="onToggle"
                  :collapsed="collapsed"
                  @commerce-changed="handleCommerceChanged"
                >
                  <template #custom-filters>
                    <!-- Filters for Dashboard tab -->
                    <InventoryDashboard
                      v-if="state.showDashboard"
                      :show="false"
                      :commerce="commerce"
                      :commerces="selectedCommerces"
                      filters-location="slot"
                    >
                      <template #filters-exposed="filterProps">
                        <div class="filters-content-wrapper">
                          <!-- Date quick buttons -->
                          <div class="row my-2">
                            <div class="col-6 mb-2">
                              <button
                                class="btn btn-sm btn-dark rounded-pill w-100"
                                @click="handleDashboardDateQuickSelect('today', filterProps)"
                                :disabled="filterProps.loading"
                              >
                                {{ $t('dashboard.today') }}
                              </button>
                            </div>
                            <div class="col-6 mb-2">
                              <button
                                class="btn btn-sm btn-dark rounded-pill w-100"
                                @click="handleDashboardDateQuickSelect('currentMonth', filterProps)"
                                :disabled="filterProps.loading"
                              >
                                {{ $t('dashboard.thisMonth') }}
                              </button>
                            </div>
                            <div class="col-6 mb-2">
                              <button
                                class="btn btn-sm btn-dark rounded-pill w-100"
                                @click="handleDashboardDateQuickSelect('lastMonth', filterProps)"
                                :disabled="filterProps.loading"
                              >
                                {{ $t('dashboard.lastMonth') }}
                              </button>
                            </div>
                            <div class="col-6 mb-2">
                              <button
                                class="btn btn-sm btn-dark rounded-pill w-100"
                                @click="
                                  handleDashboardDateQuickSelect('lastThreeMonths', filterProps)
                                "
                                :disabled="filterProps.loading"
                              >
                                {{ $t('dashboard.lastThreeMonths') }}
                              </button>
                            </div>
                          </div>
                          <!-- Date Range Filters with Search Button -->
                          <DateRangeFilters
                            :start-date="filterProps.startDate"
                            :end-date="filterProps.endDate"
                            :show-quick-buttons="false"
                            :disabled="filterProps.loading"
                            :show-search-button="true"
                            @update:startDate="
                              val => {
                                filterProps.startDate = val;
                                if (dashboardContentRef) {
                                  dashboardContentRef.startDate = val;
                                }
                              }
                            "
                            @update:endDate="
                              val => {
                                filterProps.endDate = val;
                                if (dashboardContentRef) {
                                  dashboardContentRef.endDate = val;
                                }
                              }
                            "
                            @search="
                              () => {
                                if (dashboardContentRef) {
                                  dashboardContentRef.startDate = filterProps.startDate;
                                  dashboardContentRef.endDate = filterProps.endDate;
                                  dashboardContentRef.loadKpis();
                                }
                              }
                            "
                            @quick-select="
                              ({ startDate, endDate }) => {
                                filterProps.startDate = startDate;
                                filterProps.endDate = endDate;
                                if (dashboardContentRef) {
                                  dashboardContentRef.startDate = startDate;
                                  dashboardContentRef.endDate = endDate;
                                  dashboardContentRef.loadKpis();
                                }
                              }
                            "
                          />
                        </div>
                      </template>
                    </InventoryDashboard>
                    <!-- Filters for Products tab -->
                    <ProductsStockManagement
                      v-if="state.showProducts"
                      :show-product-stock-management="false"
                      :toggles="state.toggles"
                      :commerce="commerce"
                      :queues="Array.isArray(state.queues) ? state.queues : []"
                      :commerces="selectedCommerces"
                      :business="state.business"
                      filters-location="slot"
                    >
                      <template #filters-exposed="filterProps">
                        <div class="filters-content-wrapper">
                          <!-- Search input -->
                          <div class="mb-3">
                            <label class="form-label fw-bold mb-2">{{
                              $t('businessProductStockAdmin.search') || 'Buscar'
                            }}</label>
                            <div class="d-flex gap-2">
                              <input
                                type="text"
                                class="form-control flex-grow-1"
                                :value="filterProps.searchText"
                                @input="
                                  e => {
                                    filterProps.searchText = e.target.value;
                                  }
                                "
                                @keyup.enter="
                                  if (productsContentRef) {
                                    productsContentRef.searchText = filterProps.searchText;
                                    productsContentRef.page = 1;
                                    productsContentRef.refresh();
                                  }
                                "
                                :placeholder="$t('businessProductStockAdmin.search')"
                              />
                              <button
                                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                                @click="
                                  if (productsContentRef) {
                                    productsContentRef.searchText = filterProps.searchText;
                                    productsContentRef.page = 1;
                                    productsContentRef.refresh();
                                  }
                                "
                                :disabled="filterProps.loading"
                                style="flex-shrink: 0"
                              >
                                <i class="bi bi-search"></i>
                              </button>
                            </div>
                          </div>
                          <!-- Product Status filter -->
                          <div class="mb-3">
                            <label class="form-label fw-bold mb-2">{{
                              $t('dashboard.tracing.filters.productLevel') || 'Estado del Producto'
                            }}</label>
                            <div class="d-flex gap-2 align-items-center">
                              <input
                                type="radio"
                                class="btn-check"
                                :id="`product-status-good-${filterIdCounter}`"
                                name="product-status-filter"
                                value="GOOD"
                                :checked="filterProps.productStatus === 'GOOD'"
                                @change="
                                  filterProps.productStatus = 'GOOD';
                                  if (productsContentRef) {
                                    productsContentRef.productStatus = 'GOOD';
                                    productsContentRef.page = 1;
                                    productsContentRef.refresh();
                                  }
                                "
                              />
                              <label
                                class="btn btn-sm"
                                :for="`product-status-good-${filterIdCounter}`"
                              >
                                <i class="bi bi-battery-full green-icon h5"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="`product-status-medium-${filterIdCounter}`"
                                name="product-status-filter"
                                value="MEDIUM"
                                :checked="filterProps.productStatus === 'MEDIUM'"
                                @change="
                                  filterProps.productStatus = 'MEDIUM';
                                  if (productsContentRef) {
                                    productsContentRef.productStatus = 'MEDIUM';
                                    productsContentRef.page = 1;
                                    productsContentRef.refresh();
                                  }
                                "
                              />
                              <label
                                class="btn btn-sm"
                                :for="`product-status-medium-${filterIdCounter}`"
                              >
                                <i class="bi bi-battery-half yellow-icon h5"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="`product-status-low-${filterIdCounter}`"
                                name="product-status-filter"
                                value="LOW"
                                :checked="filterProps.productStatus === 'LOW'"
                                @change="
                                  filterProps.productStatus = 'LOW';
                                  if (productsContentRef) {
                                    productsContentRef.productStatus = 'LOW';
                                    productsContentRef.page = 1;
                                    productsContentRef.refresh();
                                  }
                                "
                              />
                              <label
                                class="btn btn-sm"
                                :for="`product-status-low-${filterIdCounter}`"
                              >
                                <i class="bi bi-battery red-icon h5"></i>
                              </label>
                              <i
                                class="bi bi-info-circle-fill h7 m-2"
                                :title="$t(`dashboard.tracing.filters.productLevel`)"
                              ></i>
                            </div>
                          </div>
                          <!-- Checkboxes -->
                          <div class="mb-3">
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="`product-filter-expired-${filterIdCounter}`"
                                :checked="filterProps.expired === true"
                                @change="
                                  const isChecked = $event.target.checked;
                                  filterProps.expired = isChecked ? true : false;
                                  if (productsContentRef) {
                                    productsContentRef.expired = isChecked ? true : false;
                                    productsContentRef.page = 1;
                                    productsContentRef.refresh();
                                  }
                                "
                              />
                              <label
                                class="form-check-label"
                                :for="`product-filter-expired-${filterIdCounter}`"
                              >
                                {{ $t('businessProductStockAdmin.expired') }}
                              </label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="`product-filter-replacement-${filterIdCounter}`"
                                :checked="filterProps.replacement === true"
                                @change="
                                  const isChecked = $event.target.checked;
                                  filterProps.replacement = isChecked ? true : false;
                                  if (productsContentRef) {
                                    productsContentRef.replacement = isChecked ? true : false;
                                    productsContentRef.page = 1;
                                    productsContentRef.refresh();
                                  }
                                "
                              />
                              <label
                                class="form-check-label"
                                :for="`product-filter-replacement-${filterIdCounter}`"
                              >
                                {{ $t('businessProductStockAdmin.replacement') }}
                              </label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="`product-filter-asc-${filterIdCounter}`"
                                :checked="filterProps.asc === true"
                                @change="
                                  const isChecked = $event.target.checked;
                                  filterProps.asc = isChecked;
                                  if (productsContentRef) {
                                    productsContentRef.asc = isChecked;
                                    productsContentRef.page = 1;
                                    productsContentRef.refresh();
                                  }
                                "
                              />
                              <label
                                class="form-check-label"
                                :for="`product-filter-asc-${filterIdCounter}`"
                              >
                                {{ filterProps.asc ? $t('dashboard.asc') : $t('dashboard.desc') }}
                              </label>
                            </div>
                          </div>
                          <!-- Clear button -->
                          <div class="mb-3">
                            <button
                              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100"
                              @click="
                                // Clear filter instance
                                filterProps.productStatus = undefined;
                                filterProps.expired = undefined;
                                filterProps.replacement = undefined;
                                filterProps.asc = true;
                                filterProps.searchText = undefined;
                                // Clear and refresh content instance
                                if (productsContentRef) {
                                  productsContentRef.productStatus = undefined;
                                  productsContentRef.expired = undefined;
                                  productsContentRef.replacement = undefined;
                                  productsContentRef.asc = true;
                                  productsContentRef.searchText = undefined;
                                  productsContentRef.page = 1;
                                  productsContentRef.refresh();
                                }
                              "
                            >
                              <i class="bi bi-eraser-fill"></i>
                              {{ $t('dashboard.clear') || 'Limpiar' }}
                            </button>
                          </div>
                        </div>
                      </template>
                    </ProductsStockManagement>
                    <!-- Filters for Attentions tab -->
                    <ProductsAttentionManagement
                      v-if="state.showAttentions"
                      :show-product-stock-management="false"
                      :toggles="state.toggles"
                      :commerce="commerce"
                      :queues="Array.isArray(state.queues) ? state.queues : []"
                      :commerces="selectedCommerces"
                      :services="Array.isArray(state.services) ? state.services : []"
                      filters-location="slot"
                    >
                      <template #filters-exposed="filterProps">
                        <div class="filters-content-wrapper">
                          <!-- Date quick buttons -->
                          <div class="row my-2">
                            <div class="col-6 mb-2">
                              <button
                                class="btn btn-sm btn-dark rounded-pill w-100"
                                @click="
                                  filterProps.getToday();
                                  if (attentionsContentRef) {
                                    attentionsContentRef.getToday();
                                  }
                                "
                                :disabled="filterProps.loading"
                              >
                                {{ $t('dashboard.today') }}
                              </button>
                            </div>
                            <div class="col-6 mb-2">
                              <button
                                class="btn btn-sm btn-dark rounded-pill w-100"
                                @click="
                                  filterProps.getCurrentMonth();
                                  if (attentionsContentRef) {
                                    attentionsContentRef.getCurrentMonth();
                                  }
                                "
                                :disabled="filterProps.loading"
                              >
                                {{ $t('dashboard.thisMonth') }}
                              </button>
                            </div>
                            <div class="col-6 mb-2">
                              <button
                                class="btn btn-sm btn-dark rounded-pill w-100"
                                @click="
                                  filterProps.getLastMonth();
                                  if (attentionsContentRef) {
                                    attentionsContentRef.getLastMonth();
                                  }
                                "
                                :disabled="filterProps.loading"
                              >
                                {{ $t('dashboard.lastMonth') }}
                              </button>
                            </div>
                            <div class="col-6 mb-2">
                              <button
                                class="btn btn-sm btn-dark rounded-pill w-100"
                                @click="
                                  filterProps.getLastThreeMonths();
                                  if (attentionsContentRef) {
                                    attentionsContentRef.getLastThreeMonths();
                                  }
                                "
                                :disabled="filterProps.loading"
                              >
                                {{ $t('dashboard.lastThreeMonths') }}
                              </button>
                            </div>
                          </div>
                          <!-- Date Range Filters with Search Button -->
                          <DateRangeFilters
                            :start-date="filterProps.startDate"
                            :end-date="filterProps.endDate"
                            :show-quick-buttons="false"
                            :disabled="filterProps.loading"
                            :show-search-button="true"
                            @update:startDate="
                              val => {
                                filterProps.startDate = val;
                                if (attentionsContentRef) {
                                  attentionsContentRef.startDate = val;
                                }
                              }
                            "
                            @update:endDate="
                              val => {
                                filterProps.endDate = val;
                                if (attentionsContentRef) {
                                  attentionsContentRef.endDate = val;
                                }
                              }
                            "
                            @search="
                              () => {
                                if (attentionsContentRef) {
                                  attentionsContentRef.startDate = filterProps.startDate;
                                  attentionsContentRef.endDate = filterProps.endDate;
                                  attentionsContentRef.page = 1;
                                  attentionsContentRef.refresh();
                                }
                              }
                            "
                          />
                          <!-- Search input -->
                          <div class="mb-3">
                            <label class="form-label fw-bold mb-2">{{
                              $t('dashboard.search') || 'Buscar'
                            }}</label>
                            <input
                              type="text"
                              class="form-control"
                              :value="filterProps.searchText"
                              @input="
                                e => {
                                  filterProps.searchText = e.target.value;
                                  if (attentionsContentRef) {
                                    attentionsContentRef.searchText = e.target.value;
                                  }
                                }
                              "
                              @keyup.enter="
                                () => {
                                  if (attentionsContentRef) {
                                    attentionsContentRef.searchText = filterProps.searchText;
                                    attentionsContentRef.page = 1;
                                    attentionsContentRef.refresh();
                                  }
                                }
                              "
                              :placeholder="$t('dashboard.search')"
                            />
                          </div>
                          <!-- Queue selector -->
                          <div
                            class="mb-3"
                            v-if="filterProps.queues && filterProps.queues.length > 1"
                          >
                            <label class="form-label fw-bold mb-2">{{
                              $t('dashboard.queue')
                            }}</label>
                            <select
                              class="form-select metric-controls"
                              :value="filterProps.queueId"
                              @change="
                                e => {
                                  const value = e.target.value || undefined;
                                  filterProps.queueId = value;
                                  if (attentionsContentRef) {
                                    attentionsContentRef.queueId = value;
                                    attentionsContentRef.page = 1;
                                    attentionsContentRef.refresh();
                                  }
                                }
                              "
                            >
                              <option value="">{{ $t('dashboard.all') || 'Todos' }}</option>
                              <option
                                v-for="queue in filterProps.queues"
                                :key="queue.name"
                                :value="queue.id"
                              >
                                {{ queue.name }}
                              </option>
                            </select>
                          </div>
                          <!-- Service selector -->
                          <div
                            class="mb-3"
                            v-if="filterProps.services && filterProps.services.length > 1"
                          >
                            <label class="form-label fw-bold mb-2">{{
                              $t('dashboard.service')
                            }}</label>
                            <select
                              class="form-select metric-controls"
                              :value="filterProps.serviceId"
                              @change="
                                e => {
                                  const value = e.target.value || undefined;
                                  filterProps.serviceId = value;
                                  if (attentionsContentRef) {
                                    attentionsContentRef.serviceId = value;
                                    attentionsContentRef.page = 1;
                                    attentionsContentRef.refresh();
                                  }
                                }
                              "
                            >
                              <option value="">{{ $t('dashboard.all') || 'Todos' }}</option>
                              <option
                                v-for="service in filterProps.services"
                                :key="service.name"
                                :value="service.id"
                              >
                                {{ service.name }}
                              </option>
                            </select>
                          </div>
                          <!-- Days Since Type filter -->
                          <div class="mb-3">
                            <label class="form-label fw-bold mb-2">{{
                              $t('dashboard.tracing.filters.attention') || 'Días desde Atención'
                            }}</label>
                            <div class="d-flex gap-2 align-items-center">
                              <input
                                type="radio"
                                class="btn-check"
                                :id="`attention-days-early-${attentionsFilterIdCounter}`"
                                name="attention-days-since-filter"
                                value="EARLY"
                                :checked="filterProps.daysSinceType === 'EARLY'"
                                @change="
                                  filterProps.daysSinceType = 'EARLY';
                                  if (attentionsContentRef) {
                                    attentionsContentRef.daysSinceType = 'EARLY';
                                    attentionsContentRef.page = 1;
                                    attentionsContentRef.refresh();
                                  }
                                "
                              />
                              <label
                                class="btn btn-sm"
                                :for="`attention-days-early-${attentionsFilterIdCounter}`"
                              >
                                <i class="bi bi-qr-code green-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="`attention-days-medium-${attentionsFilterIdCounter}`"
                                name="attention-days-since-filter"
                                value="MEDIUM"
                                :checked="filterProps.daysSinceType === 'MEDIUM'"
                                @change="
                                  filterProps.daysSinceType = 'MEDIUM';
                                  if (attentionsContentRef) {
                                    attentionsContentRef.daysSinceType = 'MEDIUM';
                                    attentionsContentRef.page = 1;
                                    attentionsContentRef.refresh();
                                  }
                                "
                              />
                              <label
                                class="btn btn-sm"
                                :for="`attention-days-medium-${attentionsFilterIdCounter}`"
                              >
                                <i class="bi bi-qr-code yellow-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="`attention-days-late-${attentionsFilterIdCounter}`"
                                name="attention-days-since-filter"
                                value="LATE"
                                :checked="filterProps.daysSinceType === 'LATE'"
                                @change="
                                  filterProps.daysSinceType = 'LATE';
                                  if (attentionsContentRef) {
                                    attentionsContentRef.daysSinceType = 'LATE';
                                    attentionsContentRef.page = 1;
                                    attentionsContentRef.refresh();
                                  }
                                "
                              />
                              <label
                                class="btn btn-sm"
                                :for="`attention-days-late-${attentionsFilterIdCounter}`"
                              >
                                <i class="bi bi-qr-code red-icon"></i>
                              </label>
                              <i
                                class="bi bi-info-circle-fill h7 m-2"
                                :title="$t(`dashboard.tracing.filters.attention`)"
                              ></i>
                            </div>
                          </div>
                          <!-- Contact Result Type filter -->
                          <div class="mb-3">
                            <label class="form-label fw-bold mb-2">{{
                              $t('dashboard.tracing.filters.contactResult') || 'Resultado Contacto'
                            }}</label>
                            <div class="d-flex gap-2 align-items-center">
                              <input
                                type="radio"
                                class="btn-check"
                                :id="`attention-contact-interested-${attentionsFilterIdCounter}`"
                                name="attention-contact-result-filter"
                                value="INTERESTED"
                                :checked="filterProps.contactResultType === 'INTERESTED'"
                                @change="
                                  filterProps.contactResultType = 'INTERESTED';
                                  if (attentionsContentRef) {
                                    attentionsContentRef.contactResultType = 'INTERESTED';
                                    attentionsContentRef.page = 1;
                                    attentionsContentRef.refresh();
                                  }
                                "
                              />
                              <label
                                class="btn btn-sm"
                                :for="`attention-contact-interested-${attentionsFilterIdCounter}`"
                              >
                                <i class="bi bi-patch-check-fill green-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="`attention-contact-later-${attentionsFilterIdCounter}`"
                                name="attention-contact-result-filter"
                                value="CONTACT_LATER"
                                :checked="filterProps.contactResultType === 'CONTACT_LATER'"
                                @change="
                                  filterProps.contactResultType = 'CONTACT_LATER';
                                  if (attentionsContentRef) {
                                    attentionsContentRef.contactResultType = 'CONTACT_LATER';
                                    attentionsContentRef.page = 1;
                                    attentionsContentRef.refresh();
                                  }
                                "
                              />
                              <label
                                class="btn btn-sm"
                                :for="`attention-contact-later-${attentionsFilterIdCounter}`"
                              >
                                <i class="bi bi-patch-check-fill yellow-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="`attention-contact-rejected-${attentionsFilterIdCounter}`"
                                name="attention-contact-result-filter"
                                value="REJECTED"
                                :checked="filterProps.contactResultType === 'REJECTED'"
                                @change="
                                  filterProps.contactResultType = 'REJECTED';
                                  if (attentionsContentRef) {
                                    attentionsContentRef.contactResultType = 'REJECTED';
                                    attentionsContentRef.page = 1;
                                    attentionsContentRef.refresh();
                                  }
                                "
                              />
                              <label
                                class="btn btn-sm"
                                :for="`attention-contact-rejected-${attentionsFilterIdCounter}`"
                              >
                                <i class="bi bi-patch-check-fill red-icon"></i>
                              </label>
                              <i
                                class="bi bi-info-circle-fill h7 m-2"
                                :title="$t(`dashboard.tracing.filters.productLevel`)"
                              ></i>
                            </div>
                          </div>
                          <!-- Checkboxes -->
                          <div class="mb-3">
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="`attention-filter-contactable-${attentionsFilterIdCounter}`"
                                :checked="filterProps.contactable === true"
                                @change="
                                  const isChecked = $event.target.checked;
                                  filterProps.contactable = isChecked ? true : false;
                                  if (attentionsContentRef) {
                                    attentionsContentRef.contactable = isChecked ? true : false;
                                    attentionsContentRef.page = 1;
                                    attentionsContentRef.refresh();
                                  }
                                "
                              />
                              <label
                                class="form-check-label"
                                :for="`attention-filter-contactable-${attentionsFilterIdCounter}`"
                              >
                                {{ $t('dashboard.contactable') }}
                              </label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="`attention-filter-contacted-${attentionsFilterIdCounter}`"
                                :checked="filterProps.contacted === true"
                                @change="
                                  const isChecked = $event.target.checked;
                                  filterProps.contacted = isChecked ? true : false;
                                  if (attentionsContentRef) {
                                    attentionsContentRef.contacted = isChecked ? true : false;
                                    attentionsContentRef.page = 1;
                                    attentionsContentRef.refresh();
                                  }
                                "
                              />
                              <label
                                class="form-check-label"
                                :for="`attention-filter-contacted-${attentionsFilterIdCounter}`"
                              >
                                {{ $t('dashboard.contacted') }}
                              </label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="`attention-filter-stock-${attentionsFilterIdCounter}`"
                                :checked="filterProps.stock === true"
                                @change="
                                  const isChecked = $event.target.checked;
                                  filterProps.stock = isChecked ? true : false;
                                  if (attentionsContentRef) {
                                    attentionsContentRef.stock = isChecked ? true : false;
                                    attentionsContentRef.page = 1;
                                    attentionsContentRef.refresh();
                                  }
                                "
                              />
                              <label
                                class="form-check-label"
                                :for="`attention-filter-stock-${attentionsFilterIdCounter}`"
                              >
                                {{ $t('dashboard.stock') }}
                              </label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="`attention-filter-asc-${attentionsFilterIdCounter}`"
                                :checked="filterProps.asc === true"
                                @change="
                                  const isChecked = $event.target.checked;
                                  filterProps.asc = isChecked;
                                  if (attentionsContentRef) {
                                    attentionsContentRef.asc = isChecked;
                                    attentionsContentRef.page = 1;
                                    attentionsContentRef.refresh();
                                  }
                                "
                              />
                              <label
                                class="form-check-label"
                                :for="`attention-filter-asc-${attentionsFilterIdCounter}`"
                              >
                                {{ filterProps.asc ? $t('dashboard.asc') : $t('dashboard.desc') }}
                              </label>
                            </div>
                          </div>
                          <!-- Clear button -->
                          <div class="mb-3">
                            <button
                              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100"
                              @click="
                                // Clear filter instance
                                filterProps.daysSinceType = undefined;
                                filterProps.contactResultType = undefined;
                                filterProps.contactable = undefined;
                                filterProps.contacted = undefined;
                                filterProps.stock = undefined;
                                filterProps.asc = false;
                                filterProps.searchText = undefined;
                                filterProps.queueId = undefined;
                                filterProps.serviceId = undefined;
                                filterProps.startDate = undefined;
                                filterProps.endDate = undefined;
                                // Clear and refresh content instance
                                if (attentionsContentRef) {
                                  attentionsContentRef.daysSinceType = undefined;
                                  attentionsContentRef.contactResultType = undefined;
                                  attentionsContentRef.contactable = undefined;
                                  attentionsContentRef.contacted = undefined;
                                  attentionsContentRef.stock = undefined;
                                  attentionsContentRef.asc = false;
                                  attentionsContentRef.searchText = undefined;
                                  attentionsContentRef.queueId = undefined;
                                  attentionsContentRef.serviceId = undefined;
                                  attentionsContentRef.startDate = undefined;
                                  attentionsContentRef.endDate = undefined;
                                  attentionsContentRef.page = 1;
                                  attentionsContentRef.refresh();
                                }
                              "
                            >
                              <i class="bi bi-eraser-fill"></i>
                              {{ $t('dashboard.clear') || 'Limpiar' }}
                            </button>
                          </div>
                        </div>
                      </template>
                    </ProductsAttentionManagement>
                  </template>
                </DesktopFiltersPanel>
              </template>
              <template #content>
                <!-- Header with tabs -->
                <div class="row col mx-1 mt-3 mb-3 tabs-header-divider">
                  <div class="col-4 centered">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                      :class="state.showDashboard ? 'btn-selected' : ''"
                      @click="showDashboard()"
                    >
                      {{ $t('businessProductStockAdmin.dashboard') || 'Dashboard' }} <br />
                      <i class="bi bi-bar-chart-fill"></i>
                    </button>
                  </div>
                  <div class="col-4 centered">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                      :class="state.showProducts ? 'btn-selected' : ''"
                      @click="showProducts()"
                      :disabled="!state.toggles['products-stock.products.view']"
                    >
                      {{ $t('businessProductStockAdmin.products') }} <br />
                      <i class="bi bi-eyedropper"></i>
                    </button>
                  </div>
                  <div class="col-4 centered">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                      :class="state.showAttentions ? 'btn-selected' : ''"
                      @click="showAttentions()"
                      :disabled="!state.toggles['products-stock.attentions.view']"
                    >
                      {{ $t('businessProductStockAdmin.attentions') }} <br />
                      <i class="bi bi-qr-code"></i>
                    </button>
                  </div>
                  <div class="col-12 mt-3">
                    <div id="title" class="metric-title">
                      <span>{{ $t(currentTabTitle) }}</span>
                    </div>
                    <div v-if="state.startDate && state.endDate" id="sub-title" class="metric-subtitle">
                      ({{ $t('dashboard.dates.from') }} <strong>{{ formatDateDisplay(state.startDate) }}</strong>
                      {{ $t('dashboard.dates.to') }} <strong>{{ formatDateDisplay(state.endDate) }}</strong>)
                    </div>
                  </div>
                </div>
                <!-- Main content components -->
                <InventoryDashboard
                  ref="dashboardContentRef"
                  v-if="state.showDashboard"
                  :show="state.showDashboard"
                  :commerce="commerce"
                  :commerces="selectedCommerces"
                  @quick-recharge="handleQuickRecharge"
                ></InventoryDashboard>
                <ProductsStockManagement
                  ref="productsContentRef"
                  :show-product-stock-management="state.showProducts"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
                  :business="state.business"
                  filters-location="slot"
                  @quick-recharge="handleQuickRecharge"
                >
                </ProductsStockManagement>
                <ProductsAttentionManagement
                  ref="attentionsContentRef"
                  :show-product-stock-management="state.showAttentions"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
                  :services="state.services"
                  filters-location="slot"
                >
                </ProductsAttentionManagement>
              </template>
            </DesktopContentLayout>
          </div>
          <div v-if="!isActiveBusiness() && !loading">
            <Message
              :title="$t('businessProductStockAdmin.message.1.title')"
              :content="$t('businessProductStockAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-title {
  text-align: left;
  font-size: 1.5rem;
  font-weight: 700;
  color: #000;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.metric-title::before {
  content: '';
  width: 4px;
  height: 2rem;
  background: linear-gradient(180deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  border-radius: 2px;
}

.tabs-header-divider {
  border-bottom: 2px solid rgba(0, 0, 0, 0.15);
  padding-bottom: 0.75rem;
}
.metric-subtitle {
  text-align: left;
  font-size: 0.95rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
}
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.metric-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}
.metric-card-title {
  font-size: 0.8rem;
  line-height: 0.8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.green-icon {
  color: var(--verde-tu);
}
.red-icon {
  color: var(--rojo-warning);
}
.yellow-icon {
  color: var(--amarillo-star);
}
.metric-card-subtitle {
  font-size: 0.6rem;
  font-weight: 500;
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
</style>
