<script>
import { ref, reactive, onBeforeMount, } from 'vue';
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
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import DashboardSurveysManagement from '../../components/dashboard/DashboardSurveysManagement.vue';
import DashboardAttentionsManagement from '../../components/attentions/DashboardAttentionsManagement.vue';
import DashboardClientsManagement from '../../components/clients/DashboardClientsManagement.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DashboardAttentionsAndBookingsManagement from '../../components/attentions/DashboardAttentionsAndBookingsManagement.vue';

export default {
  name: 'CollaboratorTracing',
  components: {
    CommerceLogo,
    Message,
    PoweredBy,
    Spinner,
    Alert,
    DashboardSurveysManagement,
    DashboardAttentionsManagement,
    DashboardClientsManagement,
    ComponentMenu,
    DashboardAttentionsAndBookingsManagement
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
      activeBusiness: false,
      commerces: ref({}),
      selectedCommerces: ref({}),
      queues: ref({}),
      services: ref({}),
      queue: {},
      collaborator: {},
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
        state.collaborator = state.currentUser;
        if (!state.collaborator) {
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
            state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
            state.selectedCommerces = [state.commerce];
            if (state.commerce) {
              const commerce = await getCommerceById(state.commerce.id);
              state.queues = commerce.queues;
              state.services = await getServiceByCommerce(commerce.id);
            }
          } else if (state.collaborator.commerceId) {
            const commerce = await getCommerceById(state.collaborator.commerceId);
            state.commerces = [commerce];
            state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
            state.selectedCommerces = [state.commerce];
            state.queues = commerce.queues;
            state.services = await getServiceByCommerce(commerce.id);
            if (getActiveFeature(state.commerce, 'attention-queue-typegrouped', 'PRODUCT')) {
              state.groupedQueues = await getGroupedQueueByCommerceId(state.commerce.id);
              if (Object.keys(state.groupedQueues).length > 0 && state.collaborator.type === 'STANDARD') {
                const collaboratorQueues = state.groupedQueues['COLLABORATOR'].filter(queue => queue.collaboratorId === state.collaborator.id);
                const otherQueues = state.queues.filter(queue => queue.type !== 'COLLABORATOR');
                const queues = [...collaboratorQueues, ...otherQueues];
                state.queues = queues;
              }
            }
          }
        } else {
          state.business = await store.getActualBusiness();
          state.commerces = await store.getAvailableCommerces(state.business.commerces);
          state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
          state.selectedCommerces = state.commerces;
        }
        state.toggles = await getPermissions('dashboard');
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })

    const isActiveBusiness = () => {
      return state.commerce && state.commerce.active === true;
    };

    const selectCommerce = async (commerce) => {
      try {
        loading.value = true;
        state.selectedCommerces = undefined;
        if (commerce.id === 'ALL') {
          if (state.currentUser.commercesId && state.currentUser.commercesId.length > 0) {
            state.selectedCommerces = state.commerces;
          } else {
            state.selectedCommerces = state.commerces;
          }
        } else {
          state.commerce = commerce;
          state.selectedCommerces = [state.commerce];
          const queuesByCommerce = await getCommerceById(state.commerce.id);
          state.queues = queuesByCommerce.queues;
          if (getActiveFeature(state.commerce, 'attention-queue-typegrouped', 'PRODUCT')) {
            state.groupedQueues = await getGroupedQueueByCommerceId(state.commerce.id);
            if (Object.keys(state.groupedQueues).length > 0 && state.collaborator.type === 'STANDARD') {
              const collaboratorQueues = state.groupedQueues['COLLABORATOR'].filter(queue => queue.collaboratorId === state.collaborator.id);
              const otherQueues = state.queues.filter(queue => queue.type !== 'COLLABORATOR');
              const queues = [...collaboratorQueues, ...otherQueues];
              state.queues = queues;
            }
          }
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
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
      selectCommerce,
      showAttentions,
      showSurveys,
      getLocalHour,
      showClients
    }
  }
}
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
      <ComponentMenu
        :title="$t(`dashboard.tracing.title`)"
        :toggles="state.toggles"
        componentName="dashboard"
        @goBack="goBack">
      </ComponentMenu>
      <div id="page-header" class="centered">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="tracing">
        <div v-if="isActiveBusiness()">
          <div v-if="state.commerces.length === 0" class="control-box">
            <Message
              :title="$t('dashboard.message.3.title')"
              :content="$t('dashboard.message.3.content')" />
          </div>
          <div v-else class="control-box">
            <div id="tracing-controls">
              <div class="row">
                <div class="col" v-if="state.commerces">
                  <span>{{ $t("dashboard.commerce") }} </span>
                  <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" id="modules" @change="selectCommerce(state.commerce)">
                    <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                    <option v-if="state.collaborator.type === 'FULL'" key="ALL" :value="{id:'ALL',active:true}">{{ $t("dashboard.all") }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div v-if="!loading" id="tracing-result" class="mt-4">
            <div class="row col mx-1 mt-3 mb-1">
              <div class="col-3 centered">
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                  :class="state.showClients ? 'btn-selected' : ''"
                  @click="showClients()"
                  :disabled="!state.toggles['dashboard.clients-management.view']">
                  {{ $t("dashboard.clients") }} <br> <i class="bi bi-person-fill"></i>
                </button>
              </div>
              <div class="col-5 centered">
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2"
                  :class="state.showAttentions ? 'btn-selected' : ''"
                  @click="showAttentions()"
                  :disabled="!state.toggles['dashboard.attentions-management.view']">
                  {{ $t("dashboard.attentions") }} <br> <i class="bi bi-qr-code"></i>
                </button>
              </div>
              <div class="col-4 centered">
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                  :class="state.showSurveyManagement ? 'btn-selected' : ''"
                  @click="showSurveys()"
                  :disabled="!state.toggles['dashboard.surveys-management.view']">
                  {{ $t("dashboard.satisfaction") }} <br> <i class="bi bi-chat-heart-fill"></i>
                </button>
              </div>
            </div>
            <div>
              <DashboardClientsManagement
                :showClientManagement="state.showClients"
                :toggles="state.toggles"
                :commerce="state.commerce"
                :queues="state.queues"
                :commerces="state.selectedCommerces"
                :business="state.business"
                :services="state.services"
              >
              </DashboardClientsManagement>
              <DashboardAttentionsAndBookingsManagement
                :showAttentionManagement="state.showAttentions"
                :toggles="state.toggles"
                :commerce="state.commerce"
                :queues="state.queues"
                :commerces="state.selectedCommerces"
                :services="state.services"
              >
              </DashboardAttentionsAndBookingsManagement>
              <DashboardSurveysManagement
                :showSurveyManagement="state.showSurveyManagement"
                :calculatedMetrics="state.calculatedMetrics"
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
            :content="$t('dashboard.message.1.content')" />
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
  border: 1px solid var(--gris-default);
}
.metric-card-title {
  font-size: .8rem;
  line-height: .8rem;
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
  font-size: .6rem;
  font-weight: 500;
}

</style>