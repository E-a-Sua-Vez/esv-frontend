<script>
import Spinner from '../common/Spinner.vue';
import Alert from '../common/Alert.vue';
import ResumeAttention from './ResumeAttention.vue';
import NoDeviceAttention from './NoDeviceAttention.vue';
import Suggestions from './Suggestions.vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';

export default {
  name: 'Actions',
  components: { Spinner, Alert, ResumeAttention, NoDeviceAttention, Suggestions },
  data() {
    const store = globalStore();
    const router = useRouter();
    return {
      attentionNumber: undefined,
      userType: '',
      loading: false,
      alertError: '',
      store,
      router,
      queue: undefined
    }
  },
  methods: {
    closeModal() {
      this.$emit('close-modal');
    },
    isCollabotator() {
      return this.userType === 'collaborator'
    },
    isQueueSelected() {
      return this.store.currentQueue !== undefined
    },
    async getUserType() {
      this.userType = await this.store.getCurrentUserType;
    },
    async getQueue() {
      this.queue = await this.store.getCurrentQueue;
    },
  },
  async beforeMount() {
    await this.getUserType();
    await this.getQueue();
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
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <h2 class="portfolio-modal-title mb-0">{{ $t("actions.title") }}</h2>
        <div class="divider-custom">
          <div class="divider-custom-line"></div>
          <div class="divider-custom-icon"><i class="bi bi-question-circle-fill"></i></div>
          <div class="divider-custom-line"></div>
        </div>
        <ResumeAttention
          @closeModal="closeModal()">
        </ResumeAttention>
        <NoDeviceAttention
          @closeModal="closeModal()">
        </NoDeviceAttention>
        <Suggestions
          @closeModal="closeModal()">
        </Suggestions>
        <!--<div id="suggestions" class="card">
          <p class="mb-2 details"><span class="fw-bold">{{ $t("actions.subtitle.1.1") }}</span></p>
          <p class="details-subtitle">{{ $t("actions.subtitle.1.2") }}</p>
          <a href="mailto:some@email.com" target="_blank" class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4" data-bs-toggle="modal" data-bs-target="#modalBuzon">{{ $t("actions.actions.1") }}  <i class="bi bi-envelope-at"></i></a>
        </div>-->
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