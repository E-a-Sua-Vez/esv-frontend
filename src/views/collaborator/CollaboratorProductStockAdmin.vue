<script>
import { ref, reactive, onBeforeMount, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getCommerceById } from '../../application/services/commerce';
import { getPermissions } from '../../application/services/permissions';
import { getServiceByCommerce } from '../../application/services/service';
import Message from '../../components/common/Message.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import ProductsStockManagement from '../../components/products/ProductsStockManagement.vue';
import ProductAttentionManagement from '../../components/products/ProductsAttentionManagement.vue';
import DesktopContentLayout from '../../components/common/desktop/DesktopContentLayout.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import DesktopFiltersPanel from '../../components/common/desktop/DesktopFiltersPanel.vue';
import DateRangeFilters from '../../components/common/desktop/DateRangeFilters.vue';

export default {
  name: 'CollaboratorProductStockAdmin',
  components: {
    Message,
    Spinner,
    Alert,
    ToggleCapabilities,
    ComponentMenu,
    CommerceLogo,
    ProductsStockManagement,
    ProductAttentionManagement,
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

    // Use global commerce and module from store
    const commerce = computed(() => store.getCurrentCommerce);
    const business = computed(() => store.getCurrentBusiness);
    const module = computed(() => store.getCurrentModule);

    const state = reactive({
      currentUser: {},
      activeBusiness: false,
      queues: ref([]),
      services: ref([]),
      queue: {},
      dateType: 'month',
      showProducts: true,
      showAttentions: false,
      toggles: {},
    });

    // Computed for selected commerces
    const selectedCommerces = computed(() =>
      commerce.value && commerce.value.id ? [commerce.value] : []
    );

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

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;

        // Load business first (required for isActiveBusiness check)
        await store.getActualBusiness();

        // Set initial commerce if not set - check both commerceId and commercesId
        if (!commerce.value || !commerce.value.id) {
          // First try commerceId (single commerce)
          if (state.currentUser.commerceId) {
            const initialCommerce = await getCommerceById(state.currentUser.commerceId);
            if (initialCommerce && initialCommerce.id) {
              await store.setCurrentCommerce(initialCommerce);
            }
          }
          // If still no commerce, try commercesId (multiple commerces)
          if (
            (!commerce.value || !commerce.value.id) &&
            state.currentUser.commercesId &&
            state.currentUser.commercesId.length > 0
          ) {
            const firstCommerceId = state.currentUser.commercesId[0];
            if (firstCommerceId) {
              const initialCommerce = await getCommerceById(firstCommerceId);
              if (initialCommerce && initialCommerce.id) {
                await store.setCurrentCommerce(initialCommerce);
              }
            }
          }
        }
        // Load commerce-dependent data for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadCommerceData(commerceToUse.id);
        }

        state.toggles = await getPermissions('products-stock');
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

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

    // Watch for module changes
    watch(
      module,
      async (newModule, oldModule) => {
        if (oldModule && oldModule.id === newModule?.id) return;
        // Module change might affect product filtering, reload if needed
        if (newModule && newModule.id && commerce.value && commerce.value.id) {
          try {
            loading.value = true;
            // Reload data if module affects products
            loading.value = false;
          } catch (error) {
            loading.value = false;
          }
        }
      },
      { deep: true }
    );

    const isActiveBusiness = () => business.value && business.value.active === true;

    const goBack = () => {
      router.back();
    };

    const showProducts = () => {
      state.showProducts = true;
      state.showAttentions = false;
    };

    const showAttentions = () => {
      state.showProducts = false;
      state.showAttentions = true;
    };

    // Refs for component instances
    const productsFilterInstanceRef = ref(null);
    const productsContentInstanceRef = ref(null);
    const attentionsFilterInstanceRef = ref(null);
    const attentionsContentInstanceRef = ref(null);

    // Generate unique IDs for filter inputs
    const productStatusIds = {
      good: `good-status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      medium: `medium-status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      low: `low-status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    const attentionDaysSinceIds = {
      early: `early-since-att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      medium: `medium-since-att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      late: `late-since-att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    const contactResultIds = {
      interested: `interested-att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contactLater: `contact-later-att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      rejected: `rejected-att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    // Generate unique IDs for checkboxes
    const checkboxIds = {
      expired: `expired-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      replacement: `replacement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      asc: `asc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contactable: `contactable-att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contacted: `contacted-att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      stock: `stock-att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ascAtt: `asc-att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    // Sync filter values from filter instance to content instance
    const syncProductsFilters = filterProps => {
      if (productsContentInstanceRef.value) {
        const contentInstance = productsContentInstanceRef.value;
        contentInstance.searchText = filterProps.searchText;
        contentInstance.productStatus = filterProps.productStatus;
        contentInstance.expired = filterProps.expired;
        contentInstance.replacement = filterProps.replacement;
        contentInstance.asc = filterProps.asc;
        contentInstance.startDate = filterProps.startDate;
        contentInstance.endDate = filterProps.endDate;
        contentInstance.queueId = filterProps.queueId;
        contentInstance.serviceId = filterProps.serviceId;
        contentInstance.page = 1; // Reset to first page
        contentInstance._skipWatch = true; // Skip watch to prevent double refresh
        contentInstance.refresh();
      }
    };

    const syncAttentionsFilters = async filterProps => {
      await nextTick(); // Wait for Vue to update the reactive properties
      if (attentionsFilterInstanceRef.value && attentionsContentInstanceRef.value) {
        const filterInstance = attentionsFilterInstanceRef.value;
        const contentInstance = attentionsContentInstanceRef.value;
        // Read values from the filter instance (source of truth)
        contentInstance.searchText = filterInstance.searchText;
        contentInstance.daysSinceType = filterInstance.daysSinceType;
        contentInstance.daysSinceContacted = filterInstance.daysSinceContacted;
        contentInstance.contactResultType = filterInstance.contactResultType;
        contentInstance.contactable = filterInstance.contactable;
        contentInstance.contacted = filterInstance.contacted;
        contentInstance.stock = filterInstance.stock;
        contentInstance.asc = filterInstance.asc;
        contentInstance.startDate = filterInstance.startDate;
        contentInstance.endDate = filterInstance.endDate;
        contentInstance.queueId = filterInstance.queueId;
        contentInstance.serviceId = filterInstance.serviceId;
        contentInstance.page = 1; // Reset to first page
        // ProductsAttentionManagement doesn't have _skipWatch, so we just refresh
        await contentInstance.refresh();
      }
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

    return {
      state,
      loading,
      alertError,
      goBack,
      isActiveBusiness,
      showProducts,
      showAttentions,
      handleFiltersToggle,
      handleCommerceChanged,
      commerce,
      business,
      module,
      selectedCommerces,
      productsFilterInstanceRef,
      productsContentInstanceRef,
      attentionsFilterInstanceRef,
      attentionsContentInstanceRef,
      syncProductsFilters,
      syncAttentionsFilters,
      productStatusIds,
      attentionDaysSinceIds,
      contactResultIds,
      checkboxIds,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo :commerce-id="commerce?.id" :business-id="business?.id" :loading="loading" />
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
            <div v-if="!commerce || !commerce.id">
              <div v-if="!loading" class="control-box">
                <Message
                  :title="$t('businessProductStockAdmin.message.3.title')"
                  :content="$t('businessProductStockAdmin.message.3.content')"
                />
              </div>
            </div>
            <div v-else>
              <div v-if="!loading" id="product-stock-result" class="mt-2">
                <div class="row col mx-1 mt-3 mb-1 tabs-header-divider">
                  <div class="col-6 centered">
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
                  <div class="col-6 centered">
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
                </div>
                <div>
                  <ProductsStockManagement
                    :show-product-stock-management="state.showProducts"
                    :toggles="state.toggles"
                    :commerce="commerce"
                    :queues="state.queues"
                    :commerces="selectedCommerces"
                    :business="business"
                    filters-location="component"
                  >
                  </ProductsStockManagement>
                  <ProductAttentionManagement
                    :show-product-stock-management="state.showAttentions"
                    :toggles="state.toggles"
                    :commerce="commerce"
                    :queues="state.queues"
                    :commerces="selectedCommerces"
                    :services="state.services"
                    filters-location="component"
                  >
                  </ProductAttentionManagement>
                </div>
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
          :commerce-id="commerce?.id"
          :business-id="business?.id"
          :loading="loading"
          :title="$t('businessProductStockAdmin.title')"
          :toggles="state.toggles"
          component-name="businessProductStockAdmin"
          @go-back="goBack"
        />
        <div id="product-stock" v-if="isActiveBusiness()">
          <div v-if="!commerce || !commerce.id">
            <div v-if="!loading" class="control-box">
              <Message
                :title="$t('businessProductStockAdmin.message.3.title')"
                :content="$t('businessProductStockAdmin.message.3.content')"
              />
            </div>
          </div>
          <div
            v-else-if="
              !state.toggles['products-stock.products.view'] &&
              !state.toggles['products-stock.attentions.view']
            "
          >
            <div v-if="!loading" class="control-box mt-4">
              <Message
                :title="$t('businessProductStockAdmin.message.4.title')"
                :content="$t('businessProductStockAdmin.message.4.content')"
              />
            </div>
          </div>
          <div v-else>
            <DesktopContentLayout
              v-if="!loading"
              :show-filters="true"
              :filters-sticky="true"
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
                    <!-- Filters for Products tab -->
                    <ProductsStockManagement
                      v-if="state.showProducts"
                      ref="productsFilterInstanceRef"
                      :show-product-stock-management="false"
                      :toggles="state.toggles"
                      :commerce="commerce"
                      :queues="Array.isArray(state.queues) ? state.queues : []"
                      :commerces="selectedCommerces"
                      :business="business"
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
                                    filterProps.setSearchText(e.target.value);
                                  }
                                "
                                :placeholder="$t('businessProductStockAdmin.search')"
                              />
                              <button
                                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                                @click="
                                  filterProps.setSearchText(filterProps.searchText);
                                  syncProductsFilters(filterProps);
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
                                :id="productStatusIds.good"
                                :value="'GOOD'"
                                :checked="filterProps.productStatus === 'GOOD'"
                                @change="
                                  filterProps.setProductStatus('GOOD');
                                  syncProductsFilters(filterProps);
                                "
                              />
                              <label class="btn btn-sm" :for="productStatusIds.good">
                                <i class="bi bi-battery-full green-icon h5"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="productStatusIds.medium"
                                :value="'MEDIUM'"
                                :checked="filterProps.productStatus === 'MEDIUM'"
                                @change="
                                  filterProps.setProductStatus('MEDIUM');
                                  syncProductsFilters(filterProps);
                                "
                              />
                              <label class="btn btn-sm" :for="productStatusIds.medium">
                                <i class="bi bi-battery-half yellow-icon h5"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="productStatusIds.low"
                                :value="'LOW'"
                                :checked="filterProps.productStatus === 'LOW'"
                                @change="
                                  filterProps.setProductStatus('LOW');
                                  syncProductsFilters(filterProps);
                                "
                              />
                              <label class="btn btn-sm" :for="productStatusIds.low">
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
                                :id="checkboxIds.expired"
                                :checked="filterProps.expired === true"
                                @change="
                                  filterProps.checkExpired($event);
                                  syncProductsFilters(filterProps);
                                "
                              />
                              <label class="form-check-label" :for="checkboxIds.expired">
                                {{ $t('businessProductStockAdmin.expired') }}
                              </label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="checkboxIds.replacement"
                                :checked="filterProps.replacement === true"
                                @change="
                                  filterProps.checkReplacement($event);
                                  syncProductsFilters(filterProps);
                                "
                              />
                              <label class="form-check-label" :for="checkboxIds.replacement">
                                {{ $t('businessProductStockAdmin.replacement') }}
                              </label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="checkboxIds.asc"
                                :checked="filterProps.asc === true"
                                @change="
                                  filterProps.checkAsc($event);
                                  syncProductsFilters(filterProps);
                                "
                              />
                              <label class="form-check-label" :for="checkboxIds.asc">
                                {{ filterProps.asc ? $t('dashboard.asc') : $t('dashboard.desc') }}
                              </label>
                            </div>
                          </div>
                          <!-- Clear button -->
                          <div class="mb-3">
                            <button
                              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100"
                              @click="
                                filterProps.clear();
                                syncProductsFilters(filterProps);
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
                    <ProductAttentionManagement
                      v-if="state.showAttentions"
                      ref="attentionsFilterInstanceRef"
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
                                  syncAttentionsFilters(filterProps);
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
                                  syncAttentionsFilters(filterProps);
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
                                  syncAttentionsFilters(filterProps);
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
                                  syncAttentionsFilters(filterProps);
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
                                filterProps.setStartDate(val);
                              }
                            "
                            @update:endDate="
                              val => {
                                filterProps.setEndDate(val);
                              }
                            "
                            @search="
                              () => {
                                syncAttentionsFilters(filterProps);
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
                                  filterProps.setSearchText(e.target.value);
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
                                  filterProps.queueId = e.target.value;
                                  syncAttentionsFilters(filterProps);
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
                                  filterProps.serviceId = e.target.value;
                                  syncAttentionsFilters(filterProps);
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
                                :id="attentionDaysSinceIds.early"
                                :value="'EARLY'"
                                :checked="filterProps.daysSinceType === 'EARLY'"
                                @change="
                                  filterProps.setDaysSinceType('EARLY');
                                  syncAttentionsFilters(filterProps);
                                "
                              />
                              <label class="btn btn-sm" :for="attentionDaysSinceIds.early">
                                <i class="bi bi-qr-code green-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="attentionDaysSinceIds.medium"
                                :value="'MEDIUM'"
                                :checked="filterProps.daysSinceType === 'MEDIUM'"
                                @change="
                                  filterProps.setDaysSinceType('MEDIUM');
                                  syncAttentionsFilters(filterProps);
                                "
                              />
                              <label class="btn btn-sm" :for="attentionDaysSinceIds.medium">
                                <i class="bi bi-qr-code yellow-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="attentionDaysSinceIds.late"
                                :value="'LATE'"
                                :checked="filterProps.daysSinceType === 'LATE'"
                                @change="
                                  filterProps.setDaysSinceType('LATE');
                                  syncAttentionsFilters(filterProps);
                                "
                              />
                              <label class="btn btn-sm" :for="attentionDaysSinceIds.late">
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
                                :id="contactResultIds.interested"
                                :value="'INTERESTED'"
                                :checked="filterProps.contactResultType === 'INTERESTED'"
                                @change="
                                  filterProps.setContactResultType('INTERESTED');
                                  syncAttentionsFilters(filterProps);
                                "
                              />
                              <label class="btn btn-sm" :for="contactResultIds.interested">
                                <i class="bi bi-patch-check-fill green-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="contactResultIds.contactLater"
                                :value="'CONTACT_LATER'"
                                :checked="filterProps.contactResultType === 'CONTACT_LATER'"
                                @change="
                                  filterProps.setContactResultType('CONTACT_LATER');
                                  syncAttentionsFilters(filterProps);
                                "
                              />
                              <label class="btn btn-sm" :for="contactResultIds.contactLater">
                                <i class="bi bi-patch-check-fill yellow-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="contactResultIds.rejected"
                                :value="'REJECTED'"
                                :checked="filterProps.contactResultType === 'REJECTED'"
                                @change="
                                  filterProps.setContactResultType('REJECTED');
                                  syncAttentionsFilters(filterProps);
                                "
                              />
                              <label class="btn btn-sm" :for="contactResultIds.rejected">
                                <i class="bi bi-patch-check-fill red-icon"></i>
                              </label>
                              <i
                                class="bi bi-info-circle-fill h7 m-2"
                                :title="$t(`dashboard.tracing.filters.contactResult`)"
                              ></i>
                            </div>
                          </div>
                          <!-- Checkboxes -->
                          <div class="mb-3">
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="checkboxIds.contactable"
                                :checked="filterProps.contactable === true"
                                @change="
                                  filterProps.checkContactable($event);
                                  syncAttentionsFilters(filterProps);
                                "
                              />
                              <label class="form-check-label" :for="checkboxIds.contactable">
                                {{ $t('dashboard.contactable') }}
                              </label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="checkboxIds.contacted"
                                :checked="filterProps.contacted === true"
                                @change="
                                  filterProps.checkContacted($event);
                                  syncAttentionsFilters(filterProps);
                                "
                              />
                              <label class="form-check-label" :for="checkboxIds.contacted">
                                {{ $t('dashboard.contacted') }}
                              </label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="checkboxIds.stock"
                                :checked="filterProps.stock === true"
                                @change="
                                  filterProps.checkStock($event);
                                  syncAttentionsFilters(filterProps);
                                "
                              />
                              <label class="form-check-label" :for="checkboxIds.stock">
                                {{ $t('dashboard.stock') }}
                              </label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="checkboxIds.ascAtt"
                                :checked="filterProps.asc === true"
                                @change="
                                  filterProps.checkAsc($event);
                                  syncAttentionsFilters(filterProps);
                                "
                              />
                              <label class="form-check-label" :for="checkboxIds.ascAtt">
                                {{ filterProps.asc ? $t('dashboard.asc') : $t('dashboard.desc') }}
                              </label>
                            </div>
                          </div>
                          <!-- Clear button -->
                          <div class="mb-3">
                            <button
                              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100"
                              @click="
                                filterProps.clear();
                                syncAttentionsFilters(filterProps);
                              "
                            >
                              <i class="bi bi-eraser-fill"></i>
                              {{ $t('dashboard.clear') || 'Limpiar' }}
                            </button>
                          </div>
                        </div>
                      </template>
                    </ProductAttentionManagement>
                  </template>
                </DesktopFiltersPanel>
              </template>
              <template #content>
                <!-- Header with tabs -->
                <div class="row col mx-1 mt-3 mb-3 tabs-header-divider">
                  <div class="col-6 centered">
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
                  <div class="col-6 centered">
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
                </div>
                <!-- Main content components -->
                <ProductsStockManagement
                  ref="productsContentInstanceRef"
                  :show-product-stock-management="state.showProducts"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
                  :business="business"
                  filters-location="slot"
                >
                </ProductsStockManagement>
                <ProductAttentionManagement
                  ref="attentionsContentInstanceRef"
                  :show-product-stock-management="state.showAttentions"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
                  :services="state.services"
                  filters-location="slot"
                >
                </ProductAttentionManagement>
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
  font-size: 1.1rem;
  font-weight: 700;
}

.tabs-header-divider {
  border-bottom: 2px solid rgba(0, 0, 0, 0.15);
  padding-bottom: 0.75rem;
}
.metric-subtitle {
  text-align: left;
  font-size: 0.9rem;
  font-weight: 500;
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
