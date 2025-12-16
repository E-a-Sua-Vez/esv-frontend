<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getMetrics } from '../../application/services/query-stack';
import { getQueueByCommerce } from '../../application/services/queue';
import { getTelemedicineDashboardStats } from '../../application/services/telemedicine';
import { Chart, registerables } from 'chart.js';
import { LineChart, DoughnutChart, BarChart, useBarChart } from 'vue-chart-3';
import { getPermissions } from '../../application/services/permissions';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import DashboardIndicators from '../../components/dashboard/DashboardIndicators.vue';
import DashboardGraphs from '../../components/dashboard/DashboardGraphs.vue';
import DashboardSurveys from '../../components/dashboard/DashboardSurveys.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import { DateModel } from '../../shared/utils/date.model';
import DesktopContentLayout from '../../components/common/desktop/DesktopContentLayout.vue';
import DesktopFiltersPanel from '../../components/common/desktop/DesktopFiltersPanel.vue';
import DateRangeFilters from '../../components/common/desktop/DateRangeFilters.vue';

Chart.register(...registerables);

export default {
  name: 'BusinessDashboard',
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
    DashboardSurveys,
    ComponentMenu,
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

    const telemedicineCreated = {
      total: 0,
      scheduled: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
      averageDuration: 0,
      totalAccessKeysSent: 0,
      totalAccessKeysValidated: 0,
      totalDoctorsConnected: 0,
      totalPatientsConnected: 0,
      totalSessionsStarted: 0,
      totalSessionsEnded: 0,
      statusFlow: {},
      accessKeyFlow: { sent: 0, validated: 0, pending: 0 },
      connectionFlow: { doctors: 0, patients: 0, both: 0, none: 0 },
    };

    const state = reactive({
      currentUser: {},
      business: {},
      startDate: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      activeBusiness: false,
      queues: ref([]),
      queue: {},
      dateType: 'month',
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
        'telemedicine.created': telemedicineCreated,
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

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    // Load queues when commerce changes
    const loadQueues = async commerceId => {
      if (!commerceId) {
        state.queues = [];
        return;
      }
      try {
        const commerceData = await getQueueByCommerce(commerceId);
        state.queues = commerceData.queues || [];
      } catch (error) {
        state.queues = [];
      }
    };

    // Watch for commerce changes and reload queues + refresh
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            // Immediately clear data to prevent showing old results
            state.queues = [];
            state.calculatedMetrics = {};
            resetGraphsVisibility();
            await loadQueues(newCommerce.id);
            await refresh();
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
        state.toggles = await getPermissions('dashboard');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        // Load queues for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadQueues(commerceToUse.id);
        }

        await refresh();
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

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
        'telemedicine-evolution': false,
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
      const { calculatedMetrics } = await getMetrics(
        commerce.value.id,
        queues,
        state.startDate,
        state.endDate
      );

      // Get telemedicine metrics if telemedicine is enabled
      if (commerce.value?.telemedicineEnabled) {
        try {
          const telemedicineStats = await getTelemedicineDashboardStats(
            commerce.value.id,
            state.startDate,
            state.endDate
          );
          calculatedMetrics['telemedicine.created'] = telemedicineStats;
        } catch (error) {
          console.error('Error fetching telemedicine stats:', error);
          calculatedMetrics['telemedicine.created'] = telemedicineCreated;
        }
      } else {
        calculatedMetrics['telemedicine.created'] = telemedicineCreated;
      }

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
      router.back();
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
      return labels[label] || undefined;
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
      return undefined;
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
      return undefined;
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
      return undefined;
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
      return undefined;
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
      return undefined;
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
      return undefined;
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
      return undefined;
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
      return undefined;
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
      return undefined;
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
      return undefined;
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
      return undefined;
    });
    const { barChartProps: bookingHourDistributionProps } = useBarChart({
      chartData: bookingHourDistribution,
    });

    // Telemedicine Evolution Chart
    const telemedicineEvolution = computed(() => {
      const data = state.calculatedMetrics['telemedicine.created']
        ? state.calculatedMetrics['telemedicine.created'].evolution
        : null;
      if (data && data.labels && data.labels.length > 0) {
        return {
          labels: data.labels.map(date => {
            const d = new Date(date);
            return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
          }),
          datasets: [
            {
              label: 'Sesiones de Telemedicina',
              borderColor: '#00c2cb',
              backgroundColor: 'rgba(0, 194, 203, 0.7)',
              data: data.datasets || [],
              fill: false,
              tension: 0.4,
              type: 'line',
            },
          ],
          options: {
            fill: false,
            radius: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1,
                },
              },
            },
          },
        };
      }
      return undefined;
    });
    const { lineChartProps: telemedicineEvolutionProps } = useBarChart({
      chartData: telemedicineEvolution,
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
      return undefined;
    });
    const { barChartProps: bookingDayDistributionProps } = useBarChart({
      chartData: bookingDayDistribution,
    });

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

    return {
      state,
      loading,
      alertError,
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
      telemedicineEvolutionProps,
      goBack,
      isActiveBusiness,
      refresh,
      commerce,
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
    };
  },
};
</script>

<template>
  <div>
    <div class="content">
      <!-- Mobile/Tablet Layout -->
      <div class="d-block d-lg-none mobile-dashboard-layout">
        <div class="text-center">
          <CommerceLogo
            :src="commerce?.logo || state.business?.logo"
            :loading="loading"
          ></CommerceLogo>
          <ComponentMenu
            :title="$t(`dashboard.title`)"
            :toggles="state.toggles"
            component-name="dashboard"
            @goBack="goBack"
          >
          </ComponentMenu>
        </div>
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
              <div>
                <DashboardIndicators
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
                    telemedicineEvolutionProps,
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
      <!-- Desktop Layout -->
      <div class="d-none d-lg-block desktop-dashboard-layout">
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div class="row align-items-center mb-1 desktop-header-row">
          <div class="col-auto desktop-logo-wrapper">
            <div class="desktop-commerce-logo">
              <div id="commerce-logo-desktop">
                <img
                  v-if="!loading || commerce?.logo || state.business?.logo"
                  class="rounded img-fluid logo-desktop"
                  :alt="$t('logoAlt')"
                  :src="commerce?.logo || state.business?.logo || $t('hubLogoBlanco')"
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
          <div v-if="!commerce" class="control-box">
            <Message
              :title="$t('dashboard.message.3.title')"
              :content="$t('dashboard.message.3.content')"
            />
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

                    <!-- Filters from DashboardSurveys - shown when surveys tab is active -->
                    <!-- Render both components to expose filters for both tabs (Resume and Consolidated) -->
                    <DashboardSurveys
                      v-if="state.showSurveyResults"
                      :show-survey="false"
                      :calculated-metrics="state.calculatedMetrics"
                      :toggles="state.toggles"
                      :start-date="state.startDate"
                      :end-date="state.endDate"
                      :commerce="commerce"
                      :queues="Array.isArray(state.queues) ? state.queues : []"
                      filters-location="slot"
                    >
                      <template #filters-exposed="filterProps">
                        <div class="filters-content-wrapper">
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
                                  filterProps.refresh();
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
                    </DashboardSurveys>
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
                  <div>
                    <DashboardIndicators
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
                      :queues="Array.isArray(state.queues) ? state.queues : []"
                      filters-location="slot"
                    >
                    </DashboardSurveys>
                  </div>
                </div>
              </template>
            </DesktopContentLayout>
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
</template>

<style scoped>
.metric-title {
  text-align: left;
  font-size: 1.5rem;
  font-weight: 700;
  color: #000;
  margin-bottom: 0.5rem;
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

.metric-subtitle {
  text-align: left;
  font-size: 0.95rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 1.5rem;
  padding-left: 1rem;
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

/* Desktop Dashboard Layout Styles */
@media (min-width: 992px) {
  .desktop-dashboard-layout {
    padding: 0;
    width: 100%;
  }

  .desktop-dashboard-layout .content {
    padding-left: 15px;
    padding-right: 15px;
    max-width: 100%;
  }

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

  .desktop-dashboard-content {
    align-items: flex-start;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  .desktop-controls-column {
    position: sticky;
    top: calc(var(--header-height, 100px) + 10px);
    max-height: calc(100vh - var(--header-height, 100px) - 20px);
    overflow-y: auto;
    padding-right: 1.5rem;
  }

  .desktop-result-column {
    min-width: 0;
    padding-left: 1.5rem;
  }

  #dashboard-controls {
    padding: 1rem;
  }

  #dashboard-controls .row {
    margin-left: -0.5rem;
    margin-right: -0.5rem;
  }

  #dashboard-controls .row > * {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }

  #dashboard-controls .col,
  #dashboard-controls .col-6,
  #dashboard-controls .col-12 {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }

  #dashboard-result {
    padding-left: 0;
    padding-right: 0;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }

  .desktop-result-column > * {
    max-width: 100%;
    overflow-x: hidden;
  }
}
</style>
