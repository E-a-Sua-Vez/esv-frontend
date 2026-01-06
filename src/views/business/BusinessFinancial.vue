<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getCommerceById } from '../../application/services/commerce';
import { getPermissions } from '../../application/services/permissions';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import ResumeFinancialManagement from '../../components/financial/domain/ResumeFinancialManagement.vue';
import IncomesFinancialManagement from '../../components/financial/domain/IncomesFinancialManagement.vue';
import OutcomesFinancialManagement from '../../components/financial/domain/OutcomesFinancialManagement.vue';
import DesktopContentLayout from '../../components/common/desktop/DesktopContentLayout.vue';
import DesktopFiltersPanel from '../../components/common/desktop/DesktopFiltersPanel.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import DateRangeFilters from '../../components/common/desktop/DateRangeFilters.vue';

export default {
  name: 'BusinessFinancial',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    ToggleCapabilities,
    ComponentMenu,
    ResumeFinancialManagement,
    IncomesFinancialManagement,
    OutcomesFinancialManagement,
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

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      queues: ref([]),
      queue: {},
      dateType: 'month',
      showResume: true,
      showIncomes: false,
      showOutcomes: false,
      toggles: {},
      allCommerces: ref([]),
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    // Compute selectedCommerces - use all commerces for Financial components
    const selectedCommerces = computed(() => {
      if (state.allCommerces && state.allCommerces.length > 0) {
        return state.allCommerces;
      }
      return [];
    });

    // Load queues when commerce changes
    const loadQueues = async commerceId => {
      if (!commerceId) {
        state.queues = [];
        return;
      }
      try {
        const commerceData = await getCommerceById(commerceId);
        state.queues = commerceData.queues || [];
      } catch (error) {
        state.queues = [];
      }
    };

    // Watch for commerce changes and reload queues
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            // Immediately clear data to prevent showing old results
            state.queues = [];
            await loadQueues(newCommerce.id);
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
        state.allCommerces = await store.getAvailableCommerces(state.business.commerces);
        state.toggles = await getPermissions('financial');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          if (state.allCommerces && state.allCommerces.length > 0) {
            await store.setCurrentCommerce(state.allCommerces[0]);
          }
        }

        // Load queues for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadQueues(commerceToUse.id);
        }

        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

    const getLocalHour = hour => {
      const date = new Date();
      const hourDate = new Date(date.setHours(hour));
      if (commerce.value && commerce.value.country) {
        if (commerce.value.country === 've') {
          return hourDate.getHours() - 4;
        } else if (['br', 'cl'].includes(commerce.value.country)) {
          return hourDate.getHours() - 3;
        } else {
          return hourDate.getHours();
        }
      }
    };

    const goBack = () => {
      router.back();
    };

    const showResume = () => {
      state.showResume = true;
      (state.showIncomes = false), (state.showOutcomes = false);
    };

    const showIncomes = () => {
      state.showResume = false;
      (state.showIncomes = true), (state.showOutcomes = false);
    };

    const showOutcomes = () => {
      state.showResume = false;
      (state.showIncomes = false), (state.showOutcomes = true);
    };

    const handleFiltersToggle = () => {
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
      commerce,
      selectedCommerces,
      showResume,
      showIncomes,
      showOutcomes,
      getLocalHour,
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
        <CommerceLogo
          :src="state.business?.logo"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessFinancial.title`)"
          :toggles="state.toggles"
          component-name="businessFinancial"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessFinancial">
          <div v-if="isActiveBusiness()">
            <div v-if="!commerce" class="control-box">
              <Message
                :title="$t('businessFinancial.message.3.title')"
                :content="$t('businessFinancial.message.3.content')"
              />
            </div>
            <div v-else class="control-box">
              <div id="businessFinancial-controls">
                <div class="row"></div>
              </div>
            </div>
            <div v-if="!loading" id="businessFinancial-result" class="mt-2">
              <div class="row col mx-1 mt-3 mb-1 tabs-header-divider">
                <div class="col-3 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showResume ? 'btn-selected' : ''"
                    @click="showResume()"
                    :disabled="!state.toggles['financial.resume.view']"
                  >
                    {{ $t('businessFinancial.resume') }} <br />
                    <i class="bi bi-graph-up"></i>
                  </button>
                </div>
                <div class="col-5 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showIncomes ? 'btn-selected' : ''"
                    @click="showIncomes()"
                    :disabled="!state.toggles['financial.incomes.view']"
                  >
                    {{ $t('businessFinancial.incomes') }} <br />
                    <i class="bi bi-arrow-down-circle-fill"></i>
                  </button>
                </div>
                <div class="col-4 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showOutcomes ? 'btn-selected' : ''"
                    @click="showOutcomes()"
                    :disabled="!state.toggles['financial.outcomes.view']"
                  >
                    {{ $t('businessFinancial.outcomes') }} <br />
                    <i class="bi bi-arrow-up-circle-fill"></i>
                  </button>
                </div>
              </div>
              <div>
                <ResumeFinancialManagement
                  :show-resume-financial-management="state.showResume"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
                  :business="state.business"
                  filters-location="component"
                >
                </ResumeFinancialManagement>
                <IncomesFinancialManagement
                  :show-incomes-financial-management="state.showIncomes"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
                  :business="state.business"
                  filters-location="component"
                >
                </IncomesFinancialManagement>
                <OutcomesFinancialManagement
                  :show-outcomes-financial-management="state.showOutcomes"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
                  :business="state.business"
                  filters-location="component"
                >
                </OutcomesFinancialManagement>
              </div>
            </div>
          </div>
          <div v-if="!isActiveBusiness() && !loading">
            <Message
              :title="$t('businessFinancial.message.1.title')"
              :content="$t('businessFinancial.message.1.content')"
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
          :title="$t('businessFinancial.title')"
          :toggles="state.toggles"
          component-name="businessFinancial"
          @go-back="goBack"
        />
        <div id="businessFinancial" v-if="isActiveBusiness()">
          <div v-if="!state.allCommerces || state.allCommerces.length === 0" class="control-box">
            <Message
              :title="$t('businessFinancial.message.3.title')"
              :content="$t('businessFinancial.message.3.content')"
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
                  :model-value="{ commerce: commerce }"
                  :loading="loading"
                  :commerces="[]"
                  :show-commerce-selector="false"
                  :show-date-filters="false"
                  :show-quick-date-buttons="false"
                  :show-refresh-button="false"
                  :sticky="true"
                  :show-all-option="true"
                  :commerce-selector-id="'financial-commerce-selector'"
                  :on-toggle="onToggle"
                  :collapsed="collapsed"
                  @commerce-changed="handleCommerceChanged"
                >
                  <template #custom-filters>
                    <!-- Filters for Resume tab -->
                    <ResumeFinancialManagement
                      v-if="state.showResume"
                      :show-resume-financial-management="false"
                      :toggles="state.toggles"
                      :commerce="commerce"
                      :queues="Array.isArray(state.queues) ? state.queues : []"
                      :commerces="Array.isArray(selectedCommerces) ? selectedCommerces : []"
                      :business="state.business"
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

                          <!-- DateRangeFilters -->
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
                            @search="() => filterProps.refresh()"
                          />

                          <!-- Clear button -->
                          <div class="mb-3 mt-3">
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
                    </ResumeFinancialManagement>

                    <!-- Filters for Incomes tab -->
                    <IncomesFinancialManagement
                      v-if="state.showIncomes"
                      :show-incomes-financial-management="false"
                      :toggles="state.toggles"
                      :commerce="commerce"
                      :queues="Array.isArray(state.queues) ? state.queues : []"
                      :commerces="Array.isArray(selectedCommerces) ? selectedCommerces : []"
                      :business="state.business"
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

                          <!-- DateRangeFilters -->
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
                            @search="() => filterProps.refresh()"
                          />

                          <!-- Search field -->
                          <div class="mb-3">
                            <label class="form-label fw-bold mb-2">{{
                              $t('dashboard.search') || 'Buscar'
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
                                :placeholder="$t('dashboard.search')"
                              />
                              <button
                                class="btn btn-sm btn-dark rounded-pill"
                                @click="filterProps.refresh()"
                                :disabled="filterProps.loading"
                                style="flex-shrink: 0"
                              >
                                <i class="bi bi-search"></i>
                              </button>
                            </div>
                          </div>

                          <!-- Income Status filters -->
                          <div class="mb-3">
                            <label class="form-label fw-bold mb-2">{{
                              $t('dashboard.tracing.filters.attention') || 'Estado'
                            }}</label>
                            <div class="d-flex gap-2 align-items-center">
                              <input
                                type="radio"
                                class="btn-check"
                                :id="'confirmed-income-' + Math.random()"
                                :value="'CONFIRMED'"
                                :checked="filterProps.incomeStatus === 'CONFIRMED'"
                                @change="
                                  filterProps.incomeStatus = 'CONFIRMED';
                                  filterProps.refresh(1);
                                "
                              />
                              <label class="btn btn-sm" :for="'confirmed-income-' + Math.random()">
                                <i class="bi bi-check-circle-fill green-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="'pending-income-' + Math.random()"
                                :value="'PENDING'"
                                :checked="filterProps.incomeStatus === 'PENDING'"
                                @change="
                                  filterProps.incomeStatus = 'PENDING';
                                  filterProps.refresh(1);
                                "
                              />
                              <label class="btn btn-sm" :for="'pending-income-' + Math.random()">
                                <i class="bi bi-clock-fill yellow-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check"
                                :id="'cancelled-income-' + Math.random()"
                                :value="'CANCELLED'"
                                :checked="filterProps.incomeStatus === 'CANCELLED'"
                                @change="
                                  filterProps.incomeStatus = 'CANCELLED';
                                  filterProps.refresh(1);
                                "
                              />
                              <label class="btn btn-sm" :for="'cancelled-income-' + Math.random()">
                                <i class="bi bi-x-circle-fill red-icon"></i>
                              </label>
                            </div>
                          </div>

                          <!-- Fiscal Note and Automatic filters -->
                          <div class="mb-3">
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :checked="filterProps.fiscalNote"
                                @change="filterProps.checkFiscalNote($event)"
                              />
                              <label class="form-check-label">{{
                                $t('collaboratorBookingsView.fiscalNote') || 'Nota Fiscal'
                              }}</label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :checked="filterProps.automatic"
                                @change="filterProps.checkAutomatic($event)"
                              />
                              <label class="form-check-label">{{
                                $t('collaboratorBookingsView.automatic') || 'Automático'
                              }}</label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :checked="filterProps.asc"
                                @change="filterProps.checkAsc($event)"
                              />
                              <label class="form-check-label">{{
                                $t('dashboard.asc') || 'Ascendente'
                              }}</label>
                            </div>
                          </div>

                          <!-- Clear button -->
                          <div class="mb-3 mt-3">
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
                    </IncomesFinancialManagement>

                    <!-- Filters for Outcomes tab -->
                    <OutcomesFinancialManagement
                      v-if="state.showOutcomes"
                      :show-outcomes-financial-management="false"
                      :toggles="state.toggles"
                      :commerce="commerce"
                      :queues="Array.isArray(state.queues) ? state.queues : []"
                      :commerces="Array.isArray(selectedCommerces) ? selectedCommerces : []"
                      :business="state.business"
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

                          <!-- DateRangeFilters -->
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
                            @search="() => filterProps.refresh()"
                          />

                          <!-- Search field -->
                          <div class="mb-3">
                            <label class="form-label fw-bold mb-2">{{
                              $t('dashboard.search') || 'Buscar'
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
                                :placeholder="$t('dashboard.search')"
                              />
                              <button
                                class="btn btn-sm btn-dark rounded-pill"
                                @click="filterProps.refresh()"
                                :disabled="filterProps.loading"
                                style="flex-shrink: 0"
                              >
                                <i class="bi bi-search"></i>
                              </button>
                            </div>
                          </div>

                          <!-- Asc filter -->
                          <div class="mb-3">
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :checked="filterProps.asc"
                                @change="filterProps.checkAsc($event)"
                              />
                              <label class="form-check-label">{{
                                $t('dashboard.asc') || 'Ascendente'
                              }}</label>
                            </div>
                          </div>

                          <!-- Clear button -->
                          <div class="mb-3 mt-3">
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
                    </OutcomesFinancialManagement>
                  </template>
                </DesktopFiltersPanel>
              </template>
              <template #content>
                <!-- Header with tabs -->
                <div class="row col mx-1 mt-3 mb-3 tabs-header-divider">
                  <div class="col-3 centered">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                      :class="state.showResume ? 'btn-selected' : ''"
                      @click="showResume()"
                      :disabled="!state.toggles['financial.resume.view']"
                    >
                      {{ $t('businessFinancial.resume') }} <br />
                      <i class="bi bi-graph-up"></i>
                    </button>
                  </div>
                  <div class="col-5 centered">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                      :class="state.showIncomes ? 'btn-selected' : ''"
                      @click="showIncomes()"
                      :disabled="!state.toggles['financial.incomes.view']"
                    >
                      {{ $t('businessFinancial.incomes') }} <br />
                      <i class="bi bi-arrow-down-circle-fill"></i>
                    </button>
                  </div>
                  <div class="col-4 centered">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                      :class="state.showOutcomes ? 'btn-selected' : ''"
                      @click="showOutcomes()"
                      :disabled="!state.toggles['financial.outcomes.view']"
                    >
                      {{ $t('businessFinancial.outcomes') }} <br />
                      <i class="bi bi-arrow-up-circle-fill"></i>
                    </button>
                  </div>
                </div>

                <!-- Main content components -->
                <ResumeFinancialManagement
                  :show-resume-financial-management="state.showResume"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
                  :business="state.business"
                  filters-location="slot"
                >
                </ResumeFinancialManagement>
                <IncomesFinancialManagement
                  :show-incomes-financial-management="state.showIncomes"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
                  :business="state.business"
                  filters-location="slot"
                >
                </IncomesFinancialManagement>
                <OutcomesFinancialManagement
                  :show-outcomes-financial-management="state.showOutcomes"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
                  :business="state.business"
                  filters-location="slot"
                >
                </OutcomesFinancialManagement>
              </template>
            </DesktopContentLayout>
          </div>
          <div v-if="!isActiveBusiness() && !loading">
            <Message
              :title="$t('businessFinancial.message.1.title')"
              :content="$t('businessFinancial.message.1.content')"
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

  .filters-content-wrapper {
    width: 100%;
  }
}
</style>
