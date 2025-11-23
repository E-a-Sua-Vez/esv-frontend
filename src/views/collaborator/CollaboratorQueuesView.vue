<script>
import { ref, reactive, onBeforeMount, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { getCommerceById } from '../../application/services/commerce';
import { getActiveModulesByCommerceId } from '../../application/services/module';
import { getGroupedQueueByCommerceId } from '../../application/services/queue';
import { getCollaboratorById, updateModule } from '../../application/services/collaborator';
import { VueRecaptcha } from 'vue-recaptcha';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { updatedAvailableAttentionsByCommerce } from '../../application/firebase';
import { getQueueByCommerce } from '../../application/services/queue';
import { getActiveFeature } from '../../shared/features';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';

export default {
  name: 'CollaboratorQueuesView',
  components: {
    CommerceLogo,
    Message,
    PoweredBy,
    VueRecaptcha,
    Spinner,
    Alert,
    ToggleCapabilities,
    ComponentMenu,
  },
  async setup() {
    const router = useRouter();
    const route = useRoute();

    const siteKey = import.meta.env.VITE_RECAPTCHA_INVISIBLE;
    const captchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED || false;

    const { id } = route.params;

    const loading = ref(false);
    const alertError = ref('');

    const store = globalStore();

    const state = reactive({
      currentUser: {},
      commerces: ref([]),
      queue: {},
      queues: [],
      groupedQueues: [],
      commerce: {},
      collaborator: {},
      modules: ref({}),
      module: {},
      activeCommerce: false,
      captcha: false,
      queueStatus: {},
      toggles: {},
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = store.getCurrentUser;
        state.collaborator = state.currentUser;
        if (!state.currentUser) {
          state.collaborator = await getCollaboratorById(state.currentUser.id);
        }
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce =
          state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        const commerceById = await getCommerceById(state.commerce.id);
        state.queues = commerceById.queues;
        await initQueues();
        state.modules = await getActiveModulesByCommerceId(state.commerce.id);
        if (state.modules && state.modules.length > 0) {
          state.module = state.modules.filter(
            module => module.id === state.collaborator.moduleId
          )[0];
        }
        store.setCurrentCommerce(state.commerce);
        store.setCurrentQueue(undefined);
        state.toggles = await getPermissions('collaborator');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    });

    const checkQueueStatus = async attentions => {
      if (attentions && attentions.value) {
        const filteredAttentionsByQueue = attentions.value.reduce((acc, attention) => {
          const queueId = attention.queueId;
          if (!acc[queueId]) {
            acc[queueId] = [];
          }
          acc[queueId].push(attention);
          return acc;
        }, {});
        if (state.queues && state.queues.length > 0) {
          state.queues.forEach(queue => {
            if (filteredAttentionsByQueue[queue.id]) {
              const attentions = filteredAttentionsByQueue[queue.id].length;
              state.queueStatus[queue.id] = attentions;
            }
          });
        }
      }
    };

    const attentions = ref([]);
    attentions.value = updatedAvailableAttentionsByCommerce(id);

    checkQueueStatus(attentions);

    const initQueues = async () => {
      initializeQueueStatus();
      if (getActiveFeature(state.commerce, 'attention-queue-typegrouped', 'PRODUCT')) {
        state.groupedQueues = await getGroupedQueueByCommerceId(state.commerce.id);
        if (Object.keys(state.groupedQueues).length > 0 && state.collaborator.type === 'STANDARD') {
          const collaboratorQueues = state.groupedQueues['COLLABORATOR'].filter(
            queue => queue.collaboratorId === state.collaborator.id
          );
          const otherQueues = state.queues.filter(queue => queue.type !== 'COLLABORATOR');
          const queues = [...collaboratorQueues, ...otherQueues];
          state.queues = queues;
        }
        if (
          Object.keys(state.groupedQueues).length > 0 &&
          state.collaborator.type === 'ASSISTANT'
        ) {
          const otherQueues = state.queues.filter(queue => queue.type !== 'COLLABORATOR');
          const queues = [...otherQueues];
          state.queues = queues;
        }
      }
      checkQueueStatus(attentions);
    };

    const isActiveCommerce = () => state.commerce && state.commerce.active === true;

    const isActiveModules = () => state.module && state.modules.length > 0;

    const getLineAttentions = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        store.setCurrentQueue(state.queue);
        router.push({ path: `/interno/colaborador/fila/${state.queue.id}/atenciones` });
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.message;
      }
    };

    const getQueue = async queueIn => {
      state.queue = queueIn;
      store.setCurrentQueue(state.queue);
      if (captchaEnabled) {
        await validateCaptchaOk(true);
      }
    };

    const validateCaptchaOk = async response => {
      if (response) {
        state.captcha = true;
        getLineAttentions();
      }
    };

    const validateCaptchaError = () => {
      state.captcha = false;
    };

    const selectCommerce = async commerce => {
      try {
        loading.value = true;
        state.commerce = commerce;
        attentions.value = updatedAvailableAttentionsByCommerce(commerce.id);
        const selectedCommerce = await getQueueByCommerce(state.commerce.id);
        state.queues = selectedCommerce.queues;
        checkQueueStatus(attentions);
        await initQueues();
        state.modules = await getActiveModulesByCommerceId(state.commerce.id);
        if (state.modules && state.modules.length > 0) {
          state.module = state.modules.filter(
            module => module.id === state.collaborator.moduleId
          )[0];
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const moduleSelect = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const id = state.collaborator.id;
        const body = { module: state.module.id };
        await updateModule(id, body);
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const goBack = () => {
      router.push({ path: '/interno/colaborador/menu' });
    };

    const initializeQueueStatus = () => {
      if (state.queues && state.queues.length > 0) {
        state.queues.forEach(queue => {
          state.queueStatus[queue.id] = 0;
        });
      }
    };

    watch(attentions, async () => {
      if (attentions.value && attentions.value && attentions.value.length > 0) {
        checkQueueStatus(checkQueueStatus);
      } else {
        initializeQueueStatus();
      }
    });

    return {
      siteKey,
      state,
      captchaEnabled,
      loading,
      alertError,
      getQueue,
      isActiveCommerce,
      getLineAttentions,
      validateCaptchaOk,
      validateCaptchaError,
      moduleSelect,
      isActiveModules,
      goBack,
      selectCommerce,
    };
  },
};
</script>
<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
      <ComponentMenu
        :title="$t(`collaboratorQueuesView.welcome`)"
        :toggles="state.toggles"
        component-name="collaboratorQueuesView"
        @goBack="goBack"
      >
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
        <div id="businessQueuesAdmin-controls" class="control-box">
          <div class="row">
            <div class="col" v-if="state.commerces.length > 0">
              <span>{{ $t('collaboratorQueuesView.commerce') }} </span>
              <select
                class="btn btn-md fw-bold text-dark m-1 select"
                v-model="state.commerce"
                @change="selectCommerce(state.commerce)"
                id="modules"
              >
                <option v-for="com in state.commerces" :key="com.id" :value="com">
                  {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}
                </option>
              </select>
            </div>
            <div v-else>
              <Message
                :title="$t('businessQueuesAdmin.message.4.title')"
                :content="$t('businessQueuesAdmin.message.4.content')"
              />
            </div>
          </div>
        </div>
        <div id="module-selector" class="mb-2 mt-1" v-if="isActiveModules()">
          <span>{{ $t('collaboratorQueuesView.module') }} </span>
          <select
            class="btn btn-md btn-light fw-bold text-dark m-1 select"
            v-model="state.module"
            id="modules"
            :disabled="!state.toggles['collaborator.module.update'] || !state.commerce.active"
            @change="moduleSelect()"
          >
            <option v-for="mod in state.modules" :key="mod.name" :value="mod">
              {{ mod.name }}
            </option>
          </select>
        </div>
        <div v-if="!isActiveModules() && !loading">
          <Message
            :title="$t('collaboratorQueuesView.message.2.title')"
            :content="$t('collaboratorQueuesView.message.2.content')"
          />
        </div>
      </div>
      <div id="queues" v-if="isActiveModules() && !loading">
        <div class="row" v-if="isActiveCommerce()">
          <div class="choose-attention">
            <span>{{ $t('collaboratorQueuesView.choose') }}</span>
          </div>
          <div
            v-for="queue in state.queues"
            :key="queue.id"
            class="d-grid btn-group btn-group-justified"
          >
            <div v-if="captchaEnabled === true">
              <VueRecaptcha
                :sitekey="siteKey"
                @verify="validateCaptchaOk"
                @error="validateCaptchaError"
              >
                <button
                  v-if="queue.active"
                  type="button"
                  class="btn btn-lg btn-block btn-size col-9 fw-bold btn-dark rounded-pill mt-2 mb-2"
                  @click="getQueue(queue)"
                  :disabled="loading"
                >
                  <div class="row centered">
                    <div class="col-8">
                      <i v-if="queue.type === 'COLLABORATOR'" class="bi bi-person-fill"></i>
                      {{ queue.name }}
                    </div>
                    <div class="col-2">
                      <span
                        :class="`badge rounded-pill m-0 indicator ${
                          state.queueStatus[queue.id] === 0 ? 'text-bg-success' : 'text-bg-primary'
                        }`"
                      >
                        <i class="bi bi-person-fill"></i>
                        {{ state.queueStatus[queue.id] }}
                      </span>
                    </div>
                  </div>
                </button>
              </VueRecaptcha>
            </div>
            <div v-else>
              <button
                v-if="queue.active"
                type="button"
                class="btn btn-lg btn-block btn-size col-9 fw-bold btn-dark rounded-pill mt-2 mb-2"
                @click="getQueue(queue)"
                :disabled="loading"
              >
                <div class="row centered">
                  <div class="col-8">
                    <i v-if="queue.type === 'COLLABORATOR'" class="bi bi-person-fill"></i>
                    {{ queue.name }}
                  </div>
                  <div class="col-2">
                    <span
                      :class="`badge rounded-pill m-0 indicator ${
                        state.queueStatus[queue.id] === 0 ? 'text-bg-success' : 'text-bg-primary'
                      }`"
                    >
                      <i class="bi bi-person-fill"></i>
                      {{ state.queueStatus[queue.id] }}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
        <div v-if="!isActiveCommerce() && !loading">
          <Message
            :title="$t('collaboratorQueuesView.message.1.title')"
            :content="$t('collaboratorQueuesView.message.1.content')"
          />
        </div>
      </div>
    </div>
    <PoweredBy :name="state.commerce.name" />
  </div>
</template>
<style scoped>
.choose-attention {
  padding-bottom: 1rem;
  font-size: 1rem;
  font-weight: 700;
}
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.indicator {
  font-size: 0.7rem;
}
</style>
