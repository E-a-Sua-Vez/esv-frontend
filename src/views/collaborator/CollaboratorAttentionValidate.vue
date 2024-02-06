<script>
import { reactive, nextTick, onBeforeMount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { finishAttention, skip, getAttentionDetails } from '../../application/services/attention';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import QueueName from '../../components/common/QueueName.vue';
import AttentionNumber from'../../components/common/AttentionNumber.vue';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import QR from '../../components/common/QR.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';

export default {
  name: 'CollaboratorAttentionValidate',
  components: { Message, PoweredBy, QR, CommerceLogo, QueueName, AttentionNumber, Spinner, Alert, ToggleCapabilities},
  async setup() {
    const route = useRoute();
    const router = useRouter();
    const { id } = route.params;

    const store = globalStore();

    const comment = ref('');
    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      currentUser: {},
      attention: {},
      queue: {},
      commerce: {},
      user: {},
      toggles: {},
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.attention = await getAttentionDetails(id);
        if (state.attention.id) {
          state.queue = state.attention.queue;
          state.commerce = state.attention.commerce;
          if (state.attention.userId) {
            state.user = state.attention.user
          }
          state.toggles = await getPermissions('collaborator');
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status;
        loading.value = false;
      }
    })

    const finishCurrentAttention = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const body = { comment: comment.value };
        state.attention = await finishAttention(state.attention.id, body);
        await nextTick();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || error.response.statusCode || 500;
        loading.value = false;
      }
    };

    const queueAttentions = () => {
      router.push({ path: `/interno/colaborador/fila/${state.queue.id}/atenciones` });
    }

    const isReactivated = () => {
      return state.attention.status === 'REACTIVATED';
    }

    const skipAttention = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const body = { collaboratorId: state.currentUser.id, queueId: state.queue.id };
        state.attention = await skip(state.attention.number, body);
        router.push({ path: `/interno/colaborador/fila/${state.queue.id}/atenciones` });
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status;
        loading.value = false;
      }
    };

    return {
      id,
      state,
      comment,
      loading,
      alertError,
      finishCurrentAttention,
      queueAttentions,
      skipAttention,
      isReactivated
    }
  }
}
</script>
<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
      <QueueName :queue="state.queue">
      </QueueName>
      <div id="attention-processing" v-if="state.attention.status === 'PENDING' || state.attention.status === 'PROCESSING' || state.attention.status === 'REACTIVATED'">
        <div id="page-header" class="text-center mt-2">
          <div id="welcome">
            <span v-if="!state.currentUser" class="welcome">{{ $t("collaboratorAttentionValidate.hello") }}</span>
            <span v-else class="welcome-user">{{ $t("collaboratorAttentionValidate.hello-user") }}, {{ state.currentUser.alias || state.currentUser.name }}!</span>
          </div>
          <ToggleCapabilities
            :toggles="state.toggles"
            componentName="collaboratorAttentionValidate"
          ></ToggleCapabilities>
          <div class="your-attention mt-2">
            <span>{{ $t("collaboratorAttentionValidate.yourNumber") }}</span>
          </div>
        </div>
        <AttentionNumber
          :type="state.attention.type === 'NODEVICE' ? 'no-device' : 'primary'"
          :number="state.attention.number"
          :data="state.user"
        ></AttentionNumber>
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
        <div v-if="state.attention.status === 'PROCESSING' || state.attention.status === 'REACTIVATED'" class="d-grid gap-2 my-2 mx-2">
          <div class="mb-2">
            <label for="comment" class="form-label mt-2 comment-title">{{ $t("collaboratorAttentionValidate.comment.label") }}</label>
            <textarea
              class="form-control"
              id="comment"
              rows="3"
              v-model="comment"
              :placeholder="$t('collaboratorAttentionValidate.comment.placeholder')"></textarea>
          </div>
        <div class="actions">
          <span><strong>{{ $t("collaboratorQueueAttentions.actions.1.title.1") }}</strong></span>
        </div>
        <button
          class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-1"
          :disabled="!state.toggles['collaborator.attention.finish'] || loading"
          @click="finishCurrentAttention()">
          {{ $t("collaboratorAttentionValidate.actions.1.action") }} <i class="bi bi-check-all"></i>
        </button>
        <div class="actions">
          <span><strong>{{ $t("collaboratorQueueAttentions.actions.2.title.1") }}</strong></span>
        </div>
        <button
          class="btn btn-lg btn-block btn-size fw-bold btn-danger rounded-pill mb-1"
          :disabled="!state.toggles['collaborator.attention.skip'] || isReactivated() || loading"
          @click="skipAttention()">
          {{ $t("collaboratorQueueAttentions.actions.2.action") }} <i class="bi bi-skip-forward"></i>
        </button>
        <div class="d-grid gap-2 my-1">
          <button
            class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
            @click="queueAttentions()"
            :disabled="loading"
            >
            {{ $t("collaboratorAttentionValidate.actions.2.action") }} <i class="bi bi-arrow-left-circle"></i>
          </button>
        </div>
       </div>
      </div>
      <div v-else id="attention-terminated">
        <div v-if="(state.attention.status === 'TERMINATED' || state.attention.status === 'RATED')">
          <Message
            :title="$t('collaboratorAttentionValidate.message.2.title')"
            :content="$t('collaboratorAttentionValidate.message.2.content')"
            :icon="'bi bi-emoji-sunglasses'">
          </Message>
        </div>
        <div v-if="state.attention.status === 'CANCELLED'">
          <Message
            :title="$t('collaboratorAttentionValidate.message.3.title')"
            :content="$t('collaboratorAttentionValidate.message.3.content')"
            :icon="'bi bi-emoji-sunglasses'">
          </Message>
        </div>
        <div v-if="state.attention.status === 'USER_CANCELLED' || state.attention.status === 'TERMINATED_RESERVE_CANCELLED'">
          <div class="your-attention mt-2">
            <span>{{ $t("collaboratorAttentionValidate.yourNumber") }}</span>
          </div>
          <AttentionNumber
            :type="'secondary'"
            :number="state.attention.number"
            :data="state.user"
          ></AttentionNumber>
          <Message
            :title="$t('collaboratorAttentionValidate.message.5.title')"
            :content="$t('collaboratorAttentionValidate.message.5.content')"
            :icon="'bi bi-emoji-expressionless'">
          </Message>
        </div>
        <div class="d-grid gap-2 my-2">
          <button
            class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
            @click="queueAttentions()"
            :disabled="loading"
            >
            {{ $t("collaboratorAttentionValidate.actions.2.action") }} <i class="bi bi-arrow-left-circle"></i>
          </button>
        </div>
      </div>
      <div v-if="state.attention.status === 'PENDING'">
        <Message
          :title="$t('collaboratorAttentionValidate.message.4.title')"
          :content="$t('collaboratorAttentionValidate.message.4.content')"
          :icon="'bi bi-emoji-expressionless'">
        </Message>
        <div class="d-grid gap-2 my-2">
          <button
            class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
            @click="queueAttentions()"
            :disabled="loading"
            >
            {{ $t("collaboratorAttentionValidate.actions.2.action") }} <i class="bi bi-arrow-left-circle"></i>
          </button>
        </div>
      </div>
    </div>
    <PoweredBy :name="state.commerce.name" />
  </div>
</template>

<style scoped>
.comment-title {
  font-size: .9rem;
  line-height: 1rem;
}
</style>