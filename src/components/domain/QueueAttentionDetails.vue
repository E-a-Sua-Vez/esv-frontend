<script>
import { getMetrics } from '../../application/services/query-stack';
import AttentionNumber from '../common/AttentionNumber.vue';
import Message from '../../components/common/Message.vue';
import Spinner from '../../components/common/Spinner.vue';
import SimpleCard from '../dashboard/common/SimpleCard.vue';

const attentionCreated = {
  attentionNumber: 0,
  totalDuration: 0,
  avgDuration: 0,
  maxQueue: '',
  evolution: {},
  attentionQueues: {
    datasets: [0, 0, 0, 0]
  },
  attentionFlow: {
    datasets: [0, 0, 0, 0]
  }
}
const surveyCreated = {
  avgRating: 0
}
const notificationCreated = {
  notificationNumber: 0
}

export default {
  name: 'QueueAttentionDetails',
  components: { AttentionNumber, Message, SimpleCard, Spinner },
  props: {
    queue: { type: Object, default: { name: '', active: false } },
    queuePendingDetails: { type: Object, default: [] },
    queueProcessingDetails: { type: Object, default: [] },
  },
  data() {
    return {
      startDate: new Date().toISOString().slice(0,10),
      endDate: new Date().toISOString().slice(0,10),
      calculatedMetrics: {
        'attention.created': attentionCreated,
        'survey.created': surveyCreated,
        'notification.created': notificationCreated
      },
      toggles: {
        'dashboard.indicators.view': true
      },
      loading: false,
    };
  },
  methods: {
    async getQueueDetails(queue) {
      try {
        const queues = [{ id: queue.id, name: queue.name }];
        const { calculatedMetrics } = await getMetrics(queue.commerceId, queues, this.startDate, this.endDate);
        return calculatedMetrics;
      } catch (error) {
        this.calculatedMetrics = {
          'attention.created': attentionCreated,
          'survey.created': surveyCreated,
          'notification.created': notificationCreated
        };
        this.loading = false;
      }
    },
    beforeCurrentQueue() {
      if(this.queue.currentNumber === 0){
        return 0;
      }
      return this.queue.currentNumber - this.queue.currentAttentionNumber + 1;
    },
    goToProcessingAttention(attention) {
      this.$router.push({ path: `/interno/colaborador/atencion/${attention.id}/validar`});
      const modalCloseButton = document.getElementById('close-modal');
      modalCloseButton.click();
    }
  },
  watch: {
    queue: {
      immediate: true,
      deep: true,
      async handler(queue) {
        if (queue && queue.id) {
          this.calculatedMetrics = await this.getQueueDetails(queue);
        }
      }
    }
  }
}
</script>

<template>
  <div>
    <Spinner :show="loading"></Spinner>
    <div v-if="queue.active && !loading" id="indicators">
      <div class="row indicators py-2">
        <div class="col metric-card">
          <div class="metric-card-title">
            {{ $t('queueAttentionDetails.requested') }}
          </div>
            <span class="fw-bold px-2">
              <i :class="`bi bi-qr-code blue-icon`"></i>
              {{ calculatedMetrics['attention.created'] ? calculatedMetrics['attention.created'].attentionQueues.datasets[0] : 0 }}
            </span>
        </div>
        <div class="col metric-card">
          <div class="metric-card-title">
            {{ $t('queueAttentionDetails.pending') }}
          </div>
          <div>
            <span class="fw-bold px-2">
              <i class="bi bi-play-circle blue-icon"></i>
              {{ beforeCurrentQueue() }}
            </span>
          </div>
        </div>
        <div class="col metric-card">
          <div class="metric-card-title">
            {{ $t('queueAttentionDetails.terminated') }}
          </div>
          <div>
            <span class="fw-bold px-2">
              <i class="bi bi-stop-circle green-icon"></i>
              {{ calculatedMetrics['attention.created'] ? calculatedMetrics['attention.created'].attentionFlow.datasets[2] : 0 }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="queue.active && !loading" class="row mt-2" id="attentions">
      <div class="col-7">
        <div>
          <span class="fw-bold">{{ $t('collaboratorQueuesView.attending') }}
            <span :class="`badge rounded-pill m-0 indicator ${queueProcessingDetails.length === 0 ? 'text-bg-success': 'text-bg-primary'}`">
              <i class="bi bi-person-fill"></i>
              {{ queueProcessingDetails.length }}
            </span>
          </span>
        </div>
        <div v-if="queueProcessingDetails.length > 0" class="attentions-card">
          <div v-for="(attention, index) in queueProcessingDetails" :key="index" class="mt-2">
            <AttentionNumber
              :type="attention.type === 'NODEVICE' ? 'no-device' : 'primary'"
              :number="attention.number"
              :data="attention.user"
              :showData="false"
              :toList="true"
              @click="goToProcessingAttention(attention)"
              class="attention-processing"
            >
            </AttentionNumber>
          </div>
        </div>
      </div>
      <div class="col-5">
        <div>
          <span class="fw-bold">{{ $t('collaboratorQueuesView.attentions') }}
            <span :class="`badge rounded-pill m-0 indicator ${queuePendingDetails.length === 0 ? 'text-bg-success': 'text-bg-primary'}`">
              <i class="bi bi-person-fill"></i>
              {{ queuePendingDetails.length }}
            </span>
          </span>
        </div>
        <div v-if="queuePendingDetails.length > 0" class="attentions-card">
          <div v-for="(attention, index) in queuePendingDetails" :key="index" class="mt-2">
            <AttentionNumber
              :type="attention.type === 'NODEVICE' ? 'no-device' : 'primary'"
              :number="attention.number"
              :data="attention.user"
              :showData="false"
              :toList="true"
            >
            </AttentionNumber>
          </div>
        </div>
        <div v-else>
          <Message
            :title="$t('collaboratorAttentionValidate.message.1.title')"
            :content="$t('collaboratorAttentionValidate.message.1.content')"
            :icon="'bi bi-emoji-sunglasses'">
          </Message>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.attentions-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
  overflow-y: scroll;
  height: 400px;
}
.indicators {
  border-radius: .5rem;
  margin: -.1rem;
  padding: .2rem;
}
.metric-card {
  background-color: var(--color-background);
  padding: .2rem;
  margin: .1rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.metric-card-title {
  margin: .1rem;
  font-size: .8rem;
  line-height: .8rem;
}
.attention-processing {
  cursor: pointer;
}
</style>