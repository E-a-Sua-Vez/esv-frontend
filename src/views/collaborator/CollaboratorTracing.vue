<script>
import { ref, reactive, onBeforeMount, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getMetrics } from '../../application/services/query-stack';
import { getCommerceById } from '../../application/services/commerce';
import { getPermissions } from '../../application/services/permissions';
import { getCollaboratorById } from '../../application/services/collaborator';
import { getGroupedQueueByCommerceId } from '../../application/services/queue';
import { getServiceByCommerce } from '../../application/services/service';
import { getActiveFeature } from '../../shared/features';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import DashboardSurveysManagement from '../../components/dashboard/DashboardSurveysManagement.vue';
import DashboardAttentionsManagement from '../../components/attentions/DashboardAttentionsManagement.vue';
import DashboardClientsManagement from '../../components/clients/DashboardClientsManagement.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DashboardAttentionsAndBookingsManagement from '../../components/attentions/DashboardAttentionsAndBookingsManagement.vue';
import DesktopContentLayout from '../../components/common/desktop/DesktopContentLayout.vue';
import DesktopFiltersPanel from '../../components/common/desktop/DesktopFiltersPanel.vue';
import DateRangeFilters from '../../components/common/desktop/DateRangeFilters.vue';
import Popper from 'vue3-popper';
import { DateModel } from '../../shared/utils/date.model';

export default {
  name: 'CollaboratorTracing',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    DashboardSurveysManagement,
    DashboardAttentionsManagement,
    DashboardClientsManagement,
    ComponentMenu,
    DashboardAttentionsAndBookingsManagement,
    DesktopContentLayout,
    DesktopFiltersPanel,
    DateRangeFilters,
    Popper,
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
    const surveysFilterRef = ref(null);
    const surveysContentRef = ref(null);

    // Refs for timeout management
    const timeoutRefClients = ref(null);
    const timeoutRefAttentions = ref(null);
    const timeoutRefSurveys = ref(null);

    // Generate unique IDs for filter elements
    const filterIds = {
      clientsDaysSinceEarly: `clients-early-since-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      clientsDaysSinceMedium: `clients-medium-since-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      clientsDaysSinceLate: `clients-late-since-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      clientsDaysContactedEarly: `clients-early-contacted-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      clientsDaysContactedMedium: `clients-medium-contacted-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      clientsDaysContactedLate: `clients-late-contacted-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      clientsContactable: `clients-contactable-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      clientsContacted: `clients-contacted-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      clientsSurvey: `clients-survey-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      clientsAsc: `clients-asc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      attentionsDaysSinceEarly: `attentions-early-since-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      attentionsDaysSinceMedium: `attentions-medium-since-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      attentionsDaysSinceLate: `attentions-late-since-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      attentionsContactInterested: `attentions-interested-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      attentionsContactLater: `attentions-contact-later-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      attentionsContactRejected: `attentions-rejected-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      attentionsContactable: `attentions-contactable-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      attentionsContacted: `attentions-contacted-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      attentionsSurvey: `attentions-survey-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      attentionsAsc: `attentions-asc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

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

    // Use global commerce and module from store
    const commerce = computed(() => store.getCurrentCommerce);
    const module = computed(() => store.getCurrentModule);

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      selectedCommerces: ref([]),
      queues: ref([]),
      services: ref([]),
      queue: {},
      collaborator: {},
      dateType: 'month',
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
    });

    const loadCommerceData = async () => {
      if (!commerce.value || !commerce.value.id) {
        state.queues = [];
        state.services = [];
        state.selectedCommerces = [];
        return;
      }
      try {
        // Use queues from store if available, otherwise fetch
        if (commerce.value.queues && commerce.value.queues.length > 0) {
          state.queues = commerce.value.queues;
        } else {
          const commerceData = await getCommerceById(commerce.value.id);
          state.queues = commerceData.queues || [];
          // Update store with full commerce data
          if (commerceData && commerceData.id) {
            await store.setCurrentCommerce(commerceData);
          }
        }
        state.services = await getServiceByCommerce(commerce.value.id);
        state.selectedCommerces = [commerce.value];
        if (getActiveFeature(commerce.value, 'attention-queue-typegrouped', 'PRODUCT')) {
          state.groupedQueues = await getGroupedQueueByCommerceId(commerce.value.id);
          if (
            Object.keys(state.groupedQueues).length > 0 &&
            state.collaborator.type === 'STANDARD'
          ) {
            const collaboratorQueues = state.groupedQueues['COLLABORATOR'].filter(
              queue => queue.collaboratorId === state.collaborator.id
            );
            const otherQueues = state.queues.filter(queue => queue.type !== 'COLLABORATOR');
            const queues = [...collaboratorQueues, ...otherQueues];
            state.queues = queues;
          }
        }
      } catch (error) {
      }
    };

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = store.getCurrentUser;
        state.collaborator = state.currentUser;
        if (!state.collaborator || !state.collaborator.id) {
          state.collaborator = await getCollaboratorById(state.currentUser.id);
        }
        // Set initial commerce if not set - check both commerceId and commercesId
        if (!commerce.value || !commerce.value.id) {
          // First try commerceId (single commerce)
          if (state.collaborator.commerceId) {
            const initialCommerce = await getCommerceById(state.collaborator.commerceId);
            if (initialCommerce && initialCommerce.id) {
              await store.setCurrentCommerce(initialCommerce);
            }
          }
          // If still no commerce, try commercesId (multiple commerces)
          if (
            (!commerce.value || !commerce.value.id) &&
            state.collaborator.commercesId &&
            state.collaborator.commercesId.length > 0
          ) {
            const firstCommerceId = state.collaborator.commercesId[0];
            if (firstCommerceId) {
              const initialCommerce = await getCommerceById(firstCommerceId);
              if (initialCommerce && initialCommerce.id) {
                await store.setCurrentCommerce(initialCommerce);
              }
            }
          }
        }
        await loadCommerceData();
        state.toggles = await getPermissions('dashboard');
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    // Watch for commerce changes
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (!newCommerce || !newCommerce.id) return;
        if (oldCommerce && oldCommerce.id === newCommerce.id) return;
        try {
          loading.value = true;
          // Clear data
          state.queues = [];
          state.services = [];
          state.selectedCommerces = [];
          state.calculatedMetrics = {
            'attention.created': attentionCreated,
            'survey.created': surveyCreated,
            'notification.created': notificationCreated,
          };
          await loadCommerceData();
          loading.value = false;
        } catch (error) {
          loading.value = false;
        }
      },
      { deep: true }
    );

    // Watch for module changes
    watch(
      module,
      async (newModule, oldModule) => {
        if (oldModule && oldModule.id === newModule?.id) return;
        try {
          loading.value = true;
          // Clear data
          state.calculatedMetrics = {
            'attention.created': attentionCreated,
            'survey.created': surveyCreated,
            'notification.created': notificationCreated,
          };
          loading.value = false;
        } catch (error) {
          loading.value = false;
        }
      },
      { deep: true }
    );

    const isActiveBusiness = () => commerce.value && commerce.value.active === true;

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

    const handleCommerceChanged = async commerce => {
      // Commerce is now managed globally
      if (commerce && commerce.id && commerce.id !== 'ALL') {
        await store.setCurrentCommerce(commerce);
      }
    };

    // Computed for selected commerces
    const selectedCommerces = computed(() =>
      commerce.value && commerce.value.id ? [commerce.value] : []
    );

    // Filter synchronization functions - simplified versions
    const refreshClientsContent = (filterPropsOverride = null) => {
      nextTick(() => {
        nextTick(() => {
          if (clientsFilterRef.value && clientsContentRef.value) {
            const filterInstance = clientsFilterRef.value;
            const contentInstance = clientsContentRef.value;
            if (!filterInstance || !contentInstance) return;

            contentInstance.clients = [];
            contentInstance.counter = 0;
            contentInstance.totalPages = 0;
            contentInstance._skipWatch = true;
            contentInstance.page = 1;

            // Sync filter properties
            const getValue = key => {
              if (
                filterPropsOverride &&
                key in filterPropsOverride &&
                filterPropsOverride[key] !== undefined &&
                filterPropsOverride[key] !== null
              ) {
                return filterPropsOverride[key];
              }
              return filterInstance[key];
            };

            contentInstance.daysSinceType = getValue('daysSinceType');
            contentInstance.daysSinceContacted = getValue('daysSinceContacted');
            contentInstance.contactResultType = getValue('contactResultType');
            contentInstance.contactable = getValue('contactable');
            contentInstance.contacted = getValue('contacted');
            contentInstance.survey = getValue('survey');
            contentInstance.asc = getValue('asc') !== undefined ? getValue('asc') : true;
            const searchTextValue = getValue('searchText');
            contentInstance.searchText =
              searchTextValue !== null && searchTextValue !== undefined
                ? searchTextValue
                : undefined;
            const queueIdValue = getValue('queueId');
            contentInstance.queueId =
              queueIdValue !== undefined && queueIdValue !== '' ? queueIdValue : undefined;
            const serviceIdValue = getValue('serviceId');
            contentInstance.serviceId =
              serviceIdValue !== undefined && serviceIdValue !== '' ? serviceIdValue : undefined;

            const startDateValue = getValue('startDate');
            const newStartDate =
              startDateValue !== undefined && startDateValue !== null && startDateValue !== ''
                ? String(startDateValue).trim()
                : undefined;
            const endDateValue = getValue('endDate');
            const newEndDate =
              endDateValue !== undefined && endDateValue !== null && endDateValue !== ''
                ? String(endDateValue).trim()
                : undefined;

            contentInstance.startDate = newStartDate;
            contentInstance.endDate = newEndDate;
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

    const refreshClientsContentDelayed = (filterPropsOverride = null, delay = 50) => {
      if (timeoutRefClients.value) {
        clearTimeout(timeoutRefClients.value);
      }
      timeoutRefClients.value = setTimeout(() => {
        refreshClientsContent(filterPropsOverride);
        timeoutRefClients.value = null;
      }, delay);
    };

    // Refresh function for attentions content
    const refreshAttentionsContent = (filterPropsOverride = null) => {
      nextTick(() => {
        nextTick(() => {
          if (attentionsFilterRef.value && attentionsContentRef.value) {
            const wrapperInstance = attentionsContentRef.value;
            const contentInstance = wrapperInstance.$refs?.attentionsManagement;

            if (!contentInstance) return;

            // Get filter instance
            let filterInstance = null;
            const filterWrapper = attentionsFilterRef.value;
            if (filterWrapper && filterWrapper.$children && filterWrapper.$children.length > 0) {
              filterInstance = filterWrapper.$children.find(child => {
                const name = child.$options?.name || child.$options?.__name;
                return name === 'DashboardAttentionsManagement' && child.filtersLocation === 'slot';
              });
            }

            if (!filterInstance) filterInstance = contentInstance;

            contentInstance.attentions = [];
            contentInstance.counter = 0;
            contentInstance.totalPages = 0;
            contentInstance._skipWatch = true;
            contentInstance.page = 1;

            const getValue = key => {
              if (
                filterPropsOverride &&
                key in filterPropsOverride &&
                filterPropsOverride[key] !== undefined &&
                filterPropsOverride[key] !== null
              ) {
                return filterPropsOverride[key];
              }
              return filterInstance && filterInstance[key] !== undefined
                ? filterInstance[key]
                : contentInstance[key] !== undefined
                ? contentInstance[key]
                : undefined;
            };

            const startDateValue = getValue('startDate');
            const newStartDate =
              startDateValue !== undefined && startDateValue !== null && startDateValue !== ''
                ? String(startDateValue).trim()
                : undefined;
            const endDateValue = getValue('endDate');
            const newEndDate =
              endDateValue !== undefined && endDateValue !== null && endDateValue !== ''
                ? String(endDateValue).trim()
                : undefined;

            contentInstance.startDate = newStartDate;
            contentInstance.endDate = newEndDate;
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

    const refreshAttentionsContentDelayed = (filterPropsOverride = null, delay = 50) => {
      if (timeoutRefAttentions.value) {
        clearTimeout(timeoutRefAttentions.value);
      }
      timeoutRefAttentions.value = setTimeout(() => {
        refreshAttentionsContent(filterPropsOverride);
        timeoutRefAttentions.value = null;
      }, delay);
    };

    const refreshSurveysContent = () => {
      nextTick(() => {
        nextTick(() => {
          if (surveysFilterRef.value && surveysContentRef.value) {
            const filterInstance = surveysFilterRef.value;
            const contentInstance = surveysContentRef.value;
            if (!filterInstance || !contentInstance) return;

            contentInstance.surveys = [];
            contentInstance.counter = 0;
            contentInstance.totalPages = 0;
            contentInstance._skipWatch = true;
            contentInstance.page = 1;
            contentInstance.ratingType = filterInstance.ratingType;
            contentInstance.npsType = filterInstance.npsType;
            contentInstance.contactable = filterInstance.contactable;
            contentInstance.contacted = filterInstance.contacted;
            contentInstance.keyWord = filterInstance.keyWord;
            contentInstance.searchText =
              filterInstance.searchText !== null && filterInstance.searchText !== undefined
                ? filterInstance.searchText
                : undefined;
            contentInstance.queueId =
              filterInstance.queueId !== undefined && filterInstance.queueId !== ''
                ? filterInstance.queueId
                : undefined;
            contentInstance.serviceId =
              filterInstance.serviceId !== undefined && filterInstance.serviceId !== ''
                ? filterInstance.serviceId
                : undefined;

            const newStartDate =
              filterInstance.startDate !== undefined &&
              filterInstance.startDate !== null &&
              filterInstance.startDate !== ''
                ? String(filterInstance.startDate).trim()
                : undefined;
            const newEndDate =
              filterInstance.endDate !== undefined &&
              filterInstance.endDate !== null &&
              filterInstance.endDate !== ''
                ? String(filterInstance.endDate).trim()
                : undefined;

            contentInstance.startDate = newStartDate;
            contentInstance.endDate = newEndDate;
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

    const refreshSurveysContentDelayed = (filterPropsOverride = null, delay = 50) => {
      if (timeoutRefSurveys.value) {
        clearTimeout(timeoutRefSurveys.value);
      }
      timeoutRefSurveys.value = setTimeout(() => {
        if (filterPropsOverride && surveysFilterRef.value) {
          // Apply filter overrides to filter instance
          if (filterPropsOverride.searchText !== undefined) {
            surveysFilterRef.value.searchText = filterPropsOverride.searchText;
          }
          if (filterPropsOverride.queueId !== undefined) {
            surveysFilterRef.value.queueId = filterPropsOverride.queueId;
          }
          if (filterPropsOverride.serviceId !== undefined) {
            surveysFilterRef.value.serviceId = filterPropsOverride.serviceId;
          }
          if (filterPropsOverride.ratingType !== undefined) {
            surveysFilterRef.value.ratingType = filterPropsOverride.ratingType;
          }
          if (filterPropsOverride.npsType !== undefined) {
            surveysFilterRef.value.npsType = filterPropsOverride.npsType;
          }
          if (filterPropsOverride.contactable !== undefined) {
            surveysFilterRef.value.contactable = filterPropsOverride.contactable;
          }
          if (filterPropsOverride.contacted !== undefined) {
            surveysFilterRef.value.contacted = filterPropsOverride.contacted;
          }
          if (filterPropsOverride.startDate !== undefined) {
            surveysFilterRef.value.startDate = filterPropsOverride.startDate;
          }
          if (filterPropsOverride.endDate !== undefined) {
            surveysFilterRef.value.endDate = filterPropsOverride.endDate;
          }
        }
        refreshSurveysContent();
        timeoutRefSurveys.value = null;
      }, delay);
    };

    return {
      state,
      loading,
      alertError,
      goBack,
      isActiveBusiness,
      showAttentions,
      showSurveys,
      getLocalHour,
      showClients,
      commerce,
      module,
      selectedCommerces,
      handleFiltersToggle,
      handleCommerceChanged,
      refreshClientsContent,
      refreshClientsContentDelayed,
      refreshAttentionsContent,
      refreshAttentionsContentDelayed,
      refreshSurveysContent,
      refreshSurveysContentDelayed,
      clientsFilterRef,
      clientsContentRef,
      attentionsFilterRef,
      attentionsContentRef,
      surveysFilterRef,
      surveysContentRef,
      filterIds,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo :src="commerce?.logo" :loading="loading"></CommerceLogo>
        <ComponentMenu
          :title="$t(`dashboard.tracing.title`)"
          :toggles="state.toggles"
          component-name="dashboard"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="centered">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="tracing">
          <div v-if="isActiveBusiness()">
            <div v-if="(!commerce || !commerce.id) && !loading" class="control-box">
              <Message
                :title="$t('dashboard.message.3.title')"
                :content="$t('dashboard.message.3.content')"
              />
            </div>
            <div v-else-if="commerce && commerce.id && !loading" class="control-box">
              <div id="dashboard-controls">
                <div class="row"></div>
              </div>
            </div>
            <div v-if="!loading && commerce && commerce.id" id="tracing-result" class="mt-2">
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
                >
                </DashboardClientsManagement>
                <DashboardAttentionsAndBookingsManagement
                  :show-attention-management="state.showAttentions"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :queues="state.queues"
                  :commerces="selectedCommerces"
                  :services="state.services"
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
              <div id="commerce-logo-desktop">
                <img
                  v-if="!loading && commerce?.logo"
                  class="rounded img-fluid logo-desktop"
                  :alt="$t('logoAlt')"
                  :src="commerce?.logo || $t('hubLogoBlanco')"
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
        <div id="tracing" v-if="isActiveBusiness()">
          <div v-if="(!commerce || !commerce.id) && !loading" class="control-box">
            <Message
              :title="$t('dashboard.message.3.title')"
              :content="$t('dashboard.message.3.content')"
            />
          </div>
          <DesktopContentLayout
            v-else-if="commerce && commerce.id && !loading"
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
                  <!-- Filters for Clients tab -->
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
                    ref="clientsFilterRef"
                  >
                    <template #filters-exposed="filterProps">
                      <div class="filters-content-wrapper">
                        <!-- Date quick buttons -->
                        <div class="row my-2">
                          <div class="col-6 mb-2">
                            <button
                              class="btn btn-sm btn-dark rounded-pill w-100"
                              @click="
                                const today = new Date().toISOString().slice(0, 10);
                                const [year, month, day] = today.split('-');
                                const startDate = `${year}-${month}-${day}`;
                                const endDate = `${year}-${month}-${day}`;
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
                                if (clientsFilterRef.value) {
                                  clientsFilterRef.value.startDate = startDate;
                                  clientsFilterRef.value.endDate = endDate;
                                }
                                if (filterProps.getToday) filterProps.getToday();
                                refreshClientsContentDelayed({ startDate, endDate });
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
                                const today = new Date().toISOString().slice(0, 10);
                                const [year, month, day] = today.split('-');
                                const startDate = `${year}-${month}-01`;
                                const endDate = `${year}-${month}-${day}`;
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
                                if (clientsFilterRef.value) {
                                  clientsFilterRef.value.startDate = startDate;
                                  clientsFilterRef.value.endDate = endDate;
                                }
                                if (filterProps.getCurrentMonth) filterProps.getCurrentMonth();
                                refreshClientsContentDelayed({ startDate, endDate });
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
                                const today = new Date().toISOString().slice(0, 10);
                                const startDate = new DateModel(today)
                                  .substractMonths(1)
                                  .toString();
                                const endDate = new DateModel(startDate).endOfMonth().toString();
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
                                if (clientsFilterRef.value) {
                                  clientsFilterRef.value.startDate = startDate;
                                  clientsFilterRef.value.endDate = endDate;
                                }
                                if (filterProps.getLastMonth) filterProps.getLastMonth();
                                refreshClientsContentDelayed({ startDate, endDate });
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
                                const today = new Date().toISOString().slice(0, 10);
                                const startDate = new DateModel(today)
                                  .substractMonths(3)
                                  .toString();
                                const endDate = new DateModel(today)
                                  .substractMonths(1)
                                  .endOfMonth()
                                  .toString();
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
                                if (clientsFilterRef.value) {
                                  clientsFilterRef.value.startDate = startDate;
                                  clientsFilterRef.value.endDate = endDate;
                                }
                                if (filterProps.getLastThreeMonths)
                                  filterProps.getLastThreeMonths();
                                refreshClientsContentDelayed({ startDate, endDate });
                              "
                              :disabled="filterProps.loading"
                            >
                              {{ $t('dashboard.lastThreeMonths') }}
                            </button>
                          </div>
                        </div>
                        <!-- Date Range Filters -->
                        <DateRangeFilters
                          :start-date="filterProps.startDate"
                          :end-date="filterProps.endDate"
                          :show-quick-buttons="false"
                          :disabled="filterProps.loading"
                          :show-search-button="false"
                          @update:startDate="
                            val => {
                              if (filterProps.setStartDate) {
                                filterProps.setStartDate(val);
                              } else {
                                filterProps.startDate = val;
                              }
                              if (clientsFilterRef.value) {
                                clientsFilterRef.value.startDate = val;
                              }
                              refreshClientsContentDelayed({
                                startDate: val,
                                endDate: filterProps.endDate,
                              });
                            }
                          "
                          @update:endDate="
                            val => {
                              if (filterProps.setEndDate) {
                                filterProps.setEndDate(val);
                              } else {
                                filterProps.endDate = val;
                              }
                              if (clientsFilterRef.value) {
                                clientsFilterRef.value.endDate = val;
                              }
                              refreshClientsContentDelayed({
                                startDate: filterProps.startDate,
                                endDate: val,
                              });
                            }
                          "
                        />
                        <!-- Search filter -->
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
                                  if (filterProps.setSearchText) {
                                    filterProps.setSearchText(newValue);
                                  } else {
                                    filterProps.searchText = newValue;
                                  }
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
                        <!-- Queue filter -->
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
                                if (clientsFilterRef.value) {
                                  clientsFilterRef.value.queueId = newQueueId || undefined;
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
                        <!-- Service filter -->
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
                                if (clientsFilterRef.value) {
                                  clientsFilterRef.value.serviceId = newServiceId || undefined;
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
                        <!-- Days Since Type radio buttons -->
                        <div class="col-12 col-md my-1 filter-card mb-3">
                          <input
                            type="radio"
                            class="btn btn-check btn-sm"
                            :checked="filterProps.daysSinceType === 'EARLY'"
                            value="EARLY"
                            name="clients-daysSince-type"
                            :id="`clients-early-since-${Date.now()}`"
                            autocomplete="off"
                            @change="
                              e => {
                                const newDaysSinceType = e.target.checked ? 'EARLY' : undefined;
                                if (clientsFilterRef.value) {
                                  clientsFilterRef.value.daysSinceType = newDaysSinceType;
                                }
                                refreshClientsContentDelayed({ daysSinceType: newDaysSinceType });
                              }
                            "
                          />
                          <label class="btn" :for="`clients-early-since-${Date.now()}`">
                            <i :class="`bi bi-qr-code green-icon`"></i>
                          </label>
                          <input
                            type="radio"
                            class="btn btn-check btn-sm"
                            :checked="filterProps.daysSinceType === 'MEDIUM'"
                            value="MEDIUM"
                            name="clients-daysSince-type"
                            :id="`clients-medium-since-${Date.now()}`"
                            autocomplete="off"
                            @change="
                              e => {
                                const newDaysSinceType = e.target.checked ? 'MEDIUM' : undefined;
                                if (clientsFilterRef.value) {
                                  clientsFilterRef.value.daysSinceType = newDaysSinceType;
                                }
                                refreshClientsContentDelayed({ daysSinceType: newDaysSinceType });
                              }
                            "
                          />
                          <label class="btn" :for="`clients-medium-since-${Date.now()}`">
                            <i :class="`bi bi-qr-code yellow-icon`"></i>
                          </label>
                          <input
                            type="radio"
                            class="btn btn-check btn-sm"
                            :checked="filterProps.daysSinceType === 'LATE'"
                            value="LATE"
                            name="clients-daysSince-type"
                            :id="`clients-late-since-${Date.now()}`"
                            autocomplete="off"
                            @change="
                              e => {
                                const newDaysSinceType = e.target.checked ? 'LATE' : undefined;
                                if (clientsFilterRef.value) {
                                  clientsFilterRef.value.daysSinceType = newDaysSinceType;
                                }
                                refreshClientsContentDelayed({ daysSinceType: newDaysSinceType });
                              }
                            "
                          />
                          <label class="btn" :for="`clients-late-since-${Date.now()}`">
                            <i :class="`bi bi-qr-code red-icon`"></i>
                          </label>
                          <Popper
                            :key="`clients-days-since-popper`"
                            :class="'dark'"
                            arrow
                            disable-click-away
                            hover
                            :content="$t(`dashboard.tracing.filters.attention`)"
                          >
                            <i class="bi bi-info-circle-fill h7 m-2"></i>
                          </Popper>
                        </div>
                        <!-- Days Since Contacted radio buttons -->
                        <div class="col-12 col-md my-1 filter-card mb-3">
                          <input
                            type="radio"
                            class="btn btn-check btn-sm"
                            :checked="filterProps.daysSinceContacted === 'EARLY'"
                            value="EARLY"
                            name="clients-daysContacted-type"
                            :id="`clients-early-contacted-${Date.now()}`"
                            autocomplete="off"
                            @change="
                              e => {
                                const newDaysSinceContacted = e.target.checked
                                  ? 'EARLY'
                                  : undefined;
                                if (clientsFilterRef.value) {
                                  clientsFilterRef.value.daysSinceContacted = newDaysSinceContacted;
                                }
                                refreshClientsContentDelayed({
                                  daysSinceContacted: newDaysSinceContacted,
                                });
                              }
                            "
                          />
                          <label class="btn" :for="`clients-early-contacted-${Date.now()}`">
                            <i :class="`bi bi-chat-left-dots-fill green-icon`"></i>
                          </label>
                          <input
                            type="radio"
                            class="btn btn-check btn-sm"
                            :checked="filterProps.daysSinceContacted === 'MEDIUM'"
                            value="MEDIUM"
                            name="clients-daysContacted-type"
                            :id="`clients-medium-contacted-${Date.now()}`"
                            autocomplete="off"
                            @change="
                              e => {
                                const newDaysSinceContacted = e.target.checked
                                  ? 'MEDIUM'
                                  : undefined;
                                if (clientsFilterRef.value) {
                                  clientsFilterRef.value.daysSinceContacted = newDaysSinceContacted;
                                }
                                refreshClientsContentDelayed({
                                  daysSinceContacted: newDaysSinceContacted,
                                });
                              }
                            "
                          />
                          <label class="btn" :for="`clients-medium-contacted-${Date.now()}`">
                            <i :class="`bi bi-chat-left-dots-fill yellow-icon`"></i>
                          </label>
                          <input
                            type="radio"
                            class="btn btn-check btn-sm"
                            :checked="filterProps.daysSinceContacted === 'LATE'"
                            value="LATE"
                            name="clients-daysContacted-type"
                            :id="`clients-late-contacted-${Date.now()}`"
                            autocomplete="off"
                            @change="
                              e => {
                                const newDaysSinceContacted = e.target.checked ? 'LATE' : undefined;
                                if (clientsFilterRef.value) {
                                  clientsFilterRef.value.daysSinceContacted = newDaysSinceContacted;
                                }
                                refreshClientsContentDelayed({
                                  daysSinceContacted: newDaysSinceContacted,
                                });
                              }
                            "
                          />
                          <label class="btn" :for="`clients-late-contacted-${Date.now()}`">
                            <i :class="`bi bi-chat-left-dots-fill red-icon`"></i>
                          </label>
                          <Popper
                            :key="`clients-days-contacted-popper`"
                            :class="'dark'"
                            arrow
                            disable-click-away
                            hover
                            :content="$t(`dashboard.tracing.filters.contact`)"
                          >
                            <i class="bi bi-info-circle-fill h7 m-2"></i>
                          </Popper>
                        </div>
                        <!-- Contactable, Contacted, Survey, Asc checkboxes -->
                        <div class="row">
                          <div class="col-12 col-md-6">
                            <div class="form-check form-switch centered">
                              <input
                                class="form-check-input m-1"
                                :class="filterProps.contactable === false ? 'bg-danger' : ''"
                                type="checkbox"
                                :id="`clients-contactable-${Date.now()}`"
                                :checked="filterProps.contactable === true"
                                @click="
                                  e => {
                                    const newContactable = e.target.checked ? true : undefined;
                                    if (filterProps.checkContactable) {
                                      filterProps.checkContactable(e);
                                    } else if (clientsFilterRef.value) {
                                      clientsFilterRef.value.contactable = newContactable;
                                    }
                                    refreshClientsContentDelayed({ contactable: newContactable });
                                  }
                                "
                              />
                              <label
                                class="form-check-label metric-card-subtitle"
                                :for="`clients-contactable-${Date.now()}`"
                              >
                                {{ $t('dashboard.contactable') }}
                              </label>
                            </div>
                          </div>
                          <div class="col-12 col-md-6">
                            <div class="form-check form-switch centered">
                              <input
                                class="form-check-input m-1"
                                :class="filterProps.contacted === false ? 'bg-danger' : ''"
                                type="checkbox"
                                :id="`clients-contacted-${Date.now()}`"
                                :checked="filterProps.contacted === true"
                                @click="
                                  e => {
                                    const newContacted = e.target.checked ? true : undefined;
                                    if (filterProps.checkContacted) {
                                      filterProps.checkContacted(e);
                                    } else if (clientsFilterRef.value) {
                                      clientsFilterRef.value.contacted = newContacted;
                                    }
                                    refreshClientsContentDelayed({ contacted: newContacted });
                                  }
                                "
                              />
                              <label
                                class="form-check-label metric-card-subtitle"
                                :for="`clients-contacted-${Date.now()}`"
                              >
                                {{ $t('dashboard.contacted') }}
                              </label>
                            </div>
                          </div>
                        </div>
                        <div class="row">
                          <div class="col-12 col-md-6">
                            <div class="form-check form-switch centered">
                              <input
                                class="form-check-input m-1"
                                :class="filterProps.survey === false ? 'bg-danger' : ''"
                                type="checkbox"
                                :id="`clients-survey-${Date.now()}`"
                                :checked="filterProps.survey === true"
                                @click="
                                  e => {
                                    const newSurvey = e.target.checked ? true : undefined;
                                    if (filterProps.checkSurvey) {
                                      filterProps.checkSurvey(e);
                                    } else if (clientsFilterRef.value) {
                                      clientsFilterRef.value.survey = newSurvey;
                                    }
                                    refreshClientsContentDelayed({ survey: newSurvey });
                                  }
                                "
                              />
                              <label
                                class="form-check-label metric-card-subtitle"
                                :for="`clients-survey-${Date.now()}`"
                              >
                                {{ $t('dashboard.survey') }}
                              </label>
                            </div>
                          </div>
                          <div class="col-12 col-md-6">
                            <div class="form-check form-switch centered">
                              <input
                                class="form-check-input m-1"
                                :class="filterProps.asc === false ? 'bg-danger' : ''"
                                type="checkbox"
                                :id="`clients-asc-${Date.now()}`"
                                :checked="filterProps.asc === true"
                                @click="
                                  e => {
                                    const newAsc = e.target.checked ? true : false;
                                    if (filterProps.checkAsc) {
                                      filterProps.checkAsc(e);
                                    } else if (clientsFilterRef.value) {
                                      clientsFilterRef.value.asc = newAsc;
                                    }
                                    refreshClientsContentDelayed({ asc: newAsc });
                                  }
                                "
                              />
                              <label
                                class="form-check-label metric-card-subtitle"
                                :for="`clients-asc-${Date.now()}`"
                              >
                                {{ filterProps.asc ? $t('dashboard.asc') : $t('dashboard.desc') }}
                              </label>
                            </div>
                          </div>
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
                      <template v-if="filterProps.filterType === 'attentions'">
                        <div class="filters-content-wrapper">
                          <!-- Date quick buttons -->
                          <div class="row my-2">
                            <div class="col-6 mb-2">
                              <button
                                class="btn btn-sm btn-dark rounded-pill w-100"
                                @click="
                                  const today = new Date().toISOString().slice(0, 10);
                                  const [year, month, day] = today.split('-');
                                  const startDate = `${year}-${month}-${day}`;
                                  const endDate = `${year}-${month}-${day}`;
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
                                  if (filterProps.getToday) filterProps.getToday();
                                  refreshAttentionsContentDelayed({ startDate, endDate });
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
                                  const today = new Date().toISOString().slice(0, 10);
                                  const [year, month, day] = today.split('-');
                                  const startDate = `${year}-${month}-01`;
                                  const endDate = `${year}-${month}-${day}`;
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
                                  if (filterProps.getCurrentMonth) filterProps.getCurrentMonth();
                                  refreshAttentionsContentDelayed({ startDate, endDate });
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
                                  const today = new Date().toISOString().slice(0, 10);
                                  const startDate = new DateModel(today)
                                    .substractMonths(1)
                                    .toString();
                                  const endDate = new DateModel(startDate).endOfMonth().toString();
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
                                  if (filterProps.getLastMonth) filterProps.getLastMonth();
                                  refreshAttentionsContentDelayed({ startDate, endDate });
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
                                  const today = new Date().toISOString().slice(0, 10);
                                  const startDate = new DateModel(today)
                                    .substractMonths(3)
                                    .toString();
                                  const endDate = new DateModel(today)
                                    .substractMonths(1)
                                    .endOfMonth()
                                    .toString();
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
                                  if (filterProps.getLastThreeMonths)
                                    filterProps.getLastThreeMonths();
                                  refreshAttentionsContentDelayed({ startDate, endDate });
                                "
                                :disabled="filterProps.loading"
                              >
                                {{ $t('dashboard.lastThreeMonths') }}
                              </button>
                            </div>
                          </div>
                          <!-- Date Range Filters -->
                          <DateRangeFilters
                            :start-date="filterProps.startDate"
                            :end-date="filterProps.endDate"
                            :show-quick-buttons="false"
                            :disabled="filterProps.loading"
                            :show-search-button="false"
                            @update:startDate="
                              val => {
                                if (filterProps.setStartDate) {
                                  filterProps.setStartDate(val);
                                } else {
                                  filterProps.startDate = val;
                                }
                                if (attentionsFilterRef.value) {
                                  const filterWrapper = attentionsFilterRef.value;
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
                                }
                                refreshAttentionsContentDelayed({
                                  startDate: val,
                                  endDate: filterProps.endDate,
                                });
                              }
                            "
                            @update:endDate="
                              val => {
                                if (filterProps.setEndDate) {
                                  filterProps.setEndDate(val);
                                } else {
                                  filterProps.endDate = val;
                                }
                                if (attentionsFilterRef.value) {
                                  const filterWrapper = attentionsFilterRef.value;
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
                                }
                                refreshAttentionsContentDelayed({
                                  startDate: filterProps.startDate,
                                  endDate: val,
                                });
                              }
                            "
                          />
                          <!-- Search filter -->
                          <div class="mb-3" v-if="filterProps.filterType === 'attentions'">
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
                                    if (filterProps.setSearchText) {
                                      filterProps.setSearchText(newValue);
                                    } else {
                                      filterProps.searchText = newValue;
                                    }
                                  }
                                "
                                :placeholder="$t('dashboard.search')"
                              />
                              <button
                                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                                @click="
                                  refreshAttentionsContentDelayed({
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
                          <!-- Queue filter -->
                          <div
                            class="mb-3"
                            v-if="
                              filterProps.filterType === 'attentions' &&
                              filterProps.queues &&
                              filterProps.queues.length > 1
                            "
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
                                  refreshAttentionsContentDelayed({
                                    queueId: newQueueId || undefined,
                                  });
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
                          <!-- Service filter -->
                          <div
                            class="mb-3"
                            v-if="
                              filterProps.filterType === 'attentions' &&
                              filterProps.services &&
                              filterProps.services.length > 1
                            "
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
                                  refreshAttentionsContentDelayed({
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
                          <!-- Days Since Type radio buttons -->
                          <div
                            class="col-12 col-md my-1 filter-card mb-3"
                            v-if="filterProps.filterType === 'attentions'"
                          >
                            <input
                              type="radio"
                              class="btn btn-check btn-sm"
                              :checked="filterProps.daysSinceType === 'EARLY'"
                              value="EARLY"
                              name="attentions-daysSince-type"
                              :id="`attentions-early-since-${Date.now()}`"
                              autocomplete="off"
                              @change="
                                e => {
                                  const newDaysSinceType = e.target.checked ? 'EARLY' : undefined;
                                  if (attentionsFilterRef.value) {
                                    const filterWrapper = attentionsFilterRef.value;
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
                                        filterInstance.daysSinceType = newDaysSinceType;
                                      }
                                    }
                                  }
                                  refreshAttentionsContentDelayed({
                                    daysSinceType: newDaysSinceType,
                                  });
                                }
                              "
                            />
                            <label class="btn" :for="`attentions-early-since-${Date.now()}`">
                              <i :class="`bi bi-qr-code green-icon`"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn btn-check btn-sm"
                              :checked="filterProps.daysSinceType === 'MEDIUM'"
                              value="MEDIUM"
                              name="attentions-daysSince-type"
                              :id="`attentions-medium-since-${Date.now()}`"
                              autocomplete="off"
                              @change="
                                e => {
                                  const newDaysSinceType = e.target.checked ? 'MEDIUM' : undefined;
                                  if (attentionsFilterRef.value) {
                                    const filterWrapper = attentionsFilterRef.value;
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
                                        filterInstance.daysSinceType = newDaysSinceType;
                                      }
                                    }
                                  }
                                  refreshAttentionsContentDelayed({
                                    daysSinceType: newDaysSinceType,
                                  });
                                }
                              "
                            />
                            <label class="btn" :for="`attentions-medium-since-${Date.now()}`">
                              <i :class="`bi bi-qr-code yellow-icon`"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn btn-check btn-sm"
                              :checked="filterProps.daysSinceType === 'LATE'"
                              value="LATE"
                              name="attentions-daysSince-type"
                              :id="`attentions-late-since-${Date.now()}`"
                              autocomplete="off"
                              @change="
                                e => {
                                  const newDaysSinceType = e.target.checked ? 'LATE' : undefined;
                                  if (attentionsFilterRef.value) {
                                    const filterWrapper = attentionsFilterRef.value;
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
                                        filterInstance.daysSinceType = newDaysSinceType;
                                      }
                                    }
                                  }
                                  refreshAttentionsContentDelayed({
                                    daysSinceType: newDaysSinceType,
                                  });
                                }
                              "
                            />
                            <label class="btn" :for="`attentions-late-since-${Date.now()}`">
                              <i :class="`bi bi-qr-code red-icon`"></i>
                            </label>
                            <Popper
                              :key="`attentions-days-since-popper`"
                              :class="'dark'"
                              arrow
                              disable-click-away
                              :content="$t(`dashboard.tracing.filters.attention`)"
                            >
                              <i class="bi bi-info-circle-fill h7 m-2"></i>
                            </Popper>
                          </div>
                          <!-- Contact Result Type radio buttons -->
                          <div
                            class="col-12 col-md my-1 filter-card mb-3"
                            v-if="filterProps.filterType === 'attentions'"
                          >
                            <input
                              type="radio"
                              class="btn btn-check btn-sm"
                              :checked="filterProps.contactResultType === 'INTERESTED'"
                              value="INTERESTED"
                              name="attentions-contactResultType-type"
                              :id="`attentions-interested-${Date.now()}`"
                              autocomplete="off"
                              @change="
                                e => {
                                  const newContactResultType = e.target.checked
                                    ? 'INTERESTED'
                                    : undefined;
                                  if (attentionsFilterRef.value) {
                                    const filterWrapper = attentionsFilterRef.value;
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
                                        filterInstance.contactResultType = newContactResultType;
                                      }
                                    }
                                  }
                                  refreshAttentionsContentDelayed({
                                    contactResultType: newContactResultType,
                                  });
                                }
                              "
                            />
                            <label class="btn" :for="`attentions-interested-${Date.now()}`">
                              <i :class="`bi bi-patch-check-fill green-icon`"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn btn-check btn-sm"
                              :checked="filterProps.contactResultType === 'CONTACT_LATER'"
                              value="CONTACT_LATER"
                              name="attentions-contactResultType-type"
                              :id="`attentions-contact-later-${Date.now()}`"
                              autocomplete="off"
                              @change="
                                e => {
                                  const newContactResultType = e.target.checked
                                    ? 'CONTACT_LATER'
                                    : undefined;
                                  if (attentionsFilterRef.value) {
                                    const filterWrapper = attentionsFilterRef.value;
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
                                        filterInstance.contactResultType = newContactResultType;
                                      }
                                    }
                                  }
                                  refreshAttentionsContentDelayed({
                                    contactResultType: newContactResultType,
                                  });
                                }
                              "
                            />
                            <label class="btn" :for="`attentions-contact-later-${Date.now()}`">
                              <i :class="`bi bi-patch-check-fill yellow-icon`"></i>
                            </label>
                            <input
                              type="radio"
                              class="btn btn-check btn-sm"
                              :checked="filterProps.contactResultType === 'REJECTED'"
                              value="REJECTED"
                              name="attentions-contactResultType-type"
                              :id="`attentions-rejected-${Date.now()}`"
                              autocomplete="off"
                              @change="
                                e => {
                                  const newContactResultType = e.target.checked
                                    ? 'REJECTED'
                                    : undefined;
                                  if (attentionsFilterRef.value) {
                                    const filterWrapper = attentionsFilterRef.value;
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
                                        filterInstance.contactResultType = newContactResultType;
                                      }
                                    }
                                  }
                                  refreshAttentionsContentDelayed({
                                    contactResultType: newContactResultType,
                                  });
                                }
                              "
                            />
                            <label class="btn" :for="`attentions-rejected-${Date.now()}`">
                              <i :class="`bi bi-patch-check-fill red-icon`"></i>
                            </label>
                            <Popper
                              :key="`attentions-contact-result-popper`"
                              :class="'dark'"
                              arrow
                              disable-click-away
                              :content="$t(`dashboard.tracing.filters.contactResult`)"
                            >
                              <i class="bi bi-info-circle-fill h7 m-2"></i>
                            </Popper>
                          </div>
                          <!-- Contactable, Contacted, Survey, Asc checkboxes -->
                          <div class="row" v-if="filterProps.filterType === 'attentions'">
                            <div class="col-12 col-md-6">
                              <div class="form-check form-switch centered">
                                <input
                                  class="form-check-input m-1"
                                  :class="filterProps.contactable === false ? 'bg-danger' : ''"
                                  type="checkbox"
                                  :id="`attentions-contactable-${Date.now()}`"
                                  :checked="filterProps.contactable === true"
                                  @click="
                                    e => {
                                      const newContactable = e.target.checked ? true : undefined;
                                      if (filterProps.checkContactable) {
                                        filterProps.checkContactable(e);
                                      } else if (attentionsFilterRef.value) {
                                        const filterWrapper = attentionsFilterRef.value;
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
                                            filterInstance.contactable = newContactable;
                                          }
                                        }
                                      }
                                      refreshAttentionsContentDelayed({
                                        contactable: newContactable,
                                      });
                                    }
                                  "
                                />
                                <label
                                  class="form-check-label metric-card-subtitle"
                                  :for="`attentions-contactable-${Date.now()}`"
                                >
                                  {{ $t('dashboard.contactable') }}
                                </label>
                              </div>
                            </div>
                            <div class="col-12 col-md-6">
                              <div class="form-check form-switch centered">
                                <input
                                  class="form-check-input m-1"
                                  :class="filterProps.contacted === false ? 'bg-danger' : ''"
                                  type="checkbox"
                                  :id="`attentions-contacted-${Date.now()}`"
                                  :checked="filterProps.contacted === true"
                                  @click="
                                    e => {
                                      const newContacted = e.target.checked ? true : undefined;
                                      if (filterProps.checkContacted) {
                                        filterProps.checkContacted(e);
                                      } else if (attentionsFilterRef.value) {
                                        const filterWrapper = attentionsFilterRef.value;
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
                                            filterInstance.contacted = newContacted;
                                          }
                                        }
                                      }
                                      refreshAttentionsContentDelayed({ contacted: newContacted });
                                    }
                                  "
                                />
                                <label
                                  class="form-check-label metric-card-subtitle"
                                  :for="`attentions-contacted-${Date.now()}`"
                                >
                                  {{ $t('dashboard.contacted') }}
                                </label>
                              </div>
                            </div>
                          </div>
                          <div class="row" v-if="filterProps.filterType === 'attentions'">
                            <div class="col-12 col-md-6">
                              <div class="form-check form-switch centered">
                                <input
                                  class="form-check-input m-1"
                                  :class="filterProps.survey === false ? 'bg-danger' : ''"
                                  type="checkbox"
                                  :id="`attentions-survey-${Date.now()}`"
                                  :checked="filterProps.survey === true"
                                  @click="
                                    e => {
                                      const newSurvey = e.target.checked ? true : undefined;
                                      if (filterProps.checkSurvey) {
                                        filterProps.checkSurvey(e);
                                      } else if (attentionsFilterRef.value) {
                                        const filterWrapper = attentionsFilterRef.value;
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
                                            filterInstance.survey = newSurvey;
                                          }
                                        }
                                      }
                                      refreshAttentionsContentDelayed({ survey: newSurvey });
                                    }
                                  "
                                />
                                <label
                                  class="form-check-label metric-card-subtitle"
                                  :for="`attentions-survey-${Date.now()}`"
                                >
                                  {{ $t('dashboard.survey') }}
                                </label>
                              </div>
                            </div>
                            <div class="col-12 col-md-6">
                              <div class="form-check form-switch centered">
                                <input
                                  class="form-check-input m-1"
                                  :class="filterProps.asc === false ? 'bg-danger' : ''"
                                  type="checkbox"
                                  :id="`attentions-asc-${Date.now()}`"
                                  :checked="filterProps.asc === true"
                                  @click="
                                    e => {
                                      const newAsc = e.target.checked ? true : false;
                                      if (filterProps.checkAsc) {
                                        filterProps.checkAsc(e);
                                      } else if (attentionsFilterRef.value) {
                                        const filterWrapper = attentionsFilterRef.value;
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
                                            filterInstance.asc = newAsc;
                                          }
                                        }
                                      }
                                      refreshAttentionsContentDelayed({ asc: newAsc });
                                    }
                                  "
                                />
                                <label
                                  class="form-check-label metric-card-subtitle"
                                  :for="`attentions-asc-${Date.now()}`"
                                >
                                  {{ filterProps.asc ? $t('dashboard.asc') : $t('dashboard.desc') }}
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </template>
                    </template>
                  </DashboardAttentionsAndBookingsManagement>
                  <!-- Filters for Surveys tab -->
                  <DashboardSurveysManagement
                    v-if="state.showSurveyManagement"
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
                    ref="surveysFilterRef"
                  >
                    <template #filters-exposed="filterProps">
                      <div class="filters-content-wrapper">
                        <!-- Date quick buttons -->
                        <div class="row my-2">
                          <div class="col-6 mb-2">
                            <button
                              class="btn btn-sm btn-dark rounded-pill w-100"
                              @click="
                                const today = new Date().toISOString().slice(0, 10);
                                const [year, month, day] = today.split('-');
                                const startDate = `${year}-${month}-${day}`;
                                const endDate = `${year}-${month}-${day}`;
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
                                if (surveysFilterRef.value) {
                                  surveysFilterRef.value.startDate = startDate;
                                  surveysFilterRef.value.endDate = endDate;
                                }
                                refreshSurveysContent();
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
                                const today = new Date().toISOString().slice(0, 10);
                                const [year, month, day] = today.split('-');
                                const startDate = `${year}-${month}-01`;
                                const endDate = `${year}-${month}-${day}`;
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
                                if (surveysFilterRef.value) {
                                  surveysFilterRef.value.startDate = startDate;
                                  surveysFilterRef.value.endDate = endDate;
                                }
                                refreshSurveysContent();
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
                                const today = new Date().toISOString().slice(0, 10);
                                const startDate = new DateModel(today)
                                  .substractMonths(1)
                                  .toString();
                                const endDate = new DateModel(startDate).endOfMonth().toString();
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
                                if (surveysFilterRef.value) {
                                  surveysFilterRef.value.startDate = startDate;
                                  surveysFilterRef.value.endDate = endDate;
                                }
                                refreshSurveysContent();
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
                                const today = new Date().toISOString().slice(0, 10);
                                const startDate = new DateModel(today)
                                  .substractMonths(3)
                                  .toString();
                                const endDate = new DateModel(today)
                                  .substractMonths(1)
                                  .endOfMonth()
                                  .toString();
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
                                if (surveysFilterRef.value) {
                                  surveysFilterRef.value.startDate = startDate;
                                  surveysFilterRef.value.endDate = endDate;
                                }
                                refreshSurveysContent();
                              "
                              :disabled="filterProps.loading"
                            >
                              {{ $t('dashboard.lastThreeMonths') }}
                            </button>
                          </div>
                        </div>
                        <!-- Date Range Filters -->
                        <DateRangeFilters
                          :start-date="filterProps.startDate"
                          :end-date="filterProps.endDate"
                          :show-quick-buttons="false"
                          :disabled="filterProps.loading"
                          :show-search-button="false"
                          @update:startDate="
                            val => {
                              if (filterProps.setStartDate) {
                                filterProps.setStartDate(val);
                              } else {
                                filterProps.startDate = val;
                              }
                              if (surveysFilterRef.value) {
                                surveysFilterRef.value.startDate = val;
                              }
                              refreshSurveysContentDelayed({
                                startDate: val,
                                endDate: filterProps.endDate,
                              });
                            }
                          "
                          @update:endDate="
                            val => {
                              if (filterProps.setEndDate) {
                                filterProps.setEndDate(val);
                              } else {
                                filterProps.endDate = val;
                              }
                              if (surveysFilterRef.value) {
                                surveysFilterRef.value.endDate = val;
                              }
                              refreshSurveysContentDelayed({
                                startDate: filterProps.startDate,
                                endDate: val,
                              });
                            }
                          "
                        />
                        <!-- Search input -->
                        <div class="row my-2">
                          <div class="col-12">
                            <label class="metric-card-subtitle mb-1" for="surveys-search-input">
                              {{ $t('dashboard.search') }}
                            </label>
                            <div class="input-group">
                              <input
                                id="surveys-search-input"
                                type="text"
                                class="form-control"
                                :value="filterProps.searchText || ''"
                                @input="
                                  e => {
                                    const newSearchText = e.target.value;
                                    if (filterProps.setSearchText) {
                                      filterProps.setSearchText(newSearchText);
                                    } else {
                                      filterProps.searchText = newSearchText;
                                    }
                                    refreshSurveysContentDelayed({
                                      searchText: newSearchText || undefined,
                                    });
                                  }
                                "
                                :placeholder="$t('dashboard.search')"
                              />
                              <button
                                class="btn btn-sm btn-dark rounded-end"
                                @click="refreshSurveysContent()"
                                :disabled="filterProps.loading"
                              >
                                <i class="bi bi-search"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                        <!-- Queue filter -->
                        <div
                          class="row my-2"
                          v-if="filterProps.queues && filterProps.queues.length > 1"
                        >
                          <div class="col-12">
                            <label class="metric-card-subtitle mb-1" for="surveys-queue-select">
                              {{ $t('dashboard.queue') }}
                            </label>
                            <select
                              id="surveys-queue-select"
                              class="form-select"
                              :value="filterProps.queueId || ''"
                              @change="
                                e => {
                                  const newQueueId = e.target.value;
                                  if (filterProps.setQueueId) {
                                    filterProps.setQueueId(newQueueId);
                                  } else {
                                    filterProps.queueId = newQueueId;
                                  }
                                  refreshSurveysContentDelayed({
                                    queueId: newQueueId || undefined,
                                  });
                                }
                              "
                            >
                              <option value="">{{ $t('dashboard.all') || 'Todos' }}</option>
                              <option
                                v-for="queue in filterProps.queues"
                                :key="queue.id"
                                :value="queue.id"
                              >
                                {{ queue.name }}
                              </option>
                            </select>
                          </div>
                        </div>
                        <!-- Service filter -->
                        <div
                          class="row my-2"
                          v-if="filterProps.services && filterProps.services.length > 1"
                        >
                          <div class="col-12">
                            <label class="metric-card-subtitle mb-1" for="surveys-service-select">
                              {{ $t('dashboard.service') }}
                            </label>
                            <select
                              id="surveys-service-select"
                              class="form-select"
                              :value="filterProps.serviceId || ''"
                              @change="
                                e => {
                                  const newServiceId = e.target.value;
                                  if (filterProps.setServiceId) {
                                    filterProps.setServiceId(newServiceId);
                                  } else {
                                    filterProps.serviceId = newServiceId;
                                  }
                                  refreshSurveysContentDelayed({
                                    serviceId: newServiceId || undefined,
                                  });
                                }
                              "
                            >
                              <option value="">{{ $t('dashboard.all') || 'Todos' }}</option>
                              <option
                                v-for="service in filterProps.services"
                                :key="service.id"
                                :value="service.id"
                              >
                                {{ service.name }}
                              </option>
                            </select>
                          </div>
                        </div>
                        <!-- Rating Type radio buttons -->
                        <div class="row my-2">
                          <div class="col-12">
                            <label class="metric-card-subtitle mb-1">
                              {{ $t('dashboard.ratingType') }}
                            </label>
                            <div class="d-flex flex-wrap gap-2">
                              <div class="form-check">
                                <input
                                  class="form-check-input"
                                  type="radio"
                                  name="surveys-rating-type"
                                  :id="`surveys-rating-good-${Date.now()}`"
                                  :value="'good'"
                                  :checked="filterProps.ratingType === 'good'"
                                  @change="
                                    e => {
                                      const newRatingType = e.target.checked ? 'good' : undefined;
                                      if (filterProps.setRatingType) {
                                        filterProps.setRatingType(newRatingType);
                                      } else {
                                        filterProps.ratingType = newRatingType;
                                      }
                                      refreshSurveysContentDelayed({ ratingType: newRatingType });
                                    }
                                  "
                                />
                                <label
                                  class="form-check-label"
                                  :for="`surveys-rating-good-${Date.now()}`"
                                >
                                  {{ $t('dashboard.good') }}
                                </label>
                              </div>
                              <div class="form-check">
                                <input
                                  class="form-check-input"
                                  type="radio"
                                  name="surveys-rating-type"
                                  :id="`surveys-rating-medium-${Date.now()}`"
                                  :value="'medium'"
                                  :checked="filterProps.ratingType === 'medium'"
                                  @change="
                                    e => {
                                      const newRatingType = e.target.checked ? 'medium' : undefined;
                                      if (filterProps.setRatingType) {
                                        filterProps.setRatingType(newRatingType);
                                      } else {
                                        filterProps.ratingType = newRatingType;
                                      }
                                      refreshSurveysContentDelayed({ ratingType: newRatingType });
                                    }
                                  "
                                />
                                <label
                                  class="form-check-label"
                                  :for="`surveys-rating-medium-${Date.now()}`"
                                >
                                  {{ $t('dashboard.medium') }}
                                </label>
                              </div>
                              <div class="form-check">
                                <input
                                  class="form-check-input"
                                  type="radio"
                                  name="surveys-rating-type"
                                  :id="`surveys-rating-bad-${Date.now()}`"
                                  :value="'bad'"
                                  :checked="filterProps.ratingType === 'bad'"
                                  @change="
                                    e => {
                                      const newRatingType = e.target.checked ? 'bad' : undefined;
                                      if (filterProps.setRatingType) {
                                        filterProps.setRatingType(newRatingType);
                                      } else {
                                        filterProps.ratingType = newRatingType;
                                      }
                                      refreshSurveysContentDelayed({ ratingType: newRatingType });
                                    }
                                  "
                                />
                                <label
                                  class="form-check-label"
                                  :for="`surveys-rating-bad-${Date.now()}`"
                                >
                                  {{ $t('dashboard.bad') }}
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                        <!-- NPS Type radio buttons -->
                        <div class="row my-2">
                          <div class="col-12">
                            <label class="metric-card-subtitle mb-1">
                              {{ $t('dashboard.npsType') }}
                            </label>
                            <div class="d-flex flex-wrap gap-2">
                              <div class="form-check">
                                <input
                                  class="form-check-input"
                                  type="radio"
                                  name="surveys-nps-type"
                                  :id="`surveys-nps-promoter-${Date.now()}`"
                                  :value="'promoter'"
                                  :checked="filterProps.npsType === 'promoter'"
                                  @change="
                                    e => {
                                      const newNpsType = e.target.checked ? 'promoter' : undefined;
                                      if (filterProps.setNpsType) {
                                        filterProps.setNpsType(newNpsType);
                                      } else {
                                        filterProps.npsType = newNpsType;
                                      }
                                      refreshSurveysContentDelayed({ npsType: newNpsType });
                                    }
                                  "
                                />
                                <label
                                  class="form-check-label"
                                  :for="`surveys-nps-promoter-${Date.now()}`"
                                >
                                  {{ $t('dashboard.promoter') }}
                                </label>
                              </div>
                              <div class="form-check">
                                <input
                                  class="form-check-input"
                                  type="radio"
                                  name="surveys-nps-type"
                                  :id="`surveys-nps-neutral-${Date.now()}`"
                                  :value="'neutral'"
                                  :checked="filterProps.npsType === 'neutral'"
                                  @change="
                                    e => {
                                      const newNpsType = e.target.checked ? 'neutral' : undefined;
                                      if (filterProps.setNpsType) {
                                        filterProps.setNpsType(newNpsType);
                                      } else {
                                        filterProps.npsType = newNpsType;
                                      }
                                      refreshSurveysContentDelayed({ npsType: newNpsType });
                                    }
                                  "
                                />
                                <label
                                  class="form-check-label"
                                  :for="`surveys-nps-neutral-${Date.now()}`"
                                >
                                  {{ $t('dashboard.neutral') }}
                                </label>
                              </div>
                              <div class="form-check">
                                <input
                                  class="form-check-input"
                                  type="radio"
                                  name="surveys-nps-type"
                                  :id="`surveys-nps-detractor-${Date.now()}`"
                                  :value="'detractor'"
                                  :checked="filterProps.npsType === 'detractor'"
                                  @change="
                                    e => {
                                      const newNpsType = e.target.checked ? 'detractor' : undefined;
                                      if (filterProps.setNpsType) {
                                        filterProps.setNpsType(newNpsType);
                                      } else {
                                        filterProps.npsType = newNpsType;
                                      }
                                      refreshSurveysContentDelayed({ npsType: newNpsType });
                                    }
                                  "
                                />
                                <label
                                  class="form-check-label"
                                  :for="`surveys-nps-detractor-${Date.now()}`"
                                >
                                  {{ $t('dashboard.detractor') }}
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                        <!-- Contactable and Contacted checkboxes -->
                        <div class="row my-2">
                          <div class="col-12">
                            <div class="d-flex flex-wrap gap-3">
                              <div class="form-check">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  :id="`surveys-contactable-${Date.now()}`"
                                  :checked="filterProps.contactable === true"
                                  @change="
                                    e => {
                                      const newContactable = e.target.checked ? true : undefined;
                                      if (surveysFilterRef.value) {
                                        surveysFilterRef.value.contactable = newContactable;
                                      }
                                      refreshSurveysContentDelayed({ contactable: newContactable });
                                    }
                                  "
                                />
                                <label
                                  class="form-check-label"
                                  :for="`surveys-contactable-${Date.now()}`"
                                >
                                  {{ $t('dashboard.contactable') }}
                                </label>
                              </div>
                              <div class="form-check">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  :id="`surveys-contacted-${Date.now()}`"
                                  :checked="filterProps.contacted === true"
                                  @change="
                                    e => {
                                      const newContacted = e.target.checked ? true : undefined;
                                      if (surveysFilterRef.value) {
                                        surveysFilterRef.value.contacted = newContacted;
                                      }
                                      refreshSurveysContentDelayed({ contacted: newContacted });
                                    }
                                  "
                                />
                                <label
                                  class="form-check-label"
                                  :for="`surveys-contacted-${Date.now()}`"
                                >
                                  {{ $t('dashboard.contacted') }}
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </template>
                  </DashboardSurveysManagement>
                </template>
              </DesktopFiltersPanel>
            </template>
            <template #content>
              <div v-if="!loading" id="tracing-result" class="mt-2">
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
                    ref="clientsContentRef"
                  >
                  </DashboardClientsManagement>
                  <DashboardAttentionsAndBookingsManagement
                    :show-attention-management="state.showAttentions"
                    :toggles="state.toggles"
                    :commerce="commerce"
                    :queues="state.queues"
                    :commerces="selectedCommerces"
                    :services="state.services"
                    ref="attentionsContentRef"
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
                    ref="surveysContentRef"
                  >
                  </DashboardSurveysManagement>
                </div>
              </div>
            </template>
          </DesktopContentLayout>
          <div v-if="!isActiveBusiness() && !loading">
            <Message
              :title="$t('dashboard.message.1.title')"
              :content="$t('dashboard.message.1.content')"
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

.tabs-header-divider {
  border-bottom: 2px solid rgba(0, 0, 0, 0.15);
  padding-bottom: 0.75rem;
}

/* Desktop Layout Styles - Only affects the header row */
@media (min-width: 992px) {
  .desktop-header-row {
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0;
    justify-content: flex-start;
    text-align: left;
  }

  .desktop-header-row .desktop-logo-wrapper {
    padding-right: 1rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo {
    display: flex;
    align-items: center;
    max-width: 150px;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo .logo-desktop {
    max-width: 120px;
    max-height: 100px;
    width: auto;
    height: auto;
    margin-bottom: 0;
  }

  .desktop-header-row #commerce-logo-desktop {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .desktop-header-row .desktop-menu-wrapper {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
    text-align: left;
  }
}
</style>
