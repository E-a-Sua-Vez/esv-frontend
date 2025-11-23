<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getCommerceById } from '../../application/services/commerce';
import { getPermissions } from '../../application/services/permissions';
import { getServiceByCommerce } from '../../application/services/service';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import DashboardSurveysManagement from '../../components/dashboard/DashboardSurveysManagement.vue';
import DashboardAttentionsManagement from '../../components/attentions/DashboardAttentionsManagement.vue';
import DashboardClientsManagement from '../../components/clients/DashboardClientsManagement.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DashboardAttentionsAndBookingsManagement from '../../components/attentions/DashboardAttentionsAndBookingsManagement.vue';

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
    ComponentMenu,
    DashboardAttentionsAndBookingsManagement,
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
      commerces: ref({}),
      selectedCommerces: ref({}),
      queues: ref({}),
      services: ref({}),
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
    };
  },
};
</script>

<template>
  <div>
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
    <PoweredBy :name="state.business.name" />
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
