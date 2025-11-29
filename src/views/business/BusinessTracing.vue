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
import DashboardSurveysManagement from '../../components/dashboard/DashboardSurveysManagement.vue';
import DashboardAttentionsManagement from '../../components/attentions/DashboardAttentionsManagement.vue';
import DashboardClientsManagement from '../../components/clients/DashboardClientsManagement.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DashboardAttentionsAndBookingsManagement from '../../components/attentions/DashboardAttentionsAndBookingsManagement.vue';
import DesktopContentLayout from '../../components/common/desktop/DesktopContentLayout.vue';
import DesktopFiltersPanel from '../../components/common/desktop/DesktopFiltersPanel.vue';
import DateRangeFilters from '../../components/common/desktop/DateRangeFilters.vue';
import { DateModel } from '../../shared/utils/date.model';

export default {
  name: 'BusinessTracing',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    ToggleCapabilities,
    DashboardSurveysManagement,
    DashboardAttentionsManagement,
    DashboardClientsManagement,
    ComponentMenu,
    DashboardAttentionsAndBookingsManagement,
    DesktopContentLayout,
    DesktopFiltersPanel,
    DateRangeFilters,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');

    const attentionCreated = {
      attentionNumber: 0,
      totalDuration: 0,
      avgDuration: 0,
      maxQueue: '',
      evolution: {},
      attentionQueues: {},
      attentionFlow: {},
      typesFlow: {},
      pastPeriodAttentionNumber: {},
      pastMonthAttentionNumber: {},
      currentMonthAttentionNumber: {},
      pastPeriodEvolution: {},
    };

    const surveyCreated = {
      avgRating: 0,
    };

    const notificationCreated = {
      notificationNumber: 0,
      channelFlow: {},
      typesFlow: {},
    };

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
      showClients: true,
      showAttentions: false,
      showSurveyManagement: false,
      calculatedMetrics: {
        'attention.created': attentionCreated,
        'survey.created': surveyCreated,
        'notification.created': notificationCreated,
      },
      calculatedSurveyMetrics: {},
      toggles: {},
      // Filter state for desktop layout
      filtersCollapsed: false,
      startDate: undefined,
      endDate: undefined,
      searchText: undefined,
      queueId: undefined,
      serviceId: undefined,
      // Ref to store filter component instance
      clientsFilterComponent: null,
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
        state.toggles = await getPermissions('dashboard');
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

    const getLocalHour = hour => {
      const date = new Date();
      const hourDate = new Date(date.setHours(hour));
      if (state.commerce.country) {
        if (state.commerce.country === 've') {
          return hourDate.getHours() - 4;
        } else if (['br', 'cl'].includes(state.commerce.country)) {
          return hourDate.getHours() - 3;
        } else {
          return hourDate.getHours();
        }
      }
    };

    const goBack = () => {
      router.back();
    };

    const showClients = () => {
      state.showClients = true;
      (state.showAttentions = false), (state.showSurveyManagement = false);
    };

    const showSurveys = () => {
      state.showClients = false;
      (state.showAttentions = false), (state.showSurveyManagement = true);
    };

    const showAttentions = () => {
      state.showClients = false;
      (state.showAttentions = true), (state.showSurveyManagement = false);
    };

    const handleFiltersToggle = collapsed => {
      state.filtersCollapsed = collapsed;
    };

    const handleDateQuickSelect = ({ type, startDate, endDate }) => {
      state.startDate = startDate;
      state.endDate = endDate;
    };

    const handleDateSearch = () => {
      // Trigger refresh in child components if needed
      // This will be handled by prop changes
    };

    const handleCommerceChanged = commerce => {
      if (commerce && commerce.id) {
        if (commerce.id === 'ALL') {
          selectCommerce({ id: 'ALL' });
        } else {
          selectCommerce(commerce);
        }
      }
    };

    return {
      state,
      loading,
      alertError,
      goBack,
      isActiveBusiness,
      selectCommerce,
      showClients,
      showSurveys,
      showAttentions,
      getLocalHour,
      handleFiltersToggle,
      handleDateQuickSelect,
      handleDateSearch,
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
          :title="$t(`dashboard.tracing.title`)"
          :toggles="state.toggles"
          component-name="dashboard"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="loading" :stack="alertError"></Alert>
        </div>
        <div id="dashboard">
          <div v-if="isActiveBusiness()">
            <div v-if="state.commerces.length === 0" class="control-box">
              <Message
                :title="$t('dashboard.message.3.title')"
                :content="$t('dashboard.message.3.content')"
              />
            </div>
            <div v-else class="control-box">
              <div id="dashboard-controls">
                <div class="row">
                  <div class="col" v-if="state.commerces">
                    <span>{{ $t('dashboard.commerce') }} </span>
                    <select
                      class="btn btn-md fw-bold text-dark m-1 select"
                      v-model="state.commerce"
                      id="modules"
                      @change="selectCommerce(state.commerce)"
                    >
                      <option v-for="com in state.commerces" :key="com.id" :value="com">
                        {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}
                      </option>
                      <option key="ALL" :value="{ id: 'ALL' }">{{ $t('dashboard.all') }}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="!loading" id="dashboard-result" class="mt-2">
              <div class="row col mx-1 mt-3 mb-1">
                <div class="col-3 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showClients ? 'btn-selected' : ''"
                    @click="showClients()"
                    :disabled="!state.toggles['dashboard.clients-management.view']"
                  >
                    {{ $t('dashboard.clients') }} <br />
                    <i class="bi bi-person-fill"></i>
                  </button>
                </div>
                <div class="col-5 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showAttentions ? 'btn-selected' : ''"
                    @click="showAttentions()"
                    :disabled="!state.toggles['dashboard.attentions-management.view']"
                  >
                    {{ $t('dashboard.attentions') }} <br />
                    <i class="bi bi-qr-code"></i>
                  </button>
                </div>
                <div class="col-4 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showSurveyManagement ? 'btn-selected' : ''"
                    @click="showSurveys()"
                    :disabled="!state.toggles['dashboard.surveys-management.view']"
                  >
                    {{ $t('dashboard.satisfaction') }} <br />
                    <i class="bi bi-chat-heart-fill"></i>
                  </button>
                </div>
              </div>
              <div>
                <DashboardClientsManagement
                  :show-client-management="state.showClients"
                  :toggles="state.toggles"
                  :commerce="state.commerce"
                  :queues="state.queues"
                  :commerces="state.selectedCommerces"
                  :business="state.business"
                  :services="state.services"
                >
                </DashboardClientsManagement>
                <DashboardAttentionsAndBookingsManagement
                  :show-attention-management="state.showAttentions"
                  :toggles="state.toggles"
                  :commerce="state.commerce"
                  :queues="state.queues"
                  :commerces="state.selectedCommerces"
                  :services="state.services"
                >
                </DashboardAttentionsAndBookingsManagement>
                <DashboardSurveysManagement
                  :show-survey-management="state.showSurveyManagement"
                  :calculated-metrics="state.calculatedMetrics"
                  :toggles="state.toggles"
                  :commerce="state.commerce"
                  :queues="state.queues"
                  :commerces="state.selectedCommerces"
                  :services="state.services"
                >
                </DashboardSurveysManagement>
              </div>
            </div>
          </div>
          <div v-if="!isActiveBusiness() && !loading">
            <Message
              :title="$t('dashboard.message.1.title')"
              :content="$t('dashboard.message.1.content')"
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
              :title="$t(`dashboard.tracing.title`)"
              :toggles="state.toggles"
              component-name="dashboard"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
        <div id="dashboard" v-if="isActiveBusiness()">
          <div v-if="state.commerces.length === 0" class="control-box">
            <Message
              :title="$t('dashboard.message.3.title')"
              :content="$t('dashboard.message.3.content')"
            />
          </div>
          <DesktopContentLayout
            v-else
            :show-filters="true"
            :filters-sticky="true"
            @filters-toggle="handleFiltersToggle"
          >
            <template #filters="{ onToggle, collapsed }">
              <DesktopFiltersPanel
                :model-value="{ commerce: state.commerce }"
                :loading="loading"
                :commerces="state.commerces"
                :show-commerce-selector="true"
                :show-date-filters="false"
                :show-quick-date-buttons="false"
                :show-refresh-button="false"
                :sticky="true"
                :show-all-option="true"
                :commerce-selector-id="'tracing-commerce-selector'"
                :on-toggle="onToggle"
                :collapsed="collapsed"
                @commerce-changed="handleCommerceChanged"
              >
                <template #custom-filters>
                  <!-- Filters from child components - shown based on active tab -->
                  <!-- Use a separate component instance just for filters, rendered normally (not hidden) -->
                  <DashboardClientsManagement
                    v-if="state.showClients"
                    :show-client-management="false"
                    :toggles="state.toggles"
                    :commerce="state.commerce"
                    :queues="Array.isArray(state.queues) ? state.queues : []"
                    :commerces="
                      Array.isArray(state.selectedCommerces) ? state.selectedCommerces : []
                    "
                    :business="state.business"
                    :services="Array.isArray(state.services) ? state.services : []"
                    filters-location="slot"
                    ref="clientsFilterComponent"
                  >
                    <template #filters-exposed="filterProps">
                      <!-- Render filters here - they will be visible in filters panel -->
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
                        <!-- Additional filters from component -->
                        <div class="mb-3">
                          <label class="form-label fw-bold mb-2">{{
                            $t('dashboard.search') || 'Buscar'
                          }}</label>
                          <input
                            min="1"
                            max="50"
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
                        <div
                          class="mb-3"
                          v-if="filterProps.queues && filterProps.queues.length > 1"
                        >
                          <label class="form-label fw-bold mb-2">{{ $t('dashboard.queue') }}</label>
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
                  </DashboardClientsManagement>
                  <!-- Filters for Attentions tab -->
                  <DashboardAttentionsAndBookingsManagement
                    v-if="state.showAttentions"
                    :show-attention-management="false"
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
                        <!-- Additional filters -->
                        <div class="mb-3">
                          <label class="form-label fw-bold mb-2">{{
                            $t('dashboard.search') || 'Buscar'
                          }}</label>
                          <input
                            min="1"
                            max="50"
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
                        <div
                          class="mb-3"
                          v-if="filterProps.queues && filterProps.queues.length > 1"
                        >
                          <label class="form-label fw-bold mb-2">{{ $t('dashboard.queue') }}</label>
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
                        <!-- Days Since Contacted filter -->
                        <div class="mb-3">
                          <label class="form-label fw-bold mb-2">{{
                            $t('dashboard.tracing.filters.contact') || 'Días desde Contacto'
                          }}</label>
                          <div class="d-flex gap-2 align-items-center">
                            <input
                              type="radio"
                              class="btn-check"
                              :id="'early-contacted-att-' + Math.random()"
                              :value="'EARLY'"
                              :checked="filterProps.daysSinceContacted === 'EARLY'"
                              @change="
                                filterProps.daysSinceContacted = 'EARLY';
                                filterProps.refresh(1);
                              "
                            />
                            <label class="btn btn-sm" :for="'early-contacted-att-' + Math.random()">
                              <i class="bi bi-chat-left-dots-fill green-icon"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn-check"
                              :id="'medium-contacted-att-' + Math.random()"
                              :value="'MEDIUM'"
                              :checked="filterProps.daysSinceContacted === 'MEDIUM'"
                              @change="
                                filterProps.daysSinceContacted = 'MEDIUM';
                                filterProps.refresh(1);
                              "
                            />
                            <label
                              class="btn btn-sm"
                              :for="'medium-contacted-att-' + Math.random()"
                            >
                              <i class="bi bi-chat-left-dots-fill yellow-icon"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn-check"
                              :id="'late-contacted-att-' + Math.random()"
                              :value="'LATE'"
                              :checked="filterProps.daysSinceContacted === 'LATE'"
                              @change="
                                filterProps.daysSinceContacted = 'LATE';
                                filterProps.refresh(1);
                              "
                            />
                            <label class="btn btn-sm" :for="'late-contacted-att-' + Math.random()">
                              <i class="bi bi-chat-left-dots-fill red-icon"></i>
                            </label>
                            <i
                              class="bi bi-info-circle-fill h7 m-2"
                              :title="$t(`dashboard.tracing.filters.contact`)"
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
                            <label class="form-check-label" :for="'contacted-att-' + Math.random()">
                              {{ $t('dashboard.contacted') }}
                            </label>
                          </div>
                          <div class="form-check form-switch">
                            <input
                              class="form-check-input"
                              type="checkbox"
                              :id="'survey-att-' + Math.random()"
                              :checked="filterProps.survey === true"
                              @change="filterProps.checkSurvey($event)"
                            />
                            <label class="form-check-label" :for="'survey-att-' + Math.random()">
                              {{ $t('dashboard.survey') }}
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
                  </DashboardAttentionsAndBookingsManagement>
                  <!-- Filters for Surveys tab -->
                  <DashboardSurveysManagement
                    v-if="state.showSurveyManagement"
                    :show-survey-management="false"
                    :calculated-metrics="state.calculatedMetrics"
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
                        <!-- Additional filters -->
                        <div class="mb-3">
                          <label class="form-label fw-bold mb-2">{{
                            $t('dashboard.search') || 'Buscar'
                          }}</label>
                          <input
                            min="1"
                            max="50"
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
                        <div
                          class="mb-3"
                          v-if="filterProps.queues && filterProps.queues.length > 1"
                        >
                          <label class="form-label fw-bold mb-2">{{ $t('dashboard.queue') }}</label>
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
                  </DashboardSurveysManagement>
                </template>
              </DesktopFiltersPanel>
            </template>
            <template #content>
              <div v-if="!loading" id="dashboard-result">
                <div class="row col mx-1 mt-3 mb-1">
                  <div class="col-3 centered">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                      :class="state.showClients ? 'btn-selected' : ''"
                      @click="showClients()"
                      :disabled="!state.toggles['dashboard.clients-management.view']"
                    >
                      {{ $t('dashboard.clients') }} <br />
                      <i class="bi bi-person-fill"></i>
                    </button>
                  </div>
                  <div class="col-5 centered">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                      :class="state.showAttentions ? 'btn-selected' : ''"
                      @click="showAttentions()"
                      :disabled="!state.toggles['dashboard.attentions-management.view']"
                    >
                      {{ $t('dashboard.attentions') }} <br />
                      <i class="bi bi-qr-code"></i>
                    </button>
                  </div>
                  <div class="col-4 centered">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                      :class="state.showSurveyManagement ? 'btn-selected' : ''"
                      @click="showSurveys()"
                      :disabled="!state.toggles['dashboard.surveys-management.view']"
                    >
                      {{ $t('dashboard.satisfaction') }} <br />
                      <i class="bi bi-chat-heart-fill"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <DashboardClientsManagement
                    :show-client-management="state.showClients"
                    :toggles="state.toggles"
                    :commerce="state.commerce"
                    :queues="state.queues"
                    :commerces="state.selectedCommerces"
                    :business="state.business"
                    :services="state.services"
                    filters-location="slot"
                  >
                  </DashboardClientsManagement>
                  <DashboardAttentionsAndBookingsManagement
                    :show-attention-management="state.showAttentions"
                    :toggles="state.toggles"
                    :commerce="state.commerce"
                    :queues="state.queues"
                    :commerces="state.selectedCommerces"
                    :services="state.services"
                    filters-location="slot"
                  >
                  </DashboardAttentionsAndBookingsManagement>
                  <DashboardSurveysManagement
                    :show-survey-management="state.showSurveyManagement"
                    :calculated-metrics="state.calculatedMetrics"
                    :toggles="state.toggles"
                    :commerce="state.commerce"
                    :queues="state.queues"
                    :commerces="state.selectedCommerces"
                    :services="state.services"
                    filters-location="slot"
                  >
                  </DashboardSurveysManagement>
                </div>
              </div>
            </template>
          </DesktopContentLayout>
        </div>
        <div v-if="!isActiveBusiness() && !loading">
          <Message
            :title="$t('dashboard.message.1.title')"
            :content="$t('dashboard.message.1.content')"
          />
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

  #dashboard-result {
    padding-left: 0;
    padding-right: 0;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }

  .filters-content-wrapper {
    width: 100%;
  }
}
</style>
