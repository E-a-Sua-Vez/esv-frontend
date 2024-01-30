<script>
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import NoDeviceAttentionNumber from '../../components/common/NoDeviceAttentionNumber.vue';
import QueueName from '../../components/common/QueueName.vue';
import Message from '../../components/common/Message.vue';
import { createAttention } from '../../application/services/attention';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';

export default {
  name: 'NoDeviceAttention',
  components: { Spinner, Alert, Warning, NoDeviceAttentionNumber, QueueName, Message },
  data() {
    const store = globalStore();
    const router = useRouter();
    return {
      userName: undefined,
      userType: '',
      currentUser: undefined,
      currentChannel: 'QR',
      loading: false,
      attention: undefined,
      alertError: '',
      errors: [],
      store,
      queue: undefined,
      commerce: undefined,
      router
    }
  },
  methods: {
    closeModal() {
      this.$emit('close-modal');
      this.attention = undefined;
      this.userName = undefined;
    },
    async getAttention() {
      try {
        this.loading = true;
        this.alertError = '';
        this.errors = [];
        if (this.userName !== undefined && this.userName.length > 0) {
          const currentUser = await this.store.getCurrentUser;
          const user = {
            name: this.userName,
            assistingCollaboratorId: currentUser.id,
            queueId: this.queue.id,
            commerceId: this.commerce.id,
          };
          let body = {
            queueId: this.queue.id,
            channel: this.currentChannel,
            user,
            type: 'NODEVICE'
          }
          this.attention = await createAttention(body);
        } else {
          this.errors.push('noDeviceAttention.validate.name');
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
      }
    },
    async getUserType() {
      this.userType = await this.store.getCurrentUserType;
    },
    async getQueue() {
      this.queue = await this.store.getCurrentQueue;
    },
    async getCommerce() {
      this.commerce = await this.store.getCurrentCommerce;
    },
    async getCurrentUser() {
      this.currentUser = await this.store.getCurrentUser;
    },
    async getCurrentAttentionChannel() {
      this.currentChannel = await this.store.getCurrentAttentionChannel;
    },
    isCollabotator() {
      return this.userType === 'collaborator'
    },
    isQueueSelected() {
      return this.store.currentQueue !== undefined
    }
  },
  async beforeMount() {
    await this.getUserType();
    await this.getQueue();
    await this.getCurrentUser();
    await this.getCommerce();
  },
  watch: {
    store: {
      immediate: true,
      deep: true,
      async handler() {
        await this.getUserType();
        await this.getQueue();
      }
    }
  },
}
</script>

<template>
  <div v-if="isCollabotator() && isQueueSelected()" id="noDeviceAttention" class="card mb-4">
    <p class="mb-2 details"><span class="fw-bold">{{ $t("noDeviceAttention.subtitle.1.1") }}</span></p>
    <QueueName :queue="queue"></QueueName>
    <p v-if="!attention" class="details-subtitle mt-2">{{ $t("noDeviceAttention.subtitle.1.2") }}</p>
    <div class="mb-2">
      <div v-if="!attention" class="col-12">
        <input
          type="text"
          class="form-control mb-2"
          id="attention-number-nodevice"
          placeholder="Ej: José López"
          v-model="userName">
        <a class="btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4" @click="getAttention()">{{ $t("noDeviceAttention.actions.1") }}  <i class="bi bi-ticket-detailed"></i></a>
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
        <div class="errors" id="feedback" v-if="(errors.length > 0)">
          <Warning>
            <template v-slot:message>
              <li v-for="(error, index) in errors" :key="index">
                {{ $t(error) }}
              </li>
            </template>
          </Warning>
        </div>
      </div>
      <div v-else>
        <div id="attention" class="my-2">
          <NoDeviceAttentionNumber
            :number="attention.number"
            :name="attention.userName || userName"
          ></NoDeviceAttentionNumber>
        </div>
        <Message
          :title="$t('noDeviceAttention.message.1.title')"
          :content="$t('noDeviceAttention.message.1.content')"
          :icon="'bi bi-exclamation-triangle-fill'">
        </Message>
        <a class="btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4" @click="closeModal()">{{ $t("noDeviceAttention.actions.2") }}  <i class="bi bi-check-all"></i></a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.details {
  font-size: 1.2rem;
  line-height: 1rem;
}
.details-subtitle {
  font-size: .9rem;
  line-height: 1rem;
}
.card {
  background-color: var(--color-background);
  margin-top: 1rem;
  margin-bottom: 1rem;
  margin-left: .5rem;
  margin-right: .5rem;
  padding: 1rem;
  border-radius: 1rem;
  border: .5px solid var(--gris-default);
}
</style>