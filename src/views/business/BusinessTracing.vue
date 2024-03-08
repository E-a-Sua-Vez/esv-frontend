<script>
import { ref, reactive, onBeforeMount, } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getSurveyMetrics } from '../../application/services/query-stack';
import { getCommerceById } from '../../application/services/commerce';
import { getPermissions } from '../../application/services/permissions';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import DashboardSurveysManagement from '../../components/dashboard/DashboardSurveysManagement.vue';
import DashboardAttentionsManagement from '../../components/attentions/DashboardAttentionsManagement.vue';
import DashboardClientsManagement from '../../components/clients/DashboardClientsManagement.vue';

export default {
  name: 'BusinessTracing',
  components: {
    CommerceLogo,
    Message,
    PoweredBy,
    Spinner,
    Alert,
    ToggleCapabilities,
    DashboardSurveysManagement,
    DashboardAttentionsManagement,
    DashboardClientsManagement,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    let loading = ref(false);
    let alertError = ref('');

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
      pastPeriodEvolution: {}
    }

    const surveyCreated = {
      avgRating: 0
    }

    const notificationCreated = {
      notificationNumber: 0,
      channelFlow: {},
      typesFlow: {}
    }

    const state = reactive({
      currentUser: {},
      business: {},
      startDate: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().slice(0,10),
      endDate: new Date().toISOString().slice(0,10),
      activeBusiness: false,
      commerces: ref({}),
      selectedCommerces: ref({}),
      queues: ref({}),
      queue: {},
      dateType: 'month',
      commerce: {},
      showClients: true,
      showAttentions: false,
      showSurveyManagement: false,
      calculatedMetrics: {
        'attention.created': attentionCreated,
        'survey.created': surveyCreated,
        'notification.created': notificationCreated
      },
      calculatedSurveyMetrics: {},
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        state.selectedCommerces = [state.commerce];
        const commerce = await getCommerceById(state.commerce.id);
        state.queues = commerce.queues;
        state.toggles = await getPermissions('dashboard');
        await refresh();
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })

    const isActiveBusiness = () => {
      return state.business && state.business.active === true;
    };

    const selectCommerce = async (commerce) => {
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
        }
        await refresh();
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    }

    const getCalculatedMetrics = async () => {
      const queues = state.queues.map(queue => { return { id: queue.id, name: queue.name }})
      const { calculatedMetrics } = await getSurveyMetrics(state.commerce.id, queues, state.startDate, state.endDate);
      return calculatedMetrics;
    }

    const refresh = async () => {
      try {
        loading.value = true;
        state.calculatedMetrics = await getCalculatedMetrics();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error ? error.response ? error.respose.status : 500 : 500;
        loading.value = false;
      }
    }

    const getToday = async () => {
      const date = new Date().toISOString().slice(0,10);
      const [ year, month, day ] = date.split('-');
      state.startDate = `${year}-${month}-${day}`;
      state.endDate = `${year}-${month}-${day}`;
      await refresh();
    }

    const getCurrentMonth = async () => {
      const date = new Date().toISOString().slice(0,10);
      const [ year, month, day ] = date.split('-');
      state.startDate = `${year}-${month}-01`;
      state.endDate = `${year}-${month}-${day}`;
      await refresh();
    }

    const getLastMonth = async () => {
      const date = new Date().toISOString().slice(0,10);
      state.startDate = new Date(new Date(new Date(date).setMonth(new Date(date).getMonth() - 1)).setDate(0)).toISOString().slice(0, 10);
      const pastFromDate = new Date(new Date(new Date(date).setMonth(new Date(date).getMonth() - 1)).setDate(0));
      state.endDate = new Date(pastFromDate.getFullYear(), pastFromDate.getMonth() + 2, 0).toISOString().slice(0, 10);
      await refresh();
    }

    const getLastThreeMonths = async () => {
      const date = new Date().toISOString().slice(0,10);
      state.startDate = new Date(new Date(new Date(date).setMonth(new Date(date).getMonth() - 3)).setDate(0)).toISOString().slice(0, 10);
      const pastFromDate = new Date(new Date(new Date(date).setMonth(new Date(date).getMonth() - 1)).setDate(0));
      state.endDate = new Date(pastFromDate.getFullYear(), pastFromDate.getMonth() + 2, 0).toISOString().slice(0, 10);
      await refresh();
    }

    const getLocalHour = (hour) => {
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
    }

    const goBack = () => {
      router.back();
    }

    const showClients = () => {
      state.showClients = true;
      state.showAttentions = false,
      state.showSurveyManagement = false;
    }

    const showSurveys = () => {
      state.showClients = false;
      state.showAttentions = false,
      state.showSurveyManagement = true;
    }

    const showAttentions = () => {
      state.showClients = false;
      state.showAttentions = true,
      state.showSurveyManagement = false;
    }

    return {
      state,
      loading,
      alertError,
      goBack,
      isActiveBusiness,
      refresh,
      selectCommerce,
      showClients,
      showSurveys,
      showAttentions,
      getCurrentMonth,
      getLastMonth,
      getLastThreeMonths,
      getLocalHour,
      getToday
    }
  }
}
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <div class="col">
        <a class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4" @click="goBack()"> {{ $t("dashboard.return") }} <i class="bi bi-arrow-left"></i></a>
      </div>
      <div id="page-header" class="text-center mt-4">
        <span class="welcome-user">{{ $t("dashboard.tracing.title") }}</span>
        <ToggleCapabilities
          :toggles="state.toggles"
          componentName="dashboard"
        ></ToggleCapabilities>
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="dashboard">
        <div v-if="isActiveBusiness()">
          <div v-if="state.commerces.length === 0" class="control-box">
            <Message
              :title="$t('dashboard.message.3.title')"
              :content="$t('dashboard.message.3.content')" />
          </div>
          <div v-else class="control-box">
            <div id="dashboard-controls">
              <div class="row">
                <div class="col" v-if="state.commerces">
                  <span>{{ $t("dashboard.commerce") }} </span>
                  <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" id="modules" @change="selectCommerce(state.commerce)">
                    <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                    <option key="ALL" :value="{id:'ALL'}">{{ $t("dashboard.all") }}</option>
                  </select>
                </div>
              </div>
              <div class="row my-2">
                <div class="col-3">
                  <button class="btn btn-dark rounded-pill px-2 metric-filters" @click="getToday()" :disabled="loading">{{ $t("dashboard.today") }}</button>
                </div>
                <div class="col-3">
                  <button class="btn  btn-dark rounded-pill px-2 metric-filters" @click="getCurrentMonth()" :disabled="loading">{{ $t("dashboard.thisMonth") }}</button>
                </div>
                <div class="col-3">
                  <button class="btn  btn-dark rounded-pill px-2 metric-filters" @click="getLastMonth()" :disabled="loading">{{ $t("dashboard.lastMonth") }}</button>
                </div>
                <div class="col-3">
                  <button class="btn btn-dark rounded-pill px-2 metric-filters" @click="getLastThreeMonths()" :disabled="loading">{{ $t("dashboard.lastThreeMonths") }}</button>
                </div>
              </div>
              <div class="row">
                <div class="col-6">
                  <input id="startDate" class="form-control metric-controls" type="date" v-model="state.startDate"/>
                </div>
                <div class="col-6">
                  <input id="endDate" class="form-control metric-controls" type="date" v-model="state.endDate"/>
                </div>
              </div>
              <div class="col">
                <button class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2  px-4" @click="refresh()" :disabled="loading">
                  <i class="bi bi-search"></i> {{ $t("dashboard.refresh") }}
                </button>
              </div>
            </div>
          </div>
          <div v-if="!loading" id="dashboard-result" class="mt-4">
            <div id="title" class="metric-title">
              <span v-if="state.showClients">{{ $t("dashboard.clients") }}</span>
              <span v-else-if="state.showSurveyManagement">{{ $t("dashboard.surveys-management") }}</span>
              <span v-else-if="state.showAttentions">{{ $t("dashboard.attentions") }}</span>
            </div>
            <div id="sub-title" class="metric-subtitle">({{ $t("dashboard.dates.from") }} {{ state.startDate }} {{ $t("dashboard.dates.to") }} {{ state.endDate }})</div>
            <div class="row col mx-1 mt-3 mb-1">
              <div class="col-4 centered">
                <button
                  class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-4"
                  :class="state.showClients ? 'btn-selected' : ''"
                  @click="showClients()"
                  :disabled="!state.toggles['dashboard.clients-management.view']">
                  <i class="bi bi-person-fill"></i>
                </button>
              </div>
              <div class="col-4 centered">
                <button
                  class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-4"
                  :class="state.showAttentions ? 'btn-selected' : ''"
                  @click="showAttentions()"
                  :disabled="!state.toggles['dashboard.attentions-management.view']">
                  <i class="bi bi-qr-code"></i>
                </button>
              </div>
              <div class="col-4 centered">
                <button
                  class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-4"
                  :class="state.showSurveyManagement ? 'btn-selected' : ''"
                  @click="showSurveys()"
                  :disabled="!state.toggles['dashboard.surveys-management.view']">
                  <i class="bi bi-chat-heart-fill"></i>
                </button>
              </div>
            </div>
            <div>
              <DashboardClientsManagement
                :showClientManagement="state.showClients"
                :toggles="state.toggles"
                :startDate="state.startDate"
                :endDate="state.endDate"
                :commerce="state.commerce"
                :queues="state.queues"
                :commerces="state.selectedCommerces"
                :business="state.business"
              >
              </DashboardClientsManagement>
              <DashboardAttentionsManagement
                :showAttentionManagement="state.showAttentions"
                :toggles="state.toggles"
                :startDate="state.startDate"
                :endDate="state.endDate"
                :commerce="state.commerce"
                :queues="state.queues"
                :commerces="state.selectedCommerces"
              >
              </DashboardAttentionsManagement>
              <DashboardSurveysManagement
                :showSurveyManagement="state.showSurveyManagement"
                :calculatedMetrics="state.calculatedMetrics"
                :toggles="state.toggles"
                :startDate="state.startDate"
                :commerce="state.commerce"
                :endDate="state.endDate"
                :queues="state.queues"
                :commerces="state.selectedCommerces"
              >
              </DashboardSurveysManagement>
            </div>
          </div>
        </div>
        <div v-if="!isActiveBusiness() && !loading">
          <Message
            :title="$t('dashboard.message.1.title')"
            :content="$t('dashboard.message.1.content')" />
        </div>
      </div>
    </div>
    <PoweredBy :name="state.business.name" />
  </div>
</template>

<style scoped>
.metric-controls {
  font-size: .9rem;
}
.metric-title {
  text-align: left;
  font-size: 1.1rem;
  font-weight: 700;
}
.metric-filters {
  font-size: .7rem !important;
  line-height: .8rem !important;
  font-weight: 600;
}
.metric-subtitle {
  text-align: left;
  font-size: .9rem;
  font-weight: 500;
}
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
.metric-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .5rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.metric-card-title {
  font-size: .8rem;
  line-height: .8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.control-box {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .1rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
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
  font-size: .6rem;
  font-weight: 500;
}

</style>