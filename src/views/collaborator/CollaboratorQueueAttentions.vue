<script>
import { ref, watch, reactive, onBeforeMount, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getNextAvailableAttentionDetails, getAvailableAttentiosnByQueue, getProcessingAttentionDetailsByQueue, finishCancelledAttention } from '../../application/services/attention';
import { getCommerceById } from '../../application/services/commerce';
import { getQueueById } from '../../application/services/queue';
import { globalStore } from '../../stores/index';
import { attend } from '../../application/services/attention';
import { updatedQueues, updatedAttentionsByDateAndCommerceAndQueue } from '../../application/firebase';
import { getPermissions } from '../../application/services/permissions';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import QueueName from '../../components/common/QueueName.vue';
import AttentionNumber from'../../components/common/AttentionNumber.vue';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';

export default {
  name: 'CollaboratorQueueAttentions',
  components: { Message, PoweredBy, CommerceLogo, QueueName, AttentionNumber, Spinner, Alert, ToggleCapabilities },
  async setup() {
    const route = useRoute();
    const router = useRouter();
    const { id } = route.params;

    let loading = ref(true);
    let alertError = ref('');

    const store = globalStore();

    const state = reactive({
      currentUser: {},
      queue: {},
      commerce: {},
      attention: {},
      user: {},
      toggles: {},
      pendingAttentions: [],
      queuePendingDetails: [],
      queueProcessingDetails: []
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.toggles = await getPermissions('collaborator');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    })

    let queues = ref([]);
    queues = updatedQueues(id);

    let attentions = ref([]);
    attentions = updatedAttentionsByDateAndCommerceAndQueue(id);

    const getQueueValues = async (queue, oldQueue) => {
      loading.value = true;
      state.queue = queue;
      store.setCurrentQueue(queue);
      if (queue !== undefined && queue.id !== undefined) {
        state.attention = await getNextAvailableAttentionDetails(queue.id);
        state.queuePendingDetails = await getAvailableAttentiosnByQueue(queue.id);
        state.queueProcessingDetails = await getProcessingAttentionDetailsByQueue(queue.id);
        if (state.attention.user) {
          state.user = state.attention.user;
        }
        if (state.attention.commerce) {
          state.commerce = state.attention.commerce;
        } else {
          if (queue.commerceId !== oldQueue.commerceId) {
            state.commerce = await getCommerceById(state.queue.commerceId);
          }
        }
        loading.value = false;
      } else {
        router.push({ path: `/not-found` })
      }
    }

    watch(
      queues,
      async (newQueue, oldQueue) => {
        if (newQueue && oldQueue) {
          await getQueueValues(newQueue[0], oldQueue);
        }
      }
    )

    const collaboratorQueues = () => {
      router.push({ path: `/interno/commerce/${state.commerce.id}/colaborador/filas` })
    }

    const attendAttention = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const body = { queueId: state.queue.id, collaboratorId: state.currentUser.id , commerceLanguage: state.commerce.localeInfo ? state.commerce.localeInfo.language : 'sp'};
        state.attention = await attend(state.attention.number, body);
        router.push({ path: `/interno/colaborador/atencion/${state.attention.id}/validar` });
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const finishCurrentCancelledAttention = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const body = {  };
        state.attention = await finishCancelledAttention(state.attention.id, body);
        await nextTick();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || error.response.statusCode || 500;
        loading.value = false;
      }
    };

    watch (
      attentions,
      async (newData, oldData) => {
        if (newData && oldData) {
          state.pendingAttentions = newData.filter(att => att.status === 'PENDING');
          store.setCurrentActiveAttentions(newData);
        }
      }
    )

    return {
      id,
      state,
      loading,
      alertError,
      collaboratorQueues,
      attendAttention,
      finishCurrentCancelledAttention
    }
  }
}
</script>
<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
      <QueueName
        :queue="state.queue"
        :queuePendingDetails="state.queuePendingDetails"
        :queueProcessingDetails="state.queueProcessingDetails"
        :details="true">
      </QueueName>
      <div id="page-header" class="text-center mt-4">
        <div id="welcome">
          <span v-if="!state.currentUser" class="welcome">{{ $t("collaboratorQueueAttentions.hello") }}</span>
          <span v-else class="welcome-user">{{ $t("collaboratorQueueAttentions.hello-user") }}, {{ state.currentUser.alias || state.currentUser.name }}!</span>
        </div>
      </div>
      <ToggleCapabilities
        :toggles="state.toggles"
        componentName="collaboratorQueueAttentions"
      ></ToggleCapabilities>
      <Spinner :show="loading"></Spinner>
      <Alert :show="loading" :stack="alertError"></Alert>
      <div v-if="state.pendingAttentions.length === 0" class="mt-2">
        <Message
          :title="$t('collaboratorQueueAttentions.message.1.title')"
          :content="$t('collaboratorQueueAttentions.message.1.content')"
          :icon="'bi bi-emoji-smile'">
        </Message>
      </div>
      <div v-else id="attention">
        <div v-if="state.attention.status === 'USER_CANCELLED'" class="your-attention mt-2">
          <div class="your-attention mt-2">
            <span>{{ $t("collaboratorQueueAttentions.numberCancelled") }}</span>
          </div>
          <AttentionNumber
            :type="'secondary'"
            :number="state.attention.number"
            :data="state.user"
          ></AttentionNumber>
          <div class="d-grid gap-2 mt-3">
            <button
              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-1"
              :disabled="!state.toggles['collaborator.attention.finish'] || loading"
              @click="finishCurrentCancelledAttention()">
              {{ $t("collaboratorQueueAttentions.actions.4.action") }} <i class="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>
        <div v-else>
          <div class="your-attention mt-2">
            <span>{{ $t("collaboratorQueueAttentions.yourNumber") }}</span>
          </div>
          <AttentionNumber
            :type="state.attention.type === 'NODEVICE' ? 'no-device' : 'primary'"
            :number="state.attention.number"
            :data="state.user"
          ></AttentionNumber>
          <div class="to-goal">
            <span>{{ $t("collaboratorQueueAttentions.toGoal.1") }} <strong>{{ state.pendingAttentions.length }}</strong> {{ $t("collaboratorQueueAttentions.toGoal.2") }}</span>
          </div>
          <div class="d-grid gap-2 my-2">
            <button
              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
              @click="attendAttention()"
              :disabled="!state.toggles['collaborator.attention.attend'] || loading">
              {{ $t("collaboratorQueueAttentions.actions.1.action") }} <i class="bi bi-qr-code-scan"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="d-grid gap-2 my-2">
        <button
          class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
          @click="collaboratorQueues()"
          :disabled="loading"
          >
          {{ $t("collaboratorQueueAttentions.actions.3.action") }} <i class="bi bi-arrow-left-circle"></i>
        </button>
      </div>
    </div>
    <PoweredBy :name="state.commerce.name" />
  </div>
</template>

<style scoped>
</style>