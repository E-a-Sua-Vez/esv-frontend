<script>
import { ref, reactive, onBeforeMount, computed } from 'vue';
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
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import DashboardIndicators from '../../components/dashboard/DashboardIndicators.vue';
import DashboardGraphs from '../../components/dashboard/DashboardGraphs.vue';
import DashboardSurveysResult from '../../components/dashboard/DashboardSurveysResult.vue';
import DashboardSurveys from '../../components/dashboard/DashboardSurveys.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import { DateModel } from '../../shared/utils/date.model';

Chart.register(...registerables);

export default {
  name: 'CollaboratorDashboard',
  components: {
    CommerceLogo,
    Message,
    PoweredBy,
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

    const state = reactive({
      currentUser: {},
      business: {},
      startDate: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      activeBusiness: false,
      commerces: ref({}),
      queues: ref({}),
      queue: {},
      groupedQueues: [],
      dateType: 'month',
      commerce: {},
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

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.collaborator = state.currentUser;
        if (!state.currentUser) {
          state.collaborator = await getCollaboratorById(state.currentUser.id);
        }
        if (state.collaborator) {
          let commercesId = [state.collaborator.commerceId];
          if (state.collaborator.commercesId && state.collaborator.commercesId.length > 0) {
            commercesId = state.collaborator.commercesId;
          }
          if (commercesId && commercesId.length > 0) {
            state.business = await store.getActualBusiness();
            state.commerces = await store.getAvailableCommerces(state.business.commerces);
            state.commerce =
              state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
            state.selectedCommerces = state.commerces;
            if (state.commerce) {
              const commerce = await getQueueByCommerce(state.commerce.id);
              state.queues = commerce.queues;
            }
          } else if (state.collaborator.commerceId) {
            const commerce = await getQueueByCommerce(state.currentUser.commerceId);
            state.commerces = [commerce];
            state.commerce =
              state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
            state.queues = commerce.queues;
            if (getActiveFeature(state.commerce, 'attention-queue-typegrouped', 'PRODUCT')) {
              state.groupedQueues = await getGroupedQueueByCommerceId(state.commerce.id);
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
          }
        }
        state.toggles = await getPermissions('dashboard');
        await refresh();
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.commerce && state.commerce.active === true;

    const selectCommerce = async commerce => {
      try {
        loading.value = true;
        state.commerce = commerce;
        const queuesByCommerce = await getQueueByCommerce(state.commerce.id);
        state.queues = queuesByCommerce.queues;
        if (getActiveFeature(state.commerce, 'attention-queue-typegrouped', 'PRODUCT')) {
          state.groupedQueues = await getGroupedQueueByCommerceId(state.commerce.id);
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
        await refresh();
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    };

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
      const { calculatedMetrics } = await getMetrics(
        state.commerce.id,
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
      if (state.commerce.country) {
        if (state.commerce.country === 've') {
          const resultHour = hourDate.getHours() - 4;
          return resultHour < 0 ? 24 + resultHour : resultHour;
        } else if (['br', 'cl'].includes(state.commerce.country)) {
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
      selectCommerce,
      showIndicators,
      showSurvey,
      showGraphs,
      getCurrentMonth,
      getLastMonth,
      getLastThreeMonths,
      getLocalHour,
      getToday,
    };
  },
};
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
      <ComponentMenu
        :title="$t(`dashboard.title`)"
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
                  </select>
                </div>
              </div>
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
            <div>
              <DashboardIndicators
                :show-indicators="state.showIndicators"
                :calculated-metrics="state.calculatedMetrics"
                :toggles="state.toggles"
                :start-date="state.startDate"
                :end-date="state.endDate"
                :commerce="state.commerce"
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
                :commerce="state.commerce"
              >
              </DashboardGraphs>
              <DashboardSurveys
                :show-survey="state.showSurveyResults"
                :calculated-metrics="state.calculatedMetrics"
                :toggles="state.toggles"
                :start-date="state.startDate"
                :end-date="state.endDate"
                :commerce="state.commerce"
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
    <PoweredBy :name="state.commerce.name" />
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
</style>
