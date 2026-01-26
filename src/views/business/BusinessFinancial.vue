<script>
import { ref, reactive, onBeforeMount, computed, watch, nextTick } from 'vue';
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
import CommissionPaymentsManagement from '../../components/financial/domain/CommissionPaymentsManagement.vue';
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
    CommissionPaymentsManagement,
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

    // Refs to access child component instances
    const incomesFilterRef = ref(null);
    const incomesContentRef = ref(null);
    const outcomesFilterRef = ref(null);
    const outcomesContentRef = ref(null);
    const resumeFilterRef = ref(null);
    const resumeContentRef = ref(null);

    // Refs for timeout management
    const timeoutRefIncomes = ref(null);
    const timeoutRefOutcomes = ref(null);
    const timeoutRefResume = ref(null);

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
      // Shared filter state
      sharedIncomeFilters: {
        incomeStatus: undefined,
        fiscalNote: undefined,
        automatic: undefined,
        commissionPaid: undefined,
        asc: false,
        searchText: undefined,
        startDate: undefined,
        endDate: undefined,
      },
      // Modal states
      showCommissionPaymentsModal: false,
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
      state.showIncomes = false;
      state.showOutcomes = false;
    };

    const showIncomes = () => {
      state.showResume = false;
      state.showIncomes = true;
      state.showOutcomes = false;
    };

    const showOutcomes = () => {
      state.showResume = false;
      state.showIncomes = false;
      state.showOutcomes = true;
    };

    const closeCommissionPaymentsModal = () => {
      state.showCommissionPaymentsModal = false;
    };

    const handleViewOutcome = (outcomeId) => {
      // Close commission payments modal
      state.showCommissionPaymentsModal = false;

      // Switch to outcomes tab
      showOutcomes();

      // Refresh outcomes to show the new outcome
      nextTick(() => {
        if (outcomesContentRef.value && outcomesContentRef.value.refresh) {
          outcomesContentRef.value.refresh();
        }
      });

      // TODO: Scroll to or highlight the specific outcome
      // This would require finding the outcome in the list and scrolling to it
    };

    const handleFiltersToggle = () => {
      // Handle filters toggle if needed
    };

    // Wrapper function to refresh content instance when filters change - following BusinessTracing pattern
    // CRITICAL: This function must sync ALL filter values exactly as they are in filterInstance
    // to ensure mobile and desktop produce identical results
    const refreshIncomesContent = (filterPropsOverride = null) => {
      // Use nextTick to ensure filter instance values are updated
      nextTick(() => {
        nextTick(() => {
          if (incomesFilterRef.value && incomesContentRef.value) {
            const filterInstance = incomesFilterRef.value;
            const contentInstance = incomesContentRef.value;

            if (!filterInstance || !contentInstance) {
              return;
            }

            // Clear previous data immediately
            contentInstance.financialIncomes = [];
            contentInstance.counter = 0;
            contentInstance.totalPages = 0;

            // Set flag to skip watch during manual sync
            contentInstance._skipWatch = true;

            // Sync all filter properties - read from filterPropsOverride if provided, otherwise from filterInstance
            contentInstance.page = 1;

            // Helper function to get value - prioritize override, then filterInstance, then undefined
            const getValue = key => {
              if (filterPropsOverride && key in filterPropsOverride) {
                return filterPropsOverride[key];
              }
              return filterInstance[key];
            };

            // Helper to normalize string values (empty string -> undefined, trim whitespace)
            const normalizeString = value => {
              if (value === null || value === undefined) return undefined;
              const str = String(value).trim();
              return str === '' ? undefined : str;
            };

            // Sync all filter values - EXACTLY as they are in filterInstance
            contentInstance.startDate = normalizeString(getValue('startDate'));
            contentInstance.endDate = normalizeString(getValue('endDate'));
            contentInstance.searchText = normalizeString(getValue('searchText'));
            contentInstance.incomeStatus = getValue('incomeStatus');

            // Handle boolean values - ensure they are properly set (true/false or undefined)
            const fiscalNoteValue = getValue('fiscalNote');
            contentInstance.fiscalNote = fiscalNoteValue !== undefined ? fiscalNoteValue : undefined;

            const automaticValue = getValue('automatic');
            contentInstance.automatic = automaticValue !== undefined ? automaticValue : undefined;

            const commissionPaidValue = getValue('commissionPaid');
            contentInstance.commissionPaid = commissionPaidValue !== undefined ? commissionPaidValue : undefined;

            const ascValue = getValue('asc');
            contentInstance.asc = ascValue !== undefined ? ascValue : false;

            contentInstance.minAmount = getValue('minAmount');
            contentInstance.maxAmount = getValue('maxAmount');

            // Handle filter values - ensure undefined is properly handled
            const incomeTypeValue = getValue('incomeTypeFilter');
            contentInstance.incomeTypeFilter = incomeTypeValue !== undefined && incomeTypeValue !== null && incomeTypeValue !== '' ? incomeTypeValue : undefined;

            const paymentMethodValue = getValue('paymentMethodFilter');
            contentInstance.paymentMethodFilter = paymentMethodValue !== undefined && paymentMethodValue !== null && paymentMethodValue !== '' ? paymentMethodValue : undefined;

            const professionalValue = getValue('professionalFilter');
            contentInstance.professionalFilter = professionalValue !== undefined && professionalValue !== null && professionalValue !== '' ? professionalValue : undefined;

            console.log('[refreshIncomesContent] Syncing filters:', {
              professionalFilter: contentInstance.professionalFilter,
              startDate: contentInstance.startDate,
              endDate: contentInstance.endDate,
            });

            // Clear skip flag and refresh
            contentInstance._skipWatch = false;

            // Force Vue to update the reactive properties
            nextTick(() => {
              nextTick(() => {
                if (contentInstance && contentInstance.refresh) {
                  contentInstance.refresh();
                }
              });
            });
          }
        });
      });
    };

    // Helper function to get all current filter values from filterProps
    const getAllFilterValues = (filterProps, override = {}) => {
      return {
        startDate: override.startDate !== undefined ? override.startDate : filterProps.startDate,
        endDate: override.endDate !== undefined ? override.endDate : filterProps.endDate,
        searchText: override.searchText !== undefined ? override.searchText : filterProps.searchText,
        incomeStatus: override.incomeStatus !== undefined ? override.incomeStatus : filterProps.incomeStatus,
        fiscalNote: override.fiscalNote !== undefined ? override.fiscalNote : filterProps.fiscalNote,
        automatic: override.automatic !== undefined ? override.automatic : filterProps.automatic,
        asc: override.asc !== undefined ? override.asc : filterProps.asc,
        minAmount: override.minAmount !== undefined ? override.minAmount : filterProps.minAmount,
        maxAmount: override.maxAmount !== undefined ? override.maxAmount : filterProps.maxAmount,
        incomeTypeFilter: override.incomeTypeFilter !== undefined ? override.incomeTypeFilter : filterProps.incomeTypeFilter,
        paymentMethodFilter: override.paymentMethodFilter !== undefined ? override.paymentMethodFilter : filterProps.paymentMethodFilter,
        professionalFilter: override.professionalFilter !== undefined ? override.professionalFilter : filterProps.professionalFilter,
      };
    };

    // Helper function to refresh incomes content with delay (debounce)
    const refreshIncomesContentDelayed = (filterPropsOverride = null, delay = 50) => {
      if (timeoutRefIncomes.value) {
        clearTimeout(timeoutRefIncomes.value);
      }
      timeoutRefIncomes.value = setTimeout(() => {
        refreshIncomesContent(filterPropsOverride);
        timeoutRefIncomes.value = null;
      }, delay);
    };

    // Helper function to get all current filter values for Outcomes
    const getAllOutcomesFilterValues = (filterProps, override = {}) => {
      return {
        startDate: override.startDate !== undefined ? override.startDate : filterProps.startDate,
        endDate: override.endDate !== undefined ? override.endDate : filterProps.endDate,
        searchText: override.searchText !== undefined ? override.searchText : filterProps.searchText,
        asc: override.asc !== undefined ? override.asc : filterProps.asc,
        minAmount: override.minAmount !== undefined ? override.minAmount : filterProps.minAmount,
        maxAmount: override.maxAmount !== undefined ? override.maxAmount : filterProps.maxAmount,
        outcomeTypeFilter: override.outcomeTypeFilter !== undefined ? override.outcomeTypeFilter : filterProps.outcomeTypeFilter,
        outcomeSystemTypeFilter: override.outcomeSystemTypeFilter !== undefined ? override.outcomeSystemTypeFilter : filterProps.outcomeSystemTypeFilter,
        paymentMethodFilter: override.paymentMethodFilter !== undefined ? override.paymentMethodFilter : filterProps.paymentMethodFilter,
        professionalFilter: override.professionalFilter !== undefined ? override.professionalFilter : filterProps.professionalFilter,
      };
    };

    // Wrapper function to refresh outcomes content instance when filters change
    const refreshOutcomesContent = (filterPropsOverride = null) => {
      nextTick(() => {
        nextTick(() => {
          if (outcomesFilterRef.value && outcomesContentRef.value) {
            const filterInstance = outcomesFilterRef.value;
            const contentInstance = outcomesContentRef.value;

            if (!filterInstance || !contentInstance) {
              return;
            }

            // Clear previous data immediately
            contentInstance.financialOutcomes = [];
            contentInstance.counter = 0;
            contentInstance.totalPages = 0;

            // Set flag to skip watch during manual sync
            contentInstance._skipWatch = true;

            // Helper function to get value - prioritize override, then filterInstance, then undefined
            const getValue = key => {
              if (filterPropsOverride && key in filterPropsOverride) {
                return filterPropsOverride[key];
              }
              return filterInstance[key];
            };

            // Helper to normalize string values
            const normalizeString = value => {
              if (value === null || value === undefined) return undefined;
              const str = String(value).trim();
              return str === '' ? undefined : str;
            };

            // Sync all filter values
            contentInstance.page = 1;
            contentInstance.startDate = normalizeString(getValue('startDate'));
            contentInstance.endDate = normalizeString(getValue('endDate'));
            contentInstance.searchText = normalizeString(getValue('searchText'));
            const ascValue = getValue('asc');
            contentInstance.asc = ascValue !== undefined ? ascValue : true;
            contentInstance.minAmount = getValue('minAmount');
            contentInstance.maxAmount = getValue('maxAmount');
            const outcomeTypeValue = getValue('outcomeTypeFilter');
            contentInstance.outcomeTypeFilter = outcomeTypeValue !== undefined && outcomeTypeValue !== null && outcomeTypeValue !== '' ? outcomeTypeValue : undefined;
            const outcomeSystemTypeValue = getValue('outcomeSystemTypeFilter');
            contentInstance.outcomeSystemTypeFilter = outcomeSystemTypeValue !== undefined && outcomeSystemTypeValue !== null && outcomeSystemTypeValue !== '' ? outcomeSystemTypeValue : undefined;
            const paymentMethodValue = getValue('paymentMethodFilter');
            contentInstance.paymentMethodFilter = paymentMethodValue !== undefined && paymentMethodValue !== null && paymentMethodValue !== '' ? paymentMethodValue : undefined;
            const professionalValue = getValue('professionalFilter');
            contentInstance.professionalFilter = professionalValue !== undefined && professionalValue !== null && professionalValue !== '' ? professionalValue : undefined;

            // Clear skip flag and refresh
            contentInstance._skipWatch = false;

            // Force Vue to update the reactive properties
            nextTick(() => {
              nextTick(() => {
                if (contentInstance && contentInstance.refresh) {
                  contentInstance.refresh();
                }
              });
            });
          }
        });
      });
    };

    // Helper function to refresh outcomes content with delay (debounce)
    const refreshOutcomesContentDelayed = (filterPropsOverride = null, delay = 50) => {
      if (timeoutRefOutcomes.value) {
        clearTimeout(timeoutRefOutcomes.value);
      }
      timeoutRefOutcomes.value = setTimeout(() => {
        refreshOutcomesContent(filterPropsOverride);
        timeoutRefOutcomes.value = null;
      }, delay);
    };

    // Helper function to get all current filter values for Resume
    const getAllResumeFilterValues = (filterProps, override = {}) => {
      return {
        startDate: override.startDate !== undefined ? override.startDate : filterProps.startDate,
        endDate: override.endDate !== undefined ? override.endDate : filterProps.endDate,
      };
    };

    // Wrapper function to refresh resume content instance when filters change
    const refreshResumeContent = (filterPropsOverride = null) => {
      nextTick(() => {
        nextTick(() => {
          if (resumeFilterRef.value && resumeContentRef.value) {
            const filterInstance = resumeFilterRef.value;
            const contentInstance = resumeContentRef.value;

            if (!filterInstance || !contentInstance) {
              return;
            }

            // Helper function to get value - prioritize override, then filterInstance, then undefined
            const getValue = key => {
              if (filterPropsOverride && key in filterPropsOverride) {
                return filterPropsOverride[key];
              }
              return filterInstance[key];
            };

            // Helper to normalize string values
            const normalizeString = value => {
              if (value === null || value === undefined) return undefined;
              const str = String(value).trim();
              return str === '' ? undefined : str;
            };

            // Sync all filter values
            contentInstance.startDate = normalizeString(getValue('startDate'));
            contentInstance.endDate = normalizeString(getValue('endDate'));

            // Force Vue to update the reactive properties
            nextTick(() => {
              nextTick(() => {
                if (contentInstance && contentInstance.refresh) {
                  contentInstance.refresh();
                }
              });
            });
          }
        });
      });
    };

    // Helper function to refresh resume content with delay (debounce)
    const refreshResumeContentDelayed = (filterPropsOverride = null, delay = 50) => {
      if (timeoutRefResume.value) {
        clearTimeout(timeoutRefResume.value);
      }
      timeoutRefResume.value = setTimeout(() => {
        refreshResumeContent(filterPropsOverride);
        timeoutRefResume.value = null;
      }, delay);
    };

    const handleCommerceChanged = async commerce => {
      // Commerce is now managed globally
      if (commerce && commerce.id && commerce.id !== 'ALL') {
        await store.setCurrentCommerce(commerce);
      }
    };

    // Shared filter functions - updated to sync with filter instance and refresh content
    const setSharedIncomeStatus = value => {
      console.log('BusinessFinancial.setSharedIncomeStatus:', {
        oldValue: state.sharedIncomeFilters.incomeStatus,
        newValue: value,
      });
      state.sharedIncomeFilters.incomeStatus = value;

      // Update filter instance if available
      if (incomesFilterRef.value) {
        incomesFilterRef.value.incomeStatus = value === '' ? undefined : value;
        // Use getAllFilterValues helper to get all current values from filter instance
        const filterProps = {
          startDate: incomesFilterRef.value.startDate,
          endDate: incomesFilterRef.value.endDate,
          searchText: incomesFilterRef.value.searchText,
          incomeStatus: value === '' ? undefined : value,
          fiscalNote: incomesFilterRef.value.fiscalNote,
          automatic: incomesFilterRef.value.automatic,
          asc: incomesFilterRef.value.asc,
          minAmount: incomesFilterRef.value.minAmount,
          maxAmount: incomesFilterRef.value.maxAmount,
          incomeTypeFilter: incomesFilterRef.value.incomeTypeFilter,
          paymentMethodFilter: incomesFilterRef.value.paymentMethodFilter,
          professionalFilter: incomesFilterRef.value.professionalFilter,
        };
        refreshIncomesContentDelayed(filterProps);
      }
    };

    const setSharedFiscalNote = value => {
      state.sharedIncomeFilters.fiscalNote = value;

      // Update filter instance if available
      if (incomesFilterRef.value) {
        incomesFilterRef.value.fiscalNote = value;
        const filterProps = {
          startDate: incomesFilterRef.value.startDate,
          endDate: incomesFilterRef.value.endDate,
          searchText: incomesFilterRef.value.searchText,
          incomeStatus: incomesFilterRef.value.incomeStatus,
          fiscalNote: value,
          automatic: incomesFilterRef.value.automatic,
          asc: incomesFilterRef.value.asc,
          minAmount: incomesFilterRef.value.minAmount,
          maxAmount: incomesFilterRef.value.maxAmount,
          incomeTypeFilter: incomesFilterRef.value.incomeTypeFilter,
          paymentMethodFilter: incomesFilterRef.value.paymentMethodFilter,
          professionalFilter: incomesFilterRef.value.professionalFilter,
        };
        refreshIncomesContentDelayed(filterProps);
      }
    };

    const setSharedAutomatic = value => {
      state.sharedIncomeFilters.automatic = value;

      // Update filter instance if available
      if (incomesFilterRef.value) {
        incomesFilterRef.value.automatic = value;
        const filterProps = {
          startDate: incomesFilterRef.value.startDate,
          endDate: incomesFilterRef.value.endDate,
          searchText: incomesFilterRef.value.searchText,
          incomeStatus: incomesFilterRef.value.incomeStatus,
          fiscalNote: incomesFilterRef.value.fiscalNote,
          automatic: value,
          commissionPaid: incomesFilterRef.value.commissionPaid,
          asc: incomesFilterRef.value.asc,
          minAmount: incomesFilterRef.value.minAmount,
          maxAmount: incomesFilterRef.value.maxAmount,
          incomeTypeFilter: incomesFilterRef.value.incomeTypeFilter,
          paymentMethodFilter: incomesFilterRef.value.paymentMethodFilter,
          professionalFilter: incomesFilterRef.value.professionalFilter,
        };
        refreshIncomesContentDelayed(filterProps);
      }
    };

    const setSharedCommissionPaid = value => {
      state.sharedIncomeFilters.commissionPaid = value;

      // Update filter instance if available
      if (incomesFilterRef.value) {
        incomesFilterRef.value.commissionPaid = value;
        const filterProps = {
          startDate: incomesFilterRef.value.startDate,
          endDate: incomesFilterRef.value.endDate,
          searchText: incomesFilterRef.value.searchText,
          incomeStatus: incomesFilterRef.value.incomeStatus,
          fiscalNote: incomesFilterRef.value.fiscalNote,
          automatic: incomesFilterRef.value.automatic,
          commissionPaid: value,
          asc: incomesFilterRef.value.asc,
          minAmount: incomesFilterRef.value.minAmount,
          maxAmount: incomesFilterRef.value.maxAmount,
          incomeTypeFilter: incomesFilterRef.value.incomeTypeFilter,
          paymentMethodFilter: incomesFilterRef.value.paymentMethodFilter,
          professionalFilter: incomesFilterRef.value.professionalFilter,
        };
        refreshIncomesContentDelayed(filterProps);
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
      closeCommissionPaymentsModal,
      handleViewOutcome,
      getLocalHour,
      handleFiltersToggle,
      handleCommerceChanged,
      setSharedIncomeStatus,
      setSharedFiscalNote,
      setSharedAutomatic,
      setSharedCommissionPaid,
      // Refs for filter and content instances
      incomesFilterRef,
      incomesContentRef,
      outcomesFilterRef,
      outcomesContentRef,
      resumeFilterRef,
      resumeContentRef,
      // Functions to sync filters to content
      refreshIncomesContent,
      refreshIncomesContentDelayed,
      getAllFilterValues,
      refreshOutcomesContent,
      refreshOutcomesContentDelayed,
      getAllOutcomesFilterValues,
      refreshResumeContent,
      refreshResumeContentDelayed,
      getAllResumeFilterValues,
      nextTick,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo :src="state.business?.logo" :loading="loading"></CommerceLogo>
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
                <div class="col-4 centered">
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
                <div class="col-4 centered">
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
                      ref="resumeFilterRef"
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
                                  nextTick(() => {
                                    if (resumeFilterRef.value) {
                                      resumeFilterRef.value.startDate = filterProps.startDate;
                                      resumeFilterRef.value.endDate = filterProps.endDate;
                                    }
                                    refreshResumeContentDelayed(getAllResumeFilterValues(filterProps));
                                  });
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
                                  nextTick(() => {
                                    if (resumeFilterRef.value) {
                                      resumeFilterRef.value.startDate = filterProps.startDate;
                                      resumeFilterRef.value.endDate = filterProps.endDate;
                                    }
                                    refreshResumeContentDelayed(getAllResumeFilterValues(filterProps));
                                  });
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
                                  nextTick(() => {
                                    if (resumeFilterRef.value) {
                                      resumeFilterRef.value.startDate = filterProps.startDate;
                                      resumeFilterRef.value.endDate = filterProps.endDate;
                                    }
                                    refreshResumeContentDelayed(getAllResumeFilterValues(filterProps));
                                  });
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
                                  nextTick(() => {
                                    if (resumeFilterRef.value) {
                                      resumeFilterRef.value.startDate = filterProps.startDate;
                                      resumeFilterRef.value.endDate = filterProps.endDate;
                                    }
                                    refreshResumeContentDelayed(getAllResumeFilterValues(filterProps));
                                  });
                                "
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
                                if (resumeFilterRef.value) {
                                  resumeFilterRef.value.startDate = val;
                                }
                              }
                            "
                            @update:endDate="
                              val => {
                                filterProps.endDate = val;
                                if (resumeFilterRef.value) {
                                  resumeFilterRef.value.endDate = val;
                                }
                              }
                            "
                            @search="
                              refreshResumeContentDelayed(getAllResumeFilterValues(filterProps))
                            "
                          />

                          <!-- Clear button -->
                          <div class="mb-3 mt-3">
                            <button
                              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100"
                              @click="
                                async () => {
                                  await filterProps.clear();
                                  await nextTick();
                                  if (resumeFilterRef.value) {
                                    resumeFilterRef.value.startDate = undefined;
                                    resumeFilterRef.value.endDate = undefined;
                                    filterProps.startDate = undefined;
                                    filterProps.endDate = undefined;
                                  }
                                  await nextTick();
                                  refreshResumeContentDelayed({
                                    startDate: undefined,
                                    endDate: undefined,
                                  });
                                }
                              "
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
                      ref="incomesFilterRef"
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
                                  nextTick(() => {
                                    if (incomesFilterRef.value) {
                                      incomesFilterRef.value.startDate = filterProps.startDate;
                                      incomesFilterRef.value.endDate = filterProps.endDate;
                                    }
                                    refreshIncomesContentDelayed(getAllFilterValues(filterProps));
                                  });
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
                                  nextTick(() => {
                                    if (incomesFilterRef.value) {
                                      incomesFilterRef.value.startDate = filterProps.startDate;
                                      incomesFilterRef.value.endDate = filterProps.endDate;
                                    }
                                    refreshIncomesContentDelayed(getAllFilterValues(filterProps));
                                  });
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
                                  nextTick(() => {
                                    if (incomesFilterRef.value) {
                                      incomesFilterRef.value.startDate = filterProps.startDate;
                                      incomesFilterRef.value.endDate = filterProps.endDate;
                                    }
                                    refreshIncomesContentDelayed(getAllFilterValues(filterProps));
                                  });
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
                                  nextTick(() => {
                                    if (incomesFilterRef.value) {
                                      incomesFilterRef.value.startDate = filterProps.startDate;
                                      incomesFilterRef.value.endDate = filterProps.endDate;
                                    }
                                    refreshIncomesContentDelayed(getAllFilterValues(filterProps));
                                  });
                                "
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
                                if (incomesFilterRef.value) {
                                  incomesFilterRef.value.startDate = val;
                                }
                              }
                            "
                            @update:endDate="
                              val => {
                                filterProps.endDate = val;
                                if (incomesFilterRef.value) {
                                  incomesFilterRef.value.endDate = val;
                                }
                              }
                            "
                            @search="
                              refreshIncomesContentDelayed(getAllFilterValues(filterProps))
                            "
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
                                    const newValue = e.target.value;
                                    filterProps.searchText = newValue;
                                    if (incomesFilterRef.value) {
                                      incomesFilterRef.value.searchText = newValue;
                                    }
                                  }
                                "
                                :placeholder="$t('dashboard.search')"
                              />
                              <button
                                class="btn btn-sm btn-dark rounded-pill"
                                @click="
                                  refreshIncomesContentDelayed(getAllFilterValues(filterProps))
                                "
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
                                class="btn-check btn-sm"
                                :checked="filterProps.incomeStatus === 'CONFIRMED'"
                                @change="setSharedIncomeStatus('CONFIRMED')"
                                name="income-status-type"
                                id="income-status-confirmed"
                                autocomplete="off"
                              />
                              <label class="btn btn-sm" for="income-status-confirmed">
                                <i class="bi bi-check-circle-fill green-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check btn-sm"
                                :checked="filterProps.incomeStatus === 'PENDING'"
                                @change="setSharedIncomeStatus('PENDING')"
                                name="income-status-type"
                                id="income-status-pending"
                                autocomplete="off"
                              />
                              <label class="btn btn-sm" for="income-status-pending">
                                <i class="bi bi-clock-fill yellow-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check btn-sm"
                                :checked="filterProps.incomeStatus === 'CANCELLED'"
                                @change="setSharedIncomeStatus('CANCELLED')"
                                name="income-status-type"
                                id="income-status-cancelled"
                                autocomplete="off"
                              />
                              <label class="btn btn-sm" for="income-status-cancelled">
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
                                @change="
                                  e => {
                                    const newValue = e.target.checked;
                                    // Update filterProps first
                                    filterProps.fiscalNote = newValue;
                                    filterProps.checkFiscalNote(e);
                                    // Update filter instance
                                    if (incomesFilterRef.value) {
                                      incomesFilterRef.value.fiscalNote = newValue;
                                    }
                                    // Use the new value directly instead of filterProps
                                    nextTick(() => {
                                      refreshIncomesContentDelayed(getAllFilterValues(filterProps, { fiscalNote: newValue }));
                                    });
                                  }
                                "
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
                                @change="
                                  e => {
                                    const newValue = e.target.checked;
                                    // Update filterProps first
                                    filterProps.automatic = newValue;
                                    filterProps.checkAutomatic(e);
                                    // Update filter instance
                                    if (incomesFilterRef.value) {
                                      incomesFilterRef.value.automatic = newValue;
                                    }
                                    // Use the new value directly instead of filterProps
                                    nextTick(() => {
                                      refreshIncomesContentDelayed(getAllFilterValues(filterProps, { automatic: newValue }));
                                    });
                                  }
                                "
                              />
                              <label class="form-check-label">{{
                                $t('collaboratorBookingsView.automatic') || 'Automático'
                              }}</label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :checked="filterProps.commissionPaid"
                                @change="
                                  e => {
                                    const newValue = e.target.checked;
                                    // Update filterProps first
                                    filterProps.commissionPaid = newValue;
                                    if (filterProps.checkCommissionPaid) {
                                      filterProps.checkCommissionPaid(e);
                                    }
                                    // Update filter instance
                                    if (incomesFilterRef.value) {
                                      incomesFilterRef.value.commissionPaid = newValue;
                                    }
                                    // Use the new value directly instead of filterProps
                                    nextTick(() => {
                                      refreshIncomesContentDelayed(getAllFilterValues(filterProps, { commissionPaid: newValue }));
                                    });
                                  }
                                "
                              />
                              <label class="form-check-label">{{
                                $t('commissionPayments.commissionPaid') || 'Comisión Pagada'
                              }}</label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :checked="filterProps.asc"
                                @change="
                                  e => {
                                    const newValue = e.target.checked;
                                    // Update filterProps first
                                    filterProps.asc = newValue;
                                    filterProps.checkAsc(e);
                                    // Update filter instance
                                    if (incomesFilterRef.value) {
                                      incomesFilterRef.value.asc = newValue;
                                    }
                                    // Use the new value directly instead of filterProps
                                    nextTick(() => {
                                      refreshIncomesContentDelayed(getAllFilterValues(filterProps, { asc: newValue }));
                                    });
                                  }
                                "
                              />
                              <label class="form-check-label">{{
                                $t('dashboard.asc') || 'Ascendente'
                              }}</label>
                            </div>
                          </div>

                          <!-- Amount Range Filters -->
                          <div class="mb-3">
                            <label class="form-label fw-bold mb-2">{{
                              $t('businessFinancial.filters.amountRange') || 'Faixa de Valores'
                            }}</label>
                            <div class="row">
                              <div class="col-5">
                                <input
                                  type="number"
                                  class="form-control form-control-sm"
                                  :value="filterProps.minAmount"
                                  @input="
                                    e => {
                                      const newValue = e.target.value;
                                      filterProps.minAmount = newValue;
                                      if (incomesFilterRef.value) {
                                        incomesFilterRef.value.minAmount = newValue;
                                      }
                                    }
                                  "
                                  :placeholder="
                                    $t('businessFinancial.filters.minAmount') || 'Valor Mínimo'
                                  "
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                              <div class="col-5">
                                <input
                                  type="number"
                                  class="form-control form-control-sm"
                                  :value="filterProps.maxAmount"
                                  @input="
                                    e => {
                                      const newValue = e.target.value;
                                      filterProps.maxAmount = newValue;
                                      if (incomesFilterRef.value) {
                                        incomesFilterRef.value.maxAmount = newValue;
                                      }
                                    }
                                  "
                                  :placeholder="
                                    $t('businessFinancial.filters.maxAmount') || 'Valor Máximo'
                                  "
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                              <div class="col-2">
                                <button
                                  class="btn btn-sm btn-dark rounded-pill"
                                  @click="
                                    refreshIncomesContentDelayed(getAllFilterValues(filterProps))
                                  "
                                  :disabled="filterProps.loading"
                                >
                                  <i class="bi bi-search"></i>
                                </button>
                              </div>
                            </div>
                          </div>

                          <!-- Income Type and Payment Method Filters -->
                          <div class="mb-3">
                            <div class="row">
                              <div class="col-6">
                                <label class="form-label fw-bold mb-2">{{
                                  $t('businessFinancial.filters.incomeType') || 'Tipo de Receita'
                                }}</label>
                                <select
                                  class="form-select form-select-sm"
                                  :value="filterProps.incomeTypeFilter"
                                  @change="
                                    e => {
                                      // Handle undefined value correctly - empty string or 'undefined' string should be undefined
                                      let newValue = e.target.value;
                                      if (newValue === '' || newValue === 'undefined' || newValue === 'null') {
                                        newValue = undefined;
                                      }

                                      // Update filterProps first
                                      filterProps.incomeTypeFilter = newValue;

                                      // Update filter instance
                                      if (incomesFilterRef.value) {
                                        incomesFilterRef.value.incomeTypeFilter = newValue;
                                      }

                                      // Use the new value directly
                                      nextTick(() => {
                                        refreshIncomesContentDelayed(getAllFilterValues(filterProps, { incomeTypeFilter: newValue }));
                                      });
                                    }
                                  "
                                >
                                  <option :value="undefined">
                                    {{ $t('businessFinancial.filters.all') || 'Todos' }}
                                  </option>
                                  <option value="STANDARD">
                                    {{ $t('incomeTypes.STANDARD') || 'Recebemento Normal' }}
                                  </option>
                                  <option value="FUND_INCREASE">
                                    {{ $t('incomeTypes.FUND_INCREASE') || 'Aumento de Fundo' }}
                                  </option>
                                  <option value="UNIQUE">
                                    {{ $t('incomeTypes.UNIQUE') || 'Pagamento Único' }}
                                  </option>
                                  <option value="FIRST_PAYMENT">
                                    {{ $t('incomeTypes.FIRST_PAYMENT') || 'Primeiro Pagamento' }}
                                  </option>
                                  <option value="INSTALLMENT">
                                    {{ $t('incomeTypes.INSTALLMENT') || 'Parcelas' }}
                                  </option>
                                </select>
                              </div>
                              <div class="col-6">
                                <label class="form-label fw-bold mb-2">{{
                                  $t('businessFinancial.filters.paymentMethod') ||
                                  'Método de Pagamento'
                                }}</label>
                                <select
                                  class="form-select form-select-sm"
                                  :value="filterProps.paymentMethodFilter"
                                  @change="
                                    e => {
                                      // Handle undefined value correctly - empty string or 'undefined' string should be undefined
                                      let newValue = e.target.value;
                                      if (newValue === '' || newValue === 'undefined' || newValue === 'null') {
                                        newValue = undefined;
                                      }

                                      // Update filterProps first
                                      filterProps.paymentMethodFilter = newValue;

                                      // Update filter instance
                                      if (incomesFilterRef.value) {
                                        incomesFilterRef.value.paymentMethodFilter = newValue;
                                      }

                                      // Use the new value directly
                                      nextTick(() => {
                                        refreshIncomesContentDelayed(getAllFilterValues(filterProps, { paymentMethodFilter: newValue }));
                                      });
                                    }
                                  "
                                >
                                  <option :value="undefined">
                                    {{ $t('businessFinancial.filters.all') || 'Todos' }}
                                  </option>
                                  <option value="MONEY">
                                    {{ $t('paymentClientMethods.MONEY') || 'Dinheiro' }}
                                  </option>
                                  <option value="CREDIT_CARD">
                                    {{ $t('paymentClientMethods.CREDIT_CARD') || 'Cartão de Crédito' }}
                                  </option>
                                  <option value="DEBIT_CARD">
                                    {{ $t('paymentClientMethods.DEBIT_CARD') || 'Cartão de Débito' }}
                                  </option>
                                  <option value="WIRE_TRANSFER">
                                    {{ $t('paymentClientMethods.WIRE_TRANSFER') || 'Transferência Bancária' }}
                                  </option>
                                  <option value="PIX">
                                    {{ $t('paymentClientMethods.PIX') || 'Pix' }}
                                  </option>
                                  <option value="BOLETO">
                                    {{ $t('paymentClientMethods.BOLETO') || 'Boleto' }}
                                  </option>
                                  <option value="CHECK">
                                    {{ $t('paymentClientMethods.CHECK') || 'Cheque' }}
                                  </option>
                                  <option value="HEALTH_AGREEMENT">
                                    {{ $t('paymentClientMethods.HEALTH_AGREEMENT') || 'Convenio Saúde' }}
                                  </option>
                                  <option value="OTHER">
                                    {{ $t('paymentClientMethods.OTHER') || 'Outro' }}
                                  </option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <!-- Professional Filter -->
                          <div class="mb-3">
                            <label class="form-label fw-bold mb-2"
                              >{{
                                $t('businessFinancial.filters.professional') || 'Profissional'
                              }}
                              ({{ filterProps.professionals?.length || 0 }})</label
                            >
                            <select
                              class="form-select form-select-sm"
                              :value="filterProps.professionalFilter === undefined ? '' : filterProps.professionalFilter"
                              @change="
                                e => {
                                  const selectedValue = e.target.value;
                                  // Convert empty string to undefined for API consistency
                                  const newValue = selectedValue === '' ? undefined : selectedValue;
                                  console.log('[BusinessFinancial Desktop] Selected value:', selectedValue);
                                  console.log('[BusinessFinancial Desktop] Setting to:', newValue);

                                  // Update filter instance directly
                                  if (filterProps.setProfessionalFilter) {
                                    filterProps.setProfessionalFilter(newValue);
                                  } else {
                                    filterProps.professionalFilter = newValue;
                                  }

                                  // Also update the filter instance directly
                                  if (incomesFilterRef.value) {
                                    incomesFilterRef.value.professionalFilter = newValue;
                                  }

                                  // Sync to content instance using the refresh function
                                  refreshIncomesContentDelayed({
                                    professionalFilter: newValue,
                                    startDate: filterProps.startDate,
                                    endDate: filterProps.endDate,
                                    searchText: filterProps.searchText,
                                    incomeStatus: filterProps.incomeStatus,
                                    fiscalNote: filterProps.fiscalNote,
                                    automatic: filterProps.automatic,
                                    asc: filterProps.asc,
                                    minAmount: filterProps.minAmount,
                                    maxAmount: filterProps.maxAmount,
                                    incomeTypeFilter: filterProps.incomeTypeFilter,
                                    paymentMethodFilter: filterProps.paymentMethodFilter,
                                  });
                                }
                              "
                              :disabled="
                                !filterProps.professionals || filterProps.professionals.length === 0
                              "
                            >
                              <option value="">
                                {{ $t('businessFinancial.filters.all') || 'Todos' }}
                              </option>
                              <option
                                v-for="professional in filterProps.professionals || []"
                                :key="professional.id"
                                :value="professional.id"
                              >
                                {{ professional.personalInfo?.name || professional.name || '-' }}
                              </option>
                            </select>
                          </div>

                          <!-- Clear button -->
                          <div class="mb-3 mt-3">
                            <button
                              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100"
                              @click="
                                async () => {
                                  // Call clear() method which resets all filters in the component
                                  await filterProps.clear();

                                  // Wait for nextTick to ensure all values are updated
                                  await nextTick();

                                  if (incomesFilterRef.value) {
                                    // Explicitly sync ALL cleared values to filter instance
                                    // This ensures both filter and content instances are in sync
                                    incomesFilterRef.value.startDate = undefined;
                                    incomesFilterRef.value.endDate = undefined;
                                    incomesFilterRef.value.searchText = undefined;
                                    incomesFilterRef.value.incomeStatus = undefined;
                                    incomesFilterRef.value.fiscalNote = undefined;
                                    incomesFilterRef.value.automatic = undefined;
                                    incomesFilterRef.value.asc = false; // Default to false
                                    incomesFilterRef.value.minAmount = undefined;
                                    incomesFilterRef.value.maxAmount = undefined;
                                    incomesFilterRef.value.incomeTypeFilter = undefined;
                                    incomesFilterRef.value.paymentMethodFilter = undefined;
                                    incomesFilterRef.value.professionalFilter = undefined;

                                    // Also update filterProps to ensure consistency
                                    filterProps.startDate = undefined;
                                    filterProps.endDate = undefined;
                                    filterProps.searchText = undefined;
                                    filterProps.incomeStatus = undefined;
                                    filterProps.fiscalNote = undefined;
                                    filterProps.automatic = undefined;
                                    filterProps.asc = false;
                                    filterProps.minAmount = undefined;
                                    filterProps.maxAmount = undefined;
                                    filterProps.incomeTypeFilter = undefined;
                                    filterProps.paymentMethodFilter = undefined;
                                    filterProps.professionalFilter = undefined;
                                  }

                                  // Refresh content with all cleared values
                                  await nextTick();
                                  refreshIncomesContentDelayed({
                                    startDate: undefined,
                                    endDate: undefined,
                                    searchText: undefined,
                                    incomeStatus: undefined,
                                    fiscalNote: undefined,
                                    automatic: undefined,
                                    asc: false,
                                    minAmount: undefined,
                                    maxAmount: undefined,
                                    incomeTypeFilter: undefined,
                                    paymentMethodFilter: undefined,
                                    professionalFilter: undefined,
                                  });
                                }
                              "
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
                      ref="outcomesFilterRef"
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
                                  nextTick(() => {
                                    if (outcomesFilterRef.value) {
                                      outcomesFilterRef.value.startDate = filterProps.startDate;
                                      outcomesFilterRef.value.endDate = filterProps.endDate;
                                    }
                                    refreshOutcomesContentDelayed(getAllOutcomesFilterValues(filterProps));
                                  });
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
                                  nextTick(() => {
                                    if (outcomesFilterRef.value) {
                                      outcomesFilterRef.value.startDate = filterProps.startDate;
                                      outcomesFilterRef.value.endDate = filterProps.endDate;
                                    }
                                    refreshOutcomesContentDelayed(getAllOutcomesFilterValues(filterProps));
                                  });
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
                                  nextTick(() => {
                                    if (outcomesFilterRef.value) {
                                      outcomesFilterRef.value.startDate = filterProps.startDate;
                                      outcomesFilterRef.value.endDate = filterProps.endDate;
                                    }
                                    refreshOutcomesContentDelayed(getAllOutcomesFilterValues(filterProps));
                                  });
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
                                  nextTick(() => {
                                    if (outcomesFilterRef.value) {
                                      outcomesFilterRef.value.startDate = filterProps.startDate;
                                      outcomesFilterRef.value.endDate = filterProps.endDate;
                                    }
                                    refreshOutcomesContentDelayed(getAllOutcomesFilterValues(filterProps));
                                  });
                                "
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
                                if (outcomesFilterRef.value) {
                                  outcomesFilterRef.value.startDate = val;
                                }
                              }
                            "
                            @update:endDate="
                              val => {
                                filterProps.endDate = val;
                                if (outcomesFilterRef.value) {
                                  outcomesFilterRef.value.endDate = val;
                                }
                              }
                            "
                            @search="
                              refreshOutcomesContentDelayed(getAllOutcomesFilterValues(filterProps))
                            "
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
                                    const newValue = e.target.value;
                                    filterProps.searchText = newValue;
                                    if (outcomesFilterRef.value) {
                                      outcomesFilterRef.value.searchText = newValue;
                                    }
                                  }
                                "
                                :placeholder="$t('dashboard.search')"
                              />
                              <button
                                class="btn btn-sm btn-dark rounded-pill"
                                @click="
                                  refreshOutcomesContentDelayed(getAllOutcomesFilterValues(filterProps))
                                "
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
                                @change="
                                  e => {
                                    const newValue = e.target.checked;
                                    filterProps.asc = newValue;
                                    filterProps.checkAsc(e);
                                    if (outcomesFilterRef.value) {
                                      outcomesFilterRef.value.asc = newValue;
                                    }
                                    nextTick(() => {
                                      refreshOutcomesContentDelayed(getAllOutcomesFilterValues(filterProps, { asc: newValue }));
                                    });
                                  }
                                "
                              />
                              <label class="form-check-label">{{
                                $t('dashboard.asc') || 'Ascendente'
                              }}</label>
                            </div>
                          </div>

                          <!-- Amount Range Filters -->
                          <div class="mb-3">
                            <label class="form-label fw-bold mb-2">{{
                              $t('businessFinancial.filters.amountRange') || 'Faixa de Valores'
                            }}</label>
                            <div class="row">
                              <div class="col-5">
                                <input
                                  type="number"
                                  class="form-control form-control-sm"
                                  :value="filterProps.minAmount"
                                  @input="
                                    e => {
                                      const newValue = e.target.value;
                                      filterProps.minAmount = newValue;
                                      if (outcomesFilterRef.value) {
                                        outcomesFilterRef.value.minAmount = newValue;
                                      }
                                    }
                                  "
                                  :placeholder="
                                    $t('businessFinancial.filters.minAmount') || 'Valor Mínimo'
                                  "
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                              <div class="col-5">
                                <input
                                  type="number"
                                  class="form-control form-control-sm"
                                  :value="filterProps.maxAmount"
                                  @input="
                                    e => {
                                      const newValue = e.target.value;
                                      filterProps.maxAmount = newValue;
                                      if (outcomesFilterRef.value) {
                                        outcomesFilterRef.value.maxAmount = newValue;
                                      }
                                    }
                                  "
                                  :placeholder="
                                    $t('businessFinancial.filters.maxAmount') || 'Valor Máximo'
                                  "
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                              <div class="col-2">
                                <button
                                  class="btn btn-sm btn-dark rounded-pill"
                                  @click="
                                    refreshOutcomesContentDelayed(getAllOutcomesFilterValues(filterProps))
                                  "
                                  :disabled="filterProps.loading"
                                >
                                  <i class="bi bi-search"></i>
                                </button>
                              </div>
                            </div>
                          </div>

                          <!-- Outcome System Type Filter -->
                          <div class="mb-3">
                            <label class="form-label fw-bold mb-2">{{
                              $t('businessFinancial.filters.outcomeSystemType') || 'Tipo de Despesa'
                            }}</label>
                            <select
                              class="form-control form-select"
                              :value="filterProps.outcomeSystemTypeFilter === undefined ? '' : filterProps.outcomeSystemTypeFilter"
                              @change="
                                e => {
                                  const selectedValue = e.target.value;
                                  const newValue = selectedValue === '' || selectedValue === 'undefined' || selectedValue === 'null' ? undefined : selectedValue;

                                  filterProps.outcomeSystemTypeFilter = newValue;

                                  if (outcomesFilterRef.value) {
                                    outcomesFilterRef.value.outcomeSystemTypeFilter = newValue;
                                  }

                                  nextTick(() => {
                                    refreshOutcomesContentDelayed(getAllOutcomesFilterValues(filterProps, { outcomeSystemTypeFilter: newValue }));
                                  });
                                }
                              "
                            >
                              <option :value="undefined">
                                {{ $t('businessFinancial.filters.all') }}
                              </option>
                              <option value="PROFESSIONAL_COMMISSION">
                                {{ $t('outcomeTypes.PROFESSIONAL_COMMISSION') || 'Comissão Profissional' }}
                              </option>
                              <option value="PRODUCT">
                                {{ $t('outcomeTypes.PRODUCT') || 'Produto' }}
                              </option>
                              <option value="SERVICE">
                                {{ $t('outcomeTypes.SERVICE') || 'Serviço' }}
                              </option>
                              <option value="OTHER">
                                {{ $t('outcomeTypes.OTHER') || 'Outro' }}
                              </option>
                            </select>
                          </div>

                          <!-- Professional Filter for Outcomes -->
                          <div class="mb-3" v-if="filterProps.professionals && filterProps.professionals.length > 0">
                            <label class="form-label fw-bold mb-2">{{
                              $t('businessFinancial.filters.professional') || 'Profissional'
                            }}
                            ({{ filterProps.professionals?.length || 0 }})</label>
                            <select
                              class="form-control form-select"
                              :value="filterProps.professionalFilter === undefined ? '' : filterProps.professionalFilter"
                              @change="
                                e => {
                                  const selectedValue = e.target.value;
                                  const newValue = selectedValue === '' ? undefined : selectedValue;

                                  filterProps.professionalFilter = newValue;

                                  if (outcomesFilterRef.value) {
                                    outcomesFilterRef.value.professionalFilter = newValue;
                                  }

                                  nextTick(() => {
                                    refreshOutcomesContentDelayed(getAllOutcomesFilterValues(filterProps, { professionalFilter: newValue }));
                                  });
                                }
                              "
                              :disabled="!filterProps.professionals || filterProps.professionals.length === 0"
                            >
                              <option :value="undefined">
                                {{ $t('businessFinancial.filters.all') }}
                              </option>
                              <option
                                v-for="professional in (filterProps.professionals || [])"
                                :key="professional.id"
                                :value="professional.id"
                              >
                                {{ professional.personalInfo?.name || professional.name || '-' }}
                              </option>
                            </select>
                          </div>

                          <!-- Clear button -->
                          <div class="mb-3 mt-3">
                            <button
                              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100"
                              @click="
                                async () => {
                                  await filterProps.clear();
                                  await nextTick();
                                  if (outcomesFilterRef.value) {
                                    outcomesFilterRef.value.startDate = undefined;
                                    outcomesFilterRef.value.endDate = undefined;
                                    outcomesFilterRef.value.searchText = undefined;
                                    outcomesFilterRef.value.asc = true;
                                    outcomesFilterRef.value.minAmount = undefined;
                                    outcomesFilterRef.value.maxAmount = undefined;
                                    outcomesFilterRef.value.outcomeSystemTypeFilter = undefined;
                                    outcomesFilterRef.value.professionalFilter = undefined;
                                    filterProps.startDate = undefined;
                                    filterProps.endDate = undefined;
                                    filterProps.searchText = undefined;
                                    filterProps.asc = true;
                                    filterProps.minAmount = undefined;
                                    filterProps.maxAmount = undefined;
                                    filterProps.outcomeSystemTypeFilter = undefined;
                                    filterProps.professionalFilter = undefined;
                                  }
                                  await nextTick();
                                  refreshOutcomesContentDelayed({
                                    startDate: undefined,
                                    endDate: undefined,
                                    searchText: undefined,
                                    asc: true,
                                    minAmount: undefined,
                                    maxAmount: undefined,
                                    outcomeSystemTypeFilter: undefined,
                                    professionalFilter: undefined,
                                  });
                                }
                              "
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
                  <div class="col-4 centered">
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
                  <div class="col-4 centered">
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
                  ref="resumeContentRef"
                >
                </ResumeFinancialManagement>
                <IncomesFinancialManagement
                  :show-incomes-financial-management="state.showIncomes"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
                  :business="state.business"
                  :shared-filters="state.sharedIncomeFilters"
                  filters-location="slot"
                  ref="incomesContentRef"
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
                  ref="outcomesContentRef"
                  @open-commission-payments="() => (state.showCommissionPaymentsModal = true)"
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

    <!-- Commission Payments Modal -->
    <div
      v-if="state.showCommissionPaymentsModal"
      class="modal fade show d-block"
      tabindex="-1"
      style="background-color: rgba(0, 0, 0, 0.5)"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-cash-coin"></i> {{ $t('commissionPayments.title') }}
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeCommissionPaymentsModal()"
            ></button>
          </div>
          <div class="modal-body text-center mb-0">
            <CommissionPaymentsManagement
              :commerce="commerce"
              :business="state.business"
              :toggles="state.toggles"
              @view-outcome="handleViewOutcome"
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
