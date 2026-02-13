<script>
import { ref, reactive, onBeforeMount, nextTick, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
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
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
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

    // Refs to access child component instances
    const clientsFilterRef = ref(null);
    const clientsContentRef = ref(null);
    const attentionsFilterRef = ref(null);
    const attentionsContentRef = ref(null);
    const bookingsFilterRef = ref(null);
    const bookingsContentRef = ref(null);
    const surveysFilterRef = ref(null);
    const surveysContentRef = ref(null);

    // Refs for timeout management
    const timeoutRefClients = ref(null);
    const timeoutRefAttentions = ref(null);
    const timeoutRefBookings = ref(null);
    const timeoutRefSurveys = ref(null);

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
      queues: ref([]),
      services: ref([]),
      queue: {},
      dateType: 'month',
      showClients: true,
      showAttentions: false,
      showSurveyManagement: false,
      attentionsSubsection: 'attentions', // attentions or bookings
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
      allCommerces: ref([]),
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    // Compute selectedCommerces - use all commerces for Tracing components
    const selectedCommerces = computed(() => {
      if (state.allCommerces && state.allCommerces.length > 0) {
        return state.allCommerces;
      }
      return [];
    });

    // Load queues from commerce object (already available in store, no need to fetch)
    const loadCommerceQueues = commerce => {
      if (!commerce) {
        state.queues = [];
        return;
      }
      // Use queues from commerce object if available
      if (commerce.queues && Array.isArray(commerce.queues)) {
        state.queues = commerce.queues;
      } else {
        state.queues = [];
      }
    };

    // Lazy load services only when needed (e.g., when attentions/clients tab is shown)
    const loadServices = async commerceId => {
      if (!commerceId) {
        state.services = [];
        return;
      }
      // Only load if not already loaded
      if (state.services && state.services.length > 0) {
        return;
      }
      try {
        state.services = await getServiceByCommerce(commerceId);
      } catch (error) {
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
            state.attentions = [];
            state.filtered = [];
            // Load queues from commerce object (no API call needed)
            loadCommerceQueues(newCommerce);
            // Clear services, they will be loaded lazily when needed
            state.services = [];
            loading.value = false;
          } catch (error) {
            loading.value = false;
          }
        }
      },
      { immediate: false }
    );

    // Handler to sync filter instance when content instance tab changes
    const handleAttentionsTabChanged = event => {
      if (attentionsFilterRef.value && event.type) {
        if (event.type === 'attentions') {
          attentionsFilterRef.value.showAttentionsResults = true;
          attentionsFilterRef.value.showBookingsResults = false;
        } else if (event.type === 'bookings') {
          attentionsFilterRef.value.showAttentionsResults = false;
          attentionsFilterRef.value.showBookingsResults = true;
        }
      }
    };

    onBeforeMount(async () => {
      try {
        loading.value = true;
        // Parallelize independent calls
        const [currentUser, business, toggles] = await Promise.all([
          store.getCurrentUser,
          store.getActualBusiness(),
          getPermissions('dashboard'),
        ]);

        state.currentUser = currentUser;
        state.business = business;
        state.toggles = toggles;

        // Load commerces after business is loaded
        state.allCommerces = await store.getAvailableCommerces(state.business.commerces);

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          if (state.allCommerces && state.allCommerces.length > 0) {
            await store.setCurrentCommerce(state.allCommerces[0]);
          }
        }

        // Load queues from current commerce (no API call needed)
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse) {
          loadCommerceQueues(commerceToUse);
          // Services will be loaded lazily when needed (when attentions/clients tab is shown)
        }

        loading.value = false;
        activateTabFromHash();
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

    const formatDateDisplay = (dateStr) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateStr;
    };

    const currentMainTitle = computed(() => {
      if (state.showClients) return 'dashboard.clients';
      if (state.showAttentions) return 'dashboard.attentions';
      if (state.showSurveyManagement) return 'dashboard.satisfaction';
      return '';
    });

    const currentSubsection = computed(() => {
      if (state.showAttentions && state.attentionsSubsection === 'attentions') {
        return 'dashboard.attentions';
      }
      if (state.showAttentions && state.attentionsSubsection === 'bookings') {
        return 'dashboard.bookings';
      }
      return null;
    });

    const handleAttentionsSubsectionChanged = (subsection) => {
      state.attentionsSubsection = subsection;
    };

    const activateTabFromHash = () => {
      const hash = window.location.hash.replace('#', '');
      switch (hash) {
        case 'clientes':
        case 'clients':
        case 'customers':
          showClients();
          break;
        case 'atenciones':
        case 'attentions':
        case 'atendimentos':
          showAttentions();
          break;
        case 'pesquisas':
        case 'encuestas':
        case 'surveys':
        case 'satisfaccion':
        case 'satisfaction':
          showSurveys();
          break;
        default:
          break;
      }
    };

    const goBack = () => {
      router.back();
    };

    const showClients = async () => {
      state.showClients = true;
      (state.showAttentions = false), (state.showSurveyManagement = false);
      window.location.hash = 'clientes';
      // Lazy load services when clients tab is shown
      if (commerce.value && commerce.value.id) {
        await loadServices(commerce.value.id);
      }
    };

    const showSurveys = () => {
      state.showClients = false;
      (state.showAttentions = false), (state.showSurveyManagement = true);
      window.location.hash = 'pesquisas';
      // Set default date range: one month ago to today
      nextTick(() => {
        const today = new Date().toISOString().slice(0, 10);
        const oneMonthAgo = new DateModel(today).substractMonths(1).toString();

        // Set dates in filter instance (the one that exposes filters to the slot)
        if (surveysFilterRef.value) {
          const filterInstance = surveysFilterRef.value;
          filterInstance.startDate = oneMonthAgo;
          filterInstance.endDate = today;
        }

        // Set dates in content instance as well
        if (surveysContentRef.value) {
          const contentInstance = surveysContentRef.value;
          contentInstance.startDate = oneMonthAgo;
          contentInstance.endDate = today;
        }

        // Refresh with default dates
        refreshSurveysContent();
      });
    };

    const showAttentions = async () => {
      state.showClients = false;
      (state.showAttentions = true), (state.showSurveyManagement = false);
      window.location.hash = 'atenciones';
      // Lazy load services when attentions tab is shown
      if (commerce.value && commerce.value.id) {
        await loadServices(commerce.value.id);
      }
      // Set default date range: one month ago to today
      nextTick(() => {
        const today = new Date().toISOString().slice(0, 10);
        const oneMonthAgo = new DateModel(today).substractMonths(1).toString();

        // Set dates in filter instance (the one that exposes filters to the slot)
        if (attentionsFilterRef.value) {
          const filterWrapper = attentionsFilterRef.value;
          // The filter instance is the DashboardAttentionsManagement component
          // We need to find it within the wrapper
          nextTick(() => {
            if (filterWrapper.$children && filterWrapper.$children.length > 0) {
              const filterInstance = filterWrapper.$children.find(child => {
                const name = child.$options?.name || child.$options?.__name;
                return name === 'DashboardAttentionsManagement' && child.filtersLocation === 'slot';
              });
              if (filterInstance) {
                filterInstance.startDate = oneMonthAgo;
                filterInstance.endDate = today;
              }
            }
          });
        }

        // Set dates in content instance
        if (attentionsContentRef.value) {
          const contentWrapper = attentionsContentRef.value;
          const contentInstance = contentWrapper.$refs?.attentionsManagement;
          if (contentInstance) {
            contentInstance.startDate = oneMonthAgo;
            contentInstance.endDate = today;
          }
        }

        // Refresh with default dates
        refreshAttentionsContentDelayed({ startDate: oneMonthAgo, endDate: today }, 100);
      });
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

    // Helper functions for quick date buttons
    const handleQuickDateSelect = (type, filterProps, contentType = 'clients') => {
      try {
        if (!filterProps) {
          console.warn('handleQuickDateSelect: filterProps is undefined', { type, contentType });
          return;
        }

        const today = new Date().toISOString().slice(0, 10);
        let startDate, endDate;

        if (type === 'today') {
          const [year, month, day] = today.split('-');
          startDate = `${year}-${month}-${day}`;
          endDate = `${year}-${month}-${day}`;
        } else if (type === 'currentMonth') {
          const [year, month, day] = today.split('-');
          startDate = `${year}-${month}-01`;
          endDate = `${year}-${month}-${day}`;
        } else if (type === 'lastMonth') {
          startDate = new DateModel(today).substractMonths(1).startOfMonth().toString();
          endDate = new DateModel(today).substractMonths(1).endOfMonth().toString();
        } else if (type === 'lastThreeMonths') {
          startDate = new DateModel(today).substractMonths(3).startOfMonth().toString();
          endDate = new DateModel(today).substractMonths(1).endOfMonth().toString();
        } else {
          console.warn('handleQuickDateSelect: Unknown type', type);
          return;
        }

        // Update filterProps dates
        if (filterProps.setStartDate) {
          filterProps.setStartDate(startDate);
        } else if (filterProps) {
          filterProps.startDate = startDate;
        }
        if (filterProps.setEndDate) {
          filterProps.setEndDate(endDate);
        } else if (filterProps) {
          filterProps.endDate = endDate;
        }

        // Update filter instance directly based on content type
        if (contentType === 'clients') {
          if (clientsFilterRef.value) {
            clientsFilterRef.value.startDate = startDate;
            clientsFilterRef.value.endDate = endDate;
          }
          refreshClientsContentDelayed({ startDate, endDate });
        } else if (contentType === 'surveys') {
          if (surveysFilterRef.value) {
            surveysFilterRef.value.startDate = startDate;
            surveysFilterRef.value.endDate = endDate;
          }
          refreshSurveysContent({ startDate, endDate });
        }
      } catch (error) {
        console.error('Error in handleQuickDateSelect:', error);
      }
    };

    const handleCommerceChanged = async commerce => {
      // Commerce is now managed globally
      if (commerce && commerce.id && commerce.id !== 'ALL') {
        await store.setCurrentCommerce(commerce);
      }
    };

    // Wrapper function to refresh content instance when filters change - following ProductsStockManagement pattern
    // CRITICAL: This function must sync ALL filter values exactly as they are in filterInstance
    // to ensure mobile and desktop produce identical results
    const refreshClientsContent = (filterPropsOverride = null) => {
      // Use nextTick to ensure filter instance values are updated
      nextTick(() => {
        nextTick(() => {
          if (clientsFilterRef.value && clientsContentRef.value) {
            const filterInstance = clientsFilterRef.value;
            const contentInstance = clientsContentRef.value;

            if (!filterInstance || !contentInstance) {
              return;
            }

            // Clear previous data immediately
            contentInstance.clients = [];
            contentInstance.counter = 0;
            contentInstance.totalPages = 0;

            // Set flag to skip watch during manual sync
            contentInstance._skipWatch = true;

            // Sync all filter properties - read from filterPropsOverride if provided, otherwise from filterInstance
            contentInstance.page = 1;

            // Helper function to get value - prioritize override, then filterInstance, then undefined
            // CRITICAL: Must handle undefined, null, empty string, and false values correctly
            const getValue = key => {
              // If override is provided and has the key (even if value is undefined/null), use it
              if (filterPropsOverride && key in filterPropsOverride) {
                return filterPropsOverride[key];
              }
              // Otherwise, get from filterInstance (which may be undefined)
              return filterInstance[key];
            };

            // Helper to normalize string values (empty string -> undefined, trim whitespace)
            const normalizeString = value => {
              if (value === null || value === undefined) return undefined;
              const str = String(value).trim();
              return str === '' ? undefined : str;
            };

            // Sync all filter values - EXACTLY as they are in filterInstance
            // This ensures mobile and desktop use identical filter values
            contentInstance.daysSinceType = getValue('daysSinceType');
            contentInstance.daysSinceContacted = getValue('daysSinceContacted');
            contentInstance.contactResultType = getValue('contactResultType');
            contentInstance.contactable = getValue('contactable');
            contentInstance.contacted = getValue('contacted');
            contentInstance.survey = getValue('survey');
            // For asc, default to true if undefined (matching mobile behavior)
            const ascValue = getValue('asc');
            contentInstance.asc = ascValue !== undefined ? ascValue : true;

            // Normalize searchText - empty string becomes undefined (matching mobile behavior)
            const searchTextValue = getValue('searchText');
            contentInstance.searchText = normalizeString(searchTextValue);

            // Normalize queueId and serviceId - empty string becomes undefined
            const queueIdValue = getValue('queueId');
            contentInstance.queueId = normalizeString(queueIdValue);

            const serviceIdValue = getValue('serviceId');
            contentInstance.serviceId = normalizeString(serviceIdValue);

            // Sync date filters - normalize to YYYY-MM-DD format or undefined
            const startDateValue = getValue('startDate');
            contentInstance.startDate = normalizeString(startDateValue);

            const endDateValue = getValue('endDate');
            contentInstance.endDate = normalizeString(endDateValue);

            // Sync client-specific filters
            contentInstance.pendingControls = getValue('pendingControls');
            contentInstance.pendingBookings = getValue('pendingBookings');
            contentInstance.firstAttentionForm = getValue('firstAttentionForm');
            contentInstance.ratingType = getValue('ratingType');
            contentInstance.npsType = getValue('npsType');

            // Clear skip flag and refresh
            contentInstance._skipWatch = false;

            // Force Vue to update the reactive properties
            nextTick(() => {
              nextTick(() => {
                if (contentInstance && contentInstance.refresh) {
                  contentInstance.refresh(1);
                }
              });
            });
          }
        });
      });
    };

    const refreshAttentionsContent = (filterPropsOverride = null) => {
      // Use nextTick to ensure filter instance values are updated
      nextTick(() => {
        nextTick(() => {
          if (attentionsFilterRef.value && attentionsContentRef.value) {
            // Get the wrapper instance (DashboardAttentionsAndBookingsManagement)
            const wrapperInstance = attentionsContentRef.value;

            // Access the content instance (DashboardAttentionsManagement that shows results)
            const contentInstance = wrapperInstance.$refs?.attentionsManagement;

            // Get the filter instance (DashboardAttentionsManagement that exposes filters)
            // This is a different instance from contentInstance - it's the one with filtersLocation='slot'
            let filterInstance = null;

            // The filter instance is in attentionsFilterRef.value, which is also a DashboardAttentionsAndBookingsManagement
            // but it contains the filter-exposing DashboardAttentionsManagement instance
            const filterWrapper = attentionsFilterRef.value;
            if (filterWrapper && filterWrapper.$children && filterWrapper.$children.length > 0) {
              // Find the DashboardAttentionsManagement with filtersLocation='slot'
              filterInstance = filterWrapper.$children.find(child => {
                const name = child.$options?.name || child.$options?.__name;
                return name === 'DashboardAttentionsManagement' && child.filtersLocation === 'slot';
              });
            }

            // Fallback: if we can't find the filter instance, use contentInstance
            if (!filterInstance) {
              filterInstance = contentInstance;
            }

            if (!contentInstance) {
              return;
            }

            // Clear previous data immediately
            contentInstance.attentions = [];
            contentInstance.counter = 0;
            contentInstance.totalPages = 0;

            // Set flag to skip watch during manual sync
            contentInstance._skipWatch = true;

            // Sync all filter properties - read from filterPropsOverride if provided, otherwise from filterInstance
            contentInstance.page = 1;

            // Helper function to get value - prioritize override, then filterInstance, then undefined
            // CRITICAL: Must handle undefined, null, empty string, and false values correctly
            const getValue = key => {
              // If override is provided and has the key (even if value is undefined/null), use it
              if (filterPropsOverride && key in filterPropsOverride) {
                return filterPropsOverride[key];
              }
              // Otherwise, get from filterInstance (which may be undefined)
              return filterInstance ? filterInstance[key] : undefined;
            };

            // Helper to normalize string values (empty string -> undefined, trim whitespace)
            const normalizeString = value => {
              if (value === null || value === undefined) return undefined;
              const str = String(value).trim();
              return str === '' ? undefined : str;
            };

            // Sync all filter values - EXACTLY as they are in filterInstance
            // This ensures mobile and desktop use identical filter values
            contentInstance.daysSinceType = getValue('daysSinceType');
            contentInstance.daysSinceContacted = getValue('daysSinceContacted');
            contentInstance.contactResultType = getValue('contactResultType');

            // Handle boolean values correctly: false is a valid value, only undefined should be treated as undefined
            if (filterPropsOverride !== null && filterPropsOverride !== undefined) {
              if (Object.prototype.hasOwnProperty.call(filterPropsOverride, 'contactable')) {
                contentInstance.contactable = filterPropsOverride.contactable;
              } else if (filterInstance) {
                contentInstance.contactable = filterInstance.contactable;
              } else {
                contentInstance.contactable = undefined;
              }

              if (Object.prototype.hasOwnProperty.call(filterPropsOverride, 'contacted')) {
                contentInstance.contacted = filterPropsOverride.contacted;
              } else if (filterInstance) {
                contentInstance.contacted = filterInstance.contacted;
              } else {
                contentInstance.contacted = undefined;
              }

              if (Object.prototype.hasOwnProperty.call(filterPropsOverride, 'survey')) {
                contentInstance.survey = filterPropsOverride.survey;
              } else if (filterInstance) {
                contentInstance.survey = filterInstance.survey;
              } else {
                contentInstance.survey = undefined;
              }

              if (Object.prototype.hasOwnProperty.call(filterPropsOverride, 'asc')) {
                contentInstance.asc = filterPropsOverride.asc;
              } else if (filterInstance && filterInstance.asc !== undefined) {
                contentInstance.asc = filterInstance.asc;
              } else {
                contentInstance.asc = false;
              }
            } else {
              contentInstance.contactable = filterInstance ? filterInstance.contactable : undefined;
              contentInstance.contacted = filterInstance ? filterInstance.contacted : undefined;
              contentInstance.survey = filterInstance ? filterInstance.survey : undefined;
              contentInstance.asc =
                filterInstance && filterInstance.asc !== undefined ? filterInstance.asc : false;
            }

            // Normalize searchText - empty string becomes undefined (matching mobile behavior)
            const searchTextValue = getValue('searchText');
            contentInstance.searchText = normalizeString(searchTextValue);

            // Normalize queueId and serviceId - empty string becomes undefined
            const queueIdValue = getValue('queueId');
            contentInstance.queueId = normalizeString(queueIdValue);

            const serviceIdValue = getValue('serviceId');
            contentInstance.serviceId = normalizeString(serviceIdValue);

            // Sync date filters - normalize to YYYY-MM-DD format or undefined
            const startDateValue = getValue('startDate');
            contentInstance.startDate = normalizeString(startDateValue);

            const endDateValue = getValue('endDate');
            contentInstance.endDate = normalizeString(endDateValue);

            // Clear skip flag and refresh
            contentInstance._skipWatch = false;

            nextTick(() => {
              nextTick(() => {
                if (contentInstance && contentInstance.refresh) {
                  contentInstance.refresh(1);
                }
              });
            });
          }
        });
      });
    };

    // Helper function to set skipWatch flag on bookings content instance
    const setBookingsSkipWatch = (value = true) => {
      if (attentionsContentRef.value && attentionsContentRef.value.$refs) {
        const contentWrapper = attentionsContentRef.value.$refs.attentionsAndBookingsManagement;
        if (contentWrapper && contentWrapper.$refs) {
          const contentInstance = contentWrapper.$refs.bookingsManagement;
          if (contentInstance) {
            contentInstance._skipWatch = value;
          }
        }
      }
    };

    const refreshBookingsContent = (filterPropsOverride = null) => {
      // Use nextTick to ensure filter instance values are updated
      nextTick(() => {
        nextTick(() => {
          if (attentionsFilterRef.value && attentionsContentRef.value) {
            // Get the wrapper instance (DashboardAttentionsAndBookingsManagement)
            const filterWrapper = attentionsFilterRef.value;
            const contentWrapper = attentionsContentRef.value;

            // CRITICAL: Set the refreshing flag IMMEDIATELY after getting the wrapper to prevent watchers from resetting states
            // This must be done BEFORE accessing any properties that might trigger template re-evaluation
            if (contentWrapper._isRefreshing === undefined) {
              contentWrapper._isRefreshing = false;
            }
            // Use Vue.set or direct assignment to ensure reactivity
            contentWrapper._isRefreshing = true;

            // CRITICAL: Force update to ensure the flag is set before any template re-evaluation
            contentWrapper.$forceUpdate();

            // CRITICAL: Verify that bookings tab is active BEFORE doing anything

            // CRITICAL: If bookings is not active, don't refresh - this prevents state resets
            if (!contentWrapper.showBookingsResults) {
              contentWrapper._isRefreshing = false;
              return;
            }

            // CRITICAL: Ensure states are correct before proceeding
            if (contentWrapper.showAttentionsResults) {
              contentWrapper.showAttentionsResults = false;
              contentWrapper.showBookingsResults = true;
              // Force update to ensure the change is reflected
              contentWrapper.$forceUpdate();
            }

            // CRITICAL: Double-check states are still correct before continuing
            if (!contentWrapper.showBookingsResults || contentWrapper.showAttentionsResults) {
              contentWrapper._isRefreshing = false;
              return;
            }

            // Access the content instance (DashboardBookingsManagement that shows results)
            // IMPORTANT: Make sure we're getting the bookingsManagement ref, not attentionsManagement
            // The contentWrapper is DashboardAttentionsAndBookingsManagement, which has both
            // attentionsManagement and bookingsManagement refs
            let contentInstance = null;

            // First, try to get bookingsManagement ref directly
            if (contentWrapper.$refs && contentWrapper.$refs.bookingsManagement) {
              contentInstance = contentWrapper.$refs.bookingsManagement;
            }

            // If refs are not available or didn't work, try to find it in $children
            if (
              !contentInstance &&
              contentWrapper.$children &&
              contentWrapper.$children.length > 0
            ) {
              contentInstance = contentWrapper.$children.find(child => {
                const name = child.$options?.name || child.$options?.__name;
                // Find DashboardBookingsManagement that is showing (not the one with filtersLocation='slot')
                return (
                  name === 'DashboardBookingsManagement' && child.showBookingsManagement === true
                );
              });
            }

            // Verify that contentInstance is actually a DashboardBookingsManagement component
            if (contentInstance) {
              const componentName =
                contentInstance.$options?.name || contentInstance.$options?.__name;
              if (componentName !== 'DashboardBookingsManagement') {
                return;
              }
            }

            // Get the filter instance (DashboardBookingsManagement that exposes filters)
            let filterInstance = null;
            if (filterWrapper && filterWrapper.$children && filterWrapper.$children.length > 0) {
              // Find the DashboardBookingsManagement with filtersLocation='slot'
              filterInstance = filterWrapper.$children.find(child => {
                const name = child.$options?.name || child.$options?.__name;
                return name === 'DashboardBookingsManagement' && child.filtersLocation === 'slot';
              });
            }

            // Fallback: if we can't find the filter instance, use contentInstance
            if (!filterInstance) {
              filterInstance = contentInstance;
            }

            if (!contentInstance) {
              return;
            }

            // CRITICAL: Set flag to skip watch BEFORE updating any values
            // This prevents the watcher from firing during manual sync
            contentInstance._skipWatch = true;

            // Clear previous data immediately
            contentInstance.bookings = [];
            contentInstance.newBookings = [];
            contentInstance.counter = 0;
            contentInstance.totalPages = 0;

            // Sync all filter properties - read from filterPropsOverride if provided, otherwise from filterInstance
            contentInstance.page = 1;

            // Helper function to get value - prioritize override, then filterInstance, then undefined
            // CRITICAL: Must handle undefined, null, empty string, and false values correctly
            const getValue = key => {
              // If override is provided and has the key (even if value is undefined/null/false), use it
              // Check if key exists in override object - this handles false values correctly
              if (
                filterPropsOverride !== null &&
                filterPropsOverride !== undefined &&
                key in filterPropsOverride
              ) {
                return filterPropsOverride[key];
              }
              // Otherwise, get from filterInstance (which may be undefined)
              return filterInstance ? filterInstance[key] : undefined;
            };

            // Helper to normalize string values (empty string -> undefined, trim whitespace)
            const normalizeString = value => {
              if (value === null || value === undefined) return undefined;
              const str = String(value).trim();
              return str === '' ? undefined : str;
            };

            // Sync all filter values - EXACTLY as they are in filterInstance
            // This ensures mobile and desktop use identical filter values
            contentInstance.status = getValue('status');
            // Sync survey filter - prioritize override, then filterInstance, then undefined
            if (filterPropsOverride !== null && filterPropsOverride !== undefined) {
              if (Object.prototype.hasOwnProperty.call(filterPropsOverride, 'survey')) {
                contentInstance.survey = filterPropsOverride.survey;
              } else if (filterInstance) {
                contentInstance.survey = filterInstance.survey;
              } else {
                contentInstance.survey = undefined;
              }
            } else if (filterInstance) {
              contentInstance.survey = filterInstance.survey;
            } else {
              contentInstance.survey = undefined;
            }

            // Sync asc filter - prioritize override, then filterInstance, then default to true
            if (filterPropsOverride !== null && filterPropsOverride !== undefined) {
              if (Object.prototype.hasOwnProperty.call(filterPropsOverride, 'asc')) {
                contentInstance.asc = filterPropsOverride.asc;
              } else if (filterInstance && filterInstance.asc !== undefined) {
                contentInstance.asc = filterInstance.asc;
              } else {
                contentInstance.asc = true;
              }
            } else if (filterInstance && filterInstance.asc !== undefined) {
              contentInstance.asc = filterInstance.asc;
            } else {
              contentInstance.asc = true;
            }

            // Normalize searchText - empty string becomes undefined (matching mobile behavior)
            const searchTextValue = getValue('searchText');
            contentInstance.searchText = normalizeString(searchTextValue);

            // Normalize queueId and serviceId - empty string becomes undefined
            const queueIdValue = getValue('queueId');
            contentInstance.queueId = normalizeString(queueIdValue);

            const serviceIdValue = getValue('serviceId');
            contentInstance.serviceId = normalizeString(serviceIdValue);

            // Sync date filters - normalize to YYYY-MM-DD format or undefined
            const startDateValue = getValue('startDate');
            contentInstance.startDate = normalizeString(startDateValue);

            const endDateValue = getValue('endDate');
            contentInstance.endDate = normalizeString(endDateValue);

            // Final verification: make sure we're calling refresh on the correct component
            const finalComponentName =
              contentInstance.$options?.name || contentInstance.$options?.__name;
            if (finalComponentName !== 'DashboardBookingsManagement') {
              // Clear skip flag before returning
              contentInstance._skipWatch = false;
              return;
            }

            // Call refresh immediately - values are already synced above
            // Use single nextTick to ensure DOM is updated
            nextTick(async () => {
              if (contentInstance && contentInstance.refresh) {
                const verifyName =
                  contentInstance.$options?.name || contentInstance.$options?.__name;
                if (verifyName === 'DashboardBookingsManagement') {
                  try {
                    // Refresh with page 1 - skipWatch is still true
                    await contentInstance.refresh(1);
                    await nextTick();
                    contentInstance._skipWatch = false;
                  } catch (error) {
                    contentInstance._skipWatch = false;
                  }
                } else {
                  contentInstance._skipWatch = false;
                }
              } else {
                contentInstance._skipWatch = false;
              }

              if (contentWrapper && contentWrapper._isRefreshing !== undefined) {
                contentWrapper._isRefreshing = false;
              }
            });
          } else {
            // CRITICAL: Clear the refreshing flag even if refs are null
            if (
              attentionsContentRef.value &&
              attentionsContentRef.value._isRefreshing !== undefined
            ) {
              attentionsContentRef.value._isRefreshing = false;
            }
          }
        });
      });
    };

    const refreshSurveysContent = (filterPropsOverride = null) => {
      nextTick(() => {
        nextTick(() => {
          if (surveysFilterRef.value && surveysContentRef.value) {
            const filterInstance = surveysFilterRef.value;
            const contentInstance = surveysContentRef.value;

            if (!filterInstance || !contentInstance) {
              return;
            }

            // Clear previous data immediately
            contentInstance.surveys = [];
            contentInstance.counter = 0;
            contentInstance.totalPages = 0;

            // Set flag to skip watch during manual sync
            contentInstance._skipWatch = true;
            contentInstance.page = 1;

            // Helper function to get value - prioritize override, then filterInstance, then undefined
            // CRITICAL: Must handle undefined, null, empty string, and false values correctly
            const getValue = key => {
              // If override is provided and has the key (even if value is undefined/null), use it
              if (filterPropsOverride && key in filterPropsOverride) {
                return filterPropsOverride[key];
              }
              // Otherwise, get from filterInstance (which may be undefined)
              return filterInstance[key];
            };

            // Helper to normalize string values (empty string -> undefined, trim whitespace)
            const normalizeString = value => {
              if (value === null || value === undefined) return undefined;
              const str = String(value).trim();
              return str === '' ? undefined : str;
            };

            // Sync all filter values - EXACTLY as they are in filterInstance
            // This ensures mobile and desktop use identical filter values
            contentInstance.ratingType = getValue('ratingType');
            contentInstance.npsType = getValue('npsType');
            contentInstance.contactable = getValue('contactable');
            contentInstance.contacted = getValue('contacted');
            contentInstance.keyWord = getValue('keyWord');

            // Normalize searchText - empty string becomes undefined (matching mobile behavior)
            const searchTextValue = getValue('searchText');
            contentInstance.searchText = normalizeString(searchTextValue);

            // Normalize queueId and serviceId - empty string becomes undefined
            const queueIdValue = getValue('queueId');
            contentInstance.queueId = normalizeString(queueIdValue);

            const serviceIdValue = getValue('serviceId');
            contentInstance.serviceId = normalizeString(serviceIdValue);

            // Sync date filters - normalize to YYYY-MM-DD format or undefined
            const startDateValue = getValue('startDate');
            contentInstance.startDate = normalizeString(startDateValue);

            const endDateValue = getValue('endDate');
            contentInstance.endDate = normalizeString(endDateValue);

            // Clear skip flag and refresh
            contentInstance._skipWatch = false;

            nextTick(() => {
              nextTick(() => {
                if (contentInstance && contentInstance.refresh) {
                  contentInstance.refresh(1);
                }
              });
            });
          }
        });
      });
    };

    // Helper function to refresh clients content with delay
    const refreshClientsContentDelayed = (filterPropsOverride = null, delay = 50) => {
      if (timeoutRefClients.value) {
        clearTimeout(timeoutRefClients.value);
      }
      timeoutRefClients.value = setTimeout(() => {
        refreshClientsContent(filterPropsOverride);
        timeoutRefClients.value = null;
      }, delay);
    };

    // Helper function to refresh attentions content with delay
    const refreshAttentionsContentDelayed = (filterPropsOverride = null, delay = 50) => {
      if (timeoutRefAttentions.value) {
        clearTimeout(timeoutRefAttentions.value);
      }
      timeoutRefAttentions.value = setTimeout(() => {
        refreshAttentionsContent(filterPropsOverride);
        timeoutRefAttentions.value = null;
      }, delay);
    };

    // Helper function to refresh bookings content with delay
    const refreshBookingsContentDelayed = (filterPropsOverride = null, delay = 50) => {
      if (timeoutRefBookings.value) {
        clearTimeout(timeoutRefBookings.value);
      }
      timeoutRefBookings.value = setTimeout(() => {
        refreshBookingsContent(filterPropsOverride);
        timeoutRefBookings.value = null;
      }, delay);
    };

    // Helper functions for date quick buttons
    const handleDateQuickButton = (filterProps, dateMethod, filterType) => {
      // Calculate dates directly based on the method name
      const today = new Date().toISOString().slice(0, 10);
      let startDate, endDate;

      // Determine which method was called by checking the method reference
      const methodName =
        dateMethod?.name || (typeof dateMethod === 'function' ? dateMethod.name : '');

      if (methodName === 'getToday' || dateMethod === filterProps.getToday) {
        const [year, month, day] = today.split('-');
        startDate = `${year}-${month}-${day}`;
        endDate = `${year}-${month}-${day}`;
      } else if (methodName === 'getCurrentMonth' || dateMethod === filterProps.getCurrentMonth) {
        const [year, month, day] = today.split('-');
        startDate = `${year}-${month}-01`;
        endDate = `${year}-${month}-${day}`;
      } else if (methodName === 'getLastMonth' || dateMethod === filterProps.getLastMonth) {
        startDate = new DateModel(today).substractMonths(1).toString();
        endDate = new DateModel(startDate).endOfMonth().toString();
      } else if (
        methodName === 'getLastThreeMonths' ||
        dateMethod === filterProps.getLastThreeMonths
      ) {
        startDate = new DateModel(today).substractMonths(3).toString();
        endDate = new DateModel(today).substractMonths(1).endOfMonth().toString();
      }

      // Update filterProps dates
      if (filterProps.setStartDate) {
        filterProps.setStartDate(startDate);
      } else {
        filterProps.startDate = startDate;
      }
      if (filterProps.setEndDate) {
        filterProps.setEndDate(endDate);
      } else {
        filterProps.endDate = endDate;
      }

      // Also call the original method to update the component's internal state
      if (dateMethod && typeof dateMethod === 'function') {
        dateMethod();
      }

      // Update filter instance directly based on filterType
      if (filterType === 'attentions' && attentionsFilterRef.value) {
        const filterWrapper = attentionsFilterRef.value;
        if (filterWrapper.$children && filterWrapper.$children.length > 0) {
          const filterInstance = filterWrapper.$children.find(child => {
            const name = child.$options?.name || child.$options?.__name;
            return name === 'DashboardAttentionsManagement' && child.filtersLocation === 'slot';
          });
          if (filterInstance) {
            filterInstance.startDate = startDate;
            filterInstance.endDate = endDate;
          }
        }
      } else if (filterType === 'bookings' && attentionsFilterRef.value) {
        const filterWrapper = attentionsFilterRef.value;
        if (filterWrapper.$children && filterWrapper.$children.length > 0) {
          const filterInstance = filterWrapper.$children.find(child => {
            const name = child.$options?.name || child.$options?.__name;
            return name === 'DashboardBookingsManagement' && child.filtersLocation === 'slot';
          });
          if (filterInstance) {
            filterInstance.startDate = startDate;
            filterInstance.endDate = endDate;
            // Force update to ensure reactivity
            filterInstance.$forceUpdate();
          }
        }
      }

      // Refresh with the calculated dates immediately
      // Use nextTick to ensure filter instance is updated before refreshing
      nextTick(() => {
        // Set skipWatch flag before updating to prevent duplicate calls
        if (filterType === 'bookings') {
          setBookingsSkipWatch(true);
        }
        const dateOverride = { startDate, endDate };
        if (filterType === 'attentions') {
          refreshAttentionsContentDelayed(dateOverride, 50);
        } else if (filterType === 'bookings') {
          refreshBookingsContentDelayed(dateOverride, 50);
        }
      });
    };

    return {
      state,
      loading,
      alertError,
      goBack,
      isActiveBusiness,
      commerce,
      selectedCommerces,
      showClients,
      showSurveys,
      showAttentions,
      formatDateDisplay,
      activateTabFromHash,
      currentMainTitle,
      currentSubsection,
      handleAttentionsSubsectionChanged,
      getLocalHour,
      handleFiltersToggle,
      handleDateQuickSelect,
      handleDateSearch,
      handleCommerceChanged,
      refreshClientsContent,
      refreshClientsContentDelayed,
      refreshAttentionsContent,
      refreshAttentionsContentDelayed,
      refreshBookingsContent,
      refreshBookingsContentDelayed,
      refreshSurveysContent,
      handleDateQuickButton,
      handleQuickDateSelect,
      setBookingsSkipWatch,
      handleAttentionsTabChanged,
      DateModel,
      clientsFilterRef,
      clientsContentRef,
      attentionsFilterRef,
      attentionsContentRef,
      bookingsFilterRef,
      bookingsContentRef,
      surveysFilterRef,
      surveysContentRef,
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
          :title="$t(`dashboard.tracing.title`)"
          :toggles="state.toggles"
          component-name="dashboard"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="dashboard">
          <div v-if="isActiveBusiness()">
            <div v-if="!commerce" class="control-box">
              <Message
                :title="$t('dashboard.message.3.title')"
                :content="$t('dashboard.message.3.content')"
              />
            </div>
            <div v-else class="control-box">
              <div id="dashboard-controls">
                <div class="row"></div>
              </div>
            </div>
            <div v-if="!loading" id="dashboard-result" class="mt-2">
              <div class="row col mx-1 mt-3 mb-1 tabs-header-divider">
                <div class="col-3 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showClients ? 'btn-selected' : ''"
                    @click="showClients()"
                    :disabled="!state.toggles['dashboard.clients-management.view']"
                  >
                    <span class="d-none d-lg-inline">{{ $t('dashboard.clients') }} <br /></span>
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
                    <span class="d-none d-lg-inline">{{ $t('dashboard.attentions') }} <br /></span>
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
                    <span class="d-none d-lg-inline">{{ $t('dashboard.satisfaction') }} <br /></span>
                    <i class="bi bi-chat-heart-fill"></i>
                  </button>
                </div>
                <div class="col-12 mt-3">
                  <div id="title" class="metric-title">
                    <span>
                      {{ $t(currentMainTitle) }}
                      <span v-if="currentSubsection" class="metric-subsection">
                        / {{ $t(currentSubsection) }}
                      </span>
                    </span>
                  </div>
                  <div v-if="state.startDate && state.endDate" id="sub-title" class="metric-subtitle">
                    ({{ $t('dashboard.dates.from') }} <strong>{{ formatDateDisplay(state.startDate) }}</strong>
                    {{ $t('dashboard.dates.to') }} <strong>{{ formatDateDisplay(state.endDate) }}</strong>)
                  </div>
                </div>
              </div>
              <div>
                <DashboardClientsManagement
                  :show-client-management="state.showClients"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
                  :business="state.business"
                  :services="state.services"
                  :client-details-opened="false"
                >
                </DashboardClientsManagement>
                <DashboardAttentionsAndBookingsManagement
                  :show-attention-management="state.showAttentions"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
                  :services="state.services"
                  @subsection-changed="handleAttentionsSubsectionChanged"
                >
                </DashboardAttentionsAndBookingsManagement>
                <DashboardSurveysManagement
                  :show-survey-management="state.showSurveyManagement"
                  :calculated-metrics="state.calculatedMetrics"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
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
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div class="row align-items-center mb-1 desktop-header-row">
          <div class="col-auto desktop-logo-wrapper">
            <div class="desktop-commerce-logo">
              <CommerceLogo
                :src="state.business?.logo"
                :business-id="state.business?.id"
                :loading="loading"
                desktop-size
              />
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
          <div
            v-if="!commerce || (state.allCommerces && state.allCommerces.length === 0)"
            class="control-box"
          >
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
                :model-value="{ commerce: commerce }"
                :loading="loading"
                :commerces="[]"
                :show-commerce-selector="false"
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
                    :commerce="commerce"
                    :queues="Array.isArray(state.queues) ? state.queues : []"
                    :commerces="
                      Array.isArray(state.selectedCommerces) ? state.selectedCommerces : []
                    "
                    :business="state.business"
                    :services="Array.isArray(state.services) ? state.services : []"
                    filters-location="slot"
                    :client-details-opened="false"
                    ref="clientsFilterRef"
                  >
                    <template #filters-exposed="filterProps">
                      <!-- Render filters here - they will be visible in filters panel -->
                      <div class="filters-content-wrapper">
                        <!-- Date quick buttons -->
                        <div class="row my-2">
                          <div class="col-6 mb-2">
                            <button
                              class="btn btn-sm btn-dark rounded-pill w-100"
                              @click="handleQuickDateSelect('today', filterProps)"
                              :disabled="filterProps?.loading"
                            >
                              {{ $t('dashboard.today') }}
                            </button>
                          </div>
                          <div class="col-6 mb-2">
                            <button
                              class="btn btn-sm btn-dark rounded-pill w-100"
                              @click="handleQuickDateSelect('currentMonth', filterProps)"
                              :disabled="filterProps?.loading"
                            >
                              {{ $t('dashboard.thisMonth') }}
                            </button>
                          </div>
                          <div class="col-6 mb-2">
                            <button
                              class="btn btn-sm btn-dark rounded-pill w-100"
                              @click="handleQuickDateSelect('lastMonth', filterProps)"
                              :disabled="filterProps?.loading"
                            >
                              {{ $t('dashboard.lastMonth') }}
                            </button>
                          </div>
                          <div class="col-6 mb-2">
                            <button
                              class="btn btn-sm btn-dark rounded-pill w-100"
                              @click="handleQuickDateSelect('lastThreeMonths', filterProps)"
                              :disabled="filterProps?.loading"
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
                              if (filterProps.setStartDate) {
                                filterProps.setStartDate(val);
                              } else {
                                filterProps.startDate = val;
                              }
                              // Also update the filter instance directly
                              if (clientsFilterRef.value) {
                                clientsFilterRef.value.startDate = val;
                              }
                            }
                          "
                          @update:endDate="
                            val => {
                              if (filterProps.setEndDate) {
                                filterProps.setEndDate(val);
                              } else {
                                filterProps.endDate = val;
                              }
                              // Also update the filter instance directly
                              if (clientsFilterRef.value) {
                                clientsFilterRef.value.endDate = val;
                              }
                            }
                          "
                          @search="
                            refreshClientsContentDelayed({
                              startDate: filterProps.startDate,
                              endDate: filterProps.endDate,
                            })
                          "
                        />
                        <!-- Additional filters from component -->
                        <div class="mb-3">
                          <label class="form-label fw-bold mb-2">{{
                            $t('dashboard.search') || 'Buscar'
                          }}</label>
                          <div class="d-flex gap-2">
                            <input
                              min="1"
                              max="50"
                              type="text"
                              class="form-control flex-grow-1"
                              :value="filterProps.searchText"
                              @input="
                                e => {
                                  const newValue = e.target.value;
                                  if (filterProps.setSearchText) {
                                    filterProps.setSearchText(newValue);
                                  } else {
                                    filterProps.searchText = newValue;
                                  }
                                  // Also update the filter instance directly
                                  if (clientsFilterRef.value) {
                                    clientsFilterRef.value.searchText = newValue;
                                  }
                                }
                              "
                              :placeholder="$t('dashboard.search')"
                            />
                            <button
                              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                              @click="
                                refreshClientsContentDelayed({
                                  searchText: filterProps.searchText,
                                  startDate: filterProps.startDate,
                                  endDate: filterProps.endDate,
                                })
                              "
                              :disabled="filterProps.loading"
                              style="flex-shrink: 0"
                            >
                              <i class="bi bi-search"></i>
                            </button>
                          </div>
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
                                const newQueueId = e.target.value;
                                if (filterProps.setQueueId) {
                                  filterProps.setQueueId(newQueueId);
                                } else {
                                  filterProps.queueId = newQueueId;
                                }
                                refreshClientsContentDelayed({ queueId: newQueueId || undefined });
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
                                const newServiceId = e.target.value;
                                if (filterProps.setServiceId) {
                                  filterProps.setServiceId(newServiceId);
                                } else {
                                  filterProps.serviceId = newServiceId;
                                }
                                refreshClientsContentDelayed({
                                  serviceId: newServiceId || undefined,
                                });
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
                        <!-- Atendimentos Filters (from mobile) -->
                        <div class="mb-3 filter-card">
                          <label class="form-label fw-bold mb-2">{{
                            $t('dashboard.tracing.filters.attention')
                          }}</label>
                          <div class="d-flex flex-wrap gap-2 align-items-center">
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="EARLY"
                              name="daysSince-type-clients"
                              id="early-since-clients-desktop"
                              autocomplete="off"
                              :checked="filterProps.daysSinceType === 'EARLY'"
                              @change="
                                if (filterProps.setDaysSinceType) {
                                  filterProps.setDaysSinceType('EARLY');
                                } else {
                                  filterProps.daysSinceType = 'EARLY';
                                }
                                refreshClientsContentDelayed({ daysSinceType: 'EARLY' });
                              "
                            />
                            <label class="btn btn-sm" for="early-since-clients-desktop">
                              <i class="bi bi-qr-code green-icon"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="MEDIUM"
                              name="daysSince-type-clients"
                              id="medium-since-clients-desktop"
                              autocomplete="off"
                              :checked="filterProps.daysSinceType === 'MEDIUM'"
                              @change="
                                if (filterProps.setDaysSinceType) {
                                  filterProps.setDaysSinceType('MEDIUM');
                                } else {
                                  filterProps.daysSinceType = 'MEDIUM';
                                }
                                refreshClientsContentDelayed({ daysSinceType: 'MEDIUM' });
                              "
                            />
                            <label class="btn btn-sm" for="medium-since-clients-desktop">
                              <i class="bi bi-qr-code yellow-icon"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="LATE"
                              name="daysSince-type-clients"
                              id="late-since-clients-desktop"
                              autocomplete="off"
                              :checked="filterProps.daysSinceType === 'LATE'"
                              @change="
                                if (filterProps.setDaysSinceType) {
                                  filterProps.setDaysSinceType('LATE');
                                } else {
                                  filterProps.daysSinceType = 'LATE';
                                }
                                refreshClientsContentDelayed({ daysSinceType: 'LATE' });
                              "
                            />
                            <label class="btn btn-sm" for="late-since-clients-desktop">
                              <i class="bi bi-qr-code red-icon"></i>
                            </label>
                          </div>
                        </div>
                        <!-- Contato Filter -->
                        <div class="mb-3 filter-card">
                          <label class="form-label fw-bold mb-2">{{
                            $t('dashboard.tracing.filters.contact')
                          }}</label>
                          <div class="d-flex flex-wrap gap-2 align-items-center">
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="EARLY"
                              name="daysContacted-type-clients"
                              id="early-contacted-clients-desktop"
                              autocomplete="off"
                              :checked="filterProps.daysSinceContacted === 'EARLY'"
                              @change="
                                if (filterProps.setDaysSinceContacted) {
                                  filterProps.setDaysSinceContacted('EARLY');
                                } else {
                                  filterProps.daysSinceContacted = 'EARLY';
                                }
                                refreshClientsContentDelayed({ daysSinceContacted: 'EARLY' });
                              "
                            />
                            <label class="btn btn-sm" for="early-contacted-clients-desktop">
                              <i class="bi bi-chat-left-dots-fill green-icon"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="MEDIUM"
                              name="daysContacted-type-clients"
                              id="medium-contacted-clients-desktop"
                              autocomplete="off"
                              :checked="filterProps.daysSinceContacted === 'MEDIUM'"
                              @change="
                                if (filterProps.setDaysSinceContacted) {
                                  filterProps.setDaysSinceContacted('MEDIUM');
                                } else {
                                  filterProps.daysSinceContacted = 'MEDIUM';
                                }
                                refreshClientsContentDelayed({ daysSinceContacted: 'MEDIUM' });
                              "
                            />
                            <label class="btn btn-sm" for="medium-contacted-clients-desktop">
                              <i class="bi bi-chat-left-dots-fill yellow-icon"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="LATE"
                              name="daysContacted-type-clients"
                              id="late-contacted-clients-desktop"
                              autocomplete="off"
                              :checked="filterProps.daysSinceContacted === 'LATE'"
                              @change="
                                if (filterProps.setDaysSinceContacted) {
                                  filterProps.setDaysSinceContacted('LATE');
                                } else {
                                  filterProps.daysSinceContacted = 'LATE';
                                }
                                refreshClientsContentDelayed({ daysSinceContacted: 'LATE' });
                              "
                            />
                            <label class="btn btn-sm" for="late-contacted-clients-desktop">
                              <i class="bi bi-chat-left-dots-fill red-icon"></i>
                            </label>
                          </div>
                        </div>
                        <!-- Retorno de Contato Filter -->
                        <div class="mb-3 filter-card">
                          <label class="form-label fw-bold mb-2">{{
                            $t('dashboard.tracing.filters.contactResult')
                          }}</label>
                          <div class="d-flex flex-wrap gap-2 align-items-center">
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="INTERESTED"
                              name="contactResultType-clients"
                              id="interested-clients-desktop"
                              autocomplete="off"
                              :checked="filterProps.contactResultType === 'INTERESTED'"
                              @change="
                                if (filterProps.setContactResultType) {
                                  filterProps.setContactResultType('INTERESTED');
                                } else {
                                  filterProps.contactResultType = 'INTERESTED';
                                }
                                refreshClientsContentDelayed({ contactResultType: 'INTERESTED' });
                              "
                            />
                            <label class="btn btn-sm" for="interested-clients-desktop">
                              <i class="bi bi-patch-check-fill green-icon"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="CONTACT_LATER"
                              name="contactResultType-clients"
                              id="contact-later-clients-desktop"
                              autocomplete="off"
                              :checked="filterProps.contactResultType === 'CONTACT_LATER'"
                              @change="
                                if (filterProps.setContactResultType) {
                                  filterProps.setContactResultType('CONTACT_LATER');
                                } else {
                                  filterProps.contactResultType = 'CONTACT_LATER';
                                }
                                refreshClientsContentDelayed({
                                  contactResultType: 'CONTACT_LATER',
                                });
                              "
                            />
                            <label class="btn btn-sm" for="contact-later-clients-desktop">
                              <i class="bi bi-patch-check-fill yellow-icon"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="REJECTED"
                              name="contactResultType-clients"
                              id="rejected-clients-desktop"
                              autocomplete="off"
                              :checked="filterProps.contactResultType === 'REJECTED'"
                              @change="
                                if (filterProps.setContactResultType) {
                                  filterProps.setContactResultType('REJECTED');
                                } else {
                                  filterProps.contactResultType = 'REJECTED';
                                }
                                refreshClientsContentDelayed({ contactResultType: 'REJECTED' });
                              "
                            />
                            <label class="btn btn-sm" for="rejected-clients-desktop">
                              <i class="bi bi-patch-check-fill red-icon"></i>
                            </label>
                          </div>
                        </div>
                        <!-- Checkboxes -->
                        <div class="mb-3">
                          <div class="form-check form-switch">
                            <input
                              class="form-check-input"
                              type="checkbox"
                              :id="'contactable-clients-' + Math.random()"
                              :checked="filterProps.contactable === true"
                              @change="
                                filterProps.checkContactable($event);
                                refreshClientsContentDelayed({
                                  contactable: $event.target.checked,
                                });
                              "
                            />
                            <label
                              class="form-check-label"
                              :for="'contactable-clients-' + Math.random()"
                            >
                              {{ $t('dashboard.contactable') }}
                            </label>
                          </div>
                          <div class="form-check form-switch">
                            <input
                              class="form-check-input"
                              type="checkbox"
                              :id="'contacted-clients-' + Math.random()"
                              :checked="filterProps.contacted === true"
                              @change="
                                filterProps.checkContacted($event);
                                refreshClientsContentDelayed({ contacted: $event.target.checked });
                              "
                            />
                            <label
                              class="form-check-label"
                              :for="'contacted-clients-' + Math.random()"
                            >
                              {{ $t('dashboard.contacted') }}
                            </label>
                          </div>
                          <div class="form-check form-switch">
                            <input
                              class="form-check-input"
                              type="checkbox"
                              :id="'survey-clients-' + Math.random()"
                              :checked="filterProps.survey === true"
                              @change="
                                filterProps.checkSurvey($event);
                                refreshClientsContentDelayed({ survey: $event.target.checked });
                              "
                            />
                            <label
                              class="form-check-label"
                              :for="'survey-clients-' + Math.random()"
                            >
                              {{ $t('dashboard.survey') }}
                            </label>
                          </div>
                          <div class="form-check form-switch">
                            <input
                              class="form-check-input"
                              type="checkbox"
                              :id="'asc-clients-' + Math.random()"
                              :checked="filterProps.asc === true"
                              @change="
                                filterProps.checkAsc($event);
                                refreshClientsContentDelayed({ asc: $event.target.checked });
                              "
                            />
                            <label class="form-check-label" :for="'asc-clients-' + Math.random()">
                              {{ filterProps.asc ? $t('dashboard.asc') : $t('dashboard.desc') }}
                            </label>
                          </div>
                        </div>
                        <!-- Clientes-specific filters -->
                        <div class="mb-3">
                          <div class="form-check form-switch">
                            <input
                              class="form-check-input"
                              type="checkbox"
                              :id="'first-attention-form-' + Math.random()"
                              :checked="filterProps.firstAttentionForm === true"
                              @change="
                                filterProps.checkFirstAttentionForm($event);
                                refreshClientsContentDelayed({
                                  firstAttentionForm: $event.target.checked,
                                });
                              "
                            />
                            <label
                              class="form-check-label"
                              :for="'first-attention-form-' + Math.random()"
                            >
                              {{ $t('dashboard.firstAttentionForm') }}
                            </label>
                          </div>
                          <div class="form-check form-switch">
                            <input
                              class="form-check-input"
                              type="checkbox"
                              :id="'pending-bookings-' + Math.random()"
                              :checked="filterProps.pendingBookings === true"
                              @change="
                                filterProps.checkPendingBookings($event);
                                refreshClientsContentDelayed({
                                  pendingBookings: $event.target.checked,
                                });
                              "
                            />
                            <label
                              class="form-check-label"
                              :for="'pending-bookings-' + Math.random()"
                            >
                              {{ $t('dashboard.pendingBookings') }}
                            </label>
                          </div>
                          <div class="form-check form-switch">
                            <input
                              class="form-check-input"
                              type="checkbox"
                              :id="'pending-controls-' + Math.random()"
                              :checked="filterProps.pendingControls === true"
                              @change="
                                filterProps.checkPendingControls($event);
                                refreshClientsContentDelayed({
                                  pendingControls: $event.target.checked,
                                });
                              "
                            />
                            <label
                              class="form-check-label"
                              :for="'pending-controls-' + Math.random()"
                            >
                              {{ $t('dashboard.pendingControls') }}
                            </label>
                          </div>
                        </div>
                        <!-- CSAT Filter (from Pesquisas) -->
                        <div class="mb-3 filter-card">
                          <label class="form-label fw-bold mb-2">{{
                            $t('dashboard.surveysFilters.filters.rating')
                          }}</label>
                          <div class="d-flex flex-wrap gap-2 align-items-center">
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="DETRACTOR"
                              name="rating-type-clients"
                              id="detractor-rating-clients-desktop"
                              autocomplete="off"
                              :checked="filterProps.ratingType === 'DETRACTOR'"
                              @change="
                                if (filterProps.setRatingType) {
                                  filterProps.setRatingType('DETRACTOR');
                                } else {
                                  filterProps.ratingType = 'DETRACTOR';
                                }
                                refreshClientsContentDelayed({ ratingType: 'DETRACTOR' });
                              "
                            />
                            <label class="btn btn btn-sm" for="detractor-rating-clients-desktop">
                              <i class="bi bi-star-fill red-icon"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="NEUTRO"
                              name="rating-type-clients"
                              id="neutro-rating-clients-desktop"
                              autocomplete="off"
                              :checked="filterProps.ratingType === 'NEUTRO'"
                              @change="
                                if (filterProps.setRatingType) {
                                  filterProps.setRatingType('NEUTRO');
                                } else {
                                  filterProps.ratingType = 'NEUTRO';
                                }
                                refreshClientsContentDelayed({ ratingType: 'NEUTRO' });
                              "
                            />
                            <label class="btn btn btn-sm" for="neutro-rating-clients-desktop">
                              <i class="bi bi-star-half yellow-icon"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="PROMOTOR"
                              name="rating-type-clients"
                              id="promotor-rating-clients-desktop"
                              autocomplete="off"
                              :checked="filterProps.ratingType === 'PROMOTOR'"
                              @change="
                                if (filterProps.setRatingType) {
                                  filterProps.setRatingType('PROMOTOR');
                                } else {
                                  filterProps.ratingType = 'PROMOTOR';
                                }
                                refreshClientsContentDelayed({ ratingType: 'PROMOTOR' });
                              "
                            />
                            <label class="btn btn btn-sm" for="promotor-rating-clients-desktop">
                              <i class="bi bi-star-fill green-icon"></i>
                            </label>
                          </div>
                        </div>
                        <!-- NPS Filter (from Pesquisas) -->
                        <div class="mb-3 filter-card">
                          <label class="form-label fw-bold mb-2">{{
                            $t('dashboard.surveysFilters.filters.nps')
                          }}</label>
                          <div class="d-flex flex-wrap gap-2 align-items-center">
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="DETRACTOR"
                              name="nps-type-clients"
                              id="detractor-nps-clients-desktop"
                              autocomplete="off"
                              :checked="filterProps.npsType === 'DETRACTOR'"
                              @change="
                                if (filterProps.setNpsType) {
                                  filterProps.setNpsType('DETRACTOR');
                                } else {
                                  filterProps.npsType = 'DETRACTOR';
                                }
                                refreshClientsContentDelayed({ npsType: 'DETRACTOR' });
                              "
                            />
                            <label class="btn btn btn-sm" for="detractor-nps-clients-desktop">
                              <i class="bi bi-emoji-frown-fill red-icon"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="NEUTRO"
                              name="nps-type-clients"
                              id="neutro-nps-clients-desktop"
                              autocomplete="off"
                              :checked="filterProps.npsType === 'NEUTRO'"
                              @change="
                                if (filterProps.setNpsType) {
                                  filterProps.setNpsType('NEUTRO');
                                } else {
                                  filterProps.npsType = 'NEUTRO';
                                }
                                refreshClientsContentDelayed({ npsType: 'NEUTRO' });
                              "
                            />
                            <label class="btn btn btn-sm" for="neutro-nps-clients-desktop">
                              <i class="bi bi-emoji-neutral-fill yellow-icon"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="PROMOTOR"
                              name="nps-type-clients"
                              id="promotor-nps-clients-desktop"
                              autocomplete="off"
                              :checked="filterProps.npsType === 'PROMOTOR'"
                              @change="
                                if (filterProps.setNpsType) {
                                  filterProps.setNpsType('PROMOTOR');
                                } else {
                                  filterProps.npsType = 'PROMOTOR';
                                }
                                refreshClientsContentDelayed({ npsType: 'PROMOTOR' });
                              "
                            />
                            <label class="btn btn btn-sm" for="promotor-nps-clients-desktop">
                              <i class="bi bi-emoji-smile-fill green-icon"></i>
                            </label>
                          </div>
                        </div>
                        <!-- Clear button -->
                        <div class="mb-3">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100"
                            @click="
                              filterProps.clear();
                              refreshClientsContent();
                            "
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
                    ref="attentionsFilterRef"
                    :show-attention-management="false"
                    :toggles="state.toggles"
                    :commerce="commerce"
                    :queues="Array.isArray(state.queues) ? state.queues : []"
                    :commerces="
                      Array.isArray(state.selectedCommerces) ? state.selectedCommerces : []
                    "
                    :services="Array.isArray(state.services) ? state.services : []"
                    filters-location="slot"
                  >
                    <template #filters-exposed="filterProps">
                      {{}}
                      <template v-if="filterProps.filterType === 'attentions'">
                        {{}}
                        <div class="filters-content-wrapper" key="attentions-filters">
                          <!-- Date quick buttons -->
                          <div class="row my-2">
                            <div class="col-6 mb-2">
                              <button
                                class="btn btn-sm btn-dark rounded-pill w-100"
                                @click="
                                  handleDateQuickButton(
                                    filterProps,
                                    filterProps.getToday,
                                    filterProps.filterType
                                  )
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
                                  handleDateQuickButton(
                                    filterProps,
                                    filterProps.getCurrentMonth,
                                    filterProps.filterType
                                  )
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
                                  handleDateQuickButton(
                                    filterProps,
                                    filterProps.getLastMonth,
                                    filterProps.filterType
                                  )
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
                                  handleDateQuickButton(
                                    filterProps,
                                    filterProps.getLastThreeMonths,
                                    filterProps.filterType
                                  )
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
                                if (filterProps.setStartDate) {
                                  filterProps.setStartDate(val);
                                } else {
                                  filterProps.startDate = val;
                                }
                                // Also update the filter instance directly
                                if (
                                  attentionsFilterRef &&
                                  filterProps.filterType === 'attentions'
                                ) {
                                  const filterWrapper = attentionsFilterRef;
                                  if (
                                    filterWrapper.$children &&
                                    filterWrapper.$children.length > 0
                                  ) {
                                    const filterInstance = filterWrapper.$children.find(child => {
                                      const name = child.$options?.name || child.$options?.__name;
                                      return (
                                        name === 'DashboardAttentionsManagement' &&
                                        child.filtersLocation === 'slot'
                                      );
                                    });
                                    if (filterInstance) {
                                      filterInstance.startDate = val;
                                    }
                                  }
                                } else if (
                                  attentionsFilterRef &&
                                  filterProps.filterType === 'bookings'
                                ) {
                                  const filterWrapper = attentionsFilterRef;
                                  if (
                                    filterWrapper.$children &&
                                    filterWrapper.$children.length > 0
                                  ) {
                                    const filterInstance = filterWrapper.$children.find(child => {
                                      const name = child.$options?.name || child.$options?.__name;
                                      return (
                                        name === 'DashboardBookingsManagement' &&
                                        child.filtersLocation === 'slot'
                                      );
                                    });
                                    if (filterInstance) {
                                      filterInstance.startDate = val;
                                    }
                                  }
                                }
                              }
                            "
                            @update:endDate="
                              val => {
                                if (filterProps.setEndDate) {
                                  filterProps.setEndDate(val);
                                } else {
                                  filterProps.endDate = val;
                                }
                                // Also update the filter instance directly
                                if (
                                  attentionsFilterRef &&
                                  filterProps.filterType === 'attentions'
                                ) {
                                  const filterWrapper = attentionsFilterRef;
                                  if (
                                    filterWrapper.$children &&
                                    filterWrapper.$children.length > 0
                                  ) {
                                    const filterInstance = filterWrapper.$children.find(child => {
                                      const name = child.$options?.name || child.$options?.__name;
                                      return (
                                        name === 'DashboardAttentionsManagement' &&
                                        child.filtersLocation === 'slot'
                                      );
                                    });
                                    if (filterInstance) {
                                      filterInstance.endDate = val;
                                    }
                                  }
                                } else if (
                                  attentionsFilterRef &&
                                  filterProps.filterType === 'bookings'
                                ) {
                                  const filterWrapper = attentionsFilterRef;
                                  if (
                                    filterWrapper.$children &&
                                    filterWrapper.$children.length > 0
                                  ) {
                                    const filterInstance = filterWrapper.$children.find(child => {
                                      const name = child.$options?.name || child.$options?.__name;
                                      return (
                                        name === 'DashboardBookingsManagement' &&
                                        child.filtersLocation === 'slot'
                                      );
                                    });
                                    if (filterInstance) {
                                      filterInstance.endDate = val;
                                    }
                                  }
                                }
                              }
                            "
                            @search="
                              if (filterProps.filterType === 'attentions') {
                                refreshAttentionsContentDelayed({
                                  startDate: filterProps.startDate,
                                  endDate: filterProps.endDate,
                                });
                              } else if (filterProps.filterType === 'bookings') {
                                refreshBookingsContentDelayed({
                                  startDate: filterProps.startDate,
                                  endDate: filterProps.endDate,
                                });
                              }
                            "
                          />
                          <!-- Search text filter - Only for Atendimentos, NOT for Reservas -->
                          <div class="mb-3" v-if="filterProps.filterType === 'attentions'">
                            <label class="form-label fw-bold mb-2">{{
                              $t('dashboard.search') || 'Buscar'
                            }}</label>
                            <div class="d-flex gap-2">
                              <input
                                min="1"
                                max="50"
                                type="text"
                                class="form-control flex-grow-1"
                                :value="filterProps.searchText"
                                @input="
                                  e => {
                                    const newValue = e.target.value;
                                    if (filterProps.setSearchText) {
                                      filterProps.setSearchText(newValue);
                                    } else {
                                      filterProps.searchText = newValue;
                                    }
                                    // Also update the filter instance directly
                                    if (
                                      attentionsFilterRef &&
                                      filterProps.filterType === 'attentions'
                                    ) {
                                      const filterWrapper = attentionsFilterRef;
                                      if (
                                        filterWrapper.$children &&
                                        filterWrapper.$children.length > 0
                                      ) {
                                        const filterInstance = filterWrapper.$children.find(
                                          child => {
                                            const name =
                                              child.$options?.name || child.$options?.__name;
                                            return (
                                              name === 'DashboardAttentionsManagement' &&
                                              child.filtersLocation === 'slot'
                                            );
                                          }
                                        );
                                        if (filterInstance) {
                                          filterInstance.searchText = newValue;
                                        }
                                      }
                                    } else if (
                                      bookingsFilterRef &&
                                      filterProps.filterType === 'bookings'
                                    ) {
                                      const filterWrapper = bookingsFilterRef;
                                      if (
                                        filterWrapper.$children &&
                                        filterWrapper.$children.length > 0
                                      ) {
                                        const filterInstance = filterWrapper.$children.find(
                                          child => {
                                            const name =
                                              child.$options?.name || child.$options?.__name;
                                            return (
                                              name === 'DashboardBookingsManagement' &&
                                              child.filtersLocation === 'slot'
                                            );
                                          }
                                        );
                                        if (filterInstance) {
                                          filterInstance.searchText = newValue;
                                        }
                                      }
                                    }
                                  }
                                "
                                @keydown.enter.prevent="
                                  if (filterProps.filterType === 'attentions') {
                                    refreshAttentionsContentDelayed({
                                      searchText: filterProps.searchText,
                                      startDate: filterProps.startDate,
                                      endDate: filterProps.endDate,
                                    });
                                  }
                                "
                                :placeholder="$t('dashboard.search')"
                              />
                              <button
                                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                                @click="
                                  if (filterProps.filterType === 'attentions') {
                                    refreshAttentionsContentDelayed({
                                      searchText: filterProps.searchText,
                                      startDate: filterProps.startDate,
                                      endDate: filterProps.endDate,
                                    });
                                  }
                                "
                                :disabled="filterProps.loading"
                                style="flex-shrink: 0"
                              >
                                <i class="bi bi-search"></i>
                              </button>
                            </div>
                          </div>
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
                                  const newQueueId = e.target.value;
                                  if (filterProps.setQueueId) {
                                    filterProps.setQueueId(newQueueId);
                                  } else {
                                    filterProps.queueId = newQueueId;
                                  }
                                  if (filterProps.filterType === 'attentions') {
                                    refreshAttentionsContentDelayed({
                                      queueId: newQueueId || undefined,
                                    });
                                  } else if (filterProps.filterType === 'bookings') {
                                    refreshBookingsContentDelayed({
                                      queueId: newQueueId || undefined,
                                    });
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
                                  const newServiceId = e.target.value;
                                  if (filterProps.setServiceId) {
                                    filterProps.setServiceId(newServiceId);
                                  } else {
                                    filterProps.serviceId = newServiceId;
                                  }
                                  if (filterProps.filterType === 'attentions') {
                                    refreshAttentionsContentDelayed({
                                      serviceId: newServiceId || undefined,
                                    });
                                  } else if (filterProps.filterType === 'bookings') {
                                    refreshBookingsContentDelayed({
                                      serviceId: newServiceId || undefined,
                                    });
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
                          <!-- Filters for Atendimentos (when filterType === 'attentions') -->
                          <template v-if="filterProps.filterType === 'attentions'">
                            <!-- Days Since Type filter -->
                            <div class="mb-3">
                              <label class="form-label fw-bold mb-2">{{
                                $t('dashboard.tracing.filters.attention') || 'Días desde Atención'
                              }}</label>
                              <div class="d-flex gap-2 align-items-center">
                                <input
                                  type="radio"
                                  class="btn-check"
                                  id="early-since-att-desktop"
                                  value="EARLY"
                                  :checked="filterProps.daysSinceType === 'EARLY'"
                                  @change="
                                    // Only process if this is the attentions tab
                                    if (filterProps.filterType === 'attentions') {
                                      if (filterProps.setDaysSinceType) {
                                        filterProps.setDaysSinceType('EARLY');
                                      } else {
                                        filterProps.daysSinceType = 'EARLY';
                                      }
                                      // Also update the filter instance directly
                                      if (attentionsFilterRef) {
                                        const filterWrapper = attentionsFilterRef;
                                        if (
                                          filterWrapper.$children &&
                                          filterWrapper.$children.length > 0
                                        ) {
                                          const filterInstance = filterWrapper.$children.find(
                                            child => {
                                              const name =
                                                child.$options?.name || child.$options?.__name;
                                              return (
                                                name === 'DashboardAttentionsManagement' &&
                                                child.filtersLocation === 'slot'
                                              );
                                            }
                                          );
                                          if (filterInstance) {
                                            filterInstance.daysSinceType = 'EARLY';
                                          }
                                        }
                                      }
                                      refreshAttentionsContentDelayed({ daysSinceType: 'EARLY' });
                                    }
                                  "
                                />
                                <label class="btn btn btn-sm" for="early-since-att-desktop">
                                  <i class="bi bi-qr-code green-icon"></i>
                                </label>
                                <input
                                  type="radio"
                                  class="btn-check"
                                  id="medium-since-att-desktop"
                                  value="MEDIUM"
                                  :checked="filterProps.daysSinceType === 'MEDIUM'"
                                  @change="
                                    // Only process if this is the attentions tab
                                    if (filterProps.filterType === 'attentions') {
                                      if (filterProps.setDaysSinceType) {
                                        filterProps.setDaysSinceType('MEDIUM');
                                      } else {
                                        filterProps.daysSinceType = 'MEDIUM';
                                      }
                                      // Also update the filter instance directly
                                      if (attentionsFilterRef) {
                                        const filterWrapper = attentionsFilterRef;
                                        if (
                                          filterWrapper.$children &&
                                          filterWrapper.$children.length > 0
                                        ) {
                                          const filterInstance = filterWrapper.$children.find(
                                            child => {
                                              const name =
                                                child.$options?.name || child.$options?.__name;
                                              return (
                                                name === 'DashboardAttentionsManagement' &&
                                                child.filtersLocation === 'slot'
                                              );
                                            }
                                          );
                                          if (filterInstance) {
                                            filterInstance.daysSinceType = 'MEDIUM';
                                          }
                                        }
                                      }
                                      refreshAttentionsContentDelayed({ daysSinceType: 'MEDIUM' });
                                    }
                                  "
                                />
                                <label class="btn btn btn-sm" for="medium-since-att-desktop">
                                  <i class="bi bi-qr-code yellow-icon"></i>
                                </label>
                                <input
                                  type="radio"
                                  class="btn-check"
                                  id="late-since-att-desktop"
                                  value="LATE"
                                  :checked="filterProps.daysSinceType === 'LATE'"
                                  @change="
                                    // Only process if this is the attentions tab
                                    if (filterProps.filterType === 'attentions') {
                                      if (filterProps.setDaysSinceType) {
                                        filterProps.setDaysSinceType('LATE');
                                      } else {
                                        filterProps.daysSinceType = 'LATE';
                                      }
                                      // Also update the filter instance directly
                                      if (attentionsFilterRef) {
                                        const filterWrapper = attentionsFilterRef;
                                        if (
                                          filterWrapper.$children &&
                                          filterWrapper.$children.length > 0
                                        ) {
                                          const filterInstance = filterWrapper.$children.find(
                                            child => {
                                              const name =
                                                child.$options?.name || child.$options?.__name;
                                              return (
                                                name === 'DashboardAttentionsManagement' &&
                                                child.filtersLocation === 'slot'
                                              );
                                            }
                                          );
                                          if (filterInstance) {
                                            filterInstance.daysSinceType = 'LATE';
                                          }
                                        }
                                      }
                                      refreshAttentionsContentDelayed({ daysSinceType: 'LATE' });
                                    }
                                  "
                                />
                                <label class="btn btn btn-sm" for="late-since-att-desktop">
                                  <i class="bi bi-qr-code red-icon"></i>
                                </label>
                              </div>
                            </div>
                            <!-- Contact Result Type filter -->
                            <div class="mb-3">
                              <label class="form-label fw-bold mb-2">{{
                                $t('dashboard.tracing.filters.contactResult') ||
                                'Resultado Contacto'
                              }}</label>
                              <div class="d-flex gap-2 align-items-center">
                                <input
                                  type="radio"
                                  class="btn-check"
                                  id="interested-att-desktop"
                                  value="INTERESTED"
                                  :checked="filterProps.contactResultType === 'INTERESTED'"
                                  @change="
                                    if (filterProps.setContactResultType) {
                                      filterProps.setContactResultType('INTERESTED');
                                    } else {
                                      filterProps.contactResultType = 'INTERESTED';
                                    }
                                    refreshAttentionsContentDelayed({
                                      contactResultType: 'INTERESTED',
                                    });
                                  "
                                />
                                <label class="btn btn btn-sm" for="interested-att-desktop">
                                  <i class="bi bi-patch-check-fill green-icon"></i>
                                </label>
                                <input
                                  type="radio"
                                  class="btn-check"
                                  id="contact-later-att-desktop"
                                  value="CONTACT_LATER"
                                  :checked="filterProps.contactResultType === 'CONTACT_LATER'"
                                  @change="
                                    if (filterProps.setContactResultType) {
                                      filterProps.setContactResultType('CONTACT_LATER');
                                    } else {
                                      filterProps.contactResultType = 'CONTACT_LATER';
                                    }
                                    refreshAttentionsContentDelayed({
                                      contactResultType: 'CONTACT_LATER',
                                    });
                                  "
                                />
                                <label class="btn btn btn-sm" for="contact-later-att-desktop">
                                  <i class="bi bi-patch-check-fill yellow-icon"></i>
                                </label>
                                <input
                                  type="radio"
                                  class="btn-check"
                                  id="rejected-att-desktop"
                                  value="REJECTED"
                                  :checked="filterProps.contactResultType === 'REJECTED'"
                                  @change="
                                    if (filterProps.setContactResultType) {
                                      filterProps.setContactResultType('REJECTED');
                                    } else {
                                      filterProps.contactResultType = 'REJECTED';
                                    }
                                    refreshAttentionsContentDelayed({
                                      contactResultType: 'REJECTED',
                                    });
                                  "
                                />
                                <label class="btn btn btn-sm" for="rejected-att-desktop">
                                  <i class="bi bi-patch-check-fill red-icon"></i>
                                </label>
                              </div>
                            </div>
                            <!-- Checkboxes for Atendimentos -->
                            <div class="mb-3">
                              <div class="form-check form-switch">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  :id="'contactable-att-' + Math.random()"
                                  :checked="filterProps.contactable === true"
                                  @change="
                                    e => {
                                      const newValue = e.target.checked;
                                      if (filterProps.checkContactable) {
                                        filterProps.checkContactable(e);
                                      } else {
                                        filterProps.contactable = newValue;
                                      }
                                      refreshAttentionsContentDelayed({
                                        contactable: newValue,
                                      });
                                    }
                                  "
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
                                  @change="
                                    e => {
                                      const newValue = e.target.checked;
                                      if (filterProps.checkContacted) {
                                        filterProps.checkContacted(e);
                                      } else {
                                        filterProps.contacted = newValue;
                                      }
                                      refreshAttentionsContentDelayed({
                                        contacted: newValue,
                                      });
                                    }
                                  "
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
                                  :id="'survey-att-' + Math.random()"
                                  :checked="filterProps.survey === true"
                                  @change="
                                    e => {
                                      const newValue = e.target.checked;
                                      if (filterProps.checkSurvey) {
                                        filterProps.checkSurvey(e);
                                      } else {
                                        filterProps.survey = newValue;
                                      }
                                      refreshAttentionsContentDelayed({
                                        survey: newValue,
                                      });
                                    }
                                  "
                                />
                                <label
                                  class="form-check-label"
                                  :for="'survey-att-' + Math.random()"
                                >
                                  {{ $t('dashboard.survey') }}
                                </label>
                              </div>
                              <div class="form-check form-switch">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  :id="'asc-att-' + Math.random()"
                                  :checked="filterProps.asc === true"
                                  @change="
                                    e => {
                                      const newValue = e.target.checked;
                                      if (filterProps.checkAsc) {
                                        filterProps.checkAsc(e);
                                      } else {
                                        filterProps.asc = newValue;
                                      }
                                      refreshAttentionsContentDelayed({ asc: newValue });
                                    }
                                  "
                                />
                                <label class="form-check-label" :for="'asc-att-' + Math.random()">
                                  {{ filterProps.asc ? $t('dashboard.asc') : $t('dashboard.desc') }}
                                </label>
                              </div>
                            </div>
                          </template>
                          <!-- Clear button -->
                          <div class="mb-3">
                            <button
                              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100"
                              @click="
                                filterProps.clear();
                                if (filterProps.filterType === 'attentions') {
                                  refreshAttentionsContent();
                                } else if (filterProps.filterType === 'bookings') {
                                  refreshBookingsContent();
                                }
                              "
                            >
                              <i class="bi bi-eraser-fill"></i>
                              {{ $t('dashboard.clear') || 'Limpiar' }}
                            </button>
                          </div>
                        </div>
                      </template>
                      <template v-else-if="filterProps.filterType === 'bookings'">
                        <div class="filters-content-wrapper" key="bookings-filters">
                          <!-- Date quick buttons -->
                          <div class="row my-2">
                            <div class="col-6 mb-2">
                              <button
                                class="btn btn-sm btn-dark rounded-pill w-100"
                                @click="
                                  handleDateQuickButton(
                                    filterProps,
                                    filterProps.getToday,
                                    filterProps.filterType
                                  )
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
                                  handleDateQuickButton(
                                    filterProps,
                                    filterProps.getCurrentMonth,
                                    filterProps.filterType
                                  )
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
                                  handleDateQuickButton(
                                    filterProps,
                                    filterProps.getLastMonth,
                                    filterProps.filterType
                                  )
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
                                  handleDateQuickButton(
                                    filterProps,
                                    filterProps.getLastThreeMonths,
                                    filterProps.filterType
                                  )
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
                                if (filterProps.setStartDate) {
                                  filterProps.setStartDate(val);
                                } else {
                                  filterProps.startDate = val;
                                }
                                if (attentionsFilterRef && filterProps.filterType === 'bookings') {
                                  const filterWrapper = attentionsFilterRef;
                                  if (
                                    filterWrapper.$children &&
                                    filterWrapper.$children.length > 0
                                  ) {
                                    const filterInstance = filterWrapper.$children.find(child => {
                                      const name = child.$options?.name || child.$options?.__name;
                                      return (
                                        name === 'DashboardBookingsManagement' &&
                                        child.filtersLocation === 'slot'
                                      );
                                    });
                                    if (filterInstance) {
                                      filterInstance.startDate = val;
                                    }
                                  }
                                }
                              }
                            "
                            @update:endDate="
                              val => {
                                if (filterProps.setEndDate) {
                                  filterProps.setEndDate(val);
                                } else {
                                  filterProps.endDate = val;
                                }
                                if (attentionsFilterRef && filterProps.filterType === 'bookings') {
                                  const filterWrapper = attentionsFilterRef;
                                  if (
                                    filterWrapper.$children &&
                                    filterWrapper.$children.length > 0
                                  ) {
                                    const filterInstance = filterWrapper.$children.find(child => {
                                      const name = child.$options?.name || child.$options?.__name;
                                      return (
                                        name === 'DashboardBookingsManagement' &&
                                        child.filtersLocation === 'slot'
                                      );
                                    });
                                    if (filterInstance) {
                                      filterInstance.endDate = val;
                                    }
                                  }
                                }
                              }
                            "
                            @search="
                              if (filterProps.filterType === 'bookings') {
                                // Set skipWatch flag before updating to prevent duplicate calls
                                setBookingsSkipWatch(true);
                                refreshBookingsContentDelayed({
                                  startDate: filterProps.startDate,
                                  endDate: filterProps.endDate,
                                });
                              }
                            "
                          />
                          <!-- Search text filter for Reservas -->
                          <div class="mb-3">
                            <label class="form-label fw-bold mb-2">{{
                              $t('dashboard.search') || 'Buscar'
                            }}</label>
                            <div class="d-flex gap-2">
                              <input
                                min="1"
                                max="50"
                                type="text"
                                class="form-control flex-grow-1"
                                :value="filterProps.searchText"
                                @input="
                                  e => {
                                    const newValue = e.target.value;
                                    if (filterProps.setSearchText) {
                                      filterProps.setSearchText(newValue);
                                    } else {
                                      filterProps.searchText = newValue;
                                    }
                                    if (
                                      attentionsFilterRef &&
                                      filterProps.filterType === 'bookings'
                                    ) {
                                      const filterWrapper = attentionsFilterRef;
                                      if (
                                        filterWrapper.$children &&
                                        filterWrapper.$children.length > 0
                                      ) {
                                        const filterInstance = filterWrapper.$children.find(
                                          child => {
                                            const name =
                                              child.$options?.name || child.$options?.__name;
                                            return (
                                              name === 'DashboardBookingsManagement' &&
                                              child.filtersLocation === 'slot'
                                            );
                                          }
                                        );
                                        if (filterInstance) {
                                          filterInstance.searchText = newValue;
                                        }
                                      }
                                    }
                                  }
                                "
                                @keydown.enter.prevent="
                                  if (filterProps.filterType === 'bookings') {
                                    setBookingsSkipWatch(true);
                                    refreshBookingsContentDelayed({
                                      searchText: filterProps.searchText,
                                      startDate: filterProps.startDate,
                                      endDate: filterProps.endDate,
                                    });
                                  }
                                "
                                :placeholder="$t('dashboard.search')"
                              />
                              <button
                                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                                @click="
                                  // Set skipWatch flag before updating to prevent duplicate calls
                                  setBookingsSkipWatch(true);
                                  refreshBookingsContentDelayed({
                                    searchText: filterProps.searchText,
                                    startDate: filterProps.startDate,
                                    endDate: filterProps.endDate,
                                  });
                                "
                                :disabled="filterProps.loading"
                                style="flex-shrink: 0"
                              >
                                <i class="bi bi-search"></i>
                              </button>
                            </div>
                          </div>
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
                                  const newQueueId = e.target.value;
                                  // Set skipWatch flag before updating to prevent duplicate calls
                                  setBookingsSkipWatch(true);
                                  if (filterProps.setQueueId) {
                                    filterProps.setQueueId(newQueueId);
                                  } else {
                                    filterProps.queueId = newQueueId;
                                  }
                                  if (filterProps.filterType === 'bookings') {
                                    refreshBookingsContentDelayed({
                                      queueId: newQueueId || undefined,
                                    });
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
                                  const newServiceId = e.target.value;
                                  // Set skipWatch flag before updating to prevent duplicate calls
                                  setBookingsSkipWatch(true);
                                  if (filterProps.setServiceId) {
                                    filterProps.setServiceId(newServiceId);
                                  } else {
                                    filterProps.serviceId = newServiceId;
                                  }
                                  if (filterProps.filterType === 'bookings') {
                                    refreshBookingsContentDelayed({
                                      serviceId: newServiceId || undefined,
                                    });
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
                          <!-- Status filter -->
                          <div class="mb-3 filter-card">
                            <label class="form-label fw-bold mb-2">{{
                              $t('dashboard.tracing.filters.attention')
                            }}</label>
                            <div class="d-flex flex-wrap gap-2 align-items-center">
                              <input
                                type="radio"
                                class="btn-check btn-sm"
                                value="CONFIRMED"
                                name="status-bookings"
                                id="confirmed-bookings-desktop"
                                autocomplete="off"
                                :checked="filterProps.status === 'CONFIRMED'"
                                @change="
                                  // Set skipWatch flag before updating to prevent duplicate calls
                                  setBookingsSkipWatch(true);
                                  if (filterProps.setStatus) {
                                    filterProps.setStatus('CONFIRMED');
                                  } else {
                                    filterProps.status = 'CONFIRMED';
                                  }
                                  if (
                                    attentionsFilterRef &&
                                    filterProps.filterType === 'bookings'
                                  ) {
                                    const filterWrapper = attentionsFilterRef;
                                    if (
                                      filterWrapper.$children &&
                                      filterWrapper.$children.length > 0
                                    ) {
                                      const filterInstance = filterWrapper.$children.find(child => {
                                        const name = child.$options?.name || child.$options?.__name;
                                        return (
                                          name === 'DashboardBookingsManagement' &&
                                          child.filtersLocation === 'slot'
                                        );
                                      });
                                      if (filterInstance) {
                                        filterInstance.status = 'CONFIRMED';
                                      }
                                    }
                                  }
                                  refreshBookingsContentDelayed({ status: 'CONFIRMED' });
                                "
                              />
                              <label class="btn btn btn-sm" for="confirmed-bookings-desktop">
                                <i class="bi bi-check-circle-fill green-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check btn-sm"
                                value="PENDING"
                                name="status-bookings"
                                id="pending-bookings-desktop"
                                autocomplete="off"
                                :checked="filterProps.status === 'PENDING'"
                                @change="
                                  // Set skipWatch flag before updating to prevent duplicate calls
                                  setBookingsSkipWatch(true);
                                  if (filterProps.setStatus) {
                                    filterProps.setStatus('PENDING');
                                  } else {
                                    filterProps.status = 'PENDING';
                                  }
                                  if (
                                    attentionsFilterRef &&
                                    filterProps.filterType === 'bookings'
                                  ) {
                                    const filterWrapper = attentionsFilterRef;
                                    if (
                                      filterWrapper.$children &&
                                      filterWrapper.$children.length > 0
                                    ) {
                                      const filterInstance = filterWrapper.$children.find(child => {
                                        const name = child.$options?.name || child.$options?.__name;
                                        return (
                                          name === 'DashboardBookingsManagement' &&
                                          child.filtersLocation === 'slot'
                                        );
                                      });
                                      if (filterInstance) {
                                        filterInstance.status = 'PENDING';
                                      }
                                    }
                                  }
                                  refreshBookingsContentDelayed({ status: 'PENDING' });
                                "
                              />
                              <label class="btn btn btn-sm" for="pending-bookings-desktop">
                                <i class="bi bi-clock-fill yellow-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check btn-sm"
                                value="PROCESSED"
                                name="status-bookings"
                                id="processed-bookings-desktop"
                                autocomplete="off"
                                :checked="filterProps.status === 'PROCESSED'"
                                @change="
                                  // Set skipWatch flag before updating to prevent duplicate calls
                                  setBookingsSkipWatch(true);
                                  if (filterProps.setStatus) {
                                    filterProps.setStatus('PROCESSED');
                                  } else {
                                    filterProps.status = 'PROCESSED';
                                  }
                                  if (
                                    attentionsFilterRef &&
                                    filterProps.filterType === 'bookings'
                                  ) {
                                    const filterWrapper = attentionsFilterRef;
                                    if (
                                      filterWrapper.$children &&
                                      filterWrapper.$children.length > 0
                                    ) {
                                      const filterInstance = filterWrapper.$children.find(child => {
                                        const name = child.$options?.name || child.$options?.__name;
                                        return (
                                          name === 'DashboardBookingsManagement' &&
                                          child.filtersLocation === 'slot'
                                        );
                                      });
                                      if (filterInstance) {
                                        filterInstance.status = 'PROCESSED';
                                      }
                                    }
                                  }
                                  refreshBookingsContentDelayed({ status: 'PROCESSED' });
                                "
                              />
                              <label class="btn btn btn-sm" for="processed-bookings-desktop">
                                <i class="bi bi-calendar-check-fill blue-icon"></i>
                              </label>
                              <input
                                type="radio"
                                class="btn-check btn-sm"
                                value="RESERVE_CANCELLED"
                                name="status-bookings"
                                id="cancelled-bookings-desktop"
                                autocomplete="off"
                                :checked="filterProps.status === 'RESERVE_CANCELLED'"
                                @change="
                                  // Set skipWatch flag before updating to prevent duplicate calls
                                  setBookingsSkipWatch(true);
                                  if (filterProps.setStatus) {
                                    filterProps.setStatus('RESERVE_CANCELLED');
                                  } else {
                                    filterProps.status = 'RESERVE_CANCELLED';
                                  }
                                  if (
                                    attentionsFilterRef &&
                                    filterProps.filterType === 'bookings'
                                  ) {
                                    const filterWrapper = attentionsFilterRef;
                                    if (
                                      filterWrapper.$children &&
                                      filterWrapper.$children.length > 0
                                    ) {
                                      const filterInstance = filterWrapper.$children.find(child => {
                                        const name = child.$options?.name || child.$options?.__name;
                                        return (
                                          name === 'DashboardBookingsManagement' &&
                                          child.filtersLocation === 'slot'
                                        );
                                      });
                                      if (filterInstance) {
                                        filterInstance.status = 'RESERVE_CANCELLED';
                                      }
                                    }
                                  }
                                  refreshBookingsContentDelayed({ status: 'RESERVE_CANCELLED' });
                                "
                              />
                              <label class="btn btn btn-sm" for="cancelled-bookings-desktop">
                                <i class="bi bi-calendar-fill red-icon"></i>
                              </label>
                            </div>
                          </div>
                          <!-- Checkboxes for Reservas -->
                          <div class="mb-3">
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                id="survey-bookings-desktop"
                                :checked="filterProps.survey === true"
                                @change="
                                  e => {
                                    const newValue = e.target.checked;
                                    setBookingsSkipWatch(true);
                                    if (filterProps.setSurvey) {
                                      filterProps.setSurvey(newValue);
                                    } else {
                                      filterProps.survey = newValue;
                                    }
                                    if (
                                      attentionsFilterRef &&
                                      filterProps.filterType === 'bookings'
                                    ) {
                                      const filterWrapper = attentionsFilterRef;
                                      if (
                                        filterWrapper.$children &&
                                        filterWrapper.$children.length > 0
                                      ) {
                                        const filterInstance = filterWrapper.$children.find(
                                          child => {
                                            const name =
                                              child.$options?.name || child.$options?.__name;
                                            return (
                                              name === 'DashboardBookingsManagement' &&
                                              child.filtersLocation === 'slot'
                                            );
                                          }
                                        );
                                        if (filterInstance) {
                                          filterInstance.survey = newValue;
                                        }
                                      }
                                    }
                                    if (filterProps.filterType === 'bookings') {
                                      refreshBookingsContentDelayed({ survey: newValue });
                                    }
                                  }
                                "
                              />
                              <label class="form-check-label" for="survey-bookings-desktop">
                                {{ $t('dashboard.survey') }}
                              </label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                id="asc-bookings-desktop"
                                :checked="filterProps.asc === true"
                                @change="
                                  e => {
                                    const newValue = e.target.checked;
                                    setBookingsSkipWatch(true);
                                    if (filterProps.setAsc) {
                                      filterProps.setAsc(newValue);
                                    } else {
                                      filterProps.asc = newValue;
                                    }
                                    if (
                                      attentionsFilterRef &&
                                      filterProps.filterType === 'bookings'
                                    ) {
                                      const filterWrapper = attentionsFilterRef;
                                      if (
                                        filterWrapper.$children &&
                                        filterWrapper.$children.length > 0
                                      ) {
                                        const filterInstance = filterWrapper.$children.find(
                                          child => {
                                            const name =
                                              child.$options?.name || child.$options?.__name;
                                            return (
                                              name === 'DashboardBookingsManagement' &&
                                              child.filtersLocation === 'slot'
                                            );
                                          }
                                        );
                                        if (filterInstance) {
                                          filterInstance.asc = newValue;
                                        }
                                      }
                                    }
                                    if (filterProps.filterType === 'bookings') {
                                      refreshBookingsContentDelayed({ asc: newValue });
                                    }
                                  }
                                "
                              />
                              <label class="form-check-label" for="asc-bookings-desktop">
                                {{ filterProps.asc ? $t('dashboard.asc') : $t('dashboard.desc') }}
                              </label>
                            </div>
                          </div>
                          <!-- Clear button -->
                          <div class="mb-3">
                            <button
                              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100"
                              @click="
                                setBookingsSkipWatch(true);
                                // Calculate default dates
                                const today = new Date().toISOString().slice(0, 10);
                                const firstOfMonth = new DateModel(today)
                                  .setDateOfMonth(1)
                                  .toString();
                                const lastOfMonth = new DateModel(firstOfMonth)
                                  .endOfMonth()
                                  .toString();
                                // Clear filter instance values
                                filterProps.clear();
                                // Pass explicit cleared values to ensure all filters are reset
                                refreshBookingsContent({
                                  status: undefined,
                                  survey: undefined,
                                  asc: true,
                                  searchText: undefined,
                                  queueId: undefined,
                                  serviceId: undefined,
                                  startDate: firstOfMonth,
                                  endDate: lastOfMonth,
                                  page: 1,
                                });
                              "
                            >
                              <i class="bi bi-eraser-fill"></i>
                              {{ $t('dashboard.clear') || 'Limpiar' }}
                            </button>
                          </div>
                        </div>
                      </template>
                    </template>
                  </DashboardAttentionsAndBookingsManagement>
                  <!-- Filters for Surveys tab -->
                  <DashboardSurveysManagement
                    v-if="state.showSurveyManagement"
                    ref="surveysFilterRef"
                    :show-survey-management="false"
                    :calculated-metrics="state.calculatedMetrics"
                    :toggles="state.toggles"
                    :commerce="commerce"
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
                              @click="handleQuickDateSelect('today', filterProps, 'surveys')"
                              :disabled="filterProps?.loading"
                            >
                              {{ $t('dashboard.today') }}
                            </button>
                          </div>
                          <div class="col-6 mb-2">
                            <button
                              class="btn btn-sm btn-dark rounded-pill w-100"
                              @click="handleQuickDateSelect('currentMonth', filterProps, 'surveys')"
                              :disabled="filterProps?.loading"
                            >
                              {{ $t('dashboard.thisMonth') }}
                            </button>
                          </div>
                          <div class="col-6 mb-2">
                            <button
                              class="btn btn-sm btn-dark rounded-pill w-100"
                              @click="handleQuickDateSelect('lastMonth', filterProps, 'surveys')"
                              :disabled="filterProps?.loading"
                            >
                              {{ $t('dashboard.lastMonth') }}
                            </button>
                          </div>
                          <div class="col-6 mb-2">
                            <button
                              class="btn btn-sm btn-dark rounded-pill w-100"
                              @click="
                                handleQuickDateSelect('lastThreeMonths', filterProps, 'surveys')
                              "
                              :disabled="filterProps?.loading"
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
                              if (filterProps.setStartDate) {
                                filterProps.setStartDate(val);
                              } else {
                                filterProps.startDate = val;
                              }
                              // Also update the filter instance directly
                              if (surveysFilterRef.value) {
                                surveysFilterRef.value.startDate = val;
                              }
                            }
                          "
                          @update:endDate="
                            val => {
                              if (filterProps.setEndDate) {
                                filterProps.setEndDate(val);
                              } else {
                                filterProps.endDate = val;
                              }
                              // Also update the filter instance directly
                              if (surveysFilterRef.value) {
                                surveysFilterRef.value.endDate = val;
                              }
                            }
                          "
                          @search="
                            // Update filter instance with current date values before refreshing
                            if (surveysFilterRef.value) {
                              surveysFilterRef.value.startDate = filterProps.startDate;
                              surveysFilterRef.value.endDate = filterProps.endDate;
                            }
                            refreshSurveysContent();
                          "
                        />
                        <!-- Additional filters -->
                        <div class="mb-3">
                          <label class="form-label fw-bold mb-2">{{
                            $t('dashboard.search') || 'Buscar'
                          }}</label>
                          <div class="d-flex gap-2">
                            <input
                              min="1"
                              max="50"
                              type="text"
                              class="form-control flex-grow-1"
                              :value="filterProps.searchText"
                              @input="
                                e => {
                                  const newValue = e.target.value;
                                  if (filterProps.setSearchText) {
                                    filterProps.setSearchText(newValue);
                                  } else {
                                    filterProps.searchText = newValue;
                                  }
                                  // Also update the filter instance directly
                                  if (surveysFilterRef.value) {
                                    surveysFilterRef.value.searchText = newValue;
                                  }
                                }
                              "
                              :placeholder="$t('dashboard.search')"
                            />
                            <button
                              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                              @click="
                                // Update filter instance with current values before refreshing
                                if (surveysFilterRef.value) {
                                  surveysFilterRef.value.searchText = filterProps.searchText;
                                  surveysFilterRef.value.startDate = filterProps.startDate;
                                  surveysFilterRef.value.endDate = filterProps.endDate;
                                }
                                refreshSurveysContent();
                              "
                              :disabled="filterProps.loading"
                              style="flex-shrink: 0"
                            >
                              <i class="bi bi-search"></i>
                            </button>
                          </div>
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
                                refreshSurveysContent();
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
                                refreshSurveysContent();
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
                        <!-- CSAT Filter (from mobile) -->
                        <div class="mb-3 filter-card">
                          <label class="form-label fw-bold mb-2">{{
                            $t('dashboard.surveysFilters.filters.rating')
                          }}</label>
                          <div class="d-flex flex-wrap gap-2 align-items-center">
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="DETRACTOR"
                              name="rating-type-surveys"
                              id="detractor-rating-surveys-tracing"
                              autocomplete="off"
                              :checked="filterProps.ratingType === 'DETRACTOR'"
                              @change="
                                filterProps.setRatingType
                                  ? filterProps.setRatingType('DETRACTOR')
                                  : (filterProps.ratingType = 'DETRACTOR');
                                refreshSurveysContent();
                              "
                            />
                            <label class="btn btn btn-sm" for="detractor-rating-surveys-tracing">
                              <i class="bi bi-star-fill red-icon"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="NEUTRO"
                              name="rating-type-surveys"
                              id="neutro-rating-surveys-tracing"
                              autocomplete="off"
                              :checked="filterProps.ratingType === 'NEUTRO'"
                              @change="
                                filterProps.setRatingType
                                  ? filterProps.setRatingType('NEUTRO')
                                  : (filterProps.ratingType = 'NEUTRO');
                                refreshSurveysContent();
                              "
                            />
                            <label class="btn btn btn-sm" for="neutro-rating-surveys-tracing">
                              <i class="bi bi-star-half yellow-icon"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="PROMOTOR"
                              name="rating-type-surveys"
                              id="promotor-rating-surveys-tracing"
                              autocomplete="off"
                              :checked="filterProps.ratingType === 'PROMOTOR'"
                              @change="
                                filterProps.setRatingType
                                  ? filterProps.setRatingType('PROMOTOR')
                                  : (filterProps.ratingType = 'PROMOTOR');
                                refreshSurveysContent();
                              "
                            />
                            <label class="btn btn btn-sm" for="promotor-rating-surveys-tracing">
                              <i class="bi bi-star-fill green-icon"></i>
                            </label>
                          </div>
                        </div>
                        <!-- NPS Filter (from mobile) -->
                        <div class="mb-3 filter-card">
                          <label class="form-label fw-bold mb-2">{{
                            $t('dashboard.surveysFilters.filters.nps')
                          }}</label>
                          <div class="d-flex flex-wrap gap-2 align-items-center">
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="DETRACTOR"
                              name="nps-type-surveys"
                              id="detractor-nps-surveys-desktop"
                              autocomplete="off"
                              :checked="filterProps.npsType === 'DETRACTOR'"
                              @change="
                                filterProps.setNpsType
                                  ? filterProps.setNpsType('DETRACTOR')
                                  : (filterProps.npsType = 'DETRACTOR');
                                refreshSurveysContent();
                              "
                            />
                            <label class="btn btn btn-sm" for="detractor-nps-surveys-desktop">
                              <i class="bi bi-emoji-frown-fill red-icon"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="NEUTRO"
                              name="nps-type-surveys"
                              id="neutro-nps-surveys-desktop"
                              autocomplete="off"
                              :checked="filterProps.npsType === 'NEUTRO'"
                              @change="
                                filterProps.setNpsType
                                  ? filterProps.setNpsType('NEUTRO')
                                  : (filterProps.npsType = 'NEUTRO');
                                refreshSurveysContent();
                              "
                            />
                            <label class="btn btn btn-sm" for="neutro-nps-surveys-desktop">
                              <i class="bi bi-emoji-neutral-fill yellow-icon"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn-check btn-sm"
                              value="PROMOTOR"
                              name="nps-type-surveys"
                              id="promotor-nps-surveys-desktop"
                              autocomplete="off"
                              :checked="filterProps.npsType === 'PROMOTOR'"
                              @change="
                                filterProps.setNpsType
                                  ? filterProps.setNpsType('PROMOTOR')
                                  : (filterProps.npsType = 'PROMOTOR');
                                refreshSurveysContent();
                              "
                            />
                            <label class="btn btn btn-sm" for="promotor-nps-surveys-desktop">
                              <i class="bi bi-emoji-smile-fill green-icon"></i>
                            </label>
                          </div>
                        </div>
                        <!-- Checkboxes (from mobile) -->
                        <div class="mb-3">
                          <div class="form-check form-switch">
                            <input
                              class="form-check-input"
                              type="checkbox"
                              :id="'contactable-surveys-' + Math.random()"
                              :checked="filterProps.contactable === true"
                              @change="
                                filterProps.checkContactable
                                  ? filterProps.checkContactable($event)
                                  : (filterProps.contactable = $event.target.checked);
                                refreshSurveysContent();
                              "
                            />
                            <label
                              class="form-check-label"
                              :for="'contactable-surveys-' + Math.random()"
                            >
                              {{ $t('dashboard.contactable') }}
                            </label>
                          </div>
                          <div class="form-check form-switch">
                            <input
                              class="form-check-input"
                              type="checkbox"
                              :id="'contacted-surveys-' + Math.random()"
                              :checked="filterProps.contacted === true"
                              @change="
                                filterProps.checkContacted
                                  ? filterProps.checkContacted($event)
                                  : (filterProps.contacted = $event.target.checked);
                                refreshSurveysContent();
                              "
                            />
                            <label
                              class="form-check-label"
                              :for="'contacted-surveys-' + Math.random()"
                            >
                              {{ $t('dashboard.contacted') }}
                            </label>
                          </div>
                        </div>
                        <!-- KeyWord Filter (from mobile) -->
                        <div
                          class="mb-3 filter-card"
                          v-if="filterProps.keyWords && filterProps.keyWords.length > 0"
                        >
                          <label class="form-label fw-bold mb-2">{{
                            $t('dashboard.keyWord') || 'Palabra Clave'
                          }}</label>
                          <div class="d-flex flex-wrap gap-2">
                            <span
                              v-for="(word, ind) in filterProps.keyWords"
                              :key="`word-${ind}`"
                              class="badge rounded-pill"
                              :class="word === filterProps.keyWord ? 'bg-primary' : 'bg-secondary'"
                              style="cursor: pointer"
                              @click="
                                filterProps.setKeyWord
                                  ? filterProps.setKeyWord(word)
                                  : (filterProps.keyWord = word);
                                refreshSurveysContent();
                              "
                            >
                              {{ word }}
                            </span>
                          </div>
                        </div>
                        <!-- Clear button -->
                        <div class="mb-3">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100"
                            @click="
                              filterProps.clear();
                              refreshSurveysContent();
                            "
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
                <div class="row col mx-1 mt-3 mb-1 tabs-header-divider">
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
                  <div class="col-12 mt-3">
                    <div id="title" class="metric-title">
                      <span>
                        {{ $t(currentMainTitle) }}
                        <span v-if="currentSubsection" class="metric-subsection">
                          / {{ $t(currentSubsection) }}
                        </span>
                      </span>
                    </div>
                    <div v-if="state.startDate && state.endDate" id="sub-title" class="metric-subtitle">
                      ({{ $t('dashboard.dates.from') }} <strong>{{ formatDateDisplay(state.startDate) }}</strong>
                      {{ $t('dashboard.dates.to') }} <strong>{{ formatDateDisplay(state.endDate) }}</strong>)
                    </div>
                  </div>
                </div>
                <div>
                  <DashboardClientsManagement
                    ref="clientsContentRef"
                    :show-client-management="state.showClients"
                    :toggles="state.toggles"
                    :commerce="commerce"
                    :queues="state.queues"
                    :commerces="selectedCommerces"
                    :business="state.business"
                    :services="state.services"
                    filters-location="slot"
                    :client-details-opened="false"
                  >
                  </DashboardClientsManagement>
                  <DashboardAttentionsAndBookingsManagement
                    ref="attentionsContentRef"
                    :show-attention-management="state.showAttentions"
                    :toggles="state.toggles"
                    :commerce="commerce"
                    :queues="state.queues"
                    :commerces="selectedCommerces"
                    :services="state.services"
                    filters-location="slot"
                    @subsection-changed="handleAttentionsSubsectionChanged"
                    @tab-changed="handleAttentionsTabChanged"
                  >
                  </DashboardAttentionsAndBookingsManagement>
                  <DashboardSurveysManagement
                    ref="surveysContentRef"
                    :show-survey-management="state.showSurveyManagement"
                    :calculated-metrics="state.calculatedMetrics"
                    :toggles="state.toggles"
                    :commerce="commerce"
                    :queues="state.queues"
                    :commerces="selectedCommerces"
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

.metric-subsection {
  font-size: 1.1rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.65);
  margin-left: 0.5rem;
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
/* Filter icon buttons - no borders, no background */
.btn btn-sm {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0.25rem 0.5rem;
}
.btn btn-sm:hover,
.btn btn-sm:focus,
.btn btn-sm:active {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}
.btn btn-sm i {
  font-size: 1.2rem;
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
