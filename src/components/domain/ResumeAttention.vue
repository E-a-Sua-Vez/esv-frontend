<script>
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import QueueName from '../../components/common/QueueName.vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { reactivate } from '../../application/services/attention';

export default {
  name: 'ResumeAttention',
  components: { Spinner, Alert, Warning, QueueName },
  data() {
    const store = globalStore();
    const router = useRouter();
    return {
      attentionNumber: undefined,
      userType: '',
      currentUser: undefined,
      loading: false,
      alertError: '',
      errors: [],
      store,
      queue: undefined,
      router,
    };
  },
  methods: {
    async attend() {
      try {
        this.loading = true;
        this.alertError = '';
        this.errors = [];
        if (this.attentionNumber !== undefined || this.attentionNumber.length > 0) {
          let attention;
          try {
            attention = await reactivate(this.attentionNumber, {
              queueId: this.queue.id,
              collaboratorId: this.currentUser.id,
            });
            this.attentionNumber = undefined;
            this.closeModal();
            this.$router
              .push({ path: `/interno/colaborador/atencion/${attention.id}/validar` })
              .then(() => {
                this.$router.go();
              });
          } catch (error) {
            this.errors.push('resumeAttention.validate.resume');
          }
        } else {
          this.errors.push('resumeAttention.validate.number');
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
      }
    },
    async getQueue() {
      this.queue = await this.store.getCurrentQueue;
    },
    async getUserType() {
      this.userType = await this.store.getCurrentUserType;
    },
    async getCurrentUser() {
      this.currentUser = await this.store.getCurrentUser;
    },
    isCollabotator() {
      return this.userType === 'collaborator';
    },
    isQueueSelected() {
      return this.store.currentQueue !== undefined;
    },
    closeModal() {
      this.$emit('close-modal');
    },
  },
  async beforeMount() {
    await this.getUserType();
    await this.getCurrentUser();
    await this.getQueue();
  },
  watch: {
    store: {
      immediate: true,
      deep: true,
      async handler() {
        await this.getUserType();
        await this.getQueue();
      },
    },
  },
};
</script>

<template>
  <div v-if="isCollabotator() && isQueueSelected()" id="resumeAttention" class="card mb-4">
    <p class="mb-2 details">
      <span class="fw-bold">{{ $t('resumeAttention.subtitle.1.1') }}</span>
    </p>
    <QueueName :queue="queue"></QueueName>
    <p class="details-subtitle mt-2">{{ $t('resumeAttention.subtitle.1.2') }}</p>
    <div class="mb-2">
      <div class="col-12">
        <input
          type="number"
          class="form-control mb-2"
          id="attention-number"
          placeholder="Ej: 24"
          v-model="attentionNumber"
        />
        <button
          class="btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4"
          @click="attend()"
          :disabled="!attentionNumber"
        >
          {{ $t('resumeAttention.actions.1') }} <i class="bi bi-qr-code-scan"></i>
        </button>
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
        <div class="errors" id="feedback" v-if="errors.length > 0">
          <Warning>
            <template v-slot:message>
              <li v-for="(error, index) in errors" :key="index">
                {{ $t(error) }}
              </li>
            </template>
          </Warning>
        </div>
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
  font-size: 0.9rem;
  line-height: 1rem;
}
.card {
  background-color: var(--color-background);
  margin-top: 1rem;
  margin-bottom: 1rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  padding: 1rem;
  border-radius: 1rem;
  border: 0.5px solid var(--gris-default);
}
</style>
