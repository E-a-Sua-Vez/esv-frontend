<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getMetrics } from '../../application/services/query-stack';
import { getCollaboratorById } from '../../application/services/collaborator';
import { getQueueByCommerce, getGroupedQueueByCommerceId } from '../../application/services/queue';
import { Chart, registerables } from 'chart.js';
import { LineChart, DoughnutChart, BarChart, useBarChart } from 'vue-chart-3';
import { getPermissions } from '../../application/services/permissions';
import { getActiveFeature } from '../../shared/features';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import DashboardIndicators from '../../components/dashboard/DashboardIndicators.vue';
import DashboardGraphs from '../../components/dashboard/DashboardGraphs.vue';
import DashboardSurveysResult from '../../components/dashboard/DashboardSurveysResult.vue';
import DashboardSurveys from '../../components/dashboard/DashboardSurveys.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import CollaboratorSpySection from '../../components/collaborator/CollaboratorSpySection.vue';
import DesktopContentLayout from '../../components/common/desktop/DesktopContentLayout.vue';
import DesktopFiltersPanel from '../../components/common/desktop/DesktopFiltersPanel.vue';
import DateRangeFilters from '../../components/common/desktop/DateRangeFilters.vue';
import SimpleDownloadCard from '../../components/reports/SimpleDownloadCard.vue';
import { lazyLoadHtml2Pdf } from '../../shared/utils/lazyLoad';
import { DateModel } from '../../shared/utils/date.model';

Chart.register(...registerables);

export default {
  name: 'CollaboratorDashboard',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    LineChart,
    DoughnutChart,
    BarChart,
    DashboardIndicators,
    DashboardGraphs,
    DashboardSurveysResult,
    DashboardSurveys,
    ComponentMenu,
    CollaboratorSpySection,
    DesktopContentLayout,
    DesktopFiltersPanel,
    DateRangeFilters,
    SimpleDownloadCard,
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
      paymentData: {},
    };

    const surveyCreated = {
      avgRating: 0,
      sentimentScore: {},
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
      startDate: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      activeBusiness: false,
      queues: ref({}),
      queue: {},
      groupedQueues: [],
      dateType: 'month',
      collaborator: {},
      showIndicators: true,
      showGraphs: false,
      showSurveyResults: false,
      calculatedMetrics: {
        'attention.created': attentionCreated,
        'survey.created': surveyCreated,
        'notification.created': notificationCreated,
        'booking.created': {
          bookingFlow: {
            datasets: [],
            labels: [],
          },
        },
        collaborators: {},
        clients: {},
      },
      graphs: {
        'attention-number-evolution': false,
        'attention-number-queue': false,
        'attention-flow': false,
        'survey-flow': false,
        'attention-duration-evolution': false,
        'attention-rate-duration-evolution': false,
        'attention-hour-distribution': false,
        'booking-number-evolution': false,
        'booking-flow': false,
        'attention-day-distribution': false,
        'booking-day-distribution': false,
        'booking-hour-distribution': false,
      },
      calculatedSurveyMetrics: {},
      toggles: {},
    });

    const loadQueues = async () => {
      if (!commerce.value || !commerce.value.id) {
        state.queues = [];
        state.groupedQueues = [];
        return;
      }
      try {
        const commerceData = await getQueueByCommerce(commerce.value.id);
        state.queues = commerceData.queues;
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
        console.error('Error loading queues:', error);
      }
    };

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.collaborator = state.currentUser;
        if (!state.collaborator || !state.collaborator.id) {
          state.collaborator = await getCollaboratorById(state.currentUser.id);
        }
        // Set initial commerce if not set - check both commerceId and commercesId
        if (!commerce.value || !commerce.value.id) {
          // First try commerceId (single commerce)
          if (state.collaborator.commerceId) {
            const { getCommerceById } = await import('../../application/services/commerce');
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
            const { getCommerceById } = await import('../../application/services/commerce');
            const firstCommerceId = state.collaborator.commercesId[0];
            if (firstCommerceId) {
              const initialCommerce = await getCommerceById(firstCommerceId);
              if (initialCommerce && initialCommerce.id) {
                await store.setCurrentCommerce(initialCommerce);
              }
            }
          }
        }
        state.business = await store.getActualBusiness();
        await loadQueues();
        state.toggles = await getPermissions('dashboard');
        await refresh();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
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
          state.groupedQueues = [];
          state.calculatedMetrics = {
            'attention.created': attentionCreated,
            'survey.created': surveyCreated,
            'notification.created': notificationCreated,
            'booking.created': {
              bookingFlow: {
                datasets: [],
                labels: [],
              },
            },
            collaborators: {},
            clients: {},
          };
          resetGraphsVisibility();
          await loadQueues();
          await refresh();
          loading.value = false;
        } catch (error) {
          console.error('Error handling commerce change:', error);
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
            'booking.created': {
              bookingFlow: {
                datasets: [],
                labels: [],
              },
            },
            collaborators: {},
            clients: {},
          };
          resetGraphsVisibility();
          await refresh();
          loading.value = false;
        } catch (error) {
          console.error('Error handling module change:', error);
          loading.value = false;
        }
      },
      { deep: true }
    );

    const isActiveBusiness = () => commerce.value && commerce.value.active === true;

    const resetGraphsVisibility = () => {
      state.graphs = {
        'attention-number-evolution': false,
        'attention-number-queue': false,
        'attention-flow': false,
        'survey-flow': false,
        'attention-duration-evolution': false,
        'attention-rate-duration-evolution': false,
        'attention-hour-distribution': false,
        'booking-number-evolution': false,
        'booking-flow': false,
        'attention-day-distribution': false,
        'booking-day-distribution': false,
        'booking-hour-distribution': false,
      };
    };

    const checkGraphsVisibility = () => {
      if (
        state.calculatedMetrics['attention.created'].evolution &&
        state.calculatedMetrics['attention.created'].evolution.datasets &&
        state.calculatedMetrics['attention.created'].evolution.datasets.length > 0
      ) {
        if (state.toggles['dashboard.attention-number-evolution.view']) {
          state.graphs['attention-number-evolution'] = true;
        }
      }
      if (
        state.calculatedMetrics['attention.created'].durationFlow.datasets.length > 0 &&
        !state.calculatedMetrics['attention.created'].durationFlow.datasets.every(
          item => item === 0
        )
      ) {
        if (state.toggles['dashboard.attention-duration-evolution.view']) {
          state.graphs['attention-duration-evolution'] = true;
        }
      }
      if (state.calculatedMetrics['attention.created'].rateDurationFlow.datasets.length > 0) {
        if (state.toggles['dashboard.attention-rate-duration-evolution.view']) {
          state.graphs['attention-rate-duration-evolution'] = true;
        }
      }
      if (state.calculatedMetrics['attention.created'].attentionQueues.datasets.length > 0) {
        if (state.toggles['dashboard.attention-number-queue.view']) {
          state.graphs['attention-number-queue'] = true;
        }
      }
      if (
        state.calculatedMetrics['attention.created'].attentionFlow.datasets.length > 0 &&
        state.calculatedMetrics['attention.created'].attentionFlow.datasets[0] !== 0
      ) {
        if (state.toggles['dashboard.attention-flow.view']) {
          state.graphs['attention-flow'] = true;
        }
      }
      if (
        state.calculatedMetrics['attention.created'].attentionFlow.datasets.length > 0 &&
        !state.calculatedMetrics['attention.created'].attentionFlow.datasets.every(
          item => item === 0
        )
      ) {
        if (state.toggles['dashboard.survey-flow.view']) {
          state.graphs['survey-flow'] = true;
        }
      }
      if (state.calculatedMetrics['attention.created'].hourDistribution.datasets.length > 0) {
        if (state.toggles['dashboard.attention-hour-distribution.view']) {
          state.graphs['attention-hour-distribution'] = true;
        }
      }
      if (
        state.calculatedMetrics['booking.created'].bookingFlow.datasets.length > 0 &&
        state.calculatedMetrics['booking.created'].bookingFlow.datasets[0] !== 0
      ) {
        if (state.toggles['dashboard.booking-flow.view']) {
          state.graphs['booking-flow'] = true;
        }
      }
      if (
        state.calculatedMetrics['booking.created'].evolution &&
        state.calculatedMetrics['booking.created'].evolution.datasets &&
        state.calculatedMetrics['booking.created'].evolution.datasets.length > 0
      ) {
        if (state.toggles['dashboard.booking-number-evolution.view']) {
          state.graphs['booking-number-evolution'] = true;
        }
      }
      if (state.calculatedMetrics['booking.created'].hourDistribution.datasets.length > 0) {
        if (state.toggles['dashboard.booking-hour-distribution.view']) {
          state.graphs['booking-hour-distribution'] = true;
        }
      }
      if (state.calculatedMetrics['attention.created'].dayDistribution.datasets.length > 0) {
        if (state.toggles['dashboard.attention-day-distribution.view']) {
          state.graphs['attention-day-distribution'] = true;
        }
      }
      if (state.calculatedMetrics['booking.created'].dayDistribution.datasets.length > 0) {
        if (state.toggles['dashboard.booking-day-distribution.view']) {
          state.graphs['booking-day-distribution'] = true;
        }
      }
    };

    const getCalculatedMetrics = async () => {
      let queues = [];
      if (state.queues && state.queues.length > 0) {
        queues = state.queues.map(queue => ({ id: queue.id, name: queue.name }));
      }
      if (!commerce.value || !commerce.value.id) return {};
      const { calculatedMetrics } = await getMetrics(
        commerce.value.id,
        queues,
        state.startDate,
        state.endDate
      );
      return calculatedMetrics;
    };

    const refresh = async () => {
      try {
        loading.value = true;
        resetGraphsVisibility();
        state.calculatedMetrics = await getCalculatedMetrics();
        checkGraphsVisibility();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error ? (error.response ? error.respose.status : 500) : 500;
        loading.value = false;
      }
    };

    const getToday = async () => {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      state.startDate = `${year}-${month}-${day}`;
      state.endDate = `${year}-${month}-${day}`;
      await refresh();
    };

    const getCurrentMonth = async () => {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      state.startDate = `${year}-${month}-01`;
      state.endDate = `${year}-${month}-${day}`;
      await refresh();
    };

    const getLastMonth = async () => {
      const date = new Date().toISOString().slice(0, 10);
      state.startDate = new DateModel(date).substractMonths(1).toString();
      state.endDate = new DateModel(state.startDate).endOfMonth().toString();
      await refresh();
    };

    const getLastThreeMonths = async () => {
      const date = new Date().toISOString().slice(0, 10);
      state.startDate = new DateModel(date).substractMonths(3).toString();
      state.endDate = new DateModel(date).substractMonths(1).endOfMonth().toString();
      await refresh();
    };

    const getLocalHour = hour => {
      const date = new Date();
      const hourDate = new Date(date.setHours(hour));
      if (commerce.value && commerce.value.country) {
        if (commerce.value.country === 've') {
          const resultHour = hourDate.getHours() - 4;
          return resultHour < 0 ? 24 + resultHour : resultHour;
        } else if (['br', 'cl'].includes(commerce.value.country)) {
          const resultHour = hourDate.getHours() - 3;
          return resultHour < 0 ? 24 + resultHour : resultHour;
        } else {
          return hourDate.getHours();
        }
      }
    };

    const goBack = () => {
      router.push({ path: '/interno/colaborador/menu' });
    };

    const handleCommerceChanged = async commerce => {
      // Commerce is now managed globally, this handler is kept for DesktopFiltersPanel compatibility
      // but the actual change is handled by the watch on commerce computed property
      if (commerce && commerce.id) {
        await store.setCurrentCommerce(commerce);
      }
    };

    const handleFiltersToggle = collapsed => {
      // Filters toggle handled by DesktopContentLayout
    };

    const handleQuickDateSelect = async ({ type, startDate, endDate }) => {
      state.startDate = startDate;
      state.endDate = endDate;
      await refresh();
    };

    const handleDateRangeChange = async () => {
      await refresh();
    };

    const handleStartDateChange = value => {
      state.startDate = value;
    };

    const handleEndDateChange = value => {
      state.endDate = value;
    };

    const dashboardIndicatorsRef = ref(null);

    const handleExportToPDF = () => {
      if (dashboardIndicatorsRef.value && dashboardIndicatorsRef.value.exportToPDF) {
        dashboardIndicatorsRef.value.exportToPDF();
      }
    };

    const showIndicators = () => {
      state.showIndicators = true;
      state.showGraphs = false;
      state.showSurveyResults = false;
    };

    const showGraphs = () => {
      state.showIndicators = false;
      state.showGraphs = true;
      state.showSurveyResults = false;
    };

    const showSurvey = () => {
      state.showIndicators = false;
      state.showGraphs = false;
      state.showSurveyResults = true;
    };

    const surveyLabel = label => {
      const labels = {
        TERMINATED: 'INITIATED',
        RATED: 'TERMINATED',
      };
      return labels[label];
    };

    const attentionNumberEvolution = computed(() => {
      const data = state.calculatedMetrics['attention.created'].evolution;
      if (data && data.labels) {
        return {
          labels: data.labels || [],
          datasets: [
            {
              label: 'AVG Pasado',
              boxWidth: 10,
              borderColor: '#a52a2a',
              backgroundColor: '#a52a2a',
              borderDash: [2, 2],
              data: data.labels
                ? data.labels.map(
                    label =>
                      state.calculatedMetrics['attention.created'].pastPeriodAttentionNumber
                        .dailyAvg || 0
                  )
                : [],
              fill: false,
              tension: 0.1,
              radius: 0,
              type: 'line',
            },
            {
              label: 'AVG Presente',
              boxWidth: 10,
              borderColor: '#2f407a',
              backgroundColor: '#2f407a',
              borderDash: [2, 2],
              data: data.labels
                ? data.labels.map(
                    label => state.calculatedMetrics['attention.created'].dailyAvg || 0
                  )
                : [],
              fill: false,
              tension: 0.1,
              radius: 0,
              type: 'line',
            },
            {
              label: 'Período Actual',
              boxWidth: 10,
              borderColor: '#004aad',
              backgroundColor: 'rgba(127, 134, 255, 0.7)',
              data: data.datasets || [],
              fill: false,
              tension: 0.2,
              type: 'bar',
            },
          ],
          options: {
            fill: false,
            radius: 0,
          },
        };
      }
    });
    const { barChartProps: attentionNumberEvolutionProps } = useBarChart({
      chartData: attentionNumberEvolution,
    });

    const attentionDurationEvolution = computed(() => {
      const data = state.calculatedMetrics['attention.created'].durationFlow;
      if (data && data.labels) {
        return {
          labels: data.labels,
          datasets: [
            {
              label: 'Promedio',
              boxWidth: 10,
              borderColor: '#a52a2a',
              backgroundColor: '#a52a2a',
              borderDash: [2, 2],
              data: data.labels.map(
                label => state.calculatedMetrics['attention.created'].avgDuration
              ),
              fill: false,
              tension: 0.1,
              radius: 0,
              type: 'line',
            },
            {
              label: 'Duración Atenciones',
              boxWidth: 10,
              backgroundColor: 'rgba(127, 134, 255, 0.6)',
              data: data.datasets || [],
              fill: true,
              radius: 5,
              tension: 0.2,
            },
          ],
        };
      }
    });
    const { barChartProps: attentionDurationEvolutionProps } = useBarChart({
      chartData: attentionDurationEvolution,
    });

    const attentionHourDistribution = computed(() => {
      const data = state.calculatedMetrics['attention.created'].hourDistribution;
      if (data && data.labels) {
        return {
          labels: data.labels.map(hour => getLocalHour(hour)),
          datasets: [
            {
              label: 'Atenciones',
              boxWidth: 10,
              borderColor: '#004aad',
              backgroundColor: 'rgba(127, 134, 255, 0.7)',
              data: data.datasets || [],
              fill: false,
              tension: 0.2,
              type: 'bar',
            },
          ],
          options: {
            fill: false,
            radius: 0,
          },
        };
      }
    });
    const { barChartProps: attentionHourDistributionProps } = useBarChart({
      chartData: attentionHourDistribution,
    });

    const attentionDayDistribution = computed(() => {
      const data = state.calculatedMetrics['attention.created'].dayDistribution;
      if (data && data.labels) {
        return {
          labels: data.labels,
          datasets: [
            {
              label: 'Atenciones',
              boxWidth: 10,
              borderColor: '#004aad',
              backgroundColor: 'rgba(127, 134, 255, 0.7)',
              data: data.datasets || [],
              fill: false,
              tension: 0.2,
              type: 'bar',
            },
          ],
          options: {
            fill: false,
            radius: 0,
          },
        };
      }
    });
    const { barChartProps: attentionDayDistributionProps } = useBarChart({
      chartData: attentionDayDistribution,
    });

    const attentionQueues = computed(() => {
      const data = state.calculatedMetrics['attention.created'].attentionQueues;
      if (data && data.labels) {
        return {
          labels: data.labels,
          datasets: [
            {
              data: data.datasets || [],
              backgroundColor: ['#446ffc', '#2f407a', '#7c91d9', '#0e2678', '#b1bde6'],
            },
          ],
        };
      }
    });
    const { barChartProps: attentionQueuesProps } = useBarChart({ chartData: attentionQueues });

    const attentionFlow = computed(() => {
      const data = state.calculatedMetrics['attention.created'].attentionFlow;
      if (data && data.labels) {
        return {
          labels: data.labels,
          datasets: [
            {
              label: 'Atenciones',
              indexAxis: 'y',
              data: data.datasets || [],
              backgroundColor: ['#446ffc', '#2f407a', '#7c91d9', '#0e2678', '#b1bde6'],
            },
          ],
        };
      }
    });
    const { barChartProps: attentionFlowProps } = useBarChart({ chartData: attentionFlow });

    const surveyFlow = computed(() => {
      const data = state.calculatedMetrics['attention.created'].attentionFlow;
      if (data && data.labels) {
        const labels = data.labels.slice(2, 4).map(label => surveyLabel(label));
        const datasets = data.datasets.slice(2, 4);
        return {
          labels,
          datasets: [
            {
              label: 'Encuestas',
              indexAxis: 'y',
              data: datasets || [],
              backgroundColor: ['#446ffc', '#2f407a', '#7c91d9', '#0e2678', '#b1bde6'],
            },
          ],
        };
      }
    });
    const { barChartProps: surveyFlowProps } = useBarChart({ chartData: surveyFlow });

    const attentionRateDurationEvolution = computed(() => {
      const data = state.calculatedMetrics['attention.created'].rateDurationFlow;
      if (data && data.labels) {
        return {
          labels: data.labels,
          datasets: [
            {
              label: 'Promedio',
              boxWidth: 10,
              borderColor: '#a52a2a',
              backgroundColor: '#a52a2a',
              borderDash: [2, 2],
              data: data.labels.map(
                label => state.calculatedMetrics['attention.created'].avgRateDuration
              ),
              fill: false,
              tension: 0.1,
              radius: 0,
              type: 'line',
            },
            {
              label: 'Duración Encuestas',
              boxWidth: 10,
              backgroundColor: 'rgba(127, 134, 255, 0.6)',
              data: data.datasets || [],
              fill: true,
              radius: 5,
              tension: 0.2,
            },
          ],
        };
      }
    });
    const { barChartProps: attentionRateDurationEvolutionProps } = useBarChart({
      chartData: attentionRateDurationEvolution,
    });

    const bookingFlow = computed(() => {
      const data = state.calculatedMetrics['booking.created']
        ? state.calculatedMetrics['booking.created'].bookingFlow
        : {};
      if (data && data.labels) {
        return {
          labels: data.labels,
          datasets: [
            {
              label: 'Reservas',
              indexAxis: 'y',
              data: data.datasets || [],
              backgroundColor: ['#446ffc', '#2f407a', '#7c91d9', '#0e2678', '#b1bde6'],
            },
          ],
        };
      }
    });
    const { barChartProps: bookingFlowProps } = useBarChart({ chartData: bookingFlow });

    const bookingNumberEvolution = computed(() => {
      const data = state.calculatedMetrics['booking.created']
        ? state.calculatedMetrics['booking.created'].evolution
        : {};
      if (data && data.labels) {
        return {
          labels: data.labels || [],
          datasets: [
            {
              label: 'AVG Presente',
              boxWidth: 10,
              borderColor: '#2f407a',
              backgroundColor: '#2f407a',
              borderDash: [2, 2],
              data: data.labels
                ? data.labels.map(label => state.calculatedMetrics['booking.created'].dailyAvg || 0)
                : [],
              fill: false,
              tension: 0.1,
              radius: 0,
              type: 'line',
            },
            {
              label: 'Período Actual',
              boxWidth: 10,
              borderColor: '#004aad',
              backgroundColor: 'rgba(127, 134, 255, 0.7)',
              data: data.datasets || [],
              fill: false,
              tension: 0.2,
              type: 'bar',
            },
          ],
          options: {
            fill: false,
            radius: 0,
          },
        };
      }
    });
    const { barChartProps: bookingNumberEvolutionProps } = useBarChart({
      chartData: bookingNumberEvolution,
    });

    const bookingHourDistribution = computed(() => {
      const data = state.calculatedMetrics['booking.created']
        ? state.calculatedMetrics['booking.created'].hourDistribution
        : {};
      if (data && data.labels) {
        return {
          labels: data.labels.map(hour => getLocalHour(hour)),
          datasets: [
            {
              label: 'Reservas',
              boxWidth: 10,
              borderColor: '#004aad',
              backgroundColor: 'rgba(127, 134, 255, 0.7)',
              data: data.datasets || [],
              fill: false,
              tension: 0.2,
              type: 'bar',
            },
          ],
          options: {
            fill: false,
            radius: 0,
          },
        };
      }
    });
    const { barChartProps: bookingHourDistributionProps } = useBarChart({
      chartData: bookingHourDistribution,
    });

    const bookingDayDistribution = computed(() => {
      const data = state.calculatedMetrics['booking.created']
        ? state.calculatedMetrics['booking.created'].dayDistribution
        : {};
      if (data && data.labels) {
        return {
          labels: data.labels,
          datasets: [
            {
              label: 'Reservas',
              boxWidth: 10,
              borderColor: '#004aad',
              backgroundColor: 'rgba(127, 134, 255, 0.7)',
              data: data.datasets || [],
              fill: false,
              tension: 0.2,
              type: 'bar',
            },
          ],
          options: {
            fill: false,
            radius: 0,
          },
        };
      }
    });
    const { barChartProps: bookingDayDistributionProps } = useBarChart({
      chartData: bookingDayDistribution,
    });

    return {
      state,
      loading,
      alertError,
      commerce,
      module,
      attentionNumberEvolutionProps,
      attentionDurationEvolutionProps,
      attentionHourDistributionProps,
      attentionQueuesProps,
      attentionFlowProps,
      attentionRateDurationEvolutionProps,
      surveyFlowProps,
      bookingFlowProps,
      bookingNumberEvolutionProps,
      attentionDayDistributionProps,
      bookingDayDistributionProps,
      bookingHourDistributionProps,
      goBack,
      isActiveBusiness,
      refresh,
      showIndicators,
      showSurvey,
      showGraphs,
      getCurrentMonth,
      getLastMonth,
      getLastThreeMonths,
      getLocalHour,
      getToday,
      handleCommerceChanged,
      handleFiltersToggle,
      handleQuickDateSelect,
      handleDateRangeChange,
      handleStartDateChange,
      handleEndDateChange,
      handleExportToPDF,
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
          :src="commerce && commerce.logo ? commerce.logo : null"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t(`dashboard.title`)"
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
            <div v-if="(!commerce || !commerce.id) && !loading" class="control-box">
              <Message
                :title="$t('dashboard.message.3.title')"
                :content="$t('dashboard.message.3.content')"
              />
            </div>
            <div v-else-if="commerce && commerce.id" class="control-box">
              <div id="dashboard-controls">
                <div class="row my-2">
                  <div class="col-3">
                    <button
                      class="btn btn-dark rounded-pill px-2 metric-filters"
                      @click="getToday()"
                      :disabled="loading"
                    >
                      {{ $t('dashboard.today') }}
                    </button>
                  </div>
                  <div class="col-3">
                    <button
                      class="btn btn-dark rounded-pill px-2 metric-filters"
                      @click="getCurrentMonth()"
                      :disabled="loading"
                    >
                      {{ $t('dashboard.thisMonth') }}
                    </button>
                  </div>
                  <div class="col-3">
                    <button
                      class="btn btn-dark rounded-pill px-2 metric-filters"
                      @click="getLastMonth()"
                      :disabled="loading"
                    >
                      {{ $t('dashboard.lastMonth') }}
                    </button>
                  </div>
                  <div class="col-3">
                    <button
                      class="btn btn-dark rounded-pill px-2 metric-filters"
                      @click="getLastThreeMonths()"
                      :disabled="loading"
                    >
                      {{ $t('dashboard.lastThreeMonths') }}
                    </button>
                  </div>
                </div>
                <div class="row">
                  <div class="col-6">
                    <input
                      id="startDate"
                      class="form-control metric-controls"
                      type="date"
                      v-model="state.startDate"
                    />
                  </div>
                  <div class="col-6">
                    <input
                      id="endDate"
                      class="form-control metric-controls"
                      type="date"
                      v-model="state.endDate"
                    />
                  </div>
                </div>
                <div class="col">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                    @click="refresh()"
                    :disabled="loading"
                  >
                    <i class="bi bi-search"></i> {{ $t('dashboard.refresh') }}
                  </button>
                </div>
              </div>
            </div>
            <div v-if="!loading" id="dashboard-result" class="mt-2">
              <div id="title" class="metric-title">
                <span v-if="state.showIndicators">{{ $t('dashboard.indicators') }}</span>
                <span v-else-if="state.showGraphs">{{ $t('dashboard.graph') }}</span>
                <span v-else-if="state.showSurveyResults">{{ $t('dashboard.surveys') }}</span>
              </div>
              <div id="sub-title" class="metric-subtitle">
                ({{ $t('dashboard.dates.from') }} {{ state.startDate }}
                {{ $t('dashboard.dates.to') }} {{ state.endDate }})
              </div>
              <div class="row col mx-1 mt-3 mb-1">
                <div class="col-4 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showIndicators ? 'btn-selected' : ''"
                    @click="showIndicators()"
                    :disabled="!state.toggles['dashboard.indicators.view']"
                    :title="$t('dashboard.consolidated')"
                  >
                    {{ $t('dashboard.indicators') }} <br />
                    <i class="bi bi-stoplights-fill"></i>
                  </button>
                </div>
                <div class="col-4 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showGraphs ? 'btn-selected' : ''"
                    @click="showGraphs()"
                    :disabled="!state.toggles['dashboard.graphs.view']"
                  >
                    {{ $t('dashboard.graph') }} <br />
                    <i class="bi bi-bar-chart-line-fill"></i>
                  </button>
                </div>
                <div class="col-4 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showSurveyResults ? 'btn-selected' : ''"
                    @click="showSurvey()"
                    :disabled="!state.toggles['dashboard.surveys.view']"
                  >
                    {{ $t('dashboard.surveys') }} <br />
                    <i class="bi bi-patch-question-fill"></i>
                  </button>
                </div>
              </div>
              <hr class="dashboard-divider" />
              <div>
                <!-- Relatório de Indicadores -->
                <SimpleDownloadCard
                  v-if="state.showIndicators"
                  :download="state.toggles['dashboard.reports.indicators']"
                  :title="$t('dashboard.reports.indicators.title')"
                  :show-tooltip="true"
                  :description="$t('dashboard.reports.indicators.description')"
                  :icon="'bi-file-earmark-pdf'"
                  :can-download="state.toggles['dashboard.reports.indicators'] === true"
                  class="mb-3"
                  @download="handleExportToPDF"
                >
                </SimpleDownloadCard>
                <!-- Replace executive summary with CollaboratorSpySection for collaborators -->
                <CollaboratorSpySection
                  v-if="state.showIndicators"
                  :show="state.showIndicators"
                  :commerce="commerce"
                  :collaborator="state.collaborator"
                >
                </CollaboratorSpySection>
                <!-- Show DashboardIndicators with detailed cards, hiding summary when showing CollaboratorSpySection -->
                <DashboardIndicators
                  v-if="state.showIndicators"
                  ref="dashboardIndicatorsRef"
                  :show-indicators="state.showIndicators"
                  :calculated-metrics="state.calculatedMetrics"
                  :toggles="state.toggles"
                  :start-date="state.startDate"
                  :end-date="state.endDate"
                  :commerce="commerce"
                  :hide-summary="true"
                >
                </DashboardIndicators>
                <DashboardIndicators
                  v-else
                  :show-indicators="state.showIndicators"
                  :calculated-metrics="state.calculatedMetrics"
                  :toggles="state.toggles"
                  :start-date="state.startDate"
                  :end-date="state.endDate"
                  :commerce="commerce"
                >
                </DashboardIndicators>
                <DashboardGraphs
                  :show-graphs="state.showGraphs"
                  :calculated-metrics="{
                    attentionNumberEvolutionProps,
                    attentionDurationEvolutionProps,
                    attentionHourDistributionProps,
                    attentionQueuesProps,
                    attentionFlowProps,
                    attentionRateDurationEvolutionProps,
                    surveyFlowProps,
                    bookingFlowProps,
                    bookingNumberEvolutionProps,
                    attentionDayDistributionProps,
                    bookingDayDistributionProps,
                    bookingHourDistributionProps,
                    ...state.calculatedMetrics,
                  }"
                  :toggles="state.toggles"
                  :graphs="state.graphs"
                  :start-date="state.startDate"
                  :end-date="state.endDate"
                  :commerce="commerce"
                >
                </DashboardGraphs>
                <DashboardSurveys
                  :show-survey="state.showSurveyResults"
                  :calculated-metrics="state.calculatedMetrics"
                  :toggles="state.toggles"
                  :start-date="state.startDate"
                  :end-date="state.endDate"
                  :commerce="commerce"
                  :queues="state.queues"
                >
                </DashboardSurveys>
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
      <div class="content text-center">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div class="row align-items-center mb-1 desktop-header-row justify-content-start">
          <div class="col-auto desktop-logo-wrapper">
            <div class="desktop-commerce-logo">
              <div id="commerce-logo-desktop">
                <img
                  v-if="!loading && commerce?.logo"
                  class="rounded img-fluid logo-desktop"
                  :alt="$t('logoAlt')"
                  :src="commerce.logo"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <ComponentMenu
              :title="$t(`dashboard.title`)"
              :toggles="state.toggles"
              component-name="dashboard"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
        <div id="dashboard" v-if="isActiveBusiness()">
          <div v-if="!commerce || !commerce.id">
            <div v-if="!loading" class="control-box">
              <Message
                :title="$t('dashboard.message.3.title')"
                :content="$t('dashboard.message.3.content')"
              />
            </div>
          </div>
          <div v-else>
            <DesktopContentLayout
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
                  :show-all-option="false"
                  :commerce-selector-id="'dashboard-commerce-selector'"
                  :on-toggle="onToggle"
                  :collapsed="collapsed"
                  @commerce-changed="handleCommerceChanged"
                >
                  <template #custom-filters>
                    <DateRangeFilters
                      :start-date="state.startDate"
                      :end-date="state.endDate"
                      :show-quick-buttons="true"
                      :disabled="loading"
                      :show-search-button="true"
                      @update:startDate="handleStartDateChange"
                      @update:endDate="handleEndDateChange"
                      @quick-select="handleQuickDateSelect"
                      @search="handleDateRangeChange"
                    />
                  </template>
                </DesktopFiltersPanel>
              </template>

              <template #content>
                <div v-if="!loading" id="dashboard-result">
                  <div id="title" class="metric-title">
                    <span v-if="state.showIndicators">{{ $t('dashboard.indicators') }}</span>
                    <span v-else-if="state.showGraphs">{{ $t('dashboard.graph') }}</span>
                    <span v-else-if="state.showSurveyResults">{{ $t('dashboard.surveys') }}</span>
                  </div>
                  <div id="sub-title" class="metric-subtitle">
                    ({{ $t('dashboard.dates.from') }} {{ state.startDate }}
                    {{ $t('dashboard.dates.to') }} {{ state.endDate }})
                  </div>
                  <div class="row col mx-1 mt-3 mb-1">
                    <div class="col-4 centered">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                        :class="state.showIndicators ? 'btn-selected' : ''"
                        @click="showIndicators()"
                        :disabled="!state.toggles['dashboard.indicators.view']"
                        :title="$t('dashboard.consolidated')"
                      >
                        {{ $t('dashboard.indicators') }} <br />
                        <i class="bi bi-stoplights-fill"></i>
                      </button>
                    </div>
                    <div class="col-4 centered">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                        :class="state.showGraphs ? 'btn-selected' : ''"
                        @click="showGraphs()"
                        :disabled="!state.toggles['dashboard.graphs.view']"
                      >
                        {{ $t('dashboard.graph') }} <br />
                        <i class="bi bi-bar-chart-line-fill"></i>
                      </button>
                    </div>
                    <div class="col-4 centered">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                        :class="state.showSurveyResults ? 'btn-selected' : ''"
                        @click="showSurvey()"
                        :disabled="!state.toggles['dashboard.surveys.view']"
                      >
                        {{ $t('dashboard.surveys') }} <br />
                        <i class="bi bi-patch-question-fill"></i>
                      </button>
                    </div>
                  </div>
                  <hr class="dashboard-divider" />
                  <div>
                    <!-- Relatório de Indicadores -->
                    <SimpleDownloadCard
                      v-if="state.showIndicators"
                      :download="state.toggles['dashboard.reports.indicators']"
                      :title="$t('dashboard.reports.indicators.title')"
                      :show-tooltip="true"
                      :description="$t('dashboard.reports.indicators.description')"
                      :icon="'bi-file-earmark-pdf'"
                      :can-download="state.toggles['dashboard.reports.indicators'] === true"
                      class="mb-3"
                      @download="handleExportToPDF"
                    >
                    </SimpleDownloadCard>
                    <!-- Replace executive summary with CollaboratorSpySection for collaborators -->
                    <CollaboratorSpySection
                      v-if="state.showIndicators"
                      :show="state.showIndicators"
                      :commerce="commerce"
                      :collaborator="state.collaborator"
                    >
                    </CollaboratorSpySection>
                    <!-- Show DashboardIndicators with detailed cards, hiding summary when showing CollaboratorSpySection -->
                    <DashboardIndicators
                      v-if="state.showIndicators"
                      ref="dashboardIndicatorsRef"
                      :show-indicators="state.showIndicators"
                      :calculated-metrics="state.calculatedMetrics"
                      :toggles="state.toggles"
                      :start-date="state.startDate"
                      :end-date="state.endDate"
                      :commerce="commerce"
                      :hide-summary="true"
                    >
                    </DashboardIndicators>
                    <DashboardIndicators
                      v-else
                      :show-indicators="state.showIndicators"
                      :calculated-metrics="state.calculatedMetrics"
                      :toggles="state.toggles"
                      :start-date="state.startDate"
                      :end-date="state.endDate"
                      :commerce="commerce"
                    >
                    </DashboardIndicators>
                    <DashboardGraphs
                      :show-graphs="state.showGraphs"
                      :calculated-metrics="{
                        attentionNumberEvolutionProps,
                        attentionDurationEvolutionProps,
                        attentionHourDistributionProps,
                        attentionQueuesProps,
                        attentionFlowProps,
                        attentionRateDurationEvolutionProps,
                        surveyFlowProps,
                        bookingFlowProps,
                        bookingNumberEvolutionProps,
                        attentionDayDistributionProps,
                        bookingDayDistributionProps,
                        bookingHourDistributionProps,
                        ...state.calculatedMetrics,
                      }"
                      :toggles="state.toggles"
                      :graphs="state.graphs"
                      :start-date="state.startDate"
                      :end-date="state.endDate"
                      :commerce="commerce"
                    >
                    </DashboardGraphs>
                    <DashboardSurveys
                      :show-survey="state.showSurveyResults"
                      :calculated-metrics="state.calculatedMetrics"
                      :toggles="state.toggles"
                      :start-date="state.startDate"
                      :end-date="state.endDate"
                      :commerce="commerce"
                      :queues="state.queues"
                    >
                    </DashboardSurveys>
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
.dashboard-divider {
  margin: 1.5rem 0;
  border: 0;
  border-top: 1px solid var(--gris-default);
  opacity: 0.5;
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
