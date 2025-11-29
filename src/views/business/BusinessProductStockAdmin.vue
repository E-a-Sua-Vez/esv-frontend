<script>
import { ref, reactive, onBeforeMount } from 'vue';
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
import DesktopContentLayout from '../../components/common/desktop/DesktopContentLayout.vue';
import DesktopFiltersPanel from '../../components/common/desktop/DesktopFiltersPanel.vue';
import DateRangeFilters from '../../components/common/desktop/DateRangeFilters.vue';

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
    DesktopContentLayout,
    DesktopFiltersPanel,
    DateRangeFilters,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      commerces: ref([]),
      selectedCommerces: ref([]),
      queues: ref([]),
      services: ref([]),
      queue: {},
      dateType: 'month',
      commerce: {},
      showProducts: true,
      showAttentions: false,
      toggles: {},
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce =
          state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        state.selectedCommerces = [state.commerce];
        const commerce = await getCommerceById(state.commerce.id);
        state.queues = commerce.queues;
        state.services = await getServiceByCommerce(commerce.id);
        state.toggles = await getPermissions('products-stock');
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

    const selectCommerce = async commerce => {
      try {
        loading.value = true;
        state.selectedCommerces = undefined;
        if (commerce.id === 'ALL') {
          if (state.currentUser.commercesId && state.currentUser.commercesId.length > 0) {
            state.selectedCommerces = state.currentUser.commercesId;
          } else {
            state.selectedCommerces = state.commerces;
          }
        } else {
          state.commerce = commerce;
          const queuesByCommerce = await getCommerceById(state.commerce.id);
          state.queues = queuesByCommerce.queues;
          state.selectedCommerces = state.commerces;
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    };

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

    const handleFiltersToggle = collapsed => {
      // Handle filters toggle if needed
    };

    const handleCommerceChanged = commerce => {
      selectCommerce(commerce);
    };

    return {
      state,
      loading,
      alertError,
      goBack,
      isActiveBusiness,
      selectCommerce,
      showProducts,
      showAttentions,
      handleFiltersToggle,
      handleCommerceChanged,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessProductStockAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessProductStockAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="loading" :stack="alertError"></Alert>
        </div>
        <div id="product-stock">
          <div v-if="isActiveBusiness()">
            <div v-if="state.commerces.length === 0" class="control-box">
              <Message
                :title="$t('businessProductStockAdmin.message.3.title')"
                :content="$t('businessProductStockAdmin.message.3.content')"
              />
            </div>
            <div v-else class="control-box">
              <div id="product-stock-controls">
                <div class="row">
                  <div class="col" v-if="state.commerces">
                    <span>{{ $t('businessProductStockAdmin.commerce') }} </span>
                    <select
                      class="btn btn-md fw-bold text-dark m-1 select"
                      v-model="state.commerce"
                      id="modules"
                      @change="selectCommerce(state.commerce)"
                    >
                      <option v-for="com in state.commerces" :key="com.id" :value="com">
                        {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="!loading" id="product-stock-result" class="mt-2">
              <div class="row col mx-1 mt-3 mb-1">
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
                  :commerce="state.commerce"
                  :queues="state.queues"
                  :commerces="state.selectedCommerces"
                  :business="state.business"
                  filters-location="component"
                >
                </ProductsStockManagement>
                <ProductsAttentionManagement
                  :show-product-stock-management="state.showAttentions"
                  :toggles="state.toggles"
                  :commerce="state.commerce"
                  :queues="state.queues"
                  :commerces="state.selectedCommerces"
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
          <Alert :show="loading" :stack="alertError"></Alert>
        </div>
        <div class="row align-items-center mb-1 desktop-header-row">
          <div class="col-auto desktop-logo-wrapper">
            <div class="desktop-commerce-logo">
              <div id="commerce-logo-desktop">
                <img
                  v-if="!loading || state.business.logo"
                  class="rounded img-fluid logo-desktop"
                  :alt="$t('logoAlt')"
                  :src="state.business.logo || $t('hubLogoBlanco')"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <ComponentMenu
              :title="$t(`businessProductStockAdmin.title`)"
              :toggles="state.toggles"
              component-name="businessProductStockAdmin"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
        <div id="product-stock" v-if="isActiveBusiness()">
          <div v-if="state.commerces.length === 0" class="control-box">
            <Message
              :title="$t('businessProductStockAdmin.message.3.title')"
              :content="$t('businessProductStockAdmin.message.3.content')"
            />
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
                  :model-value="{ commerce: state.commerce }"
                  :loading="loading"
                  :commerces="Array.isArray(state.commerces) ? state.commerces : []"
                  :show-commerce-selector="true"
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
                      :show-product-stock-management="false"
                      :toggles="state.toggles"
                      :commerce="state.commerce"
                      :queues="Array.isArray(state.queues) ? state.queues : []"
                      :commerces="
                        Array.isArray(state.selectedCommerces) ? state.selectedCommerces : []
                      "
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
                                :placeholder="$t('businessProductStockAdmin.search')"
                              />
                              <button
                                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                                @click="filterProps.refresh()"
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
                              $t('dashboard.tracing.filters.contactResult') || 'Estado del Producto'
                            }}</label>
                            <div class="d-flex gap-2 align-items-center">
                              <input
                                type="radio"
                                class="btn-check"
                                :id="'good-status-' + Math.random()"
                                :value="'GOOD'"
                                :checked="filterProps.productStatus === 'GOOD'"
                                @change="
                                  filterProps.productStatus = 'GOOD';
                                  filterProps.refresh();
                                "
                              />
                              <label class="btn btn-sm" :for="'good-status-' + Math.random()">
                                <i class="bi bi-battery-full green-icon h5"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="'medium-status-' + Math.random()"
                                :value="'MEDIUM'"
                                :checked="filterProps.productStatus === 'MEDIUM'"
                                @change="
                                  filterProps.productStatus = 'MEDIUM';
                                  filterProps.refresh();
                                "
                              />
                              <label class="btn btn-sm" :for="'medium-status-' + Math.random()">
                                <i class="bi bi-battery-half yellow-icon h5"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="'low-status-' + Math.random()"
                                :value="'LOW'"
                                :checked="filterProps.productStatus === 'LOW'"
                                @change="
                                  filterProps.productStatus = 'LOW';
                                  filterProps.refresh();
                                "
                              />
                              <label class="btn btn-sm" :for="'low-status-' + Math.random()">
                                <i class="bi bi-battery red-icon h5"></i>
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
                                :id="'expired-' + Math.random()"
                                :checked="filterProps.expired === true"
                                @change="filterProps.checkExpired($event)"
                              />
                              <label class="form-check-label" :for="'expired-' + Math.random()">
                                {{ $t('businessProductStockAdmin.expired') }}
                              </label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="'replacement-' + Math.random()"
                                :checked="filterProps.replacement === true"
                                @change="filterProps.checkReplacement($event)"
                              />
                              <label class="form-check-label" :for="'replacement-' + Math.random()">
                                {{ $t('businessProductStockAdmin.replacement') }}
                              </label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="'asc-' + Math.random()"
                                :checked="filterProps.asc === true"
                                @change="filterProps.checkAsc($event)"
                              />
                              <label class="form-check-label" :for="'asc-' + Math.random()">
                                {{ filterProps.asc ? $t('dashboard.asc') : $t('dashboard.desc') }}
                              </label>
                            </div>
                          </div>
                          <!-- Clear button -->
                          <div class="mb-3">
                            <button
                              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100"
                              @click="filterProps.clear()"
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
                      :commerce="state.commerce"
                      :queues="Array.isArray(state.queues) ? state.queues : []"
                      :commerces="
                        Array.isArray(state.selectedCommerces) ? state.selectedCommerces : []
                      "
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
                                @click="filterProps.getToday()"
                                :disabled="filterProps.loading"
                              >
                                {{ $t('dashboard.today') }}
                              </button>
                            </div>
                            <div class="col-6 mb-2">
                              <button
                                class="btn btn-sm btn-dark rounded-pill w-100"
                                @click="filterProps.getCurrentMonth()"
                                :disabled="filterProps.loading"
                              >
                                {{ $t('dashboard.thisMonth') }}
                              </button>
                            </div>
                            <div class="col-6 mb-2">
                              <button
                                class="btn btn-sm btn-dark rounded-pill w-100"
                                @click="filterProps.getLastMonth()"
                                :disabled="filterProps.loading"
                              >
                                {{ $t('dashboard.lastMonth') }}
                              </button>
                            </div>
                            <div class="col-6 mb-2">
                              <button
                                class="btn btn-sm btn-dark rounded-pill w-100"
                                @click="filterProps.getLastThreeMonths()"
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
                              }
                            "
                            @update:endDate="
                              val => {
                                filterProps.endDate = val;
                              }
                            "
                            @search="() => filterProps.refresh(1)"
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
                                  filterProps.refresh(1);
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
                                  filterProps.refresh(1);
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
                                :id="'early-since-att-' + Math.random()"
                                :value="'EARLY'"
                                :checked="filterProps.daysSinceType === 'EARLY'"
                                @change="
                                  filterProps.daysSinceType = 'EARLY';
                                  filterProps.refresh(1);
                                "
                              />
                              <label class="btn btn-sm" :for="'early-since-att-' + Math.random()">
                                <i class="bi bi-qr-code green-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="'medium-since-att-' + Math.random()"
                                :value="'MEDIUM'"
                                :checked="filterProps.daysSinceType === 'MEDIUM'"
                                @change="
                                  filterProps.daysSinceType = 'MEDIUM';
                                  filterProps.refresh(1);
                                "
                              />
                              <label class="btn btn-sm" :for="'medium-since-att-' + Math.random()">
                                <i class="bi bi-qr-code yellow-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="'late-since-att-' + Math.random()"
                                :value="'LATE'"
                                :checked="filterProps.daysSinceType === 'LATE'"
                                @change="
                                  filterProps.daysSinceType = 'LATE';
                                  filterProps.refresh(1);
                                "
                              />
                              <label class="btn btn-sm" :for="'late-since-att-' + Math.random()">
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
                                :id="'interested-att-' + Math.random()"
                                :value="'INTERESTED'"
                                :checked="filterProps.contactResultType === 'INTERESTED'"
                                @change="
                                  filterProps.contactResultType = 'INTERESTED';
                                  filterProps.refresh(1);
                                "
                              />
                              <label class="btn btn-sm" :for="'interested-att-' + Math.random()">
                                <i class="bi bi-patch-check-fill green-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="'contact-later-att-' + Math.random()"
                                :value="'CONTACT_LATER'"
                                :checked="filterProps.contactResultType === 'CONTACT_LATER'"
                                @change="
                                  filterProps.contactResultType = 'CONTACT_LATER';
                                  filterProps.refresh(1);
                                "
                              />
                              <label class="btn btn-sm" :for="'contact-later-att-' + Math.random()">
                                <i class="bi bi-patch-check-fill yellow-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="'rejected-att-' + Math.random()"
                                :value="'REJECTED'"
                                :checked="filterProps.contactResultType === 'REJECTED'"
                                @change="
                                  filterProps.contactResultType = 'REJECTED';
                                  filterProps.refresh(1);
                                "
                              />
                              <label class="btn btn-sm" :for="'rejected-att-' + Math.random()">
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
                                :id="'contactable-att-' + Math.random()"
                                :checked="filterProps.contactable === true"
                                @change="filterProps.checkContactable($event)"
                              />
                              <label
                                class="form-check-label"
                                :for="'contactable-att-' + Math.random()"
                              >
                                {{ $t('dashboard.contactable') }}
                              </label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="'contacted-att-' + Math.random()"
                                :checked="filterProps.contacted === true"
                                @change="filterProps.checkContacted($event)"
                              />
                              <label
                                class="form-check-label"
                                :for="'contacted-att-' + Math.random()"
                              >
                                {{ $t('dashboard.contacted') }}
                              </label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="'stock-att-' + Math.random()"
                                :checked="filterProps.stock === true"
                                @change="filterProps.checkStock($event)"
                              />
                              <label class="form-check-label" :for="'stock-att-' + Math.random()">
                                {{ $t('dashboard.stock') }}
                              </label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="'asc-att-' + Math.random()"
                                :checked="filterProps.asc === true"
                                @change="filterProps.checkAsc($event)"
                              />
                              <label class="form-check-label" :for="'asc-att-' + Math.random()">
                                {{ filterProps.asc ? $t('dashboard.asc') : $t('dashboard.desc') }}
                              </label>
                            </div>
                          </div>
                          <!-- Clear button -->
                          <div class="mb-3">
                            <button
                              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100"
                              @click="filterProps.clear()"
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
                <div class="row col mx-1 mt-3 mb-3">
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
                  :show-product-stock-management="state.showProducts"
                  :toggles="state.toggles"
                  :commerce="state.commerce"
                  :queues="state.queues"
                  :commerces="state.selectedCommerces"
                  :business="state.business"
                  filters-location="slot"
                >
                </ProductsStockManagement>
                <ProductsAttentionManagement
                  :show-product-stock-management="state.showAttentions"
                  :toggles="state.toggles"
                  :commerce="state.commerce"
                  :queues="state.queues"
                  :commerces="state.selectedCommerces"
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
  font-size: 1.1rem;
  font-weight: 700;
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
